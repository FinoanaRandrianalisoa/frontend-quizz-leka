import { useState } from "react";
import { ArrowLeft, Trophy, Check, X, Clock, Star, Sparkles } from "lucide-react";
import { Button, Card, CardContent, Avatar, AvatarFallback, Badge, Skeleton } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useAsync } from "../lib/hooks";
import { initial } from "../lib/format";
import UserName from "../components/UserName";
import type { NavigateFn } from "../App";
import usePageTitle from "@/lib/usePageTitle";

export default function MatchResultsPage({ onNavigate, matchId }: { onNavigate: NavigateFn; matchId: number | null }) {
  usePageTitle("Match Results");
  const { user } = useAuth();
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const result = useAsync(async () => {
    if (matchId) return (await api.matchParId(matchId)).matchParId;
    const list = (await api.mesParties()).mesParties;
    return list.find(m => m.statut === "termine") ?? list[0] ?? null;
  }, [matchId]);

  const m = result.data;
  if (result.loading) return <div className="p-10"><Skeleton className="h-64 rounded-2xl" /></div>;
  if (!m) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-[#A0A0A0]">Aucun résultat à afficher.</p>
        <Button onClick={() => onNavigate("categories")}>Retour aux catégories</Button>
      </div>
    );
  }

  const won = m.vainqueur?.id === user?.id;
  const opp = m.joueurHote.id === user?.id ? m.joueurInvite : m.joueurHote;

  const publishVictory = async () => {
    if (!won || !m) return;
    setPublishing(true);
    try {
      const message = `🏆 J’ai atteint l’objectif de ${m.scoreCible} points dans le thème ${m.theme.nom} et je viens de remporter la partie !`;
      await api.publier(message);
      setPublished(true);
    } catch (error) {
      console.error(error);
      alert("La publication de la victoire n’a pas pu être envoyée.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex flex-col items-center justify-center px-4 py-8 pb-20 md:pb-8">
      <div className="w-full max-w-xl">
        <div className={`rounded-2xl p-8 text-center text-white mb-6 ${won ? "bg-gradient-to-br from-[#004E89] to-[#002952]" : "bg-gradient-to-br from-[#D62828] to-[#8B0000]"}`}>
          <div className="text-5xl mb-3">{m.statut === "annule" ? "🤝" : won ? "🏆" : "😔"}</div>
          <h1 className="text-3xl font-extrabold mb-1">{m.statut === "annule" ? "Match nul" : won ? "Victoire !" : "Défaite"}</h1>
          <p className="text-white/70 mb-6">{m.theme.nom}</p>
          <div className="flex items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <Avatar size="lg"><AvatarFallback>{initial(m.joueurHote.pseudo)}</AvatarFallback></Avatar>
              <span className="font-semibold text-sm"><UserName user={m.joueurHote} /></span>
              <span className="text-4xl font-black tabular-nums text-[#FFD700]">{m.scoreHote}</span>
            </div>
            <span className="text-2xl font-bold text-white/40">VS</span>
            <div className="flex flex-col items-center gap-2">
              <Avatar size="lg"><AvatarFallback>{initial(m.joueurInvite?.pseudo)}</AvatarFallback></Avatar>
              <span className="font-semibold text-sm">{m.joueurInvite ? <UserName user={m.joueurInvite} /> : "—"}</span>
              <span className="text-4xl font-black tabular-nums text-white/60">{m.scoreInvite}</span>
            </div>
          </div>
        </div>

        {won && (
          <Card className="mb-4 border-[#06A77D]/30 bg-[#06A77D]/5">
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[#06A77D]">
                <Sparkles size={18} />
                <h3 className="font-bold text-[#2D3142]">Félicitations !</h3>
              </div>
              <p className="text-sm text-[#2D3142]">
                Vous avez atteint le score cible de {m.scoreCible} points et gagné la partie.
              </p>
              {!published && (
                <Button size="sm" className="self-start" onClick={() => void publishVictory()} loading={publishing}>
                  Publier ma victoire
                </Button>
              )}
              {published && (
                <Badge variant="won" className="self-start">Victoire publiée</Badge>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="mb-4">
          <CardContent className="p-4 flex flex-col gap-3">
            <h3 className="font-bold text-[#2D3142]">Résumé</h3>
            {[
              { label: "Score hôte", value: String(m.scoreHote), icon: Check, color: "#06A77D" },
              { label: "Score invité", value: String(m.scoreInvite), icon: X, color: "#D62828" },
              { label: "Objectif", value: String(m.scoreCible), icon: Star, color: "#FFD700" },
              { label: "Tours", value: String(m.tourActuel), icon: Clock, color: "#FF6B35" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + "20" }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <span className="text-sm text-[#A0A0A0] flex-1">{label}</span>
                <span className="text-sm font-bold text-[#2D3142]">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {opp && (
          <Card className="mb-6">
            <CardContent className="p-4 flex items-center gap-3">
              <Avatar size="md"><AvatarFallback>{initial(opp.pseudo)}</AvatarFallback></Avatar>
              <div className="flex-1">
                <p className="font-semibold text-sm text-[#2D3142]"><UserName user={opp} /></p>
                <Badge variant="category">Adversaire</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" size="lg" className="flex-1 gap-2" onClick={() => onNavigate("categories")}>
            <ArrowLeft size={18} /> Retour aux catégories
          </Button>
          <Button size="lg" className="flex-1 gap-2" onClick={() => onNavigate("categories")}>
            <Trophy size={18} /> Nouvelle partie
          </Button>
        </div>
      </div>
    </div>
  );
}
