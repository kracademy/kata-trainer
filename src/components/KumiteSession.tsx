import { useRef, useState } from 'react';
import { db } from '../db/db';
import type { KumiteCall, KumiteClip, KumiteSide } from '../db/types';
import { KUMITE_CALL_LABELS, KUMITE_SITUATION_LABELS } from '../db/types';
import YouTubePlayer, { type YouTubePlayerHandle } from './YouTubePlayer';

type Phase = 'playing' | 'decision' | 'reveal';

interface Props {
  queue: KumiteClip[];
  onExit: () => void;
}

const CALLS = Object.keys(KUMITE_CALL_LABELS) as KumiteCall[];
/** Llamadas que no van dirigidas a un atleta concreto. */
const NEUTRAL_CALLS: KumiteCall[] = ['NO_ACTION', 'WAKARETE', 'TSUZUKETE'];

export default function KumiteSession({ queue, onExit }: Props) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('playing');
  const [selSide, setSelSide] = useState<KumiteSide | null>(null);
  const [selCall, setSelCall] = useState<KumiteCall | null>(null);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [showingReveal, setShowingReveal] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [videoError, setVideoError] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  const playerRef = useRef<YouTubePlayerHandle>(null);

  const clip = queue[index];

  if (!clip) {
    return (
      <div className="card center">
        <p>🎉 No quedan más clips en esta sesión.</p>
        <button className="btn-primary" onClick={onExit}>VOLVER</button>
      </div>
    );
  }

  const neutral = selCall != null && NEUTRAL_CALLS.includes(selCall);
  const canConfirm = selCall != null && (neutral || selSide != null);

  async function confirm() {
    if (!clip || selCall == null) return;
    const side: KumiteSide = neutral ? 'NONE' : (selSide as KumiteSide);
    const correct = selCall === clip.decisionCall && side === clip.decisionSide;
    await db.kumiteAttempts.add({
      clipId: clip.id,
      attemptedAt: new Date().toISOString(),
      selectedSide: side,
      selectedCall: selCall,
      isCorrect: correct,
    });
    setWasCorrect(correct);
    setPhase('reveal');
  }

  function next() {
    setIndex((i) => i + 1);
    setPhase('playing');
    setSelSide(null);
    setSelCall(null);
    setShowingReveal(false);
    setVideoError(false);
    setPlaying(false);
  }

  function togglePause() {
    if (playing) playerRef.current?.pause();
    else playerRef.current?.play();
  }

  const clipStart = showingReveal ? clip.endSeconds : clip.startSeconds;
  const clipEnd = showingReveal ? clip.revealEndSeconds : clip.endSeconds;
  const realLabel = `${clip.decisionSide !== 'NONE' ? `${clip.decisionSide} · ` : ''}${KUMITE_CALL_LABELS[clip.decisionCall]}`;

  return (
    <>
      <div className="muted" style={{ marginBottom: 8 }}>
        Clip {index + 1} / {queue.length}
        <button style={{ float: 'right', padding: '4px 10px', fontSize: '0.75rem' }} onClick={onExit}>Salir</button>
      </div>

      <div className="player-wrap">
        {!videoError && (
          <YouTubePlayer
            key={`${playerKey}-${showingReveal ? 'r' : 'a'}`}
            ref={playerRef}
            videoId={clip.videoId}
            startSeconds={clipStart}
            endSeconds={clipEnd}
            controls={false}
            playbackRate={rate}
            onPlayingChange={setPlaying}
            onEnded={() => {
              if (phase === 'playing' && !showingReveal) setPhase('decision');
            }}
            onError={() => setVideoError(true)}
          />
        )}
        {videoError && (
          <div className="player-overlay">
            <p>⚠️ Vídeo no disponible.</p>
            <button onClick={() => { setVideoError(false); setPlayerKey((k) => k + 1); }}>↻ Reintentar</button>
            <button onClick={() => setPhase('decision')}>Ya lo he visto → decidir</button>
          </div>
        )}
        {phase === 'decision' && !videoError && (
          <div className="player-overlay">
            <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>¿Qué da el árbitro central?</p>
          </div>
        )}
      </div>

      {clip.title && phase !== 'reveal' && (
        <div className="card perf-item" style={{ marginTop: 12 }}>
          <div className="who">{clip.title}</div>
          {(clip.akaName || clip.aoName) && (
            <div className="meta">
              {clip.akaName && <><span style={{ color: 'var(--aka)', fontWeight: 700 }}>AKA</span> {clip.akaName} </>}
              {clip.aoName && <><span style={{ color: 'var(--ao)', fontWeight: 700 }}>AO</span> {clip.aoName}</>}
            </div>
          )}
          {clip.competitionName && <div className="meta">{clip.competitionName}</div>}
        </div>
      )}

      {phase === 'playing' && (
        <>
          <div className="row">
            <button className="btn-secondary" style={{ flex: '0 0 30%' }} onClick={togglePause}>
              {playing ? '⏸ Pausa' : '▶︎ Reproducir'}
            </button>
            <button className="btn-primary" style={{ flex: 1, margin: '10px 0' }} onClick={() => setPhase('decision')}>
              YAME → DECIDIR
            </button>
          </div>
          <div className="row" style={{ alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: '0.8rem' }}>Velocidad</span>
            {[1, 1.5, 2].map((r) => (
              <button key={r} className={`chip${rate === r ? ' sel' : ''}`} onClick={() => { setRate(r); playerRef.current?.setRate(r); }}>
                x{r}
              </button>
            ))}
            <button className="chip" onClick={() => setPlayerKey((k) => k + 1)}>↻</button>
          </div>
        </>
      )}

      {phase === 'decision' && (
        <>
          <div className="card">
            <label style={{ margin: '0 0 6px' }}>¿A quién?</label>
            <div className="row">
              <button className={`btn-aka${selSide === 'AKA' ? ' sel' : ''}`} onClick={() => setSelSide('AKA')} disabled={neutral}>🔴 AKA</button>
              <button className={`btn-ao${selSide === 'AO' ? ' sel' : ''}`} onClick={() => setSelSide('AO')} disabled={neutral}>🔵 AO</button>
            </div>
            <label style={{ margin: '14px 0 6px' }}>¿Qué da?</label>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              {CALLS.map((c) => (
                <button key={c} className={`chip${selCall === c ? ' sel' : ''}`} onClick={() => setSelCall(c)}>
                  {KUMITE_CALL_LABELS[c]}
                </button>
              ))}
            </div>
          </div>
          <button className="btn-primary" disabled={!canConfirm} onClick={confirm}>CONFIRMAR</button>
        </>
      )}

      {phase === 'reveal' && (
        <>
          <div className={`reveal-banner ${wasCorrect ? 'ok' : 'bad'}`}>
            {wasCorrect ? '✅ ¡CORRECTO!' : '❌ FALLASTE'}
            <div className="sub">
              Real: {realLabel}{clip.decisionDetail ? ` — ${clip.decisionDetail}` : ''}
              <br />
              Tú: {selSide && !neutral ? `${selSide} · ` : ''}{selCall ? KUMITE_CALL_LABELS[selCall] : ''}
            </div>
          </div>
          <div className="card">
            <div className="meta">
              {clip.situations.map((s) => (
                <span key={s} className="badge round" style={{ marginRight: 4 }}>{KUMITE_SITUATION_LABELS[s]}</span>
              ))}
            </div>
            {clip.explanation && <p style={{ marginBottom: 0 }}>💡 {clip.explanation}</p>}
          </div>
          {clip.revealEndSeconds != null && !showingReveal && (
            <button className="btn-secondary" onClick={() => setShowingReveal(true)}>
              📢 VER LA SEÑALIZACIÓN REAL
            </button>
          )}
          <button className="btn-primary" onClick={next}>SIGUIENTE</button>
        </>
      )}
    </>
  );
}
