/** A stopwatch whose hands run: "30 seconds, on the clock". Decorative. */
export function ClockIcon({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden className="inline-block shrink-0">
      <defs>
        <linearGradient id="clock-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6ee7b7" />
          <stop offset="1" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      {/* crown and side button */}
      <rect x="27" y="3" width="10" height="6" rx="2" fill="url(#clock-ring)" />
      <rect x="30" y="8" width="4" height="4" fill="url(#clock-ring)" />
      <path d="M49 13l4-4 3 3-4 4" stroke="url(#clock-ring)" strokeWidth="3" strokeLinecap="round" />
      {/* face */}
      <circle cx="32" cy="34" r="24" fill="#0a0d0c" stroke="url(#clock-ring)" strokeWidth="4" />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
        <line
          key={deg}
          x1="32"
          y1="14"
          x2="32"
          y2={deg % 90 === 0 ? 19 : 17}
          stroke={deg % 90 === 0 ? "#ebf1ee" : "#4a5751"}
          strokeWidth={deg % 90 === 0 ? 2.5 : 1.5}
          strokeLinecap="round"
          transform={`rotate(${deg} 32 34)`}
        />
      ))}
      {/* hands */}
      <line className="clock-hand-slow" x1="32" y1="34" x2="32" y2="23" stroke="#ebf1ee" strokeWidth="3" strokeLinecap="round" />
      <line className="clock-hand-fast" x1="32" y1="37" x2="32" y2="15" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="34" r="3" fill="#34d399" />
    </svg>
  );
}
