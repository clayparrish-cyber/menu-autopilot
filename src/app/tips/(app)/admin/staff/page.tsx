"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { X, Check } from "lucide-react";

interface Location {
  id: string;
  name: string;
}

interface Staff {
  id: string;
  name: string;
  roleType: string;
  isActive: boolean;
  location: { id: string; name: string };
  allLocations?: { id: string; name: string }[];
  user: { id: string; email: string } | null;
}

const ROLE_TYPES = [
  { value: "SERVER", label: "Server" },
  { value: "BARTENDER", label: "Bartender" },
  { value: "BUSSER", label: "Busser" },
  { value: "RUNNER", label: "Runner" },
  { value: "HOST", label: "Host" },
  { value: "BARBACK", label: "Barback" },
  { value: "EXPEDITOR", label: "Expeditor" },
  { value: "KITCHEN", label: "Kitchen (BOH)" },
  { value: "MANAGER_FOH", label: "Manager (FOH)" },
  { value: "OTHER", label: "Other" },
];

export default function StaffPage() {
  const searchParams = useSearchParams();
  const filterLocationId = searchParams.get("locationId");

  const [staff, setStaff] = useState<Staff[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    locationIds: [] as string[],
    roleType: "SERVER",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLocations, setEditingLocations] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [filterLocationId]);

  const fetchData = async () => {
    try {
      const [staffRes, locationsRes] = await Promise.all([
        fetch(`/tips/api/staff${filterLocationId ? `?locationId=${filterLocationId}` : ""}`),
        fetch("/tips/api/locations"),
      ]);

      const staffData = await staffRes.json();
      const locationsData = await locationsRes.json();

      if (staffRes.ok) setStaff(staffData.staff);
      if (locationsRes.ok) setLocations(locationsData.locations);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.locationIds.length === 0) {
      setError("Please select at least one location");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/tips/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          locationId: formData.locationIds[0], // Primary location
          locationIds: formData.locationIds,   // All locations
          roleType: formData.roleType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to add staff");
        return;
      }

      setStaff([...staff, data.staff]);
      setFormData({ name: "", locationIds: [], roleType: "SERVER" });
      setShowAddForm(false);
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Staff> & { locationIds?: string[] }) => {
    try {
      const res = await fetch(`/tips/api/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const data = await res.json();
        setStaff(staff.map((s) => (s.id === id ? data.staff : s)));
        setEditingId(null);
        setEditingLocations(null);
      }
    } catch (err) {
      console.error("Failed to update staff:", err);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this staff member?")) return;

    try {
      const res = await fetch(`/tips/api/staff/${id}`, { method: "DELETE" });
      if (res.ok) {
        setStaff(staff.map((s) => (s.id === id ? { ...s, isActive: false } : s)));
      }
    } catch (err) {
      console.error("Failed to deactivate staff:", err);
    }
  };

  const toggleLocation = (locationId: string) => {
    setFormData((prev) => ({
      ...prev,
      locationIds: prev.locationIds.includes(locationId)
        ? prev.locationIds.filter((id) => id !== locationId)
        : [...prev.locationIds, locationId],
    }));
  };

  const activeStaff = staff.filter((s) => s.isActive);
  const inactiveStaff = staff.filter((s) => !s.isActive);

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
            <span>Staff</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          + Add Staff
        </button>
      </div>

      {/* Location filter */}
      {locations.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Filter by location:</span>
          <select
            value={filterLocationId || ""}
            onChange={(e) => {
              const url = e.target.value
                ? `/tips/admin/staff?locationId=${e.target.value}`
                : "/tips/admin/staff";
              window.location.href = url;
            }}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Staff Member</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          {locations.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-3">You need to create a location first</p>
              <Link
                href="/tips/admin/locations"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Add Location
              </Link>
            </div>
          ) : (
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., John Smith"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={formData.roleType}
                    onChange={(e) => setFormData({ ...formData, roleType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    {ROLE_TYPES.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multi-location selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Locations * <span className="text-gray-400 font-normal">(select all that apply)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {locations.map((loc) => {
                    const isSelected = formData.locationIds.includes(loc.id);
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => toggleLocation(loc.id)}
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 mr-1.5" />}
                        {loc.name}
                      </button>
                    );
                  })}
                </div>
                {formData.locationIds.length > 1 && (
                  <p className="mt-2 text-xs text-gray-500">
                    {formData.locationIds.length} locations selected - staff will appear in shifts at all selected locations
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
                >
                  {saving ? "Adding..." : "Add Staff"}
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
          )}
        </div>
      )}

      {/* Staff list */}
      {activeStaff.length === 0 && inactiveStaff.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-3">👥</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">No staff yet</h2>
          <p className="text-gray-600 mb-4">Add your team members to start tracking tips</p>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              + Add Staff
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Active staff table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Active Staff ({activeStaff.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-left text-sm text-gray-600">
                  <tr>
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Role</th>
                    <th className="px-6 py-3 font-medium">Locations</th>
                    <th className="px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activeStaff.map((person) => {
                    const staffLocations = person.allLocations || [person.location];
                    const isEditingLocs = editingLocations === person.id;

                    return (
                      <tr key={person.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          {editingId === person.id ? (
                            <input
                              type="text"
                              defaultValue={person.name}
                              onBlur={(e) => handleUpdate(person.id, { name: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleUpdate(person.id, { name: e.currentTarget.value });
                                }
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              className="px-2 py-1 border border-gray-300 rounded"
                              autoFocus
                            />
                          ) : (
                            <span className="font-medium text-gray-900">{person.name}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={person.roleType}
                            onChange={(e) => handleUpdate(person.id, { roleType: e.target.value as Staff["roleType"] })}
                            className="px-2 py-1 border border-gray-200 rounded text-sm bg-transparent"
                          >
                            {ROLE_TYPES.map((role) => (
                              <option key={role.value} value={role.value}>{role.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          {isEditingLocs ? (
                            <LocationEditor
                              locations={locations}
                              selectedIds={staffLocations.map((l) => l.id)}
                              onSave={(ids) => {
                                handleUpdate(person.id, { locationIds: ids });
                              }}
                              onCancel={() => setEditingLocations(null)}
                            />
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {staffLocations.map((loc) => (
                                <span
                                  key={loc.id}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
                                >
                                  {loc.name}
                                </span>
                              ))}
                              {locations.length > 1 && (
                                <button
                                  onClick={() => setEditingLocations(person.id)}
                                  className="text-xs text-blue-600 hover:text-blue-700 ml-1"
                                >
                                  edit
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingId(person.id)}
                              className="text-sm text-blue-600 hover:text-blue-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeactivate(person.id)}
                              className="text-sm text-red-600 hover:text-red-700"
                            >
                              Deactivate
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Inactive staff */}
          {inactiveStaff.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-500">Inactive Staff ({inactiveStaff.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <tbody className="divide-y divide-gray-200">
                    {inactiveStaff.map((person) => {
                      const staffLocations = person.allLocations || [person.location];
                      return (
                        <tr key={person.id} className="bg-gray-50 text-gray-500">
                          <td className="px-6 py-4">{person.name}</td>
                          <td className="px-6 py-4">{ROLE_TYPES.find((r) => r.value === person.roleType)?.label}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {staffLocations.map((loc) => (
                                <span key={loc.id} className="text-xs">{loc.name}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleUpdate(person.id, { isActive: true })}
                              className="text-sm text-blue-600 hover:text-blue-700"
                            >
                              Reactivate
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Inline location editor component
function LocationEditor({
  locations,
  selectedIds,
  onSave,
  onCancel,
}: {
  locations: Location[];
  selectedIds: string[];
  onSave: (ids: string[]) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(selectedIds);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {locations.map((loc) => {
        const isSelected = selected.includes(loc.id);
        return (
          <button
            key={loc.id}
            type="button"
            onClick={() => toggle(loc.id)}
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
              isSelected
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {isSelected && <Check className="w-3 h-3 mr-1" />}
            {loc.name}
          </button>
        );
      })}
      <div className="flex gap-1 ml-2">
        <button
          onClick={() => selected.length > 0 && onSave(selected)}
          disabled={selected.length === 0}
          className="p-1 text-green-600 hover:text-green-700 disabled:text-gray-300"
          title="Save"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={onCancel}
          className="p-1 text-gray-400 hover:text-gray-600"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
