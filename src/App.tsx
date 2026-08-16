import { NavLink, Route, Routes } from 'react-router-dom';
import Home from './screens/Home';
import Train from './screens/Train';
import Library from './screens/Library';
import ErrorsScreen from './screens/ErrorsScreen';
import Stats from './screens/Stats';
import Catalog from './screens/Catalog';
import KataStudy from './screens/KataStudy';
import Settings from './screens/Settings';

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
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="4.6" r="2.1" />
      <path d="M12 6.7v5.1" />
      <path d="M12 8.4 5.6 6.9M12 8.4l6.4-1.5" />
      <path d="M12 11.8l-4.2 4.6 1 4M12 11.8l3.4 2.4 4 .9" />
    </svg>
  ),
  gear: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.84 1.84M7.34 16.66 5.5 18.5M18.5 18.5l-1.84-1.84M7.34 7.34 5.5 5.5" />
    </svg>
  ),
};

const tabs = [
  { to: '/', ico: I.house, label: 'Inicio' },
  { to: '/entrenar', ico: I.play, label: 'Entrenar' },
  { to: '/katas', ico: I.figure, label: 'Katas' },
  { to: '/biblioteca', ico: I.stack, label: 'Biblioteca' },
  { to: '/estadisticas', ico: I.chart, label: 'Stats' },
  { to: '/ajustes', ico: I.gear, label: 'Ajustes' },
];

export default function App() {
  return (
    <>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/entrenar" element={<Train />} />
          <Route path="/biblioteca" element={<Library />} />
          <Route path="/errores" element={<ErrorsScreen />} />
          <Route path="/estadisticas" element={<Stats />} />
          <Route path="/catalogar" element={<Catalog />} />
          <Route path="/katas" element={<KataStudy />} />
          <Route path="/ajustes" element={<Settings />} />
        </Routes>
      </main>
      <nav className="bottom">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="ico">{t.ico}</span>
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
