import { useEffect, useMemo, useState } from "react"

import usePageTitle from "../lib/usePageTitle"

import {
  Activity,
  Crown,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  UserCog,
  CheckCircle2,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  Check,
  Lock,
  Unlock,
  DollarSign,
  History,
  ChevronDown,
  ChevronUp,
  Eye,
  UserPlus,
  UserMinus,
  Settings,
  Upload,
  FileSpreadsheet,
} from "lucide-react"

import {
  api,
  type Question,
  type Utilisateur,
  type LedgerEntry,
  type FinanceAdmin,
} from "../lib/api"

import { useAsync, errMsg } from "../lib/hooks"

import { useAuth } from "../lib/auth"

import { initial } from "../lib/format"

import { formatPoints, relativeTime } from "../lib/format"

import {
  Button,
  Card,
  CardContent,
  Badge,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Tooltip,
} from "../components/ui"

import UserName from "../components/UserName"

function initials(value?: string | null) {
  if (!value) return "?"

  return (
    value

      .split(/\s+/)

      .filter(Boolean)

      .slice(0, 2)

      .map((part) => part[0]?.toUpperCase() ?? "")

      .join("") || "?"
  )
}

type DraftAnswer = { texte: string estCorrecte: boolean }

type DraftQuestion = { id?: number texte: string answers: DraftAnswer[] }

const makeEmptyDraft = (): DraftQuestion => ({
  texte: "",

  answers: Array.from({ length: 4 }, () => ({ texte: "", estCorrecte: false })),
})

export default function AdminUsersPage() {
  usePageTitle("Admin Users")

  const { user, isAdmin } = useAuth()

  const [search, setSearch] = useState("")

  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null)

  const [questions, setQuestions] = useState<Question[]>([])

  const [questionsLoading, setQuestionsLoading] = useState(false)

  const [draft, setDraft] = useState<DraftQuestion>(makeEmptyDraft())

  const [savingQuestion, setSavingQuestion] = useState(false)

  const [showAllUsers, setShowAllUsers] = useState(false)

  const [showAllQuestions, setShowAllQuestions] = useState(false)

  const [showAllTransactions, setShowAllTransactions] = useState(false)

  const [importingFile, setImportingFile] = useState(false)

  const [importResult, setImportResult] = useState<string | null>(null)

  const stats = useAsync(
    () => api.statsPlateforme().then((d) => d.statsPlateforme),
    [],
  )

  const themes = useAsync(() => api.themes().then((d) => d.themes), [])

  const users = useAsync(
    () => api.utilisateurs(search || undefined).then((d) => d.utilisateurs),
    [search],
  )

  const financeAdmin = useAsync(
    () => api.financeAdmin().then((d) => d.financeAdmin),
    [],
  )

  const transactions = useAsync(
    () => api.historiqueTransactions().then((d) => d.historiqueTransactions),
    [],
  )

  const filteredUsers = useMemo(() => users.data ?? [], [users.data])

  const displayedUsers = useMemo(
    () => (showAllUsers ? filteredUsers : filteredUsers.slice(0, 10)),
    [filteredUsers, showAllUsers],
  )

  const displayedTransactions = useMemo(() => {
    const data = transactions.data ?? []

    return showAllTransactions ? data : data.slice(0, 10)
  }, [transactions.data, showAllTransactions])

  const displayedQuestions = useMemo(
    () => (showAllQuestions ? questions : questions.slice(0, 10)),
    [questions, showAllQuestions],
  )

  const orderedThemes = themes.data ?? []

  useEffect(() => {
    if (!orderedThemes.length) return

    if (
      !selectedThemeId ||
      !orderedThemes.some((theme) => Number(theme.id) === selectedThemeId)
    ) {
      setSelectedThemeId(Number(orderedThemes[0].id))
    }
  }, [orderedThemes, selectedThemeId])

  useEffect(() => {
    if (!selectedThemeId) return

    const load = async () => {
      setQuestionsLoading(true)

      try {
        const response = await api.questions(selectedThemeId, 50)

        setQuestions(response.questions)
      } catch (error) {
        alert(errMsg(error))
      } finally {
        setQuestionsLoading(false)
      }
    }

    void load()
  }, [selectedThemeId])

  const refreshAll = async () => {
    await Promise.all([
      stats.reload(),
      users.reload(),
      themes.reload(),
      financeAdmin.reload(),
      transactions.reload(),
    ])

    if (selectedThemeId) {
      const response = await api.questions(selectedThemeId, 50)

      setQuestions(response.questions)
    }
  }

  const handleDeactivateUser = async (target: Utilisateur) => {
    if (!isAdmin || target.id === user?.id) return

    if (!window.confirm(`Désactiver le compte de ${target.pseudo} ?`)) return

    setUpdatingId(target.id)

    try {
      await api.desactiverUtilisateur(target.id)

      await refreshAll()
    } catch (error) {
      alert(errMsg(error))
    } finally {
      setUpdatingId(null)
    }
  }

  const handleActivateUser = async (target: Utilisateur) => {
    if (!isAdmin) return

    setUpdatingId(target.id)

    try {
      await api.activerUtilisateur(target.id)

      await refreshAll()
    } catch (error) {
      alert(errMsg(error))
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDeleteUser = async (target: Utilisateur) => {
    if (!isAdmin || target.id === user?.id) return

    if (
      !window.confirm(
        `Supprimer définitivement le compte de ${target.pseudo} ? Cette action est irréversible.`,
      )
    )
      return

    setUpdatingId(target.id)

    try {
      await api.supprimerUtilisateur(target.id)

      await refreshAll()
    } catch (error) {
      alert(errMsg(error))
    } finally {
      setUpdatingId(null)
    }
  }

  const handleRoleChange = async (
    target: Utilisateur,
    nextRole: "ADMIN" | "JOUEUR",
  ) => {
    if (!isAdmin || target.id === user?.id) return

    setUpdatingId(target.id)

    try {
      await api.changerRole(String(target.id), nextRole)

      await refreshAll()
    } catch (error) {
      alert(errMsg(error))
    } finally {
      setUpdatingId(null)
    }
  }

  const resetDraft = () => setDraft(makeEmptyDraft())

  const loadQuestionForEdit = (question: Question) => {
    setDraft({
      id: Number(question.id),

      texte: question.texte,

      answers: (question.choix ?? []).slice(0, 4).map((choice) => ({
        texte: choice.texte,

        estCorrecte: Boolean(choice.estCorrecte),
      })),
    })

    while (draft.answers.length < 4) {
      // no-op to keep the array length stable during submit
    }

    const filled = [...(question.choix ?? []).slice(0, 4).map((choice) => ({
        texte: choice.texte,

        estCorrecte: Boolean(choice.estCorrecte),
      }))]

    while (filled.length < 4) filled.push({ texte: "", estCorrecte: false })

    setDraft({
      id: Number(question.id),
      texte: question.texte,
      answers: filled,
    })
  }

  const setAnswerText = (index: number, value: string) => {
    setDraft((current) => ({
      ...current,

      answers: current.answers.map((answer, answerIndex) =>
        answerIndex === index ? { ...answer, texte: value } : answer,
      ),
    }))
  }

  const setCorrectAnswer = (index: number) => {
    setDraft((current) => ({
      ...current,

      answers: current.answers.map((answer, answerIndex) => ({
        ...answer,

        estCorrecte: answerIndex === index,
      })),
    }))
  }

  const handleSaveQuestion = async () => {
    if (!selectedThemeId) return

    const answers = draft.answers.map((answer) => ({
      texte: answer.texte.trim(),

      estCorrecte: Boolean(answer.estCorrecte),
    }))

    if (!draft.texte.trim() || answers.some((answer) => !answer.texte)) {
      alert("Remplissez la question et les 4 réponses.")

      return
    }

    setSavingQuestion(true)

    try {
      if (draft.id) {
        await api.updateQuestion(draft.id, draft.texte.trim(), answers)
      } else {
        await api.createQuestion(selectedThemeId, draft.texte.trim(), answers)
      }

      resetDraft()

      const response = await api.questions(selectedThemeId, 50)

      setQuestions(response.questions)

      await stats.reload()
    } catch (error) {
      alert(errMsg(error))
    } finally {
      setSavingQuestion(false)
    }
  }

  const handleDeleteQuestion = async (questionId: number) => {
    if (!window.confirm("Supprimer cette question ?")) return

    try {
      await api.deleteQuestion(questionId)

      const response = await api.questions(selectedThemeId ?? 0, 50)

      setQuestions(response.questions)

      await stats.reload()

      if (draft.id === questionId) resetDraft()
    } catch (error) {
      alert(errMsg(error))
    }
  }

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedThemeId) return

    setImportingFile(true)
    setImportResult(null)

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(',')[1]
        try {
          const result = await api.importerQuestionsExcel(selectedThemeId, base64)
          setImportResult(result.importerQuestionsExcel)
          await refreshAll()
        } catch (error) {
          setImportResult("Erreur lors de l'import: " + errMsg(error))
        } finally {
          setImportingFile(false)
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      setImportResult("Erreur lors de la lecture du fichier: " + errMsg(error))
      setImportingFile(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-12">
        <Card className="border-dashed border-[#D9D9D9] bg-white/80">
          <CardContent className="p-8 text-center">
            <ShieldCheck className="mx-auto mb-3 text-[#D62828]" size={40} />
            <h1 className="text-2xl font-bold text-[#2D3142] mb-2">
              Accès réservé
            </h1>
            <p className="text-[#A0A0A0]">
              Seuls les administrateurs peuvent consulter le tableau de bord.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const summary = [
    {
      label: "Joueurs",
      value: stats.data?.joueurs ?? 0,
      icon: Users,
      tint: "bg-[#dcfce7] text-[#15803d]",
    },

    {
      label: "Questions",
      value: stats.data?.questions ?? 0,
      icon: Sparkles,
      tint: "bg-[#ecfdf5] text-[#166534]",
    },

    {
      label: "En ligne",
      value: stats.data?.joueursEnLigne ?? 0,
      icon: Activity,
      tint: "bg-[#f0fdf4] text-[#16a34a]",
    },

    {
      label: "Parties live",
      value: stats.data?.partiesEnCours ?? 0,
      icon: TrendingUp,
      tint: "bg-[#fef9c3] text-[#a16207]",
    },
  ]

  const finance = financeAdmin.data

  const totalBudget = Number(finance?.totalCommissions ?? 0)

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-20 md:pb-8">
      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-[#16a34a] to-[#22c55e] p-4 text-white shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/70 font-semibold">
              Administration
            </p>
            <h1 className="text-2xl md:text-3xl font-black">
              Dashboard administrateur
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="category"
              className="border-white/20 bg-white/15 text-white"
            >
              Système actif
            </Badge>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void refreshAll()}
              className="bg-white text-[#166534] hover:bg-[#f0fdf4]"
            >
              Rafraîchir
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {summary.map(({ label, value, icon: Icon, tint }) => (
          <Card key={label} className="border-[#E8F5EB] bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[#64748b] text-xs uppercase tracking-wide">
                  {label}
                </p>
                <p className="text-2xl font-black text-[#1f2a1f] mt-2">
                  {value}
                </p>
              </div>
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${tint}`}
              >
                <Icon size={20} />
              </div>
            </CardContent>
          </Card>
        ))}
        <Card className="border-[#E8F5EB] bg-white shadow-sm">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[#64748b] text-xs uppercase tracking-wide">
                Budget total
              </p>
              <p className="text-2xl font-black text-[#1f2a1f] mt-2">
                {formatPoints(totalBudget)}
              </p>
              <p className="text-xs text-[#64748b]">Commissions</p>
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-[#fef9c3] text-[#a16207]">
              <DollarSign size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.9fr] gap-6">
        <Card className="border-[#E8F5EB] bg-white shadow-sm">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 border-b border-[#edf6ef] bg-[#f9fdf9]">
              <div className="flex items-center gap-2">
                <UserCog className="text-[#16a34a]" size={18} />
                <h2 className="font-bold text-[#1f2a1f]">Utilisateurs</h2>
              </div>
              <div className="w-full md:w-72">
                <Input
                  aria-label="Recherche utilisateur"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un joueur..."
                  leftIcon={<Search size={14} />}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-[#f3faf4] text-[#64748b] text-xs uppercase tracking-wide hidden md:table-header-group">
                  <tr>
                    <th className="px-4 py-3 font-medium">Joueur</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Rôle</th>
                    <th className="px-4 py-3 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.loading && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-[#A0A0A0]"
                      >
                        Chargement des utilisateurs…
                      </td>
                    </tr>
                  )}

                  {!users.loading && filteredUsers.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-[#A0A0A0]"
                      >
                        Aucun utilisateur trouvé.
                      </td>
                    </tr>
                  )}

                  {!users.loading &&
                    displayedUsers.map((item) => {
                      const isCurrentUser = item.id === user?.id

                      const isAdminUser = item.role === "ADMIN"

                      const isInactive = item.isActive === false

                      return (
                        <>
                          <tr
                            key={item.id}
                            className="border-t border-[#edf6ef] hover:bg-[#f9fdf9] hidden md:table-row"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                                    isInactive
                                      ? "bg-[#f3f4f6] text-[#9ca3af]"
                                      : "bg-[#dcfce7] text-[#166534]"
                                  }`}
                                >
                                  {initials(item.pseudo)}
                                </div>
                                <div>
                                  <p className="font-semibold text-[#1f2a1f]">
                                    <UserName user={item} />
                                  </p>
                                  <p className="text-xs text-[#64748b]">
                                    {item.enLigne ? "En ligne" : "Hors ligne"}
                                    {isInactive && " • Désactivé"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-[#1f2a1f]">
                              {item.email}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={isAdminUser ? "playing" : "default"}
                                className="text-[10px]"
                              >
                                {item.role}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-1.5">
                                <Tooltip
                                  label={
                                    isAdminUser
                                      ? "Retirer les droits admin"
                                      : "Promouvoir en admin"
                                  }
                                >
                                  <Button
                                    size="icon"
                                    variant={
                                      isAdminUser ? "secondary" : "success"
                                    }
                                    disabled={
                                      isCurrentUser || updatingId === item.id
                                    }
                                    onClick={() =>
                                      handleRoleChange(
                                        item,
                                        isAdminUser ? "JOUEUR" : "ADMIN",
                                      )
                                    }
                                    aria-label={
                                      isAdminUser
                                        ? "Retirer les droits admin"
                                        : "Promouvoir en admin"
                                    }
                                  >
                                    {updatingId === item.id ? (
                                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : isAdminUser ? (
                                      <UserMinus size={14} />
                                    ) : (
                                      <UserPlus size={14} />
                                    )}
                                  </Button>
                                </Tooltip>
                                {isInactive ? (
                                  <Tooltip label="Réactiver le compte">
                                    <Button
                                      size="icon"
                                      variant="secondary"
                                      disabled={updatingId === item.id}
                                      onClick={() => handleActivateUser(item)}
                                      aria-label="Réactiver le compte"
                                    >
                                      {updatingId === item.id ? (
                                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <Unlock size={14} />
                                      )}
                                    </Button>
                                  </Tooltip>
                                ) : (
                                  <Tooltip label="Désactiver le compte">
                                    <Button
                                      size="icon"
                                      variant="secondary"
                                      disabled={
                                        isCurrentUser || updatingId === item.id
                                      }
                                      onClick={() => handleDeactivateUser(item)}
                                      aria-label="Désactiver le compte"
                                    >
                                      {updatingId === item.id ? (
                                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <Lock size={14} />
                                      )}
                                    </Button>
                                  </Tooltip>
                                )}
                                <Tooltip label="Supprimer définitivement">
                                  <Button
                                    size="icon"
                                    variant="destructive"
                                    disabled={
                                      isCurrentUser || updatingId === item.id
                                    }
                                    onClick={() => handleDeleteUser(item)}
                                    aria-label="Supprimer définitivement"
                                  >
                                    {updatingId === item.id ? (
                                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <Trash2 size={14} />
                                    )}
                                  </Button>
                                </Tooltip>
                              </div>
                            </td>
                          </tr>
                          <tr
                            key={`mobile-${item.id}`}
                            className="border-t border-[#edf6ef] md:hidden"
                          >
                            <td colSpan={4} className="px-4 py-3">
                              <div className="rounded-xl bg-[#f9fdf9] p-3 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                                        isInactive
                                          ? "bg-[#f3f4f6] text-[#9ca3af]"
                                          : "bg-[#dcfce7] text-[#166534]"
                                      }`}
                                    >
                                      {initials(item.pseudo)}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-[#1f2a1f]">
                                        <UserName user={item} />
                                      </p>
                                      <p className="text-xs text-[#64748b]">
                                        {item.enLigne
                                          ? "En ligne"
                                          : "Hors ligne"}
                                        {isInactive && " • Désactivé"}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge
                                    variant={
                                      isAdminUser ? "playing" : "default"
                                    }
                                    className="text-[10px]"
                                  >
                                    {item.role}
                                  </Badge>
                                </div>
                                <div className="text-sm text-[#64748b]">
                                  {item.email}
                                </div>
                                <div className="flex justify-end gap-2 pt-2 border-t border-[#edf6ef]">
                                  <Tooltip
                                    label={
                                      isAdminUser
                                        ? "Retirer les droits admin"
                                        : "Promouvoir en admin"
                                    }
                                  >
                                    <Button
                                      size="icon"
                                      variant={
                                        isAdminUser ? "secondary" : "success"
                                      }
                                      disabled={
                                        isCurrentUser || updatingId === item.id
                                      }
                                      onClick={() =>
                                        handleRoleChange(
                                          item,
                                          isAdminUser ? "JOUEUR" : "ADMIN",
                                        )
                                      }
                                      aria-label={
                                        isAdminUser
                                          ? "Retirer les droits admin"
                                          : "Promouvoir en admin"
                                      }
                                    >
                                      {updatingId === item.id ? (
                                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                      ) : isAdminUser ? (
                                        <UserMinus size={14} />
                                      ) : (
                                        <UserPlus size={14} />
                                      )}
                                    </Button>
                                  </Tooltip>
                                  {isInactive ? (
                                    <Tooltip label="Réactiver le compte">
                                      <Button
                                        size="icon"
                                        variant="secondary"
                                        disabled={updatingId === item.id}
                                        onClick={() => handleActivateUser(item)}
                                        aria-label="Réactiver le compte"
                                      >
                                        {updatingId === item.id ? (
                                          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                          <Unlock size={14} />
                                        )}
                                      </Button>
                                    </Tooltip>
                                  ) : (
                                    <Tooltip label="Désactiver le compte">
                                      <Button
                                        size="icon"
                                        variant="secondary"
                                        disabled={
                                          isCurrentUser ||
                                          updatingId === item.id
                                        }
                                        onClick={() =>
                                          handleDeactivateUser(item)
                                        }
                                        aria-label="Désactiver le compte"
                                      >
                                        {updatingId === item.id ? (
                                          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                          <Lock size={14} />
                                        )}
                                      </Button>
                                    </Tooltip>
                                  )}
                                  <Tooltip label="Supprimer définitivement">
                                    <Button
                                      size="icon"
                                      variant="destructive"
                                      disabled={
                                        isCurrentUser || updatingId === item.id
                                      }
                                      onClick={() => handleDeleteUser(item)}
                                      aria-label="Supprimer définitivement"
                                    >
                                      {updatingId === item.id ? (
                                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <Trash2 size={14} />
                                      )}
                                    </Button>
                                  </Tooltip>
                                </div>
                              </div>
                            </td>
                          </tr>
                        </>
                      )
                    })}
                </tbody>
              </table>
            </div>
            {filteredUsers.length > 10 && (
              <div className="p-4 border-t border-[#edf6ef] bg-[#f9fdf9]">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full md:w-auto"
                  onClick={() => setShowAllUsers(!showAllUsers)}
                >
                  {showAllUsers ? (
                    <>
                      <ChevronUp size={14} /> Masquer
                    </>
                  ) : (
                    <>
                      Voir plus ({filteredUsers.length - 10} restants)
                      <ChevronDown size={14} />
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-[#E8F5EB] bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="text-[#16a34a]" size={18} />
                <h2 className="font-bold text-[#1f2a1f]">Vue d’ensemble</h2>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center border-b border-[#edf6ef] pb-2">
                  <span className="text-[#64748b]">Admins actifs</span>
                  <span className="font-bold text-[#1f2a1f]">
                    {filteredUsers.filter((u) => u.role === "ADMIN").length}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-[#edf6ef] pb-2">
                  <span className="text-[#64748b]">Thèmes</span>
                  <span className="font-bold text-[#1f2a1f]">
                    {themes.data?.length ?? 0}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-[#edf6ef] pb-2">
                  <span className="text-[#64748b]">Dernière mise à jour</span>
                  <span className="font-bold text-[#1f2a1f]">Aujourd’hui</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#E8F5EB] bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="text-[#16a34a]" size={18} />
                <h2 className="font-bold text-[#1f2a1f]">Contrôles</h2>
              </div>
              <div className="space-y-3 text-sm text-[#1f2a1f]">
                <div className="flex items-center justify-between rounded-xl bg-[#f9fdf9] p-3">
                  <span>Modération</span>
                  <AlertCircle className="text-[#16a34a]" size={16} />
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#f9fdf9] p-3">
                  <span>Questions</span>
                  <span className="font-bold">
                    {stats.data?.questions ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#f9fdf9] p-3">
                  <span>App live</span>
                  <span className="font-bold text-[#16a34a]">OK</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#E8F5EB] bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <History className="text-[#16a34a]" size={18} />
                <h2 className="font-bold text-[#1f2a1f]">
                  Historique transactions
                </h2>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {transactions.loading ? (
                  <div className="text-sm text-[#A0A0A0]">Chargement...</div>
                ) : transactions.data && transactions.data.length > 0 ? (
                  displayedTransactions.map((t) => {
                    const amount = Number(t.montant || 0)

                    const credit = amount >= 0

                    return (
                      <div
                        key={t.id}
                        className="flex items-center justify-between text-sm border-b border-[#edf6ef] pb-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#1f2a1f] truncate">
                            {t.reference || t.type}
                          </p>
                          <p className="text-xs text-[#64748b]">
                            {relativeTime(t.creeLe)}
                          </p>
                        </div>
                        <span
                          className={`font-bold tabular-nums ${
                            credit ? "text-[#06A77D]" : "text-[#D62828]"
                          }`}
                        >
                          {credit ? "+" : ""}
                          {formatPoints(amount)}
                        </span>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-sm text-[#A0A0A0]">
                    Aucune transaction.
                  </div>
                )}
              </div>
              {transactions.data && transactions.data.length > 10 && (
                <div className="pt-3 border-t border-[#edf6ef]">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full md:w-auto"
                    onClick={() => setShowAllTransactions(!showAllTransactions)}
                  >
                    {showAllTransactions ? (
                      <>
                        <ChevronUp size={14} /> Masquer
                      </>
                    ) : (
                      <>
                        Voir plus ({transactions.data.length - 10} restantes)
                        <ChevronDown size={14} />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6 border-[#E8E8E8]">
        <CardContent className="p-0">
          <div className="flex flex-col gap-4 p-4 border-b border-[#F0F0F0] md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="text-[#FF6B35]" size={18} />
              <h2 className="font-bold text-[#2D3142]">
                Gestion des questions
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {orderedThemes.map((theme) => (
                <Button
                  key={theme.id}
                  size="sm"
                  variant={
                    selectedThemeId === Number(theme.id)
                      ? "default"
                      : "secondary"
                  }
                  onClick={() => setSelectedThemeId(Number(theme.id))}
                >
                  {theme.nom}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 p-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-[#2D3142]">
                  Questions du thème
                </h3>
                <div className="flex gap-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleImportExcel}
                      disabled={importingFile || !selectedThemeId}
                      className="hidden"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={importingFile || !selectedThemeId}
                      className="gap-2"
                    >
                      <FileSpreadsheet size={14} />
                      {importingFile ? "Import..." : "Importer Excel"}
                    </Button>
                  </label>
                  <Button
                    size="sm"
                    variant="success"
                    onClick={resetDraft}
                    className="gap-2"
                  >
                    <Plus size={14} />
                    Nouvelle question
                  </Button>
                </div>
              </div>

              {importResult && (
                <div
                  className={`rounded-xl p-3 text-sm ${
                    importResult.includes("Erreur")
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-green-50 text-green-700 border border-green-200"
                  }`}
                >
                  {importResult}
                </div>
              )}

              {questionsLoading ? (
                <div className="text-sm text-[#A0A0A0]">
                  Chargement des questions…
                </div>
              ) : questions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#D9D9D9] bg-[#F9F9F9] p-6 text-sm text-[#A0A0A0]">
                  Aucune question pour ce thème.
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {displayedQuestions.map((question) => (
                      <div
                        key={question.id}
                        className="rounded-xl border border-[#E8E8E8] bg-[#F9F9F9] p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="font-semibold text-[#2D3142]">
                              {question.texte}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {question.choix.map((choice) => (
                                <Badge
                                  key={choice.id}
                                  variant={
                                    choice.estCorrecte ? "won" : "default"
                                  }
                                  className="text-[10px]"
                                >
                                  {choice.texte}
                                  {choice.estCorrecte ? " • Bonne réponse" : ""}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <Tooltip label="Modifier la question">
                              <Button
                                size="icon"
                                variant="secondary"
                                onClick={() => loadQuestionForEdit(question)}
                                aria-label="Modifier la question"
                              >
                                <Pencil size={14} />
                              </Button>
                            </Tooltip>
                            <Tooltip label="Supprimer la question">
                              <Button
                                size="icon"
                                variant="destructive"
                                onClick={() =>
                                  handleDeleteQuestion(Number(question.id))
                                }
                                aria-label="Supprimer la question"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {questions.length > 10 && (
                    <div className="pt-3 border-t border-[#E8E8E8]">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full md:w-auto"
                        onClick={() => setShowAllQuestions(!showAllQuestions)}
                      >
                        {showAllQuestions ? (
                          <>
                            <ChevronUp size={14} /> Masquer
                          </>
                        ) : (
                          <>
                            Voir plus ({questions.length - 10} restantes)
                            <ChevronDown size={14} />
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] p-4">
              <h3 className="font-semibold text-[#2D3142] mb-3">
                {draft.id ? "Modifier la question" : "Ajouter une question"}
              </h3>
              <div className="space-y-4">
                <Input
                  label="Question"
                  value={draft.texte}
                  onChange={(e) =>
                    setDraft((current) => ({
                      ...current,
                      texte: e.target.value,
                    }))
                  }
                  placeholder="Saisissez la question"
                />

                <div className="space-y-3">
                  {draft.answers.map((answer, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-[#E8E8E8] bg-white p-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#A0A0A0]">
                          {index + 1}
                        </span>
                        <Input
                          value={answer.texte}
                          onChange={(e) => setAnswerText(index, e.target.value)}
                          placeholder={`Réponse ${index + 1}`}
                        />
                        <Button
                          size="sm"
                          variant={answer.estCorrecte ? "success" : "secondary"}
                          onClick={() => setCorrectAnswer(index)}
                          className="whitespace-nowrap"
                        >
                          {answer.estCorrecte ? (
                            <Check size={14} />
                          ) : (
                            "Bonne réponse"
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={resetDraft}>
                    Annuler
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => void handleSaveQuestion()}
                    loading={savingQuestion}
                  >
                    {draft.id ? "Enregistrer" : "Créer la question"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
