import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Athlete, Attempt, Category, Competition, Performance } from '../db/types';
import { groupByPerformance } from './stats';

export interface CatalogData {
  loaded: boolean;
  competitions: Competition[];
  categories: Category[];
  athletes: Athlete[];
  performances: Performance[];
  attempts: Attempt[];
  compById: Map<string, Competition>;
  categoryById: Map<string, Category>;
  athleteById: Map<string, Athlete>;
  attemptsByPerf: Map<string, Attempt[]>;
}

/** Carga reactiva de todo el catálogo + intentos (los datasets son pequeños). */
export function useCatalog(): CatalogData {
  const competitions = useLiveQuery(() => db.competitions.toArray(), []) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];
  const athletes = useLiveQuery(() => db.athletes.toArray(), []) ?? [];
  const performances = useLiveQuery(() => db.performances.toArray(), []) ?? [];
  const attempts = useLiveQuery(() => db.attempts.toArray(), []) ?? [];
  const loaded = useLiveQuery(() => db.performances.count().then(() => true), []) ?? false;

  return {
    loaded,
    competitions,
    categories,
    athletes,
    performances,
    attempts,
    compById: new Map(competitions.map((c) => [c.id, c])),
    categoryById: new Map(categories.map((c) => [c.id, c])),
    athleteById: new Map(athletes.map((a) => [a.id, a])),
    attemptsByPerf: groupByPerformance(attempts),
  };
}
