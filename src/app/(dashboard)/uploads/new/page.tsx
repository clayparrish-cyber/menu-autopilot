"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import Papa from "papaparse";
import {
  suggestMapping,
  CanonicalField,
  FIELD_DEFINITIONS,
  POSPreset,
  sanityCheckPreview,
  createPreviewRows,
} from "@/lib/mapping";

type UploadStep = "select" | "mapPerformance" | "mapCosts" | "processing" | "complete";

interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
  filename: string;
}

interface ColumnMapping {
  [header: string]: CanonicalField | null;
}

export default function UploadPage() {
  const router = useRouter();
  const [step, setStep] = useState<UploadStep>("select");
  const [preset, setPreset] = useState<POSPreset>("generic");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Performance file state
  const [perfFile, setPerfFile] = useState<ParsedFile | null>(null);
  const [perfMapping, setPerfMapping] = useState<ColumnMapping>({});
  const [perfWarnings, setPerfWarnings] = useState<string[]>([]);

  // Cost file state
  const [costFile, setCostFile] = useState<ParsedFile | null>(null);
  const [costMapping, setCostMapping] = useState<ColumnMapping>({});

  // Week dates
  const [weekStart, setWeekStart] = useState("");
  const [weekEnd, setWeekEnd] = useState("");

  const parseCSV = useCallback((file: File): Promise<ParsedFile> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(results.errors[0].message));
            return;
          }
          resolve({
            headers: results.meta.fields || [],
            rows: results.data as Record<string, string>[],
            filename: file.name,
          });
        },
        error: (err) => reject(err),
      });
    });
  }, []);

  const handlePerfFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    try {
      const parsed = await parseCSV(file);
      setPerfFile(parsed);

      // Auto-suggest mappings
      const result = suggestMapping(parsed.headers, preset);
      const mapping: ColumnMapping = {};
      for (const header of parsed.headers) {
        mapping[header] = null;
      }
      for (const [field, suggestion] of result.suggestions) {
        mapping[suggestion.headerName] = field;
      }
      setPerfMapping(mapping);
      setPerfWarnings(result.warnings);
      setStep("mapPerformance");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    }
  };

  const handleCostFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    try {
      const parsed = await parseCSV(file);
      setCostFile(parsed);

      // Auto-suggest mappings for cost file
      const result = suggestMapping(parsed.headers, "generic");
      const mapping: ColumnMapping = {};
      for (const header of parsed.headers) {
        mapping[header] = null;
      }
      for (const [field, suggestion] of result.suggestions) {
        mapping[suggestion.headerName] = field;
      }
      setCostMapping(mapping);
      setStep("mapCosts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    }
  };

  const validatePerfMapping = (): boolean => {
    const requiredFields: CanonicalField[] = ["item_name", "quantity_sold", "net_sales"];
    const mappedFields = new Set(Object.values(perfMapping).filter(Boolean));

    for (const field of requiredFields) {
      if (!mappedFields.has(field)) {
        setError(`Required field "${field}" is not mapped`);
        return false;
      }
    }

    // Check preview for sanity
    const fieldToHeader = new Map<CanonicalField, string>();
    for (const [header, field] of Object.entries(perfMapping)) {
      if (field) fieldToHeader.set(field, header);
    }

    const preview = createPreviewRows(perfFile!.rows, fieldToHeader);
    const sanity = sanityCheckPreview(preview);
    if (sanity.warnings.length > 0 && !sanity.valid) {
      setPerfWarnings(sanity.warnings);
      return false;
    }

    return true;
  };

  const validateCostMapping = (): boolean => {
    const requiredFields: CanonicalField[] = ["item_name"];
    const mappedFields = new Set(Object.values(costMapping).filter(Boolean));

    for (const field of requiredFields) {
      if (!mappedFields.has(field)) {
        setError(`Required field "${field}" is not mapped`);
        return false;
      }
    }

    // Check that we have a cost column mapped
    const hasCost = Object.values(costMapping).some(
      (f) => f === "net_sales" // Using net_sales as unit_food_cost for cost file
    );
    if (!hasCost) {
      setError("Please map a column for unit food cost");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          performanceData: {
            rows: perfFile!.rows,
            mapping: perfMapping,
          },
          costData: costFile ? {
            rows: costFile.rows,
            mapping: costMapping,
          } : null,
          weekStart,
          weekEnd,
          preset,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const result = await response.json();
      setStep("complete");
      setTimeout(() => {
        router.push(`/reports/${result.reportId}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStep("mapCosts");
    } finally {
      setIsProcessing(false);
    }
  };

  // Preview data for the current mapping
  const getPreviewData = () => {
    if (!perfFile) return [];
    const fieldToHeader = new Map<CanonicalField, string>();
    for (const [header, field] of Object.entries(perfMapping)) {
      if (field) fieldToHeader.set(field, header);
    }
    return createPreviewRows(perfFile.rows, fieldToHeader, 5);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Upload Weekly Data</h1>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[
            { id: "select", label: "Select Files" },
            { id: "mapPerformance", label: "Map Performance" },
            { id: "mapCosts", label: "Map Costs" },
            { id: "processing", label: "Processing" },
          ].map((s, idx) => (
            <div key={s.id} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s.id || ["mapPerformance", "mapCosts", "processing", "complete"].indexOf(step) > ["select", "mapPerformance", "mapCosts", "processing"].indexOf(s.id)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {idx + 1}
              </div>
              <span className="ml-2 text-sm text-gray-600 hidden sm:inline">{s.label}</span>
              {idx < 3 && <div className="w-12 sm:w-24 h-0.5 bg-gray-200 mx-2" />}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Step 1: Select Files */}
      {step === "select" && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              POS System Preset
            </label>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as POSPreset)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="generic">Generic</option>
              <option value="toast">Toast</option>
              <option value="square">Square</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Select your POS system for better column mapping suggestions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Week Start Date
              </label>
              <input
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Week End Date
              </label>
              <input
                type="date"
                value={weekEnd}
                onChange={(e) => setWeekEnd(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Upload Weekly Performance CSV
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Export from your POS system with item sales data
            </p>
            <label className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 cursor-pointer">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Choose File
              <input
                type="file"
                accept=".csv"
                onChange={handlePerfFileChange}
                className="hidden"
              />
            </label>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              <strong>Required columns:</strong> Item name, Quantity sold, Net sales
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Optional:</strong> Category, Week dates, Gross sales, Discounts
            </p>
            <a
              href="/templates/weekly_pos_export.csv"
              download
              className="text-sm text-blue-600 hover:text-blue-500 mt-2 inline-block"
            >
              Download template CSV
            </a>
          </div>
        </div>
      )}

      {/* Step 2: Map Performance Columns */}
      {step === "mapPerformance" && perfFile && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Map Performance Columns
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Match your CSV columns to the required fields. We&apos;ve suggested mappings based on your column names.
          </p>

          {perfWarnings.length > 0 && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-yellow-800">Warnings</h4>
              <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                {perfWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    CSV Column
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Maps To
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Sample Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {perfFile.headers.map((header) => (
                  <tr key={header}>
                    <td className="px-4 py-2 text-sm text-gray-900">{header}</td>
                    <td className="px-4 py-2">
                      <select
                        value={perfMapping[header] || ""}
                        onChange={(e) =>
                          setPerfMapping({
                            ...perfMapping,
                            [header]: (e.target.value as CanonicalField) || null,
                          })
                        }
                        className="block w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">-- Skip --</option>
                        {FIELD_DEFINITIONS.map((f) => (
                          <option key={f.field} value={f.field}>
                            {f.field} {f.required ? "*" : ""}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {perfFile.rows[0]?.[header] || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Preview */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Preview (first 5 rows)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Item</th>
                    <th className="px-3 py-2 text-left">Qty</th>
                    <th className="px-3 py-2 text-left">Sales</th>
                    <th className="px-3 py-2 text-left">Avg Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {getPreviewData().map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{row.item_name}</td>
                      <td className="px-3 py-2">{row.quantity_sold}</td>
                      <td className="px-3 py-2">${row.net_sales.toFixed(2)}</td>
                      <td className="px-3 py-2 font-medium">
                        ${row.avg_price.toFixed(2)}
                        {(row.avg_price < 1 || row.avg_price > 250) && (
                          <span className="ml-2 text-red-500" title="Unusual price">
                            ⚠
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => {
                setPerfFile(null);
                setStep("select");
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
            >
              &larr; Back
            </button>
            <button
              onClick={() => {
                if (validatePerfMapping()) {
                  setStep("mapCosts");
                }
              }}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Map Costs or Skip */}
      {step === "mapCosts" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Upload Item Costs (Optional)
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Upload a CSV with item costs, or skip to use existing cost data.
          </p>

          {!costFile ? (
            <>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  Upload Item Costs CSV
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  CSV with item names and unit food costs
                </p>
                <label className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 cursor-pointer">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Choose File
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCostFileChange}
                    className="hidden"
                  />
                </label>
                <a
                  href="/templates/item_costs.csv"
                  download
                  className="block text-sm text-blue-600 hover:text-blue-500 mt-4"
                >
                  Download template CSV
                </a>
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setStep("mapPerformance")}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                >
                  &larr; Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isProcessing}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {isProcessing ? "Processing..." : "Skip & Generate Report"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        CSV Column
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Maps To
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Sample
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {costFile.headers.map((header) => (
                      <tr key={header}>
                        <td className="px-4 py-2 text-sm text-gray-900">{header}</td>
                        <td className="px-4 py-2">
                          <select
                            value={costMapping[header] || ""}
                            onChange={(e) =>
                              setCostMapping({
                                ...costMapping,
                                [header]: (e.target.value as CanonicalField) || null,
                              })
                            }
                            className="block w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                          >
                            <option value="">-- Skip --</option>
                            <option value="item_name">item_name *</option>
                            <option value="net_sales">unit_food_cost *</option>
                            <option value="category">category</option>
                          </select>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {costFile.rows[0]?.[header] || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => {
                    setCostFile(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                >
                  &larr; Remove Cost File
                </button>
                <button
                  onClick={() => {
                    if (validateCostMapping()) {
                      handleSubmit();
                    }
                  }}
                  disabled={isProcessing}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {isProcessing ? "Processing..." : "Generate Report"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Processing */}
      {step === "processing" && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Processing your data...</p>
        </div>
      )}

      {/* Complete */}
      {step === "complete" && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h2 className="mt-4 text-xl font-medium text-gray-900">Upload Complete!</h2>
          <p className="mt-2 text-gray-600">Redirecting to your report...</p>
        </div>
      )}
    </div>
  );
}
