import { Eye, Play, Users, TrendingUp } from "lucide-react";
import { useMemo, useState, useRef, useEffect } from "react";
import { Badge, Button, Card, CardContent, Avatar, AvatarFallback, Skeleton, Input } from "../components/ui";
import { api } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { displayName, initial, themeColor } from "../lib/format";
import UserName from "../components/UserName";
import type { NavigateFn } from "../App";
import ChatPanel from "../components/chat/ChatPanel";
import { useAuth } from "../lib/auth";
import usePageTitle from "@/lib/usePageTitle";

interface SpectatorPageProps {
  onNavigate: NavigateFn;
  matchId?: number | null;
}

export default function SpectatorPage({ onNavigate, matchId }: SpectatorPageProps) {
  usePageTitle("Spectateur");
  const { user } = useAuth();
  const live = useAsync(() => api.partiesEnCours().then((d) => d.partiesEnCours), []);
  const matches = live.data ?? [];
  const selectedId = matchId ?? matches[0]?.id ?? null;
  const selectedMatch = useMemo(
    () => matches.find((m) => String(m.id) === String(selectedId)) ?? matches[0] ?? null,
    [matches, selectedId],
  );

  const currentQuestion = selectedMatch?.tourEnCours?.question;

  // État pour les paris
  const [selectedJoueurId, setSelectedJoueurId] = useState<number | null>(null);
  const [montantMise, setMontantMise] = useState<string>("");
  const [bettingLoading, setBettingLoading] = useState(false);
  const [betError, setBetError] = useState<string | null>(null);

  // Charger les paris du match sélectionné
  const paris = useAsync(
    () => (selectedMatch ? api.parisMatch(Number(selectedMatch.id)) : Promise.resolve({ parisMatch: [] })),
    [selectedMatch?.id],
  );
  const parisData = paris.data?.parisMatch ?? [];

  const peutParier = selectedMatch?.statut === "en_cours" && 
                     selectedMatch?.joueurInvite !== null && 
                     selectedMatch?.joueurInvite !== undefined &&
                     !selectedMatch?.premierTiersAtteint &&
                     user &&
                     Number(user.id) !== Number(selectedMatch.joueurHote.id) &&
                     Number(user.id) !== Number(selectedMatch.joueurInvite.id);

  const handlePlacerPari = async () => {
    if (!selectedMatch || !selectedJoueurId || !montantMise) return;
    
    setBettingLoading(true);
    setBetError(null);
    
    try {
      const montant = parseFloat(montantMise);
      if (isNaN(montant) || montant <= 0) {
        setBetError("Montant invalide");
        setBettingLoading(false);
        return;
      }

      await api.placerPari(Number(selectedMatch.id), selectedJoueurId, montant);
      setMontantMise("");
      setSelectedJoueurId(null);
      // Recharger les paris
      paris.reload();
    } catch (error: any) {
      setBetError(error?.message || "Erreur lors du placement du pari");
    } finally {
      setBettingLoading(false);
    }
  };

  // WebSocket pour recevoir les événements de paris en temps réel
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!selectedMatch) return;
    
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("access_token") : null;
    const apiBase =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  "https://quizz-leka.onrender.com/graphql/";
    const wsBase = (import.meta.env.VITE_WS_URL as string | undefined) || apiBase.replace(/^http/, "ws");
    const url = `${wsBase}/ws/match/${String(selectedMatch.id)}/?token=${encodeURIComponent(token ?? "")}`;
    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data) as { event_type?: string; pari?: any };
        if (payload.event_type === "nouveau_pari" && payload.pari) {
          // Recharger les paris quand un nouveau pari est placé
          paris.reload();
        }
      } catch (err) {
        // ignore
      }
    };

    ws.onclose = () => {
      socketRef.current = null;
    };

    return () => {
      try {
        ws.close();
      } catch {
        // ignore
      }
      socketRef.current = null;
    };
  }, [selectedMatch?.id]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F9F9F9]">
      <div className="bg-[#2D3142] text-white px-4 py-2 flex items-center gap-3 shrink-0">
        <Badge variant="live">LIVE</Badge>
        <span className="text-sm font-medium">
          {selectedMatch ? `${displayName(selectedMatch.joueurHote)} vs ${selectedMatch.joueurInvite ? displayName(selectedMatch.joueurInvite) : "…"}` : "Aucun match en direct"}
        </span>
        <div className="flex items-center gap-1 ml-auto text-white/60">
          <Eye size={14} />
          <span className="text-sm">{matches.length} en direct</span>
        </div>
        <div className="ml-4">
          <Button variant="outline" size="sm" onClick={() => onNavigate("categories")}>Quitter</Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-full max-w-[420px] border-r border-[#E8E8E8] bg-white/60 overflow-y-auto p-3 md:p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#2D3142]">Matchs en direct</h2>
            <Button variant="outline" size="sm" onClick={() => onNavigate("categories")}>Catégories</Button>
          </div>

          {live.loading && <Skeleton className="h-28 rounded-2xl mb-3" />}
          {!live.loading && matches.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#D9D9D9] p-6 text-sm text-[#A0A0A0] text-center">
              Aucun match n’est en cours pour le moment.
            </div>
          )}

          <div className="flex flex-col gap-3">
            {(matches ?? []).map((m) => {
              const active = String(m.id) === String(selectedId);
              return (
                <button
                  key={m.id}
                  onClick={() => onNavigate("spectator", Number(m.id))}
                  className={`w-full text-left rounded-2xl border p-3 transition-all ${active ? "border-[#FF6B35] bg-[#FF6B35]/5 shadow-sm" : "border-[#E8E8E8] bg-white hover:border-[#FF6B35]/40"}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: themeColor(m.theme.nom) }}>
                        {initial(m.joueurHote.pseudo)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#2D3142] truncate"><UserName user={m.joueurHote} /></p>
                        <p className="text-[10px] text-[#A0A0A0]">vs {m.joueurInvite ? displayName(m.joueurInvite) : "En attente"}</p>
                      </div>
                    </div>
                    <Badge variant="live" className="text-[9px]">LIVE</Badge>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#A0A0A0]">
                    <span>{m.theme.nom}</span>
                    <span>{m.scoreHote}-{m.scoreInvite}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex gap-4">
          {!selectedMatch && !live.loading && (
            <div className="h-full flex items-center justify-center text-sm text-[#A0A0A0]">Choisissez un match pour assister à la partie.</div>
          )}

          {selectedMatch && (
            <div className="max-w-4xl mx-auto flex flex-1 gap-4">
              <div className="bg-white border border-[#E8E8E8] rounded-3xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#F5F5F5]">
                  <div className="flex items-center gap-2">
                    <Badge variant="live">LIVE</Badge>
                    <span className="text-xs text-[#A0A0A0]">{selectedMatch.theme.nom} · objectif {selectedMatch.scoreCible}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#A0A0A0] text-xs">
                    <Users size={12} /> {selectedMatch.joueurInvite ? "2 joueurs" : "1 joueur"}
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
                    <div className="flex items-center gap-3">
                      <Avatar size="lg" online={selectedMatch.joueurHote.enLigne}>
                        <AvatarFallback>{initial(selectedMatch.joueurHote.pseudo)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs text-[#A0A0A0]">Joueur 1</p>
                        <p className="font-bold text-[#2D3142]"><UserName user={selectedMatch.joueurHote} /></p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-2xl font-black text-[#2D3142] tabular-nums">
                      <span>{selectedMatch.scoreHote}</span>
                      <span className="text-[#A0A0A0]">-</span>
                      <span>{selectedMatch.scoreInvite ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-[#A0A0A0]">Joueur 2</p>
                        <p className="font-bold text-[#2D3142]">{selectedMatch.joueurInvite ? <UserName user={selectedMatch.joueurInvite} /> : "En attente"}</p>
                      </div>
                      <Avatar size="lg" online={selectedMatch.joueurInvite?.enLigne}>
                        <AvatarFallback>{initial(selectedMatch.joueurInvite?.pseudo)}</AvatarFallback>
                      </Avatar>
                    </div>
                  </div>

                  {currentQuestion ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl bg-[#F5F5F5] p-4 border border-[#E8E8E8]">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#A0A0A0]">Question {selectedMatch.tourEnCours?.numero ?? 1}</span>
                          <span className="text-xs text-[#A0A0A0]">{currentQuestion.theme.nom}</span>
                        </div>
                        <p className="text-lg font-bold text-[#2D3142] leading-relaxed">{currentQuestion.texte}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {currentQuestion.choix.map((option, index) => (
                          <div key={option.id} className="rounded-2xl border border-[#D9D9D9] bg-white p-3 text-sm text-[#2D3142] font-medium">
                            <span className="mr-2 text-[#FF6B35] font-bold">{["A", "B", "C", "D"][index]}.</span>
                            {option.texte}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#D9D9D9] bg-[#F9F9F9] p-8 text-center text-sm text-[#A0A0A0]">
                      La question du tour en cours va bientôt s'afficher.
                    </div>
                  )}
                </div>
              </div>

              {/* Section Paris */}
              <div className="w-[320px] bg-white border border-[#E8E8E8] rounded-3xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#F5F5F5] bg-linear-to-r from-[#FF6B35]/10 to-[#2D3142]/10">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-[#FF6B35]" />
                    <span className="text-sm font-bold text-[#2D3142]">Paris en direct</span>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {peutParier ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-[#A0A0A0] mb-2 block">Choisir le vainqueur</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setSelectedJoueurId(Number(selectedMatch.joueurHote.id))}
                            className={`p-3 rounded-xl border-2 text-center transition-all ${
                              selectedJoueurId === Number(selectedMatch.joueurHote.id)
                                ? "border-[#FF6B35] bg-[#FF6B35]/10"
                                : "border-[#E8E8E8] hover:border-[#FF6B35]/40"
                            }`}
                          >
                            <p className="text-xs font-bold text-[#2D3142]"><UserName user={selectedMatch.joueurHote} /></p>
                            <p className="text-[10px] text-[#A0A0A0]">Cote 2.00</p>
                          </button>
                          {selectedMatch.joueurInvite && (
                            <button
                              onClick={() => setSelectedJoueurId(Number(selectedMatch.joueurInvite?.id))}
                              className={`p-3 rounded-xl border-2 text-center transition-all ${
                                selectedJoueurId === Number(selectedMatch.joueurInvite?.id)
                                  ? "border-[#FF6B35] bg-[#FF6B35]/10"
                                  : "border-[#E8E8E8] hover:border-[#FF6B35]/40"
                              }`}
                            >
                              <p className="text-xs font-bold text-[#2D3142]"><UserName user={selectedMatch.joueurInvite} /></p>
                              <p className="text-[10px] text-[#A0A0A0]">Cote 2.00</p>
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-[#A0A0A0] mb-2 block">Montant de la mise (Ar)</label>
                        <Input
                          type="number"
                          value={montantMise}
                          onChange={(e) => setMontantMise(e.target.value)}
                          placeholder="Ex: 1000"
                          className="w-full"
                          min="100"
                          step="100"
                        />
                      </div>

                      {betError && (
                        <div className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">
                          {betError}
                        </div>
                      )}

                      <Button
                        onClick={handlePlacerPari}
                        disabled={!selectedJoueurId || !montantMise || bettingLoading}
                        className="w-full gap-2"
                      >
                        {bettingLoading ? "Traitement..." : "Placer mon pari"}
                      </Button>

                      <p className="text-[10px] text-[#A0A0A0] text-center">
                        Les paris sont fermés dès qu'un joueur atteint 1/3 du score cible.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-xs text-[#A0A0A0]">
                        {selectedMatch?.statut !== "en_cours" 
                          ? "Les paris ne sont ouverts que pendant le match"
                          : selectedMatch?.premierTiersAtteint
                          ? "Les paris sont fermés (1/3 du score atteint)"
                          : "Vous ne pouvez pas parier sur votre propre match"}
                      </p>
                    </div>
                  )}

                  <div className="border-t border-[#F5F5F5] pt-4">
                    <p className="text-xs font-semibold text-[#A0A0A0] mb-3">Paris en cours ({parisData.length})</p>
                    <div className="space-y-2 max-h-50 overflow-y-auto">
                      {parisData.length === 0 ? (
                        <p className="text-xs text-[#A0A0A0] text-center py-2">Aucun pari pour le moment</p>
                      ) : (
                        parisData.map((pari) => (
                          <div key={pari.id} className="flex items-center justify-between p-2 bg-[#F9F9F9] rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[#2D3142] text-white text-[10px] flex items-center justify-center font-bold">
                                {initial(pari.joueurPari.pseudo)}
                              </div>
                              <div>
                                <p className="text-xs font-medium text-[#2D3142]"><UserName user={pari.joueurPari} /></p>
                                <p className="text-[10px] text-[#A0A0A0]">{pari.montant} Ar</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-[#FF6B35]">x{pari.cote}</p>
                              <p className="text-[10px] text-[#A0A0A0]">{pari.statut}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="w-[360px] hidden md:block">
            <ChatPanel spectators={matches.length} className="h-full" inputId="spectator-chat-input" matchId={selectedMatch?.id ?? null} />
          </div>
        </div>
      </div>
    </div>
  );
}
