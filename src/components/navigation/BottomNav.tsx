import { Home, Gamepad2, MessageCircle, Wallet, User } from "lucide-react"

interface BottomNavProps {
  currentPage: string
  onNavigate: (page: string) => void
}

const tabs = [
  { id: "home", label: "Accueil", icon: Home },
  { id: "lobby", label: "Jouer", icon: Gamepad2 },
  { id: "community", label: "Social", icon: MessageCircle },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "profile", label: "Profil", icon: User },
]

export default function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  return (
    <nav className="hidden md:flex sticky bottom-0 z-30 border-t border-[#edf6ef] bg-white/90 backdrop-blur">
      <div className="grid w-full grid-cols-5 gap-1 px-2 py-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium ${
              currentPage === id ? "text-[#16a34a]" : "text-[#64748b]"
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}
