"use client";

import { useEffect, useState } from "react";
import { Save, Upload, Anchor, X } from "lucide-react";

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
  const [filter, setFilter] = useState("");

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(filter.toLowerCase()) ||
      item.category?.toLowerCase().includes(filter.toLowerCase())
  );

  // Group by category
  const groupedItems = filteredItems.reduce(
    (acc, item) => {
      const cat = item.category || "Uncategorized";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    },
    {} as Record<string, ItemWithCost[]>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Item Costs</h1>
          <p className="text-sm text-gray-500">
            Manage food costs and anchor items for your menu
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4 flex items-center justify-between">
          <p className="text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-red-500">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4 flex items-center justify-between">
          <p className="text-green-700">{success}</p>
          <button onClick={() => setSuccess(null)} className="text-green-500">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Filter by name or category..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="block w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No items yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Upload a weekly performance file to create items.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Food Cost ($)
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Anchor
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Object.entries(groupedItems).map(([category, categoryItems]) => (
                <>
                  <tr key={category} className="bg-gray-100">
                    <td
                      colSpan={4}
                      className="px-4 py-2 text-sm font-medium text-gray-700"
                    >
                      {category} ({categoryItems.length})
                    </td>
                  </tr>
                  {categoryItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {item.category || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <span className="text-gray-500 mr-1">$</span>
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
                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="0.00"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() =>
                            setEditedAnchors({
                              ...editedAnchors,
                              [item.id]: !editedAnchors[item.id],
                            })
                          }
                          className={`p-1 rounded ${
                            editedAnchors[item.id]
                              ? "text-blue-600 bg-blue-100"
                              : "text-gray-400 hover:text-gray-500"
                          }`}
                          title={
                            editedAnchors[item.id]
                              ? "Remove anchor (will recommend removal if low-performing)"
                              : "Mark as anchor (will never recommend removal)"
                          }
                        >
                          <Anchor className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 p-4 bg-gray-50 rounded-md">
        <h3 className="text-sm font-medium text-gray-700">About Anchor Items</h3>
        <p className="text-sm text-gray-500 mt-1">
          Anchor items are menu staples that define your concept. Even if they underperform,
          Menu Autopilot will recommend keeping them rather than removing.
        </p>
      </div>
    </div>
  );
}
