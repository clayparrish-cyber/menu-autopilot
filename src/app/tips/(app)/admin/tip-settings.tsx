"use client";

import { useState } from "react";
import { useOrgSettings } from "../org-context";

export function TipSettings() {
  const { settings, updateSettings } = useOrgSettings();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleToggleCash = async () => {
    const newValue = !settings.usesCashTips;
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch("/tips/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usesCashTips: newValue }),
      });

      if (res.ok) {
        updateSettings({ usesCashTips: newValue });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error("Failed to update settings:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Tip Settings</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-900">Cash Tips</div>
            <div className="text-sm text-gray-500">
              Enable if your team collects cash tips in addition to credit card tips
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleCash}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              settings.usesCashTips ? "bg-blue-600" : "bg-gray-200"
            } ${saving ? "opacity-50" : ""}`}
            role="switch"
            aria-checked={settings.usesCashTips}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.usesCashTips ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        {saved && (
          <div className="text-sm text-green-600">Settings saved!</div>
        )}
        {!settings.usesCashTips && (
          <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            Cash tip fields will be hidden throughout the app. You can enable this anytime if needed.
          </div>
        )}
      </div>
    </div>
  );
}
