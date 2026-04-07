"use client";

interface Props {
  label: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | string;
  score?: number;
  size?: "sm" | "md" | "lg";
  showScore?: boolean;
}

export default function RiskBadge({
  label,
  score,
  size = "md",
  showScore = true,
}: Props) {
  const getStyles = (label: string) => {
    switch (label.toUpperCase()) {
      case "CRITICAL":
        return "bg-red-100 text-red-700 border-red-200";
      case "HIGH":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "LOW":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getSize = (size: Props["size"]) => {
    switch (size) {
      case "lg":
        return "px-3 py-1 text-sm";
      case "sm":
        return "px-2 py-0.5 text-[10px]";
      default:
        return "px-2.5 py-1 text-xs";
    }
  };

  return (
    <div
      className={`
        inline-flex items-center gap-1.5
        rounded-full border font-black uppercase tracking-widest
        ${getStyles(label)}
        ${getSize(size)}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${
        label.toUpperCase() === "CRITICAL" ? "bg-red-500" :
        label.toUpperCase() === "HIGH" ? "bg-orange-500" :
        label.toUpperCase() === "MEDIUM" ? "bg-yellow-500" :
        label.toUpperCase() === "LOW" ? "bg-green-500" : "bg-gray-500"
      }`} />
      
      <span>{label}</span>

      {showScore && typeof score === "number" && (
        <span className="opacity-60 font-bold">
          {score}
        </span>
      )}
    </div>
  );
}
