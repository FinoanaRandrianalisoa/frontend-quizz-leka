import { Crown, Medal, Trophy, TrendingUp, Swords } from "lucide-react";
import { Avatar, AvatarFallback, Badge, Card, CardContent, Tabs, TabsList, TabsTrigger, TabsContent, Progress } from "../components/ui";
import { api } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { initial } from "../lib/format";
import UserName from "../components/UserName";
import usePageTitle from "@/lib/usePageTitle";

const podiumColors: Record<number, { bg: string; text: string; icon: typeof Crown }> = {
  1: { bg: "bg-[#FFD700]/10 border-[#FFD700]/30", text: "text-[#FFD700]", icon: Crown },
  2: { bg: "bg-[#C0C0C0]/10 border-[#C0C0C0]/30", text: "text-[#C0C0C0]", icon: Medal },
  3: { bg: "bg-[#CD7F32]/10 border-[#CD7F32]/30", text: "text-[#CD7F32]", icon: Trophy },
};

export default function LeaderboardPage() {
  usePageTitle("Classement");
  const board = useAsync(() => api.classement(10).then((d) => d.classement), []);
  const rows = board.data ?? [];
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 pb-20 md:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#2D3142]">Classement</h1>
        <p className="text-sm text-[#A0A0A0]">Les meilleurs joueurs Quizz Leka selon les données du serveur</p>
      </div>

      <Tabs defaultValue="global" className="mb-6">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="global">Global</TabsTrigger>
          <TabsTrigger value="weekly">Semaine</TabsTrigger>
          <TabsTrigger value="friends">Amis</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="mt-6">
          {board.loading && <div className="text-sm text-[#A0A0A0]">Chargement du classement…</div>}

          {!board.loading && rows.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[top3[1], top3[0], top3[2]].map((entry, gridIdx) => {
                  const actualRank = gridIdx === 0 ? 2 : gridIdx === 1 ? 1 : 3;
                  const { bg, text, icon: RankIcon } = podiumColors[actualRank];
                  const heights = ["h-24", "h-32", "h-20"];
                  if (!entry) return null;

                  return (
                    <div key={entry.utilisateur.id} className="flex flex-col items-center gap-2">
                      <Avatar size={actualRank === 1 ? "xl" : "lg"}>
                        <AvatarFallback>{initial(entry.utilisateur.pseudo)}</AvatarFallback>
                      </Avatar>
                      <p className="text-xs font-semibold text-[#2D3142] text-center truncate w-full px-1"><UserName user={entry.utilisateur} /></p>
                      <p className="text-sm font-bold text-[#FF6B35]">{entry.victoires}V</p>
                      <div className={`w-full ${heights[gridIdx]} rounded-t-xl border-2 ${bg} flex flex-col items-center justify-center gap-1`}>
                        <RankIcon size={20} className={text} />
                        <span className={`text-lg font-black ${text}`}>{actualRank}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Card>
                <CardContent className="p-0">
                  {rows.map((entry, i) => {
                    const colors = podiumColors[entry.rang];
                    return (
                      <div
                        key={entry.utilisateur.id}
                        className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#F5F5F5]
                          ${i < rows.length - 1 ? "border-b border-[#F5F5F5]" : ""}`}
                      >
                        <div className="w-6 shrink-0">
                          {colors ? (
                            <colors.icon size={16} className={colors.text} />
                          ) : (
                            <span className="text-sm text-[#A0A0A0] font-medium">{entry.rang}</span>
                          )}
                        </div>
                        <Avatar size="sm">
                          <AvatarFallback>{initial(entry.utilisateur.pseudo)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[#2D3142] truncate"><UserName user={entry.utilisateur} /></p>
                            {entry.utilisateur.role === "ADMIN" && <Badge variant="category">Admin</Badge>}
                          </div>
                          <p className="text-[10px] text-[#A0A0A0]">{entry.parties} parties · {entry.victoires}V · {entry.defaites}D</p>
                        </div>
                        <div className="hidden sm:flex flex-col items-end gap-1 w-20">
                          <span className="text-xs text-[#A0A0A0]">WR {entry.tauxReussite}%</span>
                          <Progress value={entry.tauxReussite} className="h-1" color={entry.tauxReussite >= 80 ? "#06A77D" : entry.tauxReussite >= 60 ? "#FF6B35" : "#A0A0A0"} />
                        </div>
                        <span className="text-sm font-bold text-[#FF6B35] tabular-nums shrink-0">{entry.victoires}V</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </>
          )}

          {!board.loading && rows.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#D9D9D9] bg-white p-8 text-center text-sm text-[#A0A0A0]">
              Aucun classement disponible pour le moment.
            </div>
          )}
        </TabsContent>

        <TabsContent value="weekly" className="mt-6">
          <div className="flex flex-col items-center gap-3 py-12 text-[#A0A0A0]">
            <TrendingUp size={40} className="opacity-30" />
            <p className="font-medium">Classement hebdomadaire</p>
            <p className="text-sm">Réinitialisation chaque lundi à 00h00</p>
          </div>
        </TabsContent>

        <TabsContent value="friends" className="mt-6">
          <div className="flex flex-col items-center gap-3 py-12 text-[#A0A0A0]">
            <Swords size={40} className="opacity-30" />
            <p className="font-medium">Aucun ami ajouté</p>
            <p className="text-sm">Ajoutez des amis pour voir leur classement</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
