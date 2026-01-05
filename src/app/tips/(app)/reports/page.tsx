"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Download, FileText, Calendar } from "lucide-react";

interface Allocation {
  recipientName: string;
  amount: number;
  notes: string | null;
}

interface ShiftEntry {
  id: string;
  serverName: string;
  grossSales: number;
  ccTips: number;
  cashTips: number;
  totalTips: number;
  actualTipOut: number;
  netTips: number;
  status: string;
  allocations: Allocation[];
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

interface RecipientTotal {
  name: string;
  total: number;
  shifts: number;
}

export default function TipReportsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLocation, setFilterLocation] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [viewMode, setViewMode] = useState<"shifts" | "recipients">("shifts");

  useEffect(() => {
    fetchData();
  }, [filterLocation]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (filterLocation) params.set("locationId", filterLocation);
      params.set("status", "CLOSED"); // Only show closed shifts in reports

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

  // Filter shifts by date
  const filteredShifts = shifts.filter((shift) => {
    const date = shift.shiftDate.split("T")[0];
    if (filterDateFrom && date < filterDateFrom) return false;
    if (filterDateTo && date > filterDateTo) return false;
    return true;
  });

  // Calculate recipient totals
  const recipientTotals: RecipientTotal[] = [];
  const recipientMap = new Map<string, { total: number; shifts: Set<string> }>();

  filteredShifts.forEach((shift) => {
    shift.entries.forEach((entry) => {
      entry.allocations.forEach((alloc) => {
        const existing = recipientMap.get(alloc.recipientName) || {
          total: 0,
          shifts: new Set<string>(),
        };
        existing.total += alloc.amount;
        existing.shifts.add(shift.id);
        recipientMap.set(alloc.recipientName, existing);
      });
    });
  });

  recipientMap.forEach((data, name) => {
    recipientTotals.push({
      name,
      total: data.total,
      shifts: data.shifts.size,
    });
  });

  recipientTotals.sort((a, b) => b.total - a.total);

  // CSV export
  const exportCSV = () => {
    let csv = "";

    if (viewMode === "shifts") {
      // Shift-level export
      csv =
        "Date,Shift Type,Location,Server,Gross Sales,CC Tips,Cash Tips,Total Tips,Tip-Out,Net Tips\n";
      filteredShifts.forEach((shift) => {
        const date = new Date(shift.shiftDate).toLocaleDateString();
        shift.entries.forEach((entry) => {
          csv += `"${date}","${shift.shiftType}","${shift.location.name}","${entry.serverName}",`;
          csv += `${entry.grossSales.toFixed(2)},${entry.ccTips.toFixed(2)},${entry.cashTips.toFixed(2)},`;
          csv += `${entry.totalTips.toFixed(2)},${entry.actualTipOut.toFixed(2)},${entry.netTips.toFixed(2)}\n`;
        });
      });
    } else {
      // Recipient export
      csv = "Recipient,Total Received,Number of Shifts\n";
      recipientTotals.forEach((r) => {
        csv += `"${r.name}",${r.total.toFixed(2)},${r.shifts}\n`;
      });
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tip-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Grand totals
  const grandTotals = filteredShifts.reduce(
    (acc, shift) => ({
      sales: acc.sales + shift.totalSales,
      ccTips: acc.ccTips + shift.totalCCTips,
      cashTips: acc.cashTips + shift.totalCashTips,
      allocated: acc.allocated + shift.totalAllocated,
    }),
    { sales: 0, ccTips: 0, cashTips: 0, allocated: 0 }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tip Reports</h1>
        <button
          onClick={exportCSV}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-end">
          {locations.length > 1 && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">Location</label>
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All locations</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-600 mb-1">From</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">To</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">View</label>
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("shifts")}
                className={`px-4 py-2 text-sm font-medium ${
                  viewMode === "shifts"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                By Shift
              </button>
              <button
                onClick={() => setViewMode("recipients")}
                className={`px-4 py-2 text-sm font-medium ${
                  viewMode === "recipients"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                By Recipient
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-sm text-gray-500">Shifts</div>
          <div className="text-2xl font-bold text-gray-900">
            {filteredShifts.length}
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-sm text-gray-500">Total Tips</div>
          <div className="text-2xl font-bold text-gray-900">
            ${(grandTotals.ccTips + grandTotals.cashTips).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-sm text-gray-500">Total Allocated</div>
          <div className="text-2xl font-bold text-gray-900">
            ${grandTotals.allocated.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-sm text-gray-500">Total Sales</div>
          <div className="text-2xl font-bold text-gray-900">
            ${grandTotals.sales.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>

      {/* Data table */}
      {filteredShifts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No closed shifts yet
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Reports are generated from closed shifts
          </p>
          <Link
            href="/tips/shifts"
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Calendar className="mr-2 h-4 w-4" />
            View Shifts
          </Link>
        </div>
      ) : viewMode === "shifts" ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Server</th>
                  <th className="px-4 py-3 font-medium text-right">Sales</th>
                  <th className="px-4 py-3 font-medium text-right">CC Tips</th>
                  <th className="px-4 py-3 font-medium text-right">Cash</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium text-right">Tip-Out</th>
                  <th className="px-4 py-3 font-medium text-right">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredShifts.flatMap((shift) =>
                  shift.entries.map((entry, idx) => (
                    <tr key={`${shift.id}-${entry.id}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {idx === 0 ? (
                          <Link
                            href={`/tips/shifts/${shift.id}`}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            {new Date(shift.shiftDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </Link>
                        ) : (
                          ""
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {idx === 0 ? shift.shiftType : ""}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {entry.serverName}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        ${entry.grossSales.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        ${entry.ccTips.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        ${entry.cashTips.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        ${entry.totalTips.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600">
                        -${entry.actualTipOut.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-green-600">
                        ${entry.netTips.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-gray-50 font-medium">
                <tr>
                  <td className="px-4 py-3" colSpan={3}>
                    Totals ({filteredShifts.length} shifts)
                  </td>
                  <td className="px-4 py-3 text-right">
                    ${grandTotals.sales.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    ${grandTotals.ccTips.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    ${grandTotals.cashTips.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    ${(grandTotals.ccTips + grandTotals.cashTips).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-red-600">
                    -${grandTotals.allocated.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600">
                    ${(
                      grandTotals.ccTips +
                      grandTotals.cashTips -
                      grandTotals.allocated
                    ).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Recipient</th>
                  <th className="px-4 py-3 font-medium text-right">Total Received</th>
                  <th className="px-4 py-3 font-medium text-right">Shifts</th>
                  <th className="px-4 py-3 font-medium text-right">Avg/Shift</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recipientTotals.map((recipient) => (
                  <tr key={recipient.name} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {recipient.name}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">
                      ${recipient.total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {recipient.shifts}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      ${(recipient.total / recipient.shifts).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-medium">
                <tr>
                  <td className="px-4 py-3">
                    {recipientTotals.length} recipients
                  </td>
                  <td className="px-4 py-3 text-right text-green-600">
                    ${recipientTotals.reduce((s, r) => s + r.total, 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right"></td>
                  <td className="px-4 py-3 text-right"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
