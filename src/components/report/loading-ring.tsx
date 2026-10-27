/** A spinning ring for parts of the report still being written. Decorative: pair it with text. */
export function LoadingRing({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0 motion-safe:animate-spin"
    >
      <circle cx="12" cy="12" r="10" stroke="#E6E6E8" strokeWidth="2.5" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="#0A369D" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
