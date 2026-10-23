export function ProductMark({ name, className = "h-full w-full" }: { name: string; className?: string }) {
  const shift = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 36;
  return (
    <svg viewBox="0 0 160 180" className={className} role="img" aria-label="">
      <rect x="46" y="28" width="68" height="22" rx="7" fill="var(--primary)" />
      <rect x="34" y="48" width="92" height="112" rx="22" fill="var(--secondary)" stroke="var(--border)" />
      <rect x="48" y="70" width="64" height="70" rx="16" fill="var(--card)" />
      <circle cx="80" cy="104" r="16" fill={`oklch(0.72 0.07 ${70 + shift})`} />
      <path d="M62 128h36" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
