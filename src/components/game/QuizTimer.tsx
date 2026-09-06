import { useEffect, useRef, useState } from "react";

interface QuizTimerProps {
  duration: number;
  onExpire?: () => void;
  variant?: "circular" | "linear";
  running?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function QuizTimer({ duration, onExpire, variant = "circular", running = true, size = "md" }: QuizTimerProps) {
  const [remaining, setRemaining] = useState(duration);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiredRef = useRef(false);

  useEffect(() => {
    setRemaining(duration);
    expiredRef.current = false;
  }, [duration]);

  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current!); return; }
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current!);
          if (!expiredRef.current) { expiredRef.current = true; onExpire?.(); }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [running, duration]);

  const pct   = remaining / duration;
  const color = pct > 0.5 ? "#FF6B35" : pct > 0.25 ? "#F59E0B" : "#D62828";
  const urgent = pct <= 0.3 && remaining > 0;

  if (variant === "linear") {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-[#A0A0A0]">Temps restant</span>
          <span className={`text-sm font-black tabular-nums ${urgent ? "text-[#D62828] animate-[countdownBlink_0.8s_ease-in-out_infinite]" : "text-[#FF6B35]"}`}>
            {remaining}s
          </span>
        </div>
        <div className="w-full h-2.5 bg-[#F0F0F0] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${pct * 100}%`, background: color }}
          />
        </div>
      </div>
    );
  }

  // Circular variant
  const sizes = { sm: 72, md: 96, lg: 120 };
  const px = sizes[size];
  const cx = px / 2;
  const radius = (px - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = pct * circumference;

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: px, height: px }}
    >
      {/* Background glow when urgent */}
      {urgent && (
        <div className="absolute inset-0 rounded-full"
          style={{ background: `radial-gradient(circle, ${color}15 0%, transparent 70%)` }} />
      )}

      <svg width={px} height={px} className="absolute inset-0 -rotate-90">
        {/* Track */}
        <circle cx={cx} cy={cx} r={radius} fill="none" stroke="#F0F0F0" strokeWidth={6} />
        {/* Progress */}
        <circle
          cx={cx} cy={cx} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${Math.max(0, dash)} ${circumference}`}
          style={{ transition: "stroke-dasharray 1s linear, stroke 0.5s ease" }}
        />
      </svg>

      {/* Center number */}
      <div className={`z-10 flex flex-col items-center ${urgent ? "animate-[timerPulse_0.6s_ease-in-out_infinite]" : ""}`}>
        <span
          className="font-black tabular-nums leading-none"
          style={{
            color,
            fontSize: size === "lg" ? 36 : size === "md" ? 28 : 20,
          }}
        >
          {remaining}
        </span>
        {size !== "sm" && (
          <span className="text-[10px] text-[#A0A0A0] font-medium mt-0.5">sec</span>
        )}
      </div>
    </div>
  );
}
