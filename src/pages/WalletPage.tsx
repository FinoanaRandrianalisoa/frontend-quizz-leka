import { useState } from "react";
import { Plus, Gift, Star, Trophy, Swords, Lock, Unlock, PiggyBank } from "lucide-react";
import { Button, Card, CardContent, Tabs, TabsList, TabsTrigger, TabsContent, Input, Badge } from "../components/ui";
import { api } from "../lib/api";
import { useAsync, errMsg } from "../lib/hooks";
import { formatPoints, relativeTime } from "../lib/format";
import usePageTitle from "@/lib/usePageTitle";

const txIconMap: Record<string, typeof Trophy> = {
  gain: Trophy,
  depot: Gift,
  retrait: Swords,
  mise_bloquee: Swords,
  commission: Star,
  remboursement: Gift,
  perte: Swords,
  demo_recharge: PiggyBank,
};

export default function WalletPage() {
  usePageTitle("Wallet");
  const portefeuille = useAsync(() => api.monPortefeuille().then((d) => d.monPortefeuille), []);
  const historique = useAsync(() => api.historiqueTransactions().then((d) => d.historiqueTransactions), []);

  const [pin, setPin] = useState("");
  const [pinConfirmation, setPinConfirmation] = useState("");
  const [pinActuel, setPinActuel] = useState("");
  const [showChangerPin, setShowChangerPin] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeType, setNoticeType] = useState<"success" | "error">("success");
  const [pending, setPending] = useState(false);

  const pf = portefeuille.data;
  const transactions = historique.data ?? [];

  const total = Number(pf?.soldeTotal ?? 0);
  const recharge = Number(pf?.soldeRecharge ?? 0);
  const disponible = Number(pf?.soldeDisponible ?? pf?.soldeRecharge ?? 0);
  const bloque = Number(pf?.soldeBloqueTotal ?? pf?.soldeBloque ?? 0);
  const gains = Number(pf?.soldeGainsTotal ?? pf?.soldeGains ?? 0);

  const requirePin = pf?.pinDefini ?? false;
  const unlocked = pf?.portefeuilleDeverrouille ?? false;
  const rechargeDispo = pf?.rechargeDemoDisponible ?? false;

  function notify(message: string, type: "success" | "error" = "success") {
    setNotice(message);
    setNoticeType(type);
  }

  async function run(fn: () => Promise<unknown>, success: string) {
    setPending(true);
    setNotice(null);
    try {
      await fn();
      notify(success);
      setPin("");
      setPinConfirmation("");
      setPinActuel("");
      setShowChangerPin(false);
    } catch (err) {
      notify(errMsg(err), "error");
    } finally {
      setPending(false);
      void portefeuille.reload();
    }
  }

  const allTx = transactions.map((entry) => {
    const amount = Number(entry.montant || 0);
    const normalizedType = entry.type.toLowerCase();
    const Icon = txIconMap[normalizedType] ?? Trophy;
    const credit = amount >= 0;
    return {
      ...entry,
      amount,
      credit,
      label: entry.reference || entry.type,
      icon: Icon,
      date: relativeTime(entry.creeLe),
    };
  });

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 pb-20 md:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#2D3142]">Wallet</h1>
        <p className="text-sm text-[#A0A0A0]">Vos points et récompenses en temps réel</p>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-[#004E89] to-[#002952] text-white p-6 mb-4">
        <div className="flex items-center gap-2 mb-2">
          {pf?.modeDemo && <Badge className="bg-[#FF6B35]/20 text-[#FFD9C4] border border-[#FF6B35]/40">DÉMO</Badge>}
          {requirePin && (
            <Badge className={`bg-white/10 text-white/80 border border-white/20 ${unlocked ? "" : "line-through"}`}>
              {unlocked ? <Unlock size={12} className="inline mr-1" /> : <Lock size={12} className="inline mr-1" />}
              {unlocked ? "Déverrouillé" : "Verrouillé"}
            </Badge>
          )}
        </div>
        <p className="text-sm text-white/60 mb-1">Solde total</p>
        <p className="text-5xl font-extrabold mb-1 tabular-nums">{formatPoints(total)} <span className="text-2xl font-semibold text-white/70">pts</span></p>
        <p className="text-sm text-white/60">
          Disponible {formatPoints(disponible)} · Misé {formatPoints(bloque)} · Gains {formatPoints(gains)}
        </p>
        <div className="flex gap-3 mt-5">
          <Button
            className="gap-1.5 flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white"
            loading={pending}
            disabled={!requirePin || !unlocked || !rechargeDispo}
            onClick={() =>
              void run(
                () => api.rechargerPortefeuille(`recharge-demo-${Date.now()}`),
                "Recharge démonstration effectuée (+1 000 000 pts).",
              )
            }
          >
            <Plus size={16} /> Recharger {!rechargeDispo ? "(1×/jour)" : ""}
          </Button>
          <Button className="gap-1.5 flex-1 bg-[#FF6B35] hover:bg-[#FF5520] text-white">
            <Gift size={16} /> Récompenses
          </Button>
        </div>
        {!requirePin && <p className="text-xs text-white/60 mt-3">Définissez votre PIN pour déverrouiller le wallet et recharger.</p>}
        {requirePin && !unlocked && <p className="text-xs text-white/60 mt-3">Votre wallet est verrouillé — entrez votre PIN ci-dessous.</p>}
        {requirePin && unlocked && !rechargeDispo && <p className="text-xs text-white/60 mt-3">Recharge démo déjà utilisée aujourd'hui (limite 1×/jour).</p>}
      </div>

      {notice && (
        <div className={`rounded-xl px-4 py-3 mb-4 text-sm font-medium ${noticeType === "success" ? "bg-[#06A77D]/10 text-[#068f6a]" : "bg-[#D62828]/10 text-[#D62828]"}`}>
          {notice}
        </div>
      )}

      <Card className="mb-4">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[#2D3142]">Sécurité</p>
            {requirePin && (
              <Button variant="ghost" size="sm" onClick={() => setShowChangerPin((v) => !v)}>
                Changer le PIN
              </Button>
            )}
          </div>

          {!requirePin ? (
            <div className="grid gap-3">
              <Input label="Nouveau PIN (4 chiffres)" type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value)} />
              <Input label="Confirmer le PIN" type="password" inputMode="numeric" maxLength={4} value={pinConfirmation} onChange={(e) => setPinConfirmation(e.target.value)} />
              <Button
                loading={pending}
                disabled={pin.length !== 4 || pin !== pinConfirmation}
                onClick={() => void run(() => api.definirPinPortefeuille(pin, pinConfirmation), "PIN défini avec succès.")}
              >
                Définir mon PIN
              </Button>
            </div>
          ) : unlocked ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#06A77D] flex items-center gap-2"><Unlock size={16} /> Portefeuille déverrouillé</p>
              <Button
                variant="ghost"
                size="sm"
                loading={pending}
                onClick={() => void run(() => api.verrouillerPortefeuille(), "Portefeuille verrouillé.")}
              >
                Verrouiller
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              <Input
                label="PIN de déverrouillage"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
              <Button loading={pending} disabled={pin.length !== 4} onClick={() => void run(() => api.deverrouillerPortefeuille(pin), "Portefeuille déverrouillé.")}>
                Déverrouiller
              </Button>
            </div>
          )}

          {requirePin && showChangerPin && (
            <div className="grid gap-3 border-t border-[#F5F5F5] pt-3">
              <Input label="PIN actuel" type="password" inputMode="numeric" maxLength={4} value={pinActuel} onChange={(e) => setPinActuel(e.target.value)} />
              <Input type="password" inputMode="numeric" maxLength={4} label="Nouveau PIN (4 chiffres)" value={pin} onChange={(e) => setPin(e.target.value)} />
              <Input type="password" inputMode="numeric" maxLength={4} label="Confirmer le nouveau PIN" value={pinConfirmation} onChange={(e) => setPinConfirmation(e.target.value)} />
              <Button
                loading={pending}
                disabled={pinActuel.length !== 4 || pin.length !== 4 || pin !== pinConfirmation}
                onClick={() => void run(() => api.changerPinPortefeuille(pinActuel, pin, pinConfirmation), "PIN modifié avec succès.")}
              >
                Enregistrer le nouveau PIN
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Disponible", value: formatPoints(disponible), trend: "OK", up: true },
          { label: "Misé / bloqué", value: formatPoints(bloque), trend: "OK", up: true },
          { label: "Gains", value: formatPoints(gains), trend: "OK", up: true },
        ].map(({ label, value, trend, up }) => (
          <Card key={label}>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-[#A0A0A0] mb-1">{label}</p>
              <p className="text-sm font-bold text-[#2D3142]">{value}</p>
              <p className={`text-[10px] font-medium mt-0.5 ${up ? "text-[#06A77D]" : "text-[#D62828]"}`}>{trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Tout</TabsTrigger>
          <TabsTrigger value="credits">Gains</TabsTrigger>
          <TabsTrigger value="debits">Dépenses</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {allTx.length === 0 && <div className="p-4 text-sm text-[#A0A0A0]">Aucune transaction pour le moment.</div>}
              {allTx.map((t, i) => (
                <div key={t.id} className={`flex items-center gap-3 px-4 py-3 ${i < allTx.length - 1 ? "border-b border-[#F5F5F5]" : ""}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${t.credit ? "bg-[#06A77D]/10" : "bg-[#D62828]/10"}`}>
                    <t.icon size={16} className={t.credit ? "text-[#06A77D]" : "text-[#D62828]"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2D3142] truncate">{t.label}</p>
                    <p className="text-xs text-[#A0A0A0]">{t.date}</p>
                  </div>
                  <span className={`text-sm font-bold tabular-nums shrink-0 ${t.credit ? "text-[#06A77D]" : "text-[#D62828]"}`}>
                    {t.credit ? "+" : ""}{formatPoints(t.amount)} pts
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credits" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {allTx.filter((t) => t.credit).length === 0 && <div className="p-4 text-sm text-[#A0A0A0]">Aucun gain enregistré.</div>}
              {allTx.filter((t) => t.credit).map((t, i, arr) => (
                <div key={t.id} className={`flex items-center gap-3 px-4 py-3 ${i < arr.length - 1 ? "border-b border-[#F5F5F5]" : ""}`}>
                  <div className="w-9 h-9 rounded-xl bg-[#06A77D]/10 flex items-center justify-center shrink-0">
                    <t.icon size={16} className="text-[#06A77D]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2D3142] truncate">{t.label}</p>
                    <p className="text-xs text-[#A0A0A0]">{t.date}</p>
                  </div>
                  <span className="text-sm font-bold text-[#06A77D] tabular-nums">+{formatPoints(t.amount)} pts</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debits" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {allTx.filter((t) => !t.credit).length === 0 && <div className="p-4 text-sm text-[#A0A0A0]">Aucune dépense enregistrée.</div>}
              {allTx.filter((t) => !t.credit).map((t, i, arr) => (
                <div key={t.id} className={`flex items-center gap-3 px-4 py-3 ${i < arr.length - 1 ? "border-b border-[#F5F5F5]" : ""}`}>
                  <div className="w-9 h-9 rounded-xl bg-[#D62828]/10 flex items-center justify-center shrink-0">
                    <t.icon size={16} className="text-[#D62828]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2D3142] truncate">{t.label}</p>
                    <p className="text-xs text-[#A0A0A0]">{t.date}</p>
                  </div>
                  <span className="text-sm font-bold text-[#D62828] tabular-nums">{formatPoints(t.amount)} pts</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}