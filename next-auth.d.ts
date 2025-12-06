import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    name: string | null;
    username: string;
    email: string | null;
    role: string;
  }

  interface Session {
    user: {
      id: string;
      name: string | null;
      username: string;
      email: string | null;
      role: string;
    } & DefaultSession["user"];
  }
}
