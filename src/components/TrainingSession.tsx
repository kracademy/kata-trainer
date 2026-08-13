import { useMemo, useRef, useState } from 'react';
import { db, LOCAL_USER_ID } from '../db/db';
import type { OfficialResultType, Performance, Winner } from '../db/types';
import { officialAverage } from '../db/types';
import YouTubePlayer, { type YouTubePlayerHandle } from './YouTubePlayer';
import type { CatalogData } from '../logic/useCatalog';
import { roundLabel } from '../logic/format';

type Phase = 'playing' | 'decision' | 'reveal';

interface Props {
  queue: Performance[];
  data: CatalogData;
  /** Ocultar competición y año durante el vídeo para evitar sesgos. */
  hideContext?: boolean;
  onExit: () => void;
}

const SPECIALS: { value: OfficialResultType; label: string }[] = [
  { value: 'AKA_DISQUALIFIED', label: 'AKA descalificado' },
  { value: 'AO_DISQUALIFIED', label: 'AO descalificado' },
  { value: 'BOTH_DISQUALIFIED', label: 'Ambos descalificados' },
];

export default function TrainingSession({ queue, data, hideContext = true, onExit }: Props) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('playing');
  const [selected, setSelected] = useState<Winner | null>(null);
  const [special, setSpecial] = useState<OfficialResultType | ''>('');
  const [scoreAka, setScoreAka] = useState('');
  const [scoreAo, setScoreAo] = useState('');
  const [wasCorrect, setWasCorrect] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const playerRef = useRef<YouTubePlayerHandle>(null);

  const perf = queue[index];
  const comp = perf ? data.compById.get(perf.competitionId) : undefined;
  const cat = perf ? data.categoryById.get(perf.categoryId) : undefined;
  const aka = perf ? data.athleteById.get(perf.akaAthleteId) : undefined;
  const ao = perf ? data.athleteById.get(perf.aoAthleteId) : undefined;

  const judges = perf?.judgesCount ?? 5;
  const avgAka = useMemo(() => officialAverage(perf?.officialScoreAka, judges), [perf, judges]);
  const avgAo = useMemo(() => officialAverage(perf?.officialScoreAo, judges), [perf, judges]);

  if (!perf) {
    return (
      <div className="card center">
        <p>🎉 No quedan más actuaciones en esta sesión.</p>
        <button className="btn-primary" onClick={onExit}>VOLVER</button>
      </div>
    );
  }

  async function confirmDecision() {
    if (!selected || !perf) return;
    const prior = await db.attempts.where('performanceId').equals(perf.id).count();
    const correct = selected === perf.officialWinner;
    const uAka = scoreAka ? parseFloat(scoreAka) : undefined;
    const uAo = scoreAo ? parseFloat(scoreAo) : undefined;
    await db.attempts.add({
      performanceId: perf.id,
      userId: LOCAL_USER_ID,
      attemptedAt: new Date().toISOString(),
      selectedWinner: selected,
      selectedResultType: special || (selected === 'AKA' ? 'AKA_WINS' : 'AO_WINS'),
      userScoreAka: uAka,
      userScoreAo: uAo,
      isCorrectWinner: correct,
      scoreDeviationAka: uAka != null && avgAka != null ? Math.round((uAka - avgAka) * 100) / 100 : undefined,
      scoreDeviationAo: uAo != null && avgAo != null ? Math.round((uAo - avgAo) * 100) / 100 : undefined,
      isFirstAttempt: prior === 0,
      completed: true,
    });
    setWasCorrect(correct);
    setPhase('reveal');
  }

  function next() {
    setIndex((i) => i + 1);
    setPhase('playing');
    setSelected(null);
    setSpecial('');
    setScoreAka('');
    setScoreAo('');
    setVideoError(false);
  }

  const winnerAthlete = perf.officialWinner === 'AKA' ? aka : ao;
  const winnerName = winnerAthlete ? `${winnerAthlete.displayName} (${winnerAthlete.countryCode})` : '';

  return (
    <>
      <div className="muted" style={{ marginBottom: 8 }}>
        Actuación {index + 1} / {queue.length}
        {!hideContext && comp ? ` · ${comp.name}` : ''}
        {' · '}
        {cat?.name}
        <button style={{ float: 'right', padding: '4px 10px', fontSize: '0.75rem' }} onClick={onExit}>Salir</button>
      </div>

      <div className="player-wrap">
        {perf.videoId && !videoError && (
          <YouTubePlayer
            ref={playerRef}
            videoId={perf.videoId}
            startSeconds={perf.startSeconds}
            endSeconds={perf.endSeconds}
            onEnded={() => phase === 'playing' && setPhase('decision')}
            onError={() => setVideoError(true)}
          />
        )}
        {videoError && (
          <div className="player-overlay">
            <p>⚠️ Vídeo no disponible o no embebible.</p>
            <a href={`https://www.youtube.com/watch?v=${perf.videoId}&t=${Math.floor(perf.startSeconds ?? 0)}s`} target="_blank" rel="noreferrer">
              Abrir en YouTube
            </a>
            <button onClick={() => setPhase('decision')}>Ya lo he visto → decidir</button>
          </div>
        )}
        {phase !== 'playing' && !videoError && (
          <div className="player-overlay">
            {phase === 'decision' && <p style={{ fontSize: '1.3rem', fontWeight: 800 }}>¿Quién gana?</p>}
            {phase === 'reveal' && (
              <p style={{ fontSize: '1.1rem' }}>
                {wasCorrect ? '✅' : '❌'} Resultado abajo
              </p>
            )}
          </div>
        )}
      </div>

      {phase === 'playing' && (
        <button className="btn-primary" onClick={() => setPhase('decision')}>
          FINALIZAR ACTUACIÓN
        </button>
      )}

      {phase === 'decision' && (
        <>
          <div className="row" style={{ margin: '14px 0' }}>
            <button className={`btn-aka${selected === 'AKA' ? ' sel' : ''}`} onClick={() => setSelected('AKA')}>
              🔴 AKA
            </button>
            <button className={`btn-ao${selected === 'AO' ? ' sel' : ''}`} onClick={() => setSelected('AO')}>
              🔵 AO
            </button>
          </div>

          <details className="card">
            <summary className="muted">Puntuación (opcional, media por juez 5.0–10.0)</summary>
            <div className="row" style={{ marginTop: 10 }}>
              <div style={{ flex: 1 }}>
                <label>AKA</label>
                <input type="number" step="0.1" min="5" max="10" inputMode="decimal" placeholder="p. ej. 8.6" value={scoreAka} onChange={(e) => setScoreAka(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label>AO</label>
                <input type="number" step="0.1" min="5" max="10" inputMode="decimal" placeholder="p. ej. 9.2" value={scoreAo} onChange={(e) => setScoreAo(e.target.value)} />
              </div>
            </div>
          </details>

          <details className="card">
            <summary className="muted">Resultado especial</summary>
            {SPECIALS.map((s) => (
              <label key={s.value} style={{ textTransform: 'none', display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="radio" name="special" style={{ width: 'auto' }} checked={special === s.value} onChange={() => setSpecial(s.value)} />
                {s.label}
              </label>
            ))}
          </details>

          <button className="btn-primary" disabled={!selected} onClick={confirmDecision}>
            CONFIRMAR
          </button>
        </>
      )}

      {phase === 'reveal' && (
        <>
          <div className={`reveal-banner ${wasCorrect ? 'ok' : 'bad'}`}>
            {wasCorrect ? '✅ ¡CORRECTO!' : '❌ FALLASTE'}
            <div className="sub">
              Oficial: 🏆 {perf.officialWinner} — {winnerName} · Tu decisión: {selected}
            </div>
          </div>

          <div className="card">
            <div className="muted">
              {comp?.name} ({comp?.year}) · {cat?.name} · {roundLabel(perf.roundType)}
            </div>
            <table className="scores" style={{ marginTop: 8 }}>
              <thead>
                <tr><th></th><th>Atleta</th><th>Kata</th><th>Total</th><th>Media</th><th>Tú</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td className="side-aka">AKA</td>
                  <td>{aka?.displayName} <span className="muted">({aka?.countryCode})</span></td>
                  <td>{perf.kataAka ?? '—'}{perf.kataAkaNumber ? <span className="muted"> #{perf.kataAkaNumber}</span> : null}</td>
                  <td>{perf.officialScoreAka?.toFixed(2) ?? '—'}</td>
                  <td>{avgAka?.toFixed(2) ?? '—'}</td>
                  <td>{scoreAka || '—'}</td>
                </tr>
                <tr>
                  <td className="side-ao">AO</td>
                  <td>{ao?.displayName} <span className="muted">({ao?.countryCode})</span></td>
                  <td>{perf.kataAo ?? '—'}{perf.kataAoNumber ? <span className="muted"> #{perf.kataAoNumber}</span> : null}</td>
                  <td>{perf.officialScoreAo?.toFixed(2) ?? '—'}</td>
                  <td>{avgAo?.toFixed(2) ?? '—'}</td>
                  <td>{scoreAo || '—'}</td>
                </tr>
              </tbody>
            </table>
            {perf.judgeVotes && (
              <p className="muted center" style={{ marginBottom: 0 }}>
                Votos: AKA {perf.judgeVotes.aka} – {perf.judgeVotes.ao} AO
              </p>
            )}
            <p className="muted center" style={{ marginBottom: 0 }}>
              Media = total / {judges} jueces
              {perf.sportDataUrl && (
                <> · <a href={perf.sportDataUrl} target="_blank" rel="noreferrer">SportData</a></>
              )}
              {perf.videoId && (
                <> · <a href={`https://www.youtube.com/watch?v=${perf.videoId}&t=${Math.floor(perf.startSeconds ?? 0)}s`} target="_blank" rel="noreferrer">YouTube</a></>
              )}
            </p>
          </div>

          <button className="btn-primary" onClick={next}>SIGUIENTE</button>
        </>
      )}
    </>
  );
}
