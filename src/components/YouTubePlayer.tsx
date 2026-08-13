import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<any> | null = null;
function loadYouTubeApi(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(window.YT);
      };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    });
  }
  return apiPromise;
}

export interface YouTubePlayerHandle {
  getCurrentTime(): number | undefined;
  pause(): void;
  play(): void;
  seekTo(seconds: number): void;
}

interface Props {
  videoId: string;
  startSeconds?: number;
  endSeconds?: number;
  autoplay?: boolean;
  /** Se dispara una vez cuando la reproducción alcanza endSeconds o el vídeo termina. */
  onEnded?: () => void;
  onError?: (code: number) => void;
}

/**
 * Reproductor YouTube (IFrame API) con corte en endSeconds.
 * Además del parámetro `end` nativo, hace polling de getCurrentTime como red de seguridad.
 */
const YouTubePlayer = forwardRef<YouTubePlayerHandle, Props>(function YouTubePlayer(
  { videoId, startSeconds, endSeconds, autoplay = true, onEnded, onError },
  ref,
) {
  const holderRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const endedFiredRef = useRef(false);
  const cbRef = useRef({ onEnded, onError });
  cbRef.current = { onEnded, onError };
  const endRef = useRef(endSeconds);
  endRef.current = endSeconds;

  useImperativeHandle(ref, () => ({
    getCurrentTime: () => {
      const t = playerRef.current?.getCurrentTime?.();
      return typeof t === 'number' ? t : undefined;
    },
    pause: () => playerRef.current?.pauseVideo?.(),
    play: () => playerRef.current?.playVideo?.(),
    seekTo: (s: number) => playerRef.current?.seekTo?.(s, true),
  }));

  useEffect(() => {
    let disposed = false;
    let interval: ReturnType<typeof setInterval> | undefined;
    endedFiredRef.current = false;

    loadYouTubeApi().then((YT) => {
      if (disposed || !holderRef.current) return;
      const el = document.createElement('div');
      holderRef.current.innerHTML = '';
      holderRef.current.appendChild(el);
      playerRef.current = new YT.Player(el, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          start: startSeconds != null ? Math.floor(startSeconds) : undefined,
          end: endRef.current != null ? Math.ceil(endRef.current) : undefined,
          autoplay: autoplay ? 1 : 0,
          rel: 0,
          playsinline: 1,
          modestbranding: 1,
        },
        events: {
          onStateChange: (e: any) => {
            if (e.data === YT.PlayerState.ENDED) fireEnded();
          },
          onError: (e: any) => cbRef.current.onError?.(e.data),
        },
      });

      const fireEnded = () => {
        if (endedFiredRef.current) return;
        endedFiredRef.current = true;
        playerRef.current?.pauseVideo?.();
        cbRef.current.onEnded?.();
      };

      interval = setInterval(() => {
        const end = endRef.current;
        if (end == null || endedFiredRef.current) return;
        const t = playerRef.current?.getCurrentTime?.();
        if (typeof t === 'number' && t >= end) fireEnded();
      }, 400);
    });

    return () => {
      disposed = true;
      if (interval) clearInterval(interval);
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [videoId, startSeconds, autoplay]);

  return <div className="yt-holder" ref={holderRef} />;
});

export default YouTubePlayer;
