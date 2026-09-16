import { Signal, Smartphone, Wifi, WifiOff } from "lucide-react"
import ConnectionPopover from "./ConnectionPopover"
import {
  qualityColor,
  qualityLabel,
  type ConnectionMetrics,
} from "../../lib/connectionQuality"

export default function ConnectionAlert({
  message,
  quality,
}: {
  message: string | null
  quality: ConnectionMetrics["quality"]
}) {
  if (!message) return null
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-lg"
      style={{ background: qualityColor(quality) }}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  )
}

function TypeIcon({
  type,
  offline,
}: {
  type: string | null
  offline: boolean
}) {
  if (offline) return <WifiOff size={16} />
  if (type === "cellular") return <Smartphone size={16} />
  if (type === "wifi" || type === "ethernet") return <Wifi size={16} />
  return <Signal size={16} />
}

export function ConnectionStatusButton({
  metrics,
  open,
  onToggle,
}: {
  metrics: ConnectionMetrics
  open: boolean
  onToggle: () => void
}) {
  const score = metrics.score
  const label = `Qualité de connexion : ${qualityLabel(metrics.quality).toLowerCase()}${
    score == null ? "" : `, ${score} pour cent`
  }`
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-expanded={open}
      className="relative flex h-10 items-center gap-1.5 rounded-xl border border-[#d9e7dd] bg-white px-2.5 text-[#64748b] transition-colors hover:bg-[#f3faf4] hover:text-[#1f2a1f]"
    >
      <TypeIcon
        type={metrics.networkType}
        offline={metrics.quality === "OFFLINE"}
      />
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ background: qualityColor(metrics.quality) }}
        aria-hidden
      />
      <span className="hidden xl:inline text-xs font-semibold tabular-nums text-[#1f2a1f]">
        {score == null ? "—" : `${score}%`}
      </span>
    </button>
  )
}

export { ConnectionPopover }
