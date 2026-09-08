import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, CardContent } from "../components/ui";
import { RefreshCw, Play, CheckCircle2 } from "lucide-react";
import { api, type Match, type Utilisateur } from "../lib/api";
import { useAuth } from "../lib/auth";
import { displayName } from "../lib/format";
import usePageTitle from "@/lib/usePageTitle";
import { BACKEND_URL, GRAPHQL_URL, WS_URL } from '@/config/backend'
import UserAvatar from "../components/UserAvatar";
import UserName from "../components/UserName";
import RabbitLudoBoard, { Dice3D, FINISH_POS, VictoryOverlay } from "../components/game/RabbitLudoBoard";

type Player = {
  id: number;
  name: string;
  color: string;
  pos: number;
  isHost?: boolean;
  photo?: string | null;
};

type InviteStatus = "pending" | "accepted";

const DEFAULT_COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#f97316", "#14b8a6", "#eab308", "#64748b"];

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function toPlayer(id: number, name: string, isHost = false, photo?: string | null): Player {
  return {
    id,
    name,
    color: DEFAULT_COLORS[isHost ? 0 : (id % DEFAULT_COLORS.length)] ?? DEFAULT_COLORS[0],
    pos: 0,
    isHost,
    photo: photo || null,
  };
}

function playersFromMatch(match: Match): Player[] {
  const host = match.joueurHote;
  const invite = match.joueurInvite;
  const list: Player[] = [];
  // L'hôte est toujours prêt
  if (host?.id) list.push(toPlayer(Number(host.id), host.pseudo, true, host.photoProfil));
  // L'invité est prêt s'il a accepté
  if (invite?.id && match.inviteAccepte) {
    list.push(toPlayer(Number(invite.id), invite.pseudo, false, invite.photoProfil));
  }
  return list;
}

export default function RabbitRacePage({ onNavigate, matchId }: { onNavigate?: (p: string, id?: number | null) => void; matchId?: number | null }) {
  usePageTitle("Rabbit Race");

  const { user } = useAuth();
  const socketRef = useRef<WebSocket | null>(null);
  const creatingMatchRef = useRef(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Utilisateur[]>([]);
  const [inviteStatus, setInviteStatus] = useState<Record<number, InviteStatus>>({});
  const [notifications, setNotifications] = useState<Array<{ id: number; text: string }>>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [raceTime, setRaceTime] = useState(0);
  const [current, setCurrent] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [dice, setDice] = useState<number | null>(null);
  const [turns, setTurns] = useState(0);
  const [winner, setWinner] = useState<Player | null>(null);
  const [started, setStarted] = useState(false);
  const [pendingStart, setPendingStart] = useState(false);
  const [turnMessage, setTurnMessage] = useState("");
  const [currentMatchId, setCurrentMatchId] = useState<number | null>(matchId ?? null);
  const [isHostView, setIsHostView] = useState(false);
  const [allPlayersReady, setAllPlayersReady] = useState(false);
  const [creatingMatch, setCreatingMatch] = useState(false);
  const [hoppingId, setHoppingId] = useState<number | null>(null);
  const [moveHint, setMoveHint] = useState("");
  const [sharingVictory, setSharingVictory] = useState(false);
  const [victoryShared, setVictoryShared] = useState(false);
  const [rematchRequestedBy, setRematchRequestedBy] = useState<number | null>(null);
  const [rematchVotes, setRematchVotes] = useState<number[]>([]);
  const raceLiveRef = useRef(false);
  const playersRef = useRef<Player[]>([]);
  const walkingRef = useRef(false);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    raceLiveRef.current = started || pendingStart || Boolean(winner) || walkingRef.current;
  }, [pendingStart, started, winner]);

  const walkPlayerTo = useCallback(async (playerId: number, targetPos: number) => {
    walkingRef.current = true;
    raceLiveRef.current = true;
    const start = playersRef.current.find((p) => p.id === playerId)?.pos ?? 0;
    const dest = Math.min(FINISH_POS, targetPos);
    if (dest <= start) {
      walkingRef.current = false;
      return start;
    }
    setHoppingId(playerId);
    for (let next = start + 1; next <= dest; next += 1) {
      setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, pos: next } : p)));
      await new Promise((resolve) => setTimeout(resolve, 240));
    }
    setHoppingId(null);
    walkingRef.current = false;
    return dest;
  }, []);

  const applyMatch = useCallback((rabbitMatch: Match | null | undefined) => {
    if (!rabbitMatch || rabbitMatch.typeJeu !== "course_lapin") return;
    const hostId = Number(rabbitMatch.joueurHote?.id);
    const inviteUser = rabbitMatch.joueurInvite;
    const invitedUserId = inviteUser ? Number(inviteUser.id) : null;
    const accepted = Boolean(rabbitMatch.inviteAccepte);
    setIsHostView(String(hostId) === String(user?.id));
    const readyPlayers = playersFromMatch(rabbitMatch);
    // Ne pas écraser les joueurs si le jeu est en cours ou en attente de démarrage
    // Cela évite de perdre les joueurs ajoutés localement via WebSocket
    if (!raceLiveRef.current && !pendingStart && !started) {
      setPlayers(readyPlayers);
    }
    // Basé sur le nombre de joueurs locaux au lieu du backend
    // car le backend peut avoir un délai de mise à jour
    setAllPlayersReady(readyPlayers.length >= 2);
    if (invitedUserId) {
      setInviteStatus((prev) => ({ ...prev, [invitedUserId]: accepted ? "accepted" : "pending" }));
    }
    if (rabbitMatch.statut === "en_cours" && !started && !pendingStart && !winner) {
      setPendingStart(true);
      setCountdown((prev) => prev ?? 5);
    }
  }, [pendingStart, started, user?.id, winner]);

  useEffect(() => {
    if (matchId) {
      setCurrentMatchId(matchId);
      sessionStorage.setItem("rabbit_match_id", String(matchId));
      return;
    }
    const stored = Number(sessionStorage.getItem("rabbit_match_id") || 0);
    if (stored) setCurrentMatchId(stored);
  }, [matchId]);

  useEffect(() => {
    const loadMatch = async () => {
      if (!currentMatchId) return;
      try {
        const result = await api.matchParId(currentMatchId);
        const rabbitMatch = result.matchParId;
        if (!rabbitMatch || rabbitMatch.typeJeu !== "course_lapin") return;
        // Ne mettre à jour que l'état du match, pas les joueurs
        // pour éviter d'écraser l'hôte ajouté localement
        if (rabbitMatch.statut === "en_cours" && !started && !pendingStart && !winner) {
          setPendingStart(true);
          setCountdown((prev) => prev ?? 5);
        }
      } catch {
        // silent loading for invited lobby
      }
    };
    void loadMatch();
  }, [currentMatchId, pendingStart, started, winner]);

  useEffect(() => {
    if (currentMatchId || matchId || !user?.id || creatingMatchRef.current) return;
    const stored = Number(sessionStorage.getItem("rabbit_match_id") || 0);
    if (stored) {
      setCurrentMatchId(stored);
      return;
    }
    creatingMatchRef.current = true;
    setCreatingMatch(true);
    void api.creerPartie(1, 3, "course_lapin")
      .then((res) => {
        const id = Number(res.creerPartie.id);
        sessionStorage.setItem("rabbit_match_id", String(id));
        setCurrentMatchId(id);
        setIsHostView(true);
        // Ajouter l'hôte immédiatement à la liste des joueurs
        setPlayers([toPlayer(Number(user.id), user.pseudo, true, user.photoProfil)]);
        onNavigate?.("rabbitRace", id);
      })
      .catch(() => {
        creatingMatchRef.current = false;
      })
      .finally(() => setCreatingMatch(false));
  }, [currentMatchId, matchId, onNavigate, user?.id, user?.pseudo, user?.photoProfil]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await api.utilisateurs();
        setOnlineUsers((data.utilisateurs ?? []).filter((u) => Number(u.id) !== Number(user?.id)));
      } catch {
        setOnlineUsers([]);
      }
    };
    void loadUsers();
  }, [user?.id]);

  useEffect(() => {
    if (!currentMatchId) return;
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("access_token") : null;
    const apiBase = GRAPHQL_URL;
    const apiRoot = BACKEND_URL;
    const wsBase = WS_URL;
    const ws = new WebSocket(`${wsBase}/ws/match/${String(currentMatchId)}/?token=${encodeURIComponent(token ?? "")}`);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          type?: string;
          invite_id?: number;
          invite_pseudo?: string;
          seconds?: number;
          from_id?: number;
          player_id?: number;
          pos?: number;
          from_pos?: number;
          to_pos?: number;
          dice?: number;
          current?: number;
          bounce?: boolean;
          winner_id?: number;
          winner_name?: string;
        };
        if (payload.type === "rabbit.invite_accepted") {
          const inviteId = Number(payload.invite_id);
          const inviteName = payload.invite_pseudo ?? "Invité";
          setInviteStatus((prev) => ({ ...prev, [inviteId]: "accepted" }));
          // Ajouter l'invité immédiatement à la liste des joueurs
          setPlayers((prev) => {
            if (prev.some((entry) => Number(entry.id) === inviteId)) return prev;
            const host = prev.find((entry) => entry.isHost) ?? toPlayer(Number(user?.id ?? 0), user?.pseudo ?? "Hôte", true, user?.photoProfil);
            return [host, toPlayer(inviteId, inviteName, false)];
          });
          setAllPlayersReady(true);
          setNotifications((prev) => [{ id: Date.now(), text: "Tous les joueurs sont prêts." }, ...prev].slice(0, 5));
          // Rafraîchir l'état du match côté serveur pour synchroniser
          if (payload.match_id) {
            const matchId = Number(payload.match_id);
            sessionStorage.setItem("rabbit_match_id", String(matchId));
            setCurrentMatchId(matchId);
            void api
              .matchParId(matchId)
              .then((res) => {
                applyMatch(res.matchParId);
                // si on est l'hôte et il y a maintenant au moins 2 joueurs, lancer automatiquement
                const ready = playersFromMatch(res.matchParId);
                if (isHostView && ready.length >= 2) setTimeout(() => startRace(), 1000);
              })
              .catch(() => {
                // fallback: l'invité est déjà ajouté localement ci-dessus
              });
          }
          // Démarrer automatiquement quand tous sont prêts (2 joueurs minimum)
          setPlayers((prevPlayers) => {
            if (isHostView && prevPlayers.length >= 2) {
              setTimeout(() => startRace(), 1000);
            }
            return prevPlayers;
          });
        }
        if (payload.type === "rabbit.invite_sent") {
          const inviteId = Number(payload.invite_id);
          if (inviteId) setInviteStatus((prev) => ({ ...prev, [inviteId]: prev[inviteId] ?? "pending" }));
        }
        if (payload.type === "rabbit.invite_refused") {
          setAllPlayersReady(false);
          setInviteStatus({});
          setPlayers((prev) => prev.filter((entry) => entry.isHost));
        }
        if (payload.type === "rabbit.countdown") {
          setPendingStart(true);
          setStarted(false);
          setCountdown(Number(payload.seconds ?? 5));
        }
        if (payload.type === "rabbit.move" && Number(payload.from_id) !== Number(user?.id)) {
          setDice(payload.dice ?? null);
          const toPos = Number(payload.to_pos ?? payload.pos ?? 0);
          const fromPos = Number(payload.from_pos ?? toPos);
          if (payload.bounce || toPos === fromPos) {
            setMoveHint("Il faut un dé exact pour entrer dans la cage finale.");
            setCurrent(Number(payload.current ?? 0));
            setTurns((t) => t + 1);
          } else {
            void walkPlayerTo(Number(payload.player_id), toPos).then(() => {
              setCurrent(Number(payload.current ?? 0));
              setTurns((t) => t + 1);
            });
          }
        }
        if (payload.type === "rabbit.win") {
          const winnerId = Number(payload.winner_id ?? 0);
          const known = playersRef.current.find((p) => Number(p.id) === winnerId);
          setWinner({
            id: winnerId,
            name: payload.winner_name ?? known?.name ?? "Joueur",
            color: known?.color ?? DEFAULT_COLORS[0],
            pos: 24,
            photo: known?.photo ?? null,
          });
          setStarted(false);
          setVictoryShared(false);
        }
        if (payload.type === "rabbit.rematch_request") {
          const requesterId = Number(payload.from_id ?? 0);
          setRematchRequestedBy(requesterId || null);
          setRematchVotes((prev) => (prev.includes(requesterId) ? prev : [...prev, requesterId]));
          setPendingStart(false);
          setStarted(false);
          setMoveHint(requesterId === Number(user?.id) ? "Votre demande de revanche est en attente de validation." : "Une revanche a été proposée. Acceptez pour relancer la partie.");
        }
        if (payload.type === "rabbit.rematch_accept") {
          const voterId = Number(payload.from_id ?? 0);
          if (!voterId) return;
          setRematchVotes((prev) => (prev.includes(voterId) ? prev : [...prev, voterId]));
        }
        if (payload.type === "rabbit.rematch") {
          setWinner(null);
          setVictoryShared(false);
          setSharingVictory(false);
          setRematchRequestedBy(null);
          setRematchVotes([]);
          setPendingStart(true);
          setStarted(false);
          setCountdown(5);
          setPlayers((prev) => prev.map((player) => ({ ...player, pos: 0 })));
          setCurrent(0);
          setDice(null);
          setTurns(0);
          setRaceTime(0);
          setMoveHint("");
        }
        if (payload.type === "rabbit.quit") {
          if (Number(payload.from_id) === Number(user?.id)) return;
          sessionStorage.removeItem("rabbit_match_id");
          onNavigate?.("home");
        }
      } catch {
        // ignore malformed payloads
      }
    };

    return () => {
      try { ws.close(); } catch { /* ignore */ }
      socketRef.current = null;
    };
  }, [currentMatchId, onNavigate, user?.id, user?.photoProfil, user?.pseudo, walkPlayerTo]);

  useEffect(() => {
    if (!currentMatchId) return;
    const refresh = () => {
      if (!currentMatchId) return;
      // Ne pas mettre à jour les joueurs via API dans le lobby
      // pour éviter d'écraser les joueurs ajoutés via WebSocket
      void api.matchParId(currentMatchId).then((result) => {
        const rabbitMatch = result.matchParId;
        if (!rabbitMatch || rabbitMatch.typeJeu !== "course_lapin") return;
        // Mettre à jour seulement l'état du match, pas les joueurs
        if (rabbitMatch.statut === "en_cours" && !started && !pendingStart && !winner) {
          setPendingStart(true);
          setCountdown((prev) => prev ?? 5);
        }
      }).catch(() => undefined);
    };
    window.addEventListener("notifications:refresh", refresh);
    const interval = window.setInterval(refresh, 4000);
    return () => {
      window.removeEventListener("notifications:refresh", refresh);
      window.clearInterval(interval);
    };
  }, [currentMatchId, pendingStart, started, winner]);

  const hostPlayer: Player = useMemo(
    () => toPlayer(Number(user?.id ?? 0), user?.pseudo ?? "Moi", true, user?.photoProfil),
    [user],
  );

  const acceptedPlayers = useMemo<Player[]>(() => {
    // Utiliser directement players car ils sont mis à jour via WebSocket
    return players;
  }, [players]);

  // Mettre à jour allPlayersReady basé sur le nombre de joueurs locaux
  useEffect(() => {
    setAllPlayersReady(players.length >= 2);
  }, [players]);

  useEffect(() => {
    if (!pendingStart || countdown === null) return;
    if (countdown <= 0) {
      setPendingStart(false);
      setStarted(true);
      setPlayers(acceptedPlayers.map((player) => ({ ...player, pos: 0 })));
      setCurrent(0);
      setDice(null);
      setWinner(null);
      setTurns(0);
      setRaceTime(0);
      setMoveHint("");
      return;
    }
    const timer = window.setTimeout(() => setCountdown((prev) => (prev ?? 0) - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [acceptedPlayers, countdown, pendingStart]);

  useEffect(() => {
    if (!started) {
      setTurnMessage("");
      return;
    }
    const timer = window.setInterval(() => setRaceTime((t) => t + 1), 1000);
    return () => window.clearInterval(timer);
  }, [started]);

  useEffect(() => {
    if (!started || players.length === 0) {
      setTurnMessage("");
      return;
    }
    const currentPlayer = players[current];
    const isMyTurn = Number(currentPlayer?.id) === Number(user?.id);
    const nextText = currentPlayer ? (isMyTurn ? `C'est votre tour, ${currentPlayer.name}` : `C'est le tour de ${currentPlayer.name}`) : "";
    setTurnMessage(nextText);
    const timer = window.setTimeout(() => setTurnMessage(""), 2200);
    return () => window.clearTimeout(timer);
  }, [started, current, players, user?.id]);

  const sendRaceEvent = (payload: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  };

  const invitePlayer = async (player: Utilisateur) => {
    const id = Number(player.id);
    if (id === Number(user?.id) || !isHostView) return;
    if (!currentMatchId) {
      setNotifications((prev) => [{ id: Date.now(), text: "La partie n'est pas encore créée." }, ...prev].slice(0, 5));
      return;
    }
    try {
      await api.inviterJoueurCourseLapin(currentMatchId, id);
      setInviteStatus((prev) => ({ ...prev, [id]: "pending" }));
      setNotifications((prev) => [{ id: Date.now(), text: `Invitation envoyée à ${displayName(player)}` }, ...prev].slice(0, 5));
    } catch {
      setNotifications((prev) => [{ id: Date.now(), text: `Impossible d'envoyer l'invitation à ${displayName(player)}` }, ...prev].slice(0, 5));
    }
  };

  const cancelInvitation = async (playerId: number) => {
    if (!currentMatchId) return;
    try {
      await api.refuserInvitationCourseLapin(currentMatchId);
    } catch {
      // local fallback
    }
    setInviteStatus((prev) => {
      const next = { ...prev };
      delete next[playerId];
      return next;
    });
    setAllPlayersReady(false);
    setNotifications((prev) => [{ id: Date.now(), text: "Invitation annulée." }, ...prev].slice(0, 5));
  };

  const startRace = async () => {
    if (!isHostView || acceptedPlayers.length < 2 || !currentMatchId || !allPlayersReady) return;
    try {
      await api.lancerCourseLapin(currentMatchId);
    } catch {
      sendRaceEvent({ type: "rabbit.countdown", seconds: 5, match_id: currentMatchId });
    }
    setPlayers(acceptedPlayers.map((player) => ({ ...player, pos: 0 })));
    setPendingStart(true);
    setStarted(false);
    setCountdown(5);
    setWinner(null);
    setDice(null);
    setCurrent(0);
    setTurns(0);
    setRaceTime(0);
  };

  const resetGame = () => {
    sessionStorage.removeItem("rabbit_match_id");
    setPlayers([]);
    setInviteStatus({});
    setNotifications([]);
    setPendingStart(false);
    setCountdown(null);
    setStarted(false);
    setWinner(null);
    setCurrent(0);
    setDice(null);
    setTurns(0);
    setRaceTime(0);
    setTurnMessage("");
    setAllPlayersReady(false);
    setMoveHint("");
    setHoppingId(null);
    setCurrentMatchId(null);
    setSharingVictory(false);
    setVictoryShared(false);
    creatingMatchRef.current = false;
    onNavigate?.("rabbitRace");
  };

  const quitMatch = () => {
    sendRaceEvent({ type: "rabbit.quit", from_id: Number(user?.id), match_id: currentMatchId });
    sessionStorage.removeItem("rabbit_match_id");
    setCurrentMatchId(null);
    if (currentMatchId && isHostView) {
      void api.annulerPartie(currentMatchId).catch(() => undefined);
    }
    setWinner(null);
    setRematchRequestedBy(null);
    setRematchVotes([]);
    onNavigate?.("home");
  };

  const rematch = () => {
    const me = Number(user?.id ?? 0);
    if (!me || !currentMatchId) return;
    const nextVotes = [me];
    setRematchRequestedBy(me);
    setRematchVotes(nextVotes);
    sendRaceEvent({ type: "rabbit.rematch_request", from_id: me, match_id: currentMatchId, votes: nextVotes });
  };

  const acceptRematch = () => {
    const me = Number(user?.id ?? 0);
    if (!me || !currentMatchId) return;
    const nextVotes = Array.from(new Set([...(rematchVotes || []), me]));
    setRematchVotes(nextVotes);
    sendRaceEvent({ type: "rabbit.rematch_accept", from_id: me, match_id: currentMatchId, votes: nextVotes });
  };

  const shareVictory = async () => {
    if (!winner || Number(winner.id) !== Number(user?.id) || sharingVictory || victoryShared) return;
    setSharingVictory(true);
    try {
      await api.publier(`🏆 Victoire Course des Lapins ! ${winner.name} a atteint la cage ${FINISH_POS} et remporte la course.`);
      setVictoryShared(true);
      onNavigate?.("home");
    } catch {
      setNotifications((prev) => [{ id: Date.now(), text: "Impossible de publier la victoire." }, ...prev].slice(0, 5));
    } finally {
      setSharingVictory(false);
    }
  };

  const rollDice = async () => {
    const currentPlayer = players[current];
    const isMyTurn = Number(currentPlayer?.id) === Number(user?.id);
    if (!started || rolling || winner || players.length === 0 || !isMyTurn || walkingRef.current) return;

    setRolling(true);
    setMoveHint("");
    setDice(null);
    await new Promise((resolve) => setTimeout(resolve, 550));

    const value = randInt(1, 6);
    setDice(value);
    await new Promise((resolve) => setTimeout(resolve, 280));

    const currentPosition = currentPlayer.pos;
    const projected = currentPosition + value;
    const nextCurrent = (current + 1) % players.length;

    if (projected > FINISH_POS) {
      setMoveHint(`${currentPlayer.name} a fait ${value} : trop loin. Il faut un dé exact pour la cage ${FINISH_POS}.`);
      setTurns((t) => t + 1);
      setCurrent(nextCurrent);
      sendRaceEvent({
        type: "rabbit.move",
        from_id: Number(user?.id),
        player_id: currentPlayer.id,
        from_pos: currentPosition,
        to_pos: currentPosition,
        pos: currentPosition,
        dice: value,
        current: nextCurrent,
        bounce: true,
      });
      setRolling(false);
      return;
    }

    const landed = await walkPlayerTo(currentPlayer.id, projected);
    setTurns((t) => t + 1);

    if (landed >= FINISH_POS) {
      const nextWinner = { ...currentPlayer, pos: FINISH_POS };
      setWinner(nextWinner);
      setStarted(false);
      sendRaceEvent({
        type: "rabbit.win",
        from_id: Number(user?.id),
        winner_id: currentPlayer.id,
        winner_name: currentPlayer.name,
        pos: FINISH_POS,
      });
      setRolling(false);
      return;
    }

    setCurrent(nextCurrent);
    sendRaceEvent({
      type: "rabbit.move",
      from_id: Number(user?.id),
      player_id: currentPlayer.id,
      from_pos: currentPosition,
      to_pos: landed,
      pos: landed,
      dice: value,
      current: nextCurrent,
      bounce: false,
    });
    setRolling(false);
  };

  const isMyTurn = Number(players[current]?.id) === Number(user?.id);
  const lobbyVisible = !started && !pendingStart;
  const canLaunch = isHostView && allPlayersReady && acceptedPlayers.length >= 2 && !creatingMatch;
  const rematchAcceptedCount = new Set(rematchVotes).size;
  const rematchPending = Boolean(rematchRequestedBy !== null && rematchRequestedBy !== Number(user?.id));
  const allParticipantsAcceptedRematch = players.length > 0 && rematchAcceptedCount >= players.length;

  useEffect(() => {
    if (!allParticipantsAcceptedRematch || !currentMatchId) return;
    setWinner(null);
    setVictoryShared(false);
    setSharingVictory(false);
    setRematchRequestedBy(null);
    setRematchVotes([]);
    setPendingStart(true);
    setStarted(false);
    setCountdown(5);
    setPlayers((prev) => prev.map((player) => ({ ...player, pos: 0 })));
    setCurrent(0);
    setDice(null);
    setTurns(0);
    setRaceTime(0);
    setMoveHint("");
    sendRaceEvent({ type: "rabbit.rematch", from_id: Number(user?.id), match_id: currentMatchId });
  }, [allParticipantsAcceptedRematch, currentMatchId, user?.id]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f2fff3_0%,_#edf7ef_30%,_#eaf2ea_100%)] p-4 md:p-8">
      <style>{`
        @keyframes rabbit-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          25% { transform: translateY(-5px) scale(1.08); }
          50% { transform: translateY(-10px) scale(1.12); }
          75% { transform: translateY(-4px) scale(1.05); }
        }
        @keyframes countdown-glow {
          0%, 100% { box-shadow: 0 0 0 rgba(52, 211, 153, 0), 0 0 0 rgba(163, 230, 53, 0); transform: scale(1); }
          50% { box-shadow: 0 0 26px rgba(52, 211, 153, 0.6), 0 0 42px rgba(163, 230, 53, 0.38); transform: scale(1.04); }
        }
        @keyframes countdown-rise {
          0% { opacity: 0; transform: translateY(24px) scale(0.7); }
          25% { opacity: 1; }
          100% { opacity: 1; transform: translateY(0) scale(1.08); }
        }
        .rabbit-race-shell { perspective: 1200px; }
        .race-board { transform: rotateX(9deg) rotateY(-2deg); transform-style: preserve-3d; }
        .race-cell { box-shadow: inset 0 1px 0 rgba(255,255,255,0.8), 0 12px 22px rgba(8,47,29,0.12); }
        .race-rabbit { animation: rabbit-bounce 1.05s ease-in-out infinite; }
        .countdown-glow { animation: countdown-glow 1.2s ease-in-out infinite; }
        .countdown-number { animation: countdown-rise 0.72s cubic-bezier(0.2, 0.8, 0.2, 1); }
      `}</style>
      <header className="mb-6 flex items-center justify-between gap-3 rounded-[28px] border border-white/60 bg-white/65 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
            <span className="text-base">🐰</span>
            Course lapin
          </div>
          <h1 className="text-2xl font-extrabold text-[#122217]">Course des Lapins</h1>
          <p className="text-sm text-slate-500">
            {isHostView
              ? "Invitez un joueur. Quand il accepte, lancez le compte à rebours de 5 secondes."
              : "En attente : dès que tout le monde a accepté, l’hôte lance la course."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={resetGame} className="rounded-full border border-slate-200 bg-white shadow-sm"><RefreshCw size={16} /></Button>
          <Button variant="ghost" onClick={quitMatch} className="rounded-full border border-red-200 bg-red-50 text-red-700 shadow-sm hover:bg-red-100">Quitter</Button>
          {isHostView && (
            <Button variant="ghost" onClick={startRace} disabled={!canLaunch} className="rounded-full bg-gradient-to-r from-emerald-500 to-lime-500 text-white shadow-[0_12px_24px_rgba(34,197,94,0.35)] hover:brightness-105"><Play size={16} /></Button>
          )}
        </div>
      </header>

      {rematchPending && (
        <div className="mb-4 flex flex-col gap-3 rounded-[24px] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 shadow-[0_12px_25px_rgba(251,191,36,0.1)] sm:flex-row sm:items-center sm:justify-between">
          <span>Une revanche a été proposée. Acceptez pour relancer la partie.</span>
          <Button size="sm" onClick={acceptRematch} className="rounded-full bg-amber-500 text-white hover:bg-amber-600">Accepter la revanche</Button>
        </div>
      )}

      {allPlayersReady && lobbyVisible && (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-[0_10px_25px_rgba(16,185,129,0.12)]">
          Tous les joueurs sont prêts{isHostView ? ". Vous pouvez lancer le compte à rebours." : ". En attente du lancement par l’hôte."}
        </div>
      )}

      {lobbyVisible ? (
        <main className="grid grid-cols-1 gap-6">
          <Card className="overflow-hidden border-0 bg-transparent shadow-none">
            <CardContent className="space-y-5 rounded-[28px] border border-white/60 bg-white/70 p-5 shadow-[0_25px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Équipe et invitations</h3>
                <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{creatingMatch ? "Création…" : `Joueurs ${acceptedPlayers.length}/2`}</div>
              </div>

              {isHostView && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748b]">Joueurs à inviter</div>
                  {onlineUsers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-[#64748b]">Aucun autre joueur pour l'instant.</div>
                  ) : (
                    onlineUsers.map((player) => {
                      const id = Number(player.id);
                      const status = inviteStatus[id];
                      const isPending = status === "pending";
                      const isAccepted = status === "accepted";
                      return (
                        <div key={player.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                          <div className="flex items-center gap-2">
                            <UserAvatar user={player} size="sm" className="ring-2 ring-[#d9efe2]" />
                            <span className="text-sm font-medium text-slate-700"><UserName user={player} /></span>
                            {player.enLigne && <span className="text-[10px] uppercase text-emerald-600 font-bold">En ligne</span>}
                          </div>
                          <div className="flex gap-2">
                            {!isPending && !isAccepted && (
                              <Button size="sm" variant="outline" onClick={() => invitePlayer(player)} className="rounded-full">Inviter</Button>
                            )}
                            {isPending && (
                              <Button size="sm" variant="ghost" onClick={() => { void cancelInvitation(id); }} className="rounded-full text-amber-700">Annuler</Button>
                            )}
                            {isAccepted && (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">Accepté</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {!isHostView && (
                <div className="rounded-2xl border border-dashed border-emerald-200 bg-gradient-to-r from-emerald-50 to-lime-50 p-4 text-sm text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                  Vous avez rejoint le lobby. Attendez que l’hôte lance la partie une fois que tout le monde est prêt.
                </div>
              )}

              <div className="mt-2 rounded-[24px] border border-slate-200 bg-slate-50/75 p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Équipe prête</h4>
                {acceptedPlayers.length === 0 ? (
                  <div className="text-sm text-[#64748b]">Aucune invitation acceptée.</div>
                ) : (
                  <div className="space-y-2">
                    {acceptedPlayers.map((player: Player) => (
                      <div key={player.id} className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-white to-slate-100 px-3 py-2 shadow-[0_10px_18px_rgba(15,23,42,0.04)]">
                        <div className="flex items-center gap-2">
                          <div className="h-3.5 w-3.5 rounded-full shadow-[0_0_0_3px_rgba(255,255,255,0.9)]" style={{ background: player.color }} />
                          <span className="text-sm font-medium text-slate-700">{player.name}</span>
                        </div>
                        {player.isHost ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700">Hôte</span> : <CheckCircle2 size={15} className="text-emerald-600" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isHostView && (
                <div className="pt-1">
                  <Button onClick={startRace} disabled={!canLaunch} className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 via-lime-500 to-emerald-500 text-white shadow-[0_18px_30px_rgba(34,197,94,0.35)]">
                    {allPlayersReady ? "Lancer (compte à rebours 5 s)" : "En attente des joueurs"}
                  </Button>
                </div>
              )}

              {notifications.length > 0 && (
                <div className="rounded-[22px] border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-3 shadow-[0_10px_25px_rgba(251,146,60,0.08)]">
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700">Notifications</div>
                  <div className="space-y-1">
                    {notifications.map((n) => (
                      <div key={n.id} className="text-xs text-amber-800">• {n.text}</div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      ) : (
        <main className="grid grid-cols-1 gap-6">
          <section>
            <Card className="overflow-hidden border-0 bg-transparent shadow-none">
              <CardContent className="rounded-[30px] border border-white/60 bg-white/70 p-4 shadow-[0_28px_70px_rgba(8,47,29,0.12)] backdrop-blur-sm">
                <div className="rounded-[28px] bg-gradient-to-br from-[#0f3d2b] via-[#184d39] to-[#081f17] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_28px_45px_rgba(5,28,19,0.4)]">
                  <div className="mb-3 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-100/80">
                    Avancez de case en case — premier à la cage 24 gagne
                  </div>
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                    <div className="min-w-0 flex-1 pt-2">
                      <RabbitLudoBoard
                        players={players}
                        hoppingId={hoppingId}
                        currentPlayerId={players[current]?.id}
                      />
                    </div>

                    <aside className="w-full lg:w-72">
                      <div className="mb-4 rounded-[22px] border border-white/10 bg-white/12 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100/80">Joueur actuel</h3>
                        <div className="mt-2 flex items-center gap-3">
                          <UserAvatar user={{ pseudo: players[current]?.name, photoProfil: players[current]?.photo }} size="sm" className="ring-2 ring-white/20" />
                          <div>
                            <div className="text-sm font-bold text-white">{players[current]?.name ?? "En attente"}</div>
                            <div className="text-xs text-emerald-50/80">
                              {pendingStart ? `Départ dans ${countdown ?? 0}s` : started ? `C'est au tour de ${players[current]?.name ?? "..."} 🎲` : "La partie va démarrer"}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4 rounded-[22px] border border-white/10 bg-white/12 p-3">
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100/80">Progression</h3>
                        <div className="mt-2 space-y-2">
                          {players.map((p) => (
                            <div key={p.id}>
                              <div className="mb-1 flex items-center justify-between text-[11px] text-emerald-50/90">
                                <span>{p.name}</span>
                                <span>{p.pos}/{FINISH_POS}</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-black/25">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{ width: `${(p.pos / FINISH_POS) * 100}%`, background: p.color }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 text-2xl font-black text-[#d9ffea]">{raceTime}s</div>
                      </div>

                      <div className="mb-4 rounded-[22px] border border-white/10 bg-white/12 p-3">
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100/80">Dé</h3>
                        <div className="mt-2 flex items-center gap-3">
                          <Dice3D value={dice} rolling={rolling} />
                          <div>
                            <Button onClick={rollDice} disabled={rolling || !started || !!winner || !isMyTurn || hoppingId != null} size="sm" className="mb-2 rounded-full bg-gradient-to-r from-emerald-400 to-lime-400 text-slate-900 shadow-[0_12px_22px_rgba(16,185,129,0.28)]">
                              Lancer le dé
                            </Button>
                            <div className="text-xs text-emerald-50/80">
                              {dice ? `+${dice} cage${dice > 1 ? "s" : ""}` : "À vous de jouer"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {(turnMessage || moveHint) && (
                        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-xs font-medium text-emerald-700 shadow-[0_10px_18px_rgba(16,185,129,0.14)]">
                          {moveHint || turnMessage}
                        </div>
                      )}
                    </aside>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </main>
      )}

      {pendingStart && countdown !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]">
          <div className="countdown-glow w-full max-w-md rounded-[32px] border border-emerald-200 bg-gradient-to-br from-white via-emerald-50 to-lime-50 p-6 text-center shadow-[0_28px_70px_rgba(16,185,129,0.28)]">
            <div className="mb-3 text-3xl">⏱️</div>
            <h2 className="text-2xl font-extrabold uppercase tracking-[0.25em] text-slate-800">Start</h2>
            <p className="mt-2 text-sm text-[#64748b]">L’équipe est prête. La partie commence dans {countdown} seconde{countdown > 1 ? "s" : ""}.</p>
            <div className="countdown-number my-6 text-6xl font-black text-[#16a34a] drop-shadow-[0_12px_18px_rgba(16,185,129,0.25)]">{countdown}</div>
          </div>
        </div>
      )}

      {winner && (
        <VictoryOverlay
          name={winner.name}
          photo={winner.photo}
          isWinner={Number(winner.id) === Number(user?.id)}
          sharing={sharingVictory}
          shared={victoryShared}
          onQuit={quitMatch}
          onRematch={rematch}
          onShare={shareVictory}
        />
      )}
    </div>
  );
}
