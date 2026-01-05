"use client";

import { useState, useMemo } from "react";
import { QUADRANT_DESCRIPTIONS } from "./badge";

export interface MenuMatrixItem {
  itemName: string;
  category?: string;
  qtySold: number;
  avgPrice: number;
  unitMargin?: number;
  quadrant: "STAR" | "PLOWHORSE" | "PUZZLE" | "DOG";
}

interface MenuMatrixChartProps {
  items: MenuMatrixItem[];
}

const QUADRANT_COLORS = {
  STAR: { bg: "rgba(16, 185, 129, 0.15)", dot: "#10b981", border: "#059669" },
  PLOWHORSE: { bg: "rgba(59, 130, 246, 0.15)", dot: "#3b82f6", border: "#2563eb" },
  PUZZLE: { bg: "rgba(245, 158, 11, 0.15)", dot: "#f59e0b", border: "#d97706" },
  DOG: { bg: "rgba(239, 68, 68, 0.15)", dot: "#ef4444", border: "#dc2626" },
};

const QUADRANT_LABELS = {
  STAR: { emoji: "⭐", name: "Stars" },
  PLOWHORSE: { emoji: "🐴", name: "Plowhorses" },
  PUZZLE: { emoji: "🧩", name: "Puzzles" },
  DOG: { emoji: "🐕", name: "Dogs" },
};

export function MenuMatrixChart({ items }: MenuMatrixChartProps) {
  const [hoveredItem, setHoveredItem] = useState<MenuMatrixItem | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Chart dimensions
  const width = 500;
  const height = 400;
  const padding = { top: 40, right: 40, bottom: 50, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate scales with dynamic zoom to fit data
  const { xScale, yScale, minQty, maxQty, minMargin, maxMargin } = useMemo(() => {
    const quantities = items.map((i) => i.qtySold);
    const margins = items.map((i) => {
      if (i.unitMargin !== undefined && i.avgPrice > 0) {
        return (i.unitMargin / i.avgPrice) * 100;
      }
      return 0;
    });

    // Calculate actual data bounds
    const dataMinQ = Math.min(...quantities);
    const dataMaxQ = Math.max(...quantities, 1);
    const dataMinM = Math.min(...margins);
    const dataMaxM = Math.max(...margins, 50);

    // Add 10% padding on each side for breathing room
    const qtyRange = dataMaxQ - dataMinQ || dataMaxQ * 0.5;
    const marginRange = dataMaxM - dataMinM || 20;

    const minQ = Math.max(0, dataMinQ - qtyRange * 0.1);
    const maxQ = dataMaxQ + qtyRange * 0.1;
    const minM = Math.max(0, dataMinM - marginRange * 0.1);
    const maxM = Math.min(100, dataMaxM + marginRange * 0.1);

    // Scale functions that map data values to pixel positions
    const xScaleFn = (qty: number) => ((qty - minQ) / (maxQ - minQ)) * chartWidth;
    const yScaleFn = (margin: number) => chartHeight - ((margin - minM) / (maxM - minM)) * chartHeight;

    return {
      xScale: xScaleFn,
      yScale: yScaleFn,
      minQty: minQ,
      maxQty: maxQ,
      minMargin: minM,
      maxMargin: maxM,
    };
  }, [items, chartWidth, chartHeight]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div className="relative">
      <svg
        width={width}
        height={height}
        className="w-full h-auto"
        viewBox={`0 0 ${width} ${height}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredItem(null)}
      >
        {/* Chart area */}
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Light background */}
          <rect
            x={0}
            y={0}
            width={chartWidth}
            height={chartHeight}
            fill="#f9fafb"
            rx={4}
          />

          {/* Grid lines for reference */}
          <line
            x1={chartWidth / 2}
            y1={0}
            x2={chartWidth / 2}
            y2={chartHeight}
            stroke="#e5e7eb"
            strokeWidth={1}
          />
          <line
            x1={0}
            y1={chartHeight / 2}
            x2={chartWidth}
            y2={chartHeight / 2}
            stroke="#e5e7eb"
            strokeWidth={1}
          />

          {/* Data points */}
          {items.map((item, i) => {
            const marginPct =
              item.unitMargin !== undefined && item.avgPrice > 0
                ? (item.unitMargin / item.avgPrice) * 100
                : 0;
            const cx = xScale(item.qtySold);
            const cy = yScale(marginPct);
            const color = QUADRANT_COLORS[item.quadrant];
            const isHovered = hoveredItem?.itemName === item.itemName;

            return (
              <circle
                key={`${item.itemName}-${i}`}
                cx={cx}
                cy={cy}
                r={isHovered ? 8 : 6}
                fill={color.dot}
                stroke={isHovered ? color.border : "white"}
                strokeWidth={isHovered ? 3 : 2}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHoveredItem(item)}
              />
            );
          })}
        </g>

        {/* Axes */}
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* X axis */}
          <line x1={0} y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#d1d5db" strokeWidth={1} />
          {/* Y axis */}
          <line x1={0} y1={0} x2={0} y2={chartHeight} stroke="#d1d5db" strokeWidth={1} />
        </g>

        {/* Axis labels */}
        <text
          x={padding.left + chartWidth / 2}
          y={height - 10}
          textAnchor="middle"
          className="fill-gray-600 text-xs"
        >
          Quantity Sold →
        </text>
        <text
          x={15}
          y={padding.top + chartHeight / 2}
          textAnchor="middle"
          transform={`rotate(-90, 15, ${padding.top + chartHeight / 2})`}
          className="fill-gray-600 text-xs"
        >
          Margin % →
        </text>

        {/* Axis tick labels */}
        <text x={padding.left} y={height - 30} textAnchor="start" className="fill-gray-500 text-[10px]">
          {Math.round(minQty)}
        </text>
        <text x={padding.left + chartWidth} y={height - 30} textAnchor="end" className="fill-gray-500 text-[10px]">
          {Math.round(maxQty)}
        </text>
        <text x={padding.left - 8} y={padding.top + chartHeight} textAnchor="end" className="fill-gray-500 text-[10px]">
          {Math.round(minMargin)}%
        </text>
        <text x={padding.left - 8} y={padding.top + 4} textAnchor="end" className="fill-gray-500 text-[10px]">
          {Math.round(maxMargin)}%
        </text>
      </svg>

      {/* Hover tooltip */}
      {hoveredItem && (
        <div
          className="absolute z-10 bg-white rounded-lg shadow-lg border border-gray-200 p-3 pointer-events-none"
          style={{
            left: Math.min(mousePos.x + 10, width - 180),
            top: Math.max(mousePos.y - 80, 10),
            maxWidth: 200,
          }}
        >
          <p className="font-medium text-gray-900 text-sm truncate">{hoveredItem.itemName}</p>
          {hoveredItem.category && (
            <p className="text-xs text-gray-500">{hoveredItem.category}</p>
          )}
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Qty Sold:</span>
              <span className="font-medium">{hoveredItem.qtySold}/week</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Revenue:</span>
              <span className="font-medium">${(hoveredItem.qtySold * hoveredItem.avgPrice).toFixed(0)}</span>
            </div>
            {hoveredItem.unitMargin !== undefined && hoveredItem.avgPrice > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Margin:</span>
                <span className={`font-medium ${
                  (hoveredItem.unitMargin / hoveredItem.avgPrice) >= 0.7
                    ? "text-emerald-600"
                    : (hoveredItem.unitMargin / hoveredItem.avgPrice) >= 0.6
                    ? "text-amber-600"
                    : "text-red-600"
                }`}>
                  {((hoveredItem.unitMargin / hoveredItem.avgPrice) * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100">
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium ${
                hoveredItem.quadrant === "STAR"
                  ? "text-emerald-700"
                  : hoveredItem.quadrant === "PLOWHORSE"
                  ? "text-blue-700"
                  : hoveredItem.quadrant === "PUZZLE"
                  ? "text-amber-700"
                  : "text-red-700"
              }`}
            >
              {QUADRANT_LABELS[hoveredItem.quadrant].emoji} {QUADRANT_LABELS[hoveredItem.quadrant].name}
            </span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-3 text-xs">
        {(["STAR", "PLOWHORSE", "PUZZLE", "DOG"] as const).map((q) => (
          <div key={q} className="flex items-center gap-1.5 group relative">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: QUADRANT_COLORS[q].dot }}
            />
            <span className="text-gray-600">
              {QUADRANT_LABELS[q].name} ({items.filter((i) => i.quadrant === q).length})
            </span>
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {QUADRANT_DESCRIPTIONS[q]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
