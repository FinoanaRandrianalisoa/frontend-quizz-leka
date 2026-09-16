export type ConnectionQuality =
  | "OFFLINE"
  | "CONNECTING"
  | "EXCELLENT"
  | "GOOD"
  | "FAIR"
  | "POOR"
  | "UNKNOWN"

export type WebsocketStatus =
  | "connected"
  | "connecting"
  | "reconnecting"
  | "disconnected"
  | "degraded"

export const CONNECTION_THRESHOLDS = {
  ping: { excellent: 50, good: 100, fair: 200 },
  jitter: { excellent: 20, good: 40, fair: 80 },
  packetLoss: { excellent: 1, good: 2, fair: 5 },
  score: { excellent: 90, good: 75, fair: 50 },
} as const

export const CONNECTION_WEIGHTS = {
  ping: 0.3,
  jitter: 0.2,
  packetLoss: 0.2,
  serverLatency: 0.15,
  websocket: 0.15,
} as const

export const CONNECTION_TIMEOUTS = {
  ping: 3000,
  api: 5000,
  download: 10000,
  upload: 10000,
} as const

export const CONNECTION_TEST = {
  quickSamples: 8,
  fullSamples: 10,
  downloadBytes: 128 * 1024,
  uploadBytes: 64 * 1024,
  liveDownloadBytes: 48 * 1024,
} as const

export const QUALITY_HYSTERESIS = 2

export const MONITOR_INTERVAL = {
  stableMs: 10000,
  degradedMs: 5000,
  liveMs: 3500,
  liveSaveDataMs: 12000,
} as const

export interface PingStats {
  min: number | null
  max: number | null
  average: number | null
  median: number | null
}

export interface ConnectionMetrics {
  networkType: string | null
  effectiveType: string | null
  saveData: boolean
  score: number | null
  quality: ConnectionQuality
  ping: PingStats
  jitter: number | null
  packetLoss: number | null
  downloadMbps: number | null
  uploadMbps: number | null
  serverLatency: number | null
  apiLatency: number | null
  websocket: {
    status: WebsocketStatus
    reconnectCount: number
    reconnectTime: number | null
  }
  timestamp: number
}

export function emptyMetrics(): ConnectionMetrics {
  return {
    networkType: null,
    effectiveType: null,
    saveData: false,
    score: null,
    quality: "UNKNOWN",
    ping: { min: null, max: null, average: null, median: null },
    jitter: null,
    packetLoss: null,
    downloadMbps: null,
    uploadMbps: null,
    serverLatency: null,
    apiLatency: null,
    websocket: {
      status: "disconnected",
      reconnectCount: 0,
      reconnectTime: null,
    },
    timestamp: Date.now(),
  }
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function scoreLowerIsBetter(
  value: number,
  excellent: number,
  good: number,
  fair: number,
) {
  if (value <= excellent) return 100
  if (value <= good) {
    return 90 - ((value - excellent) / Math.max(1, good - excellent)) * 15
  }
  if (value <= fair) {
    return 74 - ((value - good) / Math.max(1, fair - good)) * 24
  }
  const extra = Math.min(1, (value - fair) / Math.max(fair, 1))
  return clamp(49 - extra * 49)
}

export function websocketScore(status: WebsocketStatus) {
  switch (status) {
    case "connected":
      return 100
    case "degraded":
      return 55
    case "connecting":
      return 45
    case "reconnecting":
      return 30
    default:
      return 0
  }
}

export function qualityFromScore(
  score: number | null,
  online: boolean,
): ConnectionQuality {
  if (!online) return "OFFLINE"
  if (score == null) return "UNKNOWN"
  const { excellent, good, fair } = CONNECTION_THRESHOLDS.score
  if (score >= excellent) return "EXCELLENT"
  if (score >= good) return "GOOD"
  if (score >= fair) return "FAIR"
  return "POOR"
}

export function qualityLabel(quality: ConnectionQuality) {
  switch (quality) {
    case "EXCELLENT":
      return "Excellente connexion"
    case "GOOD":
      return "Bonne connexion"
    case "FAIR":
      return "Connexion moyenne"
    case "POOR":
      return "Connexion faible"
    case "OFFLINE":
      return "Hors ligne"
    case "CONNECTING":
      return "Connexion en cours"
    default:
      return "Qualité inconnue"
  }
}

export function qualityColor(quality: ConnectionQuality) {
  switch (quality) {
    case "EXCELLENT":
    case "GOOD":
      return "#16a34a"
    case "FAIR":
      return "#f59e0b"
    case "POOR":
      return "#ef4444"
    case "OFFLINE":
      return "#111827"
    default:
      return "#94a3b8"
  }
}

export function calculatePingStats(samples: number[]): PingStats {
  if (samples.length === 0) {
    return { min: null, max: null, average: null, median: null }
  }
  const sorted = [...samples].sort((a, b) => a - b)
  const sum = samples.reduce((acc, value) => acc + value, 0)
  const mid = Math.floor(sorted.length / 2)
  const median =
    sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid]
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    average: sum / samples.length,
    median,
  }
}

export function calculateJitter(samples: number[]): number | null {
  if (samples.length < 2) return null
  let total = 0
  for (let i = 1; i < samples.length; i += 1) {
    total += Math.abs(samples[i] - samples[i - 1])
  }
  return total / (samples.length - 1)
}

export function calculateConnectionScore(input: {
  pingAverage: number | null
  jitter: number | null
  packetLoss: number | null
  serverLatency: number | null
  websocketStatus: WebsocketStatus
}): number {
  const parts: Array<{ weight: number; score: number }> = []
  if (input.pingAverage != null) {
    parts.push({
      weight: CONNECTION_WEIGHTS.ping,
      score: scoreLowerIsBetter(
        input.pingAverage,
        CONNECTION_THRESHOLDS.ping.excellent,
        CONNECTION_THRESHOLDS.ping.good,
        CONNECTION_THRESHOLDS.ping.fair,
      ),
    })
  }
  if (input.jitter != null) {
    parts.push({
      weight: CONNECTION_WEIGHTS.jitter,
      score: scoreLowerIsBetter(
        input.jitter,
        CONNECTION_THRESHOLDS.jitter.excellent,
        CONNECTION_THRESHOLDS.jitter.good,
        CONNECTION_THRESHOLDS.jitter.fair,
      ),
    })
  }
  if (input.packetLoss != null) {
    parts.push({
      weight: CONNECTION_WEIGHTS.packetLoss,
      score: scoreLowerIsBetter(
        input.packetLoss,
        CONNECTION_THRESHOLDS.packetLoss.excellent,
        CONNECTION_THRESHOLDS.packetLoss.good,
        CONNECTION_THRESHOLDS.packetLoss.fair,
      ),
    })
  }
  if (input.serverLatency != null) {
    parts.push({
      weight: CONNECTION_WEIGHTS.serverLatency,
      score: scoreLowerIsBetter(
        input.serverLatency,
        CONNECTION_THRESHOLDS.ping.excellent,
        CONNECTION_THRESHOLDS.ping.good,
        CONNECTION_THRESHOLDS.ping.fair,
      ),
    })
  }
  parts.push({
    weight: CONNECTION_WEIGHTS.websocket,
    score: websocketScore(input.websocketStatus),
  })

  const totalWeight = parts.reduce((acc, part) => acc + part.weight, 0)
  const weighted =
    parts.reduce((acc, part) => acc + part.score * part.weight, 0) /
    Math.max(totalWeight, 0.0001)
  return Math.round(clamp(weighted))
}

export function networkTypeLabel(type: string | null) {
  switch (type) {
    case "wifi":
      return "Wi-Fi"
    case "cellular":
      return "Données mobiles"
    case "ethernet":
      return "Ethernet"
    case "bluetooth":
      return "Bluetooth"
    case "none":
      return "Aucune"
    case "unknown":
      return "Inconnue"
    default:
      return "Information non disponible"
  }
}

export function formatMetric(
  value: number | null | undefined,
  unit: string,
  digits = 0,
) {
  if (value == null || Number.isNaN(value)) return "—"
  const rounded =
    digits === 0 ? Math.round(value) : Number(value.toFixed(digits))
  return `${rounded} ${unit}`
}

export function formatMbpsLive(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—"
  if (value < 0.1) return "<0.1"
  if (value < 10) return value.toFixed(1)
  return `${Math.round(value)}`
}

export function logConnectionMonitor(metrics: ConnectionMetrics) {
  if (!import.meta.env.DEV) return
  console.info(
    "[ConnectionMonitor]",
    `ping=${metrics.ping.average ?? "—"}ms`,
    `jitter=${metrics.jitter ?? "—"}ms`,
    `loss=${metrics.packetLoss ?? "—"}%`,
    `server=${metrics.serverLatency ?? "—"}ms`,
    `websocket=${metrics.websocket.status}`,
    `score=${metrics.score ?? "—"}`,
  )
}

if (import.meta.env.DEV) {
  const excellent = calculateConnectionScore({
    pingAverage: 30,
    jitter: 8,
    packetLoss: 0,
    serverLatency: 40,
    websocketStatus: "connected",
  })
  const poorPingHighDownload = calculateConnectionScore({
    pingAverage: 350,
    jitter: 100,
    packetLoss: 5,
    serverLatency: 320,
    websocketStatus: "connected",
  })
  if (excellent < 90) {
    console.warn("[ConnectionMonitor] score excellent inattendu", excellent)
  }
  if (poorPingHighDownload >= 75) {
    console.warn(
      "[ConnectionMonitor] ping élevé ne doit pas donner un bon score",
      poorPingHighDownload,
    )
  }
}
