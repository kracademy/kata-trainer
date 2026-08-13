# Kracademy Kata Trainer

PWA personal para entrenar decisiones de arbitraje de Kata WKF (AKA/AO) con vídeos reales de competiciones oficiales.

- **Stack**: React + TypeScript + Vite · Dexie (IndexedDB) · vite-plugin-pwa · GitHub Pages
- **Datos**: dataset curado en [`public/data/dataset.json`](public/data/dataset.json) (resultados oficiales de SportData). La app no hace scraping: los campeonatos nuevos se añaden actualizando el dataset y redesplegando.
- **Convención**: el competidor de arriba del bracket es **AKA** (rojo) y el de abajo **AO** (azul).
- Los vídeos se reproducen embebidos desde YouTube (solo se guardan URL + timestamps, nunca el vídeo).
- Los intentos y estadísticas del usuario viven solo en IndexedDB local, con export/import JSON.

## Desarrollo

```bash
npm install
npm run dev
```

## Despliegue

Push a `main` → GitHub Actions construye y publica en GitHub Pages.

Especificación y decisiones de arquitectura: carpeta del proyecto (`Especificación — Kracademy Kata Trainer.md` y `Fase 0 — Investigación técnica.md`).
