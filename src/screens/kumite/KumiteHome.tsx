import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';

export default function KumiteHome() {
  const nav = useNavigate();
  const clips = useLiveQuery(() => db.kumiteClips.toArray(), []) ?? [];
  const attempts = useLiveQuery(() => db.kumiteAttempts.toArray(), []) ?? [];

  const trainable = clips.filter((c) => !c.polemic);
  const polemics = clips.length - trainable.length;
  const correct = attempts.filter((a) => a.isCorrect).length;

  return (
    <>
      <div className="mod-topbar">
        <h1 style={{ margin: 0 }}>🥊 KUMITE</h1>
        <button className="switch-btn" onClick={() => nav('/kata')}>⇄ Kata</button>
      </div>

      <div className="grid2">
        <div className="stat-tile">
          <div className="v">🎬 {trainable.length}</div>
          <div className="l">Clips para entrenar</div>
        </div>
        <div className="stat-tile">
          <div className="v">🎯 {attempts.length ? Math.round((correct / attempts.length) * 100) : '--'}%</div>
          <div className="l">Aciertos ({attempts.length} intentos)</div>
        </div>
        <div className="stat-tile">
          <div className="v">🔥 {polemics}</div>
          <div className="l">Situaciones polémicas</div>
        </div>
        <div className="stat-tile">
          <div className="v">🤼 {new Set(clips.map((c) => c.videoId)).size}</div>
          <div className="l">Combates</div>
        </div>
      </div>

      <button className="btn-primary" onClick={() => nav('/kumite/entrenar')}>
        ENTRENAR
      </button>
      <Link to="/kumite/polemicas">
        <button className="btn-secondary">🔥 Situaciones polémicas {polemics > 0 ? `(${polemics})` : ''}</button>
      </Link>

      {clips.length === 0 && (
        <div className="card muted">
          Aún no hay clips de kumite. En el ordenador, ve a <b>Biblioteca → Catalogar clips</b>: carga un vídeo de
          YouTube, corta cada situación hasta el YAME (Yuko, agarres, Jogai, Mubobi, exagerar, simular…) y registra la
          decisión real del árbitro central. Practica la decisión antes de verla.
        </div>
      )}
    </>
  );
}
