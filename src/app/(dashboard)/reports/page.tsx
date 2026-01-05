"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { FileText, ChevronRight, Plus, Mail } from "lucide-react";
import { EmailReportDialog } from "@/components/ui/email-report-dialog";

interface ReportSummary {
  id: string;
  weekId: string;
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  summary: {
    totalItems: number;
    stars: number;
    plowhorses: number;
    puzzles: number;
    dogs: number;
    totalRevenue: number;
    totalMargin: number;
  };
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailDialogReport, setEmailDialogReport] = useState<ReportSummary | null>(null);

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetch("/api/reports");
        if (!res.ok) throw new Error("Failed to fetch reports");
        const data = await res.json();
        setReports(data.reports);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reports");
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Weekly Reports</h1>
        <Link
          href="/uploads/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Upload New Week
        </Link>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No reports yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Upload your first weekly POS export to get started.
          </p>
          <Link
            href="/uploads/new"
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Upload Data
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
          {reports.map((report) => (
            <Link
              key={report.id}
              href={`/reports/${report.id}`}
              className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
            >
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">
                    Week of {format(new Date(report.weekStart), "MMM d")} -{" "}
                    {format(new Date(report.weekEnd), "MMM d, yyyy")}
                  </p>
                  <p className="text-sm text-gray-500">
                    Generated {format(new Date(report.generatedAt), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-8">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">
                    {report.summary.totalItems} items
                  </p>
                  <p className="text-xs text-gray-500">
                    ${(report.summary.totalRevenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} revenue
                  </p>
                </div>

                <div className="flex space-x-6 text-sm">
                  {/* Margin % */}
                  <div className="text-center">
                    {(() => {
                      const totalRevenue = report.summary.totalRevenue || 0;
                      const totalMargin = report.summary.totalMargin || 0;
                      const marginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
                      const color = marginPct >= 70 ? 'text-emerald-600' : marginPct >= 60 ? 'text-amber-600' : 'text-red-600';
                      return (
                        <>
                          <p className={`font-semibold ${color}`}>{marginPct.toFixed(0)}%</p>
                          <p className="text-xs text-gray-500">margin</p>
                        </>
                      );
                    })()}
                  </div>
                  {/* Items needing action */}
                  <div className="text-center">
                    {(() => {
                      const needsAction = (report.summary.plowhorses || 0) + (report.summary.puzzles || 0) + (report.summary.dogs || 0);
                      const color = needsAction > 10 ? 'text-red-600' : needsAction > 5 ? 'text-amber-600' : 'text-gray-900';
                      return (
                        <>
                          <p className={`font-semibold ${color}`}>{needsAction}</p>
                          <p className="text-xs text-gray-500">need action</p>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEmailDialogReport(report);
                  }}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Email report"
                >
                  <Mail className="h-5 w-5" />
                </button>

                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Email Report Dialog */}
      {emailDialogReport && (
        <EmailReportDialog
          isOpen={!!emailDialogReport}
          onClose={() => setEmailDialogReport(null)}
          reportId={emailDialogReport.id}
          reportTitle={`Week of ${format(new Date(emailDialogReport.weekStart), "MMM d")} - ${format(new Date(emailDialogReport.weekEnd), "MMM d, yyyy")}`}
        />
      )}
    </div>
  );
}
