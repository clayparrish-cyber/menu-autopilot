"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Download, ExternalLink, ChevronUp, ChevronDown, Mail } from "lucide-react";
import type { WeeklyReportPayload } from "@/lib/report/types";
import { ItemDetailModal } from "@/components/ui/item-detail-modal";
import { EmailReportDialog } from "@/components/ui/email-report-dialog";
import {
  Card,
  CardContent,
  ActionCard,
  SummaryCard,
  MarginLeakCard,
  EasyWinCard,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DataQualityBadge,
  QuadrantBadge,
  ActionBadge,
  ConfidenceBadge,
  CostSourceBadge,
  QUADRANT_DESCRIPTIONS,
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

  // Sort the recommendations table
  const sortedRecommendations = useMemo(() => {
    if (!report?.topRecommendationsTable) return [];
    const items = [...report.topRecommendationsTable];

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
  }, [report?.topRecommendationsTable, sortColumn, sortDirection]);

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
                    ${current.revenue.toLocaleString()}
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

      {/* Margin Leak + Easy Win */}
      {(report.biggestMarginLeak || report.easiestWin) && (
        <section className="mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            At a glance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.biggestMarginLeak && (
              <MarginLeakCard
                itemName={report.biggestMarginLeak.itemName}
                category={report.biggestMarginLeak.category}
                estimatedLossUsd={report.biggestMarginLeak.estimatedLossUsd}
                diagnosis={report.biggestMarginLeak.diagnosis}
                confidence={report.biggestMarginLeak.confidence}
                fixes={report.biggestMarginLeak.fixes}
              />
            )}
            {report.easiestWin && (
              <EasyWinCard
                itemName={report.easiestWin.itemName}
                category={report.easiestWin.category}
                action={report.easiestWin.action}
                confidence={report.easiestWin.confidence}
                rationale={report.easiestWin.rationale}
                estimatedUpsideUsd={report.easiestWin.estimatedUpsideUsd}
              />
            )}
          </div>
        </section>
      )}

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

      {/* Quadrant Summary - Enhanced Menu Matrix */}
      {report.quadrantSummary && (
        <section className="mb-8">
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Menu Matrix
              </h3>
              {(() => {
                // Use allItemsLookup for complete data, fall back to topRecommendationsTable
                const itemLookup = report.allItemsLookup || {};
                const allQtys = Object.values(itemLookup).map((i) => i.qtySold || 0);
                const maxQty = Math.max(...allQtys, 1);

                const QuadrantBox = ({
                  items,
                  title,
                  emoji,
                  tip,
                  bgColor,
                  textColor,
                  barColor,
                }: {
                  items: string[];
                  title: string;
                  emoji: string;
                  tip: string;
                  bgColor: string;
                  textColor: string;
                  barColor: string;
                }) => (
                  <div className={`p-4 ${bgColor} rounded-lg`}>
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-black/10">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{emoji}</span>
                        <WithTooltip tip={tip}>
                          <span className={`text-sm font-semibold ${textColor} underline decoration-dotted underline-offset-2`}>
                            {title} ({items.length})
                          </span>
                        </WithTooltip>
                      </div>
                      <span className={`text-[10px] ${textColor} opacity-60 uppercase tracking-wide`}>
                        Margin %
                      </span>
                    </div>
                    {items.length === 0 ? (
                      <p className={`text-xs ${textColor} opacity-60`}>None</p>
                    ) : (
                      <div className="space-y-2">
                        {items.map((itemName) => {
                          const data = itemLookup[itemName];
                          const qtyPct = data ? (data.qtySold / maxQty) * 100 : 0;
                          const marginPct = data?.unitMargin !== undefined && data?.avgPrice > 0
                            ? (data.unitMargin / data.avgPrice) * 100
                            : null;
                          return (
                            <div key={itemName} className="flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${textColor} font-medium truncate`}>
                                  {itemName}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 h-1.5 bg-black/10 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${barColor} rounded-full`}
                                      style={{ width: `${Math.max(qtyPct, 0)}%` }}
                                    />
                                  </div>
                                  <span className={`text-[10px] ${textColor} opacity-70 whitespace-nowrap`}>
                                    {data ? `${data.qtySold} sold` : "— sold"}
                                  </span>
                                </div>
                              </div>
                              <span className={`text-xs font-medium whitespace-nowrap ${
                                marginPct !== null
                                  ? marginPct >= 70 ? 'text-emerald-600' : marginPct >= 60 ? 'text-amber-600' : 'text-red-600'
                                  : `${textColor} opacity-60`
                              }`}>
                                {marginPct !== null ? `${marginPct.toFixed(0)}%` : "—"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );

                return (
                  <div className="grid grid-cols-2 gap-4">
                    <QuadrantBox
                      items={report.quadrantSummary!.plowhorses}
                      title="Plowhorses"
                      emoji="🐴"
                      tip={QUADRANT_DESCRIPTIONS.PLOWHORSE}
                      bgColor="bg-blue-50"
                      textColor="text-blue-800"
                      barColor="bg-blue-400"
                    />
                    <QuadrantBox
                      items={report.quadrantSummary!.stars}
                      title="Stars"
                      emoji="⭐"
                      tip={QUADRANT_DESCRIPTIONS.STAR}
                      bgColor="bg-emerald-50"
                      textColor="text-emerald-800"
                      barColor="bg-emerald-400"
                    />
                    <QuadrantBox
                      items={report.quadrantSummary!.dogs}
                      title="Dogs"
                      emoji="🐕"
                      tip={QUADRANT_DESCRIPTIONS.DOG}
                      bgColor="bg-red-50"
                      textColor="text-red-800"
                      barColor="bg-red-400"
                    />
                    <QuadrantBox
                      items={report.quadrantSummary!.puzzles}
                      title="Puzzles"
                      emoji="🧩"
                      tip={QUADRANT_DESCRIPTIONS.PUZZLE}
                      bgColor="bg-amber-50"
                      textColor="text-amber-800"
                      barColor="bg-amber-400"
                    />
                  </div>
                );
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
                {sortedRecommendations.slice(0, 20).map((row) => (
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
