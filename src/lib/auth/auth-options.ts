import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/db/connection";
import { User } from "@/db/models";
import { verifyPassword } from "@/lib/auth/tokens";
import type { UserRole } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      avatar?: string;
      emailVerified: boolean;
    };
  }

  interface User {
    role: UserRole;
    emailVerified: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    emailVerified: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await connectDB();
        const user = await User.findOne({
          email: credentials.email.toLowerCase(),
        }).select("+password");

        if (!user) return null;

        const valid = await verifyPassword(
          credentials.password,
          user.password,
        );
        if (!valid) return null;

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.avatar,
          emailVerified: user.emailVerified,
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 15 * 60 },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.emailVerified = user.emailVerified;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.emailVerified = token.emailVerified;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
