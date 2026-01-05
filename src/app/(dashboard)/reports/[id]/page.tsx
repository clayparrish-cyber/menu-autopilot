"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  Star,
  TrendingDown,
  HelpCircle,
  XCircle,
  Download,
  ArrowLeft,
  Lock,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ReportItem {
  id: string;
  itemId: string;
  itemName: string;
  category: string | null;
  isAnchor: boolean;
  quantitySold: number;
  netSales: number;
  avgPrice: number;
  unitFoodCost: number;
  unitMargin: number;
  totalMargin: number;
  foodCostPct: number;
  popularityPercentile: number;
  marginPercentile: number;
  profitPercentile: number;
  quadrant: "STAR" | "PLOWHORSE" | "PUZZLE" | "DOG";
  recommendedAction: string;
  suggestedPrice: number | null;
  priceChangeAmount: number | null;
  priceChangePct: number | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  explanation: string[];
}

interface ReportData {
  id: string;
  weekStart: string;
  weekEnd: string;
  locationName: string;
  generatedAt: string;
  summary: {
    totalItems: number;
    stars: number;
    plowhorses: number;
    puzzles: number;
    dogs: number;
    totalRevenue: number;
    totalMargin: number;
    avgFoodCostPct: number;
    topActions?: ReportItem[];
    marginLeaks?: ReportItem[];
    easyWins?: ReportItem[];
  };
  items: ReportItem[];
  lockedCount: number;
  hasSubscription: boolean;
}

const QUADRANT_CONFIG = {
  STAR: {
    label: "Star",
    icon: Star,
    color: "bg-green-100 text-green-700 border-green-200",
    bgColor: "bg-green-50",
  },
  PLOWHORSE: {
    label: "Plowhorse",
    icon: TrendingDown,
    color: "bg-blue-100 text-blue-700 border-blue-200",
    bgColor: "bg-blue-50",
  },
  PUZZLE: {
    label: "Puzzle",
    icon: HelpCircle,
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    bgColor: "bg-yellow-50",
  },
  DOG: {
    label: "Dog",
    icon: XCircle,
    color: "bg-red-100 text-red-700 border-red-200",
    bgColor: "bg-red-50",
  },
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  KEEP: { label: "Keep", color: "bg-green-100 text-green-700" },
  PROMOTE: { label: "Promote", color: "bg-green-100 text-green-700" },
  REPRICE: { label: "Reprice", color: "bg-orange-100 text-orange-700" },
  REPOSITION: { label: "Reposition", color: "bg-yellow-100 text-yellow-700" },
  REWORK: { label: "Rework", color: "bg-orange-100 text-orange-700" },
  REMOVE: { label: "Remove", color: "bg-red-100 text-red-700" },
};

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [filterQuadrant, setFilterQuadrant] = useState<string>("all");

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`/api/reports/${params.id}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Report not found");
          }
          throw new Error("Failed to fetch report");
        }
        const data = await res.json();
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [params.id]);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const downloadCSV = () => {
    if (!report) return;

    const headers = [
      "Item",
      "Category",
      "Qty Sold",
      "Net Sales",
      "Avg Price",
      "Food Cost",
      "Unit Margin",
      "Total Margin",
      "Food Cost %",
      "Quadrant",
      "Action",
      "Suggested Price",
      "Confidence",
    ];

    const rows = report.items.map((item) => [
      item.itemName,
      item.category || "",
      item.quantitySold,
      item.netSales.toFixed(2),
      item.avgPrice.toFixed(2),
      item.unitFoodCost.toFixed(2),
      item.unitMargin.toFixed(2),
      item.totalMargin.toFixed(2),
      item.foodCostPct.toFixed(1),
      item.quadrant,
      item.recommendedAction,
      item.suggestedPrice?.toFixed(2) || "",
      item.confidence,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `menu-report-${format(new Date(report.weekStart), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-700">{error || "Report not found"}</p>
        <Link href="/reports" className="text-blue-600 hover:text-blue-500 mt-2 inline-block">
          Back to reports
        </Link>
      </div>
    );
  }

  const filteredItems =
    filterQuadrant === "all"
      ? report.items
      : report.items.filter((i) => i.quadrant === filterQuadrant);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/reports"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to reports
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Week of {format(new Date(report.weekStart), "MMM d")} -{" "}
              {format(new Date(report.weekEnd), "MMM d, yyyy")}
            </h1>
            <p className="text-sm text-gray-500">
              {report.locationName} &bull; Generated{" "}
              {format(new Date(report.generatedAt), "MMM d, yyyy h:mm a")}
            </p>
          </div>
          <button
            onClick={downloadCSV}
            disabled={!report.hasSubscription}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="mr-2 h-4 w-4" />
            Download CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total Items</p>
          <p className="text-2xl font-bold text-gray-900">{report.summary.totalItems}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900">
            ${report.summary.totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total Margin</p>
          <p className="text-2xl font-bold text-green-600">
            ${report.summary.totalMargin.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Avg Food Cost</p>
          <p className="text-2xl font-bold text-gray-900">
            {report.summary.avgFoodCostPct?.toFixed(1) || "N/A"}%
          </p>
        </div>
      </div>

      {/* Quadrant Distribution */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Menu Matrix</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(["STAR", "PLOWHORSE", "PUZZLE", "DOG"] as const).map((quadrant) => {
            const config = QUADRANT_CONFIG[quadrant];
            const Icon = config.icon;
            const count =
              report.summary[
                quadrant.toLowerCase() as "stars" | "plowhorses" | "puzzles" | "dogs"
              ] ||
              report.items.filter((i) => i.quadrant === quadrant).length;

            return (
              <button
                key={quadrant}
                onClick={() =>
                  setFilterQuadrant(filterQuadrant === quadrant ? "all" : quadrant)
                }
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  filterQuadrant === quadrant
                    ? `${config.color} border-current`
                    : `${config.bgColor} border-transparent hover:border-gray-300`
                }`}
              >
                <Icon className="h-6 w-6 mb-2" />
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-sm">{config.label}s</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Paywall Notice */}
      {!report.hasSubscription && report.lockedCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center">
            <Lock className="h-5 w-5 text-yellow-600 mr-2" />
            <p className="text-yellow-800">
              {report.lockedCount} more items are locked. Subscribe to see the full report.
            </p>
          </div>
          <Link
            href="/billing"
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Upgrade Now
          </Link>
        </div>
      )}

      {/* Items Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">
            {filterQuadrant === "all"
              ? "All Items"
              : `${QUADRANT_CONFIG[filterQuadrant as keyof typeof QUADRANT_CONFIG].label}s`}
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({filteredItems.length} items)
            </span>
          </h2>
          {filterQuadrant !== "all" && (
            <button
              onClick={() => setFilterQuadrant("all")}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Show all
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sales
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Margin
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quadrant
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => {
                const quadrantConfig = QUADRANT_CONFIG[item.quadrant];
                const actionConfig = ACTION_LABELS[item.recommendedAction];
                const isExpanded = expandedItems.has(item.id);

                return (
                  <>
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleExpanded(item.id)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {item.itemName}
                            {item.isAnchor && (
                              <span className="ml-2 text-xs text-gray-500">(Anchor)</span>
                            )}
                          </p>
                          {item.category && (
                            <p className="text-xs text-gray-500">{item.category}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        {item.quantitySold}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        ${item.netSales.toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-sm font-medium text-green-600">
                          ${item.totalMargin.toFixed(0)}
                        </p>
                        <p className="text-xs text-gray-500">
                          ${item.unitMargin.toFixed(2)}/ea
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${quadrantConfig.color}`}
                        >
                          {quadrantConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${actionConfig.color}`}
                        >
                          {actionConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.confidence === "HIGH" && (
                          <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                        )}
                        {item.confidence === "MEDIUM" && (
                          <AlertTriangle className="h-5 w-5 text-yellow-500 mx-auto" />
                        )}
                        {item.confidence === "LOW" && (
                          <HelpCircle className="h-5 w-5 text-gray-400 mx-auto" />
                        )}
                      </td>
                      <td className="px-2 py-3">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${item.id}-details`} className="bg-gray-50">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-gray-500">Avg Price</p>
                              <p className="text-sm font-medium">
                                ${item.avgPrice.toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Food Cost</p>
                              <p className="text-sm font-medium">
                                ${item.unitFoodCost.toFixed(2)} ({item.foodCostPct.toFixed(1)}%)
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Popularity Rank</p>
                              <p className="text-sm font-medium">
                                {item.popularityPercentile.toFixed(0)}th percentile
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Margin Rank</p>
                              <p className="text-sm font-medium">
                                {item.marginPercentile.toFixed(0)}th percentile
                              </p>
                            </div>
                          </div>

                          {item.suggestedPrice && (
                            <div className="bg-blue-50 rounded-md p-3 mb-4">
                              <p className="text-sm font-medium text-blue-800">
                                Suggested Price: ${item.suggestedPrice.toFixed(2)}
                              </p>
                              <p className="text-xs text-blue-600">
                                +${item.priceChangeAmount?.toFixed(2)} (
                                {item.priceChangePct?.toFixed(1)}% increase)
                              </p>
                            </div>
                          )}

                          <div>
                            <p className="text-xs text-gray-500 mb-2">Why this recommendation:</p>
                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                              {item.explanation.map((e, i) => (
                                <li key={i}>{e}</li>
                              ))}
                            </ul>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
