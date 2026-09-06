import { useState, useEffect } from "react";
import { Search, Play, Users, Globe, Clock, Plus } from "lucide-react";
import { Badge, Button, Card, CardContent, Avatar, AvatarFallback, Skeleton } from "../components/ui";
import { api, type Theme } from "../lib/api";
import { useAsync, errMsg } from "../lib/hooks";
import { initial, themeColor } from "../lib/format";
import UserName from "../components/UserName";
import { useToast } from "../components/ui";
import type { NavigateFn } from "../App";
import usePageTitle from "@/lib/usePageTitle";

export default function LobbyPage({ onNavigate, initialThemeId }: { onNavigate: NavigateFn; initialThemeId?: string | null }) {
  usePageTitle("Lobby");
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("Quizz");
  const [joining, setJoining] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [themeId, setThemeId] = useState<string>("");
  const [scoreCible, setScoreCible] = useState<number>(8);
  const matches = useAsync(() => api.partiesDisponibles().then(d => d.partiesDisponibles), []);
  const themes = useAsync(() => api.themes().then(d => d.themes), []);
  // If navigated with a theme id param, pre-select it
  useEffect(() => {
    if (initialThemeId) setThemeId(initialThemeId);
  }, [initialThemeId]);

  const list = (matches.data ?? []).filter(m => {
    const cat = m.theme.nom.toLowerCase();
    const q = search.toLowerCase();
    const okCat = category === "Toutes" || cat.includes(category.toLowerCase());
    const okSearch = !q || m.joueurHote.pseudo.toLowerCase().includes(q) || cat.includes(q);
    return okCat && okSearch;
  });

  const joinMatch = async (id: string) => {
    setJoining(id);
    try {
      const res = await api.rejoindrePartie(Number(id));
      const match = res.rejoindrePartie;
      const idn = Number(match.id);
      const themeName = (match.theme?.nom || "").toLowerCase();
      if (themeName.includes("lapin")) {
        onNavigate("rabbitRace", idn);
      } else {
        onNavigate("game", idn);
      }
    } catch (err) {
      toast.toast("error", errMsg(err));
    } finally {
      setJoining(null);
    }
  };

  const createMatch = async (id?: string) => {
    const chosen = id || themeId || themes.data?.[0]?.id;
    const target = Number.isFinite(scoreCible) && scoreCible > 0 ? scoreCible : 8;
    if (!chosen) {
      toast.toast("warning", "Aucun thème disponible.");
      return;
    }
    setCreating(true);
    try {
      const res = await api.creerPartie(Number(chosen), target);
      onNavigate("game", Number(res.creerPartie.id));
    } catch (err) {
      toast.toast("error", errMsg(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 pb-20 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2D3142]">Parties disponibles</h1>
          <p className="text-sm text-[#A0A0A0]">{matches.data?.length ?? 0} parties en attente</p>
        </div>
        <div className="sm:ml-auto flex flex-col sm:flex-row gap-2">
          <select
            value={themeId}
            onChange={e => setThemeId(e.target.value)}
            className="pl-3 pr-4 py-2 rounded-lg border border-[#D9D9D9] bg-white text-sm"
          >
            <option value="">Thème pour créer…</option>
            {(themes.data ?? [])
              .filter(t => category === "Quizz" ? true : false)
              .map((t: Theme) => (
                <option key={t.id} value={t.id}>{t.nom} ({t.nombreQuestions})</option>
              ))}
          </select>
          <input
            type="number"
            min={1}
            value={scoreCible}
            onChange={e => setScoreCible(Math.max(1, Number(e.target.value || 1)))}
            className="w-28 pl-3 pr-2 py-2 rounded-lg border border-[#D9D9D9] bg-white text-sm text-[#2D3142] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
            aria-label="Score cible"
          />
          <Button className="gap-2" onClick={() => createMatch()} loading={creating} size="lg">
            <Plus size={18} /> Créer une partie
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A0A0]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un joueur ou catégorie..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#D9D9D9] bg-white text-sm text-[#2D3142] placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
          />
        </div>
        <div className="flex gap-2">
          {[
            "Quizz",
            "Squid Game",
            "Mozika sy Mpanankanto",
            "course lapin",
            "tir au but",
          ].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-2 rounded-lg text-sm ${category === cat ? "bg-[#16a34a] text-white" : "bg-white border border-[#D9D9D9] text-[#2D3142]"}`}
            >
              {cat}
            </button>
          ))}
        </div>
        <Button variant="outline" onClick={() => matches.reload()}>Actualiser</Button>
      </div>

      {matches.loading && <Skeleton className="h-40 rounded-2xl" />}
      {matches.error && <p className="text-sm text-[#D62828] mb-4">{matches.error}</p>}

      {!matches.loading && list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-[#A0A0A0]">
          <Search size={40} className="opacity-30" />
          <p className="font-medium">Aucune partie disponible</p>
          <p className="text-sm">Créez la vôtre et attendez un adversaire</p>
          <Button onClick={() => createMatch()} className="mt-2" loading={creating}><Plus size={16} /> Créer une partie</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map(m => (
            <Card key={m.id} className="hover:shadow-md transition-all hover:-translate-y-0.5">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Avatar size="md" online={m.joueurHote.enLigne}>
                    <AvatarFallback>{initial(m.joueurHote.pseudo)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#2D3142] truncate"><UserName user={m.joueurHote} /></p>
                    <span className="text-[10px] text-[#A0A0A0]">Objectif {m.scoreCible} pts</span>
                  </div>
                  <Badge variant="waiting">En attente</Badge>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F5F5F5]">
                  <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: themeColor(m.theme.nom) + "20" }}>
                    <Globe size={12} style={{ color: themeColor(m.theme.nom) }} />
                  </div>
                  <span className="text-sm font-medium text-[#2D3142]">{m.theme.nom}</span>
                  <div className="ml-auto flex items-center gap-1 text-[#A0A0A0]">
                    <Users size={12} />
                    <span className="text-xs">1/2</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-[#A0A0A0]" />
                  <span className="text-xs text-[#A0A0A0] flex-1">En attente d'adversaire</span>
                  <Button size="sm" loading={joining === m.id} onClick={() => joinMatch(m.id)} className="gap-1">
                    <Play size={12} /> Rejoindre
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
