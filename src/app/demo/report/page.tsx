"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ArrowLeft, Mail, Monitor, AlertTriangle } from "lucide-react";
import { ItemDetailModal } from "@/components/ui/item-detail-modal";
import type { WeeklyReportPayload } from "@/lib/report/types";
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

// Import sample report JSON
import sampleReport from "../../../../templates/sample-weekly-report.json";

type ViewMode = "page" | "email";

function DevOnlyGuard({ children }: { children: React.ReactNode }) {
  const [isDev, setIsDev] = useState<boolean | null>(null);

  useEffect(() => {
    setIsDev(process.env.NODE_ENV === "development");
  }, []);

  if (isDev === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!isDev) {
    return (
      <div className="max-w-lg mx-auto mt-16">
        <Card variant="danger" className="p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <h2 className="font-semibold text-red-800 mb-2">
                Development Only
              </h2>
              <p className="text-sm text-red-700">
                This demo page is only available in development mode.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

function ReportPageView({ report }: { report: WeeklyReportPayload }) {
  const weekStartDate = new Date(report.weekStart + "T00:00:00");
  const weekEndDate = new Date(report.weekEnd + "T00:00:00");
  const [selectedItem, setSelectedItem] = useState<any>(null);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {format(weekStartDate, "MMM d")} –{" "}
              {format(weekEndDate, "MMM d, yyyy")}
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

      {/* Week Summary KPIs - First thing to see */}
      {(report.currentWeekSummary || (report.categorySummary && report.categorySummary.length > 0)) && (
        <section className="mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Week Summary
          </h2>
          {(() => {
            // Use currentWeekSummary if available, otherwise compute from categorySummary
            const current = report.currentWeekSummary || (report.categorySummary ? {
              revenue: report.categorySummary.reduce((acc, cat) => acc + cat.netSales, 0),
              grossMargin: report.categorySummary.reduce((acc, cat) => acc + (cat.totalMargin || 0), 0),
              itemsSold: report.categorySummary.reduce((acc, cat) => acc + cat.qtySold, 0),
            } : { revenue: 0, grossMargin: 0, itemsSold: 0 });

            const prior = report.priorWeekSummary;
            const marginPct = current.revenue > 0 ? (current.grossMargin / current.revenue) * 100 : 0;
            const priorMarginPct = prior && prior.revenue > 0 ? (prior.grossMargin / prior.revenue) * 100 : null;

            // Calculate deltas
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

      {/* Top 3 Actions */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Top 3 actions{" "}
          <span className="font-normal text-gray-500">(do these first)</span>
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
          {/* Recent Wins */}
          <RecentWinCard wins={report.recentWins || []} />

          {/* Top Opportunity */}
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

          {/* Biggest Margin Leak */}
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

      {/* Quadrant Summary */}
      {report.quadrantSummary && (
        <section className="mb-8">
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Menu Matrix
              </h3>
              {(() => {
                // Build lookup for item data from recommendations table
                const itemLookup = new Map(
                  (report.topRecommendationsTable || []).map((item) => [item.itemName, item])
                );
                // Find max qty for relative bar sizing
                const maxQty = Math.max(
                  ...(report.topRecommendationsTable || []).map((i) => i.qtySold || 0),
                  1
                );

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
                          const data = itemLookup.get(itemName);
                          const qtyPct = data ? (data.qtySold / maxQty) * 100 : 0;
                          // Calculate margin % = (price - cost) / price = unitMargin / avgPrice
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
                                  {/* Mini bar showing relative qty */}
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
                    {/* Top row: High Popularity */}
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
                    {/* Bottom row: Low Popularity */}
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
      {report.topRecommendationsTable &&
        report.topRecommendationsTable.length > 0 && (
          <section className="mb-8">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              All Recommendations
            </h2>

            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell header>#</TableCell>
                    <TableCell header>Item</TableCell>
                    <TableCell header align="center">
                      Quadrant
                    </TableCell>
                    <TableCell header align="center">
                      Action
                    </TableCell>
                    <TableCell header align="right" title="Units sold this week">
                      Qty
                    </TableCell>
                    <TableCell header align="right" title="Menu price per unit">
                      Price
                    </TableCell>
                    <TableCell header align="right" title="Food cost per unit">
                      Cost
                    </TableCell>
                    <TableCell header align="right" title="Food cost as % of price (target: ≤30%)" className="whitespace-nowrap">
                      Cost %
                    </TableCell>
                    <TableCell header align="right" title="Profit per unit (Price - Cost)">
                      Margin
                    </TableCell>
                    <TableCell header align="center">
                      Conf.
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.topRecommendationsTable.slice(0, 20).map((row) => (
                    <TableRow
                      key={row.rank}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setSelectedItem(row)}
                    >
                      <TableCell className="text-gray-500 font-medium">
                        {row.rank}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900 hover:text-blue-600">
                            {row.itemName}
                          </p>
                          {row.category && (
                            <p className="text-xs text-gray-500">
                              {row.category}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell align="center">
                        {row.quadrant && (
                          <QuadrantBadge quadrant={row.quadrant} />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <ActionBadge action={row.action} />
                      </TableCell>
                      <TableCell align="right">{row.qtySold}</TableCell>
                      <TableCell align="right">
                        ${row.avgPrice.toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span>${row.unitCost?.toFixed(2) ?? "—"}</span>
                          {row.costSource && (
                            <CostSourceBadge source={row.costSource} />
                          )}
                        </div>
                      </TableCell>
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
                          <span className="text-emerald-600">
                            ${row.unitMargin.toFixed(2)}
                          </span>
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
            </Card>
          </section>
        )}

      {/* Item Detail Modal */}
      <ItemDetailModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={selectedItem}
      />
    </div>
  );
}

function EmailPreview({ report }: { report: WeeklyReportPayload }) {
  const weekStartDate = new Date(report.weekStart + "T00:00:00");
  const weekEndDate = new Date(report.weekEnd + "T00:00:00");

  return (
    <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Email Header */}
      <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Mail className="h-4 w-4" />
          <span>Email Preview</span>
        </div>
        <p className="font-medium text-gray-900">
          Weekly Menu Report: {format(weekStartDate, "MMM d")} –{" "}
          {format(weekEndDate, "MMM d, yyyy")}
        </p>
        <p className="text-sm text-gray-500">
          To: owner@example.com | From: reports@menuautopilot.com
        </p>
      </div>

      {/* Email Body */}
      <div className="px-6 py-6">
        {/* Logo placeholder */}
        <div className="text-center mb-6">
          <div className="inline-block px-4 py-2 bg-blue-600 text-white font-bold rounded">
            Menu Autopilot
          </div>
        </div>

        {/* Greeting */}
        <p className="text-gray-700 mb-4">
          Hi {report.accountName.split(" ")[0]},
        </p>
        <p className="text-gray-700 mb-6">
          Here&apos;s your weekly menu performance report for{" "}
          <strong>{report.locationName}</strong>.
        </p>

        {/* Focus Line */}
        <div className="bg-blue-50 border-l-4 border-blue-500 px-4 py-3 mb-6">
          <p className="font-medium text-blue-900">{report.focusLine}</p>
          {report.estimatedUpsideRange && (
            <p className="text-sm text-blue-700 mt-1">
              Estimated weekly upside: {report.estimatedUpsideRange}
            </p>
          )}
        </div>

        {/* Data Quality */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm text-gray-600">Data Quality:</span>
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded ${
              report.dataQuality.badge === "GOOD"
                ? "bg-green-100 text-green-800"
                : report.dataQuality.badge === "MIXED"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
            }`}
          >
            {report.dataQuality.badge}
          </span>
        </div>

        {/* Top 3 Actions Summary */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Top 3 Actions This Week
        </h2>
        <div className="space-y-4 mb-6">
          {report.topActions.slice(0, 3).map((action, index) => (
            <div
              key={action.itemName}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full">
                    {index + 1}
                  </span>
                  <span className="font-medium text-gray-900">
                    {action.itemName}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded ${
                    action.action === "REPRICE"
                      ? "bg-blue-100 text-blue-800"
                      : action.action === "PROMOTE"
                        ? "bg-green-100 text-green-800"
                        : action.action === "REPOSITION"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {action.action}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {action.recommendationPrimary}
              </p>
              {action.estimatedWeeklyUpsideUsd && (
                <p className="text-sm text-green-600 mt-1">
                  Potential: +${action.estimatedWeeklyUpsideUsd.toFixed(0)}/week
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Margin Leak */}
        {report.biggestMarginLeak && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-red-900 mb-2">
              Biggest Margin Leak: {report.biggestMarginLeak.itemName}
            </h3>
            <p className="text-sm text-red-700 mb-2">
              {report.biggestMarginLeak.diagnosis}
            </p>
            <p className="text-sm font-medium text-red-800">
              Estimated weekly loss: $
              {report.biggestMarginLeak.estimatedLossUsd.toFixed(0)}
            </p>
          </div>
        )}

        {/* CTA Button */}
        <div className="text-center mb-6">
          <a
            href={report.links.reportUrl}
            className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
          >
            View Full Report
          </a>
        </div>

        {/* Quadrant Summary */}
        {report.quadrantSummary && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Menu Matrix Summary
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-emerald-600">⭐ Stars:</span>{" "}
                {report.quadrantSummary.stars.length}
              </div>
              <div>
                <span className="text-blue-600">🐴 Plowhorses:</span>{" "}
                {report.quadrantSummary.plowhorses.length}
              </div>
              <div>
                <span className="text-amber-600">🧩 Puzzles:</span>{" "}
                {report.quadrantSummary.puzzles.length}
              </div>
              <div>
                <span className="text-red-600">🐕 Dogs:</span>{" "}
                {report.quadrantSummary.dogs.length}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 mt-6 pt-6 text-center text-xs text-gray-500">
          <p>
            You&apos;re receiving this because you&apos;re subscribed to Menu
            Autopilot weekly reports.
          </p>
          <p className="mt-2">
            <a href="#" className="text-blue-600 hover:underline">
              Manage preferences
            </a>
            {" | "}
            <a href="#" className="text-blue-600 hover:underline">
              Unsubscribe
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DemoReportPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("page");
  const report = sampleReport as WeeklyReportPayload;

  return (
    <DevOnlyGuard>
      <div className="min-h-screen bg-gray-100 py-8 px-4">
        {/* Header */}
        <div className="max-w-3xl mx-auto mb-6">
          <div className="flex items-center justify-between">
            <div>
              <a
                href="/"
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to app
              </a>
              <h1 className="text-xl font-bold text-gray-900">
                Demo Report Preview
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                QA the report page and email template without uploading data
              </p>
            </div>

            {/* View Toggle */}
            <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1">
              <button
                onClick={() => setViewMode("page")}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === "page"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Monitor className="h-4 w-4" />
                Report Page
              </button>
              <button
                onClick={() => setViewMode("email")}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === "email"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Mail className="h-4 w-4" />
                Email Preview
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="pb-8">
          {viewMode === "page" ? (
            <ReportPageView report={report} />
          ) : (
            <EmailPreview report={report} />
          )}
        </div>

        {/* Dev Info Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white px-4 py-2 text-xs">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <span>
              Template: <code>templates/sample-weekly-report.json</code>
            </span>
            <span className="text-gray-400">
              Validate: <code>npm run validate:sample-report</code>
            </span>
          </div>
        </div>
      </div>
    </DevOnlyGuard>
  );
}
