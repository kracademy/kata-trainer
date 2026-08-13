import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { requestPersistentStorage } from './db/db';
import { syncDataset } from './data/dataset';

requestPersistentStorage();
syncDataset(); // carga el dataset publicado y lo fusiona en IndexedDB (no bloquea el arranque)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
