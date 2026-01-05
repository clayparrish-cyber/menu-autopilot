"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Download, ExternalLink, ChevronUp, ChevronDown, Mail, Search, X } from "lucide-react";
import type { WeeklyReportPayload } from "@/lib/report/types";
import { ItemDetailModal } from "@/components/ui/item-detail-modal";
import { EmailReportDialog } from "@/components/ui/email-report-dialog";
import { MenuMatrixChart, type MenuMatrixItem } from "@/components/ui/menu-matrix-chart";
import {
  Card,
  CardContent,
  ActionCard,
  SummaryCard,
  MarginLeakCard,
  TopOpportunityCard,
  RecentWinCard,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DataQualityBadge,
  ActionBadge,
  ConfidenceBadge,
  CostSourceBadge,
} from "@/components/ui/badge";
import { Accordion } from "@/components/ui/accordion";
import { WithTooltip } from "@/components/ui/tooltip";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";

export default function ReportDetailPage() {
  const params = useParams();
  const [report, setReport] = useState<WeeklyReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSubscription, setHasSubscription] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>("qty");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [quadrantFilter, setQuadrantFilter] = useState<string>("");

  // Filter and sort the recommendations table
  const sortedRecommendations = useMemo(() => {
    if (!report?.topRecommendationsTable) return [];

    // Apply filters
    let items = report.topRecommendationsTable.filter((row) => {
      // Search filter (item name or category)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = row.itemName.toLowerCase().includes(query);
        const categoryMatch = row.category?.toLowerCase().includes(query);
        if (!nameMatch && !categoryMatch) return false;
      }
      // Action filter
      if (actionFilter && row.action !== actionFilter) return false;
      // Quadrant filter
      if (quadrantFilter && row.quadrant !== quadrantFilter) return false;
      return true;
    });

    items = [...items];
    items.sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortColumn) {
        case "item":
          aVal = a.itemName.toLowerCase();
          bVal = b.itemName.toLowerCase();
          break;
        case "quadrant":
          const quadrantOrder = { STAR: 1, PLOWHORSE: 2, PUZZLE: 3, DOG: 4 };
          aVal = quadrantOrder[a.quadrant as keyof typeof quadrantOrder] || 5;
          bVal = quadrantOrder[b.quadrant as keyof typeof quadrantOrder] || 5;
          break;
        case "action":
          // Order: Performing (KEEP) first, then Promote, Reprice, Reposition, Rework, Remove last
          const actionOrder = { KEEP: 1, PROMOTE: 2, REPRICE: 3, REPOSITION: 4, REWORK_COST: 5, REMOVE: 6, KEEP_ANCHOR: 1 };
          aVal = actionOrder[a.action as keyof typeof actionOrder] || 7;
          bVal = actionOrder[b.action as keyof typeof actionOrder] || 7;
          break;
        case "qty":
          aVal = a.qtySold;
          bVal = b.qtySold;
          break;
        case "price":
          aVal = a.avgPrice;
          bVal = b.avgPrice;
          break;
        case "cost":
          aVal = a.unitCost ?? 0;
          bVal = b.unitCost ?? 0;
          break;
        case "costPct":
          aVal = a.unitCost && a.avgPrice ? a.unitCost / a.avgPrice : 0;
          bVal = b.unitCost && b.avgPrice ? b.unitCost / b.avgPrice : 0;
          break;
        case "margin":
          aVal = a.unitMargin ?? 0;
          bVal = b.unitMargin ?? 0;
          break;
        default:
          return 0;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return items;
  }, [report?.topRecommendationsTable, sortColumn, sortDirection, searchQuery, actionFilter, quadrantFilter]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const SortableHeader = ({ column, children, align = "left" }: { column: string; children: React.ReactNode; align?: "left" | "center" | "right" }) => (
    <TableCell
      header
      align={align}
      className="cursor-pointer select-none hover:bg-gray-50 transition-colors whitespace-nowrap"
      onClick={() => handleSort(column)}
    >
      <span className="inline-flex items-center gap-0.5">
        {children}
        {sortColumn === column ? (
          sortDirection === "asc" ? (
            <ChevronUp className="h-3 w-3 text-gray-500" />
          ) : (
            <ChevronDown className="h-3 w-3 text-gray-500" />
          )
        ) : (
          <span className="w-3" />
        )}
      </span>
    </TableCell>
  );

  useEffect(() => {
    async function fetchReport() {
      try {
        const fullRes = await fetch(`/api/reports/${params.id}/full`);
        if (fullRes.ok) {
          const data = await fullRes.json();
          setReport(data);
          setHasSubscription(true);
        } else if (fullRes.status === 403) {
          setHasSubscription(false);
          const basicRes = await fetch(`/api/reports/${params.id}`);
          if (!basicRes.ok) throw new Error("Failed to fetch report");
          const basic = await basicRes.json();
          setReport({
            reportId: basic.id,
            accountName: "",
            locationName: basic.locationName,
            weekStart: basic.weekStart.split("T")[0],
            weekEnd: basic.weekEnd.split("T")[0],
            dataQuality: { badge: "GOOD", note: "Data loaded" },
            focusLine: "Upgrade to see your personalized weekly focus and action items.",
            topActions: basic.items.slice(0, 3).map((item: any, i: number) => ({
              itemName: item.itemName,
              category: item.category,
              quadrant: item.quadrant,
              action: item.recommendedAction,
              confidence: item.confidence,
              kpis: {
                qtySold: item.quantitySold,
                netSales: item.netSales,
                avgPrice: item.avgPrice,
                unitCost: item.unitFoodCost,
                unitMargin: item.unitMargin,
                totalMargin: item.totalMargin,
              },
              ranks: {
                popularityRank: i + 1,
                totalItems: basic.items.length,
                popularityPercentile: item.popularityPercentile,
              },
              whyItMatters: item.explanation || ["Upgrade to see detailed analysis"],
              recommendationPrimary: "Upgrade to see recommendation",
            })),
            links: {
              reportUrl: "",
              recommendationsCsvUrl: "",
              costEditorUrl: "/items",
            },
          } as WeeklyReportPayload);
        } else if (fullRes.status === 404) {
          throw new Error("Report not found");
        } else {
          throw new Error("Failed to fetch report");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card variant="danger" className="p-6">
          <p className="text-red-700 mb-4">{error || "Report not found"}</p>
          <Link href="/reports" className="text-blue-600 hover:text-blue-500">
            Back to reports
          </Link>
        </Card>
      </div>
    );
  }

  const weekStartDate = new Date(report.weekStart + "T00:00:00");
  const weekEndDate = new Date(report.weekEnd + "T00:00:00");

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href="/reports"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        All reports
      </Link>

      {/* Header */}
      <header className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {format(weekStartDate, "MMM d")} – {format(weekEndDate, "MMM d, yyyy")}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{report.locationName}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <WithTooltip tip="Sufficient sales volume and cost data coverage for reliable analysis">
              <DataQualityBadge badge={report.dataQuality.badge} />
            </WithTooltip>
            <WithTooltip tip="Enough weekly sales to identify meaningful patterns and trends">
              <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                High confidence recommendations
              </span>
            </WithTooltip>
          </div>
        </div>
      </header>

      {/* Week Summary KPIs */}
      {(report.currentWeekSummary || (report.categorySummary && report.categorySummary.length > 0)) && (
        <section className="mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Week Summary
          </h2>
          {(() => {
            const current = report.currentWeekSummary || (report.categorySummary ? {
              revenue: report.categorySummary.reduce((acc, cat) => acc + cat.netSales, 0),
              grossMargin: report.categorySummary.reduce((acc, cat) => acc + (cat.totalMargin || 0), 0),
              itemsSold: report.categorySummary.reduce((acc, cat) => acc + cat.qtySold, 0),
            } : { revenue: 0, grossMargin: 0, itemsSold: 0 });

            const prior = report.priorWeekSummary;
            const marginPct = current.revenue > 0 ? (current.grossMargin / current.revenue) * 100 : 0;
            const priorMarginPct = prior && prior.revenue > 0 ? (prior.grossMargin / prior.revenue) * 100 : null;

            const revenueDelta = prior ? ((current.revenue - prior.revenue) / prior.revenue) * 100 : null;
            const marginDelta = prior ? ((current.grossMargin - prior.grossMargin) / prior.grossMargin) * 100 : null;
            const marginPctDelta = priorMarginPct !== null ? marginPct - priorMarginPct : null;
            const qtyDelta = prior ? ((current.itemsSold - prior.itemsSold) / prior.itemsSold) * 100 : null;

            const DeltaBadge = ({ delta, suffix = "%" }: { delta: number | null; suffix?: string }) => {
              if (delta === null) return null;
              const isPositive = delta > 0;
              const isNeutral = Math.abs(delta) < 0.5;
              return (
                <span className={`text-xs font-medium ${
                  isNeutral ? 'text-gray-500' : isPositive ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {isPositive ? '↑' : delta < 0 ? '↓' : '→'} {Math.abs(delta).toFixed(1)}{suffix}
                </span>
              );
            };

            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Revenue</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    ${current.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <DeltaBadge delta={revenueDelta} />
                    {prior && <span className="text-xs text-gray-400">vs last week</span>}
                  </div>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Gross Margin</p>
                  <p className="text-2xl font-semibold text-emerald-600">
                    ${current.grossMargin.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <DeltaBadge delta={marginDelta} />
                    {prior && <span className="text-xs text-gray-400">vs last week</span>}
                  </div>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Margin %</p>
                  <p className={`text-2xl font-semibold ${marginPct >= 70 ? 'text-emerald-600' : marginPct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                    {marginPct.toFixed(1)}%
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <DeltaBadge delta={marginPctDelta} suffix=" pts" />
                    <span className="text-xs text-gray-400">target: 70%</span>
                  </div>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Items Sold</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {current.itemsSold.toLocaleString()}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <DeltaBadge delta={qtyDelta} />
                    {prior && <span className="text-xs text-gray-400">vs last week</span>}
                  </div>
                </Card>
              </div>
            );
          })()}
        </section>
      )}

      {/* Executive Summary */}
      <section className="mb-8">
        <SummaryCard
          focusLine={report.focusLine}
          estimatedUpsideRange={report.estimatedUpsideRange}
        />
      </section>

      {/* Paywall Notice */}
      {!hasSubscription && (
        <Card variant="highlight" className="p-5 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 mb-1">Unlock the full report</p>
              <p className="text-sm text-gray-600">
                Get detailed action cards, margin leak analysis, and CSV exports.
              </p>
            </div>
            <Link href="/billing">
              <Button variant="primary">Upgrade Now</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Top 3 Actions */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Top 3 actions <span className="font-normal text-gray-500">(do these first)</span>
        </h2>
        <div className="space-y-4">
          {report.topActions.slice(0, 3).map((action, index) => (
            <ActionCard
              key={action.itemName}
              rank={index + 1}
              itemName={action.itemName}
              category={action.category}
              quadrant={action.quadrant}
              action={action.action}
              confidence={action.confidence}
              kpis={action.kpis}
              whyItMatters={action.whyItMatters}
              recommendationPrimary={action.recommendationPrimary}
              recommendationAlternative={action.recommendationAlternative}
              guardrailsAndNotes={action.guardrailsAndNotes}
              estimatedWeeklyUpsideUsd={action.estimatedWeeklyUpsideUsd}
            />
          ))}
        </div>
      </section>

      {/* At a Glance: Recent Win, Top Opportunity, Biggest Leak */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          At a glance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recent Wins - shows actual improvements */}
          <RecentWinCard wins={report.recentWins || []} />

          {/* Top Opportunity - easiest action to take */}
          {report.topOpportunity ? (
            <TopOpportunityCard
              itemName={report.topOpportunity.itemName}
              category={report.topOpportunity.category}
              action={report.topOpportunity.action}
              confidence={report.topOpportunity.confidence}
              rationale={report.topOpportunity.rationale}
              estimatedUpsideUsd={report.topOpportunity.estimatedUpsideUsd}
            />
          ) : (
            <Card className="p-5 bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-gray-400 text-lg">🎯</span>
                <h4 className="text-sm font-semibold text-gray-600">Top Opportunity</h4>
              </div>
              <p className="text-sm text-gray-500">
                No clear opportunities identified this week.
              </p>
            </Card>
          )}

          {/* Biggest Margin Leak - most urgent problem */}
          {report.biggestMarginLeak ? (
            <MarginLeakCard
              itemName={report.biggestMarginLeak.itemName}
              category={report.biggestMarginLeak.category}
              estimatedLossUsd={report.biggestMarginLeak.estimatedLossUsd}
              diagnosis={report.biggestMarginLeak.diagnosis}
              confidence={report.biggestMarginLeak.confidence}
              fixes={report.biggestMarginLeak.fixes}
            />
          ) : (
            <Card className="p-5 bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-gray-400 text-lg">📉</span>
                <h4 className="text-sm font-semibold text-gray-600">Margin Leaks</h4>
              </div>
              <p className="text-sm text-gray-500">
                No significant margin leaks detected.
              </p>
            </Card>
          )}
        </div>
      </section>

      {/* Watch List */}
      {report.watchList && report.watchList.length > 0 && (
        <section className="mb-8 space-y-3">
          <Accordion
            title="Watch list"
            badge={
              <span className="text-xs text-gray-500">
                {report.watchList.length} items
              </span>
            }
          >
            <p className="text-xs text-gray-500 mb-3">
              Low-confidence items or abnormal volatility. Recheck next week.
            </p>
            <ul className="space-y-2">
              {report.watchList.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-gray-400">•</span>
                  <span>
                    <strong className="text-gray-900">{item.itemName}</strong>
                    {item.category && (
                      <span className="text-gray-500"> ({item.category})</span>
                    )}
                    <span className="text-gray-600"> — {item.reason}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Accordion>
        </section>
      )}

      {/* Menu Matrix Scatter Plot */}
      {report.quadrantSummary && report.allItemsLookup && (
        <section className="mb-8">
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Menu Matrix
              </h3>
              {(() => {
                // Transform data for scatter plot
                const chartItems: MenuMatrixItem[] = [];
                const itemLookup = report.allItemsLookup;
                const quadrantMap: Record<string, "STAR" | "PLOWHORSE" | "PUZZLE" | "DOG"> = {};

                // Build quadrant mapping from quadrantSummary
                report.quadrantSummary!.stars.forEach((name) => (quadrantMap[name] = "STAR"));
                report.quadrantSummary!.plowhorses.forEach((name) => (quadrantMap[name] = "PLOWHORSE"));
                report.quadrantSummary!.puzzles.forEach((name) => (quadrantMap[name] = "PUZZLE"));
                report.quadrantSummary!.dogs.forEach((name) => (quadrantMap[name] = "DOG"));

                // Convert lookup to chart items
                Object.entries(itemLookup).forEach(([itemName, data]) => {
                  if (quadrantMap[itemName]) {
                    chartItems.push({
                      itemName,
                      category: data.category,
                      qtySold: data.qtySold || 0,
                      avgPrice: data.avgPrice || 0,
                      unitMargin: data.unitMargin,
                      quadrant: quadrantMap[itemName],
                    });
                  }
                });

                return <MenuMatrixChart items={chartItems} />;
              })()}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Top 20 Recommendations Table */}
      {report.topRecommendationsTable && report.topRecommendationsTable.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">All Recommendations</h2>
            {hasSubscription && (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setEmailDialogOpen(true)}
                  className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
                >
                  <Mail className="mr-1 h-4 w-4" />
                  Email Report
                </button>
                <a
                  href={`/api/reports/${params.id}/csv`}
                  download
                  className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
                >
                  <Download className="mr-1 h-4 w-4" />
                  Download CSV
                </a>
              </div>
            )}
          </div>

          {/* Filter controls */}
          <div className="flex flex-wrap gap-3 mb-4">
            {/* Search input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {/* Action filter */}
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              <option value="KEEP">Performing</option>
              <option value="PROMOTE">Promote</option>
              <option value="REPRICE">Reprice</option>
              <option value="REPOSITION">Reposition</option>
              <option value="REWORK_COST">Rework Cost</option>
              <option value="REMOVE">Remove</option>
            </select>
            {/* Quadrant filter */}
            <select
              value={quadrantFilter}
              onChange={(e) => setQuadrantFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Quadrants</option>
              <option value="STAR">Stars</option>
              <option value="PLOWHORSE">Plowhorses</option>
              <option value="PUZZLE">Puzzles</option>
              <option value="DOG">Dogs</option>
            </select>
            {/* Clear filters */}
            {(searchQuery || actionFilter || quadrantFilter) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActionFilter("");
                  setQuadrantFilter("");
                }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Results count */}
          {(searchQuery || actionFilter || quadrantFilter) && (
            <p className="text-sm text-gray-500 mb-3">
              Showing {sortedRecommendations.length} of {report.topRecommendationsTable.length} items
            </p>
          )}

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader column="item">Item</SortableHeader>
                  <SortableHeader column="action" align="center">Action</SortableHeader>
                  <SortableHeader column="qty" align="right">Qty</SortableHeader>
                  <SortableHeader column="price" align="right">Price</SortableHeader>
                  <SortableHeader column="cost" align="right">Cost</SortableHeader>
                  <SortableHeader column="costPct" align="right">%</SortableHeader>
                  <SortableHeader column="margin" align="right">Margin</SortableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {((searchQuery || actionFilter || quadrantFilter) ? sortedRecommendations : sortedRecommendations.slice(0, 20)).map((row) => (
                  <TableRow
                    key={row.itemName}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setSelectedItem(row)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900 hover:text-blue-600">{row.itemName}</p>
                        {row.category && (
                          <p className="text-xs text-gray-500">{row.category}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell align="center">
                      <ActionBadge action={row.action} />
                    </TableCell>
                    <TableCell align="right">{row.qtySold}</TableCell>
                    <TableCell align="right">${row.avgPrice.toFixed(2)}</TableCell>
                    <TableCell align="right">${row.unitCost?.toFixed(2) ?? "—"}</TableCell>
                    <TableCell align="right">
                      {row.unitCost !== undefined && row.avgPrice > 0 ? (
                        <span className={`font-medium ${
                          (row.unitCost / row.avgPrice) > 0.35
                            ? 'text-red-600'
                            : (row.unitCost / row.avgPrice) > 0.30
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                        }`}>
                          {((row.unitCost / row.avgPrice) * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {row.unitMargin !== undefined ? (
                        <span className="text-emerald-600">${row.unitMargin.toFixed(2)}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>
      )}

      {/* Quick Links */}
      <section className="mb-8">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick links</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/items"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <ExternalLink className="mr-1 h-4 w-4" />
              Update item costs
            </Link>
            <Link
              href="/uploads/new"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <ExternalLink className="mr-1 h-4 w-4" />
              Upload new data
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <ExternalLink className="mr-1 h-4 w-4" />
              Adjust thresholds
            </Link>
          </div>
        </Card>
      </section>

      {/* Item Detail Modal */}
      <ItemDetailModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={selectedItem}
      />

      {/* Email Report Dialog */}
      <EmailReportDialog
        isOpen={emailDialogOpen}
        onClose={() => setEmailDialogOpen(false)}
        reportId={params.id as string}
        reportTitle={`${report.locationName} – ${format(weekStartDate, "MMM d")} to ${format(weekEndDate, "MMM d")}`}
      />
    </div>
  );
}
