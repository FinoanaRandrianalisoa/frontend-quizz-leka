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

function track(socket: WebSocket) {
  sockets.add(socket)
  socket.addEventListener("open", () => notify())
  socket.addEventListener("error", () => notify())
  socket.addEventListener("close", () => {
    sockets.delete(socket)
    reconnectCount += 1
    reconnectTime = Date.now()
    notify()
  })
  notify()
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

/**
 * Observe native sockets without subclassing WebSocket.
 * Extending WebSocket in Firefox aborts wss connections during page load (1006).
 */
export function installWebSocketTracker() {
  if (installed || typeof window === "undefined") return
  installed = true
  const Original = window.WebSocket

  const Wrapped = function WebSocket(
    url: string | URL,
    protocols?: string | string[],
  ) {
    const socket =
      protocols === undefined
        ? new Original(url)
        : new Original(url, protocols)
    track(socket)
    return socket
  } as unknown as typeof Original

  Wrapped.prototype = Original.prototype
  Object.defineProperties(Wrapped, {
    CONNECTING: { value: Original.CONNECTING },
    OPEN: { value: Original.OPEN },
    CLOSING: { value: Original.CLOSING },
    CLOSED: { value: Original.CLOSED },
  })

  window.WebSocket = Wrapped
}
