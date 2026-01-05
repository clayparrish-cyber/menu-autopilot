"use client";

import { useEffect, useState } from "react";
import { Save, X } from "lucide-react";

interface Settings {
  targetFoodCostPct: number;
  minQtyThreshold: number;
  popularityThreshold: number;
  marginThreshold: number;
  allowPremiumPricing: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    targetFoodCostPct: 30,
    minQtyThreshold: 10,
    popularityThreshold: 60,
    marginThreshold: 60,
    allowPremiumPricing: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error("Failed to save settings");

      setSuccess("Settings saved successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">
            Configure your menu engineering thresholds and preferences
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

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Target Food Cost */}
        <div>
          <label
            htmlFor="targetFoodCostPct"
            className="block text-sm font-medium text-gray-700"
          >
            Target Food Cost %
          </label>
          <p className="text-xs text-gray-500 mb-2">
            The ideal food cost percentage for your concept (typically 28-32%)
          </p>
          <div className="flex items-center">
            <input
              id="targetFoodCostPct"
              type="number"
              min="1"
              max="100"
              value={settings.targetFoodCostPct}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  targetFoodCostPct: parseInt(e.target.value) || 30,
                })
              }
              className="block w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="ml-2 text-gray-500">%</span>
          </div>
        </div>

        {/* Min Quantity Threshold */}
        <div>
          <label
            htmlFor="minQtyThreshold"
            className="block text-sm font-medium text-gray-700"
          >
            Minimum Quantity for Medium Confidence
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Items below this threshold will be marked as Low Confidence. Items at 2x
            this value are High Confidence.
          </p>
          <input
            id="minQtyThreshold"
            type="number"
            min="1"
            value={settings.minQtyThreshold}
            onChange={(e) =>
              setSettings({
                ...settings,
                minQtyThreshold: parseInt(e.target.value) || 10,
              })
            }
            className="block w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Popularity Threshold */}
        <div>
          <label
            htmlFor="popularityThreshold"
            className="block text-sm font-medium text-gray-700"
          >
            Popularity Threshold Percentile
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Items above this percentile in quantity sold are considered &quot;high
            popularity&quot;
          </p>
          <div className="flex items-center">
            <input
              id="popularityThreshold"
              type="range"
              min="40"
              max="80"
              value={settings.popularityThreshold}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  popularityThreshold: parseInt(e.target.value),
                })
              }
              className="w-48"
            />
            <span className="ml-4 text-sm font-medium text-gray-700">
              {settings.popularityThreshold}th percentile
            </span>
          </div>
        </div>

        {/* Margin Threshold */}
        <div>
          <label
            htmlFor="marginThreshold"
            className="block text-sm font-medium text-gray-700"
          >
            Margin Threshold Percentile
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Items above this percentile in unit margin are considered &quot;high
            margin&quot;
          </p>
          <div className="flex items-center">
            <input
              id="marginThreshold"
              type="range"
              min="40"
              max="80"
              value={settings.marginThreshold}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  marginThreshold: parseInt(e.target.value),
                })
              }
              className="w-48"
            />
            <span className="ml-4 text-sm font-medium text-gray-700">
              {settings.marginThreshold}th percentile
            </span>
          </div>
        </div>

        {/* Allow Premium Pricing */}
        <div>
          <div className="flex items-center">
            <input
              id="allowPremiumPricing"
              type="checkbox"
              checked={settings.allowPremiumPricing}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  allowPremiumPricing: e.target.checked,
                })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="allowPremiumPricing"
              className="ml-2 block text-sm font-medium text-gray-700"
            >
              Allow Premium Pricing Suggestions
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            When enabled, price suggestions can exceed the category 85th percentile
          </p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-md">
        <h3 className="text-sm font-medium text-gray-700">About These Settings</h3>
        <p className="text-sm text-gray-500 mt-1">
          The popularity and margin thresholds determine how items are classified into
          the menu engineering matrix (Stars, Plowhorses, Puzzles, Dogs). Adjusting
          these values will affect how many items fall into each category.
        </p>
      </div>
    </div>
  );
}
