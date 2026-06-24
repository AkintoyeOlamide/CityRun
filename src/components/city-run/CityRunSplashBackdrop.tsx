/** Decorative map + bicycle line art for the splash background */
export function CityRunSplashBackdrop() {
  return (
    <div className="cr-splash-backdrop pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Street grid */}
      <svg
        className="cr-splash-map-grid absolute -inset-[20%] h-[140%] w-[140%] opacity-[0.09]"
        viewBox="0 0 400 800"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern
            id="cr-map-grid"
            width="36"
            height="36"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 36 0 L 0 0 0 36"
              stroke="white"
              strokeWidth="0.6"
              fill="none"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cr-map-grid)" />
        {/* Main roads — thicker grid lines */}
        <path d="M 0 180 H 400" stroke="white" strokeWidth="1.2" opacity="0.35" />
        <path d="M 0 420 H 400" stroke="white" strokeWidth="1.2" opacity="0.35" />
        <path d="M 0 640 H 400" stroke="white" strokeWidth="1.2" opacity="0.35" />
        <path d="M 80 0 V 800" stroke="white" strokeWidth="1.2" opacity="0.35" />
        <path d="M 200 0 V 800" stroke="white" strokeWidth="1.2" opacity="0.35" />
        <path d="M 320 0 V 800" stroke="white" strokeWidth="1.2" opacity="0.35" />
      </svg>

      {/* Delivery routes + pins */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 390 844"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Radar rings behind hero */}
        <circle
          cx="195"
          cy="400"
          r="120"
          className="stroke-accent/15"
          strokeWidth="1"
        />
        <circle
          cx="195"
          cy="400"
          r="168"
          className="stroke-white/6"
          strokeWidth="1"
          strokeDasharray="4 8"
        />
        <circle
          cx="195"
          cy="400"
          r="220"
          className="stroke-white/5"
          strokeWidth="1"
        />

        {/* Route A — pickup to dropoff */}
        <path
          d="M 48 720 C 80 620, 120 560, 160 520 S 240 440, 280 380"
          className="cr-splash-route stroke-accent/35"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="6 10"
        />
        {/* Route B */}
        <path
          d="M 340 140 C 300 200, 260 260, 220 320 S 160 400, 130 460"
          className="cr-splash-route stroke-white/20"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="4 8"
          style={{ animationDelay: "-2s" }}
        />

        {/* Map pins */}
        <MapPin x={48} y={720} />
        <MapPin x={280} y={380} accent />
        <MapPin x={340} y={140} small />

        {/* Compass rose — top right */}
        <g className="opacity-[0.12]" transform="translate(318, 72)">
          <circle cx="0" cy="0" r="22" stroke="white" strokeWidth="1" />
          <path d="M 0 -14 L 3 0 L 0 14 L -3 0 Z" fill="white" opacity="0.8" />
          <path d="M -14 0 L 0 -3 L 14 0 L 0 3 Z" fill="white" opacity="0.35" />
          <text
            x="0"
            y="-26"
            textAnchor="middle"
            fill="white"
            fontSize="8"
            fontWeight="600"
          >
            N
          </text>
        </g>
      </svg>

      {/* Corner bicycle silhouettes */}
      <svg
        className="absolute -left-6 bottom-32 h-28 w-28 opacity-[0.07]"
        viewBox="0 0 120 80"
        fill="none"
        aria-hidden
      >
        <MiniBike />
      </svg>
      <svg
        className="absolute -right-4 top-36 h-24 w-24 rotate-12 opacity-[0.06]"
        viewBox="0 0 120 80"
        fill="none"
        aria-hidden
      >
        <MiniBike />
      </svg>

      {/* Topographic contour lines — bottom fade */}
      <svg
        className="absolute inset-x-0 bottom-0 h-48 opacity-[0.08]"
        viewBox="0 0 390 120"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0 80 Q 65 60, 130 75 T 260 70 T 390 85"
          stroke="white"
          strokeWidth="1"
        />
        <path
          d="M0 95 Q 80 75, 160 92 T 320 88 T 390 100"
          stroke="white"
          strokeWidth="1"
        />
        <path
          d="M0 108 Q 100 88, 200 105 T 390 112"
          stroke="white"
          strokeWidth="1"
        />
      </svg>

      {/* Vignette so edges stay dark */}
      <div className="cr-splash-vignette absolute inset-0" />
    </div>
  );
}

function MapPin({
  x,
  y,
  accent,
  small,
}: {
  x: number;
  y: number;
  accent?: boolean;
  small?: boolean;
}) {
  const r = small ? 5 : 7;
  const stroke = accent ? "rgb(52 120 246 / 0.55)" : "rgb(255 255 255 / 0.28)";
  const fill = accent ? "rgb(52 120 246 / 0.25)" : "rgb(255 255 255 / 0.12)";

  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle r={r + 6} fill={fill} className="cr-splash-pin-pulse" />
      <circle r={r} fill={fill} stroke={stroke} strokeWidth="1.5" />
      <circle r={2} fill={accent ? "#3478f6" : "white"} opacity={accent ? 0.9 : 0.5} />
    </g>
  );
}

function MiniBike() {
  return (
    <>
      <circle cx="38" cy="52" r="14" stroke="white" strokeWidth="2.5" />
      <circle cx="88" cy="52" r="14" stroke="white" strokeWidth="2.5" />
      <path
        d="M38 52 L58 28 L78 28 L88 42 L68 52 L58 52 L48 42 Z"
        stroke="white"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <rect x="68" y="22" width="14" height="10" rx="2" stroke="white" strokeWidth="1.5" />
    </>
  );
}
