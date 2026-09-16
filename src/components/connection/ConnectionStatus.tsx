import { Signal, Smartphone, Wifi, WifiOff } from "lucide-react"
import ConnectionPopover from "./ConnectionPopover"
import {
  formatMbpsLive,
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
  const mbps = formatMbpsLive(metrics.downloadMbps)
  const label = `Qualité de connexion : ${qualityLabel(metrics.quality).toLowerCase()}${
    score == null ? "" : `, ${score} pour cent`
  }, débit ${mbps} mégabits par seconde`
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-expanded={open}
      title={label}
      className="relative flex h-10 shrink-0 items-center gap-1.5 rounded-xl border-2 border-[#16a34a]/40 bg-[#f0fdf4] px-2.5 text-[#15803d] transition-colors hover:bg-[#dcfce7] hover:text-[#14532d]"
    >
      <TypeIcon
        type={metrics.networkType}
        offline={metrics.quality === "OFFLINE"}
      />
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: qualityColor(metrics.quality) }}
        aria-hidden
      />
      <span className="flex flex-col items-start leading-none">
        <span className="text-[9px] font-bold uppercase tracking-wide text-[#64748b]">
          Débit
        </span>
        <span className="text-xs font-black tabular-nums text-[#1f2a1f]">
          {mbps} Mb/s
        </span>
      </span>
    </button>
  )
}

export { ConnectionPopover }
