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
    // Firmas de vídeo asignadas por el dataset (comp+cat+vídeo+tiempos → perf dueña):
    // si un vídeo local coincide con la firma de OTRA actuación hermana, es una copia
    // obsoleta (quedó pegada tras una re-extracción) y se descarta.
    const ownerBySig = new Map<string, string>();
    for (const p of ds.performances) {
      if (p.videoId && p.startSeconds != null && p.endSeconds != null) {
        ownerBySig.set(`${p.competitionId}|${p.categoryId}|${p.videoId}|${p.startSeconds}|${p.endSeconds}`, p.id);
      }
    }
    for (const perf of ds.performances) {
      const existing = await db.performances.get(perf.id);
      const samePair =
        existing &&
        existing.akaAthleteId === perf.akaAthleteId &&
        existing.aoAthleteId === perf.aoAthleteId;
      let localVideo = samePair && !perf.videoId ? {
        videoId: existing?.videoId,
        startSeconds: existing?.startSeconds,
        endSeconds: existing?.endSeconds,
      } : undefined;
      if (localVideo?.videoId != null && localVideo.startSeconds != null && localVideo.endSeconds != null) {
        const sig = `${perf.competitionId}|${perf.categoryId}|${localVideo.videoId}|${localVideo.startSeconds}|${localVideo.endSeconds}`;
        const owner = ownerBySig.get(sig);
        if (owner && owner !== perf.id) localVideo = undefined; // copia obsoleta de otra actuación
      }
      const merged: Performance = {
        ...perf,
        videoId: perf.videoId ?? localVideo?.videoId,
        startSeconds: perf.startSeconds ?? localVideo?.startSeconds,
        endSeconds: perf.endSeconds ?? localVideo?.endSeconds,
        notes: perf.notes ?? existing?.notes,
      };
      merged.status = computeStatus(merged);
      await db.performances.put(merged);
    }
  });
}
