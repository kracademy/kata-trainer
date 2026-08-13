import { useRef, useState } from 'react';
import { db } from '../db/db';
import { useCatalog } from '../logic/useCatalog';
import { computeStatus } from '../data/dataset';
import YouTubePlayer, { type YouTubePlayerHandle } from '../components/YouTubePlayer';
import { extractYouTubeId, fmtTime, parseTime, roundLabel } from '../logic/format';
import { downloadJson } from '../logic/backup';
import type { CatalogExport } from '../db/types';

export default function Catalog() {
  const data = useCatalog();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [videoId, setVideoId] = useState<string | undefined>();
  const [startTxt, setStartTxt] = useState('');
  const [endTxt, setEndTxt] = useState('');
  const [msg, setMsg] = useState('');
  const playerRef = useRef<YouTubePlayerHandle>(null);

  const perf = selectedId ? data.performances.find((p) => p.id === selectedId) : null;
  const pending = data.performances
    .filter((p) => p.status !== 'READY')
    .sort((a, b) => a.id.localeCompare(b.id));
  const done = data.performances.filter((p) => p.status === 'READY');

  function open(id: string) {
    const p = data.performances.find((x) => x.id === id);
    setSelectedId(id);
    setVideoId(p?.videoId);
    setUrlInput(p?.videoId ? `https://www.youtube.com/watch?v=${p.videoId}` : '');
    setStartTxt(p?.startSeconds != null ? fmtTime(p.startSeconds) : '');
    setEndTxt(p?.endSeconds != null ? fmtTime(p.endSeconds) : '');
    setMsg('');
  }

  function applyUrl() {
    const id = extractYouTubeId(urlInput);
    if (!id) { setMsg('URL de YouTube no reconocida.'); return; }
    setVideoId(id);
    setMsg('');
  }

  function mark(setter: (v: string) => void) {
    const t = playerRef.current?.getCurrentTime();
    if (t == null) { setMsg('El reproductor aún no está listo.'); return; }
    setter(fmtTime(t));
    setMsg('');
  }

  async function save() {
    if (!perf) return;
    const start = parseTime(startTxt);
    const end = parseTime(endTxt);
    if (!videoId) { setMsg('Falta el vídeo.'); return; }
    if (start == null || end == null || end <= start) { setMsg('Revisa los timestamps (el fin debe ser posterior al inicio).'); return; }
    await db.videos.put({
      id: videoId,
      platform: 'YOUTUBE',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      availabilityStatus: 'AVAILABLE',
      lastChecked: new Date().toISOString(),
    });
    const updated = { ...perf, videoId, startSeconds: start, endSeconds: end };
    updated.status = computeStatus(updated);
    await db.performances.put(updated);
    setMsg(`✅ Guardado (${fmtTime(start)} → ${fmtTime(end)}, duración ${fmtTime(end - start)}).`);
  }

  async function exportCatalog() {
    const entries = (await db.performances.toArray())
      .filter((p) => p.videoId && p.startSeconds != null && p.endSeconds != null)
      .map((p) => ({ performanceId: p.id, videoId: p.videoId!, startSeconds: p.startSeconds!, endSeconds: p.endSeconds! }));
    const out: CatalogExport = { schemaVersion: 1, exportedAt: new Date().toISOString(), entries };
    downloadJson(out, `kata-trainer-catalogo-${new Date().toISOString().slice(0, 10)}.json`);
  }

  if (perf) {
    const comp = data.compById.get(perf.competitionId);
    const cat = data.categoryById.get(perf.categoryId);
    const aka = data.athleteById.get(perf.akaAthleteId);
    const ao = data.athleteById.get(perf.aoAthleteId);
    const start = parseTime(startTxt);
    const end = parseTime(endTxt);
    return (
      <>
        <button onClick={() => setSelectedId(null)}>← Volver a la lista</button>
        <h1 style={{ marginTop: 12 }}>{comp?.name} · {roundLabel(perf.roundType)}</h1>
        <div className="card perf-item">
          <div className="meta">{cat?.name}</div>
          <div className="who">🔴 {aka?.displayName} ({aka?.countryCode}) vs 🔵 {ao?.displayName} ({ao?.countryCode})</div>
          <div className="meta">Katas: {perf.kataAka ?? '—'} / {perf.kataAo ?? '—'} · Ganador oficial: {perf.officialWinner}</div>
          {perf.sportDataUrl && <a href={perf.sportDataUrl} target="_blank" rel="noreferrer">Ver en SportData</a>}
        </div>

        <label>URL de YouTube</label>
        <div className="row">
          <input type="url" placeholder="https://www.youtube.com/watch?v=…" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} />
          <button onClick={applyUrl}>Cargar</button>
        </div>

        {videoId && (
          <>
            <div className="player-wrap" style={{ marginTop: 12 }}>
              <YouTubePlayer ref={playerRef} videoId={videoId} autoplay={false} onError={() => setMsg('⚠️ Este vídeo no permite reproducción embebida.')} />
            </div>
            <p className="muted">
              ⚠️ Marca el FIN <b>antes</b> de que el marcador muestre las puntuaciones, para no ver spoilers al entrenar.
            </p>
            <div className="row">
              <button className="btn-secondary" onClick={() => mark(setStartTxt)}>🚩 MARCAR INICIO</button>
              <button className="btn-secondary" onClick={() => mark(setEndTxt)}>🏁 MARCAR FIN</button>
            </div>
            <div className="row">
              <div style={{ flex: 1 }}>
                <label>Inicio</label>
                <input type="text" placeholder="01:23:14" value={startTxt} onChange={(e) => setStartTxt(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label>Fin</label>
                <input type="text" placeholder="01:28:02" value={endTxt} onChange={(e) => setEndTxt(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label>Duración</label>
                <input type="text" readOnly value={start != null && end != null && end > start ? fmtTime(end - start) : '—'} />
              </div>
            </div>
            <button className="btn-primary" onClick={save}>GUARDAR</button>
          </>
        )}
        {msg && <div className="card" role="status">{msg}</div>}
      </>
    );
  }

  return (
    <>
      <h1>Catalogar vídeos</h1>
      <p className="muted">
        Asigna el vídeo de YouTube y marca inicio/fin de cada actuación (mejor en ordenador). Cuando termines,
        exporta el catálogo y pásaselo a Claude para fijarlo en el dataset publicado.
      </p>
      <button className="btn-secondary" onClick={exportCatalog} disabled={done.length === 0}>
        ⬇️ Exportar catálogo ({done.length})
      </button>

      <h2>Pendientes ({pending.length})</h2>
      {pending.map((p) => {
        const comp = data.compById.get(p.competitionId);
        const aka = data.athleteById.get(p.akaAthleteId);
        const ao = data.athleteById.get(p.aoAthleteId);
        return (
          <div className="card perf-item" key={p.id}>
            <div className="meta">{comp?.name} · {data.categoryById.get(p.categoryId)?.name} · {roundLabel(p.roundType)}</div>
            <div className="who">🔴 {aka?.displayName} vs 🔵 {ao?.displayName}</div>
            <div className="meta">{p.videoId ? '🎥 Vídeo asignado, faltan tiempos' : '⚪ Sin vídeo'}</div>
            <button className="btn-secondary" onClick={() => open(p.id)}>CATALOGAR</button>
          </div>
        );
      })}

      <h2>Listas ({done.length})</h2>
      {done.map((p) => {
        const comp = data.compById.get(p.competitionId);
        const aka = data.athleteById.get(p.akaAthleteId);
        const ao = data.athleteById.get(p.aoAthleteId);
        return (
          <div className="card perf-item" key={p.id}>
            <div className="meta">{comp?.name} · {roundLabel(p.roundType)} · {fmtTime(p.startSeconds)} → {fmtTime(p.endSeconds)}</div>
            <div className="who">🔴 {aka?.displayName} vs 🔵 {ao?.displayName}</div>
            <button onClick={() => open(p.id)}>Editar</button>
          </div>
        );
      })}
    </>
  );
}
