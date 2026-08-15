import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../logic/useCatalog';
import { roundLabel } from '../logic/format';
import YouTubePlayer from '../components/YouTubePlayer';
import type { Performance } from '../db/types';

/** Una ejecución concreta de un kata: atleta + lado + clip. */
interface Execution {
  perf: Performance;
  side: 'AKA' | 'AO';
  athleteId: string;
  kata: string;
  /** Clip del atleta si está catalogado; si no, el del encuentro completo. */
  start?: number;
  end?: number;
  isSubClip: boolean;
  won: boolean;
}

export default function KataStudy() {
  const data = useCatalog();
  const { performances, compById, categoryById, athleteById } = data;
  const [q, setQ] = useState('');
  const [selectedKata, setSelectedKata] = useState<string | null>(null);
  const [playing, setPlaying] = useState<Execution | null>(null);

  const executions = useMemo(() => {
    const out: Execution[] = [];
    for (const p of performances) {
      if (!p.videoId) continue;
      if (p.kataAka) {
        out.push({
          perf: p, side: 'AKA', athleteId: p.akaAthleteId, kata: p.kataAka,
          start: p.akaStartSeconds ?? p.startSeconds, end: p.akaEndSeconds ?? p.endSeconds,
          isSubClip: p.akaStartSeconds != null && p.akaEndSeconds != null,
          won: p.officialWinner === 'AKA',
        });
      }
      if (p.kataAo) {
        out.push({
          perf: p, side: 'AO', athleteId: p.aoAthleteId, kata: p.kataAo,
          start: p.aoStartSeconds ?? p.startSeconds, end: p.aoEndSeconds ?? p.endSeconds,
          isSubClip: p.aoStartSeconds != null && p.aoEndSeconds != null,
          won: p.officialWinner === 'AO',
        });
      }
    }
    return out;
  }, [performances]);

  const kataStats = useMemo(() => {
    const m = new Map<string, { total: number; subClips: number }>();
    for (const e of executions) {
      const s = m.get(e.kata) ?? { total: 0, subClips: 0 };
      s.total++;
      if (e.isSubClip) s.subClips++;
      m.set(e.kata, s);
    }
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]));
  }, [executions]);

  const filteredKatas = kataStats.filter(([k]) => !q || k.toLowerCase().includes(q.toLowerCase()));

  const list = useMemo(() => {
    if (!selectedKata) return [];
    return executions
      .filter((e) => e.kata === selectedKata)
      .sort((a, b) => (compById.get(b.perf.competitionId)?.dateStart ?? '').localeCompare(compById.get(a.perf.competitionId)?.dateStart ?? ''));
  }, [executions, selectedKata, compById]);

  if (playing) {
    const ath = athleteById.get(playing.athleteId);
    const comp = compById.get(playing.perf.competitionId);
    const cat = categoryById.get(playing.perf.categoryId);
    return (
      <>
        <h1>{playing.kata}</h1>
        <div className="player-wrap">
          <YouTubePlayer
            videoId={playing.perf.videoId!}
            startSeconds={playing.start}
            endSeconds={playing.end}
            controls={true}
          />
        </div>
        <div className="card perf-item" style={{ marginTop: 12 }}>
          <div className="who">
            <span style={{ color: playing.side === 'AKA' ? 'var(--aka)' : 'var(--ao)', fontWeight: 800 }}>{playing.side}</span>{' '}
            {ath?.displayName} <span className="muted">({ath?.countryCode})</span>
            {playing.won && ' 🏆'}
          </div>
          <div className="meta">{comp?.name} · {cat?.name} · {roundLabel(playing.perf.roundType)}</div>
          {!playing.isSubClip && (
            <div className="meta">⚠️ Sin tiempos por atleta: se muestra el encuentro completo.</div>
          )}
        </div>
        <button className="btn-primary" onClick={() => setPlaying(null)}>← VOLVER A LA LISTA</button>
      </>
    );
  }

  if (selectedKata) {
    return (
      <>
        <h1>{selectedKata}</h1>
        <button className="btn-secondary" onClick={() => setSelectedKata(null)}>← Todos los katas</button>
        <h2>{list.length} ejecuciones</h2>
        {list.map((e, i) => {
          const ath = athleteById.get(e.athleteId);
          const comp = compById.get(e.perf.competitionId);
          const cat = categoryById.get(e.perf.categoryId);
          return (
            <div className="card perf-item" key={`${e.perf.id}-${e.side}-${i}`} onClick={() => setPlaying(e)} style={{ cursor: 'pointer' }}>
              <div className="who">
                <span style={{ color: e.side === 'AKA' ? 'var(--aka)' : 'var(--ao)', fontWeight: 800 }}>{e.side}</span>{' '}
                {ath?.displayName} <span className="muted">({ath?.countryCode})</span>
                {e.won && ' 🏆'}
              </div>
              <div className="meta">
                {comp?.name} · {cat?.name} · <span className="badge round">{roundLabel(e.perf.roundType)}</span>{' '}
                {e.isSubClip ? <span className="badge ready">🎬 Clip del atleta</span> : <span className="badge nodata">Encuentro completo</span>}
              </div>
            </div>
          );
        })}
      </>
    );
  }

  return (
    <>
      <h1>Estudio de katas</h1>
      <p className="muted">
        Todas las ejecuciones de cada kata en el dataset. Los clips por atleta se marcan en{' '}
        <Link to="/catalogar">Catalogar</Link>.
      </p>
      <input type="text" placeholder="Buscar kata… p. ej. Ohan Dai" value={q} onChange={(e) => setQ(e.target.value)} />
      <h2>{filteredKatas.length} katas</h2>
      {filteredKatas.map(([kata, s]) => (
        <div className="card perf-item" key={kata} onClick={() => setSelectedKata(kata)} style={{ cursor: 'pointer' }}>
          <div className="who">{kata}</div>
          <div className="meta">
            {s.total} ejecuci{s.total === 1 ? 'ón' : 'ones'}
            {s.subClips > 0 && <> · <span className="badge ready">🎬 {s.subClips} con clip del atleta</span></>}
          </div>
        </div>
      ))}
    </>
  );
}
