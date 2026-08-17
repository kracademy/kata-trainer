import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../logic/useCatalog';
import { analyzePerformance } from '../logic/stats';
import { competitionTypeLabel, roundLabel } from '../logic/format';
import { isCloseResult } from '../db/types';
import type { Performance } from '../db/types';

const ROUND_ORDER: Record<string, number> = { FINAL: 0, BRONZE_1: 1, BRONZE_2: 2, OTHER: 3 };

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

  const list = performances.filter((p) => {
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
  });

  // agrupado por campeonato, como en Catalogar: más recientes primero por fecha real
  const groups = useMemo(() => {
    const byComp = new Map<string, Performance[]>();
    for (const p of list) {
      (byComp.get(p.competitionId) ?? byComp.set(p.competitionId, []).get(p.competitionId)!).push(p);
    }
    return [...byComp.entries()]
      .map(([compId, perfs]) => ({
        comp: compById.get(compId),
        perfs: perfs.sort(
          (a, b) =>
            (categoryById.get(a.categoryId)?.name ?? '').localeCompare(categoryById.get(b.categoryId)?.name ?? '') ||
            (ROUND_ORDER[a.roundType] ?? 9) - (ROUND_ORDER[b.roundType] ?? 9),
        ),
      }))
      .sort((a, b) => (b.comp?.dateStart ?? `${b.comp?.year ?? 0}`).localeCompare(a.comp?.dateStart ?? `${a.comp?.year ?? 0}`));
  }, [list, compById, categoryById]);

  return (
    <>
      <h1>Biblioteca</h1>
      <Link to="/kata/catalogar">
        <button className="btn-secondary">🛠️ Catalogar vídeos (PC)</button>
      </Link>

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

      <h2>{list.length} actuaciones · {groups.length} campeonatos</h2>
      {groups.map(({ comp, perfs }) => (
        <div key={comp?.id ?? '?'}>
          <div className="comp-header">
            <span>{comp?.name}</span>
            <span className="year">{comp?.year} · {competitionTypeLabel(comp?.competitionType ?? '')}</span>
          </div>
          {perfs.map((p) => {
            const cat = categoryById.get(p.categoryId);
            const aka = athleteById.get(p.akaAthleteId);
            const ao = athleteById.get(p.aoAthleteId);
            const t = analyzePerformance(attemptsByPerf.get(p.id) ?? []);
            const badge = STATUS_BADGE[p.status] ?? STATUS_BADGE.MISSING_DATA;
            return (
              <div className="card perf-item" key={p.id}>
                <div className="meta">
                  {cat?.name} · <span className="badge round">{roundLabel(p.roundType)}</span>
                  {isCloseResult(p) && (
                    <>
                      {' '}
                      <span className="badge" style={{ background: '#fff3e0', color: '#b56000' }}>
                        ⚖️ Ajustado{p.judgeVotes ? ` ${p.judgeVotes.aka}–${p.judgeVotes.ao}` : ''}
                      </span>
                    </>
                  )}
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
        </div>
      ))}
    </>
  );
}
