import type { ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import type { KumiteCall, KumiteSituation } from '../../db/types';
import { KUMITE_CALL_LABELS, KUMITE_SITUATION_LABELS } from '../../db/types';
import { TI } from '../../components/TileIcons';

/** Stats específicas de kumite: aciertos por situación (agarres, jogai, mubobi…) y por decisión. */
export default function KumiteStats() {
  const clips = useLiveQuery(() => db.kumiteClips.toArray(), []) ?? [];
  const attempts = useLiveQuery(() => db.kumiteAttempts.toArray(), []) ?? [];

  const clipById = new Map(clips.map((c) => [c.id, c]));
  const total = attempts.length;
  const correct = attempts.filter((a) => a.isCorrect).length;

  const bySituation = new Map<KumiteSituation, { n: number; ok: number }>();
  const byCall = new Map<KumiteCall, { n: number; ok: number }>();
  for (const a of attempts) {
    const clip = clipById.get(a.clipId);
    if (!clip) continue;
    for (const s of clip.situations) {
      const e = bySituation.get(s) ?? { n: 0, ok: 0 };
      e.n++;
      if (a.isCorrect) e.ok++;
      bySituation.set(s, e);
    }
    const e = byCall.get(clip.decisionCall) ?? { n: 0, ok: 0 };
    e.n++;
    if (a.isCorrect) e.ok++;
    byCall.set(clip.decisionCall, e);
  }

  const pct = (ok: number, n: number) => (n ? `${Math.round((ok / n) * 100)}%` : '—');
  const sitRows = [...bySituation.entries()].sort((a, b) => b[1].n - a[1].n);
  const callRows = [...byCall.entries()].sort((a, b) => b[1].n - a[1].n);

  // Lo más importante siempre visible, aunque aún no haya intentos (iconos de línea + color)
  const KEY: { s: KumiteSituation; icon: ReactNode; color: string }[] = [
    { s: 'AGARRE', icon: TI.palm, color: '#ff9500' },
    { s: 'JOGAI', icon: TI.exit, color: '#007aff' },
    { s: 'MUBOBI_CONTACTO', icon: TI.burst, color: '#ff3b30' },
    { s: 'EXAGERAR', icon: TI.mega, color: '#af52de' },
    { s: 'SIMULAR', icon: TI.mask, color: '#ff2d55' },
    { s: 'PROYECCION', icon: TI.rotate, color: '#34c759' },
    { s: 'EVITAR_COMBATE', icon: TI.uturn, color: '#5856d6' },
    { s: 'PUNTUACION', icon: TI.target, color: '#007aff' },
  ];

  return (
    <>
      <h1>Stats</h1>

      <div className="grid2">
        <div className="stat-tile">
          <span className="ic" style={{ color: '#007aff' }}>{TI.film}</span>
          <div className="v">{clips.length}</div>
          <div className="l">Clips catalogados</div>
        </div>
        <div className="stat-tile">
          <span className="ic" style={{ color: '#5856d6' }}>{TI.list}</span>
          <div className="v">{total}</div>
          <div className="l">Intentos</div>
        </div>
        <div className="stat-tile">
          <span className="ic" style={{ color: '#34c759' }}>{TI.target}</span>
          <div className={`v${total === 0 ? ' na' : ''}`}>{pct(correct, total)}</div>
          <div className="l">Aciertos</div>
        </div>
        <div className="stat-tile">
          <span className="ic" style={{ color: '#ff9500' }}>{TI.scale}</span>
          <div className="v">{clips.filter((c) => c.polemic).length}</div>
          <div className="l">Polémicas</div>
        </div>
      </div>

      <h2>Lo importante</h2>
      <div className="grid2">
        {KEY.map(({ s, icon, color }) => {
          const e = bySituation.get(s);
          return (
            <div className="stat-tile" key={s}>
              <span className="ic" style={{ color }}>{icon}</span>
              <div className={`v${e ? '' : ' na'}`}>{e ? pct(e.ok, e.n) : '—'}</div>
              <div className="l">{KUMITE_SITUATION_LABELS[s]}{e ? ` · ${e.n} int.` : ''}</div>
            </div>
          );
        })}
      </div>

      <h2>Por situación</h2>
      <div className="card">
        {sitRows.length === 0 && <p className="muted" style={{ margin: 0 }}>Entrena algún clip para ver tus aciertos por situación.</p>}
        {sitRows.length > 0 && (
          <table className="scores">
            <thead>
              <tr><th style={{ textAlign: 'left' }}>Situación</th><th>Intentos</th><th>Aciertos</th></tr>
            </thead>
            <tbody>
              {sitRows.map(([s, e]) => (
                <tr key={s}>
                  <td style={{ textAlign: 'left' }}>{KUMITE_SITUATION_LABELS[s]}</td>
                  <td>{e.n}</td>
                  <td>{pct(e.ok, e.n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2>Por decisión real</h2>
      <div className="card">
        {callRows.length === 0 && <p className="muted" style={{ margin: 0 }}>Sin datos todavía.</p>}
        {callRows.length > 0 && (
          <table className="scores">
            <thead>
              <tr><th style={{ textAlign: 'left' }}>Decisión</th><th>Intentos</th><th>Aciertos</th></tr>
            </thead>
            <tbody>
              {callRows.map(([c, e]) => (
                <tr key={c}>
                  <td style={{ textAlign: 'left' }}>{KUMITE_CALL_LABELS[c]}</td>
                  <td>{e.n}</td>
                  <td>{pct(e.ok, e.n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
