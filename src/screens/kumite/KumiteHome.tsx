import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import type { KumiteClip, KumiteSituation } from '../../db/types';
import { KUMITE_SITUATION_LABELS } from '../../db/types';
import KumiteSession from '../../components/KumiteSession';

const SITUATIONS = Object.keys(KUMITE_SITUATION_LABELS) as KumiteSituation[];

export default function KumiteHome() {
  const clips = useLiveQuery(() => db.kumiteClips.toArray(), []) ?? [];
  const attempts = useLiveQuery(() => db.kumiteAttempts.toArray(), []) ?? [];
  const [situation, setSituation] = useState('ALL');
  const [mode, setMode] = useState<'RANDOM' | 'BOUT'>('RANDOM');
  const [queue, setQueue] = useState<KumiteClip[] | null>(null);

  // los clips polémicos van a su propio apartado, no al entrenamiento normal
  const trainable = useMemo(() => clips.filter((c) => !c.polemic), [clips]);
  const filtered = useMemo(
    () => trainable.filter((c) => situation === 'ALL' || c.situations.includes(situation as KumiteSituation)),
    [trainable, situation],
  );
  const polemicCount = clips.length - trainable.length;
  const correct = attempts.filter((a) => a.isCorrect).length;

  function start() {
    let q = [...filtered];
    if (mode === 'BOUT') {
      // combate entero: en orden cronológico dentro de cada vídeo
      q.sort((a, b) => a.videoId.localeCompare(b.videoId) || a.startSeconds - b.startSeconds);
    } else {
      for (let i = q.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [q[i], q[j]] = [q[j], q[i]];
      }
    }
    setQueue(q);
  }

  if (queue) return <KumiteSession queue={queue} onExit={() => setQueue(null)} />;

  return (
    <>
      <h1>Kumite Trainer</h1>

      <div className="grid2">
        <div className="stat-tile">
          <div className="v">🎬 {trainable.length}</div>
          <div className="l">Clips para entrenar</div>
        </div>
        <div className="stat-tile">
          <div className="v">🎯 {attempts.length ? Math.round((correct / attempts.length) * 100) : '--'}%</div>
          <div className="l">Aciertos ({attempts.length} intentos)</div>
        </div>
      </div>

      <label>Situación a practicar</label>
      <select value={situation} onChange={(e) => setSituation(e.target.value)}>
        <option value="ALL">Todas las situaciones</option>
        {SITUATIONS.map((s) => (
          <option key={s} value={s}>{KUMITE_SITUATION_LABELS[s]}</option>
        ))}
      </select>

      <label>Modo</label>
      <select value={mode} onChange={(e) => setMode(e.target.value as 'RANDOM' | 'BOUT')}>
        <option value="RANDOM">Clips aleatorios</option>
        <option value="BOUT">Combate entero (clips en orden)</option>
      </select>

      <button className="btn-primary" onClick={start} disabled={filtered.length === 0}>
        ENTRENAR ({filtered.length})
      </button>

      <Link to="/kumite/polemicas">
        <button className="btn-secondary">🔥 Situaciones polémicas {polemicCount > 0 ? `(${polemicCount})` : ''}</button>
      </Link>
      <Link to="/kumite/catalogar">
        <button className="btn-secondary">🛠️ Catalogar clips (PC)</button>
      </Link>
      <Link to="/">
        <button className="btn-secondary">← Referee Trainer</button>
      </Link>

      {clips.length === 0 && (
        <div className="card muted">
          Aún no hay clips de kumite. En el ordenador, ve a <b>Catalogar clips</b>: carga un vídeo de YouTube, corta
          cada situación hasta el YAME (Yuko, agarres, Jogai, Mubobi, exagerar, simular…) y registra la decisión real
          del árbitro central. Practica la decisión antes de verla.
        </div>
      )}
    </>
  );
}
