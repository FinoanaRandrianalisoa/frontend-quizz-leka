import { useRef, useState, useEffect } from "react"

interface VirtualJoystickProps {
  onMove: (x: number, y: number) => void
  onRelease: () => void
  size?: number
}

export default function VirtualJoystick({
  onMove,
  onRelease,
  size = 120,
}: VirtualJoystickProps) {
  const joystickRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const handleStart = (
    e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>,
  ) => {
    e.preventDefault()
    setIsDragging(true)
    updatePosition(e)
  }

  const handleMove = (e: TouchEvent | MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    updatePositionNative(e)
  }

  const handleEnd = () => {
    setIsDragging(false)
    setPosition({ x: 0, y: 0 })
    onRelease()
  }

  const updatePosition = (
    e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>,
  ) => {
    if (!joystickRef.current) return

    const rect = joystickRef.current.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    let clientX: number, clientY: number

    if ("touches" in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const deltaX = clientX - rect.left - centerX
    const deltaY = clientY - rect.top - centerY

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const maxDistance = size / 2

    let normalizedX = deltaX
    let normalizedY = deltaY

    if (distance > maxDistance) {
      const angle = Math.atan2(deltaY, deltaX)
      normalizedX = Math.cos(angle) * maxDistance
      normalizedY = Math.sin(angle) * maxDistance
    }

    const normalizedValueX = normalizedX / maxDistance
    const normalizedValueY = normalizedY / maxDistance

    setPosition({ x: normalizedX, y: normalizedY })
    onMove(normalizedValueX, normalizedValueY)
  }

  const updatePositionNative = (e: TouchEvent | MouseEvent) => {
    if (!joystickRef.current) return

    const rect = joystickRef.current.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    let clientX: number, clientY: number

    if ("touches" in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const deltaX = clientX - rect.left - centerX
    const deltaY = clientY - rect.top - centerY

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const maxDistance = size / 2

    let normalizedX = deltaX
    let normalizedY = deltaY

    if (distance > maxDistance) {
      const angle = Math.atan2(deltaY, deltaX)
      normalizedX = Math.cos(angle) * maxDistance
      normalizedY = Math.sin(angle) * maxDistance
    }

    const normalizedValueX = normalizedX / maxDistance
    const normalizedValueY = normalizedY / maxDistance

    setPosition({ x: normalizedX, y: normalizedY })
    onMove(normalizedValueX, normalizedValueY)
  }

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => handleMove(e)
    const handleTouchEnd = () => handleEnd()
    const handleMouseMove = (e: MouseEvent) => handleMove(e)
    const handleMouseUp = () => handleEnd()

    if (isDragging) {
      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      })
      document.addEventListener("touchend", handleTouchEnd)
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging])

  return (
    <div
      ref={joystickRef}
      className="relative rounded-full bg-white/10 border-2 border-white/20 backdrop-blur-sm"
      style={{ width: size, height: size }}
      onTouchStart={handleStart}
      onMouseDown={handleStart}
    >
      <div
        ref={knobRef}
        className="absolute rounded-full bg-gradient-to-br from-emerald-400 to-lime-400 shadow-lg"
        style={{
          width: size / 2,
          height: size / 2,
          left: `calc(50% + ${position.x}px - ${size / 4}px)`,
          top: `calc(50% + ${position.y}px - ${size / 4}px)`,
          transition: isDragging ? "none" : "all 0.2s ease-out",
        }}
      />
    </div>
  )
}
