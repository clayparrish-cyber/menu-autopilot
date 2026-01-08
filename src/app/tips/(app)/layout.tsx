// app/tips/(app)/layout.tsx
// Protected layout for authenticated AirTip users
import { redirect } from "next/navigation";
import { TipAppShell } from "./app-shell";
import { OrgProvider } from "./org-context";
import { getTipAuthContext } from "@/lib/tips/auth";

export default async function TipAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get authenticated user - redirects to login if not authenticated
  const authContext = await getTipAuthContext();

  if (!authContext) {
    redirect("/tips/login");
  }

  const user = {
    id: authContext.user.id,
    email: authContext.user.email,
    name: authContext.user.name || "User",
    role: authContext.user.role,
  };

  const organization = {
    id: authContext.organization.id,
    name: authContext.organization.name,
  };

  const orgSettings = {
    usesCashTips: authContext.organization.usesCashTips,
  };

  return (
    <OrgProvider initialSettings={orgSettings} user={user}>
      <TipAppShell user={user} organization={organization}>
        {children}
      </TipAppShell>
    </OrgProvider>
  );
}
