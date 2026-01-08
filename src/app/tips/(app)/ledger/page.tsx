"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Lock, ChevronLeft, ChevronRight, Check, ArrowUp, ArrowDown } from "lucide-react";

// Format currency with commas
function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Escape CSV values to handle commas, quotes, and newlines
function escapeCSV(value: string | number | undefined): string {
  if (value === undefined || value === null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Pay periods
const DEMO_PERIODS = [
  {
    id: "pp-0",
    startDate: new Date("2025-12-23"),
    endDate: new Date("2026-01-05"),
    status: "FINALIZED" as const,
  },
  {
    id: "pp-1",
    startDate: new Date("2026-01-06"),
    endDate: new Date("2026-01-19"),
    status: "OPEN" as const,
  },
];

// Staff roster
const STAFF = [
  { id: "1", name: "Margaret Nielsen", roleType: "SERVER" },
  { id: "2", name: "Gina G", roleType: "SERVER" },
  { id: "3", name: "Diondra", roleType: "SERVER" },
  { id: "4", name: "Colette", roleType: "SERVER" },
  { id: "5", name: "Jaide", roleType: "SERVER" },
  { id: "6", name: "Alyssia", roleType: "SERVER" },
  { id: "7", name: "Matthew", roleType: "SERVER" },
  { id: "8", name: "Jacob", roleType: "BARTENDER" },
  { id: "9", name: "Moses", roleType: "BUSSER" },
  { id: "10", name: "Emma", roleType: "RUNNER" },
  { id: "11", name: "Senna", roleType: "HOST" },
];

// Ledger data
const DEMO_LEDGER_DATA: Record<string, {
  staff: typeof STAFF;
  dailyTips: Record<string, Record<string, number>>;
}> = {
  "pp-0": {
    staff: STAFF.filter(s => ["1", "2", "3", "4", "7", "9", "10"].includes(s.id)),
    dailyTips: {
      "1": { "2025-12-23": 198.50, "2025-12-24": 312.00, "2025-12-28": 245.75, "2025-12-31": 425.00, "2026-01-01": 380.25 },
      "2": { "2025-12-24": 285.00, "2025-12-26": 195.50, "2025-12-28": 310.00, "2025-12-31": 398.75 },
      "3": { "2025-12-23": 175.25, "2025-12-27": 220.00, "2025-12-30": 265.50, "2026-01-02": 298.00 },
      "4": { "2025-12-24": 340.00, "2025-12-26": 185.75, "2025-12-29": 225.00, "2025-12-31": 412.50, "2026-01-01": 355.25 },
      "7": { "2025-12-23": 210.00, "2025-12-25": 125.00, "2025-12-28": 275.50, "2025-12-30": 195.00 },
      "9": { "2025-12-24": 45.00, "2025-12-26": 38.50, "2025-12-31": 72.00 },
      "10": { "2025-12-23": 52.00, "2025-12-28": 48.75, "2025-12-31": 85.00, "2026-01-01": 62.50 },
    },
  },
  "pp-1": {
    staff: STAFF,
    dailyTips: {
      "1": { "2026-01-06": 222.26, "2026-01-07": 92, "2026-01-13": 72, "2026-01-14": 387.92 },
      "2": { "2026-01-08": 320.10, "2026-01-09": 374.77, "2026-01-15": 387.98, "2026-01-16": 376.01, "2026-01-19": 320 },
      "3": { "2026-01-07": 74, "2026-01-10": 427.52, "2026-01-13": 72, "2026-01-17": 391.70 },
      "4": { "2026-01-07": 240.99, "2026-01-08": 230.81, "2026-01-09": 130, "2026-01-10": 196.53, "2026-01-13": 293.35, "2026-01-15": 360.87, "2026-01-16": 356.29, "2026-01-19": 320 },
      "5": { "2026-01-08": 100, "2026-01-10": 370.58, "2026-01-11": 325.70, "2026-01-14": 100, "2026-01-15": 384.56, "2026-01-16": 111.84, "2026-01-18": 272.20 },
      "6": { "2026-01-09": 374.78, "2026-01-11": 325.80, "2026-01-13": 293.41, "2026-01-19": 320 },
      "7": { "2026-01-06": 190.55, "2026-01-07": 241.69, "2026-01-10": 378.58, "2026-01-14": 347.92, "2026-01-17": 50, "2026-01-18": 320 },
      "8": { "2026-01-10": 50, "2026-01-11": 114, "2026-01-15": 108, "2026-01-17": 134.15, "2026-01-19": 320 },
      "9": { "2026-01-10": 60, "2026-01-15": 42, "2026-01-16": 85 },
      "10": { "2026-01-10": 90, "2026-01-17": 107 },
      "11": { "2026-01-09": 60, "2026-01-10": 56, "2026-01-14": 80 },
    },
  },
};

function getDaysInPeriod(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

type SortKey = "name" | "total";
type SortDir = "asc" | "desc";

export default function LedgerPage() {
  const [periodIndex, setPeriodIndex] = useState(1);
  const [showExportModal, setShowExportModal] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "total" ? "desc" : "asc");
    }
  };

  const period = DEMO_PERIODS[periodIndex];

  const downloadCSV = () => {
    const ledgerData = DEMO_LEDGER_DATA[period.id] || { staff: [], dailyTips: {} };
    const days = getDaysInPeriod(period.startDate, period.endDate);

    const dayHeaders = days.map(d => d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }));
    const headers = ["Staff", "Role", ...dayHeaders, "Total"];

    const rows = ledgerData.staff.map(person => {
      const personDays = ledgerData.dailyTips[person.id] || {};
      let total = 0;
      const dayValues = days.map(day => {
        const amount = personDays[formatDate(day)] || 0;
        total += amount;
        return amount || "";
      });
      return [person.name, person.roleType, ...dayValues, total.toFixed(2)];
    });

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map(row => row.map(escapeCSV).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStr = period.startDate.toISOString().split("T")[0];
    a.download = `tips-${dateStr}${period.status === "OPEN" ? "-draft" : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canGoPrev = periodIndex > 0;
  const canGoNext = periodIndex < DEMO_PERIODS.length - 1;

  const days = getDaysInPeriod(period.startDate, period.endDate);
  const ledgerData = DEMO_LEDGER_DATA[period.id] || { staff: [], dailyTips: {} };
  const { staff, dailyTips } = ledgerData;

  const staffTotals: Record<string, number> = {};
  const dayTotals: Record<string, number> = {};
  let grandTotal = 0;

  staff.forEach((s) => {
    staffTotals[s.id] = 0;
    const staffDays = dailyTips[s.id] || {};
    Object.entries(staffDays).forEach(([date, amount]) => {
      staffTotals[s.id] += amount;
      dayTotals[date] = (dayTotals[date] || 0) + amount;
      grandTotal += amount;
    });
  });

  const sortedStaff = [...staff].sort((a, b) => {
    if (sortKey === "name") {
      return sortDir === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    } else {
      const aTotal = staffTotals[a.id] || 0;
      const bTotal = staffTotals[b.id] || 0;
      return sortDir === "asc" ? aTotal - bTotal : bTotal - aTotal;
    }
  });

  const periodDateRange = `${period.startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - ${period.endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--tip-text-primary)' }}
          >
            Pay Period Ledger
          </h1>
          <p
            className="font-mono text-sm mt-1"
            style={{ color: 'var(--tip-text-muted)' }}
          >
            {periodDateRange}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="tip-badge"
            style={{
              background: period.status === "OPEN"
                ? 'rgba(94, 177, 239, 0.15)'
                : 'rgba(61, 214, 140, 0.15)',
              color: period.status === "OPEN"
                ? 'var(--tip-info)'
                : 'var(--tip-success)',
            }}
          >
            {period.status}
          </span>
          {period.status === "OPEN" && (
            <button
              onClick={downloadCSV}
              className="tip-btn-secondary inline-flex items-center px-3 py-1.5 text-sm rounded-lg"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export
            </button>
          )}
          <button
            onClick={() => setShowExportModal(true)}
            className="tip-btn-primary inline-flex items-center px-3 py-1.5 text-sm rounded-lg"
          >
            {period.status === "OPEN" ? (
              <>
                <Lock className="mr-1.5 h-3.5 w-3.5" />
                Finalize
              </>
            ) : (
              <>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export
              </>
            )}
          </button>
        </div>
      </div>

      {/* Period navigation */}
      <div
        className="flex items-center justify-between rounded-lg px-4 py-3"
        style={{
          background: 'var(--tip-bg-elevated)',
          border: '1px solid var(--tip-border)',
        }}
      >
        <button
          onClick={() => canGoPrev && setPeriodIndex(periodIndex - 1)}
          disabled={!canGoPrev}
          className="p-1 transition-colors"
          style={{ color: canGoPrev ? 'var(--tip-text-secondary)' : 'var(--tip-text-muted)' }}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span
          className="font-medium font-mono"
          style={{ color: 'var(--tip-text-primary)' }}
        >
          {periodDateRange}
        </span>
        <button
          onClick={() => canGoNext && setPeriodIndex(periodIndex + 1)}
          disabled={!canGoNext}
          className="p-1 transition-colors"
          style={{ color: canGoNext ? 'var(--tip-text-secondary)' : 'var(--tip-text-muted)' }}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Ledger table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'var(--tip-bg-elevated)',
          border: '1px solid var(--tip-border)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--tip-bg-surface)' }}>
                <th
                  className="sticky left-0 px-4 py-3 text-left font-semibold min-w-[150px] cursor-pointer select-none transition-colors"
                  style={{
                    background: 'var(--tip-bg-surface)',
                    color: 'var(--tip-text-primary)',
                    borderBottom: '1px solid var(--tip-border)',
                  }}
                  onClick={() => toggleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    Staff
                    {sortKey === "name" && (
                      sortDir === "asc"
                        ? <ArrowUp className="h-3 w-3" style={{ color: 'var(--tip-accent)' }} />
                        : <ArrowDown className="h-3 w-3" style={{ color: 'var(--tip-accent)' }} />
                    )}
                  </div>
                </th>
                {days.map((day) => (
                  <th
                    key={formatDate(day)}
                    className="px-3 py-3 text-center font-medium min-w-[70px]"
                    style={{
                      color: 'var(--tip-text-muted)',
                      borderBottom: '1px solid var(--tip-border)',
                    }}
                  >
                    <div className="font-mono">{day.getDate()}</div>
                    <div className="text-xs" style={{ color: 'var(--tip-text-muted)' }}>
                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                    </div>
                  </th>
                ))}
                <th
                  className="px-4 py-3 text-right font-semibold min-w-[100px] cursor-pointer select-none"
                  style={{
                    background: 'var(--tip-bg-hover)',
                    color: 'var(--tip-text-primary)',
                    borderBottom: '1px solid var(--tip-border)',
                  }}
                  onClick={() => toggleSort("total")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Total
                    {sortKey === "total" && (
                      sortDir === "asc"
                        ? <ArrowUp className="h-3 w-3" style={{ color: 'var(--tip-accent)' }} />
                        : <ArrowDown className="h-3 w-3" style={{ color: 'var(--tip-accent)' }} />
                    )}
                  </div>
                </th>
              </tr>
              {/* Top totals row */}
              <tr style={{ background: 'var(--tip-bg-hover)' }}>
                <td
                  className="sticky left-0 px-4 py-2 font-semibold text-sm"
                  style={{
                    background: 'var(--tip-bg-hover)',
                    color: 'var(--tip-text-secondary)',
                    borderBottom: '2px solid var(--tip-border)',
                  }}
                >
                  Daily Total
                </td>
                {days.map((day) => {
                  const dateKey = formatDate(day);
                  const total = dayTotals[dateKey] || 0;
                  return (
                    <td
                      key={dateKey}
                      className="px-3 py-2 text-center font-medium font-mono text-sm"
                      style={{
                        color: total > 0 ? 'var(--tip-text-secondary)' : 'var(--tip-text-muted)',
                        borderBottom: '2px solid var(--tip-border)',
                      }}
                    >
                      {total > 0 ? formatCurrency(total) : "-"}
                    </td>
                  );
                })}
                <td
                  className="px-4 py-2 text-right font-bold font-mono text-sm"
                  style={{
                    background: 'var(--tip-accent-glow)',
                    color: 'var(--tip-accent)',
                    borderBottom: '2px solid var(--tip-border)',
                  }}
                >
                  ${formatCurrency(grandTotal)}
                </td>
              </tr>
            </thead>
            <tbody>
              {sortedStaff.map((person, idx) => {
                const personDays = dailyTips[person.id] || {};
                const total = staffTotals[person.id] || 0;

                return (
                  <tr
                    key={person.id}
                    className="transition-colors"
                    style={{
                      borderBottom: idx < sortedStaff.length - 1 ? '1px solid var(--tip-border-subtle)' : 'none',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--tip-bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td
                      className="sticky left-0 px-4 py-3 font-medium"
                      style={{
                        background: 'var(--tip-bg-elevated)',
                        color: 'var(--tip-text-primary)',
                      }}
                    >
                      <div>{person.name}</div>
                      <div
                        className="text-xs font-mono uppercase"
                        style={{ color: 'var(--tip-text-muted)' }}
                      >
                        {person.roleType}
                      </div>
                    </td>
                    {days.map((day) => {
                      const dateKey = formatDate(day);
                      const amount = personDays[dateKey];
                      return (
                        <td
                          key={dateKey}
                          className="px-3 py-3 text-center font-mono"
                          style={{
                            color: amount ? 'var(--tip-text-primary)' : 'var(--tip-text-muted)',
                          }}
                        >
                          {amount ? formatCurrency(amount) : "-"}
                        </td>
                      );
                    })}
                    <td
                      className="px-4 py-3 text-right font-semibold font-mono"
                      style={{
                        background: 'var(--tip-bg-surface)',
                        color: 'var(--tip-accent)',
                      }}
                    >
                      ${formatCurrency(total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--tip-bg-hover)' }}>
                <td
                  className="sticky left-0 px-4 py-3 font-semibold"
                  style={{
                    background: 'var(--tip-bg-hover)',
                    color: 'var(--tip-text-primary)',
                    borderTop: '2px solid var(--tip-border)',
                  }}
                >
                  Daily Total
                </td>
                {days.map((day) => {
                  const dateKey = formatDate(day);
                  const total = dayTotals[dateKey] || 0;
                  return (
                    <td
                      key={dateKey}
                      className="px-3 py-3 text-center font-medium font-mono"
                      style={{
                        color: total > 0 ? 'var(--tip-text-secondary)' : 'var(--tip-text-muted)',
                        borderTop: '2px solid var(--tip-border)',
                      }}
                    >
                      {total > 0 ? formatCurrency(total) : "-"}
                    </td>
                  );
                })}
                <td
                  className="px-4 py-3 text-right font-bold font-mono"
                  style={{
                    background: 'var(--tip-accent-glow)',
                    color: 'var(--tip-accent)',
                    borderTop: '2px solid var(--tip-border)',
                  }}
                >
                  ${formatCurrency(grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="rounded-xl p-4"
          style={{
            background: 'var(--tip-bg-elevated)',
            border: '1px solid var(--tip-border)',
          }}
        >
          <div className="text-sm" style={{ color: 'var(--tip-text-muted)' }}>
            Total Net Tips
          </div>
          <div
            className="text-2xl font-bold font-mono mt-1"
            style={{ color: 'var(--tip-accent)' }}
          >
            ${formatCurrency(grandTotal)}
          </div>
        </div>
        <div
          className="rounded-xl p-4"
          style={{
            background: 'var(--tip-bg-elevated)',
            border: '1px solid var(--tip-border)',
          }}
        >
          <div className="text-sm" style={{ color: 'var(--tip-text-muted)' }}>
            Staff Members
          </div>
          <div
            className="text-2xl font-bold font-mono mt-1"
            style={{ color: 'var(--tip-text-primary)' }}
          >
            {staff.length}
          </div>
        </div>
        <div
          className="rounded-xl p-4"
          style={{
            background: 'var(--tip-bg-elevated)',
            border: '1px solid var(--tip-border)',
          }}
        >
          <div className="text-sm" style={{ color: 'var(--tip-text-muted)' }}>
            Days in Period
          </div>
          <div
            className="text-2xl font-bold font-mono mt-1"
            style={{ color: 'var(--tip-text-primary)' }}
          >
            {days.length}
          </div>
        </div>
        <div
          className="rounded-xl p-4"
          style={{
            background: 'var(--tip-bg-elevated)',
            border: '1px solid var(--tip-border)',
          }}
        >
          <div className="text-sm" style={{ color: 'var(--tip-text-muted)' }}>
            Avg Daily Tips
          </div>
          <div
            className="text-2xl font-bold font-mono mt-1"
            style={{ color: 'var(--tip-text-primary)' }}
          >
            ${formatCurrency(grandTotal / days.length)}
          </div>
        </div>
      </div>

      {/* Toast validation placeholder */}
      <div
        className="rounded-xl p-4"
        style={{
          background: 'var(--tip-bg-elevated)',
          border: '1px dashed var(--tip-border)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--tip-text-muted)' }}>
              Verify against Toast
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--tip-text-muted)' }}>
              Compare scanned totals with POS data
            </div>
          </div>
          <span
            className="text-xs px-2 py-1 rounded font-mono"
            style={{
              background: 'var(--tip-bg-surface)',
              color: 'var(--tip-text-muted)',
            }}
          >
            COMING SOON
          </span>
        </div>
      </div>

      {/* Add more scans CTA */}
      {period.status === "OPEN" && (
        <Link
          href="/tips/scan"
          className="block rounded-xl p-4 text-center transition-all"
          style={{
            background: 'var(--tip-bg-elevated)',
            border: '1px solid var(--tip-border)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--tip-bg-surface)';
            e.currentTarget.style.borderColor = 'var(--tip-accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--tip-bg-elevated)';
            e.currentTarget.style.borderColor = 'var(--tip-border)';
          }}
        >
          <p className="font-medium" style={{ color: 'var(--tip-text-primary)' }}>
            Missing some receipts?
          </p>
          <p className="text-sm mt-0.5" style={{ color: 'var(--tip-text-muted)' }}>
            Upload more cover pages
          </p>
        </Link>
      )}

      {/* Export modal */}
      {showExportModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.8)' }}
        >
          <div
            className="rounded-2xl max-w-md w-full p-6 space-y-4 animate-slide-up"
            style={{
              background: 'var(--tip-bg-elevated)',
              border: '1px solid var(--tip-border)',
            }}
          >
            <h2
              className="text-xl font-bold"
              style={{ color: 'var(--tip-text-primary)' }}
            >
              {period.status === "OPEN" ? "Finalize Pay Period" : "Export Data"}
            </h2>

            {period.status === "OPEN" && (
              <div
                className="rounded-lg p-3"
                style={{
                  background: 'rgba(240, 180, 41, 0.1)',
                  border: '1px solid rgba(240, 180, 41, 0.3)',
                }}
              >
                <p className="text-sm" style={{ color: 'var(--tip-warning)' }}>
                  Once finalized, you won&apos;t be able to add or edit scans for this period.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ background: 'var(--tip-bg-surface)' }}
              >
                <span style={{ color: 'var(--tip-text-secondary)' }}>Total tips</span>
                <span
                  className="font-semibold font-mono"
                  style={{ color: 'var(--tip-accent)' }}
                >
                  ${formatCurrency(grandTotal)}
                </span>
              </div>
              <div
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ background: 'var(--tip-bg-surface)' }}
              >
                <span style={{ color: 'var(--tip-text-secondary)' }}>Staff members</span>
                <span
                  className="font-semibold font-mono"
                  style={{ color: 'var(--tip-text-primary)' }}
                >
                  {staff.length}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => { downloadCSV(); setShowExportModal(false); }}
                className="tip-btn-secondary w-full px-4 py-3 rounded-lg inline-flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download CSV for Toast
              </button>
              {period.status === "OPEN" && (
                <button className="tip-btn-primary w-full px-4 py-3 rounded-lg inline-flex items-center justify-center gap-2">
                  <Check className="h-4 w-4" />
                  Finalize & Download
                </button>
              )}
            </div>

            <button
              onClick={() => setShowExportModal(false)}
              className="w-full px-4 py-2 font-medium transition-colors"
              style={{ color: 'var(--tip-text-muted)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
