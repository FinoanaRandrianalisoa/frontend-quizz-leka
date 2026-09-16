import type { WebsocketStatus } from "./connectionQuality"

type Listener = () => void

const sockets = new Set<WebSocket>()
const listeners = new Set<Listener>()

let reconnectCount = 0
let reconnectTime: number | null = null
let installed = false

function notify() {
  listeners.forEach((listener) => listener())
}

export function getWebsocketSnapshot() {
  let hasOpen = false
  let hasConnecting = false
  sockets.forEach((socket) => {
    if (socket.readyState === WebSocket.OPEN) hasOpen = true
    if (socket.readyState === WebSocket.CONNECTING) hasConnecting = true
  })

  let status: WebsocketStatus = "disconnected"
  if (hasOpen) status = "connected"
  else if (hasConnecting) status = "connecting"
  else if (reconnectCount > 0 && sockets.size === 0) status = "reconnecting"

  return {
    status,
    reconnectCount,
    reconnectTime,
    socketCount: sockets.size,
  }
}

export function subscribeWebsocketTracker(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function installWebSocketTracker() {
  if (installed || typeof window === "undefined") return
  installed = true
  const Original = window.WebSocket

  class TrackedWebSocket extends Original {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols)
      sockets.add(this)
      this.addEventListener("open", () => notify())
      this.addEventListener("error", () => notify())
      this.addEventListener("close", () => {
        sockets.delete(this)
        reconnectCount += 1
        reconnectTime = Date.now()
        notify()
      })
      notify()
    }
  }

  window.WebSocket = TrackedWebSocket
}
