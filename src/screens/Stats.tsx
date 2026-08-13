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

  return (
    <>
      <h1>Estadísticas</h1>

      <div className="grid2">
        <div className="stat-tile"><div className="v">{attempts.length}</div><div className="l">Intentos totales</div></div>
        <div className="stat-tile"><div className="v">{attempted.length} / {ready.length}</div><div className="l">Actuaciones vistas</div></div>
        <div className="stat-tile"><div className="v">{accuracy(firstAttempts) ?? '--'}%</div><div className="l">Primeros intentos</div></div>
        <div className="stat-tile"><div className="v">{accuracy(later) ?? '--'}%</div><div className="l">Intentos posteriores</div></div>
        <div className="stat-tile"><div className="v">{accuracy(lastNDays(attempts, 30)) ?? '--'}%</div><div className="l">Últimos 30 días</div></div>
        <div className="stat-tile"><div className="v">{pendingErrors(performances, attemptsByPerf).length}</div><div className="l">Errores pendientes</div></div>
        <div className="stat-tile"><div className="v">{byRound(['FINAL']) ?? '--'}%</div><div className="l">Finales</div></div>
        <div className="stat-tile"><div className="v">{byRound(['BRONZE_1', 'BRONZE_2']) ?? '--'}%</div><div className="l">Bronces</div></div>
        <div className="stat-tile"><div className="v">{byGender('FEMALE') ?? '--'}%</div><div className="l">Female</div></div>
        <div className="stat-tile"><div className="v">{byGender('MALE') ?? '--'}%</div><div className="l">Male</div></div>
      </div>

      {months.length > 0 && (
        <>
          <h2>Evolución mensual</h2>
          <div className="card">
            {months.map((m) => (
              <div key={m.month} className="row" style={{ alignItems: 'center', marginBottom: 6 }}>
                <span style={{ width: 70 }} className="muted">{m.month}</span>
                <div style={{ flex: 1, background: 'var(--bg-card-2)', borderRadius: 6, height: 14 }}>
                  <div style={{ width: `${m.pct}%`, background: 'linear-gradient(90deg,#3557d6,#2fae5f)', height: '100%', borderRadius: 6 }} />
                </div>
                <span style={{ width: 80, textAlign: 'right' }}>{m.pct}% <span className="muted">({m.n})</span></span>
              </div>
            ))}
          </div>
        </>
      )}

      <Link to="/errores"><button className="btn-secondary">🔴 Ver mis errores</button></Link>
    </>
  );
}
