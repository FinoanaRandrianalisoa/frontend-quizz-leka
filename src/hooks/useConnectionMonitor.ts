import { useCallback, useEffect, useRef, useState } from "react"
import {
  MONITOR_INTERVAL,
  QUALITY_HYSTERESIS,
  calculateConnectionScore,
  emptyMetrics,
  logConnectionMonitor,
  qualityFromScore,
  type ConnectionMetrics,
  type ConnectionQuality,
} from "../lib/connectionQuality"
import {
  getWebsocketSnapshot,
  subscribeWebsocketTracker,
} from "../lib/websocketTracker"
import {
  measureLiveDownloadMbps,
  runLightProbe,
} from "../services/connectionTestService"
import { useNetworkInformation } from "./useNetworkInformation"

const GAME_PAGES = new Set([
  "game",
  "rabbitRace",
  "squidGame",
  "rpsMatch",
  "penaltyKick",
  "penaltyMatch",
  "quizGlobal",
  "spectator",
])

const QUALITY_RANK: Record<ConnectionQuality, number> = {
  EXCELLENT: 5,
  GOOD: 4,
  FAIR: 3,
  POOR: 2,
  CONNECTING: 1,
  UNKNOWN: 1,
  OFFLINE: 0,
}

export function useConnectionMonitor(currentPage?: string) {
  const network = useNetworkInformation()
  const [metrics, setMetrics] = useState<ConnectionMetrics>(emptyMetrics)
  const [alertMessage, setAlertMessage] = useState<string | null>(null)
  const qualityRef = useRef<ConnectionQuality>("UNKNOWN")
  const pendingRef = useRef<{ quality: ConnectionQuality; count: number }>({
    quality: "UNKNOWN",
    count: 0,
  })
  const inFlight = useRef(false)
  const timerRef = useRef<number | null>(null)
  const liveTimerRef = useRef<number | null>(null)
  const liveSpeedRef = useRef<number | null>(null)

  const applyLiveSpeed = useCallback((next: number) => {
    const clamped = Math.min(1000, Math.max(0.1, next))
    const smoothed =
      liveSpeedRef.current == null
        ? clamped
        : liveSpeedRef.current * 0.5 + clamped * 0.5
    liveSpeedRef.current = smoothed
    return smoothed
  }, [])

  const applyQuality = useCallback(
    (next: ConnectionQuality, inGame: boolean) => {
      const current = qualityRef.current
      if (next === current) {
        pendingRef.current = { quality: next, count: 0 }
        return next
      }
      if (current === "UNKNOWN" || current === "CONNECTING") {
        qualityRef.current = next
        pendingRef.current = { quality: next, count: 0 }
        return next
      }
      if (pendingRef.current.quality !== next) {
        pendingRef.current = { quality: next, count: 1 }
        return current
      }
      pendingRef.current.count += 1
      if (pendingRef.current.count < QUALITY_HYSTERESIS) return current
      qualityRef.current = next
      pendingRef.current = { quality: next, count: 0 }
      if (
        inGame &&
        QUALITY_RANK[next] < QUALITY_RANK[current] &&
        (next === "FAIR" || next === "POOR" || next === "OFFLINE")
      ) {
        if (next === "FAIR") setAlertMessage("Connexion instable")
        else if (next === "POOR") setAlertMessage("Connexion faible")
        else setAlertMessage("Connexion perdue. Reconnexion…")
        window.setTimeout(() => setAlertMessage(null), 4000)
      }
      return next
    },
    [],
  )

  const mergeMetrics = useCallback((patch: Partial<ConnectionMetrics>) => {
    setMetrics((current) => ({ ...current, ...patch }))
  }, [])

  const measureLight = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    const ws = getWebsocketSnapshot()
    try {
      if (!network.online) {
        qualityRef.current = "OFFLINE"
        setMetrics((current) => ({
          ...current,
          quality: "OFFLINE",
          score: 0,
          networkType: network.type,
          effectiveType: network.effectiveType,
          saveData: network.saveData,
          websocket: ws,
          timestamp: Date.now(),
        }))
        return
      }

      const result = await runLightProbe({
        websocketStatus: ws.status,
        signal: new AbortController().signal,
      })
      const score = calculateConnectionScore({
        pingAverage: result.ping.average,
        jitter: result.jitter,
        packetLoss: result.packetLoss,
        serverLatency: result.serverLatency,
        websocketStatus: ws.status,
      })
      const rawQuality = qualityFromScore(score, true)
      const inGame = GAME_PAGES.has(currentPage ?? "")
      const quality = applyQuality(rawQuality, inGame)
      setMetrics((current) => {
        const next: ConnectionMetrics = {
          ...current,
          networkType: network.type,
          effectiveType: network.effectiveType,
          saveData: network.saveData,
          score,
          quality,
          ping: result.ping,
          jitter: result.jitter,
          packetLoss: result.packetLoss,
          serverLatency: result.serverLatency,
          websocket: ws,
          timestamp: Date.now(),
        }
        logConnectionMonitor(next)
        return next
      })
    } catch {
      const inGame = GAME_PAGES.has(currentPage ?? "")
      const quality = applyQuality(network.online ? "POOR" : "OFFLINE", inGame)
      setMetrics((current) => ({
        ...current,
        networkType: network.type,
        effectiveType: network.effectiveType,
        saveData: network.saveData,
        websocket: ws,
        quality,
        score: network.online ? 20 : 0,
        timestamp: Date.now(),
      }))
    } finally {
      inFlight.current = false
    }
  }, [
    applyQuality,
    currentPage,
    network.effectiveType,
    network.online,
    network.saveData,
    network.type,
  ])

  useEffect(() => {
    const unsub = subscribeWebsocketTracker(() => {
      const ws = getWebsocketSnapshot()
      setMetrics((current) => ({ ...current, websocket: ws }))
    })
    return () => {
      void unsub()
    }
  }, [])

  useEffect(() => {
    if (network.downlink != null && network.downlink > 0) {
      setMetrics((current) => ({
        ...current,
        networkType: network.type,
        effectiveType: network.effectiveType,
        saveData: network.saveData,
        downloadMbps: current.downloadMbps ?? network.downlink,
      }))
    }
  }, [
    network.downlink,
    network.effectiveType,
    network.saveData,
    network.type,
  ])

  useEffect(() => {
    let stopped = false
    const tick = async () => {
      await measureLight()
      if (stopped) return
      const degraded =
        qualityRef.current === "FAIR" ||
        qualityRef.current === "POOR" ||
        qualityRef.current === "OFFLINE"
      const delay = degraded
        ? MONITOR_INTERVAL.degradedMs
        : MONITOR_INTERVAL.stableMs
      timerRef.current = window.setTimeout(() => {
        void tick()
      }, delay)
    }
    void tick()
    return () => {
      stopped = true
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [measureLight])

  useEffect(() => {
    let stopped = false
    const controller = { current: new AbortController() }

    const tick = async () => {
      if (!network.online || network.saveData) {
        if (network.downlink != null && network.downlink > 0) {
          setMetrics((current) => ({
            ...current,
            downloadMbps: network.downlink,
          }))
        }
      } else {
        controller.current.abort()
        controller.current = new AbortController()
        const mbps = await measureLiveDownloadMbps(controller.current.signal)
        if (!stopped && mbps != null) {
          const smoothed = applyLiveSpeed(mbps)
          setMetrics((current) => ({
            ...current,
            downloadMbps: smoothed,
            timestamp: Date.now(),
          }))
        }
      }
      if (stopped) return
      const delay = network.saveData
        ? MONITOR_INTERVAL.liveSaveDataMs
        : MONITOR_INTERVAL.liveMs
      liveTimerRef.current = window.setTimeout(() => {
        void tick()
      }, delay)
    }

    void tick()
    return () => {
      stopped = true
      controller.current.abort()
      if (liveTimerRef.current) window.clearTimeout(liveTimerRef.current)
    }
  }, [applyLiveSpeed, network.downlink, network.online, network.saveData])

  return {
    metrics,
    alertMessage,
    dismissAlert: () => setAlertMessage(null),
    mergeMetrics,
  }
}
