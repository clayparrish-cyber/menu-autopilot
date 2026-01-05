"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Allocation {
  id: string;
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
  staffId: string | null;
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
  toastTotalCCTips: number | null;
  toastTotalSales: number | null;
  location: { id: string; name: string };
  entries: ShiftEntry[];
}

interface Staff {
  id: string;
  name: string;
  roleType: string;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  CLOSED: "bg-green-100 text-green-700",
  REOPENED: "bg-red-100 text-red-700",
};

const ENTRY_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  ADJUSTED: "bg-amber-100 text-amber-700",
};

export default function ShiftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [shift, setShift] = useState<Shift | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Allocation modal state
  const [allocatingEntry, setAllocatingEntry] = useState<ShiftEntry | null>(null);
  const [newAllocation, setNewAllocation] = useState({
    recipientName: "",
    amount: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [shiftRes, staffRes] = await Promise.all([
        fetch(`/tips/api/shifts/${id}`),
        fetch("/tips/api/staff"),
      ]);

      const shiftData = await shiftRes.json();
      const staffData = await staffRes.json();

      if (shiftRes.ok) setShift(shiftData.shift);
      else setError(shiftData.error || "Failed to load shift");

      if (staffRes.ok) setStaff(staffData.staff);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load shift");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAllocation = async () => {
    if (!allocatingEntry || !newAllocation.recipientName || !newAllocation.amount) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/tips/api/shifts/${id}/entries/${allocatingEntry.id}/allocations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName: newAllocation.recipientName,
          amount: parseFloat(newAllocation.amount),
          notes: newAllocation.notes || undefined,
        }),
      });

      if (res.ok) {
        // Refresh data
        await fetchData();
        setNewAllocation({ recipientName: "", amount: "", notes: "" });
      } else {
        const data = await res.json();
        setError(data.error || "Failed to add allocation");
      }
    } catch {
      setError("Failed to add allocation");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAllocation = async (entryId: string, allocationId: string) => {
    if (!confirm("Remove this allocation?")) return;

    try {
      const res = await fetch(
        `/tips/api/shifts/${id}/entries/${entryId}/allocations/${allocationId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error("Failed to delete allocation:", err);
    }
  };

  const handleSubmitEntry = async (entryId: string) => {
    try {
      const res = await fetch(`/tips/api/shifts/${id}/entries/${entryId}/submit`, {
        method: "POST",
      });

      if (res.ok) {
        await fetchData();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to submit");
      }
    } catch {
      setError("Failed to submit");
    }
  };

  const handleCloseShift = async () => {
    if (!confirm("Close this shift? All entries must be submitted first.")) return;

    try {
      const res = await fetch(`/tips/api/shifts/${id}/close`, {
        method: "POST",
      });

      if (res.ok) {
        await fetchData();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to close shift");
      }
    } catch {
      setError("Failed to close shift");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">{error || "Shift not found"}</div>
        <Link href="/tips/shifts" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
          Back to shifts
        </Link>
      </div>
    );
  }

  const totalTips = shift.totalCCTips + shift.totalCashTips;
  const submittedCount = shift.entries.filter((e) => e.status !== "PENDING").length;
  const allSubmitted = submittedCount === shift.entries.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/tips/shifts" className="hover:text-gray-700">
              Shifts
            </Link>
            <span>/</span>
            <span>
              {new Date(shift.shiftDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {new Date(shift.shiftDate).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </h1>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[shift.status]}`}>
              {shift.status.replace("_", " ")}
            </span>
          </div>
          <div className="text-gray-600 mt-1">
            {shift.shiftType} at {shift.location.name}
          </div>
        </div>

        {shift.status !== "CLOSED" && allSubmitted && (
          <button
            onClick={handleCloseShift}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
          >
            Close Shift
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={() => setError("")} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Tips</div>
          <div className="text-2xl font-bold text-gray-900">
            ${totalTips.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">CC Tips</div>
          <div className="text-2xl font-bold text-gray-900">
            ${shift.totalCCTips.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Cash Tips</div>
          <div className="text-2xl font-bold text-gray-900">
            ${shift.totalCashTips.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Sales</div>
          <div className="text-2xl font-bold text-gray-900">
            ${shift.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">
            {submittedCount} of {shift.entries.length} servers submitted
          </span>
          <span className="text-sm font-medium text-gray-900">
            {Math.round((submittedCount / shift.entries.length) * 100)}%
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all"
            style={{ width: `${(submittedCount / shift.entries.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Server entries */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Server Entries</h2>

        {shift.entries.map((entry) => {
          const remaining = entry.totalTips - entry.actualTipOut;
          const isBalanced = Math.abs(remaining - entry.netTips) < 0.01;

          return (
            <div
              key={entry.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              {/* Entry header */}
              <div className="p-4 sm:p-6 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium">
                      {entry.serverName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{entry.serverName}</div>
                      <div className="text-sm text-gray-500">
                        Sales: ${entry.grossSales.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${ENTRY_STATUS_COLORS[entry.status]}`}>
                      {entry.status}
                    </span>
                  </div>
                </div>

                {/* Tips summary */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Total Tips</div>
                    <div className="font-semibold text-gray-900">
                      ${entry.totalTips.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Tip-Outs</div>
                    <div className="font-semibold text-red-600">
                      -${entry.actualTipOut.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Net Tips</div>
                    <div className={`font-semibold ${isBalanced ? "text-green-600" : "text-gray-900"}`}>
                      ${entry.netTips.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Remaining to Allocate</div>
                    <div className={`font-semibold ${remaining > 0 ? "text-amber-600" : "text-green-600"}`}>
                      ${remaining.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Allocations */}
              <div className="p-4 sm:p-6 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-700">Tip-Out Allocations</h3>
                  {entry.status === "PENDING" && shift.status !== "CLOSED" && (
                    <button
                      onClick={() => setAllocatingEntry(entry)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + Add
                    </button>
                  )}
                </div>

                {entry.allocations.length === 0 ? (
                  <div className="text-sm text-gray-500 italic">
                    No allocations yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {entry.allocations.map((alloc) => (
                      <div
                        key={alloc.id}
                        className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200"
                      >
                        <div>
                          <span className="font-medium text-gray-900">
                            {alloc.recipientName}
                          </span>
                          {alloc.notes && (
                            <span className="text-gray-500 text-sm ml-2">
                              ({alloc.notes})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-900">
                            ${alloc.amount.toFixed(2)}
                          </span>
                          {entry.status === "PENDING" && shift.status !== "CLOSED" && (
                            <button
                              onClick={() => handleDeleteAllocation(entry.id, alloc.id)}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Submit button */}
                {entry.status === "PENDING" && shift.status !== "CLOSED" && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleSubmitEntry(entry.id)}
                      disabled={entry.allocations.length === 0}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm"
                    >
                      Submit Allocations
                    </button>
                    {entry.allocations.length === 0 && (
                      <span className="ml-3 text-sm text-gray-500">
                        Add at least one allocation to submit
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Allocation Modal */}
      {allocatingEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add Tip-Out for {allocatingEntry.serverName}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient *
                </label>
                <input
                  type="text"
                  list="staff-list"
                  value={newAllocation.recipientName}
                  onChange={(e) =>
                    setNewAllocation({ ...newAllocation, recipientName: e.target.value })
                  }
                  placeholder="e.g., Maria (bartender)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <datalist id="staff-list">
                  {staff
                    .filter((s) => s.name !== allocatingEntry.serverName)
                    .map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.roleType}
                      </option>
                    ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newAllocation.amount}
                  onChange={(e) =>
                    setNewAllocation({ ...newAllocation, amount: e.target.value })
                  }
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={newAllocation.notes}
                  onChange={(e) =>
                    setNewAllocation({ ...newAllocation, notes: e.target.value })
                  }
                  placeholder="e.g., bar tipout"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddAllocation}
                disabled={saving || !newAllocation.recipientName || !newAllocation.amount}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
              >
                {saving ? "Adding..." : "Add Allocation"}
              </button>
              <button
                onClick={() => {
                  setAllocatingEntry(null);
                  setNewAllocation({ recipientName: "", amount: "", notes: "" });
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
