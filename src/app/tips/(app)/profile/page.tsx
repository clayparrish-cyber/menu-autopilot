"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "../org-context";

interface Location {
  id: string;
  name: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const res = await fetch("/tips/api/locations");
      const data = await res.json();
      if (res.ok) setLocations(data.locations || []);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/tips/api/auth/logout", { method: "POST" });
    router.push("/tips/login");
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      {/* Basic info */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        <div className="px-4 py-3">
          <div className="text-sm text-gray-500">Name</div>
          <div className="font-medium text-gray-900">{user.name}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-sm text-gray-500">Email</div>
          <div className="font-medium text-gray-900">{user.email}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-sm text-gray-500">Role</div>
          <div className="font-medium text-gray-900 capitalize">{user.role.toLowerCase()}</div>
        </div>
      </div>

      {/* Locations */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="text-sm text-gray-500 mb-2">Eligible Locations</div>
        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : locations.length === 0 ? (
          <div className="text-gray-400">No locations assigned</div>
        ) : (
          <div className="space-y-1">
            {locations.map((loc) => (
              <div key={loc.id} className="font-medium text-gray-900">
                {loc.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}
