import { type ReactNode } from "react";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted"
  | "star"
  | "plowhorse"
  | "puzzle"
  | "dog";

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger: "bg-red-50 text-red-700 border border-red-200",
  info: "bg-blue-50 text-blue-700 border border-blue-200",
  muted: "bg-gray-50 text-gray-500",
  star: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  plowhorse: "bg-blue-50 text-blue-700 border border-blue-200",
  puzzle: "bg-amber-50 text-amber-700 border border-amber-200",
  dog: "bg-red-50 text-red-700 border border-red-200",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = "default", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

// Specialized badges
export function QuadrantBadge({ quadrant }: { quadrant: "STAR" | "PLOWHORSE" | "PUZZLE" | "DOG" }) {
  const labels = {
    STAR: "Star",
    PLOWHORSE: "Plowhorse",
    PUZZLE: "Puzzle",
    DOG: "Dog",
  };
  return <Badge variant={quadrant.toLowerCase() as BadgeVariant}>{labels[quadrant]}</Badge>;
}

export function ConfidenceBadge({ confidence }: { confidence: "HIGH" | "MEDIUM" | "LOW" }) {
  const config = {
    HIGH: { label: "High", variant: "success" as const },
    MEDIUM: { label: "Medium", variant: "warning" as const },
    LOW: { label: "Low", variant: "muted" as const },
  };
  const { label, variant } = config[confidence];
  return <Badge variant={variant}>{label}</Badge>;
}

export function ActionBadge({
  action,
}: {
  action: "KEEP" | "PROMOTE" | "REPRICE" | "REPOSITION" | "REWORK_COST" | "REMOVE" | "KEEP_ANCHOR";
}) {
  const config: Record<string, { label: string; variant: BadgeVariant }> = {
    KEEP: { label: "Keep", variant: "success" },
    PROMOTE: { label: "Promote", variant: "success" },
    REPRICE: { label: "Reprice", variant: "warning" },
    REPOSITION: { label: "Reposition", variant: "info" },
    REWORK_COST: { label: "Rework cost", variant: "warning" },
    REMOVE: { label: "Remove", variant: "danger" },
    KEEP_ANCHOR: { label: "Keep (Anchor)", variant: "success" },
  };
  const { label, variant } = config[action] || { label: action, variant: "default" };
  return <Badge variant={variant}>{label}</Badge>;
}

export function DataQualityBadge({ badge }: { badge: "GOOD" | "MIXED" | "REVIEW" }) {
  const config = {
    GOOD: { label: "Good data", variant: "success" as const },
    MIXED: { label: "Mixed data", variant: "warning" as const },
    REVIEW: { label: "Review needed", variant: "danger" as const },
  };
  const { label, variant } = config[badge];
  return <Badge variant={variant}>{label}</Badge>;
}
