import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

/* Iconos de módulo, misma estética de línea que los tiles (SF Symbols) */
const kataIcon = (
  // karateka en zenkutsu-dachi con gyaku-tsuki
  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="15.6" cy="4.9" r="2" />
    <path d="M14.8 8.1 12 13.2" />
    <path d="M14.8 8.1h6.6" />
    <path d="M14.8 8.1l-3.6 2.6" />
    <path d="M12 13.2l3.6 3-0.2 4.4" />
    <path d="M12 13.2l-6.6 5.2" />
  </svg>
);

const kumiteIcon = (
  // kizami-tsuki jodan entre dos karatekas
  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6.6" cy="6.8" r="1.8" />
    <path d="M6.1 8.9 4.9 13.4" />
    <path d="M6.3 9.4l8.6-2.2" />
    <path d="M6.3 9.9 4 11.8" />
    <path d="M4.9 13.4l3.9 2.8-.3 4.2" />
    <path d="M4.9 13.4l-2.9 6" />
    <circle cx="17.9" cy="5.9" r="1.8" />
    <path d="M18.4 7.9l.9 5.3" />
    <path d="M18.3 8.4l-2.6 2.3" />
    <path d="M19.3 13.2l-1.6 6.4" />
    <path d="M19.3 13.2l2.7 5.9" />
  </svg>
);

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
        <span className="mod-icon" style={{ color: 'var(--aka)' }}>{kataIcon}</span>
        <span className="mod-name">KATA</span>
        <span className="mod-sub">AKA vs AO · {readyKata} actuaciones listas</span>
      </button>

      <button className="module-hero" onClick={() => nav('/kumite')}>
        <span className="mod-icon" style={{ color: 'var(--ao)' }}>{kumiteIcon}</span>
        <span className="mod-name">KUMITE</span>
        <span className="mod-sub">Decisiones del árbitro central · {kumiteClips} clips</span>
      </button>
    </div>
  );
}
