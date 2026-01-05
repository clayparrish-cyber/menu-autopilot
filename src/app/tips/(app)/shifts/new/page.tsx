"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Location {
  id: string;
  name: string;
}

interface ParsedEntry {
  serverName: string;
  grossSales: number;
  ccTips: number;
  cashTips: number;
  checkCount?: number;
}

const SHIFT_TYPES = [
  { value: "BREAKFAST", label: "Breakfast" },
  { value: "BRUNCH", label: "Brunch" },
  { value: "LUNCH", label: "Lunch" },
  { value: "DINNER", label: "Dinner" },
  { value: "LATE_NIGHT", label: "Late Night" },
  { value: "ALL_DAY", label: "All Day" },
];

export default function NewShiftPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [locationId, setLocationId] = useState("");
  const [shiftDate, setShiftDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [shiftType, setShiftType] = useState("DINNER");

  // CSV state
  const [entries, setEntries] = useState<ParsedEntry[]>([]);
  const [csvError, setCsvError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Manual entry state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualEntry, setManualEntry] = useState({
    serverName: "",
    grossSales: "",
    ccTips: "",
    cashTips: "",
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const res = await fetch("/tips/api/locations");
      const data = await res.json();
      if (res.ok) {
        setLocations(data.locations);
        if (data.locations.length === 1) {
          setLocationId(data.locations[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch locations:", err);
    } finally {
      setLoading(false);
    }
  };

  const parseCSV = useCallback((text: string) => {
    setCsvError("");
    const lines = text.trim().split("\n");
    if (lines.length < 2) {
      setCsvError("CSV must have a header row and at least one data row");
      return;
    }

    // Parse header to find column indices
    const header = lines[0].toLowerCase().split(",").map((h) => h.trim());

    // Look for common column names
    const nameIdx = header.findIndex((h) =>
      h.includes("server") || h.includes("name") || h.includes("employee")
    );
    const salesIdx = header.findIndex((h) =>
      h.includes("sales") || h.includes("gross") || h.includes("net sales")
    );
    const ccTipsIdx = header.findIndex((h) =>
      h.includes("cc") || h.includes("credit") || h.includes("card") ||
      (h.includes("tip") && !h.includes("cash"))
    );
    const cashTipsIdx = header.findIndex((h) =>
      h.includes("cash")
    );
    const checkIdx = header.findIndex((h) =>
      h.includes("check") || h.includes("cover") || h.includes("guest")
    );

    if (nameIdx === -1) {
      setCsvError("Could not find server/name column. Please include a column with 'server', 'name', or 'employee' in the header.");
      return;
    }

    const parsed: ParsedEntry[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle quoted CSV values
      const values = parseCSVLine(line);

      const serverName = values[nameIdx]?.trim();
      if (!serverName) continue;

      const entry: ParsedEntry = {
        serverName,
        grossSales: salesIdx >= 0 ? parseNumber(values[salesIdx]) : 0,
        ccTips: ccTipsIdx >= 0 ? parseNumber(values[ccTipsIdx]) : 0,
        cashTips: cashTipsIdx >= 0 ? parseNumber(values[cashTipsIdx]) : 0,
      };

      if (checkIdx >= 0) {
        entry.checkCount = parseInt(values[checkIdx]) || undefined;
      }

      parsed.push(entry);
    }

    if (parsed.length === 0) {
      setCsvError("No valid entries found in CSV");
      return;
    }

    setEntries(parsed);
  }, []);

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parseNumber = (value: string): number => {
    if (!value) return 0;
    // Remove currency symbols, commas, and trim
    const cleaned = value.replace(/[$,]/g, "").trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };
    reader.onerror = () => {
      setCsvError("Failed to read file");
    };
    reader.readAsText(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && (file.type === "text/csv" || file.name.endsWith(".csv"))) {
      handleFileUpload(file);
    } else {
      setCsvError("Please upload a CSV file");
    }
  }, []);

  const handleAddManualEntry = () => {
    if (!manualEntry.serverName.trim()) return;

    setEntries([
      ...entries,
      {
        serverName: manualEntry.serverName.trim(),
        grossSales: parseFloat(manualEntry.grossSales) || 0,
        ccTips: parseFloat(manualEntry.ccTips) || 0,
        cashTips: parseFloat(manualEntry.cashTips) || 0,
      },
    ]);
    setManualEntry({ serverName: "", grossSales: "", ccTips: "", cashTips: "" });
  };

  const handleRemoveEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const handleUpdateEntry = (index: number, field: keyof ParsedEntry, value: string) => {
    const updated = [...entries];
    if (field === "serverName") {
      updated[index].serverName = value;
    } else {
      updated[index][field] = parseFloat(value) || 0;
    }
    setEntries(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!locationId) {
      setError("Please select a location");
      return;
    }

    if (entries.length === 0) {
      setError("Please add at least one server entry");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/tips/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          shiftDate,
          shiftType,
          entries,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create shift");
        return;
      }

      router.push(`/tips/shifts/${data.shift.id}`);
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals
  const totals = entries.reduce(
    (acc, entry) => ({
      grossSales: acc.grossSales + entry.grossSales,
      ccTips: acc.ccTips + entry.ccTips,
      cashTips: acc.cashTips + entry.cashTips,
      totalTips: acc.totalTips + entry.ccTips + entry.cashTips,
    }),
    { grossSales: 0, ccTips: 0, cashTips: 0, totalTips: 0 }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <Link href="/tips/shifts" className="hover:text-gray-700">
            Shifts
          </Link>
          <span>/</span>
          <span>New Shift</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Create Shift</h1>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Shift details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Shift Details
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location *
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Select location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shift Type
              </label>
              <select
                value={shiftType}
                onChange={(e) => setShiftType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                {SHIFT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* CSV Upload */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Server Data
          </h2>

          {entries.length === 0 ? (
            <>
              {/* Upload area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  isDragging
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <div className="text-4xl mb-3">📄</div>
                <p className="text-gray-700 font-medium mb-2">
                  Drop a CSV file here
                </p>
                <p className="text-gray-500 text-sm mb-4">
                  or click to browse
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg cursor-pointer transition-colors"
                >
                  Select File
                </label>
              </div>

              {csvError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {csvError}
                </div>
              )}

              {/* CSV format help */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Expected CSV format:
                </p>
                <code className="text-xs text-gray-600 block bg-white p-2 rounded border">
                  Server Name,Gross Sales,CC Tips,Cash Tips
                  <br />
                  John Smith,1500.00,225.00,50.00
                  <br />
                  Jane Doe,1200.00,180.00,30.00
                </code>
              </div>

              {/* Or add manually */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowManualEntry(!showManualEntry)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {showManualEntry ? "Hide manual entry" : "Or add entries manually"}
                </button>
              </div>

              {showManualEntry && (
                <div className="mt-4 grid sm:grid-cols-5 gap-3">
                  <input
                    type="text"
                    placeholder="Server name"
                    value={manualEntry.serverName}
                    onChange={(e) =>
                      setManualEntry({ ...manualEntry, serverName: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Gross sales"
                    value={manualEntry.grossSales}
                    onChange={(e) =>
                      setManualEntry({ ...manualEntry, grossSales: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="number"
                    placeholder="CC tips"
                    value={manualEntry.ccTips}
                    onChange={(e) =>
                      setManualEntry({ ...manualEntry, ccTips: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Cash tips"
                    value={manualEntry.cashTips}
                    onChange={(e) =>
                      setManualEntry({ ...manualEntry, cashTips: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddManualEntry}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-sm"
                  >
                    Add
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Entries table */}
              <div className="overflow-x-auto -mx-6">
                <table className="w-full">
                  <thead className="bg-gray-50 text-left text-sm text-gray-600">
                    <tr>
                      <th className="px-6 py-3 font-medium">Server</th>
                      <th className="px-6 py-3 font-medium text-right">Sales</th>
                      <th className="px-6 py-3 font-medium text-right">CC Tips</th>
                      <th className="px-6 py-3 font-medium text-right">Cash Tips</th>
                      <th className="px-6 py-3 font-medium text-right">Total Tips</th>
                      <th className="px-6 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {entries.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            value={entry.serverName}
                            onChange={(e) =>
                              handleUpdateEntry(idx, "serverName", e.target.value)
                            }
                            className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded outline-none"
                          />
                        </td>
                        <td className="px-6 py-3 text-right">
                          <input
                            type="number"
                            value={entry.grossSales}
                            onChange={(e) =>
                              handleUpdateEntry(idx, "grossSales", e.target.value)
                            }
                            className="w-24 px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded outline-none text-right"
                          />
                        </td>
                        <td className="px-6 py-3 text-right">
                          <input
                            type="number"
                            value={entry.ccTips}
                            onChange={(e) =>
                              handleUpdateEntry(idx, "ccTips", e.target.value)
                            }
                            className="w-24 px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded outline-none text-right"
                          />
                        </td>
                        <td className="px-6 py-3 text-right">
                          <input
                            type="number"
                            value={entry.cashTips}
                            onChange={(e) =>
                              handleUpdateEntry(idx, "cashTips", e.target.value)
                            }
                            className="w-24 px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded outline-none text-right"
                          />
                        </td>
                        <td className="px-6 py-3 text-right font-medium">
                          ${(entry.ccTips + entry.cashTips).toFixed(2)}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveEntry(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-medium">
                    <tr>
                      <td className="px-6 py-3">
                        {entries.length} server{entries.length !== 1 ? "s" : ""}
                      </td>
                      <td className="px-6 py-3 text-right">
                        ${totals.grossSales.toFixed(2)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        ${totals.ccTips.toFixed(2)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        ${totals.cashTips.toFixed(2)}
                      </td>
                      <td className="px-6 py-3 text-right text-blue-600">
                        ${totals.totalTips.toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Add more entries */}
              <div className="mt-4 pt-4 border-t border-gray-200 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEntries([])}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear all
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualEntry(!showManualEntry)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Add entry
                </button>
              </div>

              {showManualEntry && (
                <div className="mt-4 grid sm:grid-cols-5 gap-3">
                  <input
                    type="text"
                    placeholder="Server name"
                    value={manualEntry.serverName}
                    onChange={(e) =>
                      setManualEntry({ ...manualEntry, serverName: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Gross sales"
                    value={manualEntry.grossSales}
                    onChange={(e) =>
                      setManualEntry({ ...manualEntry, grossSales: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="number"
                    placeholder="CC tips"
                    value={manualEntry.ccTips}
                    onChange={(e) =>
                      setManualEntry({ ...manualEntry, ccTips: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Cash tips"
                    value={manualEntry.cashTips}
                    onChange={(e) =>
                      setManualEntry({ ...manualEntry, cashTips: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddManualEntry}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-sm"
                  >
                    Add
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || entries.length === 0}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
          >
            {saving ? "Creating..." : "Create Shift"}
          </button>
          <Link
            href="/tips/shifts"
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
