export function MicrochipLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="chipGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
        <linearGradient id="pinGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
      </defs>

      {/* Main chip body */}
      <rect
        x="20"
        y="20"
        width="24"
        height="24"
        rx="2"
        stroke="url(#chipGradient)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Internal circuit lines */}
      <line x1="28" y1="26" x2="36" y2="26" stroke="url(#chipGradient)" strokeWidth="1.5" />
      <line x1="28" y1="30" x2="36" y2="30" stroke="url(#chipGradient)" strokeWidth="1.5" />
      <line x1="28" y1="34" x2="36" y2="34" stroke="url(#chipGradient)" strokeWidth="1.5" />
      <line x1="28" y1="38" x2="36" y2="38" stroke="url(#chipGradient)" strokeWidth="1.5" />

      {/* Left pins */}
      <line x1="20" y1="24" x2="16" y2="24" stroke="url(#pinGradient)" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="28" x2="16" y2="28" stroke="url(#pinGradient)" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="32" x2="16" y2="32" stroke="url(#pinGradient)" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="36" x2="16" y2="36" stroke="url(#pinGradient)" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="40" x2="16" y2="40" stroke="url(#pinGradient)" strokeWidth="2" strokeLinecap="round" />

      {/* Right pins */}
      <line x1="44" y1="24" x2="48" y2="24" stroke="url(#pinGradient)" strokeWidth="2" strokeLinecap="round" />
      <line x1="44" y1="28" x2="48" y2="28" stroke="url(#pinGradient)" strokeWidth="2" strokeLinecap="round" />
      <line x1="44" y1="32" x2="48" y2="32" stroke="url(#pinGradient)" strokeWidth="2" strokeLinecap="round" />
      <line x1="44" y1="36" x2="48" y2="36" stroke="url(#pinGradient)" strokeWidth="2" strokeLinecap="round" />
      <line x1="44" y1="40" x2="48" y2="40" stroke="url(#pinGradient)" strokeWidth="2" strokeLinecap="round" />

      {/* Center dot for visual interest */}
      <circle cx="32" cy="32" r="2" fill="url(#chipGradient)" />
    </svg>
  )
}
