import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

/** Portada: elige módulo. Cada módulo es "una app" con sus propios menús; los datos se comparten sin perderse. */
export default function ModuleSelect() {
  const nav = useNavigate();
  const readyKata = useLiveQuery(() => db.performances.where('status').equals('READY').count(), []) ?? 0;
  const kumiteClips = useLiveQuery(() => db.kumiteClips.count(), []) ?? 0;

  return (
    <div className="module-select">
      <h1 style={{ textAlign: 'center', marginTop: 24 }}>KRACADEMY<br />REFEREE TRAINER</h1>
      <p className="muted center">¿Qué quieres practicar hoy?</p>

      <button className="module-hero" onClick={() => nav('/kata')}>
        <span className="mod-emoji">🥋</span>
        <span className="mod-name">KATA</span>
        <span className="mod-sub">AKA vs AO · {readyKata} actuaciones listas</span>
      </button>

      <button className="module-hero" onClick={() => nav('/kumite')}>
        <span className="mod-emoji">🥊</span>
        <span className="mod-name">KUMITE</span>
        <span className="mod-sub">Decisiones del árbitro central · {kumiteClips} clips</span>
      </button>
    </div>
  );
}
