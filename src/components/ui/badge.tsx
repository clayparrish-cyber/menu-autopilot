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
  title?: string;
}

export function Badge({ variant = "default", children, className = "", title }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}
      title={title}
    >
      {children}
    </span>
  );
}

// Quadrant definitions for tooltips
export const QUADRANT_DESCRIPTIONS = {
  STAR: "High popularity + High margin. Your best performers — promote and protect these items.",
  PLOWHORSE: "High popularity + Low margin. Customers love them but they're eating into profits. Consider repricing or cost reduction.",
  PUZZLE: "Low popularity + High margin. Profitable when they sell, but underperforming on volume. Reposition for better visibility.",
  DOG: "Low popularity + Low margin. Taking up menu space without contributing. Consider removing or reworking.",
};

// Specialized badges
export function QuadrantBadge({
  quadrant,
  showTooltip = true
}: {
  quadrant: "STAR" | "PLOWHORSE" | "PUZZLE" | "DOG";
  showTooltip?: boolean;
}) {
  const labels = {
    STAR: "Star",
    PLOWHORSE: "Plowhorse",
    PUZZLE: "Puzzle",
    DOG: "Dog",
  };
  // Plain text for quadrant - not the main focus
  return (
    <span
      className="text-sm text-gray-600"
      title={showTooltip ? QUADRANT_DESCRIPTIONS[quadrant] : undefined}
    >
      {labels[quadrant]}
    </span>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: "HIGH" | "MEDIUM" | "LOW" }) {
  // Simple text-based confidence indicator, no colorful badge
  const config = {
    HIGH: { dots: "●●●", label: "High" },
    MEDIUM: { dots: "●●○", label: "Med" },
    LOW: { dots: "●○○", label: "Low" },
  };
  const { dots, label } = config[confidence];
  return (
    <span className="text-xs text-gray-500" title={`${label} confidence`}>
      {dots}
    </span>
  );
}

export function ActionBadge({
  action,
}: {
  action: "KEEP" | "PROMOTE" | "REPRICE" | "REPOSITION" | "REWORK_COST" | "REMOVE" | "KEEP_ANCHOR";
}) {
  // Colored badges for actions - this is the key info to draw attention to
  const config: Record<string, { label: string; className: string }> = {
    KEEP: { label: "Keep", className: "bg-gray-100 text-gray-600" },
    PROMOTE: { label: "Promote", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
    REPRICE: { label: "Reprice", className: "bg-amber-50 text-amber-700 border border-amber-200" },
    REPOSITION: { label: "Reposition", className: "bg-blue-50 text-blue-700 border border-blue-200" },
    REWORK_COST: { label: "Rework cost", className: "bg-amber-50 text-amber-700 border border-amber-200" },
    REMOVE: { label: "Remove", className: "bg-red-50 text-red-700 border border-red-200" },
    KEEP_ANCHOR: { label: "Keep", className: "bg-gray-100 text-gray-600" },
  };
  const { label, className } = config[action] || { label: action, className: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export function DataQualityBadge({ badge }: { badge: "GOOD" | "MIXED" | "REVIEW" }) {
  const config = {
    GOOD: { label: "Good data", dotColor: "bg-emerald-500" },
    MIXED: { label: "Mixed data", dotColor: "bg-amber-500" },
    REVIEW: { label: "Review needed", dotColor: "bg-red-500" },
  };
  const { label, dotColor } = config[badge];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
}

export function CostSourceBadge({ source }: { source: "MANUAL" | "MARGINEDGE" | "ESTIMATE" }) {
  const config = {
    MARGINEDGE: { label: "ME", variant: "info" as const, title: "MarginEdge" },
    MANUAL: { label: "Manual", variant: "muted" as const, title: "Manual entry" },
    ESTIMATE: { label: "Est", variant: "muted" as const, title: "Estimated (30% of price)" },
  };
  const { label, variant, title } = config[source];
  return (
    <Badge variant={variant} className="text-[10px] px-1.5" title={title}>
      {label}
    </Badge>
  );
}
