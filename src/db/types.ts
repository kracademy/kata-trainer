// Modelo de datos — Kracademy Kata Trainer
// Convención: el competidor de arriba del bracket es AKA (rojo), el de abajo AO (azul).

export type CompetitionType =
  | 'WORLD_CHAMPIONSHIP'
  | 'CONTINENTAL_CHAMPIONSHIP'
  | 'PREMIER_LEAGUE'
  | 'SERIES_A'
  | 'WORLD_CUP'
  | 'OTHER';

export type Continent = 'EUROPE' | 'PANAMERICA' | 'ASIA' | 'AFRICA' | 'OCEANIA' | 'WORLD';

export type RoundType = 'FINAL' | 'BRONZE_1' | 'BRONZE_2' | 'OTHER';

/** Formato de la fase de la que procede el encuentro (reglas WKF, Art. 3.3). */
export type PhaseFormat = 'ELIMINATION' | 'ROUND_ROBIN' | 'POOLWINNER_TREE' | 'REPECHAGE';

export type Winner = 'AKA' | 'AO';

export type OfficialResultType =
  | 'AKA_WINS'
  | 'AO_WINS'
  | 'AKA_DISQUALIFIED'
  | 'AO_DISQUALIFIED'
  | 'BOTH_DISQUALIFIED'
  | 'OTHER';

export type CatalogStatus =
  | 'MISSING_DATA'
  | 'DATA_IMPORTED'
  | 'VIDEO_MISSING'
  | 'VIDEO_CATALOGUED'
  | 'READY';

export type VideoAvailability = 'UNKNOWN' | 'AVAILABLE' | 'UNAVAILABLE';

export interface Competition {
  id: string; // p. ej. 'wkf-worlds-2025-cairo'
  name: string;
  year: number;
  dateStart?: string; // ISO
  dateEnd?: string;
  location?: string;
  country?: string; // código 3 letras
  competitionType: CompetitionType;
  continent?: Continent;
  tier: 1 | 2 | 3; // 1 = Worlds/Continentales, 2 = Premier League, 3 = Series A
  sportDataEventId?: number; // vernr
  sportDataUrl?: string;
  source?: string;
  notes?: string;
  /** Vídeos candidatos del canal de YouTube de la WKF (pestaña Live) para precargar en Catalogar. */
  candidateVideos?: { id: string; title: string }[];
}

export interface Category {
  id: string; // p. ej. 'senior-female-kata'
  name: string; // 'Senior Female Kata'
  gender: 'FEMALE' | 'MALE';
  discipline: 'KATA'; // KUMITE en el futuro
  ageGroup: 'SENIOR' | 'U21';
  /** Kata individual o Team Kata. */
  format?: 'INDIVIDUAL' | 'TEAM';
  sportDataCatId?: number; // catid estable: 36 = Female Kata, 37 = Male Kata
}

export interface Athlete {
  id: string; // slug p. ej. 'lau-mo-sheung-grace-hkg'
  firstName?: string;
  lastName?: string;
  displayName: string; // como aparece en SportData
  country: string; // nombre
  countryCode: string; // 3 letras
  sportDataId?: string;
  notes?: string;
}

export interface Video {
  id: string; // youtube videoId
  platform: 'YOUTUBE';
  url: string;
  title?: string;
  durationSeconds?: number;
  availabilityStatus: VideoAvailability;
  lastChecked?: string;
  notes?: string;
}

/** Un encuentro (bout) de Kata: AKA vs AO. */
export interface Performance {
  id: string; // p. ej. 'wkf-worlds-2025-cairo_senior-female-kata_final'
  competitionId: string;
  categoryId: string;
  roundType: RoundType;
  roundLabel?: string; // etiqueta original de SportData, p. ej. 'Poolwinner Tree - Round 4'
  phaseFormat?: PhaseFormat;
  matchNumber?: number;

  akaAthleteId: string;
  aoAthleteId: string;
  kataAka?: string; // p. ej. 'Chatanyara Kushanku'
  kataAkaNumber?: number; // número de la lista oficial WKF, p. ej. 8
  kataAo?: string;
  kataAoNumber?: number;

  officialWinner: Winner;
  officialResultType: OfficialResultType;
  /** Total oficial (sistema 2023–2025), p. ej. 46.10. */
  officialScoreAka?: number;
  officialScoreAo?: number;
  /** Nº de jueces cuyo total se muestra (5 eliminatorias, 7 round-robin). Para la media. */
  judgesCount?: number;
  /** Sistema 2026: votos por mayoría, p. ej. { aka: 3, ao: 4 }. */
  judgeVotes?: { aka: number; ao: number };
  /** Puntuaciones individuales de jueces si constan (sistema antiguo). */
  judgeScoresAka?: number[];
  judgeScoresAo?: number[];

  videoId?: string;
  /** Segundos dentro del vídeo. */
  startSeconds?: number;
  endSeconds?: number;

  status: CatalogStatus;
  sportDataUrl?: string;
  notes?: string;
}

/** Un intento del usuario sobre una Performance. */
export interface Attempt {
  id?: number; // autoincrement
  performanceId: string;
  userId: string; // 'local-user'
  attemptedAt: string; // ISO
  selectedWinner: Winner;
  selectedResultType?: OfficialResultType;
  /** Puntuación opcional del usuario por atleta (media por juez, escala 5.0–10.0). */
  userScoreAka?: number;
  userScoreAo?: number;
  isCorrectWinner: boolean;
  /** Desviación respecto a la media oficial por juez (si hay datos). */
  scoreDeviationAka?: number;
  scoreDeviationAo?: number;
  isFirstAttempt: boolean;
  completed: boolean;
  notes?: string;
}

/** Media oficial por juez, p. ej. 43.30 / 5 = 8.66. */
export function officialAverage(total: number | undefined, judgesCount = 5): number | undefined {
  if (total == null || judgesCount <= 0) return undefined;
  return Math.round((total / judgesCount) * 100) / 100;
}

/** Dataset publicado en /data/*.json y fusionado en IndexedDB al arrancar. */
export interface DatasetFile {
  schemaVersion: number;
  generatedAt: string;
  competitions: Competition[];
  categories: Category[];
  athletes: Athlete[];
  videos: Video[];
  performances: Performance[];
}

/** Export de la pantalla Catalogar (PC → Claude → dataset). */
export interface CatalogExport {
  schemaVersion: number;
  exportedAt: string;
  entries: {
    performanceId: string;
    videoId: string;
    startSeconds: number;
    endSeconds: number;
  }[];
}
