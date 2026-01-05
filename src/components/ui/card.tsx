import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "highlight" | "danger" | "success";
}

const variantStyles = {
  default: "bg-white border border-gray-200",
  highlight: "bg-gray-50 border border-gray-200",
  danger: "bg-red-50 border border-red-200",
  success: "bg-emerald-50 border border-emerald-200",
};

export function Card({ children, className = "", variant = "default" }: CardProps) {
  return (
    <div className={`rounded-xl ${variantStyles[variant]} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-5 py-4 border-b border-gray-100 ${className}`}>{children}</div>;
}

export function CardContent({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-base font-semibold text-gray-900 ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm text-gray-500 mt-1 ${className}`}>{children}</p>;
}

// Specialized action card for recommendations
interface ActionCardProps {
  rank: number;
  itemName: string;
  category?: string;
  quadrant?: "STAR" | "PLOWHORSE" | "PUZZLE" | "DOG";
  action: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  kpis: {
    qtySold: number;
    avgPrice: number;
    unitMargin?: number;
    totalMargin?: number;
  };
  whyItMatters: string[];
  recommendationPrimary: string;
  recommendationAlternative?: string;
  guardrailsAndNotes?: string[];
  estimatedWeeklyUpsideUsd?: number;
}

export function ActionCard({
  rank,
  itemName,
  category,
  action,
  confidence,
  kpis,
  whyItMatters,
  recommendationPrimary,
  recommendationAlternative,
  guardrailsAndNotes,
  estimatedWeeklyUpsideUsd,
}: ActionCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4">
        {/* Header with rank and item info */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold">
                {rank}
              </span>
              <h4 className="text-base font-semibold text-gray-900 truncate">{itemName}</h4>
            </div>
            {category && <p className="text-xs text-gray-500 ml-8">{category}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                action === "KEEP" || action === "PROMOTE" || action === "KEEP_ANCHOR"
                  ? "bg-emerald-50 text-emerald-700"
                  : action === "REPRICE" || action === "REWORK_COST"
                  ? "bg-amber-50 text-amber-700"
                  : action === "REMOVE"
                  ? "bg-red-50 text-red-700"
                  : "bg-blue-50 text-blue-700"
              }`}
            >
              {action.replace("_", " ")}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                confidence === "HIGH"
                  ? "bg-emerald-50 text-emerald-700"
                  : confidence === "MEDIUM"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {confidence.toLowerCase()}
            </span>
          </div>
        </div>

        {/* KPI strip */}
        <div className="mt-3 flex items-center gap-4 text-xs">
          <div>
            <span className="text-gray-500">Qty:</span>{" "}
            <span className="font-medium text-gray-900">{kpis.qtySold}</span>
          </div>
          <div>
            <span className="text-gray-500">Price:</span>{" "}
            <span className="font-medium text-gray-900">${kpis.avgPrice.toFixed(2)}</span>
          </div>
          {kpis.unitMargin !== undefined && (
            <div>
              <span className="text-gray-500">Margin:</span>{" "}
              <span className="font-medium text-emerald-600">${kpis.unitMargin.toFixed(2)}</span>
            </div>
          )}
          {estimatedWeeklyUpsideUsd !== undefined && estimatedWeeklyUpsideUsd > 0 && (
            <div className="ml-auto">
              <span className="text-gray-500">Potential:</span>{" "}
              <span className="font-medium text-emerald-600">
                +${estimatedWeeklyUpsideUsd.toFixed(0)}/wk
              </span>
            </div>
          )}
        </div>

        {/* Why it matters */}
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-700 mb-2">Why it matters</p>
          <ul className="space-y-1">
            {whyItMatters.slice(0, 4).map((bullet, i) => (
              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-gray-400 mt-1">•</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recommendation */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-900">{recommendationPrimary}</p>
          {recommendationAlternative && (
            <p className="text-xs text-gray-500 mt-1">
              <em>Alternative:</em> {recommendationAlternative}
            </p>
          )}
        </div>

        {/* Guardrails */}
        {guardrailsAndNotes && guardrailsAndNotes.length > 0 && (
          <div className="mt-3">
            <ul className="space-y-1">
              {guardrailsAndNotes.map((note, i) => (
                <li key={i} className="text-xs text-gray-500 flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">⚠</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

// Summary card (for focus line + upside)
interface SummaryCardProps {
  focusLine: string;
  estimatedUpsideRange?: string;
}

export function SummaryCard({ focusLine, estimatedUpsideRange }: SummaryCardProps) {
  return (
    <Card variant="highlight" className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            This week's focus
          </p>
          <p className="text-base text-gray-900">{focusLine}</p>
        </div>
        {estimatedUpsideRange && (
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Est. upside
            </p>
            <p className="text-lg font-semibold text-emerald-600">{estimatedUpsideRange}</p>
          </div>
        )}
      </div>
    </Card>
  );
}

// Margin leak card
interface MarginLeakCardProps {
  itemName: string;
  category?: string;
  estimatedLossUsd: number;
  diagnosis: string;
  fixes: Array<{ label: string; detail: string }>;
}

export function MarginLeakCard({
  itemName,
  estimatedLossUsd,
  diagnosis,
  fixes,
}: MarginLeakCardProps) {
  return (
    <Card variant="danger" className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-red-600 text-lg">📉</span>
        <h4 className="text-sm font-semibold text-red-900">Biggest Margin Leak</h4>
      </div>
      <p className="text-base font-medium text-gray-900 mb-1">{itemName}</p>
      <p className="text-sm text-red-700 mb-3">
        Losing ~<strong>${estimatedLossUsd.toFixed(0)}/week</strong> in potential margin
      </p>
      <p className="text-sm text-gray-600 mb-3">{diagnosis}</p>
      <div className="space-y-2">
        {fixes.map((fix, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className="font-medium text-gray-700 w-20 flex-shrink-0">{fix.label}:</span>
            <span className="text-gray-600">{fix.detail}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// Easy win card
interface EasyWinCardProps {
  itemName: string;
  category?: string;
  action: string;
  confidence: string;
  rationale: string;
  estimatedUpsideUsd?: number;
}

export function EasyWinCard({
  itemName,
  action,
  confidence,
  rationale,
  estimatedUpsideUsd,
}: EasyWinCardProps) {
  return (
    <Card variant="success" className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-emerald-600 text-lg">🎯</span>
        <h4 className="text-sm font-semibold text-emerald-900">Easiest Win</h4>
      </div>
      <p className="text-base font-medium text-gray-900 mb-1">{itemName}</p>
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
          {action.replace("_", " ")}
        </span>
        <span className="text-xs text-gray-500">
          {confidence.toLowerCase()} confidence
        </span>
      </div>
      <p className="text-sm text-gray-600">{rationale}</p>
      {estimatedUpsideUsd !== undefined && estimatedUpsideUsd > 0 && (
        <p className="text-sm font-medium text-emerald-700 mt-2">
          Potential: +${estimatedUpsideUsd.toFixed(0)}/week
        </p>
      )}
    </Card>
  );
}
