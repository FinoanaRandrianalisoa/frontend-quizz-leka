import { Trophy, Star, Swords, TrendingUp, Edit2, Share2 } from "lucide-react"
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  Progress,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../components/ui"
import { api } from "../lib/api"
import { useAuth } from "../lib/auth"
import { useAsync } from "../lib/hooks"
import { initial, wrPct } from "../lib/format"
import UserName from "../components/UserName"
import usePageTitle from "@/lib/usePageTitle"

export default function ProfilePage({
  onNavigate,
}: {
  onNavigate?: (page: string) => void
}) {
  usePageTitle("Profil")
  const { user } = useAuth()
  const profil = useAsync(() => api.profil().then((d) => d.profil), [])

  const profileUser = profil.data?.utilisateur ?? user
  const parties = profil.data?.partiesJouees ?? 0
  const victoires = profil.data?.victoires ?? 0
  const winRate = profil.data?.tauxReussite ?? 0
  const xpProgress = Math.min(100, Math.round(winRate * 100))
  const niveau = Math.max(1, Math.round((victoires + parties) / 4))
  const coverUrl = profileUser?.photoCouverture || ""
  const profileImage = profileUser?.photoProfil || ""

  const achievements = [
    {
      icon: "🏆",
      label: "Premier sang",
      desc: `${victoires} victoire${victoires > 1 ? "s" : ""}`,
      unlocked: victoires >= 1,
    },
    {
      icon: "🔥",
      label: "En feu",
      desc: `${parties} parties jouées`,
      unlocked: parties >= 5,
    },
    {
      icon: "⚡",
      label: "Éclair",
      desc: `Win rate ${winRate}%`,
      unlocked: winRate >= 50,
    },
    {
      icon: "📚",
      label: "Érudit",
      desc: `${parties} essais validés`,
      unlocked: parties >= 10,
    },
    {
      icon: "👑",
      label: "Roi Mada",
      desc: `Niveau ${niveau}`,
      unlocked: niveau >= 10,
    },
    {
      icon: "💎",
      label: "Diamant",
      desc: `Gains ${profil.data?.cumulGains ?? "0"} pts`,
      unlocked: Number(profil.data?.cumulGains ?? 0) >= 100,
    },
  ]

  const stats = [
    {
      label: "Parties",
      value: String(parties),
      icon: Swords,
      color: "#FF6B35",
    },
    {
      label: "Victoires",
      value: String(victoires),
      icon: Trophy,
      color: "#FFD700",
    },
    {
      label: "Win Rate",
      value: `${winRate}%`,
      icon: TrendingUp,
      color: "#06A77D",
    },
    {
      label: "Gains",
      value: `${profil.data?.cumulGains ?? "0"}`,
      icon: Star,
      color: "#004E89",
    },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 pb-20 md:pb-8">
      <Card className="mb-6 overflow-hidden">
        <div className="h-32 relative overflow-hidden bg-gradient-to-r from-[#004E89] to-[#FF6B35]">
          {coverUrl && (
            <img
              src={coverUrl}
              alt="Couverture"
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#004E89]/80 to-[#FF6B35]/60" />
        </div>
        <CardContent className="pt-0 p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
            <div className="relative">
              <Avatar
                size="xl"
                online={profileUser?.enLigne}
                className="ring-4 ring-white bg-white"
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={profileUser?.pseudo ?? "Profil"}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <AvatarFallback>
                    {initial(profileUser?.pseudo ?? user?.pseudo)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#FFD700] rounded-full flex items-center justify-center">
                <span className="text-[9px] font-black text-[#2D3142]">
                  {niveau}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h1 className="text-xl font-bold text-[#2D3142]">
                  <UserName user={profileUser} />
                </h1>
                <Badge variant="category">Niveau {niveau}</Badge>
                <Badge variant="playing" className="hidden sm:inline-flex">
                  {profileUser?.enLigne ? "En ligne" : "Hors ligne"}
                </Badge>
              </div>
              <p className="text-sm text-[#A0A0A0] mt-0.5">
                {profileUser?.email ?? "Compte utilisateur"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Share2 size={14} /> Partager
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => onNavigate?.("settings")}
              >
                <Edit2 size={14} /> Modifier
              </Button>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-[#A0A0A0]">XP Niveau {niveau}</span>
              <span className="font-semibold text-[#2D3142]">
                {xpProgress}%
              </span>
            </div>
            <Progress value={xpProgress} color="#FF6B35" />
            <p className="text-xs text-[#A0A0A0] mt-1">
              Progression calculée à partir des données du serveur
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex flex-col items-center gap-1">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: color + "20" }}
              >
                <Icon size={18} style={{ color }} />
              </div>
              <p className="text-2xl font-extrabold text-[#2D3142]">{value}</p>
              <p className="text-xs text-[#A0A0A0]">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="achievements">
        <TabsList>
          <TabsTrigger value="achievements">Succès</TabsTrigger>
          <TabsTrigger value="stats">Statistiques</TabsTrigger>
        </TabsList>

        <TabsContent value="achievements" className="mt-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {achievements.map((a) => (
              <Card
                key={a.label}
                className={`transition-all ${
                  a.unlocked
                    ? "hover:shadow-md hover:-translate-y-0.5"
                    : "opacity-40"
                }`}
              >
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <span className="text-3xl">{a.icon}</span>
                  <p className="text-sm font-bold text-[#2D3142]">{a.label}</p>
                  <p className="text-xs text-[#A0A0A0]">{a.desc}</p>
                  {a.unlocked && (
                    <Badge variant="won" className="text-[10px]">
                      Débloqué
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="stats" className="mt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Parties jouées", value: String(parties) },
              { label: "Victoires", value: String(victoires) },
              { label: "Taux de réussite", value: `${winRate}%` },
              {
                label: "Gains cumulés",
                value: `${profil.data?.cumulGains ?? "0"} pts`,
              },
              {
                label: "Score attendu",
                value: `${wrPct(victoires, parties)}%`,
              },
              { label: "Rôle", value: profileUser?.role ?? "JOUEUR" },
              { label: "Ville", value: profileUser?.villeOrigine || "—" },
              { label: "Téléphone", value: profileUser?.telephone || "—" },
              {
                label: "Date de naissance",
                value: profileUser?.dateNaissance
                  ? new Date(profileUser.dateNaissance).toLocaleDateString(
                      "fr-MG",
                    )
                  : "—",
              },
            ].map(({ label, value }) => (
              <Card key={label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-[#A0A0A0]">{label}</p>
                    <p className="text-sm font-bold text-[#2D3142] mt-0.5">
                      {value}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
