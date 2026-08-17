import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import ModuleSelect from './screens/ModuleSelect';
import Home from './screens/Home';
import Train from './screens/Train';
import Library from './screens/Library';
import ErrorsScreen from './screens/ErrorsScreen';
import Stats from './screens/Stats';
import Catalog from './screens/Catalog';
import Settings from './screens/Settings';
import KataStudy from './screens/KataStudy';
import KumiteHome from './screens/kumite/KumiteHome';
import KumiteTrain from './screens/kumite/KumiteTrain';
import KumiteBouts from './screens/kumite/KumiteBouts';
import KumiteLibrary from './screens/kumite/KumiteLibrary';
import KumiteStats from './screens/kumite/KumiteStats';
import KumiteCatalog from './screens/kumite/KumiteCatalog';
import KumitePolemics from './screens/kumite/KumitePolemics';

/* Iconos estilo SF Symbols (trazo 1.7, currentColor) */
const I = {
  house: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9.2V19a1.5 1.5 0 0 0 1.5 1.5h10A1.5 1.5 0 0 0 18.5 19V9.2" />
      <path d="M9.8 20.2v-5.4a1.2 1.2 0 0 1 1.2-1.2h2a1.2 1.2 0 0 1 1.2 1.2v5.4" />
    </svg>
  ),
  play: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.75" />
      <path d="M10.2 8.9v6.2l5-3.1z" fill="currentColor" stroke="none" />
    </svg>
  ),
  stack: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="9.5" width="14" height="10" rx="2" />
      <path d="M7 6.8h10" />
      <path d="M8.8 4.2h6.4" />
      <path d="M10.6 12.4v4.2l3.6-2.1z" fill="currentColor" stroke="none" />
    </svg>
  ),
  chart: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="13" width="3.6" height="6.5" rx="1" />
      <rect x="10.2" y="8.5" width="3.6" height="11" rx="1" />
      <rect x="16.4" y="4.5" width="3.6" height="15" rx="1" />
    </svg>
  ),
  figure: (
    // karateka en zenkutsu-dachi con gyaku-tsuki (perfil, puño al frente)
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="15.6" cy="4.9" r="2" />
      <path d="M14.8 8.1 12 13.2" />
      <path d="M14.8 8.1h6.6" />
      <path d="M14.8 8.1l-3.6 2.6" />
      <path d="M12 13.2l3.6 3-0.2 4.4" />
      <path d="M12 13.2l-6.6 5.2" />
    </svg>
  ),
  spar: (
    // dos karatekas frente a frente (combates)
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.8" cy="5.6" r="1.9" />
      <path d="M6.4 8.6l1.4 4.2-1.6 7" />
      <path d="M6.6 9.2l4.6 2" />
      <path d="M7.8 12.8l-3.6 6.6" />
      <circle cx="18.2" cy="5.6" r="1.9" />
      <path d="M17.6 8.6l-1.4 4.2 1.6 7" />
      <path d="M17.4 9.2l-4.6 2" />
      <path d="M16.2 12.8l3.6 6.6" />
    </svg>
  ),
  gear: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.84 1.84M7.34 16.66 5.5 18.5M18.5 18.5l-1.84-1.84M7.34 7.34 5.5 5.5" />
    </svg>
  ),
};

const KATA_TABS = [
  { to: '/kata', ico: I.house, label: 'Inicio' },
  { to: '/kata/entrenar', ico: I.play, label: 'Entrenar' },
  { to: '/kata/katas', ico: I.figure, label: 'Katas' },
  { to: '/kata/biblioteca', ico: I.stack, label: 'Biblioteca' },
  { to: '/kata/estadisticas', ico: I.chart, label: 'Stats' },
  { to: '/kata/ajustes', ico: I.gear, label: 'Ajustes' },
];

const KUMITE_TABS = [
  { to: '/kumite', ico: I.house, label: 'Inicio' },
  { to: '/kumite/entrenar', ico: I.play, label: 'Entrenar' },
  { to: '/kumite/combates', ico: I.spar, label: 'Combates' },
  { to: '/kumite/biblioteca', ico: I.stack, label: 'Biblioteca' },
  { to: '/kumite/estadisticas', ico: I.chart, label: 'Stats' },
  { to: '/kumite/ajustes', ico: I.gear, label: 'Ajustes' },
];

export default function App() {
  const { pathname } = useLocation();
  // Dos "apps en una": cada módulo tiene su propia barra de pestañas; la portada no tiene ninguna.
  const tabs = pathname.startsWith('/kumite') ? KUMITE_TABS : pathname.startsWith('/kata') ? KATA_TABS : null;

  return (
    <>
      <main>
        <Routes>
          <Route path="/" element={<ModuleSelect />} />

          <Route path="/kata" element={<Home />} />
          <Route path="/kata/entrenar" element={<Train />} />
          <Route path="/kata/katas" element={<KataStudy />} />
          <Route path="/kata/biblioteca" element={<Library />} />
          <Route path="/kata/errores" element={<ErrorsScreen />} />
          <Route path="/kata/estadisticas" element={<Stats />} />
          <Route path="/kata/catalogar" element={<Catalog />} />
          <Route path="/kata/ajustes" element={<Settings />} />

          <Route path="/kumite" element={<KumiteHome />} />
          <Route path="/kumite/entrenar" element={<KumiteTrain />} />
          <Route path="/kumite/combates" element={<KumiteBouts />} />
          <Route path="/kumite/biblioteca" element={<KumiteLibrary />} />
          <Route path="/kumite/estadisticas" element={<KumiteStats />} />
          <Route path="/kumite/catalogar" element={<KumiteCatalog />} />
          <Route path="/kumite/polemicas" element={<KumitePolemics />} />
          <Route path="/kumite/ajustes" element={<Settings />} />

          {/* rutas antiguas → nuevas (marcadores/PWA ya instaladas) */}
          <Route path="/entrenar" element={<Navigate to="/kata/entrenar" replace />} />
          <Route path="/katas" element={<Navigate to="/kata/katas" replace />} />
          <Route path="/biblioteca" element={<Navigate to="/kata/biblioteca" replace />} />
          <Route path="/errores" element={<Navigate to="/kata/errores" replace />} />
          <Route path="/estadisticas" element={<Navigate to="/kata/estadisticas" replace />} />
          <Route path="/catalogar" element={<Navigate to="/kata/catalogar" replace />} />
          <Route path="/ajustes" element={<Navigate to="/kata/ajustes" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {tabs && (
        <nav className="bottom">
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.to === '/kata' || t.to === '/kumite'} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="ico">{t.ico}</span>
              <span>{t.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </>
  );
}
