import { useEffect, useState } from "react";
import { User, Bell, Shield, Volume2, Moon, Globe, LogOut, Calendar, Phone, Camera, Image } from "lucide-react";
import { Button, Card, CardContent, Input, Separator, Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { errMsg } from "../lib/hooks";
import usePageTitle from "@/lib/usePageTitle";

const MAX_LOCAL_IMAGE_BYTES = 10 * 1024 * 1024;

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${checked ? "bg-[#FF6B35]" : "bg-[#D9D9D9]"}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function SettingsPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  usePageTitle("Paramètres");
  const { user, setUser, logout, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    pseudo: user?.pseudo ?? "",
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    dateNaissance: user?.dateNaissance ?? "",
    telephone: user?.telephone ?? "",
    villeOrigine: user?.villeOrigine ?? "",
    photoProfil: "",
    photoCouverture: "",
  });
  const [villes, setVilles] = useState<Array<{ id: string; nom: string }>>([]);
  const [prefs, setPrefs] = useState({
    notifications: true,
    sounds: true,
    darkMode: false,
    gameInvites: true,
    emailNotifs: false,
    publicProfile: true,
  });

  useEffect(() => {
    setProfile({
      pseudo: user?.pseudo ?? "",
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      dateNaissance: user?.dateNaissance ?? "",
      telephone: user?.telephone ?? "",
      villeOrigine: user?.villeOrigine ?? "",
      photoProfil: "",
      photoCouverture: "",
    });
  }, [user]);

  useEffect(() => {
    api.villes().then((data) => setVilles(data.villes.map((ville) => ({ id: ville.id, nom: ville.nom })))).catch(() => setVilles([]));
  }, []);

  const toggle = (k: keyof typeof prefs) => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  const handleLocalImage = (e: React.ChangeEvent<HTMLInputElement>, target: "profil" | "couverture") => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOCAL_IMAGE_BYTES) {
      alert("L’image est trop lourde. Sélectionnez une photo de moins de 2 Mo.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setProfile((p) => ({ ...p, [target === "profil" ? "photoProfil" : "photoCouverture"]: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated = await api.updateProfil({
        pseudo: profile.pseudo.trim() || undefined,
        firstName: profile.firstName.trim() || undefined,
        lastName: profile.lastName.trim() || undefined,
        dateNaissance: profile.dateNaissance || undefined,
        telephone: profile.telephone.trim() || undefined,
        villeOrigine: profile.villeOrigine,
        photoProfil: profile.photoProfil || undefined,
        photoCouverture: profile.photoCouverture || undefined,
      });
      setUser(updated.updateProfil);
      await refreshUser();
      alert("Profil mis à jour avec succès.");
    } catch (error) {
      alert(errMsg(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 pb-20 md:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#2D3142]">Paramètres</h1>
        <p className="text-sm text-[#A0A0A0]">Personnalisez votre expérience Quizz Leka</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="notifs">Notifications</TabsTrigger>
          <TabsTrigger value="game">Jeu</TabsTrigger>
          <TabsTrigger value="security">Sécurité</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-5 flex flex-col gap-4">
          <Card>
            <CardContent className="p-5 flex flex-col gap-4">
              <h3 className="font-semibold text-[#2D3142]">Informations personnelles</h3>
              <Input
                label="Nom d'utilisateur"
                value={profile.pseudo}
                onChange={(e) => setProfile((p) => ({ ...p, pseudo: e.target.value }))}
                leftIcon={<User size={14} />}
              />
              <Input label="Email" type="email" value={user?.email ?? ""} disabled />
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Prénom"
                  value={profile.firstName}
                  onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                  leftIcon={<User size={14} />}
                />
                <Input
                  label="Nom"
                  value={profile.lastName}
                  onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                  leftIcon={<User size={14} />}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Date de naissance"
                  type="date"
                  value={profile.dateNaissance}
                  onChange={(e) => setProfile((p) => ({ ...p, dateNaissance: e.target.value }))}
                  leftIcon={<Calendar size={14} />}
                />
                <Input
                  label="Téléphone"
                  placeholder="034 00 000 00"
                  value={profile.telephone}
                  onChange={(e) => setProfile((p) => ({ ...p, telephone: e.target.value }))}
                  leftIcon={<Phone size={14} />}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#2D3142]">Localisation</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-[#A0A0A0]"><Globe size={14} /></span>
                  <select
                    value={profile.villeOrigine}
                    onChange={(e) => setProfile((p) => ({ ...p, villeOrigine: e.target.value }))}
                    className="w-full rounded-lg border border-[#D9D9D9] text-sm bg-white text-[#2D3142] pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  >
                    <option value="">Choisir une ville</option>
                    {villes.map((ville) => (
                      <option key={ville.id} value={ville.nom}>{ville.nom}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#2D3142]">Photo de profil</label>
                  <div className="flex items-center gap-3">
                    {user?.photoProfil && !profile.photoProfil ? (
                      <img src={user.photoProfil} alt="Photo profil" className="h-16 w-16 rounded-full object-cover border border-[#D9D9D9]" />
                    ) : profile.photoProfil ? (
                      <img src={profile.photoProfil} alt="Photo profil" className="h-16 w-16 rounded-full object-cover border border-[#D9D9D9]" />
                    ) : null}
                    <label className="inline-flex items-center gap-2 cursor-pointer rounded-lg border border-[#D9D9D9] px-3 py-2 text-sm text-[#2D3142] hover:bg-[#F9F9F9]">
                      <Camera size={14} />
                      Choisir
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLocalImage(e, "profil")} />
                    </label>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#2D3142]">Photo de couverture</label>
                  <div className="flex items-center gap-3">
                    {user?.photoCouverture && !profile.photoCouverture ? (
                      <img src={user.photoCouverture} alt="Photo couverture" className="h-16 w-28 object-cover rounded-xl border border-[#D9D9D9]" />
                    ) : profile.photoCouverture ? (
                      <img src={profile.photoCouverture} alt="Photo couverture" className="h-16 w-28 object-cover rounded-xl border border-[#D9D9D9]" />
                    ) : null}
                    <label className="inline-flex items-center gap-2 cursor-pointer rounded-lg border border-[#D9D9D9] px-3 py-2 text-sm text-[#2D3142] hover:bg-[#F9F9F9]">
                      <Image size={14} />
                      Choisir
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLocalImage(e, "couverture")} />
                    </label>
                  </div>
                </div>
              </div>
              <Button className="w-full sm:w-auto self-start" loading={saving} onClick={() => void handleSave()}>
                Enregistrer les modifications
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-[#2D3142] mb-1">Zone de danger</h3>
              <p className="text-sm text-[#A0A0A0] mb-3">Ces actions sont irréversibles.</p>
              <Button variant="destructive" size="sm" onClick={() => { logout(); onNavigate?.("login"); }}>
                <LogOut size={14} /> Se déconnecter
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifs" className="mt-5">
          <Card>
            <CardContent className="p-5 flex flex-col gap-0">
              {[
                { key: "notifications", icon: Bell,   label: "Notifications push",    desc: "Recevoir des notifications de parties et défis" },
                { key: "emailNotifs",   icon: Bell,   label: "Notifications email",    desc: "Résumé hebdomadaire et alertes importantes" },
                { key: "gameInvites",   icon: User,   label: "Invitations de jeu",     desc: "Être notifié quand quelqu'un vous défie" },
                { key: "sounds",        icon: Volume2, label: "Sons du jeu",            desc: "Sons de réponse, timer et victoire" },
              ].map(({ key, icon: Icon, label, desc }, i, arr) => (
                <div key={key}>
                  <div className="flex items-center gap-3 py-3">
                    <div className="w-8 h-8 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-[#FF6B35]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#2D3142]">{label}</p>
                      <p className="text-xs text-[#A0A0A0]">{desc}</p>
                    </div>
                    <Toggle checked={prefs[key as keyof typeof prefs]} onChange={() => toggle(key as keyof typeof prefs)} />
                  </div>
                  {i < arr.length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="game" className="mt-5">
          <Card>
            <CardContent className="p-5 flex flex-col gap-0">
              {[
                { key: "publicProfile", icon: Globe, label: "Profil public", desc: "Votre profil est visible par tous les joueurs" },
                { key: "darkMode",      icon: Moon,  label: "Mode sombre",   desc: "Interface sombre pour jouer la nuit" },
              ].map(({ key, icon: Icon, label, desc }, i, arr) => (
                <div key={key}>
                  <div className="flex items-center gap-3 py-3">
                    <div className="w-8 h-8 rounded-lg bg-[#004E89]/10 flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-[#004E89]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#2D3142]">{label}</p>
                      <p className="text-xs text-[#A0A0A0]">{desc}</p>
                    </div>
                    <Toggle checked={prefs[key as keyof typeof prefs]} onChange={() => toggle(key as keyof typeof prefs)} />
                  </div>
                  {i < arr.length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-5 flex flex-col gap-4">
          <Card>
            <CardContent className="p-5 flex flex-col gap-4">
              <h3 className="font-semibold text-[#2D3142]">Changer le mot de passe</h3>
              <Input label="Mot de passe actuel" type="password" placeholder="••••••••" leftIcon={<Shield size={14} />} />
              <Input label="Nouveau mot de passe" type="password" placeholder="Minimum 8 caractères" leftIcon={<Shield size={14} />} />
              <Input label="Confirmer le mot de passe" type="password" placeholder="••••••••" leftIcon={<Shield size={14} />} />
              <Button className="w-full sm:w-auto self-start">Mettre à jour le mot de passe</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
