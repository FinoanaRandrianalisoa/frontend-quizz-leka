import { Eye, Crown } from "lucide-react";
import { Avatar, AvatarFallback } from "../ui";

interface Player { name: string; score: number; avatar?: string; isCurrentUser?: boolean; }

interface GameHeaderProps {
  player1: Player;
  player2: Player;
  spectators?: number;
  round?: number;
  totalRounds?: number;
  isLive?: boolean;
}

export default function GameHeader({ player1, player2, spectators = 0, round = 1, totalRounds = 8, isLive }: GameHeaderProps) {
  const leader = player1.score > player2.score ? "p1" : player2.score > player1.score ? "p2" : null;

  return (
    <div className="grad-hero text-white px-4 py-3 flex items-center gap-3 shrink-0">
      {/* Player 1 */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="relative shrink-0">
          <Avatar size="md" online={player1.isCurrentUser} className="ring-2 ring-white/30">
            <AvatarFallback>{player1.name[0]}</AvatarFallback>
          </Avatar>
          {leader === "p1" && (
            <Crown size={12} className="absolute -top-2 left-1/2 -translate-x-1/2 text-[#FFD700] drop-shadow" />
          )}
        </div>
        <div className="min-w-0 hidden sm:block">
          <p className="text-xs text-white/60 truncate">
            {player1.isCurrentUser ? "Vous" : "Adversaire"}
          </p>
          <p className="text-sm font-bold truncate max-w-[90px]">{player1.name}</p>
        </div>
        <div className="ml-auto sm:ml-0 flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 border border-white/20 shrink-0">
          <span className={`text-2xl font-black tabular-nums ${leader === "p1" ? "text-[#FFD700]" : "text-white"}`}>
            {player1.score}
          </span>
        </div>
      </div>

      {/* Center */}
      <div className="flex flex-col items-center gap-1 shrink-0 px-2">
        {isLive && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D62828]">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-live-pulse" />
            <span className="text-[9px] font-bold tracking-wider">LIVE</span>
          </div>
        )}
        <div className="text-center">
          <p className="text-white/40 text-[10px] font-medium">Q {round}/{totalRounds}</p>
          <p className="text-white/20 text-lg font-black leading-none">VS</p>
        </div>
        {spectators > 0 && (
          <div className="flex items-center gap-1 text-white/50">
            <Eye size={11} />
            <span className="text-[10px]">{spectators}</span>
          </div>
        )}
      </div>

      {/* Player 2 */}
      <div className="flex items-center gap-2.5 flex-1 justify-end min-w-0">
        <div className="mr-auto sm:mr-0 flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 border border-white/20 shrink-0">
          <span className={`text-2xl font-black tabular-nums ${leader === "p2" ? "text-[#FFD700]" : "text-white"}`}>
            {player2.score}
          </span>
        </div>
        <div className="min-w-0 text-right hidden sm:block">
          <p className="text-xs text-white/60 truncate">Adversaire</p>
          <p className="text-sm font-bold truncate max-w-[90px]">{player2.name}</p>
        </div>
        <div className="relative shrink-0">
          <Avatar size="md" className="ring-2 ring-white/30">
            <AvatarFallback>{player2.name[0]}</AvatarFallback>
          </Avatar>
          {leader === "p2" && (
            <Crown size={12} className="absolute -top-2 left-1/2 -translate-x-1/2 text-[#FFD700] drop-shadow" />
          )}
        </div>
      </div>
    </div>
  );
}
