import type { ConnectionMetrics } from "../../lib/connectionQuality"
import { qualityColor } from "../../lib/connectionQuality"

export default function ConnectionScore({
  metrics,
}: {
  metrics: ConnectionMetrics
}) {
  const score = metrics.score
  return (
    <div className="rounded-2xl border border-[#edf6ef] bg-[#f9fdf9] px-4 py-3 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748b]">
        Score Quizz Leka
      </p>
      <p
        className="mt-1 text-3xl font-black tabular-nums"
        style={{ color: qualityColor(metrics.quality) }}
      >
        {score == null ? "—" : `${score}%`}
      </p>
    </div>
  )
}
