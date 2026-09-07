import { useEffect, useRef, useState } from "react";
import {
  Home, Gamepad2, Trophy, Wallet, User, Bell,
  MessageCircle,
  LogOut, Settings, ChevronDown, Shield, Search, UserPlus,
  Check, X
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, Tooltip, useToast } from "../ui";
import { useAuth } from "../../lib/auth";
import { BACKEND_URL, GRAPHQL_URL, WS_URL } from '@/config/backend'
import { initial, relativeTime } from "../../lib/format";
import { errMsg } from "../../lib/hooks";
import { api } from "../../lib/api";
import UserName from "../UserName";
import type { DemandeAmi } from "../../lib/api";
import type { NavigateFn } from "../../App";

interface TopNavProps {
  currentPage: string;
  onNavigate: NavigateFn;
}

const navLinks = [
  { id: "home",        label: "Accueil",     icon: Home },
  { id: "categories",  label: "Jouer",       icon: Gamepad2 },
  { id: "leaderboard", label: "Classement",  icon: Trophy },
  { id: "messages",    label: "Messages",    icon: MessageCircle },
  { id: "wallet",      label: "Wallet",      icon: Wallet },
];

function UserAvatar({ user, size = "sm", online }: { user?: { pseudo?: string | null; photoProfil?: string | null } | null; size?: "sm" | "md" | "lg" | "xl"; online?: boolean }) {
  return (
    <Avatar size={size} online={online}>
      {user?.photoProfil ? <AvatarImage src={user.photoProfil} alt={user.pseudo ?? ""} /> : <AvatarFallback>{initial(user?.pseudo ?? "?")}</AvatarFallback>}
    </Avatar>
  );
}

export default function TopNav({ currentPage, onNavigate }: TopNavProps) {
  const { user, isAdmin, logout } = useAuth();
  const toast = useToast();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [inviteMenuOpen, setInviteMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalSearchFocused, setGlobalSearchFocused] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [usersFilter, setUsersFilter] = useState("");
  const inviteErrorTimer = useRef<number | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [friendRequests, setFriendRequests] = useState<DemandeAmi[]>([]);
  const [sentRequests, setSentRequests] = useState<DemandeAmi[]>([]);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; pseudo: string; enLigne?: boolean; villeOrigine?: string | null; role?: string }>>([]);
  const [friends, setFriends] = useState<Array<{ id: string }>>([]);

  const loadInviteData = async () => {
    try {
      const [friendsResponse, requestsResponse, sentResponse, usersResponse] = await Promise.all([
        api.mesAmis(),
        api.demandesAmisRecues(),
        api.demandesAmisEnvoyees(),
        api.utilisateurs(),
      ]);

      setFriends(friendsResponse.mesAmis ?? []);
      setFriendRequests(requestsResponse.demandesAmisRecues ?? []);
      setSentRequests(sentResponse.demandesAmisEnvoyees ?? []);
      setAllUsers(usersResponse.utilisateurs ?? []);
    } catch {
      setFriends([]);
      setFriendRequests([]);
      setSentRequests([]);
      setAllUsers([]);
    }
  };

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      try {
        const response = await api.mesNotifications(20);
        if (!active) return;
        const unread = (response.mesNotifications ?? []).filter((item) => !item.lu).length;
        setNotificationCount(unread);
      } catch {
        // silent: the UI keeps the badge available without disrupting the flow
      }
    };

    const loadUnreadMessages = async () => {
      try {
        const resp = await api.nbMessagesNonLus();
        if (!active) return;
        setUnreadMessagesCount(resp.nbMessagesNonLus ?? 0);
      } catch {
        // ignore
      }
    };

    const token = localStorage.getItem("access_token");
    void loadNotifications();
    void loadUnreadMessages();

    if (!token) return;

    const apiBase = GRAPHQL_URL;
    const apiRoot = BACKEND_URL;
    const wsBase = WS_URL;

    let socket: WebSocket | null = null;
    let reconnectAttempts = 0;
    let shouldStop = false;

    const scheduleReconnect = () => {
      if (shouldStop) return;
      reconnectAttempts += 1;
      const delay = Math.min(30000, Math.pow(2, Math.min(6, reconnectAttempts)) * 1000);
      // debug
      // console.info(`WebSocket reconnect attempt ${reconnectAttempts} in ${delay}ms`);
      window.setTimeout(() => {
        if (!shouldStop) connect();
      }, delay);
    };

    const connect = () => {
      const url = `${wsBase}/ws/notifications/?token=${encodeURIComponent(token)}`;
      try {
        socket = new WebSocket(url);
      } catch (err) {
        console.error("WebSocket: failed to create socket", err);
        scheduleReconnect();
        return;
      }

      socket.onopen = () => {
        reconnectAttempts = 0;
        console.info("WebSocket connected to", url);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as { type?: string; message?: string; titre?: string; lu?: boolean; id?: string | number };
          if (!payload || typeof payload !== "object") return;
          if (payload.lu === true) return;
          if (payload.type === "message") {
            setUnreadMessagesCount((c) => c + 1);
          } else {
            setNotificationCount((current) => current + 1);
          }
          window.dispatchEvent(new CustomEvent("notifications:refresh", { detail: payload }));
        } catch (e) {
          setNotificationCount((current) => current + 1);
          window.dispatchEvent(new CustomEvent("notifications:refresh"));
        }
      };

      socket.onerror = (e) => {
        console.error("WebSocket error", e);
      };

      socket.onclose = (ev) => {
        if (shouldStop) return;
        console.warn("WebSocket closed", ev);
        scheduleReconnect();
      };
    };

    connect();

    const interval = window.setInterval(() => {
      void loadNotifications();
      void loadUnreadMessages();
    }, 8000);

    const onMessagesRead = () => {
      void loadUnreadMessages();
    };

    const onNotificationsRefresh = () => {
      void loadNotifications();
    };

    window.addEventListener("messagesRead", onMessagesRead as EventListener);
    window.addEventListener("notifications:refresh", onNotificationsRefresh as EventListener);

    return () => {
      active = false;
      shouldStop = true;
      try {
        socket?.close();
      } catch {}
      window.clearInterval(interval);
      window.removeEventListener("messagesRead", onMessagesRead as EventListener);
      window.removeEventListener("notifications:refresh", onNotificationsRefresh as EventListener);
    };
  }, []);

  useEffect(() => {
    if (inviteMenuOpen) void loadInviteData();
  }, [inviteMenuOpen]);

  useEffect(() => {
    if (globalSearch.trim()) void loadInviteData();
  }, [globalSearch]);

  const sentByUser = new Map(sentRequests.map((d) => [d.receveur?.id, d]));

  const candidateUsers = allUsers
    .filter((item) => {
      if (item.id === user?.id) return false;
      if (item.role === "ADMIN") return false;
      if (friends.some((friend) => friend.id === item.id)) return false;
      const term = usersFilter.trim().toLowerCase();
      if (!term) return true;
      return item.pseudo.toLowerCase().includes(term) || (item.villeOrigine ?? "").toLowerCase().includes(term);
    })
    .slice(0, 50);

  const globalResults = allUsers
    .filter((item) => {
      if (item.id === user?.id) return false;
      if (item.role === "ADMIN") return false;
      if (friends.some((friend) => friend.id === item.id)) return false;
      const term = globalSearch.trim().toLowerCase();
      if (!term) return true;
      return item.pseudo.toLowerCase().includes(term) || (item.villeOrigine ?? "").toLowerCase().includes(term);
    })
    .slice(0, 10);

  const reportError = (err: unknown) => {
    const message = errMsg(err);
    setInviteError(message);
    toast.toast("error", message);
    if (inviteErrorTimer.current) window.clearTimeout(inviteErrorTimer.current);
    inviteErrorTimer.current = window.setTimeout(() => setInviteError(""), 5000);
  };

  useEffect(() => {
    return () => {
      if (inviteErrorTimer.current) window.clearTimeout(inviteErrorTimer.current);
    };
  }, []);

  const sendInvite = async (pseudo: string) => {
    try {
      setInviteError("");
      await api.envoyerDemandeAmi(pseudo);
      await loadInviteData();
    } catch (err) {
      reportError(err);
    }
  };

  const answerInvite = async (id: number, accepter: boolean) => {
    try {
      await api.repondreDemandeAmi(id, accepter);
      await loadInviteData();
    } catch (err) {
      reportError(err);
    }
  };

  const go = (page: string) => {
    onNavigate(page);
    setUserMenuOpen(false);
    setInviteMenuOpen(false);
    setGlobalSearchFocused(false);
  };

  const closeInvite = () => {
    setInviteMenuOpen(false);
    setInviteError("");
  };

  return (
    <header className="relative sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-[#d9e7dd] shadow-sm">
      <div className="h-16 flex items-center px-3 md:px-6 gap-2 md:gap-4">
        <button onClick={() => go("home")} className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#16a34a] flex items-center justify-center shadow-md shadow-[#16a34a]/25">
            <Gamepad2 size={16} className="text-white" />
          </div>
          <span className="font-black text-[#1f2a1f] text-lg hidden md:block">
            Quizz<span className="text-[#15803d]">Mada</span>
          </span>
        </button>

        <nav className="hidden lg:flex items-center gap-1 shrink-0">
          {navLinks.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => go(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200
                ${currentPage === id
                  ? "text-[#15803d] bg-[#16a34a]/10"
                  : "text-[#64748b] hover:text-[#1f2a1f] hover:bg-[#f3faf4]"
                }`}
            >
              <Icon size={16} />
              <span className="ml-1">{label}</span>
              {id === "messages" && unreadMessagesCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-[#ef4444] text-white text-[10px] px-2 py-0.5 font-semibold">{unreadMessagesCount}</span>
              )}
            </button>
          ))}
          {isAdmin && (
            <button
              onClick={() => go("admin")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200
                ${currentPage === "admin" ? "text-[#15803d] bg-[#16a34a]/10" : "text-[#64748b] hover:text-[#1f2a1f] hover:bg-[#f3faf4]"}`}
            >
              <Shield size={16} />
              Admin
            </button>
          )}
        </nav>

        <div className="relative flex-1 min-w-0 mx-1 sm:mx-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
          <input
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            onFocus={() => setGlobalSearchFocused(true)}
            onBlur={() => window.setTimeout(() => setGlobalSearchFocused(false), 150)}
            placeholder="Rechercher un joueur…"
            className="w-full rounded-full border border-[#d9e7dd] bg-[#f9fdf9] pl-9 pr-8 py-2 text-sm text-[#1f2a1f] outline-none placeholder:text-[#64748b] focus:ring-2 focus:ring-[#16a34a]/20"
          />
          {globalSearch && (
            <button
              onClick={() => setGlobalSearch("")}
              aria-label="Effacer la recherche"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-[#1f2a1f]"
            >
              <X size={15} />
            </button>
          )}

          {globalSearchFocused && (
            <div className="absolute left-0 right-0 top-full mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-[#d9e7dd] bg-white shadow-xl z-50 p-2">
              {inviteError && (
                <p className="px-2 pb-2 text-xs font-medium text-[#D62828]">{inviteError}</p>
              )}
              <p className="px-2 pt-1 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748b]">Joueurs</p>
              {globalResults.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#d9e7dd] bg-[#f9fdf9] p-3 text-sm text-[#64748b]">
                  Aucun joueur trouvé.
                </div>
              ) : (
                <div className="space-y-1">
                  {globalResults.map((item) => {
                    const sent = sentByUser.get(item.id);
                    return (
                      <div key={item.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-[#f9fdf9]">
                        <UserAvatar user={item} online={item.enLigne} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#1f2a1f]"><UserName user={item} /></p>
                          <p className="truncate text-[10px] text-[#64748b]">{item.villeOrigine || "Ville non renseignée"}</p>
                        </div>
                        {sent ? (
                          <span className="shrink-0 text-[11px] font-semibold text-[#15803d]">
                            Envoyée {relativeTime(sent.creeLe)}
                          </span>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => void sendInvite(item.pseudo)} className="shrink-0 text-[11px]">
                            Ajouter
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="hidden lg:block">
            <Tooltip label="Invitations">
              <button
                onClick={() => setInviteMenuOpen((v) => !v)}
                aria-label="Invitations"
                className="relative flex items-center gap-2 rounded-xl border border-[#d9e7dd] bg-white px-2.5 py-2 text-sm font-semibold text-[#1f2a1f] hover:bg-[#f3faf4]"
              >
                <UserPlus size={16} className="text-[#16a34a]" />
                <span className="hidden xl:inline">Invitation</span>
                {friendRequests.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#16a34a] px-1 text-[10px] font-bold text-white">
                    {friendRequests.length > 9 ? "9+" : friendRequests.length}
                  </span>
                )}
              </button>
            </Tooltip>
          </div>

          <Tooltip label="Notifications">
            <button
              onClick={() => go("notifications")}
              aria-label="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#d9e7dd] bg-white text-[#64748b] transition-colors hover:bg-[#f3faf4] hover:text-[#1f2a1f]"
            >
              <Bell size={18} />
              {notificationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#16a34a] px-1 text-[10px] font-bold text-white">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </button>
          </Tooltip>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(v => !v)}
              className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-[#f3faf4] transition-colors"
            >
              <UserAvatar user={user} online={user?.enLigne} />
              <span className="hidden sm:block text-sm font-semibold text-[#1f2a1f]"><UserName user={user} /></span>
              <ChevronDown size={14} className="text-[#64748b] hidden sm:block" />
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-[#d9e7dd] rounded-xl shadow-lg overflow-hidden z-50">
                <div className="p-3 border-b border-[#d9e7dd]">
                  <p className="font-semibold text-sm text-[#1f2a1f]"><UserName user={user} /></p>
                  <Badge variant="category" className="mt-1">{user?.role === "ADMIN" ? "Administrateur" : "Joueur"}</Badge>
                </div>
                {[
                  { icon: User, label: "Profil", page: "profile" },
                  { icon: Settings, label: "Paramètres", page: "settings" },
                  ...(isAdmin ? [{ icon: Shield, label: "Utilisateurs", page: "admin" }] : []),
                ].map(({ icon: Icon, label, page }) => (
                  <button
                    key={label}
                    onClick={() => go(page)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#1f2a1f] hover:bg-[#f3faf4] transition-colors"
                  >
                    <Icon size={16} className="text-[#64748b]" />
                    {label}
                  </button>
                ))}
                <div className="border-t border-[#d9e7dd]">
                  <button
                    onClick={() => { logout(); go("login"); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#D62828] hover:bg-[#D62828]/5 transition-colors"
                  >
                    <LogOut size={16} />
                    Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {inviteMenuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeInvite} />
          <div className="absolute left-3 right-3 sm:left-auto sm:right-6 sm:w-[400px] top-full z-50 mt-0 sm:mt-2 max-h-[80vh] overflow-y-auto rounded-2xl border border-[#d9e7dd] bg-white shadow-xl">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#edf6ef]">
              <div className="flex items-center gap-2 font-semibold text-[#1f2a1f]">
                <UserPlus size={16} className="text-[#16a34a]" />
                Invitations
              </div>
              <button onClick={closeInvite} aria-label="Fermer" className="text-[#A0A0A0] hover:text-[#1f2a1f]">
                <X size={16} />
              </button>
            </div>

            {inviteError && (
              <p className="px-4 py-2 text-xs font-medium text-[#D62828] bg-[#D62828]/5">{inviteError}</p>
            )}

            <div className="p-3 space-y-5">
              {friendRequests.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748b]">Demandes reçues ({friendRequests.length})</p>
                  <div className="space-y-2">
                    {friendRequests.map((request) => (
                      <div key={request.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-[#edf6ef] bg-[#f9fdf9] p-2">
                        <UserAvatar user={request.demandeur} />
                        <div className="min-w-0 flex-1 basis-32">
                          <p className="truncate text-sm font-semibold text-[#1f2a1f]"><UserName user={request.demandeur} /></p>
                          <p className="truncate text-[10px] text-[#64748b]">veut devenir votre ami · {relativeTime(request.creeLe)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 ml-auto">
                          <Button size="sm" variant="success" onClick={() => void answerInvite(Number(request.id), true)}>
                            <Check size={14} /> Accepter
                          </Button>
                          <Button size="sm" variant="outline" className="border-[#f3c2c2] text-[#D62828] hover:bg-[#D62828]/5" onClick={() => void answerInvite(Number(request.id), false)}>
                            <X size={14} /> Refuser
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sentRequests.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748b]">Demandes envoyées</p>
                  <div className="space-y-2">
                    {sentRequests.map((request) => (
                      <div key={request.id} className="flex items-center gap-2 rounded-xl border border-[#edf6ef] bg-[#f9fdf9] p-2">
                        <UserAvatar user={request.receveur} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#1f2a1f]"><UserName user={request.receveur} /></p>
                          <p className="truncate text-[10px] text-[#64748b]">En attente · {relativeTime(request.creeLe)}</p>
                        </div>
                        <span className="shrink-0 text-[11px] font-semibold text-[#64748b]">Envoyée ✓</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {friendRequests.length === 0 && sentRequests.length === 0 && (
                <p className="text-xs text-[#64748b]">Aucune demande en attente.</p>
              )}

              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748b]">Tous les joueurs</p>
                  <span className="text-[10px] font-semibold text-[#64748b]">{candidateUsers.length} à ajouter</span>
                </div>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
                  <input
                    value={usersFilter}
                    onChange={(e) => setUsersFilter(e.target.value)}
                    placeholder="Filtrer par nom ou ville…"
                    className="w-full rounded-xl border border-[#d9e7dd] bg-white pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#16a34a]/20"
                  />
                </div>
                {candidateUsers.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#d9e7dd] bg-[#f9fdf9] p-3 text-sm text-[#64748b]">
                    Aucun joueur à ajouter pour le moment.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {candidateUsers.map((item) => {
                      const sent = sentByUser.get(item.id);
                      return (
                        <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-[#edf6ef] p-2">
                          <UserAvatar user={item} online={item.enLigne} />
                          <div className="min-w-0 flex-1 basis-32">
                            <p className="truncate text-sm font-semibold text-[#1f2a1f]"><UserName user={item} /></p>
                            <p className="truncate text-[10px] text-[#64748b]">{item.villeOrigine || "Ville non renseignée"}</p>
                          </div>
                          {sent ? (
                            <span className="shrink-0 ml-auto text-[11px] font-semibold text-[#15803d]">Envoyée {relativeTime(sent.creeLe)}</span>
                          ) : (
                            <Button size="sm" variant="secondary" onClick={() => void sendInvite(item.pseudo)} className="shrink-0 ml-auto text-[11px]">
                              Ajouter
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="lg:hidden border-t border-[#edf6ef] bg-[#f9fdf9]">
        <div className="overflow-x-auto hide-scrollbar">
          <nav className="flex items-center justify-between gap-2 px-3 py-2">
            {navLinks.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => go(id)}
                aria-label={label}
                title={label}
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all
                  ${currentPage === id ? "bg-[#16a34a] text-white border-[#16a34a] shadow-md shadow-[#16a34a]/20" : "bg-white text-[#1f2a1f] border-[#d9e7dd]"}`}
              >
                <Icon size={18} />
                {id === "messages" && unreadMessagesCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] font-bold text-white">
                    {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                  </span>
                )}
              </button>
            ))}
            <button
              onClick={() => setInviteMenuOpen((v) => !v)}
              aria-label="Invitations"
              title="Invitations"
              className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
                inviteMenuOpen ? "bg-[#16a34a] text-white border-[#16a34a]" : "border-[#d9e7dd] bg-white text-[#1f2a1f]"
              }`}
            >
              <UserPlus size={18} />
              {friendRequests.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#16a34a] px-1 text-[10px] font-bold text-white">
                  {friendRequests.length > 9 ? "9+" : friendRequests.length}
                </span>
              )}
            </button>
            {isAdmin && (
              <button
                onClick={() => go("admin")}
                aria-label="Admin"
                title="Admin"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d9e7dd] bg-white text-[#1f2a1f]"
              >
                <Shield size={18} />
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}