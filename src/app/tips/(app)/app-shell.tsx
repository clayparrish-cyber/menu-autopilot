"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { TipUserRole } from "@prisma/client";
import { Home, Camera, Table, Settings, ChevronRight } from "lucide-react";
import { AirTipLogo, AirTipLogoCompact } from "../components/logo";

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

  const navigation = [
    { name: "Home", href: "/tips/dashboard", icon: Home, show: true },
    { name: "Scan", href: "/tips/scan", icon: Camera, show: true },
    { name: "Ledger", href: "/tips/ledger", icon: Table, show: true },
    { name: "Settings", href: "/tips/admin", icon: Settings, show: isAdmin },
  ].filter((item) => item.show);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-screen" style={{ background: 'var(--tip-bg-base)' }}>
      {/* Mobile header */}
      <header
        className="lg:hidden sticky top-0 z-40 animate-fade-in"
        style={{
          background: 'var(--tip-bg-elevated)',
          borderBottom: '1px solid var(--tip-border)'
        }}
      >
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/tips/dashboard" className="flex items-center gap-2">
            <AirTipLogoCompact size={32} />
            <span
              className="font-semibold text-lg tracking-tight"
              style={{ color: 'var(--tip-text-primary)' }}
            >
              AirTip
            </span>
          </Link>
          <Link
            href="/tips/profile"
            className="flex items-center gap-1 text-sm transition-colors"
            style={{ color: 'var(--tip-text-secondary)' }}
          >
            {user.name.split(" ")[0]}
            <ChevronRight className="h-4 w-4" style={{ color: 'var(--tip-text-muted)' }} />
          </Link>
        </div>
      </header>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div
          className="flex flex-col flex-grow"
          style={{
            background: 'var(--tip-bg-elevated)',
            borderRight: '1px solid var(--tip-border)'
          }}
        >
          {/* Logo */}
          <div
            className="flex h-16 items-center px-5"
            style={{ borderBottom: '1px solid var(--tip-border)' }}
          >
            <Link href="/tips/dashboard" className="flex items-center gap-3">
              <AirTipLogo size={40} />
              <span
                className="text-xl font-semibold tracking-tight"
                style={{ color: 'var(--tip-text-primary)' }}
              >
                AirTip
              </span>
            </Link>
          </div>

          {/* Org name */}
          <div
            className="px-5 py-3"
            style={{ borderBottom: '1px solid var(--tip-border-subtle)' }}
          >
            <p
              className="text-xs font-medium truncate uppercase tracking-wider"
              style={{ color: 'var(--tip-text-muted)' }}
            >
              {organization.name}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navigation.map((item, index) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150"
                style={{
                  background: isActive(item.href) ? 'var(--tip-accent-glow)' : 'transparent',
                  color: isActive(item.href) ? 'var(--tip-accent)' : 'var(--tip-text-secondary)',
                  animationDelay: `${index * 50}ms`,
                }}
              >
                <item.icon
                  className="mr-3 h-5 w-5"
                  style={{
                    color: isActive(item.href) ? 'var(--tip-accent)' : 'var(--tip-text-muted)'
                  }}
                />
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User section */}
          <div
            className="p-4"
            style={{ borderTop: '1px solid var(--tip-border)' }}
          >
            <Link
              href="/tips/profile"
              className="flex items-center p-3 -m-1 rounded-lg transition-colors"
              style={{ background: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--tip-bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
                style={{
                  background: 'var(--tip-bg-surface)',
                  color: 'var(--tip-text-primary)'
                }}
              >
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0 ml-3">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: 'var(--tip-text-primary)' }}
                >
                  {user.name}
                </p>
                <p
                  className="text-xs truncate font-mono"
                  style={{ color: 'var(--tip-accent)' }}
                >
                  {user.role.toLowerCase()}
                </p>
              </div>
              <ChevronRight className="ml-2 h-4 w-4" style={{ color: 'var(--tip-text-muted)' }} />
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 relative z-10">
        <main className="py-5 px-4 sm:px-6 lg:px-8 lg:py-8 pb-28 lg:pb-8 animate-fade-in">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
        style={{
          background: 'var(--tip-bg-elevated)',
          borderTop: '1px solid var(--tip-border)'
        }}
      >
        <div className="flex items-center justify-around px-2 py-2 safe-area-bottom">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex flex-col items-center py-2 px-4 text-xs font-medium rounded-xl transition-all duration-150"
              style={{
                background: isActive(item.href) ? 'var(--tip-accent-glow)' : 'transparent',
                color: isActive(item.href) ? 'var(--tip-accent)' : 'var(--tip-text-muted)',
              }}
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
