import { prismaClient } from "@/app/lib/db";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "muzer_dev_super_secret_jwt_key_2026_x",
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "Demo / Guest Login",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "rajprithvi2906@gmail.com" },
      },
      async authorize(credentials) {
        const email = credentials?.email || "rajprithvi2906@gmail.com";
        let user = await prismaClient.user.findUnique({
          where: { email },
        });
        if (!user) {
          user = await prismaClient.user.create({
            data: {
              email,
              name: email.split("@")[0],
              provider: "Credentials",
            },
          });
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name || email.split("@")[0],
        };
      },
    }),
  ],
  callbacks: {
    async signIn(params) {
      if (!params.user.email) {
        return false;
      }
      try {
        const existingUser = await prismaClient.user.findUnique({
          where: {
            email: params.user.email,
          },
        });
        if (!existingUser) {
          await prismaClient.user.create({
            data: {
              email: params.user.email,
              name: params.user.name || params.user.email.split("@")[0],
              provider: "Google",
            },
          });
        }
      } catch (e) {
        console.error("Error creating user during signIn:", e);
      }
      return true;
    },
    async jwt({ token, user }) {
      if (token.email) {
        const dbUser = await prismaClient.user.findUnique({
          where: { email: token.email },
        });
        if (dbUser) {
          token.userId = dbUser.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user?.email) {
        const dbUser = await prismaClient.user.findUnique({
          where: { email: session.user.email },
        });
        if (dbUser) {
          (session.user as any).id = dbUser.id;
        } else if (token.userId) {
          (session.user as any).id = token.userId;
        }
      }
      return session;
    },
  },
};
