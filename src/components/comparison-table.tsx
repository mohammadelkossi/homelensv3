import { Check, X } from "lucide-react"

const comparisonData = [
  {
    feature: "Personalisation",
    homeLens: {
      status: "positive",
      text: "Personalised to your exact preferences",
    },
    alone: {
      status: "positive",
      text: "Highly Personalised",
    },
    traditional: {
      status: "negative",
      text: "Does not take into account personal preferences",
    },
  },
  {
    feature: "Value Consideration",
    homeLens: {
      status: "positive",
      text: "Provides objective, real time analysis to ensure you get the best price",
    },
    alone: {
      status: "negative",
      text: "Can often overpay, not knowing the right price for the property",
    },
    traditional: {
      status: "negative",
      text: "Uses legacy data that has a 3-6 month lag",
    },
  },
  {
    feature: "Speed",
    homeLens: {
      status: "positive",
      text: "Fast",
    },
    alone: {
      status: "negative",
      text: "Time consuming & overwhelming",
    },
    traditional: {
      status: "positive",
      text: "Fast",
    },
  },
  {
    feature: "Ideal For",
    homeLens: {
      status: "neutral",
      text: "Busy professionals looking to get the best deal, without compromising their preferences or spending weeks researching",
    },
    alone: {
      status: "neutral",
      text: "Time-rich buyers wanting to experience the 'home buying journey' and enjoy the research process",
    },
    traditional: {
      status: "neutral",
      text: "Property investors focused purely on area-level metrics rather than individual property assessment",
    },
  },
]

function StatusIcon({ status }: { status: string }) {
  if (status === "positive") {
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 ring-1 ring-emerald-500/50">
        <Check className="h-3 w-3 text-emerald-400" />
      </div>
    )
  }
  if (status === "negative") {
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 ring-1 ring-red-500/50">
        <X className="h-3 w-3 text-red-400" />
      </div>
    )
  }
  return null
}

function getTextColor(status: string) {
  if (status === "positive") return "text-emerald-400"
  if (status === "negative") return "text-red-400"
  return "text-white/80"
}

export function ComparisonTable() {
  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-16 text-center">
        <h2 className="text-balance text-3xl md:text-4xl font-bold" style={{ fontFamily: "'Britti Sans', sans-serif", color: '#000000' }}>
          In Minutes, Not Months
        </h2>
      </div>

      {/* Table Container */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-1 backdrop-blur-xl">
        {/* Glow effects */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-40 w-40 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-teal-500/10 blur-3xl" />

        <div className="relative overflow-x-auto rounded-xl bg-[#0d1219]/90">
          <table className="w-full">
            {/* Table Header - Updated column names with teal background */}
            <thead>
              <tr>
                <th className="px-6 py-[0.84rem] text-left" />
                <th className="bg-[#0A369D] px-6 py-[0.84rem] text-left rounded-tl-lg">
                  <span className="text-lg font-semibold text-white">HomeLens</span>
                </th>
                <th className="bg-[#CFDEE7] px-6 py-[0.84rem] text-left">
                  <span className="text-lg font-semibold text-[#0d1219]">Alone</span>
                </th>
                <th className="bg-[#0A369D] px-6 py-[0.84rem] text-left rounded-tr-lg">
                  <span className="text-lg font-semibold text-white">Traditional Property Report</span>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {comparisonData.map((row, index) => {
                const isLastRow = index === comparisonData.length - 1
                return (
                  <tr
                    key={row.feature}
                    className={`group transition-colors ${!isLastRow ? "border-b border-white/10" : ""}`}
                  >
                    {/* Feature name */}
                    <td className="px-6 py-[0.84rem]">
                      <span className="font-medium text-white/90">{row.feature}</span>
                    </td>

                    {/* HomeLens column */}
                    <td className={`bg-[#0A369D] px-6 py-[0.84rem] ${isLastRow ? "rounded-bl-lg" : ""}`}>
                      <div className="flex items-start gap-3">
                        <StatusIcon status={row.homeLens.status} />
                        <span
                          className={`text-sm leading-relaxed ${row.homeLens.status === "positive" ? "text-emerald-300" : row.homeLens.status === "negative" ? "text-red-300" : "text-white/90"}`}
                        >
                          {row.homeLens.text === "Busy professionals looking to get the best deal, without compromising their preferences or spending weeks researching" ? (
                            <strong>{row.homeLens.text}</strong>
                          ) : (
                            row.homeLens.text
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Alone column */}
                    <td className="bg-[#CFDEE7] px-6 py-[0.84rem]">
                      <div className="flex items-start gap-3">
                        <StatusIcon status={row.alone.status} />
                        <span
                          className={`text-sm leading-relaxed ${row.alone.status === "positive" ? "text-emerald-700" : row.alone.status === "negative" ? "text-red-700" : "text-[#0d1219]/90"}`}
                        >
                          {row.alone.text === "Time-rich buyers wanting to experience the 'home buying journey' and enjoy the research process" ? (
                            <strong>{row.alone.text}</strong>
                          ) : (
                            row.alone.text
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Traditional column */}
                    <td className={`bg-[#0A369D] px-6 py-[0.84rem] ${isLastRow ? "rounded-br-lg" : ""}`}>
                      <div className="flex items-start gap-3">
                        <StatusIcon status={row.traditional.status} />
                        <span
                          className={`text-sm leading-relaxed ${row.traditional.status === "positive" ? "text-emerald-300" : row.traditional.status === "negative" ? "text-red-300" : "text-white/90"}`}
                        >
                          {row.traditional.text === "Property investors focused purely on area-level metrics rather than individual property assessment" ? (
                            <strong>{row.traditional.text}</strong>
                          ) : (
                            row.traditional.text
                          )}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

