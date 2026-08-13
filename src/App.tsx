import { NavLink, Route, Routes } from 'react-router-dom';
import Home from './screens/Home';
import Train from './screens/Train';
import Library from './screens/Library';
import ErrorsScreen from './screens/ErrorsScreen';
import Stats from './screens/Stats';
import Catalog from './screens/Catalog';
import Settings from './screens/Settings';

const tabs = [
  { to: '/', ico: '🏠', label: 'Inicio' },
  { to: '/entrenar', ico: '🥋', label: 'Entrenar' },
  { to: '/biblioteca', ico: '🎥', label: 'Biblioteca' },
  { to: '/estadisticas', ico: '📊', label: 'Stats' },
  { to: '/ajustes', ico: '⚙️', label: 'Ajustes' },
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
