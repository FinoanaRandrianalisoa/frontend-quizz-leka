import type { ConnectionMetrics } from "../../lib/connectionQuality"
import { formatMetric } from "../../lib/connectionQuality"

export default function ConnectionDetails({
  metrics,
}: {
  metrics: ConnectionMetrics
}) {
  const rows: Array<[string, string]> = [
    ["Ping moyen", formatMetric(metrics.ping.average, "ms")],
    ["Ping min", formatMetric(metrics.ping.min, "ms")],
    ["Ping max", formatMetric(metrics.ping.max, "ms")],
    ["Jitter", formatMetric(metrics.jitter, "ms")],
    ["Perte de paquets", formatMetric(metrics.packetLoss, "%")],
    ["Serveur Quizz Leka", formatMetric(metrics.serverLatency, "ms")],
    ["API", formatMetric(metrics.apiLatency, "ms")],
    ["Débit descendant estimé", formatMetric(metrics.downloadMbps, "Mbps", 1)],
    ["Débit montant estimé", formatMetric(metrics.uploadMbps, "Mbps", 1)],
  ]

  return (
    <dl className="space-y-1.5">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-3 text-sm">
          <dt className="text-[#64748b]">{label}</dt>
          <dd className="font-semibold tabular-nums text-[#1f2a1f]">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
