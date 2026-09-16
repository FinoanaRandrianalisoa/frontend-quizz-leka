import type {
  ConnectionTestProgress,
  TestStepId,
} from "../../services/connectionTestService"

const LABELS: Record<TestStepId, string> = {
  network: "Vérification réseau",
  ping: "Ping serveur",
  jitter: "Jitter",
  loss: "Perte de paquets",
  api: "API Quizz Leka",
  websocket: "WebSocket",
  download: "Download",
  upload: "Upload",
}

function mark(state: ConnectionTestProgress["steps"][TestStepId]) {
  if (state === "done") return "✓"
  if (state === "running") return "⏳"
  if (state === "skipped") return "—"
  return "○"
}

export default function ConnectionTestProgressView({
  progress,
}: {
  progress: ConnectionTestProgress
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-[#1f2a1f]">
        {progress.mode === "full" ? "Test complet" : "Test de connexion"}
      </p>
      {progress.mode === "full" && (
        <div className="h-2 overflow-hidden rounded-full bg-[#edf6ef]">
          <div
            className="h-full rounded-full bg-[#16a34a] transition-all"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      )}
      <ul className="space-y-1 text-xs text-[#64748b]">
        {(Object.keys(LABELS) as TestStepId[]).map((id) => {
          const state = progress.steps[id]
          if (state === "skipped") return null
          return (
            <li key={id} className="flex items-center gap-2">
              <span className="w-4">{mark(state)}</span>
              {LABELS[id]}
            </li>
          )
        })}
      </ul>
      {progress.error && (
        <p className="text-xs font-medium text-[#D62828]">{progress.error}</p>
      )}
    </div>
  )
}
