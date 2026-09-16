import { useEffect, useState } from "react"

interface NetworkInformationLike {
  type?: string
  effectiveType?: string
  downlink?: number
  rtt?: number
  saveData?: boolean
  addEventListener?: (type: string, listener: () => void) => void
  removeEventListener?: (type: string, listener: () => void) => void
}

function readConnection() {
  const nav = navigator as Navigator & {
    connection?: NetworkInformationLike
    mozConnection?: NetworkInformationLike
    webkitConnection?: NetworkInformationLike
  }
  return nav.connection || nav.mozConnection || nav.webkitConnection || null
}

export function useNetworkInformation() {
  const [state, setState] = useState(() => {
    const connection = typeof navigator === "undefined" ? null : readConnection()
    return {
      online: typeof navigator === "undefined" ? true : navigator.onLine,
      type: connection?.type ?? null,
      effectiveType: connection?.effectiveType ?? null,
      downlink: connection?.downlink ?? null,
      rtt: connection?.rtt ?? null,
      saveData: Boolean(connection?.saveData),
    }
  })

  useEffect(() => {
    const connection = readConnection()
    const update = () => {
      const next = readConnection()
      setState({
        online: navigator.onLine,
        type: next?.type ?? null,
        effectiveType: next?.effectiveType ?? null,
        downlink: next?.downlink ?? null,
        rtt: next?.rtt ?? null,
        saveData: Boolean(next?.saveData),
      })
    }
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    connection?.addEventListener?.("change", update)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
      connection?.removeEventListener?.("change", update)
    }
  }, [])

  return state
}
