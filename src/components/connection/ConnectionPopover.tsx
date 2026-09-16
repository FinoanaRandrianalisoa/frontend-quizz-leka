import { Wifi, WifiOff } from "lucide-react"
import ConnectionDetails from "./ConnectionDetails"
import ConnectionScore from "./ConnectionScore"
import ConnectionTestProgressView from "./ConnectionTestProgress"
import {
  formatMetric,
  networkTypeLabel,
  qualityColor,
  qualityLabel,
  type ConnectionMetrics,
} from "../../lib/connectionQuality"
import type { ConnectionTestProgress } from "../../services/connectionTestService"

function websocketLabel(status: ConnectionMetrics["websocket"]["status"]) {
  switch (status) {
    case "connected":
      return "Connecté"
    case "connecting":
      return "Connexion…"
    case "reconnecting":
      return "Reconnexion…"
    case "degraded":
      return "Dégradé"
    default:
      return "Déconnecté"
  }
}

export default function ConnectionPopover({
  metrics,
  progress,
  onQuickTest,
  onFullTest,
  onCancel,
  onClose,
}: {
  metrics: ConnectionMetrics
  progress: ConnectionTestProgress | null
  onQuickTest: () => void
  onFullTest: () => void
  onCancel: () => void
  onClose: () => void
}) {
  const wsColor =
    metrics.websocket.status === "connected" ? "#16a34a" : "#ef4444"

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full z-50 mt-2 w-[min(calc(100vw-1.5rem),22rem)] rounded-2xl border border-[#d9e7dd] bg-white p-4 shadow-xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold text-[#1f2a1f]">
            {metrics.quality === "OFFLINE" ? (
              <WifiOff size={16} />
            ) : (
              <Wifi size={16} className="text-[#16a34a]" />
            )}
            Connexion
          </div>
          <button
            onClick={onClose}
            className="text-[#A0A0A0] hover:text-[#1f2a1f] text-sm"
            aria-label="Fermer le diagnostic de connexion"
          >
            Fermer
          </button>
        </div>

        <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: qualityColor(metrics.quality) }}
          />
          {qualityLabel(metrics.quality)}
        </p>

        <div className="mt-3">
          <ConnectionScore metrics={metrics} />
        </div>

        <p className="mt-3 text-sm text-[#64748b]">
          Type : {networkTypeLabel(metrics.networkType)}
        </p>
        {metrics.saveData && (
          <p className="mt-1 text-xs text-[#b45309]">
            Mode économie de données détecté. Le test complet peut consommer
            davantage de données.
          </p>
        )}

        <div className="mt-3 space-y-1 text-sm">
          <p>
            🌐 Internet{" "}
            <span className="font-semibold text-[#1f2a1f]">
              {metrics.quality === "OFFLINE" ? "Hors ligne" : "Joignable"}
            </span>
          </p>
          <p>
            🎮 Serveur Quizz Leka{" "}
            <span className="font-semibold text-[#1f2a1f]">
              {formatMetric(metrics.serverLatency, "ms")}
            </span>
          </p>
          <p>
            🔌 WebSocket{" "}
            <span className="font-semibold" style={{ color: wsColor }}>
              {websocketLabel(metrics.websocket.status)}
            </span>
          </p>
        </div>

        <div className="mt-3 border-t border-[#edf6ef] pt-3">
          <ConnectionDetails metrics={metrics} />
        </div>

        {progress?.running ? (
          <div className="mt-3 space-y-2">
            <ConnectionTestProgressView progress={progress} />
            <button
              onClick={onCancel}
              className="w-full rounded-xl border border-[#d9e7dd] px-3 py-2 text-sm font-semibold text-[#1f2a1f] hover:bg-[#f3faf4]"
            >
              Annuler
            </button>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={onQuickTest}
              className="rounded-xl bg-[#16a34a] px-3 py-2 text-sm font-semibold text-white hover:bg-[#15803d]"
            >
              Test rapide
            </button>
            <button
              onClick={onFullTest}
              className="rounded-xl border border-[#d9e7dd] px-3 py-2 text-sm font-semibold text-[#1f2a1f] hover:bg-[#f3faf4]"
            >
              Test complet
            </button>
          </div>
        )}
        {progress && !progress.running && progress.error && (
          <p className="mt-2 text-xs font-medium text-[#D62828]">
            {progress.error}
          </p>
        )}
      </div>
    </>
  )
}
