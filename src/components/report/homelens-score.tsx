const DISPLAY_FONT = "var(--font-report-display)"
const BODY_FONT = "var(--font-report-body)"

export type HomeLensScoreSection = { label: string; value: number | null; max: number }

export type HomeLensScoreProps = {
  score: number
  maxScore: number
  /** One row per report section, in report order, each against its own maximum. */
  sections: HomeLensScoreSection[]
}

function ScoreRow({ label, value, max }: HomeLensScoreSection) {
  const percent = value !== null ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div className="py-[7px] border-b text-[13px]" style={{ borderColor: "#E6E6E8" }}>
      <div className="flex justify-between">
        <span>{label}</span>
        <span style={{ color: "#6B6B70" }}>{value === null ? "—" : `${value}/${max}`}</span>
      </div>
      <div className="mt-1.5 h-[3px] w-full" style={{ backgroundColor: "#E6E6E8" }}>
        <div className="h-full" style={{ width: `${percent}%`, backgroundColor: "#0A369D" }} />
      </div>
    </div>
  )
}

export function HomeLensScore({ score, maxScore, sections }: HomeLensScoreProps) {
  return (
    <div style={{ fontFamily: BODY_FONT }}>
      <div className="flex items-baseline gap-1">
        <span
          className="text-[48px] sm:text-[64px]"
          style={{ fontFamily: DISPLAY_FONT, fontWeight: 300, letterSpacing: "-0.04em", lineHeight: 1, color: "#0A369D" }}
        >
          {score}
        </span>
        <span className="text-[13px]" style={{ color: "#6B6B70" }}>
          /{maxScore}
        </span>
      </div>
      <h2
        className="mt-2.5 text-[18px] sm:text-[22px]"
        style={{ fontFamily: DISPLAY_FONT, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.2 }}
      >
        HomeLens score
      </h2>
      <div className="mt-[18px]">
        {sections.map((section) => (
          <ScoreRow key={section.label} {...section} />
        ))}
      </div>
    </div>
  )
}
