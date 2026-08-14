// Añade las medal matches de U21 Kata (EKF/PKF/AKF/OKF juveniles y Mundiales Cadet/Junior/U21).
// Uso: node scripts/merge-u21.mjs <kra_u21.json> <kra_u21cand.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const datasetPath = join(here, '..', 'public', 'data', 'dataset.json');
const raw = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const cand = JSON.parse(readFileSync(process.argv[3], 'utf8'));
const ds = JSON.parse(readFileSync(datasetPath, 'utf8'));

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const titleCase = (s) => s ? s.toLowerCase().replace(/(^|[\s\-'])\p{L}/gu, (c) => c.toUpperCase()) : s;

const DATES = { 467: '2021-08-20', 556: '2022-06-17', 581: '2022-10-26', 621: '2022-08-25', 680: '2023-02-03', 715: '2023-06-30', 800: '2023-11-06', 813: '2024-02-09', 885: '2024-10-09', 914: '2024-08-23', 943: '2024-08-26', 955: '2025-02-07', 1023: '2025-05-19', 1056: '2025-09-05', 1091: '2026-02-06', 1161: '2026-05-28' };

// Categorías U21
const U21 = { FEMALE: 'u21-female-kata', MALE: 'u21-male-kata' };
if (!ds.categories.some((c) => c.id === U21.FEMALE)) {
  ds.categories.push(
    { id: U21.FEMALE, name: 'U21 Female Kata', gender: 'FEMALE', discipline: 'KATA', ageGroup: 'U21', format: 'INDIVIDUAL' },
    { id: U21.MALE, name: 'U21 Male Kata', gender: 'MALE', discipline: 'KATA', ageGroup: 'U21', format: 'INDIVIDUAL' },
  );
}

function compMeta(title) {
  const year = +(title.match(/20\d\d/) || [0])[0];
  if (/world championships/i.test(title)) return { year, type: 'WORLD_CHAMPIONSHIP', continent: 'WORLD', tier: 1 };
  if (/EKF/i.test(title)) return { year, type: 'CONTINENTAL_CHAMPIONSHIP', continent: 'EUROPE', tier: 1 };
  if (/PKF/i.test(title)) return { year, type: 'CONTINENTAL_CHAMPIONSHIP', continent: 'PANAMERICA', tier: 1 };
  if (/asian/i.test(title)) return { year, type: 'CONTINENTAL_CHAMPIONSHIP', continent: 'ASIA', tier: 1 };
  if (/OKF|oceania/i.test(title)) return { year, type: 'CONTINENTAL_CHAMPIONSHIP', continent: 'OCEANIA', tier: 1 };
  if (/UFAK|african/i.test(title)) return { year, type: 'CONTINENTAL_CHAMPIONSHIP', continent: 'AFRICA', tier: 1 };
  return { year, type: 'OTHER', continent: undefined, tier: 3 };
}

const comps = new Map(ds.competitions.map((c) => [c.id, c]));
const athletes = new Map(ds.athletes.map((a) => [a.id, a]));
const perfById = new Map(ds.performances.map((p) => [p.id, p]));
const report = [];
let added = 0;

for (const [vStr, r] of Object.entries(raw)) {
  const v = +vStr;
  const title = (r.title || '').replace(/\s*-\s*$/, '');
  const hasData = Object.values(r.ind || {}).some((c) => c.FINAL || c.BRONZE_1 || c.BRONZE_2);
  if (!hasData) { report.push(`${v} ${title}: sin datos U21`); continue; }
  const meta = compMeta(title);
  const compId = slug(title);
  if (!comps.has(compId)) {
    comps.set(compId, {
      id: compId, name: title, year: meta.year, dateStart: DATES[v],
      competitionType: meta.type, continent: meta.continent, tier: meta.tier,
      sportDataEventId: v,
      sportDataUrl: `https://www.sportdata.org/wkf/set-online/veranstaltung_info_main.php?active_menu=calendar&vernr=${v}`,
      source: 'SportData SET Online (extraído 2026-08-14)',
      candidateVideos: (cand[v] || []).map((x) => ({ id: x.id, title: x.t })),
    });
  }
  for (const g of ['FEMALE', 'MALE']) {
    const cat = r.ind?.[g];
    if (!cat) continue;
    for (const [round, key] of [['FINAL', 'final'], ['BRONZE_1', 'bronze_1'], ['BRONZE_2', 'bronze_2']]) {
      const m = cat[round];
      if (!m || !m.aka?.name || !m.ao?.name) continue;
      const perfId = `${compId}_${U21[g]}_${key}`;
      if (perfById.has(perfId)) continue;
      const mk = (a) => {
        const id = slug(`${a.name} ${a.cc || 'xxx'}`);
        if (!athletes.has(id)) athletes.set(id, { id, displayName: a.name, country: titleCase(a.country) || a.cc, countryCode: a.cc || '???' });
        return id;
      };
      const sAka = m.aka.score, sAo = m.ao.score;
      let winner, resultType;
      if (sAka == null && sAo == null) { report.push(`${perfId}: sin puntuaciones`); continue; }
      if (sAka == null || sAka === 0) { winner = 'AO'; resultType = 'AKA_DISQUALIFIED'; }
      else if (sAo == null || sAo === 0) { winner = 'AKA'; resultType = 'AO_DISQUALIFIED'; }
      else if (sAka === sAo) {
        // Empates (hantei) resueltos por la clasificación oficial
        const NORM = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z]/g, '').toUpperCase();
        const TIES = { 'the-22nd-asian-cadet-junior-u21-championship-2024-manila-philippines_u21-male-kata_final': 'MUSTAFAYOUSIF' };
        const w = TIES[perfId];
        if (w && NORM(m.aka.name).startsWith(w.slice(0, 10))) { winner = 'AKA'; resultType = 'AKA_WINS'; }
        else if (w && NORM(m.ao.name).startsWith(w.slice(0, 10))) { winner = 'AO'; resultType = 'AO_WINS'; }
        else { report.push(`${perfId}: empate (hantei), excluido`); continue; }
        report.push(`${perfId}: empate resuelto → ${winner}`);
      }
      else { winner = sAka > sAo ? 'AKA' : 'AO'; resultType = winner === 'AKA' ? 'AKA_WINS' : 'AO_WINS'; }
      const p = {
        id: perfId, competitionId: compId, categoryId: U21[g], roundType: round,
        phaseFormat: m.weighted ? 'ELIMINATION' : (round === 'FINAL' ? 'POOLWINNER_TREE' : 'REPECHAGE'),
        akaAthleteId: mk(m.aka), aoAthleteId: mk(m.ao),
        kataAka: titleCase(m.aka.kata) || undefined, kataAkaNumber: m.aka.kataNum,
        kataAo: titleCase(m.ao.kata) || undefined, kataAoNumber: m.ao.kataNum,
        officialWinner: winner, officialResultType: resultType,
        status: 'VIDEO_MISSING',
        sportDataUrl: `https://www.sportdata.org/wkf/set-online/veranstaltung_info_main.php?active_menu=calendar&vernr=${v}&ver_info_action=catauslist`,
      };
      if (r.useC) { p.judgeVotes = { aka: sAka, ao: sAo }; p.notes = 'Sistema 2026: ganador por mayoría de votos de 7 jueces.'; }
      else if (m.weighted) { p.officialScoreAka = sAka; p.officialScoreAo = sAo; p.judgesCount = 3; p.notes = 'Sistema 2019–2022: 7 jueces, puntúan los 3 centrales, 70% técnico + 30% atlético. Media = total/3.'; }
      else { p.officialScoreAka = sAka; p.officialScoreAo = sAo; p.judgesCount = 5; }
      perfById.set(perfId, p);
      added++;
    }
  }
}

ds.generatedAt = new Date().toISOString();
ds.competitions = [...comps.values()].sort((a, b) => (b.dateStart ?? '').localeCompare(a.dateStart ?? ''));
ds.athletes = [...athletes.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
ds.performances = [...perfById.values()];
writeFileSync(datasetPath, JSON.stringify(ds, null, 2));
console.log(`comps: ${ds.competitions.length}, perfs: ${ds.performances.length} (+${added} U21), atletas: ${ds.athletes.length}`);
report.forEach((s) => console.log(' -', s));
