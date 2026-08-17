/** Iconos pequeños estilo SF Symbols para los tiles de estadísticas (sustituyen a los emojis). */

const base = {
  width: 26,
  height: 26,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const TI = {
  /** llama (racha) */
  flame: (
    <svg {...base}>
      <path d="M12 21c-3.7 0-6.3-2.5-6.3-6 0-2.5 1.6-4.4 2.9-6.2C9.8 7.2 11 5.6 11.3 3.4c2.7 1.5 3.4 3.9 3.2 5.9 1.1-.3 1.9-1 2.3-2.1 1.1 1.6 1.5 3.3 1.5 4.8 0 3.5-2.6 6-6.3 6z" />
    </svg>
  ),
  /** diana (precisión) */
  target: (
    <svg {...base}>
      <circle cx="12" cy="12" r="8.6" />
      <circle cx="12" cy="12" r="4.6" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  /** claqueta de vídeo (actuaciones listas) */
  clapper: (
    <svg {...base}>
      <rect x="3.4" y="8.6" width="17.2" height="11" rx="2.4" />
      <path d="M3.8 8.6 20 5l.6 2.6-16.2 3.6z" />
      <path d="M8 5.9 10.2 8M12.4 4.9l2.2 2.1M16.8 4l2.2 2.1" />
    </svg>
  ),
  /** aviso (errores pendientes) */
  alert: (
    <svg {...base}>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 7.4v5.4" />
      <circle cx="12" cy="16.3" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  ),
  /** carrete (clips) */
  film: (
    <svg {...base}>
      <rect x="4" y="4.6" width="16" height="14.8" rx="2.6" />
      <path d="M8.4 4.8v14.4M15.6 4.8v14.4M4.4 9.4h3.8M4.4 14.6h3.8M15.8 9.4h3.8M15.8 14.6h3.8" />
    </svg>
  ),
  /** balanza (polémicas) */
  scale: (
    <svg {...base}>
      <path d="M12 4.6v14.8M7.6 19.4h8.8" />
      <path d="M5.4 7.2h13.2" />
      <path d="M5.4 7.2 3 13.2c1 1 3.8 1 4.8 0zM18.6 7.2l-2.4 6c1 1 3.8 1 4.8 0z" />
    </svg>
  ),
  /** dos personas (combates) */
  duo: (
    <svg {...base}>
      <circle cx="8.4" cy="8" r="2.6" />
      <path d="M3.6 19c.4-3.4 2.3-5.4 4.8-5.4S12.8 15.6 13.2 19" />
      <circle cx="16.6" cy="7.2" r="2.1" />
      <path d="M14.9 12.4c.6-.4 1.1-.6 1.7-.6 2.1 0 3.7 1.7 4 4.6" />
    </svg>
  ),
};
