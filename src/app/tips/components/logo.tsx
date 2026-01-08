// AirTip Logo - works as app icon
// A stylized receipt with an upward arrow (tips going up/out)

export function AirTipLogo({
  size = 40,
  className = ""
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background - rounded square for app icon */}
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="14"
        fill="var(--tip-bg-elevated, #18181b)"
      />

      {/* Receipt shape with torn bottom edge */}
      <path
        d="M18 12H46C47.1 12 48 12.9 48 14V48L44 45L40 48L36 45L32 48L28 45L24 48L20 45L16 48V14C16 12.9 16.9 12 18 12Z"
        fill="var(--tip-bg-surface, #1f1f23)"
        stroke="var(--tip-accent, #3dd68c)"
        strokeWidth="2"
      />

      {/* Arrow pointing up - representing tips flowing */}
      <path
        d="M32 20V36M32 20L26 26M32 20L38 26"
        stroke="var(--tip-accent, #3dd68c)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Small lines on receipt - like text */}
      <line
        x1="22"
        y1="40"
        x2="30"
        y2="40"
        stroke="var(--tip-text-muted, #636366)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="34"
        y1="40"
        x2="42"
        y2="40"
        stroke="var(--tip-text-muted, #636366)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Compact version for very small sizes (bottom nav, etc)
export function AirTipLogoCompact({
  size = 32,
  className = ""
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Simple receipt with arrow */}
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="12"
        fill="var(--tip-accent-glow, rgba(61, 214, 140, 0.15))"
      />
      <path
        d="M32 18V38M32 18L24 26M32 18L40 26"
        stroke="var(--tip-accent, #3dd68c)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Torn receipt bottom */}
      <path
        d="M20 46L24 43L28 46L32 43L36 46L40 43L44 46"
        stroke="var(--tip-accent, #3dd68c)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Icon-only version (for favicon, app icon export)
export function AirTipIcon({ size = 64 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Solid background for app icon */}
      <rect width="64" height="64" rx="14" fill="#111113" />

      {/* Receipt outline */}
      <path
        d="M18 10H46C47.1 10 48 10.9 48 12V50L44 47L40 50L36 47L32 50L28 47L24 50L20 47L16 50V12C16 10.9 16.9 10 18 10Z"
        fill="#18181b"
        stroke="#3dd68c"
        strokeWidth="2"
      />

      {/* Up arrow */}
      <path
        d="M32 18V34M32 18L25 25M32 18L39 25"
        stroke="#3dd68c"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Receipt lines */}
      <line x1="22" y1="40" x2="42" y2="40" stroke="#3dd68c" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}
