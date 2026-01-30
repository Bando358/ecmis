// lib/auth-options.ts
import prisma from "@/lib/prisma";
import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";

// Interface pour l'utilisateur étendu
interface ExtendedUser {
  id: string;
  name: string | null;
  email: string | null;
  username: string;
  role: string;
}

export const authOptions: NextAuthOptions = {
  // Cast nécessaire pour Prisma 6.x avec extensions ($extends)
  adapter: PrismaAdapter(prisma as unknown as PrismaClient),

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 heures (journée de travail)
    updateAge: 1 * 60 * 60, // Rafraîchir toutes les heures
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        try {
          if (!credentials?.username || !credentials?.password) {
            throw new Error(
              "Veuillez fournir un nom d'utilisateur et un mot de passe"
            );
          }

          const user = await prisma.user.findUnique({
            where: { username: credentials.username },
          });

          if (!user || !user.password) {
            throw new Error("Nom d'utilisateur ou mot de passe incorrect");
          }

          const isValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isValid) {
            throw new Error("Nom d'utilisateur ou mot de passe incorrect");
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            username: user.username,
            role: user.role,
          };
        } catch (error) {
          console.error("Erreur d'authentification:", error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.username = (user as ExtendedUser).username;
        token.role = (user as ExtendedUser).role;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
