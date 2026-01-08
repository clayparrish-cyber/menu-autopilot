"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface OrgSettings {
  usesCashTips: boolean;
}

interface OrgContextValue {
  settings: OrgSettings;
  updateSettings: (newSettings: Partial<OrgSettings>) => void;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER";
  staffId?: string; // Links to TipStaff record if user is also staff
}

interface UserContextValue {
  user: CurrentUser;
  isAdmin: boolean;
  isManager: boolean;
}

const OrgContext = createContext<OrgContextValue | null>(null);
const UserContext = createContext<UserContextValue | null>(null);

export function OrgProvider({
  children,
  initialSettings,
  user,
}: {
  children: React.ReactNode;
  initialSettings: OrgSettings;
  user: CurrentUser;
}) {
  const [settings, setSettings] = useState<OrgSettings>(initialSettings);

  const updateSettings = useCallback((newSettings: Partial<OrgSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const userValue: UserContextValue = {
    user,
    isAdmin: user.role === "ADMIN",
    isManager: user.role === "ADMIN" || user.role === "MANAGER",
  };

  return (
    <OrgContext.Provider value={{ settings, updateSettings }}>
      <UserContext.Provider value={userValue}>
        {children}
      </UserContext.Provider>
    </OrgContext.Provider>
  );
}

export function useOrgSettings() {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error("useOrgSettings must be used within OrgProvider");
  }
  return ctx;
}

export function useCurrentUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useCurrentUser must be used within OrgProvider");
  }
  return ctx;
}
