// import NextAuth, { DefaultSession } from "next-auth";

// declare module "next-auth" {
//   interface User {
//     id: string;
//     name: string | null;
//     username: string;
//     email: string | null;
//     role: string;
//   }

//   interface Session {
//     user: {
//       id: string;
//       name: string | null;
//       username: string;
//       email: string | null;
//       role: string;
//     } & DefaultSession["user"];
//   }
// }

// next-auth.d.ts (à la racine)
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    username: string;
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: string;
  }
}
