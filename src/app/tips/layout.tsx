// app/tips/layout.tsx
// Root layout for AirTip pages with Register Tape theme
import type { Metadata } from "next";
import { Outfit, IBM_Plex_Mono } from "next/font/google";
import "./tips.css";

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

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
    <div className={`${outfit.variable} ${ibmPlexMono.variable} tips-theme min-h-screen font-[family-name:var(--font-display)]`}>
      {children}
    </div>
  );
}
