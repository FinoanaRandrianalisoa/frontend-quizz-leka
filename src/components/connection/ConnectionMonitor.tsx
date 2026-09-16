import { useCallback, useState } from "react"
import { useConnectionMonitor } from "../../hooks/useConnectionMonitor"
import { useConnectionTest } from "../../hooks/useConnectionTest"
import ConnectionAlert, { ConnectionStatusButton } from "./ConnectionStatus"
import ConnectionPopover from "./ConnectionPopover"

export default function ConnectionMonitor({
  currentPage,
}: {
  currentPage?: string
}) {
  const { metrics, alertMessage, mergeMetrics } =
    useConnectionMonitor(currentPage)
  const [open, setOpen] = useState(false)
  const { progress, run, cancel } = useConnectionTest(mergeMetrics)

  const close = useCallback(() => {
    cancel()
    setOpen(false)
  }, [cancel])

  return (
    <div className="relative">
      <ConnectionStatusButton
        metrics={metrics}
        open={open}
        onToggle={() => {
          if (open) close()
          else setOpen(true)
        }}
      />
      {open && (
        <ConnectionPopover
          metrics={metrics}
          progress={progress}
          onQuickTest={() => void run("quick")}
          onFullTest={() => void run("full")}
          onCancel={cancel}
          onClose={close}
        />
      )}
      <ConnectionAlert message={alertMessage} quality={metrics.quality} />
    </div>
  )
}
