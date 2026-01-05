// POST /tips/api/auth/register
// Creates a new organization with an admin user
import { NextRequest, NextResponse } from "next/server";
import { createOrganization, createSession, setSessionCookie } from "@/lib/tips/auth";
import { audit } from "@/lib/tips/audit";
import { z } from "zod";

const registerSchema = z.object({
  organizationName: z.string().min(1, "Organization name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    const { organization, user } = await createOrganization(
      data.organizationName,
      data.email,
      data.password,
      data.name
    );

    // Create session and set cookie
    const token = await createSession(user.id);
    await setSessionCookie(token);

    // Audit log
    await audit.create("TipOrganization", organization.id, {
      adminUserId: user.id,
      adminEmail: user.email,
    }, {
      userId: user.id,
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    // Check for duplicate email
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
