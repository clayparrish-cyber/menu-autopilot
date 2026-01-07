"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Camera, Upload, X, Check, AlertCircle, Loader2, ChevronRight } from "lucide-react";

interface ScanResult {
  id: string;
  imageUrl: string;
  status: "processing" | "review" | "confirmed" | "error";
  extractedData?: {
    serverName: string;
    shiftDate: string;
    grossTips: number;
    cashOwed?: number;
    tipOuts: { recipientName: string; amount: number }[];
    netTips: number;
  };
  error?: string;
}

// Demo scans for the current period
const EXISTING_SCANS: ScanResult[] = [
  {
    id: "s1",
    imageUrl: "/placeholder.jpg",
    status: "confirmed",
    extractedData: {
      serverName: "Meggie",
      shiftDate: "2026-01-06",
      grossTips: 311.55,
      cashOwed: 12.70,
      tipOuts: [
        { recipientName: "Diondre", amount: 14.70 },
        { recipientName: "Emma", amount: 14.70 },
      ],
      netTips: 219.15,
    },
  },
  {
    id: "s2",
    imageUrl: "/placeholder.jpg",
    status: "review",
    extractedData: {
      serverName: "Diondra",
      shiftDate: "2026-01-06",
      grossTips: 357.81,
      tipOuts: [
        { recipientName: "Emma", amount: 17.89 },
      ],
      netTips: 285.50,
    },
  },
];

export default function ScanPage() {
  const [scans, setScans] = useState<ScanResult[]>(EXISTING_SCANS);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);

    // Process each file
    const newScans: ScanResult[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Create a preview URL for the image
      const imageUrl = URL.createObjectURL(file);

      // Add as processing
      const scanId = `scan-${Date.now()}-${i}`;
      newScans.push({
        id: scanId,
        imageUrl,
        status: "processing",
      });
    }

    setScans((prev) => [...newScans, ...prev]);

    // Simulate OCR processing for each scan
    for (const scan of newScans) {
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate API call

      // Mock OCR result - in production this would call the OCR API
      setScans((prev) =>
        prev.map((s) =>
          s.id === scan.id
            ? {
                ...s,
                status: "review" as const,
                extractedData: {
                  serverName: "New Server",
                  shiftDate: new Date().toISOString().split("T")[0],
                  grossTips: 250.00,
                  tipOuts: [],
                  netTips: 250.00,
                },
              }
            : s
        )
      );
    }

    setUploading(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const confirmScan = (scanId: string) => {
    setScans((prev) =>
      prev.map((s) => (s.id === scanId ? { ...s, status: "confirmed" as const } : s))
    );
  };

  const removeScan = (scanId: string) => {
    setScans((prev) => prev.filter((s) => s.id !== scanId));
  };

  const reviewScans = scans.filter((s) => s.status === "review");
  const confirmedScans = scans.filter((s) => s.status === "confirmed");
  const processingScans = scans.filter((s) => s.status === "processing");

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scan Receipts</h1>
        <p className="text-gray-500">Upload cover pages from receipt packets</p>
      </div>

      {/* Upload area */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          capture="environment"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        <div className="space-y-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            {uploading ? (
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            ) : (
              <Camera className="h-8 w-8 text-gray-400" />
            )}
          </div>

          <div>
            <p className="text-gray-900 font-medium">
              {uploading ? "Processing..." : "Drop images here or click to upload"}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Take photos of cover pages - you can upload multiple at once
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center justify-center px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl transition-colors"
            >
              <Camera className="mr-2 h-5 w-5" />
              Take Photo
            </button>
            <button
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.removeAttribute("capture");
                  fileInputRef.current.click();
                  fileInputRef.current.setAttribute("capture", "environment");
                }
              }}
              disabled={uploading}
              className="inline-flex items-center justify-center px-5 py-3 bg-white border border-gray-200 hover:border-gray-300 disabled:opacity-50 text-gray-700 font-medium rounded-xl transition-colors"
            >
              <Upload className="mr-2 h-5 w-5" />
              Choose Files
            </button>
          </div>
        </div>
      </div>

      {/* Processing scans */}
      {processingScans.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">Processing...</h2>
          <div className="grid gap-3">
            {processingScans.map((scan) => (
              <div
                key={scan.id}
                className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4"
              >
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={scan.imageUrl}
                    alt="Processing"
                    className="w-full h-full object-cover opacity-50"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                    <span className="text-gray-600">Extracting data...</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Needs review */}
      {reviewScans.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Needs Review ({reviewScans.length})
          </h2>
          <div className="grid gap-3">
            {reviewScans.map((scan) => (
              <div
                key={scan.id}
                className="bg-white border border-amber-200 rounded-xl p-4"
              >
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={scan.imageUrl}
                      alt="Receipt"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    {scan.extractedData && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900">
                            {scan.extractedData.serverName}
                          </span>
                          <span className="text-sm text-gray-500">
                            {scan.extractedData.shiftDate}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          Gross: ${scan.extractedData.grossTips.toFixed(2)}
                          {scan.extractedData.cashOwed && (
                            <span className="text-gray-400">
                              {" "}- ${scan.extractedData.cashOwed.toFixed(2)} cash
                            </span>
                          )}
                        </div>
                        {scan.extractedData.tipOuts.length > 0 && (
                          <div className="mt-1 text-sm text-gray-500">
                            Tip-outs:{" "}
                            {scan.extractedData.tipOuts
                              .map((t) => `${t.recipientName} $${t.amount}`)
                              .join(", ")}
                          </div>
                        )}
                        <div className="mt-1 font-medium text-green-600">
                          Net: ${scan.extractedData.netTips.toFixed(2)}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <Link
                    href={`/tips/scan/${scan.id}/edit`}
                    className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-center text-sm transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => confirmScan(scan.id)}
                    className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg text-sm transition-colors inline-flex items-center justify-center gap-1"
                  >
                    <Check className="h-4 w-4" />
                    Confirm
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed scans */}
      {confirmedScans.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            Confirmed ({confirmedScans.length})
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="divide-y divide-gray-100">
              {confirmedScans.map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={scan.imageUrl}
                        alt="Receipt"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {scan.extractedData?.serverName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {scan.extractedData?.shiftDate}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-green-600">
                      ${scan.extractedData?.netTips.toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeScan(scan.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* View ledger CTA */}
      {confirmedScans.length > 0 && (
        <Link
          href="/tips/ledger"
          className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-4 hover:bg-blue-100 transition-colors"
        >
          <div>
            <h3 className="font-semibold text-blue-900">View Pay Period Ledger</h3>
            <p className="text-sm text-blue-700">
              See the full breakdown by staff and date
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-blue-400" />
        </Link>
      )}
    </div>
  );
}
