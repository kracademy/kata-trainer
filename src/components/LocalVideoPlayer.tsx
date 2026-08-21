import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { YouTubePlayerHandle } from './YouTubePlayer';

interface Props {
  src: string; // object URL del archivo local
  startSeconds?: number;
  endSeconds?: number;
  autoplay?: boolean;
  controls?: boolean;
  playbackRate?: number;
  onEnded?: () => void;
  onError?: (code: number) => void;
  onPlayingChange?: (playing: boolean) => void;
}

/**
 * Reproductor de vídeo local (sin anuncios): misma interfaz que YouTubePlayer
 * para poder intercambiarlos en las sesiones de entrenamiento.
 */
const LocalVideoPlayer = forwardRef<YouTubePlayerHandle, Props>(function LocalVideoPlayer(
  { src, startSeconds, endSeconds, autoplay = true, controls = true, playbackRate = 1, onEnded, onError, onPlayingChange },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const endedFiredRef = useRef(false);
  const cbRef = useRef({ onEnded, onError, onPlayingChange });
  cbRef.current = { onEnded, onError, onPlayingChange };
  const endRef = useRef(endSeconds);
  endRef.current = endSeconds;

  useImperativeHandle(ref, () => ({
    getCurrentTime: () => videoRef.current?.currentTime,
    pause: () => videoRef.current?.pause(),
    play: () => { videoRef.current?.play().catch(() => undefined); },
    seekTo: (s: number) => { if (videoRef.current) videoRef.current.currentTime = s; },
    setRate: (r: number) => { if (videoRef.current) videoRef.current.playbackRate = r; },
  }));

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    endedFiredRef.current = false;
    const fireEnded = () => {
      if (endedFiredRef.current) return;
      endedFiredRef.current = true;
      v.pause();
      cbRef.current.onEnded?.();
    };
    const onLoaded = () => {
      if (startSeconds != null) v.currentTime = startSeconds;
      v.playbackRate = playbackRate;
      if (autoplay) v.play().catch(() => undefined);
    };
    const onTime = () => {
      const end = endRef.current;
      if (end != null && v.currentTime >= end) fireEnded();
    };
    v.addEventListener('loadedmetadata', onLoaded);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('ended', fireEnded);
    const onPlay = () => cbRef.current.onPlayingChange?.(true);
    const onPause = () => cbRef.current.onPlayingChange?.(false);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    const onErr = () => cbRef.current.onError?.(0);
    v.addEventListener('error', onErr);
    v.load();
    return () => {
      v.removeEventListener('loadedmetadata', onLoaded);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('ended', fireEnded);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('error', onErr);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, startSeconds]);

  // cambio de velocidad sin re-montar
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  return (
    <video
      ref={videoRef}
      className="yt-holder"
      src={src}
      controls={controls}
      playsInline
      preload="auto"
      style={{ objectFit: 'contain', background: '#000' }}
    />
  );
});

export default LocalVideoPlayer;
