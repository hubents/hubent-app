import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/password";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "Email y Contraseña",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const email = (credentials.email as string).toLowerCase();
          const password = credentials.password as string;

          const user = await db.query.users.findFirst({
            where: eq(users.email, email),
          });

          if (!user) {
            console.log("Auth: User not found:", email);
            return null;
          }

          if (!user.passwordHash) {
            console.log("Auth: User has no password:", email);
            return null;
          }

          const isValid = await verifyPassword(password, user.passwordHash);
          if (!isValid) {
            console.log("Auth: Invalid password for:", email);
            return null;
          }

          console.log("Auth: Successful login for:", email);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (error) {
          console.error("Auth: Error in authorize:", error);
          return null;
        }
      },
    }),
    // Only add Resend provider if API key is available
    ...(process.env.RESEND_API_KEY ? [Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM || "HubEnts <noreply@hubents.com>",
    })] : []),
    // Only add Google provider if credentials are available
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })] : []),
  ],
  pages: {
    signIn: "/auth/login",
    verifyRequest: "/auth/verify",
    error: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async signIn({ user, account }) {
      // For OAuth/Magic Link, ensure user exists in our system
      if (account?.provider !== "credentials" && user?.email) {
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, user.email.toLowerCase()),
        });
        if (!existingUser) {
          console.log("Auth: Creating new user from OAuth/Magic Link:", user.email);
        }
      }
      return true;
    },
  },
  debug: process.env.NODE_ENV === "development",
});
