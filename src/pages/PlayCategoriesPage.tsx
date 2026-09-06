import { Gamepad2, Zap, Music, Activity, Target, Globe } from "lucide-react";
import { Button } from "../components/ui";
import type { NavigateFn } from "../App";
import usePageTitle from "@/lib/usePageTitle";

export default function PlayCategoriesPage({ onNavigate }: { onNavigate: NavigateFn }) {
  usePageTitle("Choisir une catégorie");
  const categories = [
    { key: "Quizz", label: "Quizz", icon: Gamepad2 },
    { key: "Quizz global", label: "Quizz global", icon: Globe },
    { key: "Squid Game", label: "Squid Game", icon: Zap },
    { key: "Mozika sy Mpanankanto", label: "Mozika & Art", icon: Music },
    { key: "course lapin", label: "Course lapin", icon: Activity },
    { key: "tir au but", label: "Tir au but", icon: Target },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <h1 className="text-2xl font-bold mb-4">Choisissez une catégorie</h1>
      <p className="text-sm text-[#64748b] mb-6">Sélectionnez le type de jeu que vous souhaitez lancer.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((c) => (
          <button
            key={c.key}
            onClick={() => {
              if (c.key === "Quizz global") {
                onNavigate("quizGlobal");
                return;
              }
              if (c.key === "Squid Game") {
                onNavigate("squidGame");
                return;
              }
              if (c.key === "course lapin") {
                onNavigate("rabbitRace");
                return;
              }
              if (c.key === "tir au but") {
                onNavigate("penaltyKick");
                return;
              }
              onNavigate("categoryThemes", undefined, c.key);
            }}
            className="flex flex-col items-start gap-3 p-6 rounded-2xl border border-[#e6f4ea] bg-white hover:shadow-md transition"
          >
            <div className="w-12 h-12 rounded-xl bg-[#f1faf5] flex items-center justify-center text-[#16a34a]"><c.icon size={20} /></div>
            <div>
              <h3 className="text-lg font-bold">{c.label}</h3>
              <p className="text-sm text-[#64748b]">Jouez des défis en direct pour {c.label}.</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
