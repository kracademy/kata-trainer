import type { Attempt, Performance } from '../db/types';
import { analyzePerformance } from './stats';

export type TrainMode = 'RANDOM' | 'LEAST_PRACTICED' | 'RECENT_FAILS' | 'OLDEST';
export type TrainStatusFilter = 'ALL' | 'NEVER' | 'FAILED' | 'CORRECT';

export interface TrainFilters {
  competitionType: string; // 'ALL' | CompetitionType
  year: string; // 'ALL' | '2025'...
  gender: string; // 'ALL' | 'FEMALE' | 'MALE'
  age: string; // 'ALL' | 'SENIOR' | 'U21'
  format: string; // 'ALL' | 'INDIVIDUAL' | 'TEAM'
  round: string; // 'ALL' | 'FINAL' | 'BRONZE'
  status: TrainStatusFilter;
  mode: TrainMode;
}

export const DEFAULT_FILTERS: TrainFilters = {
  competitionType: 'ALL',
  year: 'ALL',
  gender: 'ALL',
  age: 'ALL',
  format: 'ALL',
  round: 'ALL',
  status: 'ALL',
  mode: 'RANDOM',
};

interface Ctx {
  compTypeById: Map<string, string>;
  compYearById: Map<string, number>;
  genderByCategoryId: Map<string, string>;
  ageByCategoryId: Map<string, string>;
  formatByCategoryId: Map<string, string>;
  attemptsByPerf: Map<string, Attempt[]>;
}

export function filterPerformances(perfs: Performance[], f: TrainFilters, ctx: Ctx): Performance[] {
  // Modo especial: encuentros marcados como Former Exam EKF/WKF (se incluyen aunque no tengan
  // vídeo, para repasarlos de memoria; y sin restringir a rondas de medalla).
  const examMode = f.competitionType === 'FORMER_EXAM';
  return perfs.filter((p) => {
    if (examMode) {
      if (!p.formerExam) return false;
      if (p.status !== 'READY' && p.akaAthleteId == null) return false; // sin datos no se puede ni de memoria
    } else {
      if (p.status !== 'READY') return false;
      if (f.competitionType !== 'ALL' && ctx.compTypeById.get(p.competitionId) !== f.competitionType) return false;
    }
    if (f.year !== 'ALL' && String(ctx.compYearById.get(p.competitionId)) !== f.year) return false;
    if (f.gender !== 'ALL' && ctx.genderByCategoryId.get(p.categoryId) !== f.gender) return false;
    if (f.age !== 'ALL' && (ctx.ageByCategoryId.get(p.categoryId) ?? 'SENIOR') !== f.age) return false;
    if (f.format !== 'ALL' && (ctx.formatByCategoryId.get(p.categoryId) ?? 'INDIVIDUAL') !== f.format) return false;
    // Por defecto ('ALL') solo encuentros de medalla; otras rondas solo si se piden explícitamente.
    if (!examMode && f.round === 'ALL' && !['FINAL', 'BRONZE_1', 'BRONZE_2'].includes(p.roundType)) return false;
    if (f.round === 'FINAL' && p.roundType !== 'FINAL') return false;
    if (f.round === 'BRONZE' && p.roundType !== 'BRONZE_1' && p.roundType !== 'BRONZE_2') return false;
    if (f.round === 'OTHER' && p.roundType !== 'OTHER') return false;
    const t = analyzePerformance(ctx.attemptsByPerf.get(p.id) ?? []);
    if (f.status === 'NEVER' && t.everAttempted) return false;
    if (f.status === 'FAILED' && !(t.failedFirst && !t.learned)) return false;
    if (f.status === 'CORRECT' && !(t.firstAttempt?.isCorrectWinner ?? false)) return false;
    return true;
  });
}

/** Ordena según el modo y evita repetir las últimas vistas en la sesión. */
export function orderQueue(perfs: Performance[], f: TrainFilters, ctx: Ctx, recentIds: string[]): Performance[] {
  const recent = new Set(recentIds.slice(-Math.min(3, Math.max(0, perfs.length - 1))));
  const eligible = perfs.filter((p) => !recent.has(p.id));
  const pool = eligible.length ? eligible : perfs;
  const attemptsOf = (p: Performance) => ctx.attemptsByPerf.get(p.id) ?? [];

  switch (f.mode) {
    case 'LEAST_PRACTICED':
      return [...pool].sort((a, b) => attemptsOf(a).length - attemptsOf(b).length);
    case 'RECENT_FAILS':
      return [...pool].sort((a, b) => {
        const fa = attemptsOf(a).filter((x) => !x.isCorrectWinner).at(-1)?.attemptedAt ?? '';
        const fb = attemptsOf(b).filter((x) => !x.isCorrectWinner).at(-1)?.attemptedAt ?? '';
        return fb.localeCompare(fa);
      });
    case 'OLDEST':
      return [...pool].sort((a, b) => (ctx.compYearById.get(a.competitionId) ?? 0) - (ctx.compYearById.get(b.competitionId) ?? 0));
    case 'RANDOM':
    default: {
      const arr = [...pool];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
  }
}
