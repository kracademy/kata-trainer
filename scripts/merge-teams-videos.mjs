// Fusiona Team Kata (kra_teams_raw.json) y vídeos candidatos del canal WKF (kra_yt_streams.json)
// en public/data/dataset.json. Uso: node scripts/merge-teams-videos.mjs <teams.json> <streams.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const datasetPath = join(here, '..', 'public', 'data', 'dataset.json');
const teams = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const streams = JSON.parse(readFileSync(process.argv[3], 'utf8')); // {videoId: title}
const ds = JSON.parse(readFileSync(datasetPath, 'utf8'));

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const titleCase = (s) => s ? s.toLowerCase().replace(/(^|[\s\-'])\p{L}/gu, (c) => c.toUpperCase()) : s;

// ── 1. Categorías Team Kata ──
const TEAM_CAT = { FEMALE: 'senior-female-team-kata', MALE: 'senior-male-team-kata' };
for (const c of ds.categories) if (!c.format) c.format = 'INDIVIDUAL';
if (!ds.categories.some((c) => c.id === TEAM_CAT.FEMALE)) {
  ds.categories.push(
    { id: TEAM_CAT.FEMALE, name: 'Senior Female Team Kata', gender: 'FEMALE', discipline: 'KATA', ageGroup: 'SENIOR', format: 'TEAM' },
    { id: TEAM_CAT.MALE, name: 'Senior Male Team Kata', gender: 'MALE', discipline: 'KATA', ageGroup: 'SENIOR', format: 'TEAM' },
  );
}

const comps = new Map(ds.competitions.map((c) => [c.id, c]));
const compByVernr = new Map(ds.competitions.map((c) => [c.sportDataEventId, c]));
const athletes = new Map(ds.athletes.map((a) => [a.id, a]));
const perfById = new Map(ds.performances.map((p) => [p.id, p]));
const skipped = [];
let added = 0;

function compMeta(title) {
  const year = +(title.match(/20\d\d/) || [0])[0];
  if (/world cup/i.test(title)) return { year, type: 'WORLD_CUP', continent: 'WORLD', tier: 1 };
  return { year, type: 'OTHER', continent: undefined, tier: 3 };
}

// ── 2. Team Kata performances ──
for (const [vStr, r] of Object.entries(teams)) {
  const v = +vStr;
  const title = (r.title || '').replace(/\s*-\s*$/, '');
  let comp = compByVernr.get(v);
  if (!comp) {
    const meta = compMeta(title);
    if (!meta.year || meta.year < 2021) { continue; }
    const hasData = Object.values(r.cats || {}).some((c) => c.FINAL || c.BRONZE_1 || c.BRONZE_2);
    if (!hasData) { if (!/sin team kata/.test((r.issues || []).join(';'))) skipped.push(`${v} ${title}: sin datos`); continue; }
    comp = {
      id: slug(title), name: title, year: meta.year,
      competitionType: meta.type, continent: meta.continent, tier: meta.tier,
      sportDataEventId: v,
      sportDataUrl: `https://www.sportdata.org/wkf/set-online/veranstaltung_info_main.php?active_menu=calendar&vernr=${v}`,
      source: 'SportData SET Online (extraído 2026-08-13)',
    };
    comps.set(comp.id, comp);
    compByVernr.set(v, comp);
  }
  for (const g of ['FEMALE', 'MALE']) {
    const cat = r.cats?.[g];
    if (!cat) continue;
    const issues = cat._issues || [];
    for (const round of ['FINAL', 'BRONZE_1', 'BRONZE_2']) {
      const m = cat[round];
      if (!m || !m.aka?.name || !m.ao?.name) continue;
      if (round === 'FINAL' && issues.some((i) => /final/.test(i))) { skipped.push(`${v} ${g} team FINAL: validación`); continue; }
      if (round !== 'FINAL' && issues.some((i) => i.startsWith(round))) { skipped.push(`${v} ${g} team ${round}: validación`); continue; }
      const perfId = `${comp.id}_${TEAM_CAT[g]}_${round.toLowerCase()}`;
      if (perfById.has(perfId)) continue;
      const mkTeam = (a) => {
        const id = slug(`team-${a.name}-${a.cc || 'xxx'}`);
        if (!athletes.has(id)) athletes.set(id, { id, displayName: a.name, country: titleCase(a.country) || a.cc, countryCode: a.cc || '???' });
        return id;
      };
      const sAka = m.aka.score, sAo = m.ao.score;
      let winner, resultType;
      if (sAka == null && sAo == null) { skipped.push(`${perfId}: sin puntuaciones`); continue; }
      if (sAka == null || sAka === 0) { winner = 'AO'; resultType = 'AKA_DISQUALIFIED'; }
      else if (sAo == null || sAo === 0) { winner = 'AKA'; resultType = 'AO_DISQUALIFIED'; }
      else if (sAka === sAo) { skipped.push(`${perfId}: empate`); continue; }
      else { winner = sAka > sAo ? 'AKA' : 'AO'; resultType = winner === 'AKA' ? 'AKA_WINS' : 'AO_WINS'; }
      const votes = !!cat._votes;
      const weighted = m.weighted === true;
      const p = {
        id: perfId, competitionId: comp.id, categoryId: TEAM_CAT[g], roundType: round,
        phaseFormat: weighted ? 'ELIMINATION' : (round === 'FINAL' ? 'POOLWINNER_TREE' : 'REPECHAGE'),
        akaAthleteId: mkTeam(m.aka), aoAthleteId: mkTeam(m.ao),
        kataAka: titleCase(m.aka.kata) || undefined, kataAkaNumber: m.aka.kataNum,
        kataAo: titleCase(m.ao.kata) || undefined, kataAoNumber: m.ao.kataNum,
        officialWinner: winner, officialResultType: resultType,
        status: 'VIDEO_MISSING',
        sportDataUrl: `https://www.sportdata.org/wkf/set-online/veranstaltung_info_main.php?active_menu=calendar&vernr=${v}&ver_info_action=catauslist`,
      };
      if (votes) { p.judgeVotes = { aka: sAka, ao: sAo }; p.notes = 'Sistema 2026: ganador por mayoría de votos de 7 jueces. Team Kata: la final incluye Bunkai.'; }
      else if (weighted) { p.officialScoreAka = sAka; p.officialScoreAo = sAo; p.judgesCount = 3; p.notes = 'Sistema 2019–2022: 7 jueces, puntúan los 3 centrales, 70% técnico + 30% atlético. Media = total/3.'; }
      else { p.officialScoreAka = sAka; p.officialScoreAo = sAo; p.judgesCount = 5; }
      perfById.set(perfId, p);
      added++;
    }
  }
}

// ── 3. Vídeos candidatos por competición ──
const STOP = new Set(['karate', 'karate1', 'premier', 'league', 'series', 'senior', 'championship', 'championships', 'world', 'kata', 'the', 'wkf', 'individual', 'national', 'team', 'cup', 'open', 'and', 'one', 'ekf', 'pkf', 'akf', 'ufak', 'okf', 'phase', 'final']);
const streamList = Object.entries(streams).map(([id, t]) => ({ id, t, tl: t.toLowerCase() }));
let matchedComps = 0;
for (const comp of comps.values()) {
  const year = String(comp.year);
  const tokens = comp.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/[^a-z]+/).filter((w) => w.length > 3 && !STOP.has(w));
  if (!tokens.length) continue;
  const cands = streamList.filter((s) => {
    const sl = s.tl.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return sl.includes(year) && tokens.some((tok) => sl.includes(tok));
  });
  if (!cands.length) continue;
  const score = (s) => (/final|medal/i.test(s.t) ? 0 : 1);
  comp.candidateVideos = cands
    .sort((a, b) => score(a) - score(b) || a.t.localeCompare(b.t))
    .slice(0, 10)
    .map((s) => ({ id: s.id, title: s.t.replace(/^LIVE\s*🔴\s*/, '') }));
  matchedComps++;
}

ds.generatedAt = new Date().toISOString();
ds.competitions = [...comps.values()].sort((a, b) => b.year - a.year || a.name.localeCompare(b.name));
ds.athletes = [...athletes.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
ds.performances = [...perfById.values()];
writeFileSync(datasetPath, JSON.stringify(ds, null, 2));
console.log(`comps: ${ds.competitions.length}, perfs: ${ds.performances.length} (+${added} team), atletas/equipos: ${ds.athletes.length}, comps con vídeos candidatos: ${matchedComps}`);
console.log('--- descartes ---');
skipped.forEach((s) => console.log(s));
