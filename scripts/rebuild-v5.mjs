// Reconstruye las medal matches de los eventos 2023–2026 (formatos B/C) con los datos v5
// (parser de repesca corregido), conservando vídeos/timestamps por pareja de atletas.
// Uso: node scripts/rebuild-v5.mjs <kra_v5.json> <catalogo-usuario.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const datasetPath = join(here, '..', 'public', 'data', 'dataset.json');
const v5 = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const catalog = process.argv[3] ? JSON.parse(readFileSync(process.argv[3], 'utf8')) : { entries: [] };
const ds = JSON.parse(readFileSync(datasetPath, 'utf8'));

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const titleCase = (s) => s ? s.toLowerCase().replace(/(^|[\s\-'])\p{L}/gu, (c) => c.toUpperCase()) : s;

const compByVernr = new Map(ds.competitions.map((c) => [c.sportDataEventId, c]));
const athletes = new Map(ds.athletes.map((a) => [a.id, a]));
const perfById = new Map(ds.performances.map((p) => [p.id, p]));

// 1. Aplicar el catálogo del usuario sobre los IDs actuales (pareja antigua)
let applied = 0;
for (const e of catalog.entries || []) {
  const p = perfById.get(e.performanceId);
  if (!p) { console.log('catálogo: id no encontrado', e.performanceId); continue; }
  p.videoId = e.videoId; p.startSeconds = e.startSeconds; p.endSeconds = e.endSeconds;
  p.status = 'READY';
  applied++;
}

// 2. Mapa de vídeos por (comp, cat, pareja) para preservar al re-emparejar
const videoByPair = new Map();
for (const p of ds.performances) {
  if (!p.videoId) continue;
  const key = [p.competitionId, p.categoryId, [p.akaAthleteId, p.aoAthleteId].sort().join('~')].join('|');
  videoByPair.set(key, { videoId: p.videoId, startSeconds: p.startSeconds, endSeconds: p.endSeconds });
}

const CAT = { ind: { FEMALE: 'senior-female-kata', MALE: 'senior-male-kata' }, team: { FEMALE: 'senior-female-team-kata', MALE: 'senior-male-team-kata' } };

// Empates (hantei): el ganador según la clasificación oficial (rank1 en finales, rank3 en bronces)
const NORM = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z]/g, '').toUpperCase();
const TIES = {
  'karate1-premier-league-cairo-2023_senior-male-kata_final': ['QUINTEROCAPDEVILA'],
  'karate1-premier-league-dublin-2023_senior-female-kata_bronze_1': ['IWAMOTOEMIRI', 'ONOMAHO'],
  'karate1-premier-league-antalya-2024_senior-male-kata_bronze_2': ['ABESAKICHI', 'GHINAMIALESSIO'],
  'ekf-senior-championships-2024-zadar_senior-female-kata_final': ['BOZANDILARA'],
  'karate1-premier-league-cairo-2025_senior-female-kata_bronze_2': ['MARQUESRITA', 'GARCIALOZANOPAOLA'],
};
const report = [];
let rebuilt = 0, removed = 0, added = 0;

for (const [vStr, r] of Object.entries(v5)) {
  const v = +vStr;
  const comp = compByVernr.get(v);
  if (!comp) { report.push(`vernr ${v} sin competición en dataset`); continue; }
  for (const scope of ['ind', 'team']) {
    for (const g of ['FEMALE', 'MALE']) {
      const cat = r[scope]?.[g];
      if (!cat || !Object.keys(cat).length) continue;
      const catId = CAT[scope][g];
      // eliminar las performances actuales de esta comp+cat (se regeneran)
      const oldIds = [...perfById.values()].filter((p) => p.competitionId === comp.id && p.categoryId === catId).map((p) => p.id);
      for (const [round, key] of [['FINAL', 'final'], ['BRONZE_1', 'bronze_1'], ['BRONZE_2', 'bronze_2']]) {
        const m = cat[round];
        const perfId = `${comp.id}_${catId}_${key}`;
        const legacyId = `${comp.id}_${catId}_${key.replace('_', '')}`; // ids antiguos de Cairo
        if (!m) continue;
        const mk = (a) => {
          const id = slug((scope === 'team' ? 'team-' : '') + `${a.name} ${a.cc || 'xxx'}`);
          if (!athletes.has(id)) athletes.set(id, { id, displayName: a.name, country: titleCase(a.country) || a.cc, countryCode: a.cc || '???' });
          return id;
        };
        const akaId = mk(m.aka), aoId = mk(m.ao);
        const sAka = m.aka.score, sAo = m.ao.score;
        let winner, resultType;
        if (sAka == null && sAo == null) { report.push(`${perfId}: sin puntuaciones`); continue; }
        if (sAka == null || sAka === 0) { winner = 'AO'; resultType = 'AKA_DISQUALIFIED'; }
        else if (sAo == null || sAo === 0) { winner = 'AKA'; resultType = 'AO_DISQUALIFIED'; }
        else if (sAka === sAo) {
          const cands = TIES[perfId] || TIES[legacyId];
          const akaWin = cands?.some((c) => NORM(m.aka.name).startsWith(c) || c.startsWith(NORM(m.aka.name).slice(0, 12)));
          const aoWin = cands?.some((c) => NORM(m.ao.name).startsWith(c) || c.startsWith(NORM(m.ao.name).slice(0, 12)));
          if (akaWin && !aoWin) { winner = 'AKA'; resultType = 'AKA_WINS'; }
          else if (aoWin && !akaWin) { winner = 'AO'; resultType = 'AO_WINS'; }
          else { report.push(`${perfId}: empate (hantei) sin resolución, excluido`); continue; }
          report.push(`${perfId}: empate resuelto por clasificación → ${winner}`);
        }
        else { winner = sAka > sAo ? 'AKA' : 'AO'; resultType = winner === 'AKA' ? 'AKA_WINS' : 'AO_WINS'; }
        const p = {
          id: perfById.has(legacyId) ? legacyId : perfId,
          competitionId: comp.id, categoryId: catId, roundType: round,
          phaseFormat: round === 'FINAL' ? 'POOLWINNER_TREE' : 'REPECHAGE',
          akaAthleteId: akaId, aoAthleteId: aoId,
          kataAka: titleCase(m.aka.kata) || undefined, kataAkaNumber: m.aka.kataNum,
          kataAo: titleCase(m.ao.kata) || undefined, kataAoNumber: m.ao.kataNum,
          officialWinner: winner, officialResultType: resultType,
          status: 'VIDEO_MISSING',
          sportDataUrl: `https://www.sportdata.org/wkf/set-online/veranstaltung_info_main.php?active_menu=calendar&vernr=${v}&ver_info_action=catauslist`,
        };
        if (r.useC) { p.judgeVotes = { aka: sAka, ao: sAo }; p.notes = 'Sistema 2026: ganador por mayoría de votos de 7 jueces.'; }
        else { p.officialScoreAka = sAka; p.officialScoreAo = sAo; p.judgesCount = 5; }
        const pairKey = [comp.id, catId, [akaId, aoId].sort().join('~')].join('|');
        const vid = videoByPair.get(pairKey);
        if (vid && vid.videoId != null && vid.startSeconds != null && vid.endSeconds != null) {
          Object.assign(p, vid); p.status = 'READY';
        } else if (vid && vid.videoId) { p.videoId = vid.videoId; p.status = 'VIDEO_CATALOGUED'; }
        const existed = perfById.has(p.id);
        perfById.set(p.id, p);
        if (existed) rebuilt++; else added++;
        const idx = oldIds.indexOf(p.id);
        if (idx >= 0) oldIds.splice(idx, 1);
      }
      // los que quedan en oldIds ya no existen en v5 para esta cat: quitarlos solo si v5 trae al menos la final
      if (cat.FINAL) {
        for (const oid of oldIds) { perfById.delete(oid); removed++; report.push(`eliminado obsoleto: ${oid}`); }
      }
    }
  }
}

ds.generatedAt = new Date().toISOString();
ds.athletes = [...athletes.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
ds.performances = [...perfById.values()];
writeFileSync(datasetPath, JSON.stringify(ds, null, 2));
const ready = ds.performances.filter((p) => p.status === 'READY').length;
console.log(`perfs: ${ds.performances.length} (reconstruidas ${rebuilt}, nuevas ${added}, eliminadas ${removed}) · catálogo aplicado: ${applied} · READY: ${ready}`);
report.forEach((s) => console.log(' -', s));
