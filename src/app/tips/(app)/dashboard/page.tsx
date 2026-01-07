"use client";

import Link from "next/link";
import { Camera, Table, Clock, DollarSign, FileCheck, AlertCircle } from "lucide-react";

// Demo data - in production this would come from API
const DEMO_DATA = {
  currentPeriod: {
    id: "pp-1",
    startDate: new Date("2026-01-06"),
    endDate: new Date("2026-01-19"),
    status: "OPEN" as const,
    scansCount: 12,
    pendingReview: 3,
    confirmed: 9,
    totalNetTips: 4250.75,
  },
  recentScans: [
    { id: "s1", serverName: "Meggie", shiftDate: new Date("2026-01-06"), netTips: 219.15, status: "CONFIRMED" as const },
    { id: "s2", serverName: "Diondra", shiftDate: new Date("2026-01-06"), netTips: 285.50, status: "REVIEW" as const },
    { id: "s3", serverName: "Alex", shiftDate: new Date("2026-01-05"), netTips: 198.25, status: "CONFIRMED" as const },
    { id: "s4", serverName: "Colette", shiftDate: new Date("2026-01-05"), netTips: 312.00, status: "REVIEW" as const },
  ],
};

export default function TipDashboardPage() {
  const { currentPeriod, recentScans } = DEMO_DATA;

  const periodDateRange = `${currentPeriod.startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - ${currentPeriod.endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Current pay period: {periodDateRange}</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/tips/scan"
          className="flex items-center gap-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-5 transition-colors"
        >
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Camera className="h-6 w-6" />
          </div>
          <div>
            <div className="font-semibold text-lg">Scan Receipts</div>
            <div className="text-blue-100 text-sm">Upload cover pages</div>
          </div>
        </Link>

        <Link
          href="/tips/ledger"
          className="flex items-center gap-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl p-5 transition-colors"
        >
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <Table className="h-6 w-6 text-gray-600" />
          </div>
          <div>
            <div className="font-semibold text-lg text-gray-900">View Ledger</div>
            <div className="text-gray-500 text-sm">Pay period breakdown</div>
          </div>
        </Link>
      </div>

      {/* Period stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">
                ${currentPeriod.totalNetTips.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Total net tips</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FileCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{currentPeriod.confirmed}</div>
              <div className="text-xs text-gray-500">Confirmed scans</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{currentPeriod.pendingReview}</div>
              <div className="text-xs text-gray-500">Needs review</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900 capitalize">
                {currentPeriod.status.toLowerCase()}
              </div>
              <div className="text-xs text-gray-500">Period status</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent scans */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Scans</h2>
          <Link href="/tips/scan" className="text-sm text-blue-600 hover:text-blue-700">
            View all
          </Link>
        </div>
        {recentScans.length === 0 ? (
          <div className="p-8 text-center">
            <Camera className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No scans yet this period</p>
            <Link href="/tips/scan" className="text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block">
              Upload your first receipt
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentScans.map((scan) => (
              <Link
                key={scan.id}
                href={`/tips/scan/${scan.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <div className="font-medium text-gray-900">{scan.serverName}</div>
                  <div className="text-sm text-gray-500">
                    {scan.shiftDate.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-medium text-gray-900">${scan.netTips.toFixed(2)}</div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      scan.status === "CONFIRMED"
                        ? "bg-green-100 text-green-700"
                        : scan.status === "REVIEW"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {scan.status === "REVIEW" ? "Needs Review" : scan.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Finalize period CTA */}
      {currentPeriod.pendingReview === 0 && currentPeriod.scansCount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-green-900">Ready to finalize?</h3>
              <p className="text-sm text-green-700">All scans confirmed. You can now finalize this pay period.</p>
            </div>
            <Link
              href="/tips/ledger"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            >
              View & Finalize
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
