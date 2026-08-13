// Aplica las fechas reales de inicio de cada campeonato (extraídas de SportData).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const datasetPath = join(here, '..', 'public', 'data', 'dataset.json');
const ds = JSON.parse(readFileSync(datasetPath, 'utf8'));

const DATES = `468:2021-04-30 469:2021-10-22 470:2021-03-12 473:2021-05-19 480:2021-09-03 482:2021-10-01 483:2021-11-16 549:2021-10-18 570:2022-02-18 572:2022-04-22 573:2022-05-25 576:2022-06-10 579:2022-09-02 582:2022-11-18 590:2022-01-28 613:2022-05-26 620:2022-09-23 668:2023-01-13 679:2023-01-27 687:2023-03-10 688:2023-03-22 697:2023-04-14 699:2023-05-12 705:2023-06-09 717:2023-09-08 719:2023-09-29 730:2023-10-24 741:2023-05-19 770:2023-11-24 818:2024-01-12 823:2024-01-26 829:2024-02-16 844:2024-03-15 849:2024-04-19 854:2024-05-08 863:2024-05-31 880:2024-09-13 890:2024-11-22 901:2024-04-25 938:2024-09-20 950:2024-09-20 960:2025-01-10 967:2025-02-14 972:2025-01-24 982:2025-03-14 989:2025-05-23 1001:2025-05-07 1005:2025-04-18 1010:2025-05-30 1046:2025-09-05 1067:2025-09-12 1068:2025-10-03 1096:2026-01-09 1109:2026-01-23 1120:2026-06-18 1126:2026-03-13 1131:2026-04-24 1136:2026-05-20 1140:2026-04-10 1171:2026-07-17 1176:2026-06-12`
  .split(' ').map((x) => x.split(':')).reduce((m, [v, d]) => (m[v] = d, m), {});

let n = 0;
for (const c of ds.competitions) {
  const d = DATES[String(c.sportDataEventId)];
  if (d && !c.dateStart) { c.dateStart = d; n++; }
}
ds.generatedAt = new Date().toISOString();
writeFileSync(datasetPath, JSON.stringify(ds, null, 2));
console.log('fechas aplicadas:', n, '| sin fecha:', ds.competitions.filter((c) => !c.dateStart).map((c) => c.name).join('; ') || 'ninguna');
