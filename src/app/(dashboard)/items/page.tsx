"use client";

import { useEffect, useState, useMemo, Fragment } from "react";
import Link from "next/link";
import { Save, Upload, Anchor, X, AlertTriangle, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ItemWithCost {
  id: string;
  name: string;
  category: string | null;
  isAnchor: boolean;
  unitFoodCost: number | null;
}

export default function ItemsPage() {
  const [items, setItems] = useState<ItemWithCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editedCosts, setEditedCosts] = useState<Record<string, string>>({});
  const [editedAnchors, setEditedAnchors] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    try {
      const res = await fetch("/api/items");
      if (!res.ok) throw new Error("Failed to fetch items");
      const data = await res.json();
      setItems(data.items);

      // Initialize edited values
      const costs: Record<string, string> = {};
      const anchors: Record<string, boolean> = {};
      for (const item of data.items) {
        costs[item.id] = item.unitFoodCost?.toString() || "";
        anchors[item.id] = item.isAnchor;
      }
      setEditedCosts(costs);
      setEditedAnchors(anchors);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load items");
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updates = items.map((item) => ({
        id: item.id,
        unitFoodCost: parseFloat(editedCosts[item.id]) || null,
        isAnchor: editedAnchors[item.id],
      }));

      const res = await fetch("/api/items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: updates }),
      });

      if (!res.ok) throw new Error("Failed to save changes");

      setSuccess("Changes saved successfully");
      fetchItems();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Calculate missing costs stats
  const missingCostsCount = useMemo(() => {
    return items.filter((item) => !editedCosts[item.id] || editedCosts[item.id] === "").length;
  }, [items, editedCosts]);

  const missingCostsPct = items.length > 0 ? (missingCostsCount / items.length) * 100 : 0;

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  // Group by category
  const groupedItems = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => {
        const cat = item.category || "Uncategorized";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
      },
      {} as Record<string, ItemWithCost[]>
    );
  }, [filteredItems]);

  const sortedCategories = Object.keys(groupedItems).sort();

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    return items.some((item) => {
      const originalCost = item.unitFoodCost?.toString() || "";
      const editedCost = editedCosts[item.id] || "";
      const originalAnchor = item.isAnchor;
      const editedAnchor = editedAnchors[item.id];
      return originalCost !== editedCost || originalAnchor !== editedAnchor;
    });
  }, [items, editedCosts, editedAnchors]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Item Costs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage food costs and anchor items for better recommendations
          </p>
        </div>
        <Button onClick={handleSave} loading={saving} disabled={!hasChanges}>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Card variant="danger" className="mb-4 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </Card>
      )}

      {success && (
        <Card variant="success" className="mb-4 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              <p className="text-sm text-emerald-700">{success}</p>
            </div>
            <button onClick={() => setSuccess(null)} className="text-emerald-500 hover:text-emerald-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </Card>
      )}

      {/* Missing Costs Warning */}
      {missingCostsPct > 10 && (
        <Card className="mb-4 p-4 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                {missingCostsCount} of {items.length} items ({missingCostsPct.toFixed(0)}%) are
                missing costs
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Items without costs use a 30% estimate, which may affect recommendation accuracy.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Search */}
      <div className="mb-4">
        <SearchInput
          placeholder="Search by name or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{items.length}</p>
          <p className="text-xs text-gray-500">Total Items</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">
            {items.length - missingCostsCount}
          </p>
          <p className="text-xs text-gray-500">With Costs</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {items.filter((i) => editedAnchors[i.id]).length}
          </p>
          <p className="text-xs text-gray-500">Anchor Items</p>
        </Card>
      </div>

      {/* Items Table */}
      {items.length === 0 ? (
        <Card className="p-8 text-center">
          <Upload className="mx-auto h-10 w-10 text-gray-400" />
          <h3 className="mt-4 text-base font-medium text-gray-900">No items yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Upload a weekly performance file to create items.
          </p>
          <Link href="/uploads/new" className="mt-4 inline-block">
            <Button variant="secondary" size="sm">
              Upload Data
            </Button>
          </Link>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No items match "{searchQuery}"</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
                    Unit Cost ($)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Anchor
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedCategories.map((category) => (
                  <Fragment key={category}>
                    <tr className="bg-gray-50">
                      <td colSpan={3} className="px-4 py-2">
                        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                          {category}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
                          ({groupedItems[category].length})
                        </span>
                      </td>
                    </tr>
                    {groupedItems[category].map((item) => {
                      const hasCost = editedCosts[item.id] && editedCosts[item.id] !== "";
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-900">{item.name}</span>
                              {!hasCost && (
                                <Badge variant="warning" className="text-[10px]">
                                  No cost
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center">
                              <span className="text-gray-400 mr-1 text-sm">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editedCosts[item.id] || ""}
                                onChange={(e) =>
                                  setEditedCosts({
                                    ...editedCosts,
                                    [item.id]: e.target.value,
                                  })
                                }
                                className="w-20 px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                placeholder="0.00"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              onClick={() =>
                                setEditedAnchors({
                                  ...editedAnchors,
                                  [item.id]: !editedAnchors[item.id],
                                })
                              }
                              className={`p-1.5 rounded-lg transition-colors ${
                                editedAnchors[item.id]
                                  ? "text-blue-600 bg-blue-100 hover:bg-blue-200"
                                  : "text-gray-300 hover:text-gray-400 hover:bg-gray-100"
                              }`}
                              title={
                                editedAnchors[item.id]
                                  ? "Anchor item (will never recommend removal)"
                                  : "Not an anchor (may recommend removal if low-performing)"
                              }
                            >
                              <Anchor className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Help Text */}
      <Card className="mt-6 p-4 bg-gray-50">
        <h3 className="text-sm font-medium text-gray-900 mb-2">About anchor items</h3>
        <p className="text-xs text-gray-600">
          Anchor items are menu staples that define your restaurant's concept. Even if they
          underperform on metrics, Menu Autopilot will recommend keeping them rather than removing.
          Examples: signature dishes, customer favorites, items that drive traffic.
        </p>
      </Card>
    </div>
  );
}
