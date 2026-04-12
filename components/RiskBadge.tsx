"use client";

interface Props {
  label?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | string;
  score?: number;
  size?: "sm" | "md" | "lg";
  showScore?: boolean;
}

/* =========================
   HELPERS
========================= */

function getLabel(score?: number, label?: string) {
  if (label) return label.toUpperCase();

  if (score === undefined) return "LOW";

  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 30) return "MEDIUM";
  return "LOW";
}

function getStyles(label: string) {
  switch (label) {
    case "CRITICAL":
      return "bg-red-100 text-red-700 border-red-300";
    case "HIGH":
      return "bg-orange-100 text-orange-700 border-orange-300";
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-700 border-yellow-300";
    case "LOW":
      return "bg-green-100 text-green-700 border-green-300";
    default:
      return "bg-gray-100 text-gray-700 border-gray-300";
  }
}

function getDot(label: string) {
  switch (label) {
    case "CRITICAL":
      return "bg-red-500";
    case "HIGH":
      return "bg-orange-500";
    case "MEDIUM":
      return "bg-yellow-500";
    case "LOW":
      return "bg-green-500";
    default:
      return "bg-gray-500";
  }
}

function getSize(size: Props["size"]) {
  switch (size) {
    case "lg":
      return "px-3 py-1 text-sm";
    case "sm":
      return "px-2 py-0.5 text-[10px]";
    default:
      return "px-2.5 py-1 text-xs";
  }
}

function getAnimation(label: string) {
  if (label === "CRITICAL") return "animate-pulse";
  if (label === "HIGH") return "animate-pulse";
  return "";
}

/* =========================
   COMPONENT
========================= */

export default function RiskBadge({
  label,
  score,
  size = "md",
  showScore = true,
}: Props) {
  const finalLabel = getLabel(score, label);

  return (
    <div
      className={`
        inline-flex items-center gap-1.5
        rounded-full border font-black uppercase tracking-widest
        transition-all duration-200
        ${getStyles(finalLabel)}
        ${getSize(size)}
        ${getAnimation(finalLabel)}
      `}
    >
      {/* DOT */}
      <span
        className={`
          w-1.5 h-1.5 rounded-full
          ${getDot(finalLabel)}
        `}
      />

      {/* LABEL */}
      <span>{finalLabel}</span>

      {/* SCORE */}
      {showScore && typeof score === "number" && (
        <span className="opacity-60 font-bold">
          {score}%
        </span>
      )}
    </div>
  );
}
