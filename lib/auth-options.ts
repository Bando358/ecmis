// lib/auth-options.ts
import prisma from "@/lib/prisma";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { authLogger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

interface ExtendedUser {
  id: string;
  name: string | null;
  email: string | null;
  username: string;
  role: string;
}

// Validation au démarrage : crash immédiat si le secret est manquant
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    "NEXTAUTH_SECRET manquant. Ajoutez-le dans les variables d'environnement Vercel."
  );
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 4 * 60 * 60,  // 4 heures (standard système médical)
    updateAge: 5 * 60,    // Rafraîchir toutes les 5 min sur activité
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
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        // Rate limiting: max 10 tentatives par username par 15 minutes
        if (!rateLimit(`login:${credentials.username}`, 10, 15 * 60 * 1000)) {
          throw new Error("Trop de tentatives. Réessayez dans 15 minutes.");
        }

        try {
          const user = await prisma.user.findUnique({
            where: { username: credentials.username },
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
              password: true,
              role: true,
              banned: true,
            },
          });

          if (!user || !user.password) {
            return null;
          }

          // Bloquer les comptes bannis
          if (user.banned) {
            return null;
          }

          const isValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            username: user.username,
            role: user.role,
          };
        } catch (error) {
          authLogger.error("Erreur d'authentification", error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // Première connexion : copier les données utilisateur dans le token
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.username = (user as ExtendedUser).username;
        token.role = (user as ExtendedUser).role;
        return token;
      }

      // Refresh JWT : re-vérifier que l'utilisateur existe et n'est pas banni
      // Exécuté toutes les updateAge (5 min) pour détecter ban/suppression mid-session
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { id: true, banned: true, role: true, name: true, email: true },
          });

          // Utilisateur supprimé ou banni → invalider le token
          if (!dbUser || dbUser.banned) {
            authLogger.warn("Token invalidé (user supprimé ou banni)", {
              userId: token.id as string,
            });
            return {} as typeof token;
          }

          // Synchroniser le rôle si modifié par un admin
          token.role = dbUser.role;
          token.name = dbUser.name;
          token.email = dbUser.email;
        } catch {
          // En cas d'erreur DB, conserver le token existant pour éviter une déconnexion
        }
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
  debug: false, // Jamais de debug en production
};
