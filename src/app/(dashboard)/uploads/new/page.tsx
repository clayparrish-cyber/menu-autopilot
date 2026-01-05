"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, AlertTriangle, Info } from "lucide-react";
import Papa from "papaparse";
import {
  suggestMapping,
  CanonicalField,
  FIELD_DEFINITIONS,
  POSPreset,
  sanityCheckPreview,
  createPreviewRows,
} from "@/lib/mapping";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type CostSource = "manual" | "marginedge";

interface CostValidationResult {
  coverage: number;
  coverageBadge: "GOOD" | "MIXED" | "REVIEW";
  staleness: "CURRENT" | "STALE";
  mismatchCount: number;
  sanityWarnings: string[];
}

interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
  filename: string;
}

interface ColumnMapping {
  [header: string]: CanonicalField | null;
}

const STEPS = [
  { title: "Performance Data", description: "Upload sales CSV" },
  { title: "Item Costs", description: "Add cost data" },
];

export default function UploadPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [preset, setPreset] = useState<POSPreset>("generic");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Performance file state
  const [perfFile, setPerfFile] = useState<ParsedFile | null>(null);
  const [perfMapping, setPerfMapping] = useState<ColumnMapping>({});
  const [perfWarnings, setPerfWarnings] = useState<string[]>([]);

  // Cost file state
  const [costFile, setCostFile] = useState<ParsedFile | null>(null);
  const [costMapping, setCostMapping] = useState<ColumnMapping>({});
  const [costSource, setCostSource] = useState<CostSource>("manual");
  const [meWeekStart, setMeWeekStart] = useState("");
  const [meWeekEnd, setMeWeekEnd] = useState("");
  const [costValidation, setCostValidation] = useState<CostValidationResult | null>(null);
  const [acknowledgeReview, setAcknowledgeReview] = useState(false);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    }
  };

  const handleCostFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setCostValidation(null);
    setAcknowledgeReview(false);
    try {
      const parsed = await parseCSV(file);
      setCostFile(parsed);

      // Auto-suggest mappings using marginedge preset for ME source
      const presetToUse = costSource === "marginedge" ? "marginedge" : "generic";
      const result = suggestMapping(parsed.headers, presetToUse);
      const mapping: ColumnMapping = {};
      for (const header of parsed.headers) {
        mapping[header] = null;
      }
      for (const [field, suggestion] of result.suggestions) {
        mapping[suggestion.headerName] = field;
      }
      setCostMapping(mapping);

      // For ME, default ME dates to POS dates if not set
      if (costSource === "marginedge" && !meWeekStart && weekStart) {
        setMeWeekStart(weekStart);
      }
      if (costSource === "marginedge" && !meWeekEnd && weekEnd) {
        setMeWeekEnd(weekEnd);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    }
  };

  const validatePerfMapping = (): boolean => {
    const requiredFields: CanonicalField[] = ["item_name", "quantity_sold", "net_sales"];
    const mappedFields = new Set(Object.values(perfMapping).filter(Boolean));

    for (const field of requiredFields) {
      if (!mappedFields.has(field)) {
        setError(`Required field "${field.replace("_", " ")}" is not mapped`);
        return false;
      }
    }

    if (!weekStart || !weekEnd) {
      setError("Please select week start and end dates");
      return false;
    }

    // Check preview for sanity
    const fieldToHeader = new Map<CanonicalField, string>();
    for (const [header, field] of Object.entries(perfMapping)) {
      if (field) fieldToHeader.set(field, header);
    }

    const preview = createPreviewRows(perfFile!.rows, fieldToHeader);
    const sanity = sanityCheckPreview(preview);
    if (sanity.warnings.length > 0) {
      setPerfWarnings(sanity.warnings);
    }

    return true;
  };

  const validateCostMapping = (): boolean => {
    if (!costFile) return true; // Cost file is optional

    const requiredFields: CanonicalField[] = ["item_name"];
    const mappedFields = new Set(Object.values(costMapping).filter(Boolean));

    for (const field of requiredFields) {
      if (!mappedFields.has(field)) {
        setError(`Required field "${field.replace("_", " ")}" is not mapped`);
        return false;
      }
    }

    if (costSource === "marginedge") {
      // ME requires avg_cost_base
      const hasCost = mappedFields.has("avg_cost_base");
      if (!hasCost) {
        setError("Please map a column for average cost (base cost)");
        return false;
      }
    } else {
      // Manual mode uses net_sales field for cost (legacy)
      const hasCost = Object.values(costMapping).some((f) => f === "net_sales");
      if (!hasCost) {
        setError("Please map a column for unit food cost");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateCostMapping()) return;

    // For ME, check if review acknowledged when needed
    if (costValidation?.coverageBadge === "REVIEW" && !acknowledgeReview) {
      setError("Please acknowledge the data quality warning to proceed");
      return;
    }

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
          costData: costFile
            ? {
                rows: costFile.rows,
                mapping: costMapping,
                source: costSource,
                meWeekStart: costSource === "marginedge" ? meWeekStart : undefined,
                meWeekEnd: costSource === "marginedge" ? meWeekEnd : undefined,
              }
            : null,
          weekStart,
          weekEnd,
          preset,
          acknowledgeReview,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle validation that requires acknowledgment
        if (result.requiresAcknowledgment && result.validation) {
          setCostValidation(result.validation);
          setError("Cost data has quality issues that require acknowledgment");
          return;
        }
        throw new Error(result.error || "Upload failed");
      }

      // Store validation result if returned
      if (result.costValidation) {
        setCostValidation(result.costValidation);
      }

      setIsComplete(true);
      setTimeout(() => {
        router.push(`/reports/${result.reportId}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const getPreviewData = () => {
    if (!perfFile) return [];
    const fieldToHeader = new Map<CanonicalField, string>();
    for (const [header, field] of Object.entries(perfMapping)) {
      if (field) fieldToHeader.set(field, header);
    }
    return createPreviewRows(perfFile.rows, fieldToHeader, 5);
  };

  const canProceedStep1 = perfFile && weekStart && weekEnd;
  const previewData = getPreviewData();

  if (isComplete) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 text-center">
          <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Upload Complete!</h2>
          <p className="mt-2 text-gray-600">Redirecting to your report...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-2">Upload Weekly Data</h1>
      <p className="text-sm text-gray-500 mb-6">
        Upload your POS export and item costs to generate a menu analysis report.
      </p>

      {/* Progress Stepper */}
      <Stepper steps={STEPS} currentStep={currentStep} className="mb-8" />

      {/* Error Alert */}
      {error && (
        <Card variant="danger" className="mb-6 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Step 1: Performance Data */}
      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Upload Performance Data</CardTitle>
            <CardDescription>
              Export item sales from your POS system (Toast, Square, or generic CSV)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Settings Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="POS System"
                value={preset}
                onChange={(e) => setPreset(e.target.value as POSPreset)}
                options={[
                  { value: "generic", label: "Generic CSV" },
                  { value: "toast", label: "Toast" },
                  { value: "square", label: "Square" },
                ]}
              />
              <Input
                label="Week Start"
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
              />
              <Input
                label="Week End"
                type="date"
                value={weekEnd}
                onChange={(e) => setWeekEnd(e.target.value)}
              />
            </div>

            {/* File Upload Zone */}
            {!perfFile ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-gray-300 transition-colors">
                <Upload className="mx-auto h-10 w-10 text-gray-400" />
                <h3 className="mt-3 text-sm font-medium text-gray-900">
                  Drop your CSV here, or click to browse
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Required: Item name, Quantity sold, Net sales
                </p>
                <label className="mt-4 inline-block">
                  <Button variant="secondary" size="sm" icon={<FileSpreadsheet className="h-4 w-4" />}>
                    Choose File
                  </Button>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handlePerfFileChange}
                    className="hidden"
                  />
                </label>
                <div className="mt-3">
                  <a
                    href="/templates/weekly_pos_export.csv"
                    download
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Download template CSV
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* File Info */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{perfFile.filename}</p>
                      <p className="text-xs text-gray-500">
                        {perfFile.rows.length} rows, {perfFile.headers.length} columns
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPerfFile(null);
                      setPerfMapping({});
                      setPerfWarnings([]);
                    }}
                  >
                    Remove
                  </Button>
                </div>

                {/* Warnings */}
                {perfWarnings.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <p className="text-sm font-medium text-amber-800">Sanity check warnings</p>
                    </div>
                    <ul className="space-y-1">
                      {perfWarnings.map((w, i) => (
                        <li key={i} className="text-xs text-amber-700">
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Column Mapping */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Column Mapping</h4>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Your Column
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Maps To
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Sample
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {perfFile.headers.map((header) => (
                          <tr key={header}>
                            <td className="px-3 py-2 text-gray-900">{header}</td>
                            <td className="px-3 py-2">
                              <select
                                value={perfMapping[header] || ""}
                                onChange={(e) =>
                                  setPerfMapping({
                                    ...perfMapping,
                                    [header]: (e.target.value as CanonicalField) || null,
                                  })
                                }
                                className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                              >
                                <option value="">Skip</option>
                                {FIELD_DEFINITIONS.map((f) => (
                                  <option key={f.field} value={f.field}>
                                    {f.field.replace(/_/g, " ")} {f.required ? "*" : ""}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2 text-gray-500 truncate max-w-[150px]">
                              {perfFile.rows[0]?.[header] || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Preview */}
                {previewData.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Preview (first 5 items)</h4>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                              Item
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                              Qty
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                              Sales
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                              Avg Price
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {previewData.map((row, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2 text-gray-900">{row.item_name}</td>
                              <td className="px-3 py-2 text-gray-900 text-right">
                                {row.quantity_sold}
                              </td>
                              <td className="px-3 py-2 text-gray-900 text-right">
                                ${row.net_sales.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <span
                                  className={
                                    row.avg_price < 1 || row.avg_price > 250
                                      ? "text-amber-600 font-medium"
                                      : "text-gray-900"
                                  }
                                >
                                  ${row.avg_price.toFixed(2)}
                                </span>
                                {(row.avg_price < 1 || row.avg_price > 250) && (
                                  <span className="ml-1 text-amber-500" title="Unusual price">
                                    ?
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end pt-4 border-t border-gray-100">
              <Button
                onClick={() => {
                  if (validatePerfMapping()) {
                    setCurrentStep(1);
                    setError(null);
                  }
                }}
                disabled={!canProceedStep1}
              >
                Continue to Costs
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Item Costs */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Add Item Costs</CardTitle>
            <CardDescription>
              Upload cost data from MarginEdge or a manual CSV
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Cost Source Selection */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setCostSource("marginedge");
                  setCostFile(null);
                  setCostMapping({});
                  setCostValidation(null);
                }}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  costSource === "marginedge"
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <h4 className="font-medium text-gray-900">MarginEdge</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Menu Analysis CSV with recipe costs
                </p>
              </button>
              <button
                onClick={() => {
                  setCostSource("manual");
                  setCostFile(null);
                  setCostMapping({});
                  setCostValidation(null);
                }}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  costSource === "manual"
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <h4 className="font-medium text-gray-900">Manual CSV</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Simple item name + cost file
                </p>
              </button>
            </div>

            {/* ME Date Range (only for MarginEdge) */}
            {costSource === "marginedge" && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-800">MarginEdge Export</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Export Menu Analysis from MarginEdge for the same date range as your POS data.
                    </p>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <Input
                        label="ME Week Start"
                        type="date"
                        value={meWeekStart}
                        onChange={(e) => setMeWeekStart(e.target.value)}
                      />
                      <Input
                        label="ME Week End"
                        type="date"
                        value={meWeekEnd}
                        onChange={(e) => setMeWeekEnd(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!costFile ? (
              <>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-gray-300 transition-colors">
                  <FileSpreadsheet className="mx-auto h-10 w-10 text-gray-400" />
                  <h3 className="mt-3 text-sm font-medium text-gray-900">
                    {costSource === "marginedge"
                      ? "Upload MarginEdge Menu Analysis CSV"
                      : "Upload Item Costs CSV (Optional)"}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {costSource === "marginedge"
                      ? "Export Menu Analysis > Download CSV from MarginEdge"
                      : "CSV with item names and unit food costs"}
                  </p>
                  <label className="mt-4 inline-block">
                    <Button variant="secondary" size="sm" icon={<FileSpreadsheet className="h-4 w-4" />}>
                      Choose File
                    </Button>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCostFileChange}
                      className="hidden"
                    />
                  </label>
                  {costSource === "manual" && (
                    <div className="mt-3">
                      <a
                        href="/templates/item_costs.csv"
                        download
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Download template CSV
                      </a>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>No cost file?</strong> We'll use your existing item costs, or estimate at
                    30% of price for new items. You can update costs anytime in the Items page.
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {/* File Info */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{costFile.filename}</p>
                      <p className="text-xs text-gray-500">
                        {costFile.rows.length} rows, {costFile.headers.length} columns
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setCostFile(null)}>
                    Remove
                  </Button>
                </div>

                {/* Column Mapping */}
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Your Column
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Maps To
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Sample
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {costFile.headers.map((header) => (
                        <tr key={header}>
                          <td className="px-3 py-2 text-gray-900">{header}</td>
                          <td className="px-3 py-2">
                            <select
                              value={costMapping[header] || ""}
                              onChange={(e) =>
                                setCostMapping({
                                  ...costMapping,
                                  [header]: (e.target.value as CanonicalField) || null,
                                })
                              }
                              className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                            >
                              <option value="">Skip</option>
                              <option value="item_name">item name *</option>
                              {costSource === "marginedge" ? (
                                <>
                                  <option value="avg_cost_base">average cost (base) *</option>
                                  <option value="modifier_cost">modifier cost</option>
                                  <option value="total_cost">total cost</option>
                                  <option value="items_sold_cost">items sold</option>
                                  <option value="total_revenue_cost">total revenue</option>
                                  <option value="theoretical_cost_pct">theoretical cost %</option>
                                </>
                              ) : (
                                <option value="net_sales">unit food cost *</option>
                              )}
                              <option value="category">category</option>
                            </select>
                          </td>
                          <td className="px-3 py-2 text-gray-500 truncate max-w-[150px]">
                            {costFile.rows[0]?.[header] || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Validation Results (for ME) */}
                {costValidation && costSource === "marginedge" && (
                  <div className={`p-4 rounded-lg border ${
                    costValidation.coverageBadge === "GOOD"
                      ? "bg-emerald-50 border-emerald-200"
                      : costValidation.coverageBadge === "MIXED"
                      ? "bg-amber-50 border-amber-200"
                      : "bg-red-50 border-red-200"
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      <Badge
                        variant={
                          costValidation.coverageBadge === "GOOD"
                            ? "success"
                            : costValidation.coverageBadge === "MIXED"
                            ? "warning"
                            : "danger"
                        }
                      >
                        {costValidation.coverageBadge}
                      </Badge>
                      <span className="text-sm font-medium">
                        {(costValidation.coverage * 100).toFixed(0)}% cost coverage
                      </span>
                    </div>
                    {costValidation.staleness === "STALE" && (
                      <p className="text-xs text-amber-700 mb-2">
                        ⚠️ ME date range doesn't match POS dates
                      </p>
                    )}
                    {costValidation.mismatchCount > 0 && (
                      <p className="text-xs text-amber-700 mb-2">
                        ⚠️ {costValidation.mismatchCount} items have quantity mismatches
                      </p>
                    )}
                    {costValidation.sanityWarnings.map((w, i) => (
                      <p key={i} className="text-xs text-amber-700">
                        {w}
                      </p>
                    ))}
                  </div>
                )}

                {/* Acknowledgment Checkbox (when REVIEW status) */}
                {costValidation?.coverageBadge === "REVIEW" && (
                  <label className="flex items-start gap-3 p-4 border border-red-200 bg-red-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acknowledgeReview}
                      onChange={(e) => setAcknowledgeReview(e.target.checked)}
                      className="mt-0.5 h-4 w-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                    />
                    <div>
                      <p className="text-sm font-medium text-red-800">
                        Acknowledge Data Quality Issues
                      </p>
                      <p className="text-xs text-red-700 mt-1">
                        I understand the cost data has quality issues and want to proceed anyway.
                        Recommendations may be less accurate.
                      </p>
                    </div>
                  </label>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t border-gray-100">
              <Button variant="ghost" onClick={() => setCurrentStep(0)}>
                Back
              </Button>
              <Button onClick={handleSubmit} loading={isProcessing}>
                {costFile ? "Generate Report" : "Skip Costs & Generate Report"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
