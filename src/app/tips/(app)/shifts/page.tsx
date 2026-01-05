"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

interface ShiftEntry {
  id: string;
  serverName: string;
  totalTips: number;
  actualTipOut: number;
  netTips: number;
  status: string;
}

interface Shift {
  id: string;
  shiftDate: string;
  shiftType: string;
  status: string;
  totalCCTips: number;
  totalCashTips: number;
  totalSales: number;
  totalAllocated: number;
  location: { id: string; name: string };
  entries: ShiftEntry[];
}

interface Location {
  id: string;
  name: string;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  CLOSED: "bg-green-100 text-green-700",
  REOPENED: "bg-red-100 text-red-700",
};

export default function ShiftsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showNewShift = searchParams.get("action") === "new";

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLocation, setFilterLocation] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    fetchData();
  }, [filterLocation, filterStatus]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (filterLocation) params.set("locationId", filterLocation);
      if (filterStatus) params.set("status", filterStatus);

      const [shiftsRes, locationsRes] = await Promise.all([
        fetch(`/tips/api/shifts?${params}`),
        fetch("/tips/api/locations"),
      ]);

      const shiftsData = await shiftsRes.json();
      const locationsData = await locationsRes.json();

      if (shiftsRes.ok) setShifts(shiftsData.shifts);
      if (locationsRes.ok) setLocations(locationsData.locations);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // Redirect to new shift page
  if (showNewShift) {
    router.push("/tips/shifts/new");
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Shifts</h1>
        <Link
          href="/tips/shifts/new"
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          + New Shift
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {locations.length > 1 && (
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        )}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Shifts list */}
      {shifts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">No shifts yet</h2>
          <p className="text-gray-600 mb-4">Create your first shift to start tracking tips</p>
          <Link
            href="/tips/shifts/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            + New Shift
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {shifts.map((shift) => {
            const totalTips = shift.totalCCTips + shift.totalCashTips;
            const submittedCount = shift.entries.filter(
              (e) => e.status !== "PENDING"
            ).length;

            return (
              <Link
                key={shift.id}
                href={`/tips/shifts/${shift.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">
                        {new Date(shift.shiftDate).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-600">{shift.shiftType}</span>
                    </div>
                    <div className="text-sm text-gray-600">{shift.location.name}</div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <div className="text-sm">
                      <span className="text-gray-500">Tips:</span>{" "}
                      <span className="font-medium text-gray-900">
                        ${totalTips.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Servers:</span>{" "}
                      <span className="font-medium">
                        {submittedCount}/{shift.entries.length}
                      </span>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[shift.status]}`}>
                      {shift.status.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                {shift.entries.length > 0 && (
                  <div className="mt-3">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{
                          width: `${(submittedCount / shift.entries.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
