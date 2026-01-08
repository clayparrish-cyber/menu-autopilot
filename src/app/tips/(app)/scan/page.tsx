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

// Demo scans using Kamal's real staff names
const EXISTING_SCANS: ScanResult[] = [
  {
    id: "s1",
    imageUrl: "/placeholder.jpg",
    status: "confirmed",
    extractedData: {
      serverName: "Margaret Nielsen",
      shiftDate: "2026-01-14",
      grossTips: 425.00,
      cashOwed: 15.00,
      tipOuts: [
        { recipientName: "Moses", amount: 12.08 },
        { recipientName: "Emma", amount: 10.00 },
      ],
      netTips: 387.92,
    },
  },
  {
    id: "s2",
    imageUrl: "/placeholder.jpg",
    status: "review",
    extractedData: {
      serverName: "Diondra",
      shiftDate: "2026-01-17",
      grossTips: 445.00,
      tipOuts: [
        { recipientName: "Moses", amount: 28.30 },
        { recipientName: "Emma", amount: 25.00 },
      ],
      netTips: 391.70,
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
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--tip-text-primary)' }}
        >
          Scan Receipts
        </h1>
        <p
          className="font-mono text-sm mt-1"
          style={{ color: 'var(--tip-text-muted)' }}
        >
          Upload cover pages from receipt packets
        </p>
      </div>

      {/* Upload area */}
      <div
        className={`relative rounded-2xl p-8 text-center transition-all duration-200 ${
          dragActive ? 'scale-[1.02]' : ''
        }`}
        style={{
          background: dragActive ? 'var(--tip-accent-glow)' : 'var(--tip-bg-elevated)',
          border: dragActive ? '2px dashed var(--tip-accent)' : '2px dashed var(--tip-border)',
        }}
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
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
            style={{
              background: uploading ? 'var(--tip-accent-glow)' : 'var(--tip-bg-surface)',
            }}
          >
            {uploading ? (
              <Loader2
                className="h-8 w-8 animate-spin"
                style={{ color: 'var(--tip-accent)' }}
              />
            ) : (
              <Camera
                className="h-8 w-8"
                style={{ color: 'var(--tip-text-muted)' }}
              />
            )}
          </div>

          <div>
            <p
              className="font-medium"
              style={{ color: 'var(--tip-text-primary)' }}
            >
              {uploading ? "Processing..." : "Drop images here or click to upload"}
            </p>
            <p
              className="text-sm mt-1 font-mono"
              style={{ color: 'var(--tip-text-muted)' }}
            >
              Take photos of cover pages - batch upload supported
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="tip-btn-primary inline-flex items-center justify-center px-6 py-3 rounded-xl disabled:opacity-50"
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
              className="tip-btn-secondary inline-flex items-center justify-center px-6 py-3 rounded-xl disabled:opacity-50"
            >
              <Upload className="mr-2 h-5 w-5" />
              Choose Files
            </button>
          </div>
        </div>
      </div>

      {/* Processing scans */}
      {processingScans.length > 0 && (
        <div className="space-y-3 animate-slide-up">
          <h2 className="font-semibold" style={{ color: 'var(--tip-text-primary)' }}>
            Processing...
          </h2>
          <div className="grid gap-3">
            {processingScans.map((scan) => (
              <div
                key={scan.id}
                className="flex items-center gap-4 rounded-xl p-4"
                style={{
                  background: 'var(--tip-bg-elevated)',
                  border: '1px solid var(--tip-border)',
                }}
              >
                <div
                  className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0"
                  style={{ background: 'var(--tip-bg-surface)' }}
                >
                  <img
                    src={scan.imageUrl}
                    alt="Processing"
                    className="w-full h-full object-cover opacity-50"
                  />
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    style={{ color: 'var(--tip-accent)' }}
                  />
                  <span
                    className="font-mono text-sm"
                    style={{ color: 'var(--tip-text-secondary)' }}
                  >
                    Extracting data...
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Needs review */}
      {reviewScans.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--tip-text-primary)' }}>
            <AlertCircle className="h-5 w-5" style={{ color: 'var(--tip-warning)' }} />
            Needs Review ({reviewScans.length})
          </h2>
          <div className="grid gap-3">
            {reviewScans.map((scan) => (
              <div
                key={scan.id}
                className="rounded-xl p-4"
                style={{
                  background: 'var(--tip-bg-elevated)',
                  border: '1px solid rgba(240, 180, 41, 0.3)',
                }}
              >
                <div className="flex gap-4">
                  <div
                    className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0"
                    style={{ background: 'var(--tip-bg-surface)' }}
                  >
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
                          <span
                            className="font-semibold"
                            style={{ color: 'var(--tip-text-primary)' }}
                          >
                            {scan.extractedData.serverName}
                          </span>
                          <span
                            className="text-sm font-mono"
                            style={{ color: 'var(--tip-text-muted)' }}
                          >
                            {scan.extractedData.shiftDate}
                          </span>
                        </div>
                        {/* Summary row */}
                        <div
                          className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-mono"
                        >
                          <div style={{ color: 'var(--tip-text-muted)' }}>Gross</div>
                          <div style={{ color: 'var(--tip-text-secondary)' }}>
                            ${scan.extractedData.grossTips.toFixed(2)}
                          </div>

                          {scan.extractedData.cashOwed && (
                            <>
                              <div style={{ color: 'var(--tip-text-muted)' }}>Cash owed</div>
                              <div style={{ color: 'var(--tip-text-secondary)' }}>
                                -${scan.extractedData.cashOwed.toFixed(2)}
                              </div>
                            </>
                          )}

                          {scan.extractedData.tipOuts.map((tipOut, idx) => (
                            <>
                              <div key={`label-${idx}`} style={{ color: 'var(--tip-text-muted)' }}>
                                {idx === 0 ? 'Tip-outs' : ''}
                              </div>
                              <div key={`amount-${idx}`} style={{ color: 'var(--tip-text-secondary)' }}>
                                {tipOut.recipientName} -${tipOut.amount.toFixed(2)}
                              </div>
                            </>
                          ))}

                          <div
                            className="font-semibold pt-1"
                            style={{
                              color: 'var(--tip-accent)',
                              borderTop: '1px dashed var(--tip-border)',
                            }}
                          >
                            Net
                          </div>
                          <div
                            className="font-semibold pt-1"
                            style={{
                              color: 'var(--tip-accent)',
                              borderTop: '1px dashed var(--tip-border)',
                            }}
                          >
                            ${scan.extractedData.netTips.toFixed(2)}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div
                  className="flex gap-2 mt-4 pt-4"
                  style={{ borderTop: '1px dashed var(--tip-border)' }}
                >
                  <Link
                    href={`/tips/scan/${scan.id}/edit`}
                    className="tip-btn-secondary flex-1 px-3 py-2.5 rounded-lg text-center text-sm font-medium"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => confirmScan(scan.id)}
                    className="tip-btn-primary flex-1 px-3 py-2.5 rounded-lg text-sm inline-flex items-center justify-center gap-1"
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
          <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--tip-text-primary)' }}>
            <Check className="h-5 w-5" style={{ color: 'var(--tip-success)' }} />
            Confirmed ({confirmedScans.length})
          </h2>
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: 'var(--tip-bg-elevated)',
              border: '1px solid var(--tip-border)',
            }}
          >
            {confirmedScans.map((scan, index) => (
              <div
                key={scan.id}
                className="flex items-center justify-between px-4 py-3"
                style={{
                  borderBottom: index < confirmedScans.length - 1 ? '1px solid var(--tip-border-subtle)' : 'none',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg overflow-hidden"
                    style={{ background: 'var(--tip-bg-surface)' }}
                  >
                    <img
                      src={scan.imageUrl}
                      alt="Receipt"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div
                      className="font-medium"
                      style={{ color: 'var(--tip-text-primary)' }}
                    >
                      {scan.extractedData?.serverName}
                    </div>
                    <div
                      className="text-sm font-mono"
                      style={{ color: 'var(--tip-text-muted)' }}
                    >
                      {scan.extractedData?.shiftDate}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="font-semibold font-mono"
                    style={{ color: 'var(--tip-accent)' }}
                  >
                    ${scan.extractedData?.netTips.toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeScan(scan.id)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--tip-text-muted)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--tip-error)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--tip-text-muted)'}
                    title="Remove"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View ledger CTA */}
      {confirmedScans.length > 0 && (
        <Link
          href="/tips/ledger"
          className="flex items-center justify-between rounded-xl p-5 transition-all duration-200"
          style={{
            background: 'var(--tip-accent-glow)',
            border: '1px solid var(--tip-accent-dim)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 20px var(--tip-accent-glow)'}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
        >
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--tip-accent)' }}>
              View Pay Period Ledger
            </h3>
            <p
              className="text-sm mt-0.5"
              style={{ color: 'var(--tip-text-secondary)' }}
            >
              See the full breakdown by staff and date
            </p>
          </div>
          <ChevronRight className="h-5 w-5" style={{ color: 'var(--tip-accent)' }} />
        </Link>
      )}
    </div>
  );
}
