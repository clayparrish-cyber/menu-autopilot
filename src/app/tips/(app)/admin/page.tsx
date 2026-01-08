// app/tips/(app)/admin/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { TipSettings } from "./tip-settings";
import { getTipAuthContext } from "@/lib/tips/auth";

export default async function AdminPage() {
  const authContext = await getTipAuthContext();
  if (!authContext) {
    redirect("/tips/login");
  }

  const organization = {
    id: authContext.organization.id,
    name: authContext.organization.name,
  };

  const settingsLinks = [
    {
      href: "/tips/admin/locations",
      title: "Locations",
      description: "Manage restaurant locations",
      icon: "loc",
    },
    {
      href: "/tips/admin/staff",
      title: "Staff",
      description: "Manage staff members and roles",
      icon: "staff",
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--tip-text-primary)' }}
        >
          Settings
        </h1>
        <p className="mt-1" style={{ color: 'var(--tip-text-muted)' }}>
          Manage your organization
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {settingsLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl p-6 transition-all duration-200"
            style={{
              background: 'var(--tip-bg-elevated)',
              border: '1px solid var(--tip-border)',
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4 font-mono"
              style={{
                background: 'var(--tip-bg-surface)',
                color: 'var(--tip-text-muted)',
              }}
            >
              {link.icon === "loc" ? "[]" : "{}"}
            </div>
            <h2
              className="text-lg font-semibold"
              style={{ color: 'var(--tip-text-primary)' }}
            >
              {link.title}
            </h2>
            <p
              className="text-sm mt-1"
              style={{ color: 'var(--tip-text-muted)' }}
            >
              {link.description}
            </p>
          </Link>
        ))}
      </div>

      {/* Tip Settings */}
      <TipSettings />

      {/* Organization info */}
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
          Organization
        </h2>
        <div className="space-y-3">
          <div>
            <div className="text-sm" style={{ color: 'var(--tip-text-muted)' }}>Name</div>
            <div className="font-medium" style={{ color: 'var(--tip-text-primary)' }}>
              {organization.name}
            </div>
          </div>
          <div>
            <div className="text-sm" style={{ color: 'var(--tip-text-muted)' }}>Organization ID</div>
            <div
              className="font-mono text-sm"
              style={{ color: 'var(--tip-text-secondary)' }}
            >
              {organization.id}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
