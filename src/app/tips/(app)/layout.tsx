// app/tips/(app)/layout.tsx
// Protected layout for authenticated AirTip users
import { redirect } from "next/navigation";
import { getTipAuthContext } from "@/lib/tips/auth";
import { TipAppShell } from "./app-shell";

export default async function TipAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getTipAuthContext();

  if (!ctx) {
    redirect("/tips/login");
  }

  return (
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
  );
}
