// lib/tips/auth.ts
// Authentication utilities for AirTip (separate from Menu Autopilot auth)

import { prisma } from "../db";
import { cookies } from "next/headers";
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import type { TipUser, TipUserRole, TipOrganization } from "@prisma/client";

const scryptAsync = promisify(scrypt);

const SESSION_COOKIE_NAME = "airtip_session";
const SESSION_DURATION_DAYS = 7;

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash || !hash.includes(":")) {
    return false;
  }
  const [salt, key] = hash.split(":");
  if (!salt || !key) {
    return false;
  }
  try {
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    const keyBuffer = Buffer.from(key, "hex");
    if (derivedKey.length !== keyBuffer.length) {
      return false;
    }
    return timingSafeEqual(derivedKey, keyBuffer);
  } catch {
    return false;
  }
}

// Session management
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  await prisma.tipSession.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    path: "/tips",
  });
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// Auth context
export interface TipAuthContext {
  user: TipUser;
  organization: TipOrganization;
  locationIds: string[];
}

// Demo mode flag - controlled via environment variable
// Set AIRTIP_DEMO_MODE=true only for local development
const DEMO_MODE = process.env.AIRTIP_DEMO_MODE === "true";

export async function getTipAuthContext(): Promise<TipAuthContext | null> {
  const token = await getSessionToken();

  // Try session-based auth first if we have a token
  if (token) {
    const session = await prisma.tipSession.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            organization: {
              include: {
                locations: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    if (session && session.expiresAt >= new Date()) {
      return {
        user: session.user,
        organization: session.user.organization,
        locationIds: session.user.organization.locations.map((l) => l.id),
      };
    }

    // Clean up expired session
    if (session) {
      await prisma.tipSession.delete({ where: { id: session.id } });
    }
  }

  // In demo mode, always auto-auth as demo admin (fallback for no/expired session)
  if (DEMO_MODE) {
    const demoUser = await prisma.tipUser.findUnique({
      where: { email: "admin@demo.com" },
      include: {
        organization: {
          include: {
            locations: { select: { id: true } },
          },
        },
      },
    });
    if (demoUser) {
      return {
        user: demoUser,
        organization: demoUser.organization,
        locationIds: demoUser.organization.locations.map((l) => l.id),
      };
    }
  }

  return null;
}

// Require auth helper for API routes
export async function requireTipAuth(): Promise<TipAuthContext> {
  const ctx = await getTipAuthContext();
  if (!ctx) {
    throw new Error("Unauthorized");
  }
  return ctx;
}

// Role checks
export function requireRole(ctx: TipAuthContext, roles: TipUserRole[]): void {
  if (!roles.includes(ctx.user.role)) {
    throw new Error("Forbidden");
  }
}

export function isAdmin(ctx: TipAuthContext): boolean {
  return ctx.user.role === "ADMIN";
}

export function isManager(ctx: TipAuthContext): boolean {
  return ctx.user.role === "ADMIN" || ctx.user.role === "MANAGER";
}

// User registration
export async function registerUser(
  email: string,
  password: string,
  name: string,
  organizationId: string,
  role: TipUserRole = "MANAGER"
): Promise<TipUser> {
  const passwordHash = await hashPassword(password);

  return prisma.tipUser.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      name,
      organizationId,
      role,
    },
  });
}

// User login
export async function loginUser(
  email: string,
  password: string
): Promise<{ user: TipUser; token: string } | null> {
  const user = await prisma.tipUser.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  const token = await createSession(user.id);
  return { user, token };
}

// Logout
export async function logoutUser(): Promise<void> {
  const token = await getSessionToken();
  if (token) {
    await prisma.tipSession.deleteMany({ where: { token } });
    await clearSessionCookie();
  }
}

// Create organization with admin user
export async function createOrganization(
  orgName: string,
  adminEmail: string,
  adminPassword: string,
  adminName: string
): Promise<{ organization: TipOrganization; user: TipUser }> {
  const passwordHash = await hashPassword(adminPassword);

  const organization = await prisma.tipOrganization.create({
    data: {
      name: orgName,
      users: {
        create: {
          email: adminEmail.toLowerCase(),
          passwordHash,
          name: adminName,
          role: "ADMIN",
        },
      },
    },
    include: {
      users: true,
    },
  });

  return {
    organization,
    user: organization.users[0],
  };
}
