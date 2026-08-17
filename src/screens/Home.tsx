import { useNavigate } from 'react-router-dom';
import { useCatalog } from '../logic/useCatalog';
import { accuracy, currentStreak, pendingErrors } from '../logic/stats';

export default function Home() {
  const nav = useNavigate();
  const { performances, attempts, attemptsByPerf } = useCatalog();

  const ready = performances.filter((p) => p.status === 'READY');
  const firstAttempts = attempts.filter((a) => a.isFirstAttempt);
  const errors = pendingErrors(performances, attemptsByPerf);

  return (
    <>
      <h1>KRACADEMY REFEREE TRAINER</h1>

      <div className="grid2" style={{ marginBottom: 4 }}>
        <button className="module-card" onClick={() => nav('/entrenar')}>
          <span className="mod-emoji">🥋</span>
          <span className="mod-name">KATA</span>
          <span className="mod-sub">AKA vs AO</span>
        </button>
        <button className="module-card" onClick={() => nav('/kumite')}>
          <span className="mod-emoji">🥊</span>
          <span className="mod-name">KUMITE</span>
          <span className="mod-sub">Decisiones del central</span>
        </button>
      </div>

      <h2>Kata</h2>
      <div className="grid2">
        <div className="stat-tile">
          <div className="v">🔥 {currentStreak(attempts)}</div>
          <div className="l">Tu racha</div>
        </div>
        <div className="stat-tile">
          <div className="v">🎯 {accuracy(firstAttempts) ?? '--'}%</div>
          <div className="l">Precisión 1er intento</div>
        </div>
        <div className="stat-tile">
          <div className="v">🎥 {ready.length}</div>
          <div className="l">Actuaciones listas</div>
        </div>
        <div className="stat-tile">
          <div className="v">🔴 {errors.length}</div>
          <div className="l">Errores pendientes</div>
        </div>
      </div>

      <button className="btn-primary" onClick={() => nav('/entrenar')}>
        ENTRENAR
      </button>
      <button className="btn-secondary" onClick={() => nav('/errores')} disabled={errors.length === 0}>
        REPASAR ERRORES {errors.length > 0 ? `(${errors.length})` : ''}
      </button>

      {ready.length === 0 && (
        <div className="card muted">
          Aún no hay actuaciones listas para entrenar. Ve a <b>Biblioteca → Catalogar</b> en el ordenador para
          asignar vídeos y marcar inicio/fin de cada actuación.
        </div>
      )}
    </>
  );
}
