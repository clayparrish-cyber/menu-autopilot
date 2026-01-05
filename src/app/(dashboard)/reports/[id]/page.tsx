"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import type { WeeklyReportPayload } from "@/lib/report/types";
import {
  Card,
  CardContent,
  ActionCard,
  SummaryCard,
  MarginLeakCard,
  EasyWinCard,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataQualityBadge, QuadrantBadge, ActionBadge, ConfidenceBadge, CostSourceBadge, QUADRANT_DESCRIPTIONS } from "@/components/ui/badge";
import { Accordion } from "@/components/ui/accordion";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";

export default function ReportDetailPage() {
  const params = useParams();
  const [report, setReport] = useState<WeeklyReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSubscription, setHasSubscription] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      try {
        // First try full report (requires subscription)
        const fullRes = await fetch(`/api/reports/${params.id}/full`);
        if (fullRes.ok) {
          const data = await fullRes.json();
          setReport(data);
          setHasSubscription(true);
        } else if (fullRes.status === 403) {
          // No subscription - fetch basic report
          setHasSubscription(false);
          const basicRes = await fetch(`/api/reports/${params.id}`);
          if (!basicRes.ok) throw new Error("Failed to fetch report");
          // Convert basic format to partial WeeklyReportPayload structure
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
          <DataQualityBadge badge={report.dataQuality.badge} />
        </div>
        <p className="text-xs text-gray-500 mt-2">{report.dataQuality.note}</p>
      </header>

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.biggestMarginLeak && (
              <MarginLeakCard
                itemName={report.biggestMarginLeak.itemName}
                category={report.biggestMarginLeak.category}
                estimatedLossUsd={report.biggestMarginLeak.estimatedLossUsd}
                diagnosis={report.biggestMarginLeak.diagnosis}
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

      {/* Watch List + Anomalies (Collapsed) */}
      {((report.watchList && report.watchList.length > 0) || report.anomalies) && (
        <section className="mb-8 space-y-3">
          {report.watchList && report.watchList.length > 0 && (
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
          )}

          {report.anomalies &&
            (report.anomalies.discountsElevated ||
              report.anomalies.refundsVoidsElevated ||
              report.anomalies.mappingWarning) && (
              <Accordion title="Anomalies detected">
                <ul className="space-y-2 text-sm">
                  {report.anomalies.discountsElevated && (
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500">⚠</span>
                      <span>
                        <strong>Discounts elevated:</strong>{" "}
                        {report.anomalies.discountsElevated}
                      </span>
                    </li>
                  )}
                  {report.anomalies.refundsVoidsElevated && (
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500">⚠</span>
                      <span>
                        <strong>Refunds/voids elevated:</strong>{" "}
                        {report.anomalies.refundsVoidsElevated}
                      </span>
                    </li>
                  )}
                  {report.anomalies.mappingWarning && (
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500">⚠</span>
                      <span>
                        <strong>Mapping warning:</strong>{" "}
                        {report.anomalies.mappingWarning}
                      </span>
                    </li>
                  )}
                </ul>
              </Accordion>
            )}
        </section>
      )}

      {/* Quadrant Summary */}
      {report.quadrantSummary && (
        <section className="mb-8">
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Menu Matrix</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-emerald-50 rounded-lg cursor-help" title={QUADRANT_DESCRIPTIONS.STAR}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">⭐</span>
                    <span className="text-sm font-medium text-emerald-800">
                      Stars ({report.quadrantSummary.stars.length})
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    {report.quadrantSummary.stars.slice(0, 3).join(", ") || "None"}
                    {report.quadrantSummary.stars.length > 3 && "..."}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg cursor-help" title={QUADRANT_DESCRIPTIONS.PLOWHORSE}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🐴</span>
                    <span className="text-sm font-medium text-blue-800">
                      Plowhorses ({report.quadrantSummary.plowhorses.length})
                    </span>
                  </div>
                  <p className="text-xs text-blue-700">
                    {report.quadrantSummary.plowhorses.slice(0, 3).join(", ") || "None"}
                    {report.quadrantSummary.plowhorses.length > 3 && "..."}
                  </p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg cursor-help" title={QUADRANT_DESCRIPTIONS.PUZZLE}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🧩</span>
                    <span className="text-sm font-medium text-amber-800">
                      Puzzles ({report.quadrantSummary.puzzles.length})
                    </span>
                  </div>
                  <p className="text-xs text-amber-700">
                    {report.quadrantSummary.puzzles.slice(0, 3).join(", ") || "None"}
                    {report.quadrantSummary.puzzles.length > 3 && "..."}
                  </p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg cursor-help" title={QUADRANT_DESCRIPTIONS.DOG}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🐕</span>
                    <span className="text-sm font-medium text-red-800">
                      Dogs ({report.quadrantSummary.dogs.length})
                    </span>
                  </div>
                  <p className="text-xs text-red-700">
                    {report.quadrantSummary.dogs.slice(0, 3).join(", ") || "None"}
                    {report.quadrantSummary.dogs.length > 3 && "..."}
                  </p>
                </div>
              </div>
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
              <a
                href={`/api/reports/${params.id}/csv`}
                download
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                <Download className="mr-1 h-4 w-4" />
                Download CSV
              </a>
            )}
          </div>

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell header>#</TableCell>
                  <TableCell header>Item</TableCell>
                  <TableCell header align="center">Quadrant</TableCell>
                  <TableCell header align="center">Action</TableCell>
                  <TableCell header align="right">Qty</TableCell>
                  <TableCell header align="right">Price</TableCell>
                  <TableCell header align="right">Cost</TableCell>
                  <TableCell header align="right">Margin</TableCell>
                  <TableCell header align="center">Conf.</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.topRecommendationsTable.slice(0, 20).map((row) => (
                  <TableRow key={row.rank}>
                    <TableCell className="text-gray-500 font-medium">{row.rank}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{row.itemName}</p>
                        {row.category && (
                          <p className="text-xs text-gray-500">{row.category}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell align="center">
                      {row.quadrant && <QuadrantBadge quadrant={row.quadrant} />}
                    </TableCell>
                    <TableCell align="center">
                      <ActionBadge action={row.action} />
                    </TableCell>
                    <TableCell align="right">{row.qtySold}</TableCell>
                    <TableCell align="right">${row.avgPrice.toFixed(2)}</TableCell>
                    <TableCell align="right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span>${row.unitCost?.toFixed(2) ?? "—"}</span>
                        {row.costSource && (
                          <CostSourceBadge source={row.costSource} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell align="right">
                      {row.unitMargin !== undefined ? (
                        <span className="text-emerald-600">${row.unitMargin.toFixed(2)}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <ConfidenceBadge confidence={row.confidence} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Low confidence = fewer than the minimum weekly quantity threshold, or missing costs.
              </p>
            </div>
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
    </div>
  );
}
