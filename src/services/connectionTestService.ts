import { BACKEND_URL, GRAPHQL_URL } from "@/config/backend"
import {
  CONNECTION_TEST,
  CONNECTION_TIMEOUTS,
  calculateJitter,
  calculatePingStats,
  type WebsocketStatus,
} from "../lib/connectionQuality"

export type TestStepId =
  | "network"
  | "ping"
  | "jitter"
  | "loss"
  | "api"
  | "websocket"
  | "download"
  | "upload"

export type TestStepState = "pending" | "running" | "done" | "skipped"

export interface ConnectionTestProgress {
  steps: Record<TestStepId, TestStepState>
  percent: number
  running: boolean
  mode: "quick" | "full" | null
  error: string | null
}

export interface ConnectionTestResult {
  pingSamples: number[]
  ping: ReturnType<typeof calculatePingStats>
  jitter: number | null
  packetLoss: number | null
  serverLatency: number | null
  apiLatency: number | null
  downloadMbps: number | null
  uploadMbps: number | null
  websocketStatus: WebsocketStatus
}

const PING_URL = `${BACKEND_URL}/api/connection-test/ping/`
const DOWNLOAD_URL = `${BACKEND_URL}/api/connection-test/download/`
const UPLOAD_URL = `${BACKEND_URL}/api/connection-test/upload/`

function testId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function timeoutSignal(ms: number, external?: AbortSignal) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), ms)
  const onAbort = () => controller.abort()
  external?.addEventListener("abort", onAbort)
  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timer)
      external?.removeEventListener("abort", onAbort)
    },
  }
}

async function timedRequest(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  external?: AbortSignal,
) {
  const { signal, cleanup } = timeoutSignal(timeoutMs, external)
  const start = performance.now()
  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal,
    })
    const end = performance.now()
    return { ok: response.ok, latency: end - start, response }
  } finally {
    cleanup()
  }
}

export function createProgress(mode: "quick" | "full"): ConnectionTestProgress {
  const skipDownload = mode === "quick"
  return {
    mode,
    running: true,
    percent: 0,
    error: null,
    steps: {
      network: "pending",
      ping: "pending",
      jitter: "pending",
      loss: "pending",
      api: "pending",
      websocket: "pending",
      download: skipDownload ? "skipped" : "pending",
      upload: skipDownload ? "skipped" : "pending",
    },
  }
}

function progressPercent(steps: ConnectionTestProgress["steps"]) {
  const values = Object.values(steps).filter((state) => state !== "skipped")
  if (values.length === 0) return 0
  const done = values.filter((state) => state === "done").length
  return Math.round((done / values.length) * 100)
}

export async function runLightProbe(options: {
  websocketStatus: WebsocketStatus
  signal: AbortSignal
}): Promise<Pick<
  ConnectionTestResult,
  "ping" | "jitter" | "packetLoss" | "serverLatency" | "websocketStatus"
>> {
  const pingSamples: number[] = []
  let failures = 0
  const samplesWanted = 3
  for (let i = 0; i < samplesWanted; i += 1) {
    if (options.signal.aborted) throw new DOMException("Aborted", "AbortError")
    try {
      const result = await timedRequest(
        `${PING_URL}?testId=${testId()}`,
        { method: "GET" },
        CONNECTION_TIMEOUTS.ping,
        options.signal,
      )
      if (result.ok) pingSamples.push(result.latency)
      else failures += 1
    } catch {
      failures += 1
    }
  }
  return {
    ping: calculatePingStats(pingSamples),
    jitter: calculateJitter(pingSamples),
    packetLoss: (failures / samplesWanted) * 100,
    serverLatency: calculatePingStats(pingSamples).average,
    websocketStatus: options.websocketStatus,
  }
}

export async function measureLiveDownloadMbps(signal?: AbortSignal) {
  const bytes = CONNECTION_TEST.liveDownloadBytes
  const { signal: timeout, cleanup } = timeoutSignal(
    CONNECTION_TIMEOUTS.download,
    signal,
  )
  const start = performance.now()
  try {
    const response = await fetch(
      `${DOWNLOAD_URL}?size=${bytes}&testId=${testId()}`,
      { cache: "no-store", signal: timeout },
    )
    const buffer = await response.arrayBuffer()
    const seconds = Math.max((performance.now() - start) / 1000, 0.001)
    if (!response.ok || buffer.byteLength === 0) return null
    return (buffer.byteLength * 8) / seconds / 1_000_000
  } catch {
    return null
  } finally {
    cleanup()
  }
}

export async function runConnectionTest(options: {
  mode: "quick" | "full"
  websocketStatus: WebsocketStatus
  signal: AbortSignal
  onProgress: (progress: ConnectionTestProgress) => void
}): Promise<ConnectionTestResult> {
  const progress = createProgress(options.mode)
  const setStep = (id: TestStepId, state: TestStepState) => {
    progress.steps[id] = state
    progress.percent = progressPercent(progress.steps)
    options.onProgress({ ...progress, steps: { ...progress.steps } })
  }

  setStep("network", "running")
  const online = typeof navigator === "undefined" ? true : navigator.onLine
  if (!online) {
    progress.running = false
    progress.error = "Impossible de joindre le serveur Quizz Leka."
    options.onProgress({ ...progress })
    throw new Error(progress.error)
  }
  setStep("network", "done")

  const samplesWanted =
    options.mode === "full"
      ? CONNECTION_TEST.fullSamples
      : CONNECTION_TEST.quickSamples
  const pingSamples: number[] = []
  let failures = 0

  setStep("ping", "running")
  for (let i = 0; i < samplesWanted; i += 1) {
    if (options.signal.aborted) throw new DOMException("Aborted", "AbortError")
    try {
      const result = await timedRequest(
        `${PING_URL}?testId=${testId()}`,
        { method: "GET" },
        CONNECTION_TIMEOUTS.ping,
        options.signal,
      )
      if (result.ok) pingSamples.push(result.latency)
      else failures += 1
    } catch {
      failures += 1
    }
  }
  setStep("ping", "done")
  setStep("jitter", "done")
  setStep("loss", "done")

  const ping = calculatePingStats(pingSamples)
  const jitter = calculateJitter(pingSamples)
  const packetLoss = (failures / samplesWanted) * 100
  const serverLatency = ping.average

  setStep("api", "running")
  let apiLatency: number | null = null
  try {
    const result = await timedRequest(
      GRAPHQL_URL,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "{ __typename }" }),
      },
      CONNECTION_TIMEOUTS.api,
      options.signal,
    )
    if (result.ok) apiLatency = result.latency
  } catch {
    apiLatency = null
  }
  setStep("api", "done")
  setStep("websocket", "done")

  let downloadMbps: number | null = null
  let uploadMbps: number | null = null

  if (options.mode === "full") {
    setStep("download", "running")
    try {
      const start = performance.now()
      const { signal, cleanup } = timeoutSignal(
        CONNECTION_TIMEOUTS.download,
        options.signal,
      )
      const response = await fetch(
        `${DOWNLOAD_URL}?size=${CONNECTION_TEST.downloadBytes}&testId=${testId()}`,
        { cache: "no-store", signal },
      )
      const buffer = await response.arrayBuffer()
      const seconds = Math.max((performance.now() - start) / 1000, 0.001)
      cleanup()
      if (response.ok) {
        downloadMbps = (buffer.byteLength * 8) / seconds / 1_000_000
      }
    } catch {
      downloadMbps = null
    }
    setStep("download", "done")

    setStep("upload", "running")
    try {
      const payload = new Uint8Array(CONNECTION_TEST.uploadBytes)
      const start = performance.now()
      const result = await timedRequest(
        `${UPLOAD_URL}?testId=${testId()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: payload,
        },
        CONNECTION_TIMEOUTS.upload,
        options.signal,
      )
      const seconds = Math.max(result.latency / 1000, 0.001)
      if (result.ok) {
        uploadMbps = (payload.byteLength * 8) / seconds / 1_000_000
      }
    } catch {
      uploadMbps = null
    }
    setStep("upload", "done")
  }

  progress.running = false
  progress.percent = 100
  options.onProgress({ ...progress, steps: { ...progress.steps } })

  if (pingSamples.length === 0) {
    throw new Error("Impossible de joindre le serveur Quizz Leka.")
  }

  return {
    pingSamples,
    ping,
    jitter,
    packetLoss,
    serverLatency,
    apiLatency,
    downloadMbps,
    uploadMbps,
    websocketStatus: options.websocketStatus,
  }
}
