"use client"

export function MicrochipLoader({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg
        className="microchip-loader"
        viewBox="0 0 128 128"
        width="64px"
        height="64px"
        role="img"
        aria-label="Loading"
      >
        <defs>
          <symbol id="dot-1">
            <circle r="3" cx="3" cy="38" />
          </symbol>
          <symbol id="dot-2">
            <circle r="3" cx="3" cy="54" />
          </symbol>
          <symbol id="dot-3">
            <circle r="3" cx="3" cy="70" />
          </symbol>
          <symbol id="dot-4">
            <circle r="3" cx="3" cy="3" />
          </symbol>
          <symbol id="dot-5">
            <circle r="3" cx="20" cy="3" />
          </symbol>
          <symbol id="dot-6">
            <circle r="3" cx="3" cy="30" />
          </symbol>
          <symbol id="dot-7">
            <circle r="3" cx="37" cy="3" />
          </symbol>
          <symbol id="dot-8">
            <circle r="3" cx="54" cy="3" />
          </symbol>
          <symbol id="dot-9">
            <circle r="3" cx="71" cy="3" />
          </symbol>
          <symbol id="line-1">
            <polyline points="12 54,12 46,3 46,3 38" strokeDasharray="42 42" />
          </symbol>
          <symbol id="line-2">
            <polyline points="29 54,3 54" strokeDasharray="42 42" />
          </symbol>
          <symbol id="line-3">
            <polyline points="12 54,12 62,3 62,3 70" strokeDasharray="42 42" />
          </symbol>
          <symbol id="line-4">
            <polyline points="28 20,28 12,20 12,20 3" strokeDasharray="60 60" />
          </symbol>
          <symbol id="line-5">
            <polyline points="37 29,37 20,3 20,3 3" strokeDasharray="60 60" />
          </symbol>
          <symbol id="line-6">
            <polyline points="15 20,15 30,3 30" strokeDasharray="60 60" />
          </symbol>
          <symbol id="line-7">
            <polyline points="54 12,37 12,37 3" strokeDasharray="43 43" />
          </symbol>
          <symbol id="line-8">
            <polyline points="54 29,54 3" strokeDasharray="43 43" />
          </symbol>
          <symbol id="line-9">
            <polyline points="54 12,71 12,71 3" strokeDasharray="43 43" />
          </symbol>
          <symbol id="spark-1">
            <polyline points="12 54,12 46,3 46,3 38" strokeDasharray="15 69" />
          </symbol>
          <symbol id="spark-2">
            <polyline points="29 54,3 54" strokeDasharray="15 69" />
          </symbol>
          <symbol id="spark-3">
            <polyline points="12 54,12 62,3 62,3 70" strokeDasharray="15 69" />
          </symbol>
          <symbol id="spark-4">
            <polyline points="28 20,28 12,20 12,20 3" strokeDasharray="15 105" />
          </symbol>
          <symbol id="spark-5">
            <polyline points="37 29,37 20,3 20,3 3" strokeDasharray="15 105" />
          </symbol>
          <symbol id="spark-6">
            <polyline points="15 20,15 30,3 30" strokeDasharray="15 105" />
          </symbol>
          <symbol id="spark-7">
            <polyline points="54 12,37 12,37 3" strokeDasharray="15 71" />
          </symbol>
          <symbol id="spark-8">
            <polyline points="54 29,54 3" strokeDasharray="15 71" />
          </symbol>
          <symbol id="spark-9">
            <polyline points="54 12,71 12,71 3" strokeDasharray="15 71" />
          </symbol>
          <symbol id="wave">
            <rect x="3" y="3" rx="2.5" ry="2.5" width="44" height="44" />
          </symbol>
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
        <g transform="translate(10,10)">
          <g className="microchip__lines" strokeLinecap="round" strokeLinejoin="round">
            <g>
              <g fill="none" stroke="currentColor">
                <use className="microchip__line microchip__line--1" href="#line-1" />
                <use className="microchip__spark microchip__spark--1" href="#spark-1" />
                <use className="microchip__line microchip__line--2" href="#line-2" />
                <use className="microchip__spark microchip__spark--2" href="#spark-2" />
                <use className="microchip__line microchip__line--3" href="#line-3" />
                <use className="microchip__spark microchip__spark--3" href="#spark-3" />
              </g>
              <g fill="currentColor">
                <use className="microchip__dot microchip__dot--1" href="#dot-1" />
                <use className="microchip__dot microchip__dot--2" href="#dot-2" />
                <use className="microchip__dot microchip__dot--3" href="#dot-3" />
              </g>
            </g>
            <g>
              <g fill="none" stroke="currentColor">
                <use className="microchip__line microchip__line--4" href="#line-4" />
                <use className="microchip__spark microchip__spark--4" href="#spark-4" />
                <use className="microchip__line microchip__line--5" href="#line-5" />
                <use className="microchip__spark microchip__spark--5" href="#spark-5" />
                <use className="microchip__line microchip__line--6" href="#line-6" />
                <use className="microchip__spark microchip__spark--6" href="#spark-6" />
              </g>
              <g fill="currentColor">
                <use className="microchip__dot microchip__dot--4" href="#dot-4" />
                <use className="microchip__dot microchip__dot--5" href="#dot-5" />
                <use className="microchip__dot microchip__dot--6" href="#dot-6" />
              </g>
            </g>
            <g>
              <g fill="none" stroke="currentColor">
                <use className="microchip__line microchip__line--7" href="#line-7" />
                <use className="microchip__spark microchip__spark--7" href="#spark-7" />
                <use className="microchip__line microchip__line--8" href="#line-8" />
                <use className="microchip__spark microchip__spark--8" href="#spark-8" />
                <use className="microchip__line microchip__line--9" href="#line-9" />
                <use className="microchip__spark microchip__spark--9" href="#spark-9" />
              </g>
              <g fill="currentColor">
                <use className="microchip__dot microchip__dot--7" href="#dot-7" />
                <use className="microchip__dot microchip__dot--8" href="#dot-8" />
                <use className="microchip__dot microchip__dot--9" href="#dot-9" />
              </g>
            </g>
            <g transform="translate(108,0) scale(-1,1)">
              <g fill="none" stroke="currentColor">
                <use className="microchip__line microchip__line--4" href="#line-4" />
                <use className="microchip__spark microchip__spark--4" href="#spark-4" />
                <use className="microchip__line microchip__line--5" href="#line-5" />
                <use className="microchip__spark microchip__spark--5" href="#spark-5" />
                <use className="microchip__line microchip__line--6" href="#line-6" />
                <use className="microchip__spark microchip__spark--6" href="#spark-6" />
              </g>
              <g fill="currentColor">
                <use className="microchip__dot microchip__dot--4" href="#dot-4" />
                <use className="microchip__dot microchip__dot--5" href="#dot-5" />
                <use className="microchip__dot microchip__dot--6" href="#dot-6" />
              </g>
            </g>
            <g transform="translate(108,0) scale(-1,1)">
              <g fill="none" stroke="currentColor">
                <use className="microchip__line microchip__line--1" href="#line-1" />
                <use className="microchip__spark microchip__spark--1" href="#spark-1" />
                <use className="microchip__line microchip__line--2" href="#line-2" />
                <use className="microchip__spark microchip__spark--2" href="#spark-2" />
                <use className="microchip__line microchip__line--3" href="#line-3" />
                <use className="microchip__spark microchip__spark--3" href="#spark-3" />
              </g>
              <g fill="currentColor">
                <use className="microchip__dot microchip__dot--1" href="#dot-1" />
                <use className="microchip__dot microchip__dot--2" href="#dot-2" />
                <use className="microchip__dot microchip__dot--3" href="#dot-3" />
              </g>
            </g>
            <g transform="translate(108,108) scale(-1,-1)">
              <g fill="none" stroke="currentColor">
                <use className="microchip__line microchip__line--4" href="#line-4" />
                <use className="microchip__spark microchip__spark--4" href="#spark-4" />
                <use className="microchip__line microchip__line--5" href="#line-5" />
                <use className="microchip__spark microchip__spark--5" href="#spark-5" />
                <use className="microchip__line microchip__line--6" href="#line-6" />
                <use className="microchip__spark microchip__spark--6" href="#spark-6" />
              </g>
              <g fill="currentColor">
                <use className="microchip__dot microchip__dot--4" href="#dot-4" />
                <use className="microchip__dot microchip__dot--5" href="#dot-5" />
                <use className="microchip__dot microchip__dot--6" href="#dot-6" />
              </g>
            </g>
            <g transform="translate(0,108) scale(1,-1)">
              <g fill="none" stroke="currentColor">
                <use className="microchip__line microchip__line--7" href="#line-7" />
                <use className="microchip__spark microchip__spark--7" href="#spark-7" />
                <use className="microchip__line microchip__line--8" href="#line-8" />
                <use className="microchip__spark microchip__spark--8" href="#spark-8" />
                <use className="microchip__line microchip__line--9" href="#line-9" />
                <use className="microchip__spark microchip__spark--9" href="#spark-9" />
              </g>
              <g fill="currentColor">
                <use className="microchip__dot microchip__dot--7" href="#dot-7" />
                <use className="microchip__dot microchip__dot--8" href="#dot-8" />
                <use className="microchip__dot microchip__dot--9" href="#dot-9" />
              </g>
            </g>
            <g transform="translate(0,108) scale(1,-1)">
              <g fill="none" stroke="currentColor">
                <use className="microchip__line microchip__line--4" href="#line-4" />
                <use className="microchip__spark microchip__spark--4" href="#spark-4" />
                <use className="microchip__line microchip__line--5" href="#line-5" />
                <use className="microchip__spark microchip__spark--5" href="#spark-5" />
                <use className="microchip__line microchip__line--6" href="#line-6" />
                <use className="microchip__spark microchip__spark--6" href="#spark-6" />
              </g>
              <g fill="currentColor">
                <use className="microchip__dot microchip__dot--4" href="#dot-4" />
                <use className="microchip__dot microchip__dot--5" href="#dot-5" />
                <use className="microchip__dot microchip__dot--6" href="#dot-6" />
              </g>
            </g>
          </g>
          <g transform="translate(29,29)">
            <g className="microchip__center">
              <g fill="none" stroke="currentColor" strokeWidth="6">
                <use className="microchip__wave microchip__wave--1" href="#wave" />
                <use className="microchip__wave microchip__wave--2" href="#wave" />
              </g>
              <rect className="microchip__core" fill="currentColor" rx="5" ry="5" width="50" height="50" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}

export function MicrochipLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="chipGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>

      <rect x="25" y="25" width="50" height="50" rx="4" stroke="url(#chipGradient)" strokeWidth="3" fill="none" />

      <rect x="35" y="35" width="30" height="30" rx="2" stroke="url(#chipGradient)" strokeWidth="2" fill="none" />

      <line x1="35" y1="25" x2="35" y2="15" stroke="url(#chipGradient)" strokeWidth="2" />
      <circle cx="35" cy="12" r="3" fill="url(#chipGradient)" />

      <line x1="42" y1="25" x2="42" y2="18" stroke="url(#chipGradient)" strokeWidth="2" />

      <line x1="50" y1="25" x2="50" y2="15" stroke="url(#chipGradient)" strokeWidth="2" />

      <line x1="58" y1="25" x2="58" y2="18" stroke="url(#chipGradient)" strokeWidth="2" />

      <line x1="65" y1="25" x2="65" y2="15" stroke="url(#chipGradient)" strokeWidth="2" />
      <circle cx="65" cy="12" r="3" fill="url(#chipGradient)" />

      <line x1="35" y1="75" x2="35" y2="85" stroke="url(#chipGradient)" strokeWidth="2" />
      <circle cx="35" cy="88" r="3" fill="url(#chipGradient)" />

      <line x1="42" y1="75" x2="42" y2="82" stroke="url(#chipGradient)" strokeWidth="2" />

      <line x1="50" y1="75" x2="50" y2="85" stroke="url(#chipGradient)" strokeWidth="2" />
      <circle cx="50" cy="88" r="3" fill="url(#chipGradient)" />

      <line x1="58" y1="75" x2="58" y2="82" stroke="url(#chipGradient)" strokeWidth="2" />

      <line x1="65" y1="75" x2="65" y2="85" stroke="url(#chipGradient)" strokeWidth="2" />

      <line x1="25" y1="35" x2="15" y2="35" stroke="url(#chipGradient)" strokeWidth="2" />
      <circle cx="12" cy="35" r="3" fill="url(#chipGradient)" />

      <line x1="25" y1="42" x2="18" y2="42" stroke="url(#chipGradient)" strokeWidth="2" />

      <line x1="25" y1="50" x2="15" y2="50" stroke="url(#chipGradient)" strokeWidth="2" />

      <line x1="25" y1="58" x2="18" y2="58" stroke="url(#chipGradient)" strokeWidth="2" />

      <line x1="25" y1="65" x2="15" y2="65" stroke="url(#chipGradient)" strokeWidth="2" />
      <circle cx="12" cy="65" r="3" fill="url(#chipGradient)" />

      <line x1="75" y1="35" x2="85" y2="35" stroke="url(#chipGradient)" strokeWidth="2" />
      <circle cx="88" cy="35" r="3" fill="url(#chipGradient)" />

      <line x1="75" y1="42" x2="82" y2="42" stroke="url(#chipGradient)" strokeWidth="2" />

      <line x1="75" y1="50" x2="85" y2="50" stroke="url(#chipGradient)" strokeWidth="2" />

      <line x1="75" y1="58" x2="82" y2="58" stroke="url(#chipGradient)" strokeWidth="2" />
      <circle cx="88" cy="58" r="3" fill="url(#chipGradient)" />

      <line x1="75" y1="65" x2="85" y2="65" stroke="url(#chipGradient)" strokeWidth="2" />
    </svg>
  )
}

export default MicrochipLoader
