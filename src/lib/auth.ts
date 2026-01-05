import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { prisma } from "./db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers: [
    EmailProvider({
      server: {
        host: "smtp.resend.com",
        port: 465,
        auth: {
          user: "resend",
          pass: process.env.RESEND_API_KEY,
        },
      },
      from: process.env.EMAIL_FROM || "Menu Autopilot <noreply@menuautopilot.com>",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/login/verify",
    error: "/login/error",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Fetch account info
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            ownedAccount: true,
            memberOf: true,
          },
        });
        if (dbUser) {
          token.accountId = dbUser.ownedAccount?.id || dbUser.memberOf?.id;
          token.subscriptionTier = dbUser.ownedAccount?.subscriptionTier || dbUser.memberOf?.subscriptionTier || "NONE";
          token.hasCompletedOnboarding = !!(dbUser.ownedAccount || dbUser.memberOf);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.accountId = token.accountId as string | undefined;
        session.user.subscriptionTier = token.subscriptionTier as string;
        session.user.hasCompletedOnboarding = token.hasCompletedOnboarding as boolean;
      }
      return session;
    },
  },
};

// Type augmentation for next-auth
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      accountId?: string;
      subscriptionTier: string;
      hasCompletedOnboarding: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    accountId?: string;
    subscriptionTier: string;
    hasCompletedOnboarding: boolean;
  }
}
