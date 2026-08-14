// Fusiona un export de la pantalla Catalogar en el dataset.
// Uso: node scripts/merge-catalog.mjs <catalogo.json>
// Depura duplicados: si dos actuaciones hermanas traen exactamente el mismo vídeo+timestamps
// (artefacto de datos locales antiguos), se conserva solo en la que ya lo tenía en el dataset.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const datasetPath = join(here, '..', 'public', 'data', 'dataset.json');
const catalog = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const ds = JSON.parse(readFileSync(datasetPath, 'utf8'));
const perfById = new Map(ds.performances.map((p) => [p.id, p]));

const sig = (e) => `${e.videoId}|${e.startSeconds}|${e.endSeconds}`;
const entries = (catalog.entries || []).filter((e) => perfById.has(e.performanceId));
const missing = (catalog.entries || []).filter((e) => !perfById.has(e.performanceId));

// detectar firmas duplicadas dentro del mismo campeonato+categoría
const groups = new Map();
for (const e of entries) {
  const p = perfById.get(e.performanceId);
  const key = `${p.competitionId}|${p.categoryId}|${sig(e)}`;
  (groups.get(key) ?? groups.set(key, []).get(key)).push(e);
}

let applied = 0, skipped = 0;
const report = [];
for (const [key, list] of groups) {
  let chosen = list;
  if (list.length > 1) {
    // duplicado: quedarnos con la actuación que YA tiene ese vídeo en el dataset
    const owner = list.filter((e) => {
      const p = perfById.get(e.performanceId);
      return p.videoId === e.videoId && p.startSeconds === e.startSeconds && p.endSeconds === e.endSeconds;
    });
    chosen = owner.length ? owner : [list[0]];
    for (const e of list) if (!chosen.includes(e)) { skipped++; report.push(`duplicado omitido: ${e.performanceId}`); }
  }
  for (const e of chosen) {
    const p = perfById.get(e.performanceId);
    p.videoId = e.videoId; p.startSeconds = e.startSeconds; p.endSeconds = e.endSeconds; p.status = 'READY';
    applied++;
  }
}

ds.generatedAt = new Date().toISOString();
writeFileSync(datasetPath, JSON.stringify(ds, null, 2));
console.log(`aplicadas: ${applied}, duplicados omitidos: ${skipped}, ids no encontrados: ${missing.length}`);
missing.forEach((e) => console.log(' ? ', e.performanceId));
report.forEach((s) => console.log(' - ', s));
console.log('READY total:', ds.performances.filter((p) => p.status === 'READY').length);
