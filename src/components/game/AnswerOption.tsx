import { Check, X } from "lucide-react";

type AnswerState = "default" | "selected" | "correct" | "incorrect" | "disabled";

interface AnswerOptionProps {
  label: string;
  letter: "A" | "B" | "C" | "D";
  state?: AnswerState;
  onClick?: () => void;
}

const LETTERS: Record<string, { bg: string; text: string }> = {
  A: { bg: "#FF6B35", text: "white" },
  B: { bg: "#004E89", text: "white" },
  C: { bg: "#06A77D", text: "white" },
  D: { bg: "#9B59B6", text: "white" },
};

export default function AnswerOption({ label, letter, state = "default", onClick }: AnswerOptionProps) {
  const isInteractive = state === "default" || state === "selected";
  const lc = LETTERS[letter];

  return (
    <button
      onClick={isInteractive ? onClick : undefined}
      disabled={state === "disabled" || state === "correct" || state === "incorrect"}
      className={`
        w-full flex items-center gap-3 p-3.5 md:p-4 rounded-2xl border-2
        text-left transition-all duration-200 group relative overflow-hidden
        ${state === "default"   ? "bg-white border-[#E8E8E8] hover:border-[#FF6B35] hover:shadow-md hover:-translate-y-0.5 cursor-pointer" : ""}
        ${state === "selected"  ? "answer-selected cursor-pointer" : ""}
        ${state === "correct"   ? "answer-correct cursor-default" : ""}
        ${state === "incorrect" ? "answer-incorrect cursor-default" : ""}
        ${state === "disabled"  ? "bg-[#F9F9F9] border-[#E8E8E8] opacity-50 cursor-not-allowed" : ""}
      `}
    >
      {/* Letter badge */}
      <div className={`
        w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0
        transition-all duration-200
        ${state === "correct"   ? "bg-[#06A77D]" : ""}
        ${state === "incorrect" ? "bg-[#D62828]" : ""}
        ${state === "selected"  ? "bg-[#FF6B35]" : ""}
        ${state === "default"   ? "group-hover:scale-110" : ""}
        ${state === "disabled"  ? "bg-[#D9D9D9]" : ""}
      `}
        style={state === "default" || state === "disabled" ? { background: state === "disabled" ? "#D9D9D9" : lc.bg, color: lc.text } : { color: "white" }}
      >
        {state === "correct"   ? <Check size={14} strokeWidth={3} /> :
         state === "incorrect" ? <X     size={14} strokeWidth={3} /> :
         letter}
      </div>

      {/* Label */}
      <span className={`
        text-sm font-semibold flex-1 leading-snug
        ${state === "correct"   ? "text-[#06A77D]" : ""}
        ${state === "incorrect" ? "text-[#D62828]" : ""}
        ${state === "selected"  ? "text-[#FF6B35]" : ""}
        ${state === "default"   ? "text-[#2D3142] group-hover:text-[#FF6B35]" : ""}
        ${state === "disabled"  ? "text-[#A0A0A0]" : ""}
      `}>
        {label}
      </span>

      {/* Correct / incorrect icon on right */}
      {state === "correct" && (
        <div className="w-6 h-6 rounded-full bg-[#06A77D] flex items-center justify-center shrink-0">
          <Check size={12} className="text-white" strokeWidth={3} />
        </div>
      )}
      {state === "incorrect" && (
        <div className="w-6 h-6 rounded-full bg-[#D62828] flex items-center justify-center shrink-0">
          <X size={12} className="text-white" strokeWidth={3} />
        </div>
      )}
    </button>
  );
}
