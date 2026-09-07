import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { ToastProvider, Skeleton, useToast, Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, Button } from "./components/ui";
import TopNav from "./components/navigation/TopNav";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
// LobbyPage removed: creation flow now uses categories -> categoryThemes
import PlayCategoriesPage from "./pages/PlayCategoriesPage";
import CategoryThemesPage from "./pages/CategoryThemesPage";
import GameRoomPage from "./pages/GameRoomPage";
import RabbitRacePage from "./pages/RabbitRacePage";
import SquidGamePage from "./pages/SquidGamePage";
import RpsMatchPage from "./pages/RpsMatchPage";
import PenaltyKickPage from "./pages/PenaltyKickPage";
import PenaltyMatchPage from "./pages/PenaltyMatchPage";
import QuizGlobalPage from "./pages/QuizGlobalPage";
import MatchResultsPage from "./pages/MatchResultsPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ProfilePage from "./pages/ProfilePage";
import WalletPage from "./pages/WalletPage";
import NotificationsPage from "./pages/NotificationsPage";
import MessagesPage from "./pages/MessagesPage";
import SettingsPage from "./pages/SettingsPage";
import SpectatorPage from "./pages/SpectatorPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import { AuthProvider, useAuth } from "./lib/auth";
import { api } from "./lib/api";
import { quizGlobalApi, type QuizGlobalState } from "./lib/quizGlobalApi";

export type Page =
  | "login" | "register"
  | "home" | "game" | "results"
  | "rabbitRace" | "squidGame" | "rpsMatch" | "penaltyKick" | "penaltyMatch" | "quizGlobal"
  | "categories" | "categoryThemes"
  | "leaderboard" | "profile"
  | "wallet" | "notifications" | "messages" | "settings"
  | "spectator" | "admin";

const AUTH_PAGES: Page[] = ["login", "register"];
const FULLSCREEN_PAGES: Page[] = ["game", "spectator", "rpsMatch", "penaltyMatch"];
const PAGE_ROUTES: Record<Page, string> = {
  login: "Login",
  register: "Register",
  home: "Home",
  game: "Game",
  results: "Results",
  rabbitRace: "RabbitRace",
  squidGame: "SquidGame",
  rpsMatch: "RpsMatch",
  penaltyKick: "PenaltyKick",
  penaltyMatch: "PenaltyMatch",
  quizGlobal: "QuizGlobal",
  categories: "Categories",
  categoryThemes: "CategoryThemes",
  leaderboard: "Leaderboard",
  profile: "Profile",
  wallet: "Wallet",
  notifications: "Notifications",
  messages: "Messages",
  settings: "Settings",
  spectator: "Spectator",
  admin: "AdminUsers",
};

const pageFromPath = (path: string): Page | null => {
  const normalized = path.replace(/^\/+|\/+$/g, "").toLowerCase();
  if (!normalized) return "home";
  const match = Object.entries(PAGE_ROUTES).find(([, route]) => route.toLowerCase() === normalized);
  return (match?.[0] as Page) ?? null;
};

export type NavigateFn = (page: string, matchId?: number | null, param?: string | null) => void;

function Footer() {
  return (
    <footer className="border-t border-[#dfeae0] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 text-sm text-[#64748b] md:flex-row md:items-center md:justify-between">
        <p>Quizz Leka © 2026 — Jeux, communauté et défis en direct.</p>
        <div className="flex items-center gap-4">
          <span>À propos</span>
          <span>Règlement</span>
          <span>Support</span>
        </div>
      </div>
    </footer>
  );
}

function AppShell() {
  const { user, loading } = useAuth();
  const toast = useToast();
  const [page, setPage] = useState<Page>("home");
  const [matchId, setMatchId] = useState<number | null>(null);
  const [pageParam, setPageParam] = useState<string | null>(null);
  const [rabbitInvite, setRabbitInvite] = useState<{ matchId: number; titre: string; message: string } | null>(null);
  const [rabbitInviteBusy, setRabbitInviteBusy] = useState(false);
  const [quizInvite, setQuizInvite] = useState<QuizGlobalState | null>(null);
  const [quizInviteBusy, setQuizInviteBusy] = useState(false);
  const quizInviteRef = useRef<QuizGlobalState | null>(null);
  const dismissedInvites = useRef<Set<number>>(new Set());

  useEffect(() => {
    quizInviteRef.current = quizInvite;
  }, [quizInvite]);

  useEffect(() => {
    const syncFromLocation = () => {
      const nextPage = pageFromPath(window.location.pathname);
      if (nextPage) {
        setPage(nextPage);
        const urlMatch = new URLSearchParams(window.location.search).get("match");
        if (urlMatch) setMatchId(Number(urlMatch));
      }
    };

    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    return () => window.removeEventListener("popstate", syncFromLocation);
  }, []);

  useEffect(() => {
    const handleRefresh = (event: Event) => {
      const detail = (event as CustomEvent<{
        titre?: string;
        message?: string;
        type?: string;
        reference_id?: number;
        referenceId?: number;
      }>).detail;
      const titre = detail?.titre || "";
      const message = detail?.message || "";
      const text = titre || message || "Nouvelle notification";
      toast.toast("info", text);

      const matchId = Number(detail?.referenceId ?? detail?.reference_id ?? 0);
      const isInvite = titre.trim().toLowerCase() === "invitation course lapin" || (detail?.type === "defi_recu" && /course lapin/i.test(`${titre} ${message}`));
      if (isInvite && matchId) {
        setRabbitInvite({ matchId, titre: titre || "Invitation Course lapin", message: message || "Acceptez pour rejoindre la course." });
        return;
      }
      if (/quizz global/i.test(titre) && matchId) {
        void enqueueQuizInvite(matchId);
      }
    };

    const enqueueQuizInvite = async (gameId: number) => {
      try {
        if (dismissedInvites.current.has(gameId)) return;
        const res = await quizGlobalApi.get(gameId);
        setQuizInvite(res.partieQuizGlobal);
      } catch {
        // ignore
      }
    };

    window.addEventListener("notifications:refresh", handleRefresh as EventListener);
    return () => window.removeEventListener("notifications:refresh", handleRefresh as EventListener);
  }, [toast]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const check = async () => {
      if (cancelled || quizInviteRef.current) return;
      try {
        const res = await quizGlobalApi.mesInvitations();
        const invites = res.mesInvitationsQuizGlobal ?? [];
        const next = invites.find((g) => !dismissedInvites.current.has(g.gameId));
        if (next) setQuizInvite(next);
      } catch {
        // ignore
      }
    };
    const id = setInterval(() => void check(), 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user?.id]);

  const confirmQuizInvite = async () => {
    if (!quizInvite) return;
    const gameId = quizInvite.gameId;
    setQuizInviteBusy(true);
    try {
      setQuizInvite(null);
      const res = await quizGlobalApi.rejoindre(gameId);
      navigate("quizGlobal", res.rejoindrePartieQuizGlobal.gameId || gameId);
    } catch {
      navigate("quizGlobal", gameId);
    } finally {
      setQuizInviteBusy(false);
    }
  };

  const refuseQuizInvite = async () => {
    if (!quizInvite) return;
    const gameId = quizInvite.gameId;
    setQuizInviteBusy(true);
    try {
      await quizGlobalApi.refuserInvitation(gameId);
    } catch {
      // ignore
    }
    dismissedInvites.current.add(gameId);
    setQuizInvite(null);
    setQuizInviteBusy(false);
  };

  const closeQuizInvite = () => {
    if (!quizInvite) return;
    dismissedInvites.current.add(quizInvite.gameId);
    setQuizInvite(null);
  };

  const navigate: NavigateFn = (p, nextMatchId, param) => {
    const target = p as Page;
    if (!user && !AUTH_PAGES.includes(target)) {
      setPage("login");
      const loginPath = `/${PAGE_ROUTES.login}`;
      window.history.pushState({}, "", loginPath);
      return;
    }
    if (target === "rabbitRace" && (!nextMatchId || Number(nextMatchId) <= 0)) {
      sessionStorage.removeItem("rabbit_match_id");
      setMatchId(null);
    } else if (nextMatchId !== undefined) {
      setMatchId(nextMatchId);
    }
    setPageParam(param ?? null);
    setPage(target);
    const route = PAGE_ROUTES[target] ?? "Home";
    const query = nextMatchId !== undefined && nextMatchId !== null ? `?match=${nextMatchId}` : "";
    window.history.pushState({}, "", `/${route}${query}`);
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 bg-[#F9F9F9]">
        <Skeleton className="w-16 h-16 rounded-2xl" />
        <p className="text-sm text-[#A0A0A0]">Chargement de Quizz Leka…</p>
      </div>
    );
  }

  const isAuth = !user || AUTH_PAGES.includes(page);
  const current = !user ? (page === "register" ? "register" : "login") : page;
  const effectivePage = current;
  const isFullscreen = FULLSCREEN_PAGES.includes(effectivePage);

  return (
    <div className="h-full flex flex-col bg-background-[#F9F9F9]">
      {isAuth && (
        <AuthPage
          onSuccess={() => setPage("home")}
          initialMode={current === "register" ? "register" : "login"}
        />
      )}

      {!isAuth && isFullscreen && (
        effectivePage === "game"
          ? <GameRoomPage onNavigate={navigate} matchId={matchId} />
          : effectivePage === "rpsMatch"
            ? <RpsMatchPage onNavigate={navigate} />
            : effectivePage === "penaltyMatch"
              ? <PenaltyMatchPage onNavigate={navigate} />
              : <SpectatorPage onNavigate={navigate} matchId={matchId} />
      )}

      {!isAuth && !isFullscreen && (
        <>
          <TopNav currentPage={effectivePage} onNavigate={navigate} />
          <main className="flex-1 overflow-auto">
            {effectivePage === "home"          && <HomePage onNavigate={navigate} />}
            {effectivePage === "rabbitRace"    && <RabbitRacePage onNavigate={navigate} matchId={matchId} />}
            {effectivePage === "squidGame"     && <SquidGamePage onNavigate={navigate} />}
            {effectivePage === "penaltyKick"    && <PenaltyKickPage onNavigate={navigate} />}
            {effectivePage === "quizGlobal"    && <QuizGlobalPage onNavigate={navigate} matchId={matchId} />}
            {effectivePage === "categories"    && <PlayCategoriesPage onNavigate={navigate} />}
            {effectivePage === "categoryThemes" && <CategoryThemesPage onNavigate={navigate} category={pageParam} />}
            {effectivePage === "results"       && <MatchResultsPage onNavigate={navigate} matchId={matchId} />}
            {effectivePage === "leaderboard"   && <LeaderboardPage />}
            {effectivePage === "profile"       && <ProfilePage onNavigate={navigate} />}
            {effectivePage === "wallet"        && <WalletPage />}
            {effectivePage === "notifications" && <NotificationsPage onNavigate={navigate} />}
            {effectivePage === "messages"      && <MessagesPage />}
            {effectivePage === "settings"      && <SettingsPage onNavigate={navigate} />}
            {effectivePage === "admin"         && <AdminUsersPage />}
          </main>
          <Footer />
        </>
      )}

      {!isAuth && (
        <Dialog open={Boolean(rabbitInvite)} onClose={() => setRabbitInvite(null)}>
          <DialogHeader>
            <DialogTitle>{rabbitInvite?.titre ?? "Invitation Course lapin"}</DialogTitle>
          </DialogHeader>
          <DialogContent>
            <p className="text-sm text-[#64748b]">{rabbitInvite?.message}</p>
          </DialogContent>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={rabbitInviteBusy}
              onClick={async () => {
                if (!rabbitInvite) return;
                setRabbitInviteBusy(true);
                try {
                  await api.refuserInvitationCourseLapin(rabbitInvite.matchId);
                } catch {
                  // ignore
                } finally {
                  setRabbitInviteBusy(false);
                  setRabbitInvite(null);
                }
              }}
            >
              Refuser
            </Button>
            <Button
              disabled={rabbitInviteBusy}
              onClick={async () => {
                if (!rabbitInvite) return;
                setRabbitInviteBusy(true);
                try {
                  const result = await api.accepterInvitationCourseLapin(rabbitInvite.matchId);
                  const id = Number(result.accepterInvitationCourseLapin?.id ?? rabbitInvite.matchId);
                  sessionStorage.setItem("rabbit_match_id", String(id));
                  setRabbitInvite(null);
                  navigate("rabbitRace", id);
                } catch {
                  sessionStorage.setItem("rabbit_match_id", String(rabbitInvite.matchId));
                  setRabbitInvite(null);
                  navigate("rabbitRace", rabbitInvite.matchId);
                } finally {
                  setRabbitInviteBusy(false);
                }
              }}
            >
              Accepter
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {!isAuth && (
        <Dialog open={Boolean(quizInvite)} onClose={closeQuizInvite}>
          <DialogHeader className="relative">
            <DialogTitle>🎯 Invitation Quizz Global</DialogTitle>
            <button
              onClick={closeQuizInvite}
              aria-label="Fermer"
              className="absolute right-5 top-4 text-[#64748b] hover:text-[#2D3142]"
            >
              <X size={20} />
            </button>
          </DialogHeader>
          <DialogContent>
            <p className="text-sm text-[#64748b]">
              {quizInvite?.playerA?.pseudo} vous invite à un duel Quizz Global de{" "}
              {quizInvite?.targetQuestions} questions. Confirmez pour rejoindre la partie.
            </p>
          </DialogContent>
          <DialogFooter>
            <Button variant="outline" disabled={quizInviteBusy} onClick={() => void refuseQuizInvite()}>
              Refuser
            </Button>
            <Button disabled={quizInviteBusy} onClick={() => void confirmQuizInvite()}>
              Confirmer
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </AuthProvider>
  );
}
