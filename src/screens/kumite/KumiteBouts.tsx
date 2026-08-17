import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import type { KumiteClip } from '../../db/types';
import { KUMITE_CALL_LABELS, KUMITE_SITUATION_LABELS } from '../../db/types';
import YouTubePlayer from '../../components/YouTubePlayer';
import { fmtTime } from '../../logic/format';

/** Combates: los clips agrupados por vídeo, para estudiar un combate entero con sus decisiones. */
export default function KumiteBouts() {
  const clips = useLiveQuery(() => db.kumiteClips.toArray(), []) ?? [];
  const [openVideo, setOpenVideo] = useState<string | null>(null);
  const [playing, setPlaying] = useState<KumiteClip | null>(null);
  const [playerKey, setPlayerKey] = useState(0);

  const bouts = useMemo(() => {
    const byVideo = new Map<string, KumiteClip[]>();
    for (const c of clips) {
      (byVideo.get(c.videoId) ?? byVideo.set(c.videoId, []).get(c.videoId)!).push(c);
    }
    return [...byVideo.entries()]
      .map(([videoId, list]) => {
        const sorted = list.sort((a, b) => a.startSeconds - b.startSeconds);
        const ref = sorted.find((c) => c.akaName || c.competitionName) ?? sorted[0];
        return {
          videoId,
          clips: sorted,
          label:
            ref.akaName || ref.aoName
              ? `🔴 ${ref.akaName ?? '?'} vs 🔵 ${ref.aoName ?? '?'}`
              : ref.title ?? videoId,
          comp: ref.competitionName,
        };
      })
      .sort((a, b) => (b.clips[0]?.createdAt ?? '').localeCompare(a.clips[0]?.createdAt ?? ''));
  }, [clips]);

  if (playing) {
    return (
      <>
        <h1 style={{ fontSize: '1.4rem' }}>{playing.title || 'Clip'}</h1>
        <div className="player-wrap">
          <YouTubePlayer
            key={playerKey}
            videoId={playing.videoId}
            startSeconds={playing.startSeconds}
            endSeconds={playing.revealEndSeconds ?? playing.endSeconds}
            controls={true}
          />
        </div>
        <button className="btn-secondary" style={{ marginTop: 10 }} onClick={() => setPlayerKey((k) => k + 1)}>
          ↻ Recargar vídeo
        </button>
        <div className="card perf-item">
          <div className="meta">
            {playing.situations.map((s) => (
              <span key={s} className="badge round" style={{ marginRight: 4 }}>{KUMITE_SITUATION_LABELS[s]}</span>
            ))}
            {playing.polemic && <span className="badge missing">🔥 Polémica</span>}
          </div>
          <div className="who">
            Decisión: {playing.decisionSide !== 'NONE' ? `${playing.decisionSide} · ` : ''}
            {KUMITE_CALL_LABELS[playing.decisionCall]}
            {playing.decisionDetail ? ` — ${playing.decisionDetail}` : ''}
          </div>
          {playing.explanation && <p style={{ marginBottom: 0 }}>💡 {playing.explanation}</p>}
          {playing.polemicNote && <p style={{ marginBottom: 0 }}>🔥 {playing.polemicNote}</p>}
        </div>
        <button className="btn-primary" onClick={() => setPlaying(null)}>← VOLVER AL COMBATE</button>
      </>
    );
  }

  if (openVideo) {
    const bout = bouts.find((b) => b.videoId === openVideo);
    return (
      <>
        <button onClick={() => setOpenVideo(null)}>← Todos los combates</button>
        <h1 style={{ marginTop: 12, fontSize: '1.3rem' }}>{bout?.label}</h1>
        {bout?.comp && <p className="muted">{bout.comp}</p>}
        <h2>{bout?.clips.length ?? 0} acciones</h2>
        {bout?.clips.map((c) => (
          <div className="card perf-item" key={c.id} onClick={() => setPlaying(c)} style={{ cursor: 'pointer' }}>
            <div className="who">{fmtTime(c.startSeconds)} · {c.title || KUMITE_CALL_LABELS[c.decisionCall]}</div>
            <div className="meta">
              {c.decisionSide !== 'NONE' ? `${c.decisionSide} · ` : ''}{KUMITE_CALL_LABELS[c.decisionCall]}
              {c.decisionDetail ? ` — ${c.decisionDetail}` : ''}
              {c.polemic && <span className="badge missing" style={{ marginLeft: 6 }}>🔥</span>}
            </div>
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      <h1>Combates</h1>
      <p className="muted">Los clips agrupados por combate (vídeo), en orden cronológico, con sus decisiones.</p>
      <h2>{bouts.length} combates</h2>
      {bouts.map((b) => (
        <div className="card perf-item" key={b.videoId} onClick={() => setOpenVideo(b.videoId)} style={{ cursor: 'pointer' }}>
          <div className="who">{b.label}</div>
          <div className="meta">
            {b.comp ? `${b.comp} · ` : ''}{b.clips.length} acci{b.clips.length === 1 ? 'ón' : 'ones'}
          </div>
        </div>
      ))}
      {bouts.length === 0 && <div className="card muted">Aún no hay clips catalogados.</div>}
    </>
  );
}
