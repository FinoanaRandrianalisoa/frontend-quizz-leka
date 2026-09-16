import { useCallback, useRef, useState } from "react"
import {
  calculateConnectionScore,
  qualityFromScore,
  type ConnectionMetrics,
} from "../lib/connectionQuality"
import { getWebsocketSnapshot } from "../lib/websocketTracker"
import {
  createProgress,
  runConnectionTest,
  type ConnectionTestProgress,
} from "../services/connectionTestService"

export function useConnectionTest(
  mergeMetrics: (patch: Partial<ConnectionMetrics>) => void,
) {
  const [progress, setProgress] = useState<ConnectionTestProgress | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setProgress(null)
  }, [])

  const run = useCallback(
    async (mode: "quick" | "full") => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setProgress(createProgress(mode))
      const ws = getWebsocketSnapshot()
      try {
        const result = await runConnectionTest({
          mode,
          websocketStatus: ws.status,
          signal: controller.signal,
          onProgress: setProgress,
        })
        const score = calculateConnectionScore({
          pingAverage: result.ping.average,
          jitter: result.jitter,
          packetLoss: result.packetLoss,
          serverLatency: result.serverLatency,
          websocketStatus: ws.status,
        })
        mergeMetrics({
          score,
          quality: qualityFromScore(score, navigator.onLine),
          ping: result.ping,
          jitter: result.jitter,
          packetLoss: result.packetLoss,
          ...(mode === "full"
            ? {
                downloadMbps: result.downloadMbps,
                uploadMbps: result.uploadMbps,
              }
            : {}),
          serverLatency: result.serverLatency,
          apiLatency: result.apiLatency,
          websocket: ws,
          timestamp: Date.now(),
        })
      } catch (error) {
        if ((error as Error).name === "AbortError") return
        setProgress((current) =>
          current
            ? {
                ...current,
                running: false,
                error:
                  "Impossible de joindre le serveur Quizz Leka.",
              }
            : current,
        )
      }
    },
    [mergeMetrics],
  )

  return { progress, run, cancel }
}
