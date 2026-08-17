import { useRef, useState } from 'react';
import { db } from '../db/db';
import type { KumiteCall, KumiteClip, KumiteSide } from '../db/types';
import { KUMITE_CALL_LABELS, KUMITE_SITUATION_LABELS } from '../db/types';
import YouTubePlayer, { type YouTubePlayerHandle } from './YouTubePlayer';

/** ¿Los textos elegidos coinciden exactamente con los correctos? */
function sameSet(selected: Set<number>, list: { text: string; correct: boolean }[]): boolean {
  return list.every((o, i) => o.correct === selected.has(i));
}

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
  const [selAo, setSelAo] = useState<Set<number>>(new Set());
  const [selAka, setSelAka] = useState<Set<number>>(new Set());
  const [wasCorrect, setWasCorrect] = useState(false);
  const [showingReveal, setShowingReveal] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [videoError, setVideoError] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  const playerRef = useRef<YouTubePlayerHandle>(null);

  const clip = queue[index];

  // Modo quiz: dos columnas (AO izquierda, AKA derecha) en orden fijo; hay que responder a los dos lados.
  const quiz = clip?.quizAo && clip?.quizAka && clip.quizAo.length >= 2 && clip.quizAka.length >= 2;

  if (!clip) {
    return (
      <div className="card center">
        <p>🎉 No quedan más clips en esta sesión.</p>
        <button className="btn-primary" onClick={onExit}>VOLVER</button>
      </div>
    );
  }

  const neutral = selCall != null && NEUTRAL_CALLS.includes(selCall);
  // en el quiz hay que responder OBLIGATORIAMENTE a los dos lados (aunque sea "Nada")
  const canConfirm = quiz ? selAo.size > 0 && selAka.size > 0 : selCall != null && (neutral || selSide != null);

  async function confirm() {
    if (!clip) return;
    let correct: boolean;
    if (quiz) {
      if (selAo.size === 0 || selAka.size === 0) return;
      correct = sameSet(selAo, clip.quizAo!) && sameSet(selAka, clip.quizAka!);
      await db.kumiteAttempts.add({
        clipId: clip.id,
        attemptedAt: new Date().toISOString(),
        selectedAo: [...selAo].map((i) => clip.quizAo![i].text),
        selectedAka: [...selAka].map((i) => clip.quizAka![i].text),
        isCorrect: correct,
      });
    } else {
      if (selCall == null) return;
      const side: KumiteSide = neutral ? 'NONE' : (selSide as KumiteSide);
      correct = selCall === clip.decisionCall && side === clip.decisionSide;
      await db.kumiteAttempts.add({
        clipId: clip.id,
        attemptedAt: new Date().toISOString(),
        selectedSide: side,
        selectedCall: selCall,
        isCorrect: correct,
      });
    }
    setWasCorrect(correct);
    setPhase('reveal');
  }

  function next() {
    setIndex((i) => i + 1);
    setPhase('playing');
    setSelSide(null);
    setSelCall(null);
    setSelAo(new Set());
    setSelAka(new Set());
    setShowingReveal(false);
    setVideoError(false);
    setPlaying(false);
  }

  function toggleSel(side: 'AO' | 'AKA', i: number) {
    const [sel, set] = side === 'AO' ? [selAo, setSelAo] : [selAka, setSelAka];
    const next = new Set(sel);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    set(next);
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

      {(clip.title || clip.timeRemaining || clip.atoShibaraku || clip.akaName || clip.aoName) && phase !== 'reveal' && (
        <div className="card perf-item" style={{ marginTop: 12 }}>
          {clip.title && <div className="who">{clip.title}</div>}
          {(clip.timeRemaining || clip.atoShibaraku) && (
            <div className="who" style={{ color: '#b56000' }}>
              ⏱ {clip.timeRemaining ? `Quedan ${clip.timeRemaining}` : ''}
              {clip.atoShibaraku ? `${clip.timeRemaining ? ' · ' : ''}ÚLTIMOS 15 s (Ato Shibaraku)` : ''}
            </div>
          )}
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

      {phase === 'decision' && quiz && (
        <>
          <div className="card">
            <label style={{ margin: '0 0 8px' }}>¿Qué da el árbitro central a cada uno? (elige en las dos columnas, aunque sea "Nada")</label>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="quiz-col-head" style={{ color: 'var(--ao)' }}>🔵 AO</div>
                {clip.quizAo!.map((o, i) => (
                  <button key={i} className={`quiz-opt ao${selAo.has(i) ? ' sel' : ''}`} onClick={() => toggleSel('AO', i)}>
                    {o.text}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="quiz-col-head" style={{ color: 'var(--aka)' }}>🔴 AKA</div>
                {clip.quizAka!.map((o, i) => (
                  <button key={i} className={`quiz-opt aka${selAka.has(i) ? ' sel' : ''}`} onClick={() => toggleSel('AKA', i)}>
                    {o.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button className="btn-primary" disabled={!canConfirm} onClick={confirm}>CONFIRMAR</button>
        </>
      )}

      {phase === 'decision' && !quiz && (
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
              {!quiz && (
                <>
                  <br />
                  Tú: {selSide && !neutral ? `${selSide} · ` : ''}{selCall ? KUMITE_CALL_LABELS[selCall] : ''}
                </>
              )}
            </div>
          </div>

          {quiz && (
            <div className="card">
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="quiz-col-head" style={{ color: 'var(--ao)' }}>🔵 AO</div>
                  {clip.quizAo!.map((o, i) => (
                    <div key={i} className={`quiz-opt reveal${o.correct ? ' good' : selAo.has(i) ? ' bad' : ''}`}>
                      {o.correct ? '✅ ' : selAo.has(i) ? '❌ ' : ''}{o.text}
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="quiz-col-head" style={{ color: 'var(--aka)' }}>🔴 AKA</div>
                  {clip.quizAka!.map((o, i) => (
                    <div key={i} className={`quiz-opt reveal${o.correct ? ' good' : selAka.has(i) ? ' bad' : ''}`}>
                      {o.correct ? '✅ ' : selAka.has(i) ? '❌ ' : ''}{o.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

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
