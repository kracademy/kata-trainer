import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import type { KumiteCall, KumiteSituation } from '../../db/types';
import { KUMITE_CALL_LABELS, KUMITE_SITUATION_LABELS } from '../../db/types';
import { fmtTime } from '../../logic/format';

const SITUATIONS = Object.keys(KUMITE_SITUATION_LABELS) as KumiteSituation[];
const CALLS = Object.keys(KUMITE_CALL_LABELS) as KumiteCall[];

export default function KumiteLibrary() {
  const clips = useLiveQuery(() => db.kumiteClips.toArray(), []) ?? [];
  const attempts = useLiveQuery(() => db.kumiteAttempts.toArray(), []) ?? [];
  const [situation, setSituation] = useState('ALL');
  const [call, setCall] = useState('ALL');

  const attemptsByClip = new Map<string, { n: number; ok: number }>();
  for (const a of attempts) {
    const s = attemptsByClip.get(a.clipId) ?? { n: 0, ok: 0 };
    s.n++;
    if (a.isCorrect) s.ok++;
    attemptsByClip.set(a.clipId, s);
  }

  const list = clips
    .filter((c) => situation === 'ALL' || c.situations.includes(situation as KumiteSituation))
    .filter((c) => call === 'ALL' || c.decisionCall === call)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <h1>Biblioteca</h1>
      <Link to="/kumite/catalogar">
        <button className="btn-secondary">🛠️ Catalogar clips (PC)</button>
      </Link>
      <Link to="/kumite/polemicas">
        <button className="btn-secondary">🔥 Situaciones polémicas ({clips.filter((c) => c.polemic).length})</button>
      </Link>

      <div className="row" style={{ marginTop: 10 }}>
        <select value={situation} onChange={(e) => setSituation(e.target.value)}>
          <option value="ALL">Situación: todas</option>
          {SITUATIONS.map((s) => (
            <option key={s} value={s}>{KUMITE_SITUATION_LABELS[s]}</option>
          ))}
        </select>
        <select value={call} onChange={(e) => setCall(e.target.value)}>
          <option value="ALL">Decisión: todas</option>
          {CALLS.map((c) => (
            <option key={c} value={c}>{KUMITE_CALL_LABELS[c]}</option>
          ))}
        </select>
      </div>

      <h2>{list.length} clips</h2>
      {list.map((c) => {
        const t = attemptsByClip.get(c.id);
        return (
          <div className="card perf-item" key={c.id}>
            <div className="who">
              {c.title || KUMITE_CALL_LABELS[c.decisionCall]}
              {c.polemic && <span className="badge missing" style={{ marginLeft: 6 }}>🔥 Polémica</span>}
            </div>
            <div className="meta">
              {c.decisionSide !== 'NONE' ? `${c.decisionSide} · ` : ''}{KUMITE_CALL_LABELS[c.decisionCall]}
              {c.decisionDetail ? ` — ${c.decisionDetail}` : ''} · {fmtTime(c.startSeconds)}
              {c.competitionName ? ` · ${c.competitionName}` : ''}
            </div>
            <div className="meta">
              {c.situations.map((s) => (
                <span key={s} className="badge round" style={{ marginRight: 4 }}>{KUMITE_SITUATION_LABELS[s]}</span>
              ))}
              {t && <span className="badge nodata">{t.n} intento{t.n !== 1 ? 's' : ''} · {t.ok} ✅</span>}
            </div>
          </div>
        );
      })}
    </>
  );
}
