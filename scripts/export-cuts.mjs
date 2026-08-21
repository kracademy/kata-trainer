// Genera el listado de vídeos y cortes del dataset (CSV + MD) en la carpeta /video.
// El nombre de archivo sugerido es el que la app reconoce para reproducción local:
//   <performanceId>.mp4  → clip del encuentro ya cortado (tiempos relativos al clip)
//   <videoId>.mp4        → vídeo completo de YouTube (la app usa los tiempos absolutos)
// Uso: node scripts/export-cuts.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ds = JSON.parse(readFileSync(join(here, '..', 'public', 'data', 'dataset.json'), 'utf8'));
const outDir = join(here, '..', '..', 'video');
mkdirSync(outDir, { recursive: true });

const athById = new Map(ds.athletes.map((a) => [a.id, a]));
const compById = new Map(ds.competitions.map((c) => [c.id, c]));
const catById = new Map(ds.categories.map((c) => [c.id, c]));

const hms = (s) => {
  if (s == null) return '';
  s = Math.floor(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`;
};
const name = (id) => {
  const a = athById.get(id);
  return a ? `${a.displayName} (${a.countryCode})` : '';
};

const perfs = ds.performances
  .filter((p) => p.videoId)
  .sort((a, b) => a.id.localeCompare(b.id));

// ---------- CSV (separador ; para Excel en castellano, con BOM) ----------
const rows = [[
  'archivo_clip_sugerido', 'video_youtube', 'url_con_minuto',
  'inicio', 'fin', 'inicio_seg', 'fin_seg',
  'aka_inicio', 'aka_fin', 'ao_inicio', 'ao_fin',
  'campeonato', 'categoria', 'ronda', 'aka', 'ao', 'nota',
]];
for (const p of perfs) {
  rows.push([
    `${p.id}.mp4`, p.videoId,
    `https://www.youtube.com/watch?v=${p.videoId}${p.startSeconds != null ? `&t=${Math.floor(p.startSeconds)}s` : ''}`,
    hms(p.startSeconds), hms(p.endSeconds), p.startSeconds ?? '', p.endSeconds ?? '',
    hms(p.akaStartSeconds), hms(p.akaEndSeconds), hms(p.aoStartSeconds), hms(p.aoEndSeconds),
    compById.get(p.competitionId)?.name ?? '', catById.get(p.categoryId)?.name ?? '', p.roundType,
    name(p.akaAthleteId), name(p.aoAthleteId),
    p.endSeconds == null ? 'FALTA MARCAR EL FIN' : (p.aoVideoId ? `AO en otro video: ${p.aoVideoId}` : ''),
  ]);
}
const csv = '﻿' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
writeFileSync(join(outDir, 'listado-cortes.csv'), csv);

// ---------- resumen por vídeo (cuántos cortes salen de cada vídeo de YouTube) ----------
const byVideo = new Map();
for (const p of perfs) {
  (byVideo.get(p.videoId) ?? byVideo.set(p.videoId, []).get(p.videoId)).push(p);
  if (p.aoVideoId) (byVideo.get(p.aoVideoId) ?? byVideo.set(p.aoVideoId, []).get(p.aoVideoId)).push(p);
}
let md = '# Vídeos y cortes — Kracademy Referee Trainer\n\n';
md += `Generado: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · ${perfs.length} encuentros con vídeo · ${byVideo.size} vídeos de YouTube\n\n`;
md += '## Cómo nombrar los archivos para que la app los reconozca\n\n';
md += '- **Opción A (recomendada)** — un archivo por encuentro, ya cortado: nómbralo exactamente como `archivo_clip_sugerido` del CSV (p. ej. `wkf-worlds-2025-cairo_senior-female-kata_final.mp4`). La app entiende que el archivo empieza en el `inicio` del encuentro.\n';
md += '- **Opción B** — el vídeo completo sin cortar: nómbralo `<id_de_youtube>.mp4` (p. ej. `qYNwUA8D0z4.mp4`). La app salta sola a los minutos correctos. Ojo: los directos largos ocupan varios GB.\n';
md += '- Formatos aceptados: .mp4, .m4v, .mov, .webm.\n';
md += '- Se cargan en la app desde **Ajustes → Vídeos locales** (en el iPhone puedes elegirlos desde Archivos/iCloud Drive).\n\n';
md += '## Vídeos (ordenados por nº de cortes)\n\n';
const sorted = [...byVideo.entries()].sort((a, b) => b[1].length - a[1].length);
for (const [vid, list] of sorted) {
  const comps = [...new Set(list.map((p) => compById.get(p.competitionId)?.name))].join(' · ');
  md += `### https://www.youtube.com/watch?v=${vid}\n${comps} — **${list.length} corte${list.length !== 1 ? 's' : ''}**\n\n`;
  for (const p of [...list].sort((x, y) => (x.startSeconds ?? 0) - (y.startSeconds ?? 0))) {
    const cat = catById.get(p.categoryId)?.name ?? '';
    md += `- \`${p.id}.mp4\` — ${hms(p.startSeconds)} → ${p.endSeconds != null ? hms(p.endSeconds) : '**⚠️ falta fin**'} · ${cat} · 🔴 ${name(p.akaAthleteId)} vs 🔵 ${name(p.aoAthleteId)}`;
    if (p.akaStartSeconds != null) md += ` · AKA ${hms(p.akaStartSeconds)}–${hms(p.akaEndSeconds)} / AO ${hms(p.aoStartSeconds)}–${hms(p.aoEndSeconds)}`;
    md += '\n';
  }
  md += '\n';
}
writeFileSync(join(outDir, 'listado-cortes.md'), md);
console.log(`listado-cortes.csv y .md generados en ${outDir}`);
console.log(`encuentros con vídeo: ${perfs.length} · vídeos únicos: ${byVideo.size} · sin fin marcado: ${perfs.filter((p) => p.endSeconds == null).length}`);
