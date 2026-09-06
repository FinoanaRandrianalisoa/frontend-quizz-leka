interface QuestionCardProps {
  index: number;
  total: number;
  category: string;
  question: string;
  categoryColor?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Géographie":  "#004E89",
  "Histoire":    "#D62828",
  "Culture":     "#9B59B6",
  "Nature":      "#06A77D",
  "Économie":    "#FF6B35",
  "Gastronomie": "#F59E0B",
  "Sport":       "#E74C3C",
  "Sciences":    "#3498DB",
  "Littérature": "#8E44AD",
  "Traditions":  "#E91E63",
  "default":     "#FF6B35",
};

export default function QuestionCard({ index, total, category, question }: QuestionCardProps) {
  const color = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.default;

  return (
    <div className="bg-white rounded-2xl border-2 border-[#E8E8E8] p-5 mb-4 animate-fade-in-up shadow-sm">
      {/* Top row */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-500"
              style={{
                width: i < index ? 20 : 8,
                background: i < index ? color : "#E8E8E8",
              }}
            />
          ))}
        </div>
        <span className="ml-auto text-xs font-bold text-[#A0A0A0] shrink-0">
          {index} / {total}
        </span>
      </div>

      {/* Category pill */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
          style={{ background: color + "18", color }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
          {category}
        </span>
      </div>

      {/* Question */}
      <p className="text-base md:text-lg font-bold text-[#2D3142] leading-snug">
        {question}
      </p>
    </div>
  );
}
