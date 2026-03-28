"use client";

interface Props {
  label: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | string;
  score?: number;
  size?: "sm" | "md" | "lg";
  showScore?: boolean;
}

/* =========================
   STYLE SYSTEM
========================= */
function getStyles(label: string) {
  switch (label) {
    case "CRITICAL":
      return "bg-red-600 text-white border-red-700";
    case "HIGH":
      return "bg-orange-500 text-white border-orange-600";
    case "MEDIUM":
      return "bg-yellow-400 text-black border-yellow-500";
    case "LOW":
      return "bg-green-500 text-white border-green-600";
    default:
      return "bg-gray-400 text-white border-gray-500";
  }
}

/* =========================
   SIZE SYSTEM
========================= */
function getSize(size: Props["size"]) {
  switch (size) {
    case "lg":
      return "text-sm px-3 py-1.5";
    case "sm":
      return "text-xs px-2 py-0.5";
    default:
      return "text-xs px-2 py-1";
  }
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
  const styles = getStyles(label);
  const sizeClass = getSize(size);

  return (
    <div
      className={`
        inline-flex items-center gap-1
        rounded-full border font-medium
        ${styles}
        ${sizeClass}
      `}
    >
      {/* Indicator Dot */}
      <span className="w-1.5 h-1.5 rounded-full bg-white opacity-80" />

      {/* Label */}
      <span>{label}</span>

      {/* Score */}
      {showScore && typeof score === "number" && (
        <span className="opacity-80">
          ({score})
        </span>
      )}
    </div>
  );
}
