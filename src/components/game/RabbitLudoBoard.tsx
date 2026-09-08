import React from "react";

export const FINISH_POS = 24;
const GRID = 9;

/** 24 cages around a Ludo-style square, last cage is the finish. */
export const PATH_CELLS: Array<{ r: number; c: number }> = [
  { r: 7, c: 1 }, { r: 7, c: 2 }, { r: 7, c: 3 }, { r: 7, c: 4 }, { r: 7, c: 5 }, { r: 7, c: 6 }, { r: 7, c: 7 },
  { r: 6, c: 7 }, { r: 5, c: 7 }, { r: 4, c: 7 }, { r: 3, c: 7 }, { r: 2, c: 7 },
  { r: 1, c: 7 }, { r: 1, c: 6 }, { r: 1, c: 5 }, { r: 1, c: 4 }, { r: 1, c: 3 }, { r: 1, c: 2 }, { r: 1, c: 1 },
  { r: 2, c: 1 }, { r: 3, c: 1 }, { r: 4, c: 1 }, { r: 5, c: 1 },
  { r: 4, c: 4 },
];

const HOMES: Array<{ r: number; c: number }> = [
  { r: 8, c: 0 },
  { r: 0, c: 8 },
];

export type LudoPlayer = {
  id: number;
  name: string;
  color: string;
  pos: number;
  isHost?: boolean;
  photo?: string | null;
};

function cellFor(player: LudoPlayer, index: number) {
  if (player.pos <= 0) return HOMES[index] ?? HOMES[0];
  const pathIndex = Math.min(FINISH_POS, player.pos) - 1;
  return PATH_CELLS[pathIndex] ?? PATH_CELLS[0];
}

function DiceFace({ n }: { n: number }) {
  const pips: Record<number, string[]> = {
    1: ["center"],
    2: ["tl", "br"],
    3: ["tl", "center", "br"],
    4: ["tl", "tr", "bl", "br"],
    5: ["tl", "tr", "center", "bl", "br"],
    6: ["tl", "tr", "ml", "mr", "bl", "br"],
  };
  const slots = pips[n] ?? pips[1];
  const pos: Record<string, string> = {
    tl: "top-1.5 left-1.5",
    tr: "top-1.5 right-1.5",
    ml: "top-1/2 left-1.5 -translate-y-1/2",
    mr: "top-1/2 right-1.5 -translate-y-1/2",
    bl: "bottom-1.5 left-1.5",
    br: "bottom-1.5 right-1.5",
    center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  };
  return (
    <div className="relative h-full w-full rounded-[14px] bg-gradient-to-br from-white to-slate-100">
      {slots.map((slot) => (
        <span key={slot} className={`absolute h-2.5 w-2.5 rounded-full bg-slate-800 ${pos[slot]}`} />
      ))}
    </div>
  );
}

export function Dice3D({ value, rolling }: { value: number | null; rolling: boolean }) {
  const shown = value && value >= 1 && value <= 6 ? value : 1;
  return (
    <div className="flex h-20 w-20 items-center justify-center" style={{ perspective: "600px" }}>
      <div className={`dice-cube h-16 w-16 ${rolling ? "rolling" : ""}`}>
        <div className="h-16 w-16 rounded-[16px] border border-white/80 shadow-[0_14px_0_rgba(0,0,0,0.18),0_22px_24px_rgba(0,0,0,0.22)]">
          {!rolling && value ? <DiceFace n={shown} /> : (
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-white text-2xl font-black text-slate-400">
              {rolling ? "🎲" : "—"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RabbitLudoBoard({
  players,
  hoppingId,
  currentPlayerId,
}: {
  players: LudoPlayer[];
  hoppingId: number | null;
  currentPlayerId?: number | null;
}) {
  const unit = 100 / GRID;
  const pathIndexByKey = new Map(PATH_CELLS.map((cell, i) => [`${cell.r}-${cell.c}`, i + 1]));

  return (
    <div className="ludo-scene mx-auto w-full max-w-[560px]">
      <div className="ludo-board relative aspect-square w-full">
        <div className="absolute inset-x-3 -bottom-4 h-6 rounded-[40px] bg-black/35 blur-md" />
        <div className="ludo-board-face absolute inset-0 overflow-hidden rounded-[28px] border-[10px] border-[#7a3f16] bg-[#1f6b3a] shadow-[0_30px_0_#5b2c0c,0_48px_40px_rgba(0,0,0,0.35)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.16),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent)]" />

          <div
            className="absolute inset-[6%] grid"
            style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)`, gridTemplateRows: `repeat(${GRID}, 1fr)` }}
          >
            {Array.from({ length: GRID * GRID }, (_, i) => {
              const r = Math.floor(i / GRID);
              const c = i % GRID;
              const cage = pathIndexByKey.get(`${r}-${c}`);
              const isCenter = r >= 3 && r <= 5 && c >= 3 && c <= 5;
              const isRedYard = r >= 7 && c <= 1;
              const isBlueYard = r <= 1 && c >= 7;
              const occupied = players.some((p) => {
                const cell = cellFor(p, players.findIndex((x) => x.id === p.id));
                return cell.r === r && cell.c === c;
              });
              const trail = players.find((p) => cage != null && p.pos >= cage);
              return (
                <div
                  key={i}
                  className={[
                    "relative m-[2px] rounded-[7px]",
                    cage ? "bg-gradient-to-br from-[#fff7d6] to-[#f1d48a]" : "bg-transparent",
                    isCenter ? "bg-gradient-to-br from-[#fde68a] to-[#f59e0b]" : "",
                    isRedYard && !cage ? "bg-gradient-to-br from-red-400 to-red-600" : "",
                    isBlueYard && !cage ? "bg-gradient-to-br from-sky-400 to-blue-600" : "",
                    cage === FINISH_POS ? "ring-2 ring-amber-200" : "",
                    occupied && cage ? "ludo-cell-active" : "",
                  ].join(" ")}
                  style={trail && cage ? { boxShadow: `inset 0 0 0 2px ${trail.color}` } : undefined}
                >
                  {cage ? (
                    <span className="absolute left-0.5 top-0.5 text-[8px] font-black text-[#7a4e12]/80">{cage}</span>
                  ) : null}
                  {isCenter && r === 4 && c === 4 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-lg drop-shadow">🏁</div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {players.map((player, index) => {
            const cell = cellFor(player, index);
            const offset = players.filter((p) => p.pos === player.pos).findIndex((p) => p.id === player.id);
            return (
              <div
                key={player.id}
                className={`ludo-token absolute z-20 flex items-end justify-center ${hoppingId === player.id ? "ludo-token-hop" : ""}`}
                style={{
                  left: `calc(6% + ${(cell.c + 0.12 + offset * 0.08) * (88 / GRID)}%)`,
                  top: `calc(6% + ${(cell.r - 0.15) * (88 / GRID)}%)`,
                  width: `${unit * 0.78}%`,
                  height: `${unit * 1.05}%`,
                  zIndex: hoppingId === player.id ? 30 : 20 + index,
                }}
                title={`${player.name} — case ${player.pos}`}
              >
                <div className="relative flex h-[78%] w-[70%] flex-col items-center">
                  {currentPlayerId === player.id && (
                    <span className="absolute -top-3 text-[10px] text-amber-200">▼</span>
                  )}
                  <div
                    className="ludo-token-head flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-lg ring-2 ring-white/80"
                    style={{ background: player.color }}
                  >
                    {player.photo ? (
                      <img src={player.photo} alt={player.name} className="h-full w-full object-cover" />
                    ) : (
                      "🐰"
                    )}
                  </div>
                  <div
                    className="h-3 w-3 origin-top rounded-b-full"
                    style={{ background: player.color, transform: "translateZ(-6px) rotateX(70deg)" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function VictoryOverlay({
  name,
  photo,
  isWinner,
  sharing,
  shared,
  onQuit,
  onRematch,
  onShare,
  rematchRequestedBy,
  onAcceptRematch,
  onRejectRematch,
}: {
  name: string;
  photo?: string | null;
  isWinner: boolean;
  sharing?: boolean;
  shared?: boolean;
  onQuit: () => void;
  onRematch: () => void;
  onShare: () => void;
  rematchRequestedBy?: number | null;
  onAcceptRematch?: () => void;
  onRejectRematch?: () => void;
}) {
  const bits = Array.from({ length: 42 }, (_, i) => ({
    id: i,
    left: `${(i * 17) % 100}%`,
    delay: `${(i % 8) * 0.08}s`,
    color: ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#e879f9", "#fde68a"][i % 6],
    dx: `${(i % 2 === 0 ? -1 : 1) * (20 + (i % 40))}px`,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/55 p-4">
      <div className="victory-burst pointer-events-none absolute h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(250,204,21,0.85)_0%,rgba(255,255,255,0)_70%)]" />
      {bits.map((bit) => (
        <span
          key={bit.id}
          className="confetti-piece pointer-events-none absolute top-0 h-2.5 w-2 rounded-sm"
          style={{
            left: bit.left,
            background: bit.color,
            animationDelay: bit.delay,
            ...({ "--dx": bit.dx } as React.CSSProperties),
          }}
        />
      ))}
      <div className="relative w-full max-w-lg rounded-[32px] border border-amber-200 bg-gradient-to-br from-white via-amber-50 to-emerald-50 p-6 text-center shadow-[0_30px_80px_rgba(250,204,21,0.28)]">
        <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-amber-200 bg-white text-4xl">
          {photo ? <img src={photo} alt={name} className="h-full w-full object-cover" /> : "🏆"}
        </div>
        <h2 className="mt-2 text-2xl font-extrabold tracking-wide text-slate-800">FÉLICITATIONS</h2>
        <p className="mt-2 text-lg font-semibold text-emerald-800">{name} atteint la cage finale !</p>
        <p className="mt-1 text-sm text-slate-500">
          {rematchRequestedBy ? (
            isWinner ? "Une demande de revanche a été reçue. Acceptez ou refusez." : "En attente de la réponse du gagnant..."
          ) : (
            isWinner ? "Publiez votre victoire ou relancez une revanche." : "Proposez une revanche ou quittez la partie."
          )}
        </p>
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button type="button" onClick={onQuit} className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">
            Quitter la partie
          </button>
          {rematchRequestedBy ? (
            <>
              {isWinner && onAcceptRematch && (
                <button type="button" onClick={onAcceptRematch} className="rounded-full bg-gradient-to-r from-emerald-500 to-lime-400 px-4 py-2.5 text-sm font-bold text-slate-900">
                  Accepter la revanche
                </button>
              )}
              {isWinner && onRejectRematch && (
                <button type="button" onClick={onRejectRematch} className="rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
                  Refuser
                </button>
              )}
            </>
          ) : (
            <button type="button" onClick={onRematch} className="rounded-full bg-gradient-to-r from-emerald-500 to-lime-400 px-4 py-2.5 text-sm font-bold text-slate-900">
              Revanche
            </button>
          )}
          <button
            type="button"
            onClick={onShare}
            disabled={!isWinner || sharing || shared}
            className="rounded-full bg-sky-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {shared ? "Victoire publiée" : sharing ? "Publication…" : "Partager la victoire"}
          </button>
        </div>
      </div>
    </div>
  );
}
