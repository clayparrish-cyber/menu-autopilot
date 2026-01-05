// app/tips/layout.tsx
// Root layout for AirTip pages
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AirTip - Tip Management",
  description: "Automate tip-out calculations, reconciliation, and reporting",
};

export default function TipsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
