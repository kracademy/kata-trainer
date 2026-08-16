import { useMemo, useRef, useState } from 'react';
import { db } from '../db/db';
import { useCatalog } from '../logic/useCatalog';
import { computeStatus } from '../data/dataset';
import YouTubePlayer, { type YouTubePlayerHandle } from '../components/YouTubePlayer';
import { extractYouTubeId, fmtTime, parseTime, roundLabel } from '../logic/format';
import { downloadJson } from '../logic/backup';
import type { CatalogExport, Performance } from '../db/types';

const ROUND_ORDER: Record<string, number> = { FINAL: 2, BRONZE_1: 0, BRONZE_2: 1, OTHER: 3 };

export default function Catalog() {
  const data = useCatalog();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [videoId, setVideoId] = useState<string | undefined>();
  const [startTxt, setStartTxt] = useState('');
  const [endTxt, setEndTxt] = useState('');
  const [offAka, setOffAka] = useState('');
  const [offAo, setOffAo] = useState('');
  const [offJudges, setOffJudges] = useState('5');
  const [akaIni, setAkaIni] = useState('');
  const [akaFin, setAkaFin] = useState('');
  const [aoIni, setAoIni] = useState('');
  const [aoFin, setAoFin] = useState('');
  const [ajustado, setAjustado] = useState(false);
  const [nota, setNota] = useState('');
  const [msg, setMsg] = useState('');
  const [showDone, setShowDone] = useState(false);
  const playerRef = useRef<YouTubePlayerHandle>(null);

  const perf = selectedId ? data.performances.find((p) => p.id === selectedId) : null;

  /** Competiciones en orden cronológico (año y, dentro del año, orden de SportData). */
  const groups = useMemo(() => {
    const byComp = new Map<string, Performance[]>();
    for (const p of data.performances) {
      (byComp.get(p.competitionId) ?? byComp.set(p.competitionId, []).get(p.competitionId)!).push(p);
    }
    return [...byComp.entries()]
      .map(([compId, perfs]) => ({
        comp: data.compById.get(compId),
        perfs: perfs.sort(
          (a, b) =>
            (data.categoryById.get(a.categoryId)?.name ?? '').localeCompare(data.categoryById.get(b.categoryId)?.name ?? '') ||
            (ROUND_ORDER[a.roundType] ?? 9) - (ROUND_ORDER[b.roundType] ?? 9),
        ),
        pending: perfs.filter((p) => p.status !== 'READY').length,
      }))
      .sort(
        (a, b) =>
          // más recientes primero, por fecha real del campeonato
          (b.comp?.dateStart ?? `${b.comp?.year ?? 0}`).localeCompare(a.comp?.dateStart ?? `${a.comp?.year ?? 0}`),
      );
  }, [data.performances, data.compById, data.categoryById]);

  const doneCount = data.performances.filter((p) => p.status === 'READY').length;
  const pendingCount = data.performances.length - doneCount;

  function open(id: string) {
    const p = data.performances.find((x) => x.id === id);
    setSelectedId(id);
    setVideoId(p?.videoId);
    setUrlInput(p?.videoId ? `https://www.youtube.com/watch?v=${p.videoId}` : '');
    setStartTxt(p?.startSeconds != null ? fmtTime(p.startSeconds) : '');
    setEndTxt(p?.endSeconds != null ? fmtTime(p.endSeconds) : '');
    setOffAka(p?.officialScoreAka != null ? String(p.officialScoreAka) : '');
    setOffAo(p?.officialScoreAo != null ? String(p.officialScoreAo) : '');
    setOffJudges(String(p?.judgesCount ?? 5));
    setAkaIni(p?.akaStartSeconds != null ? fmtTime(p.akaStartSeconds) : '');
    setAkaFin(p?.akaEndSeconds != null ? fmtTime(p.akaEndSeconds) : '');
    setAoIni(p?.aoStartSeconds != null ? fmtTime(p.aoStartSeconds) : '');
    setAoFin(p?.aoEndSeconds != null ? fmtTime(p.aoEndSeconds) : '');
    setAjustado(p?.closeResult ?? false);
    setNota(p?.userNote ?? '');
    setMsg('');
  }

  function applyUrl(raw?: string) {
    const id = extractYouTubeId(raw ?? urlInput);
    if (!id) { setMsg('URL de YouTube no reconocida.'); return; }
    setVideoId(id);
    setUrlInput(`https://www.youtube.com/watch?v=${id}`);
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
    // puntuaciones oficiales vistas en el vídeo (opcional)
    const nAka = parseFloat(offAka.replace(',', '.'));
    const nAo = parseFloat(offAo.replace(',', '.'));
    if (!isNaN(nAka) && !isNaN(nAo)) {
      updated.officialScoreAka = nAka;
      updated.officialScoreAo = nAo;
      updated.judgesCount = +offJudges || 5;
    }
    // sub-clips por atleta (opcional, ambos tiempos del atleta o ninguno)
    const aIni = parseTime(akaIni), aFin = parseTime(akaFin);
    const oIni = parseTime(aoIni), oFin = parseTime(aoFin);
    if (aIni != null && aFin != null && aFin > aIni) { updated.akaStartSeconds = aIni; updated.akaEndSeconds = aFin; }
    else { delete updated.akaStartSeconds; delete updated.akaEndSeconds; }
    if (oIni != null && oFin != null && oFin > oIni) { updated.aoStartSeconds = oIni; updated.aoEndSeconds = oFin; }
    else { delete updated.aoStartSeconds; delete updated.aoEndSeconds; }
    // resultado ajustado + nota del usuario (se muestran en el reveal, tras decidir)
    if (ajustado) updated.closeResult = true; else delete updated.closeResult;
    const n = nota.trim();
    if (n) updated.userNote = n; else delete updated.userNote;
    updated.status = computeStatus(updated);
    await db.performances.put(updated);
    setMsg(`✅ Guardado (${fmtTime(start)} → ${fmtTime(end)}, duración ${fmtTime(end - start)}).`);
  }

  async function exportCatalog() {
    const entries = (await db.performances.toArray())
      .filter((p) => p.videoId && p.startSeconds != null && p.endSeconds != null)
      .map((p) => ({
        performanceId: p.id,
        videoId: p.videoId!,
        startSeconds: p.startSeconds!,
        endSeconds: p.endSeconds!,
        ...(p.officialScoreAka != null ? { officialScoreAka: p.officialScoreAka, officialScoreAo: p.officialScoreAo, judgesCount: p.judgesCount } : {}),
        ...(p.akaStartSeconds != null ? { akaStartSeconds: p.akaStartSeconds, akaEndSeconds: p.akaEndSeconds } : {}),
        ...(p.aoStartSeconds != null ? { aoStartSeconds: p.aoStartSeconds, aoEndSeconds: p.aoEndSeconds } : {}),
        ...(p.closeResult ? { closeResult: true } : {}),
        ...(p.userNote ? { note: p.userNote } : {}),
      }));
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
    const candidates = comp?.candidateVideos ?? [];
    return (
      <>
        <button onClick={() => setSelectedId(null)}>← Volver a la lista</button>
        <h1 style={{ marginTop: 12, fontSize: '1.4rem' }}>{comp?.name}</h1>
        <div className="card perf-item">
          <div className="meta">{cat?.name} · {roundLabel(perf.roundType)}</div>
          <div className="who">
            🔴 {aka?.displayName} <span className="muted">({aka?.countryCode})</span> vs 🔵 {ao?.displayName}{' '}
            <span className="muted">({ao?.countryCode})</span>
          </div>
          <div className="meta">Katas: {perf.kataAka ?? '—'} / {perf.kataAo ?? '—'} · Ganador oficial: {perf.officialWinner}</div>
          <div className="meta">
            {perf.officialScoreAka != null
              ? <span className="badge ready">Puntuaciones: {perf.officialScoreAka} – {perf.officialScoreAo}</span>
              : perf.judgeVotes
                ? <span className="badge nodata">Votos {perf.judgeVotes.aka}–{perf.judgeVotes.ao} · sin totales en SportData</span>
                : <span className="badge missing">⚠️ Sin puntuaciones oficiales</span>}
          </div>
          {perf.sportDataUrl && <a href={perf.sportDataUrl} target="_blank" rel="noreferrer">Ver en SportData</a>}
        </div>

        {candidates.length > 0 && (
          <>
            <label>Vídeos candidatos (canal WKF · Live)</label>
            <select value={videoId && candidates.some((c) => c.id === videoId) ? videoId : ''} onChange={(e) => e.target.value && applyUrl(e.target.value)}>
              <option value="">— Elegir emisión del campeonato —</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </>
        )}
        <a
          href={`https://www.youtube.com/@WKFKarateWorldChamps/search?query=${encodeURIComponent(
            `${comp?.name?.replace(/^(WKF|Karate1|Karate One)\s*/i, '').split('-').pop()?.trim() ?? ''}`,
          )}`}
          target="_blank"
          rel="noreferrer"
        >
          <button className="btn-secondary">🔎 Buscar emisiones en el canal WKF</button>
        </a>

        <label>URL de YouTube</label>
        <div className="row">
          <input type="url" placeholder="https://www.youtube.com/watch?v=…" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} />
          <button onClick={() => applyUrl()}>Cargar</button>
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
            <div className="card" style={{ marginTop: 12 }}>
              <label style={{ margin: '0 0 6px' }}>Tiempos por atleta (opcional · entrena AKA y AO por separado + modo estudio)</label>
              <div className="row" style={{ marginBottom: 8 }}>
                <button className="btn-secondary" style={{ margin: 0, color: 'var(--aka)' }} onClick={() => mark(setAkaIni)}>🚩 AKA</button>
                <button className="btn-secondary" style={{ margin: 0, color: 'var(--aka)' }} onClick={() => mark(setAkaFin)}>🏁 AKA</button>
                <button className="btn-secondary" style={{ margin: 0, color: 'var(--ao)' }} onClick={() => mark(setAoIni)}>🚩 AO</button>
                <button className="btn-secondary" style={{ margin: 0, color: 'var(--ao)' }} onClick={() => mark(setAoFin)}>🏁 AO</button>
              </div>
              <div className="row">
                <input type="text" placeholder="Inicio AKA" value={akaIni} onChange={(e) => setAkaIni(e.target.value)} />
                <input type="text" placeholder="Fin AKA" value={akaFin} onChange={(e) => setAkaFin(e.target.value)} />
                <input type="text" placeholder="Inicio AO" value={aoIni} onChange={(e) => setAoIni(e.target.value)} />
                <input type="text" placeholder="Fin AO" value={aoFin} onChange={(e) => setAoFin(e.target.value)} />
              </div>
            </div>
            <div className="card" style={{ marginTop: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, cursor: 'pointer' }}>
                <input type="checkbox" checked={ajustado} onChange={(e) => setAjustado(e.target.checked)} style={{ width: 'auto', margin: 0 }} />
                ⚖️ Resultado ajustado (se avisará tras decidir: no dudes de ti)
              </label>
              <label style={{ margin: '12px 0 6px' }}>Nota (opcional, se muestra tras decidir)</label>
              <input
                type="text"
                placeholder="p. ej. Los miembros de la comisión votaron a AKA"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
              />
            </div>
            {perf.officialScoreAka == null && (
              <div className="card" style={{ marginTop: 12 }}>
                <label style={{ margin: '0 0 6px' }}>Puntuaciones oficiales (si se ven en el vídeo)</label>
                <div className="row">
                  <input type="text" inputMode="decimal" placeholder="Total AKA" value={offAka} onChange={(e) => setOffAka(e.target.value)} />
                  <input type="text" inputMode="decimal" placeholder="Total AO" value={offAo} onChange={(e) => setOffAo(e.target.value)} />
                  <select value={offJudges} onChange={(e) => setOffJudges(e.target.value)} style={{ flex: '0 0 30%' }}>
                    <option value="5">5 jueces</option>
                    <option value="7">7 jueces</option>
                    <option value="3">3 (70/30)</option>
                  </select>
                </div>
              </div>
            )}
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
        En orden cronológico, agrupado por campeonato: busca la emisión en la pestaña <b>"Live"</b> del canal de
        YouTube de la WKF (o elige un vídeo candidato precargado) y marca inicio/fin de cada actuación. Al terminar,
        exporta el catálogo y pásaselo a Claude.
      </p>
      <div className="row">
        <button className="btn-secondary" onClick={exportCatalog} disabled={doneCount === 0}>
          ⬇️ Exportar catálogo ({doneCount})
        </button>
        <button className="btn-secondary" onClick={() => setShowDone((s) => !s)}>
          {showDone ? 'Ocultar listas' : `Ver listas (${doneCount})`}
        </button>
      </div>
      <p className="muted center">{pendingCount} pendientes · {doneCount} listas</p>

      {groups.map(({ comp, perfs, pending }) => {
        if (!comp) return null;
        const visible = perfs.filter((p) => (showDone ? true : p.status !== 'READY'));
        if (!visible.length) return null;
        return (
          <div key={comp.id}>
            <div className="comp-header">
              <span className="name">{comp.name}</span>
              <span className="year">{comp.year} · {pending} pdte.</span>
            </div>
            {visible.map((p) => {
              const cat = data.categoryById.get(p.categoryId);
              const aka = data.athleteById.get(p.akaAthleteId);
              const ao = data.athleteById.get(p.aoAthleteId);
              const ready = p.status === 'READY';
              return (
                <div className="card perf-item" key={p.id}>
                  <div className="meta">
                    {cat?.name} · <span className="badge round">{roundLabel(p.roundType)}</span>{' '}
                    {ready
                      ? <span className="badge ready">🟢 {fmtTime(p.startSeconds)} → {fmtTime(p.endSeconds)}</span>
                      : p.videoId
                        ? <span className="badge nodata">🎥 Vídeo asignado, faltan tiempos</span>
                        : <span className="badge nodata">⚪ Sin vídeo</span>}{' '}
                    {ready && (p.akaStartSeconds != null && p.aoStartSeconds != null
                      ? <span className="badge ready">🎬 AKA/AO</span>
                      : <span className="badge nodata">⏱ Sin tiempos AKA/AO</span>)}
                  </div>
                  <div className="who">
                    🔴 {aka?.displayName} <span className="muted">({aka?.countryCode})</span> vs 🔵 {ao?.displayName}{' '}
                    <span className="muted">({ao?.countryCode})</span>
                  </div>
                  <button onClick={() => open(p.id)}>{ready ? 'Editar' : 'CATALOGAR'}</button>
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
