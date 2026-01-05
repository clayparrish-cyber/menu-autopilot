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
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/tips/admin" className="hover:text-gray-700">Settings</Link>
            <span>/</span>
            <span>Locations</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          + Add Location
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Location</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Downtown Location"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main St, City, State"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
              >
                {saving ? "Adding..." : "Add Location"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setError("");
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Locations list */}
      {locations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-3">🏪</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">No locations yet</h2>
          <p className="text-gray-600 mb-4">Add your first location to get started</p>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
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
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{location.name}</h2>
                  {location.address && (
                    <p className="text-gray-600 text-sm mt-1">{location.address}</p>
                  )}
                </div>
                <Link
                  href={`/tips/admin/staff?locationId=${location.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Manage Staff
                </Link>
              </div>
              <div className="flex gap-6 mt-4 text-sm">
                <div>
                  <span className="text-gray-500">Staff:</span>{" "}
                  <span className="font-medium">{location.staff.length}</span>
                </div>
                <div>
                  <span className="text-gray-500">Shifts:</span>{" "}
                  <span className="font-medium">{location._count.shifts}</span>
                </div>
                <div>
                  <span className="text-gray-500">Timezone:</span>{" "}
                  <span className="font-medium">{location.timezone}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
