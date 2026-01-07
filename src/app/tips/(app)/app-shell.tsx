"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { TipUserRole } from "@prisma/client";
import { Home, Camera, Table, Settings, ChevronRight } from "lucide-react";

interface AppShellProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: TipUserRole;
  };
  organization: {
    id: string;
    name: string;
  };
  children: React.ReactNode;
}

export function TipAppShell({ user, organization, children }: AppShellProps) {
  const pathname = usePathname();

  const isAdmin = user.role === "ADMIN";

  // Navigation items for the new OCR-based flow
  const navigation = [
    { name: "Home", href: "/tips/dashboard", icon: Home, show: true },
    { name: "Scan", href: "/tips/scan", icon: Camera, show: true },
    { name: "Ledger", href: "/tips/ledger", icon: Table, show: true },
    { name: "Settings", href: "/tips/admin", icon: Settings, show: isAdmin },
  ].filter((item) => item.show);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header - simplified */}
      <header className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/tips/dashboard" className="font-bold text-lg text-gray-900">
            AirTip
          </Link>
          <Link href="/tips/profile" className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
            {user.name.split(" ")[0]}
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </Link>
        </div>
      </header>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4 border-b">
            <Link href="/tips/dashboard" className="text-xl font-bold text-gray-900">
              AirTip
            </Link>
          </div>
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-xs text-gray-500 truncate">{organization.name}</p>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  isActive(item.href)
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="border-t border-gray-200 p-4">
            <Link href="/tips/profile" className="flex items-center hover:bg-gray-50 -m-2 p-2 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
                <p className="text-xs text-blue-600 capitalize">{user.role.toLowerCase()}</p>
              </div>
              <ChevronRight className="ml-2 h-5 w-5 text-gray-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main content - add bottom padding for mobile nav */}
      <div className="lg:pl-64">
        <main className="py-4 px-4 sm:px-6 lg:px-8 lg:py-6 pb-24 lg:pb-6">{children}</main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex items-center justify-around px-2 py-2 safe-area-bottom">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center py-2 px-3 text-xs font-medium ${
                isActive(item.href)
                  ? "text-blue-600"
                  : "text-gray-500 active:bg-gray-100 rounded-lg"
              }`}
            >
              <item.icon className="h-6 w-6" />
              <span className="mt-1">{item.name}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
