import { Link } from 'react-router-dom';
import { useCatalog } from '../logic/useCatalog';
import { accuracy, analyzePerformance, lastNDays, monthlyEvolution, pendingErrors } from '../logic/stats';

export default function Stats() {
  const { performances, attempts, attemptsByPerf, categoryById } = useCatalog();

  const firstAttempts = attempts.filter((a) => a.isFirstAttempt);
  const later = attempts.filter((a) => !a.isFirstAttempt);
  const ready = performances.filter((p) => p.status === 'READY');
  const attempted = ready.filter((p) => analyzePerformance(attemptsByPerf.get(p.id) ?? []).everAttempted);

  const byRound = (rounds: string[]) =>
    accuracy(firstAttempts.filter((a) => rounds.includes(performances.find((p) => p.id === a.performanceId)?.roundType ?? '')));
  const byGender = (g: string) =>
    accuracy(
      firstAttempts.filter((a) => {
        const p = performances.find((x) => x.id === a.performanceId);
        return p && categoryById.get(p.categoryId)?.gender === g;
      }),
    );

  const months = monthlyEvolution(attempts);

  /** '—' elegante cuando aún no hay datos, en lugar de '--%'. */
  const Pct = ({ v, label }: { v: number | null | undefined; label: string }) => (
    <div className="stat-tile">
      <div className={`v${v == null ? ' na' : ''}`}>{v == null ? '—' : `${v}%`}</div>
      <div className="l">{label}</div>
    </div>
  );

  return (
    <>
      <h1>Estadísticas</h1>

      <div className="grid2">
        <div className="stat-tile"><div className="v">{attempts.length}</div><div className="l">Intentos totales</div></div>
        <div className="stat-tile"><div className="v">{attempted.length} / {ready.length}</div><div className="l">Actuaciones vistas</div></div>
        <Pct v={accuracy(firstAttempts)} label="Primeros intentos" />
        <Pct v={accuracy(later)} label="Intentos posteriores" />
        <Pct v={accuracy(lastNDays(attempts, 30))} label="Últimos 30 días" />
        <div className="stat-tile"><div className="v">{pendingErrors(performances, attemptsByPerf).length}</div><div className="l">Errores pendientes</div></div>
        <Pct v={byRound(['FINAL'])} label="Finales" />
        <Pct v={byRound(['BRONZE_1', 'BRONZE_2'])} label="Bronces" />
        <Pct v={byGender('FEMALE')} label="Female" />
        <Pct v={byGender('MALE')} label="Male" />
      </div>

      {months.length > 0 && (
        <>
          <h2>Evolución mensual</h2>
          <div className="card">
            {months.map((m) => (
              <div key={m.month} className="row" style={{ alignItems: 'center', marginBottom: 8 }}>
                <span style={{ width: 70 }} className="muted">{m.month}</span>
                <div className="progressbar">
                  <div style={{ width: `${m.pct}%` }} />
                </div>
                <span style={{ width: 80, textAlign: 'right' }}>{m.pct}% <span className="muted">({m.n})</span></span>
              </div>
            ))}
          </div>
        </>
      )}

      <Link to="/kata/errores"><button className="btn-secondary">🔴 Ver mis errores</button></Link>
    </>
  );
}
