/** Animated delivery bike for the splash screen — rides across a dashed road. */
export function CityRunSplashBikeScene() {
  return (
    <div
      className="cr-splash-ride relative mx-auto mt-7 w-full max-w-[18rem]"
      aria-hidden
    >
      <div className="relative h-16 overflow-hidden">
        <div className="cr-splash-road-lines-light absolute inset-x-0 bottom-3 h-px" />
        <div className="cr-splash-bike-rider absolute bottom-1.5 left-0 w-[4.75rem]">
          <SplashDeliveryBike />
        </div>
      </div>
    </div>
  );
}

function SplashDeliveryBike() {
  return (
    <svg
      viewBox="0 0 96 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-full"
    >
      <g className="cr-splash-speed-lines">
        <path d="M4 38H18" stroke="#3478f6" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
        <path d="M0 42H14" stroke="#facc15" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
        <path d="M6 46H16" stroke="#3478f6" strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
      </g>

      <g className="cr-splash-bike-body">
        <circle cx="22" cy="42" r="10" stroke="#2563d4" strokeWidth="2" fill="#eff6ff" />
        <circle cx="68" cy="42" r="10" stroke="#2563d4" strokeWidth="2" fill="#eff6ff" />
        <path
          d="M22 42 L38 20 L52 20 L68 34 L58 42 L42 42 L34 34 Z"
          stroke="#2563d4"
          strokeWidth="2.25"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M38 20 L36 14 M38 20 L40 14" stroke="#2563d4" strokeWidth="2" strokeLinecap="round" />
        <rect x="48" y="12" width="14" height="10" rx="1.5" fill="#1e293b" />
        <path
          d="M52 17 L58 17 M55 14 L55 20"
          stroke="#facc15"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <circle cx="44" cy="16" r="5" fill="#3478f6" />
        <path d="M44 13 V19 M41 16 H47" stroke="#eff6ff" strokeWidth="1.25" strokeLinecap="round" />
      </g>

      <g className="cr-splash-wheel cr-splash-wheel-rear" style={{ transformOrigin: "22px 42px" }}>
        <circle cx="22" cy="42" r="3" fill="#3478f6" />
        {[0, 60, 120].map((deg) => (
          <line
            key={deg}
            x1="22"
            y1="42"
            x2="22"
            y2="34"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeLinecap="round"
            transform={`rotate(${deg} 22 42)`}
          />
        ))}
      </g>

      <g className="cr-splash-wheel cr-splash-wheel-front" style={{ transformOrigin: "68px 42px" }}>
        <circle cx="68" cy="42" r="3" fill="#3478f6" />
        {[0, 60, 120].map((deg) => (
          <line
            key={deg}
            x1="68"
            y1="42"
            x2="68"
            y2="34"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeLinecap="round"
            transform={`rotate(${deg} 68 42)`}
          />
        ))}
      </g>
    </svg>
  );
}
