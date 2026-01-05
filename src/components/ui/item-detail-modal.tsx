"use client";

import { X } from "lucide-react";
import { QuadrantBadge, ActionBadge, ConfidenceBadge, CostSourceBadge } from "./badge";

interface ItemKpis {
  qtySold: number;
  netSales: number;
  avgPrice: number;
  unitCost?: number;
  unitMargin?: number;
  totalMargin?: number;
  foodCostPct?: number;
}

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    itemName: string;
    category?: string;
    quadrant?: "STAR" | "PLOWHORSE" | "PUZZLE" | "DOG";
    action: string;
    confidence: "HIGH" | "MEDIUM" | "LOW";
    kpis?: ItemKpis;
    // Table row format
    qtySold?: number;
    avgPrice?: number;
    unitCost?: number;
    unitMargin?: number;
    totalMargin?: number;
    costSource?: "MANUAL" | "MARGINEDGE" | "ESTIMATE";
    suggestedChangeText?: string;
  } | null;
}

export function ItemDetailModal({ isOpen, onClose, item }: ItemDetailModalProps) {
  if (!isOpen || !item) return null;

  // Normalize KPIs from either format
  const kpis = item.kpis || {
    qtySold: item.qtySold || 0,
    netSales: (item.qtySold || 0) * (item.avgPrice || 0),
    avgPrice: item.avgPrice || 0,
    unitCost: item.unitCost,
    unitMargin: item.unitMargin,
    totalMargin: item.totalMargin,
    foodCostPct: item.unitCost && item.avgPrice ? item.unitCost / item.avgPrice : undefined,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{item.itemName}</h2>
            {item.category && (
              <p className="text-sm text-gray-500">{item.category}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
          {item.quadrant && <QuadrantBadge quadrant={item.quadrant} />}
          <ActionBadge action={item.action as any} />
          <ConfidenceBadge confidence={item.confidence} />
        </div>

        {/* KPI Grid */}
        <div className="p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Weekly Performance
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Units Sold</p>
              <p className="text-xl font-semibold text-gray-900">{kpis.qtySold}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Net Sales</p>
              <p className="text-xl font-semibold text-gray-900">
                ${kpis.netSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Avg Price</p>
              <p className="text-xl font-semibold text-gray-900">${kpis.avgPrice.toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                Unit Cost
                {item.costSource && <CostSourceBadge source={item.costSource} />}
              </p>
              <p className="text-xl font-semibold text-gray-900">
                {kpis.unitCost !== undefined ? `$${kpis.unitCost.toFixed(2)}` : "—"}
              </p>
            </div>
          </div>

          {/* Margin Section */}
          {(kpis.unitMargin !== undefined || kpis.totalMargin !== undefined) && (
            <>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4 mb-3">
                Profitability
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 rounded-lg p-3">
                  <p className="text-xs text-emerald-600">Unit Margin</p>
                  <p className="text-xl font-semibold text-emerald-700">
                    {kpis.unitMargin !== undefined ? `$${kpis.unitMargin.toFixed(2)}` : "—"}
                  </p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3">
                  <p className="text-xs text-emerald-600">Total Margin</p>
                  <p className="text-xl font-semibold text-emerald-700">
                    {kpis.totalMargin !== undefined
                      ? `$${kpis.totalMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "—"}
                  </p>
                </div>
                {kpis.foodCostPct !== undefined && (
                  <div className={`rounded-lg p-3 col-span-2 ${kpis.foodCostPct > 0.3 ? 'bg-amber-50' : 'bg-gray-50'}`}>
                    <p className={`text-xs ${kpis.foodCostPct > 0.3 ? 'text-amber-600' : 'text-gray-500'}`}>
                      Food Cost %
                    </p>
                    <p className={`text-xl font-semibold ${kpis.foodCostPct > 0.3 ? 'text-amber-700' : 'text-gray-900'}`}>
                      {(kpis.foodCostPct * 100).toFixed(1)}%
                      {kpis.foodCostPct > 0.3 && (
                        <span className="text-sm font-normal ml-2">Above 30% target</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Recommendation */}
          {item.suggestedChangeText && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-600 font-medium">Suggested Action</p>
              <p className="text-sm text-blue-800 font-semibold">{item.suggestedChangeText}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
