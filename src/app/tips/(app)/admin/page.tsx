// app/tips/(app)/admin/page.tsx
import Link from "next/link";
import { TipSettings } from "./tip-settings";

// Demo mode - skip auth check
const DEMO_MODE = true;

export default async function AdminPage() {
  // Demo context
  const ctx = {
    organization: {
      id: "demo-org",
      name: "Demo Restaurant Group",
    },
  };

  const settingsLinks = [
    {
      href: "/tips/admin/locations",
      title: "Locations",
      description: "Manage restaurant locations",
      icon: "🏪",
    },
    {
      href: "/tips/admin/staff",
      title: "Staff",
      description: "Manage staff members and roles",
      icon: "👥",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your organization</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {settingsLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="text-3xl mb-3">{link.icon}</div>
            <h2 className="text-lg font-semibold text-gray-900">{link.title}</h2>
            <p className="text-gray-600 text-sm mt-1">{link.description}</p>
          </Link>
        ))}
      </div>

      {/* Tip Settings */}
      <TipSettings />

      {/* Organization info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization</h2>
        <div className="space-y-3">
          <div>
            <div className="text-sm text-gray-500">Name</div>
            <div className="font-medium text-gray-900">{ctx.organization.name}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Organization ID</div>
            <div className="font-mono text-sm text-gray-600">{ctx.organization.id}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
