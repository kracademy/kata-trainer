import { useState } from 'react';
import { useCatalog } from '../logic/useCatalog';
import { analyzePerformance, pendingErrors } from '../logic/stats';
import TrainingSession from '../components/TrainingSession';
import { roundLabel } from '../logic/format';
import type { Performance } from '../db/types';

export default function ErrorsScreen() {
  const data = useCatalog();
  const [queue, setQueue] = useState<Performance[] | null>(null);

  if (queue) {
    return <TrainingSession queue={queue} data={data} onExit={() => setQueue(null)} />;
  }

  const errors = pendingErrors(data.performances, data.attemptsByPerf).filter((p) => p.status === 'READY');

  return (
    <>
      <h1>Mis errores</h1>
      {errors.length === 0 && <div className="card muted">No tienes errores pendientes. 🎉</div>}
      {errors.length > 1 && (
        <button className="btn-primary" onClick={() => setQueue(errors)}>
          REPASAR TODOS ({errors.length})
        </button>
      )}
      {errors.map((p) => {
        const comp = data.compById.get(p.competitionId);
        const cat = data.categoryById.get(p.categoryId);
        const aka = data.athleteById.get(p.akaAthleteId);
        const ao = data.athleteById.get(p.aoAthleteId);
        const t = analyzePerformance(data.attemptsByPerf.get(p.id) ?? []);
        const first = t.firstAttempt!;
        const yourPick = first.selectedWinner === 'AKA' ? aka : ao;
        const real = p.officialWinner === 'AKA' ? aka : ao;
        return (
          <div className="card perf-item" key={p.id}>
            <div className="meta">
              {comp?.name} ({comp?.year}) · {cat?.name} · {roundLabel(p.roundType)}
            </div>
            <div className="who">
              🔴 {aka?.displayName} vs 🔵 {ao?.displayName}
            </div>
            <div className="meta">
              Tu decisión: ❌ {yourPick?.displayName} · Real: 🏆 {real?.displayName} · {t.attempts.length} intento{t.attempts.length !== 1 ? 's' : ''}
            </div>
            <button className="btn-secondary" onClick={() => setQueue([p])}>
              REVISAR
            </button>
          </div>
        );
      })}
    </>
  );
}
