import { useEffect, useState } from "react";

interface ScoreFeedbackProps {
  points: number;
  show: boolean;
  correct: boolean;
}

export default function ScoreFeedback({ points, show, correct }: ScoreFeedbackProps) {
  const [visible, setVisible] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (show) {
      setKey(k => k + 1);
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 2200);
      return () => clearTimeout(t);
    }
  }, [show]);

  if (!visible) return null;

  return (
    <div key={key} className="pointer-events-none fixed inset-0 flex items-center justify-center z-[90]">
      <div
        className="animate-score-pop font-black select-none drop-shadow-2xl text-center"
        style={{
          fontSize: 42,
          color: correct ? "#06A77D" : "#D62828",
          textShadow: `0 0 30px ${correct ? "#06A77D60" : "#D6282860"}`,
        }}
      >
        {correct ? `+${points} POINT${points > 1 ? "S" : ""}` : "RATÉ !"}
      </div>
    </div>
  );
}
