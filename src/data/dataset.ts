import { db } from '../db/db';
import type { CatalogStatus, DatasetFile, Performance } from '../db/types';

const DATASET_URL = `${import.meta.env.BASE_URL}data/dataset.json`;

export function computeStatus(p: Pick<Performance, 'videoId' | 'startSeconds' | 'endSeconds' | 'akaAthleteId'>): CatalogStatus {
  if (!p.akaAthleteId) return 'MISSING_DATA';
  if (!p.videoId) return 'VIDEO_MISSING';
  if (p.startSeconds == null || p.endSeconds == null) return 'VIDEO_CATALOGUED';
  return 'READY';
}

/**
 * Carga el dataset publicado con la app y lo fusiona en IndexedDB.
 * Los timestamps/vídeos catalogados localmente prevalecen si el dataset aún no los trae.
 */
export async function syncDataset(): Promise<void> {
  let ds: DatasetFile;
  try {
    const res = await fetch(DATASET_URL, { cache: 'no-cache' });
    if (!res.ok) return;
    ds = (await res.json()) as DatasetFile;
  } catch {
    return; // offline y sin caché: la app sigue con lo que haya en IndexedDB
  }

  await db.transaction('rw', [db.competitions, db.categories, db.athletes, db.videos, db.performances], async () => {
    await db.competitions.bulkPut(ds.competitions);
    await db.categories.bulkPut(ds.categories);
    await db.athletes.bulkPut(ds.athletes);
    await db.videos.bulkPut(ds.videos);
    for (const perf of ds.performances) {
      const existing = await db.performances.get(perf.id);
      // El vídeo local solo se conserva si el emparejamiento no ha cambiado en el dataset
      // (si cambió, el vídeo local pertenece a otro bout y quedaría mal asignado).
      const samePair =
        existing &&
        existing.akaAthleteId === perf.akaAthleteId &&
        existing.aoAthleteId === perf.aoAthleteId;
      const merged: Performance = {
        ...perf,
        videoId: perf.videoId ?? (samePair ? existing?.videoId : undefined),
        startSeconds: perf.startSeconds ?? (samePair ? existing?.startSeconds : undefined),
        endSeconds: perf.endSeconds ?? (samePair ? existing?.endSeconds : undefined),
        notes: perf.notes ?? existing?.notes,
      };
      merged.status = computeStatus(merged);
      await db.performances.put(merged);
    }
  });
}
