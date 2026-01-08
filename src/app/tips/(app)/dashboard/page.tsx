"use client";

import Link from "next/link";
import { Camera, Table, Clock, DollarSign, FileCheck, AlertCircle, ChevronRight } from "lucide-react";

// Demo data using Kamal's real staff and totals ($11,460.86 for the period)
const DEMO_DATA = {
  currentPeriod: {
    id: "pp-1",
    startDate: new Date("2026-01-06"),
    endDate: new Date("2026-01-19"),
    status: "OPEN" as const,
    scansCount: 47,
    pendingReview: 2,
    confirmed: 45,
    totalNetTips: 11460.86,
  },
  recentScans: [
    { id: "s1", serverName: "Colette", shiftDate: new Date("2026-01-19"), netTips: 320.00, status: "CONFIRMED" as const },
    { id: "s2", serverName: "Gina G", shiftDate: new Date("2026-01-19"), netTips: 320.00, status: "REVIEW" as const },
    { id: "s3", serverName: "Matthew", shiftDate: new Date("2026-01-18"), netTips: 320.00, status: "CONFIRMED" as const },
    { id: "s4", serverName: "Jaide", shiftDate: new Date("2026-01-18"), netTips: 272.20, status: "REVIEW" as const },
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
    <div className="space-y-6 max-w-4xl mx-auto animate-stagger">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--tip-text-primary)' }}
        >
          Dashboard
        </h1>
        <p
          className="font-mono text-sm mt-1"
          style={{ color: 'var(--tip-text-muted)' }}
        >
          Pay period: {periodDateRange}
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/tips/scan"
          className="group flex items-center gap-4 rounded-2xl p-5 transition-all duration-200"
          style={{
            background: 'var(--tip-accent)',
            boxShadow: '0 0 0 0 var(--tip-accent-glow)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 30px var(--tip-accent-glow)'}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 0 0 var(--tip-accent-glow)'}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.2)' }}
          >
            <Camera className="h-6 w-6" style={{ color: 'var(--tip-bg-deep)' }} />
          </div>
          <div>
            <div className="font-semibold text-lg" style={{ color: 'var(--tip-bg-deep)' }}>
              Scan Receipts
            </div>
            <div className="text-sm opacity-75" style={{ color: 'var(--tip-bg-deep)' }}>
              Upload cover pages
            </div>
          </div>
        </Link>

        <Link
          href="/tips/ledger"
          className="flex items-center gap-4 rounded-2xl p-5 transition-all duration-200"
          style={{
            background: 'var(--tip-bg-elevated)',
            border: '1px solid var(--tip-border)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--tip-bg-surface)';
            e.currentTarget.style.borderColor = 'var(--tip-text-muted)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--tip-bg-elevated)';
            e.currentTarget.style.borderColor = 'var(--tip-border)';
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--tip-bg-surface)' }}
          >
            <Table className="h-6 w-6" style={{ color: 'var(--tip-text-muted)' }} />
          </div>
          <div>
            <div className="font-semibold text-lg" style={{ color: 'var(--tip-text-primary)' }}>
              View Ledger
            </div>
            <div className="text-sm" style={{ color: 'var(--tip-text-muted)' }}>
              Pay period breakdown
            </div>
          </div>
        </Link>
      </div>

      {/* Period stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="rounded-xl p-4"
          style={{
            background: 'var(--tip-bg-elevated)',
            border: '1px solid var(--tip-border)'
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--tip-accent-glow)' }}
            >
              <DollarSign className="h-5 w-5" style={{ color: 'var(--tip-accent)' }} />
            </div>
            <div>
              <div
                className="text-xl font-bold font-mono"
                style={{ color: 'var(--tip-accent)' }}
              >
                ${currentPeriod.totalNetTips.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs" style={{ color: 'var(--tip-text-muted)' }}>
                Total net tips
              </div>
            </div>
          </div>
        </div>

        <div
          className="rounded-xl p-4"
          style={{
            background: 'var(--tip-bg-elevated)',
            border: '1px solid var(--tip-border)'
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(94, 177, 239, 0.15)' }}
            >
              <FileCheck className="h-5 w-5" style={{ color: 'var(--tip-info)' }} />
            </div>
            <div>
              <div
                className="text-xl font-bold font-mono"
                style={{ color: 'var(--tip-text-primary)' }}
              >
                {currentPeriod.confirmed}
              </div>
              <div className="text-xs" style={{ color: 'var(--tip-text-muted)' }}>
                Confirmed scans
              </div>
            </div>
          </div>
        </div>

        <div
          className="rounded-xl p-4"
          style={{
            background: 'var(--tip-bg-elevated)',
            border: '1px solid var(--tip-border)'
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(240, 180, 41, 0.15)' }}
            >
              <AlertCircle className="h-5 w-5" style={{ color: 'var(--tip-warning)' }} />
            </div>
            <div>
              <div
                className="text-xl font-bold font-mono"
                style={{ color: 'var(--tip-text-primary)' }}
              >
                {currentPeriod.pendingReview}
              </div>
              <div className="text-xs" style={{ color: 'var(--tip-text-muted)' }}>
                Needs review
              </div>
            </div>
          </div>
        </div>

        <div
          className="rounded-xl p-4"
          style={{
            background: 'var(--tip-bg-elevated)',
            border: '1px solid var(--tip-border)'
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--tip-bg-surface)' }}
            >
              <Clock className="h-5 w-5" style={{ color: 'var(--tip-text-muted)' }} />
            </div>
            <div>
              <div
                className="text-xl font-bold font-mono uppercase"
                style={{ color: 'var(--tip-text-primary)' }}
              >
                {currentPeriod.status.toLowerCase()}
              </div>
              <div className="text-xs" style={{ color: 'var(--tip-text-muted)' }}>
                Period status
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent scans */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--tip-bg-elevated)',
          border: '1px solid var(--tip-border)'
        }}
      >
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px dashed var(--tip-border)' }}
        >
          <h2 className="font-semibold" style={{ color: 'var(--tip-text-primary)' }}>
            Recent Scans
          </h2>
          <Link
            href="/tips/scan"
            className="text-sm font-medium transition-colors"
            style={{ color: 'var(--tip-accent)' }}
          >
            View all
          </Link>
        </div>
        {recentScans.length === 0 ? (
          <div className="p-10 text-center">
            <Camera className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--tip-text-muted)' }} />
            <p style={{ color: 'var(--tip-text-muted)' }}>No scans yet this period</p>
            <Link
              href="/tips/scan"
              className="font-medium mt-3 inline-block"
              style={{ color: 'var(--tip-accent)' }}
            >
              Upload your first receipt
            </Link>
          </div>
        ) : (
          <div>
            {recentScans.map((scan, index) => (
              <Link
                key={scan.id}
                href={`/tips/scan/${scan.id}`}
                className="flex items-center justify-between px-5 py-4 transition-colors"
                style={{
                  borderBottom: index < recentScans.length - 1 ? '1px solid var(--tip-border-subtle)' : 'none',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--tip-bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <div className="font-medium" style={{ color: 'var(--tip-text-primary)' }}>
                    {scan.serverName}
                  </div>
                  <div className="text-sm font-mono" style={{ color: 'var(--tip-text-muted)' }}>
                    {scan.shiftDate.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div
                      className="font-semibold font-mono"
                      style={{ color: 'var(--tip-accent)' }}
                    >
                      ${scan.netTips.toFixed(2)}
                    </div>
                  </div>
                  <span
                    className="tip-badge"
                    style={{
                      background: scan.status === "CONFIRMED"
                        ? 'rgba(61, 214, 140, 0.15)'
                        : 'rgba(240, 180, 41, 0.15)',
                      color: scan.status === "CONFIRMED"
                        ? 'var(--tip-success)'
                        : 'var(--tip-warning)'
                    }}
                  >
                    {scan.status === "REVIEW" ? "Review" : "OK"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Finalize period CTA */}
      {currentPeriod.pendingReview === 0 && currentPeriod.scansCount > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'var(--tip-accent-glow)',
            border: '1px solid var(--tip-accent-dim)'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--tip-accent)' }}>
                Ready to finalize?
              </h3>
              <p className="text-sm mt-0.5" style={{ color: 'var(--tip-text-secondary)' }}>
                All scans confirmed. You can now finalize this pay period.
              </p>
            </div>
            <Link
              href="/tips/ledger"
              className="flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition-all"
              style={{
                background: 'var(--tip-accent)',
                color: 'var(--tip-bg-deep)'
              }}
            >
              Finalize
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
