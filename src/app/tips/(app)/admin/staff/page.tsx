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
          locationId: formData.locationIds[0],
          locationIds: formData.locationIds,
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
            <span>Staff</span>
          </div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--tip-text-primary)' }}
          >
            Staff
          </h1>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="tip-btn-primary px-4 py-2 rounded-lg font-medium"
        >
          + Add Staff
        </button>
      </div>

      {/* Location filter */}
      {locations.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: 'var(--tip-text-muted)' }}>Filter:</span>
          <select
            value={filterLocationId || ""}
            onChange={(e) => {
              const url = e.target.value
                ? `/tips/admin/staff?locationId=${e.target.value}`
                : "/tips/admin/staff";
              window.location.href = url;
            }}
            className="tip-input px-3 py-1.5 text-sm rounded-lg"
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
            Add Staff Member
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
          {locations.length === 0 ? (
            <div className="text-center py-4">
              <p style={{ color: 'var(--tip-text-muted)' }} className="mb-3">
                You need to create a location first
              </p>
              <Link
                href="/tips/admin/locations"
                className="font-medium"
                style={{ color: 'var(--tip-accent)' }}
              >
                Add Location
              </Link>
            </div>
          ) : (
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: 'var(--tip-text-secondary)' }}
                  >
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., John Smith"
                    className="tip-input w-full px-3 py-2"
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: 'var(--tip-text-secondary)' }}
                  >
                    Role
                  </label>
                  <select
                    value={formData.roleType}
                    onChange={(e) => setFormData({ ...formData, roleType: e.target.value })}
                    className="tip-input w-full px-3 py-2"
                  >
                    {ROLE_TYPES.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multi-location selector */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--tip-text-secondary)' }}
                >
                  Locations * <span style={{ color: 'var(--tip-text-muted)' }}>(select all that apply)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {locations.map((loc) => {
                    const isSelected = formData.locationIds.includes(loc.id);
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => toggleLocation(loc.id)}
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                        style={{
                          background: isSelected ? 'var(--tip-accent)' : 'var(--tip-bg-surface)',
                          color: isSelected ? 'var(--tip-bg-deep)' : 'var(--tip-text-secondary)',
                        }}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 mr-1.5" />}
                        {loc.name}
                      </button>
                    );
                  })}
                </div>
                {formData.locationIds.length > 1 && (
                  <p className="mt-2 text-xs" style={{ color: 'var(--tip-text-muted)' }}>
                    {formData.locationIds.length} locations selected
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="tip-btn-primary px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  {saving ? "Adding..." : "Add Staff"}
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
          )}
        </div>
      )}

      {/* Staff list */}
      {activeStaff.length === 0 && inactiveStaff.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{
            background: 'var(--tip-bg-elevated)',
            border: '1px solid var(--tip-border)',
          }}
        >
          <div className="text-4xl mb-3 font-mono">{"{}"}</div>
          <h2
            className="text-lg font-semibold mb-1"
            style={{ color: 'var(--tip-text-primary)' }}
          >
            No staff yet
          </h2>
          <p className="mb-4" style={{ color: 'var(--tip-text-muted)' }}>
            Add your team members to start tracking tips
          </p>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="tip-btn-primary px-4 py-2 rounded-lg font-medium"
            >
              + Add Staff
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Active staff table */}
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: 'var(--tip-bg-elevated)',
              border: '1px solid var(--tip-border)',
            }}
          >
            <div
              className="px-6 py-4"
              style={{ borderBottom: '1px solid var(--tip-border)' }}
            >
              <h2 className="font-semibold" style={{ color: 'var(--tip-text-primary)' }}>
                Active Staff ({activeStaff.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'var(--tip-bg-surface)' }}>
                    <th
                      className="px-6 py-3 text-left text-sm font-medium"
                      style={{ color: 'var(--tip-text-muted)' }}
                    >
                      Name
                    </th>
                    <th
                      className="px-6 py-3 text-left text-sm font-medium"
                      style={{ color: 'var(--tip-text-muted)' }}
                    >
                      Role
                    </th>
                    <th
                      className="px-6 py-3 text-left text-sm font-medium"
                      style={{ color: 'var(--tip-text-muted)' }}
                    >
                      Locations
                    </th>
                    <th
                      className="px-6 py-3 text-left text-sm font-medium"
                      style={{ color: 'var(--tip-text-muted)' }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeStaff.map((person, idx) => {
                    const staffLocations = person.allLocations || [person.location];
                    const isEditingLocs = editingLocations === person.id;

                    return (
                      <tr
                        key={person.id}
                        style={{
                          borderBottom: idx < activeStaff.length - 1 ? '1px solid var(--tip-border-subtle)' : 'none',
                        }}
                      >
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
                              className="tip-input px-2 py-1"
                              autoFocus
                            />
                          ) : (
                            <span className="font-medium" style={{ color: 'var(--tip-text-primary)' }}>
                              {person.name}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={person.roleType}
                            onChange={(e) => handleUpdate(person.id, { roleType: e.target.value as Staff["roleType"] })}
                            className="tip-input px-2 py-1 text-sm rounded"
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
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                  style={{
                                    background: 'var(--tip-accent-glow)',
                                    color: 'var(--tip-accent)',
                                  }}
                                >
                                  {loc.name}
                                </span>
                              ))}
                              {locations.length > 1 && (
                                <button
                                  onClick={() => setEditingLocations(person.id)}
                                  className="text-xs ml-1"
                                  style={{ color: 'var(--tip-accent)' }}
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
                              className="text-sm"
                              style={{ color: 'var(--tip-accent)' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeactivate(person.id)}
                              className="text-sm"
                              style={{ color: 'var(--tip-error)' }}
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
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: 'var(--tip-bg-elevated)',
                border: '1px solid var(--tip-border)',
              }}
            >
              <div
                className="px-6 py-4"
                style={{ borderBottom: '1px solid var(--tip-border)' }}
              >
                <h2 className="font-semibold" style={{ color: 'var(--tip-text-muted)' }}>
                  Inactive Staff ({inactiveStaff.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <tbody>
                    {inactiveStaff.map((person, idx) => {
                      const staffLocations = person.allLocations || [person.location];
                      return (
                        <tr
                          key={person.id}
                          style={{
                            background: 'var(--tip-bg-surface)',
                            borderBottom: idx < inactiveStaff.length - 1 ? '1px solid var(--tip-border-subtle)' : 'none',
                          }}
                        >
                          <td className="px-6 py-4" style={{ color: 'var(--tip-text-muted)' }}>
                            {person.name}
                          </td>
                          <td className="px-6 py-4" style={{ color: 'var(--tip-text-muted)' }}>
                            {ROLE_TYPES.find((r) => r.value === person.roleType)?.label}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {staffLocations.map((loc) => (
                                <span
                                  key={loc.id}
                                  className="text-xs"
                                  style={{ color: 'var(--tip-text-muted)' }}
                                >
                                  {loc.name}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleUpdate(person.id, { isActive: true })}
                              className="text-sm"
                              style={{ color: 'var(--tip-accent)' }}
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
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-colors"
            style={{
              background: isSelected ? 'var(--tip-accent)' : 'var(--tip-bg-surface)',
              color: isSelected ? 'var(--tip-bg-deep)' : 'var(--tip-text-muted)',
            }}
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
          className="p-1"
          style={{ color: selected.length > 0 ? 'var(--tip-success)' : 'var(--tip-text-muted)' }}
          title="Save"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={onCancel}
          className="p-1"
          style={{ color: 'var(--tip-text-muted)' }}
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
