import { useEffect, useRef, useState } from "react";
import { Gamepad2, Mail, Lock, User, Eye, EyeOff, ArrowRight, MapPin, Calendar, Phone, Check, AlertCircle, Loader2 } from "lucide-react";
import { Button, Input, Card, CardContent, Separator } from "../components/ui";
import { useAuth } from "../lib/auth";
import { errMsg } from "../lib/hooks";
import { api } from "../lib/api";
import usePageTitle from "@/lib/usePageTitle";

type AuthMode = "login" | "register" | "forgot";

interface AuthPageProps {
  onSuccess: () => void;
  initialMode?: AuthMode;
}

const MAX_LOCAL_IMAGE_BYTES = 10 * 1024 * 1024;

export default function AuthPage({ onSuccess, initialMode = "login" }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  usePageTitle(mode === "login" ? "Login" : mode === "register" ? "Register" : "Forgot Password"); 
  const { login, register } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginId, setLoginId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [telephone, setTelephone] = useState("");
  const [villeOrigine, setVilleOrigine] = useState("");
  const [photoProfil, setPhotoProfil] = useState("");
  const [photoCouverture, setPhotoCouverture] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const [usernameSuggestion, setUsernameSuggestion] = useState("");
  const touchedRef = useRef(false);
  const autoBaseRef = useRef("");
  const [villes, setVilles] = useState<Array<{ id: string; nom: string }>>([]);
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);

  const slugify = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 50);

  useEffect(() => {
    if (mode !== "register" || touchedRef.current) return;
    const base = slugify(`${firstName || ""}${lastName || ""}`);
    if (!base) return;
    const current = name.trim();
    if (current === "" || (autoBaseRef.current && current.startsWith(autoBaseRef.current))) {
      autoBaseRef.current = base;
      setName(base);
      setUsernameStatus("checking");
    }
  }, [firstName, lastName, mode]);

  useEffect(() => {
    if (mode !== "register") return;
    const val = name.trim();
    if (!val) {
      setUsernameStatus("idle");
      setUsernameSuggestion("");
      return;
    }
    const t = setTimeout(async () => {
      setUsernameStatus("checking");
      try {
        const r = await api.pseudoInfo(val);
        setUsernameSuggestion(r.pseudoInfo.suggestion);
        if (r.pseudoInfo.disponible) {
          setUsernameStatus("ok");
        } else {
          setUsernameStatus("taken");
          if (!touchedRef.current && r.pseudoInfo.suggestion && r.pseudoInfo.suggestion !== val) setName(r.pseudoInfo.suggestion);
        }
      } catch {
        setUsernameStatus("idle");
      }
    }, 450);
    return () => clearTimeout(t);
  }, [name, mode]);

  useEffect(() => {
    if (mode === "register") {
      api.villes().then((data) => setVilles(data.villes.map((ville) => ({ id: ville.id, nom: ville.nom })))).catch(() => setVilles([]));
    }
  }, [mode]);

  const normalizeImageValue = (value: string) => value.trim();

  const handleLocalImage = (e: React.ChangeEvent<HTMLInputElement>, target: "profil" | "couverture") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_LOCAL_IMAGE_BYTES) {
      setError("L’image est trop lourde. Sélectionnez une photo de moins de 2 Mo.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (target === "profil") setPhotoProfil(result);
      else setPhotoCouverture(result);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "forgot") {
      setError("La réinitialisation par email n'est pas encore branchée. Contactez un administrateur.");
      return;
    }

    if (mode === "register" && registerStep === 1) {
      setRegisterStep(2);
      return;
    }

    if (mode === "register") {
      if (usernameStatus === "taken") {
        setError("Ce nom d'utilisateur est déjà pris. Choisissez-en un autre (ou cliquez sur la suggestion).");
        return;
      }
      if (password.length < 8) {
        setError("Le mot de passe doit contenir au moins 8 caractères.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Les mots de passe ne correspondent pas.");
        return;
      }
      if (!consent) {
        setError("Vous devez accepter les conditions de confidentialité pour continuer.");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "register") {
        await register(
          email.trim(),
          name.trim(),
          password,
          firstName.trim(),
          lastName.trim(),
          dateNaissance,
          telephone.trim(),
          villeOrigine.trim(),
          normalizeImageValue(photoProfil),
          normalizeImageValue(photoCouverture),
        );
      } else {
        await login(loginId.trim(), password);
      }
      onSuccess();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-col justify-center px-16 w-1/2 bg-gradient-to-br from-[#16a34a] to-[#14532d] text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center">
              <Gamepad2 size={24} className="text-[#16a34a]" />
            </div>
            <span className="text-3xl font-extrabold">Quizz <span className="text-[#86efac]">Leka</span></span>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight mb-4">
            Teste tes connaissances.<br />
            Défie tes amis.<br />
            <span className="text-[#bbf7d0]">Découvre Madagascar.</span>
          </h1>
          <p className="text-white/70 text-lg max-w-md">
            Compte administrateur de lancement : admin@quizz.mg — mot de passe défini dans le backend.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8 bg-[#F9F9F9]">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-lg bg-[#16a34a] flex items-center justify-center">
              <Gamepad2 size={18} className="text-white" />
            </div>
            <span className="text-2xl font-extrabold text-[#2D3142]">Quizz <span className="text-[#16a34a]">Leka</span></span>
          </div>

          <Card>
            <CardContent className="p-6 md:p-8">
              {mode === "forgot" ? (
                <>
                  <h2 className="text-2xl font-bold text-[#2D3142] mb-1">Mot de passe oublié</h2>
                  <p className="text-sm text-[#A0A0A0] mb-6">Indiquez votre email. Un administrateur pourra vous aider.</p>
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {error && <p className="text-sm text-[#D62828] bg-[#D62828]/10 rounded-lg px-3 py-2">{error}</p>}
                    <Input label="Email" type="email" placeholder="votre@email.mg" value={email} onChange={e => setEmail(e.target.value)} leftIcon={<Mail size={16} />} required />
                    <Button type="submit" loading={loading} size="lg" className="w-full">
                      Continuer <ArrowRight size={16} />
                    </Button>
                    <button type="button" onClick={() => { setMode("login"); setError(null); }} className="text-sm text-[#A0A0A0] hover:text-[#16a34a] transition-colors text-center">
                      ← Retour à la connexion
                    </button>
                  </form>
                </>
              ) : mode === "register" ? (
                <>
                  <h2 className="text-2xl font-bold text-[#2D3142] mb-1">Créer un compte</h2>
                  <p className="text-sm text-[#A0A0A0] mb-6">Rejoignez la communauté Quizz Leka.</p>
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {error && <p className="text-sm text-[#D62828] bg-[#D62828]/10 rounded-lg px-3 py-2">{error}</p>}

                    {registerStep === 1 ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Input label="Nom *" placeholder="Rakoto" value={lastName} onChange={e => setLastName(e.target.value)} leftIcon={<User size={16} />} required />
                          <Input label="Prénoms *" placeholder="Aina" value={firstName} onChange={e => setFirstName(e.target.value)} leftIcon={<User size={16} />} required />
                          <div className="sm:col-span-2 flex flex-col gap-1.5">
                            <label htmlFor="register-username" className="text-sm font-medium text-[#2D3142]">Nom d'utilisateur *</label>
                            <div className="relative flex items-center">
                              <span className="absolute left-3 text-[#A0A0A0]"><User size={16} /></span>
                              <input
                                id="register-username"
                                value={name}
                                onChange={(e) => { touchedRef.current = true; setName(e.target.value); }}
                                placeholder="Saisissez votre nom d'utilisateur"
                                className={`w-full rounded-lg border text-sm bg-white text-[#2D3142] placeholder:text-[#A0A0A0] pl-9 pr-9 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#16a34a] ${
                                  usernameStatus === "taken" ? "border-[#D62828] focus:border-[#D62828]" : usernameStatus === "ok" ? "border-[#06A77D] focus:border-[#06A77D]" : "border-[#D9D9D9]"
                                }`}
                                required
                              />
                              <span className="absolute right-3">
                                {usernameStatus === "checking" ? (
                                  <Loader2 size={16} className="text-[#A0A0A0] animate-spin" />
                                ) : usernameStatus === "ok" ? (
                                  <Check size={16} className="text-[#06A77D]" />
                                ) : usernameStatus === "taken" ? (
                                  <AlertCircle size={16} className="text-[#D62828]" />
                                ) : null}
                              </span>
                            </div>
                            {usernameStatus === "checking" && <p className="text-xs text-[#A0A0A0]">Vérification en cours…</p>}
                            {usernameStatus === "ok" && <p className="text-xs text-[#06A77D]">Disponible ✓</p>}
                            {usernameStatus === "taken" && (
                              <p className="text-xs text-[#D62828]">
                                Ce nom d'utilisateur est déjà pris.
                                {usernameSuggestion && usernameSuggestion !== name.trim() && (
                                  <>
                                    {" "}<button type="button" className="text-[#16a34a] font-medium underline" onClick={() => setName(usernameSuggestion)}>Utiliser {usernameSuggestion}</button>
                                  </>
                                )}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-[#2D3142]">Date de naissance *</label>
                            <div className="relative flex items-center">
                              <span className="absolute left-3 text-[#A0A0A0]"><Calendar size={16} /></span>
                              <input
                                type="date"
                                value={dateNaissance}
                                onChange={e => setDateNaissance(e.target.value)}
                                className="w-full rounded-lg border border-[#D9D9D9] text-sm bg-white text-[#2D3142] pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a]"
                                required
                              />
                            </div>
                          </div>
                          <Input label="Téléphone *" placeholder="034 00 000 00" value={telephone} onChange={e => setTelephone(e.target.value)} leftIcon={<Phone size={16} />} required />
                          <Input label="Email (optionnel)" type="email" placeholder="votre@email.mg" value={email} onChange={e => setEmail(e.target.value)} leftIcon={<Mail size={16} />} />
                          <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-[#2D3142]">Ville d'origine *</label>
                            <div className="relative flex items-center">
                              <span className="absolute left-3 text-[#A0A0A0]"><MapPin size={16} /></span>
                              <select
                                value={villeOrigine}
                                onChange={(e) => setVilleOrigine(e.target.value)}
                                className="w-full rounded-lg border border-[#D9D9D9] text-sm bg-white text-[#2D3142] pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a]"
                                required
                              >
                                <option value="">Choisir une ville</option>
                                {villes.map((ville) => (
                                  <option key={ville.id} value={ville.nom}>{ville.nom}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-[#2D3142]">Photo de profil</label>
                            <input type="file" accept="image/*" onChange={(e) => handleLocalImage(e, "profil")} className="text-sm text-[#A0A0A0]" />
                            {photoProfil && <img src={photoProfil} alt="Photo profil" className="h-16 w-16 rounded-full object-cover border border-[#D9D9D9]" />}
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-[#2D3142]">Photo de couverture</label>
                            <input type="file" accept="image/*" onChange={(e) => handleLocalImage(e, "couverture")} className="text-sm text-[#A0A0A0]" />
                            {photoCouverture && <img src={photoCouverture} alt="Photo couverture" className="h-20 w-full rounded-xl object-cover border border-[#D9D9D9]" />}
                          </div>
                        </div>
                        <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
                          Suivant <ArrowRight size={16} />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-medium text-[#2D3142]">Mot de passe</label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-[#A0A0A0]"><Lock size={16} /></span>
                            <input
                              type={showPass ? "text" : "password"}
                              placeholder="Minimum 8 caractères"
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              className="w-full rounded-lg border border-[#D9D9D9] text-sm bg-white text-[#2D3142] placeholder:text-[#A0A0A0] pl-9 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a]"
                              required
                              minLength={8}
                            />
                            <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 text-[#A0A0A0]" aria-label={showPass ? "Cacher" : "Montrer"}>
                              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-medium text-[#2D3142]">Confirmer le mot de passe</label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-[#A0A0A0]"><Lock size={16} /></span>
                            <input
                              type={showPass ? "text" : "password"}
                              placeholder="Retapez le mot de passe"
                              value={confirmPassword}
                              onChange={e => setConfirmPassword(e.target.value)}
                              className="w-full rounded-lg border border-[#D9D9D9] text-sm bg-white text-[#2D3142] placeholder:text-[#A0A0A0] pl-9 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a]"
                              required
                              minLength={8}
                            />
                          </div>
                        </div>
                        <label className="flex items-start gap-2 text-xs text-[#A0A0A0] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                            className="mt-0.5 accent-[#16a34a]"
                            required
                          />
                          <span>
                            J'accepte les <span className="text-[#16a34a] font-medium">conditions d'utilisation</span> et la{" "}
                            <span className="text-[#16a34a] font-medium">politique de confidentialité</span> de Quizz Leka.
                          </span>
                        </label>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" className="flex-1" onClick={() => setRegisterStep(1)}>
                            Précédent
                          </Button>
                          <Button type="submit" loading={loading} className="flex-1" size="lg">
                            Créer mon compte <ArrowRight size={16} />
                          </Button>
                        </div>
                      </>
                    )}
                  </form>
                  <Separator className="my-4" />
                  <p className="text-sm text-center text-[#A0A0A0]">
                    Déjà un compte ?{" "}
                    <button onClick={() => { setMode("login"); setError(null); setRegisterStep(1); }} className="text-[#16a34a] font-medium hover:underline">Se connecter</button>
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-[#2D3142] mb-1">Connexion</h2>
                  <p className="text-sm text-[#A0A0A0] mb-6">Bienvenue sur Quizz Leka !</p>
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {error && <p className="text-sm text-[#D62828] bg-[#D62828]/10 rounded-lg px-3 py-2">{error}</p>}
                    <Input label="Email ou téléphone" type="text" placeholder="votre@email.mg ou 034 00 000 00" value={loginId} onChange={e => setLoginId(e.target.value)} leftIcon={<Mail size={16} />} required />
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-[#2D3142]">Mot de passe</label>
                        <button type="button" onClick={() => setMode("forgot")} className="text-xs text-[#16a34a] hover:underline">Mot de passe oublié ?</button>
                      </div>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-[#A0A0A0]"><Lock size={16} /></span>
                        <input
                          type={showPass ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="w-full rounded-lg border border-[#D9D9D9] text-sm bg-white text-[#2D3142] placeholder:text-[#A0A0A0] pl-9 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a]"
                          required
                        />
                        <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 text-[#A0A0A0]" aria-label={showPass ? "Cacher" : "Montrer"}>
                          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
                      Se connecter <ArrowRight size={16} />
                    </Button>
                  </form>
                  <Separator className="my-4" />
                  <p className="text-sm text-center text-[#A0A0A0]">
                    Pas encore de compte ?{" "}
                    <button onClick={() => { setMode("register"); setError(null); }} className="text-[#16a34a] font-medium hover:underline">S'inscrire gratuitement</button>
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
