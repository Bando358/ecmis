// types/next-auth.d.ts
import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    name?: string;
    email?: string;
    role?: string;
    // Ajoutez d'autres champs si nécessaire
  }

  interface Session {
    user: {
      id: string;
      username: string;
      name?: string;
      email?: string;
      role?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role?: string;
  }
}
