// "Noto", the smiling notebook from the app icon, as a vector character so it can animate.
type Mood = 'happy' | 'cheer' | 'focus' | 'sleepy';

export function Mascot({ size = 72, mood = 'happy', className }: { size?: number; mood?: Mood; className?: string }) {
  const eyesClosed = mood === 'sleepy' || mood === 'focus';
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      {/* shadow */}
      <ellipse cx="60" cy="112" rx="34" ry="5" fill="rgba(0,0,0,0.10)" />
      {/* back cover */}
      <rect x="20" y="20" width="82" height="88" rx="16" fill="#1899d6" />
      {/* pages */}
      <rect x="16" y="16" width="82" height="88" rx="16" fill="#ffffff" stroke="#d4d9e3" strokeWidth="3" />
      {/* blue top band */}
      <path d="M16 32 a16 16 0 0 1 16 -16 h50 a16 16 0 0 1 16 16 v6 h-82z" fill="#1cb0f6" />
      {/* spiral rings */}
      {[30, 46, 62, 78].map((x) => (
        <g key={x}>
          <rect x={x - 3.5} y="8" width="7" height="18" rx="3.5" fill="#ffffff" stroke="#7a8294" strokeWidth="2.5" />
        </g>
      ))}
      {/* cheeks */}
      <ellipse cx="34" cy="74" rx="7" ry="4.5" fill="#ffb3c1" />
      <ellipse cx="80" cy="74" rx="7" ry="4.5" fill="#ffb3c1" />
      {/* eyes */}
      {eyesClosed ? (
        <>
          <path d="M34 60 q7 6 14 0" stroke="#2f3542" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M66 60 q7 6 14 0" stroke="#2f3542" strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="41" cy="58" rx="6.5" ry="8.5" fill="#2f3542" />
          <ellipse cx="73" cy="58" rx="6.5" ry="8.5" fill="#2f3542" />
          <circle cx="43.5" cy="54.5" r="2.6" fill="#fff" />
          <circle cx="75.5" cy="54.5" r="2.6" fill="#fff" />
        </>
      )}
      {/* mouth */}
      {mood === 'cheer' ? (
        <path d="M44 72 q13 18 26 0 z" fill="#c2185b" stroke="#2f3542" strokeWidth="3" strokeLinejoin="round" />
      ) : mood === 'focus' ? (
        <path d="M50 76 h14" stroke="#2f3542" strokeWidth="4" strokeLinecap="round" />
      ) : mood === 'sleepy' ? (
        <ellipse cx="57" cy="78" rx="4" ry="3" fill="#2f3542" />
      ) : (
        <path d="M46 73 q11 12 22 0" stroke="#2f3542" strokeWidth="4" fill="none" strokeLinecap="round" />
      )}
      {/* check marks on the page */}
      <path d="M30 90 l4 4 l7 -8" stroke="#12c79b" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="46" y="88" width="34" height="5" rx="2.5" fill="#e5e8ef" />
    </svg>
  );
}
