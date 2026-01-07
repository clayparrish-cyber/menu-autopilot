// app/tips/(app)/layout.tsx
// Protected layout for authenticated AirTip users
import { TipAppShell } from "./app-shell";
import { OrgProvider } from "./org-context";
import { prisma } from "@/lib/db";

// Demo mode: skip login entirely
const DEMO_MODE = true;

export default async function TipAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // In demo mode, fetch demo org from database for settings
  let orgSettings = { usesCashTips: true };

  if (DEMO_MODE) {
    try {
      const demoOrg = await prisma.tipOrganization.findFirst({
        where: { users: { some: { email: "admin@demo.com" } } },
        select: { usesCashTips: true },
      });
      if (demoOrg) {
        orgSettings = { usesCashTips: demoOrg.usesCashTips };
      }
    } catch {
      // Fallback to defaults if db fails
    }
  }

  const ctx = {
    user: {
      id: "demo",
      email: "admin@demo.com",
      name: "Demo Admin",
      role: "ADMIN" as const,
    },
    organization: {
      id: "demo-org",
      name: "Demo Restaurant Group",
    },
  };

  return (
    <OrgProvider
      initialSettings={orgSettings}
      user={{
        id: ctx.user.id,
        name: ctx.user.name || ctx.user.email,
        email: ctx.user.email,
        role: ctx.user.role,
        // In production, this would be fetched from the user's linked staff record
        staffId: undefined,
      }}
    >
      <TipAppShell
        user={{
          id: ctx.user.id,
          name: ctx.user.name || ctx.user.email,
          email: ctx.user.email,
          role: ctx.user.role,
        }}
        organization={{
          id: ctx.organization.id,
          name: ctx.organization.name,
        }}
      >
        {children}
      </TipAppShell>
    </OrgProvider>
  );
}
