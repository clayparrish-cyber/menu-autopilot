"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Location {
  id: string;
  name: string;
  address: string | null;
  timezone: string;
  staff: Array<{ id: string; name: string; roleType: string }>;
  _count: { shifts: number };
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const res = await fetch("/tips/api/locations");
      const data = await res.json();
      if (res.ok) {
        setLocations(data.locations);
      }
    } catch (err) {
      console.error("Failed to fetch locations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/tips/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create location");
        return;
      }

      setLocations([...locations, { ...data.location, staff: [], _count: { shifts: 0 } }]);
      setFormData({ name: "", address: "" });
      setShowAddForm(false);
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div style={{ color: 'var(--tip-text-muted)' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm mb-1" style={{ color: 'var(--tip-text-muted)' }}>
            <Link href="/tips/admin" style={{ color: 'var(--tip-text-secondary)' }}>Settings</Link>
            <span>/</span>
            <span>Locations</span>
          </div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--tip-text-primary)' }}
          >
            Locations
          </h1>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="tip-btn-primary px-4 py-2 rounded-lg font-medium"
        >
          + Add Location
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
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
            Add Location
          </h2>
          {error && (
            <div
              className="mb-4 p-3 rounded-lg text-sm"
              style={{
                background: 'rgba(239, 100, 97, 0.1)',
                border: '1px solid rgba(239, 100, 97, 0.3)',
                color: 'var(--tip-error)',
              }}
            >
              {error}
            </div>
          )}
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--tip-text-secondary)' }}
              >
                Location Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Downtown Location"
                className="tip-input w-full px-3 py-2"
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--tip-text-secondary)' }}
              >
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main St, City, State"
                className="tip-input w-full px-3 py-2"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="tip-btn-primary px-4 py-2 rounded-lg font-medium disabled:opacity-50"
              >
                {saving ? "Adding..." : "Add Location"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setError("");
                }}
                className="tip-btn-secondary px-4 py-2 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Locations list */}
      {locations.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{
            background: 'var(--tip-bg-elevated)',
            border: '1px solid var(--tip-border)',
          }}
        >
          <div className="text-4xl mb-3">[]</div>
          <h2
            className="text-lg font-semibold mb-1"
            style={{ color: 'var(--tip-text-primary)' }}
          >
            No locations yet
          </h2>
          <p className="mb-4" style={{ color: 'var(--tip-text-muted)' }}>
            Add your first location to get started
          </p>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="tip-btn-primary px-4 py-2 rounded-lg font-medium"
            >
              + Add Location
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {locations.map((location) => (
            <div
              key={location.id}
              className="rounded-xl p-6"
              style={{
                background: 'var(--tip-bg-elevated)',
                border: '1px solid var(--tip-border)',
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: 'var(--tip-text-primary)' }}
                  >
                    {location.name}
                  </h2>
                  {location.address && (
                    <p className="text-sm mt-1" style={{ color: 'var(--tip-text-muted)' }}>
                      {location.address}
                    </p>
                  )}
                </div>
                <Link
                  href={`/tips/admin/staff?locationId=${location.id}`}
                  className="text-sm font-medium"
                  style={{ color: 'var(--tip-accent)' }}
                >
                  Manage Staff
                </Link>
              </div>
              <div
                className="flex gap-6 mt-4 text-sm font-mono"
                style={{ color: 'var(--tip-text-secondary)' }}
              >
                <div>
                  <span style={{ color: 'var(--tip-text-muted)' }}>Staff:</span>{" "}
                  <span>{location.staff.length}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--tip-text-muted)' }}>Shifts:</span>{" "}
                  <span>{location._count.shifts}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--tip-text-muted)' }}>TZ:</span>{" "}
                  <span>{location.timezone}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
