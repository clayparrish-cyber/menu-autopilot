"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Lock, ChevronLeft, ChevronRight, Check } from "lucide-react";

// Demo data matching Kamal's spreadsheet format
const DEMO_PERIOD = {
  id: "pp-1",
  startDate: new Date("2026-01-06"),
  endDate: new Date("2026-01-19"),
  status: "OPEN" as const,
};

// Staff with their daily net tips
const DEMO_LEDGER_DATA = {
  staff: [
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
  ],
  // Daily data keyed by staffId -> date -> amount
  dailyTips: {
    "1": { "2026-01-06": 222.26, "2026-01-07": 92, "2026-01-13": 72, "2026-01-14": 387.92 },
    "2": { "2026-01-08": 320.10, "2026-01-09": 374.77, "2026-01-15": 387.98, "2026-01-16": 376.01, "2026-01-19": 320 },
    "3": { "2026-01-07": 74, "2026-01-10": 427.52, "2026-01-13": 72, "2026-01-17": 391.70 },
    "4": { "2026-01-07": 240.99, "2026-01-08": 230.81, "2026-01-09": 130, "2026-01-10": 196.53, "2026-01-13": 293.35, "2026-01-15": 360.87, "2026-01-16": 356.29, "2026-01-19": 320 },
    "5": { "2026-01-08": 100, "2026-01-10": 370.58, "2026-01-11": 325.70, "2026-01-14": 100, "2026-01-15": 384.56, "2026-01-16": 111.84, "2026-01-18": 272.20 },
    "6": { "2026-01-09": 374.78, "2026-01-11": 325.80, "2026-01-13": 293.41, "2026-01-19": 320 },
    "7": { "2026-01-06": 190.55, "2026-01-07": 241.69, "2026-01-10": 378.58, "2026-01-14": 347.92, "2026-01-17": 50, "2026-01-18": 320 },
    "8": { "2026-01-11": 114, "2026-01-15": 108, "2026-01-17": 134.15, "2026-01-19": 320 },
    "9": { "2026-01-10": 60, "2026-01-15": 42, "2026-01-16": 85 },
    "10": { "2026-01-10": 90, "2026-01-17": 107 },
    "11": { "2026-01-09": 60, "2026-01-10": 56, "2026-01-14": 80 },
  } as Record<string, Record<string, number>>,
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

export default function LedgerPage() {
  const [period] = useState(DEMO_PERIOD);
  const [showExportModal, setShowExportModal] = useState(false);

  const days = getDaysInPeriod(period.startDate, period.endDate);
  const { staff, dailyTips } = DEMO_LEDGER_DATA;

  // Calculate totals
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
          <h1 className="text-2xl font-bold text-gray-900">Pay Period Ledger</h1>
          <p className="text-gray-500">{periodDateRange}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 text-sm font-medium rounded-full ${
              period.status === "OPEN"
                ? "bg-blue-100 text-blue-700"
                : period.status === "FINALIZED"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {period.status}
          </span>
          {period.status === "OPEN" ? (
            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            >
              <Lock className="mr-2 h-4 w-4" />
              Finalize Period
            </button>
          ) : (
            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </button>
          )}
        </div>
      </div>

      {/* Period navigation */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-2">
        <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-medium text-gray-900">{periodDateRange}</span>
        <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Ledger table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-900 min-w-[150px]">
                  Staff
                </th>
                {days.map((day) => (
                  <th
                    key={formatDate(day)}
                    className="px-3 py-3 text-center font-medium text-gray-600 min-w-[70px]"
                  >
                    <div>{day.getDate()}</div>
                    <div className="text-xs text-gray-400">
                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-semibold text-gray-900 min-w-[100px] bg-gray-100">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.map((person) => {
                const personDays = dailyTips[person.id] || {};
                const total = staffTotals[person.id] || 0;

                return (
                  <tr key={person.id} className="hover:bg-gray-50">
                    <td className="sticky left-0 bg-white px-4 py-3 font-medium text-gray-900">
                      <div>{person.name}</div>
                      <div className="text-xs text-gray-400">{person.roleType}</div>
                    </td>
                    {days.map((day) => {
                      const dateKey = formatDate(day);
                      const amount = personDays[dateKey];
                      return (
                        <td
                          key={dateKey}
                          className={`px-3 py-3 text-center ${
                            amount ? "text-gray-900" : "text-gray-300"
                          }`}
                        >
                          {amount ? amount.toFixed(2) : "-"}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 bg-gray-50">
                      ${total.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-gray-300">
                <td className="sticky left-0 bg-gray-100 px-4 py-3 font-semibold text-gray-900">
                  Daily Total
                </td>
                {days.map((day) => {
                  const dateKey = formatDate(day);
                  const total = dayTotals[dateKey] || 0;
                  return (
                    <td
                      key={dateKey}
                      className="px-3 py-3 text-center font-medium text-gray-700"
                    >
                      {total > 0 ? total.toFixed(2) : "-"}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-right font-bold text-gray-900 bg-gray-200">
                  ${grandTotal.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-sm text-gray-500">Total Net Tips</div>
          <div className="text-2xl font-bold text-gray-900">${grandTotal.toFixed(2)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-sm text-gray-500">Staff Members</div>
          <div className="text-2xl font-bold text-gray-900">{staff.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-sm text-gray-500">Days in Period</div>
          <div className="text-2xl font-bold text-gray-900">{days.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-sm text-gray-500">Avg Daily Tips</div>
          <div className="text-2xl font-bold text-gray-900">
            ${(grandTotal / days.length).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Add more scans CTA */}
      <Link
        href="/tips/scan"
        className="block bg-blue-50 border border-blue-200 rounded-xl p-4 hover:bg-blue-100 transition-colors text-center"
      >
        <p className="text-blue-900 font-medium">Missing some receipts?</p>
        <p className="text-sm text-blue-700">Upload more cover pages</p>
      </Link>

      {/* Export modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">
              {period.status === "OPEN" ? "Finalize Pay Period" : "Export Data"}
            </h2>

            {period.status === "OPEN" && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  Once finalized, you won&apos;t be able to add or edit scans for this period.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Total tips</span>
                <span className="font-semibold">${grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Staff members</span>
                <span className="font-semibold">{staff.length}</span>
              </div>
            </div>

            <div className="space-y-2">
              <button className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2">
                <Download className="h-4 w-4" />
                Download CSV for Toast
              </button>
              {period.status === "OPEN" && (
                <button className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2">
                  <Check className="h-4 w-4" />
                  Finalize & Download
                </button>
              )}
            </div>

            <button
              onClick={() => setShowExportModal(false)}
              className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
