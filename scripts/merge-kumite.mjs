// Fusiona un export de Catalogar Kumite en public/data/kumite-dataset.json.
// Uso: node scripts/merge-kumite.mjs <kumite-catalogo.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const datasetPath = join(here, '..', 'public', 'data', 'kumite-dataset.json');
const catalog = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const ds = JSON.parse(readFileSync(datasetPath, 'utf8'));

const byId = new Map(ds.clips.map((c) => [c.id, c]));
let added = 0, updated = 0;
for (const clip of catalog.clips || []) {
  if (byId.has(clip.id)) updated++; else added++;
  byId.set(clip.id, clip);
}
ds.clips = [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
ds.generatedAt = new Date().toISOString();
writeFileSync(datasetPath, JSON.stringify(ds, null, 2));
console.log(`clips añadidos: ${added}, actualizados: ${updated}, total: ${ds.clips.length}`);
const polemic = ds.clips.filter((c) => c.polemic).length;
console.log(`polémicas: ${polemic}`);
