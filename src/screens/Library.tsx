import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../logic/useCatalog';
import { analyzePerformance } from '../logic/stats';
import { competitionTypeLabel, roundLabel } from '../logic/format';

const STATUS_BADGE: Record<string, { cls: string; txt: string }> = {
  READY: { cls: 'ready', txt: '🟢 Lista' },
  VIDEO_CATALOGUED: { cls: 'nodata', txt: '⚪ Falta marcar tiempos' },
  VIDEO_MISSING: { cls: 'missing', txt: '⚪ Sin vídeo' },
  DATA_IMPORTED: { cls: 'nodata', txt: '⚪ Datos importados' },
  MISSING_DATA: { cls: 'missing', txt: '🔴 Datos incompletos' },
};

export default function Library() {
  const { performances, compById, categoryById, athleteById, attemptsByPerf } = useCatalog();
  const [q, setQ] = useState('');
  const [year, setYear] = useState('ALL');
  const [gender, setGender] = useState('ALL');
  const [status, setStatus] = useState('ALL');

  const years = useMemo(
    () => [...new Set(performances.map((p) => compById.get(p.competitionId)?.year).filter(Boolean))].sort().reverse(),
    [performances, compById],
  );

  const list = performances
    .filter((p) => {
      const comp = compById.get(p.competitionId);
      const cat = categoryById.get(p.categoryId);
      if (year !== 'ALL' && String(comp?.year) !== year) return false;
      if (gender !== 'ALL' && cat?.gender !== gender) return false;
      if (status !== 'ALL' && p.status !== status) return false;
      if (q) {
        const aka = athleteById.get(p.akaAthleteId);
        const ao = athleteById.get(p.aoAthleteId);
        const hay = `${comp?.name} ${aka?.displayName} ${ao?.displayName} ${aka?.countryCode} ${ao?.countryCode} ${p.kataAka} ${p.kataAo}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => (compById.get(b.competitionId)?.year ?? 0) - (compById.get(a.competitionId)?.year ?? 0));

  return (
    <>
      <h1>Biblioteca</h1>
      <div className="row">
        <Link to="/catalogar" style={{ flex: 1 }}>
          <button className="btn-secondary" style={{ width: '100%' }}>🛠️ Catalogar vídeos (PC)</button>
        </Link>
        <Link to="/katas" style={{ flex: 1 }}>
          <button className="btn-secondary" style={{ width: '100%' }}>🥋 Estudio de katas</button>
        </Link>
      </div>

      <input type="text" placeholder="Buscar atleta, país, kata, competición…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="row" style={{ marginTop: 10 }}>
        <select value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="ALL">Año: todos</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
        <select value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="ALL">Sexo: ambos</option>
          <option value="FEMALE">Female</option>
          <option value="MALE">Male</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">Estado: todos</option>
          <option value="READY">Listas</option>
          <option value="VIDEO_MISSING">Sin vídeo</option>
          <option value="VIDEO_CATALOGUED">Sin tiempos</option>
        </select>
      </div>

      <h2>{list.length} actuaciones</h2>
      {list.map((p) => {
        const comp = compById.get(p.competitionId);
        const cat = categoryById.get(p.categoryId);
        const aka = athleteById.get(p.akaAthleteId);
        const ao = athleteById.get(p.aoAthleteId);
        const t = analyzePerformance(attemptsByPerf.get(p.id) ?? []);
        const badge = STATUS_BADGE[p.status] ?? STATUS_BADGE.MISSING_DATA;
        return (
          <div className="card perf-item" key={p.id}>
            <div className="meta">
              {comp?.name} · {competitionTypeLabel(comp?.competitionType ?? '')} · {cat?.name} ·{' '}
              <span className="badge round">{roundLabel(p.roundType)}</span>
            </div>
            <div className="who">
              🔴 {aka?.displayName} <span className="muted">({aka?.countryCode})</span> vs 🔵 {ao?.displayName}{' '}
              <span className="muted">({ao?.countryCode})</span>
            </div>
            <div className="meta">
              <span className={`badge ${badge.cls}`}>{badge.txt}</span>{' '}
              {t.everAttempted && (
                <span className="badge nodata">
                  {t.attempts.length} intento{t.attempts.length !== 1 ? 's' : ''} · 1º: {t.firstAttempt?.isCorrectWinner ? '✅' : '❌'}
                  {t.learned ? ' · Aprendida' : ''}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
