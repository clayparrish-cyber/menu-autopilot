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
    <div
      className="rounded-xl p-6"
      style={{
        background: 'var(--tip-bg-elevated)',
        border: '1px solid var(--tip-border)',
      }}
    >
      <h2
        className="text-lg font-semibold mb-4"
        style={{ color: 'var(--tip-text-primary)' }}
      >
        Tip Settings
      </h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium" style={{ color: 'var(--tip-text-primary)' }}>
              Cash Tips
            </div>
            <div className="text-sm" style={{ color: 'var(--tip-text-muted)' }}>
              Enable if your team collects cash tips in addition to credit card tips
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleCash}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
              saving ? "opacity-50" : ""
            }`}
            style={{
              background: settings.usesCashTips ? 'var(--tip-accent)' : 'var(--tip-bg-surface)',
            }}
            role="switch"
            aria-checked={settings.usesCashTips}
          >
            <span
              className="pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out"
              style={{
                background: settings.usesCashTips ? 'var(--tip-bg-deep)' : 'var(--tip-text-muted)',
                transform: settings.usesCashTips ? 'translateX(20px)' : 'translateX(0)',
              }}
            />
          </button>
        </div>
        {saved && (
          <div className="text-sm" style={{ color: 'var(--tip-success)' }}>
            Settings saved!
          </div>
        )}
        {!settings.usesCashTips && (
          <div
            className="p-3 rounded-lg text-sm"
            style={{
              background: 'rgba(94, 177, 239, 0.1)',
              border: '1px solid rgba(94, 177, 239, 0.2)',
              color: 'var(--tip-info)',
            }}
          >
            Cash tip fields will be hidden throughout the app. You can enable this anytime if needed.
          </div>
        )}
      </div>
    </div>
  );
}
