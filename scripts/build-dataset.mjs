// Transforma el scrape crudo de SportData (kra_scrape_raw.json) al dataset de la app.
// Uso: node scripts/build-dataset.mjs <ruta-raw.json>
// Conserva las entradas existentes de public/data/dataset.json (vídeos y timestamps ya catalogados).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const datasetPath = join(here, '..', 'public', 'data', 'dataset.json');
const rawPath = process.argv[2];
if (!rawPath) { console.error('falta ruta del raw'); process.exit(1); }

const raw = JSON.parse(readFileSync(rawPath, 'utf8'));
const current = JSON.parse(readFileSync(datasetPath, 'utf8'));

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const titleCase = (s) => s ? s.toLowerCase().replace(/(^|[\s\-'])\p{L}/gu, (c) => c.toUpperCase()) : s;

function compMeta(title) {
  const year = +(title.match(/20\d\d/) || [0])[0];
  let type = 'OTHER', continent, tier = 3;
  if (/world championship/i.test(title)) { type = 'WORLD_CHAMPIONSHIP'; continent = 'WORLD'; tier = 1; }
  else if (/premier league/i.test(title)) { type = 'PREMIER_LEAGUE'; tier = 2; }
  else if (/series a/i.test(title)) { type = 'SERIES_A'; tier = 3; }
  else if (/EKF|european/i.test(title)) { type = 'CONTINENTAL_CHAMPIONSHIP'; continent = 'EUROPE'; tier = 1; }
  else if (/PKF|panamerican|pan american/i.test(title)) { type = 'CONTINENTAL_CHAMPIONSHIP'; continent = 'PANAMERICA'; tier = 1; }
  else if (/AKF|asian/i.test(title)) { type = 'CONTINENTAL_CHAMPIONSHIP'; continent = 'ASIA'; tier = 1; }
  else if (/UFAK|african/i.test(title)) { type = 'CONTINENTAL_CHAMPIONSHIP'; continent = 'AFRICA'; tier = 1; }
  else if (/OKF|oceania/i.test(title)) { type = 'CONTINENTAL_CHAMPIONSHIP'; continent = 'OCEANIA'; tier = 1; }
  return { year, type, continent, tier };
}

// Preferencia por evento: C (votos 2026) > B (v3) > A (2021-22)
const events = new Map();
for (const src of [raw.modeA, raw.modeB, raw.modeC]) {
  for (const [v, r] of Object.entries(src || {})) events.set(+v, r); // orden de inserción: A luego B luego C sobrescriben
}

const athletes = new Map(current.athletes.map((a) => [a.id, a]));
const perfById = new Map(current.performances.map((p) => [p.id, p]));
const comps = new Map(current.competitions.map((c) => [c.id, c]));
const skipped = [];
let added = 0;

const CAT = { FEMALE: 'senior-female-kata', MALE: 'senior-male-kata' };

for (const [v, r] of events) {
  if (v === 1063) continue; // Cairo ya está curado a mano
  const title = (r.title || '').replace(/\s*-\s*$/, '');
  const meta = compMeta(title);
  if (!meta.year || meta.year < 2021) { skipped.push(`${v} ${title}: año inválido`); continue; }
  const matches = [];
  for (const g of ['FEMALE', 'MALE']) {
    const cat = r.cats?.[g];
    if (!cat) continue;
    const issues = cat._issues || [];
    for (const round of ['FINAL', 'BRONZE_1', 'BRONZE_2']) {
      const m = cat[round];
      if (!m) continue;
      if (round === 'FINAL' && issues.some((i) => /final/.test(i))) { skipped.push(`${v} ${g} FINAL: validación`); continue; }
      if (round !== 'FINAL' && issues.some((i) => i.startsWith(round))) { skipped.push(`${v} ${g} ${round}: validación`); continue; }
      if (!m.aka?.name || !m.ao?.name) continue;
      matches.push({ g, round, m, votes: !!cat._votes });
    }
  }
  if (!matches.length) { skipped.push(`${v} ${title}: sin matches válidos (${(r.issues || []).join(';').slice(0, 60)})`); continue; }

  const compId = slug(title);
  if (!comps.has(compId)) {
    comps.set(compId, {
      id: compId, name: title, year: meta.year,
      competitionType: meta.type, continent: meta.continent, tier: meta.tier,
      sportDataEventId: v,
      sportDataUrl: `https://www.sportdata.org/wkf/set-online/veranstaltung_info_main.php?active_menu=calendar&vernr=${v}`,
      source: `SportData SET Online (extraído ${raw.exportedAt?.slice(0, 10)})`,
    });
  }

  for (const { g, round, m, votes } of matches) {
    const perfId = `${compId}_${CAT[g]}_${round.toLowerCase()}`;
    if (perfById.has(perfId)) continue;
    const mkAth = (a) => {
      const id = slug(`${a.name} ${a.cc}`);
      if (!athletes.has(id)) athletes.set(id, { id, displayName: a.name, country: titleCase(a.country) || a.cc, countryCode: a.cc });
      return id;
    };
    const akaId = mkAth(m.aka), aoId = mkAth(m.ao);
    const weighted = m.weighted === true;
    const sAka = m.aka.score, sAo = m.ao.score;
    let winner, resultType;
    if (sAka == null && sAo == null) { skipped.push(`${perfId}: sin puntuaciones`); continue; }
    if (sAka == null || sAka === 0) { winner = 'AO'; resultType = 'AKA_DISQUALIFIED'; }
    else if (sAo == null || sAo === 0) { winner = 'AKA'; resultType = 'AO_DISQUALIFIED'; }
    else if (sAka === sAo) { skipped.push(`${perfId}: empate, sin desempate conocido`); continue; }
    else { winner = sAka > sAo ? 'AKA' : 'AO'; resultType = winner === 'AKA' ? 'AKA_WINS' : 'AO_WINS'; }

    const p = {
      id: perfId, competitionId: compId, categoryId: CAT[g], roundType: round,
      phaseFormat: weighted ? 'ELIMINATION' : (round === 'FINAL' ? 'POOLWINNER_TREE' : 'REPECHAGE'),
      akaAthleteId: akaId, aoAthleteId: aoId,
      kataAka: titleCase(m.aka.kata) || undefined, kataAkaNumber: m.aka.kataNum,
      kataAo: titleCase(m.ao.kata) || undefined, kataAoNumber: m.ao.kataNum,
      officialWinner: winner, officialResultType: resultType,
      status: 'VIDEO_MISSING',
      sportDataUrl: `https://www.sportdata.org/wkf/set-online/veranstaltung_info_main.php?active_menu=calendar&vernr=${v}&ver_info_action=catauslist`,
    };
    if (votes) {
      p.judgeVotes = { aka: sAka, ao: sAo };
      p.notes = 'Sistema 2026: ganador por mayoría de votos de 7 jueces.';
    } else if (weighted) {
      p.officialScoreAka = sAka; p.officialScoreAo = sAo; p.judgesCount = 3;
      if (m.aka.tec) p.judgeScoresAka = m.aka.tec;
      if (m.ao.tec) p.judgeScoresAo = m.ao.tec;
      p.notes = 'Sistema 2019–2022: 7 jueces (notas TEC mostradas), puntúan los 3 centrales, 70% técnico + 30% atlético. Media = total/3.';
    } else {
      p.officialScoreAka = sAka; p.officialScoreAo = sAo; p.judgesCount = 5;
    }
    perfById.set(perfId, p);
    added++;
  }
}

const out = {
  ...current,
  generatedAt: new Date().toISOString(),
  competitions: [...comps.values()].sort((a, b) => b.year - a.year || a.name.localeCompare(b.name)),
  athletes: [...athletes.values()].sort((a, b) => a.displayName.localeCompare(b.displayName)),
  performances: [...perfById.values()],
};
writeFileSync(datasetPath, JSON.stringify(out, null, 2));
console.log(`competiciones: ${out.competitions.length}, actuaciones: ${out.performances.length} (+${added}), atletas: ${out.athletes.length}`);
console.log('--- descartes ---');
skipped.forEach((s) => console.log(s));
