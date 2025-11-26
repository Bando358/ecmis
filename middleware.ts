// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes
const ACTIVITY_THRESHOLD = 5000; // 5 secondes de marge

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ Exclusions (fichiers statiques, login, etc.)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/sign-up-admin") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET!,
      secureCookie: process.env.NODE_ENV === "production",
    });

    // 🔐 Gestion du login
    if (pathname.startsWith("/login")) {
      if (token) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return NextResponse.next();
    }

    // 🚫 Non connecté → redirection
    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", req.url);
      return NextResponse.redirect(loginUrl);
    }

    // ⏰ Vérification d’inactivité
    const lastActivityCookie = req.cookies.get("lastActivity")?.value;
    const now = Date.now();

    if (lastActivityCookie) {
      const lastActivity = parseInt(lastActivityCookie, 10);
      const inactivityTime = now - lastActivity;

      if (inactivityTime > INACTIVITY_LIMIT + ACTIVITY_THRESHOLD) {
        console.log(
          `🚨 Déconnexion pour inactivité (${Math.round(
            inactivityTime / 1000
          )}s)`
        );

        const response = NextResponse.redirect(
          new URL("/login?timeout=1", req.url)
        );
        const isProduction = process.env.NODE_ENV === "production";

        response.cookies.delete(
          isProduction
            ? "__Secure-next-auth.session-token"
            : "next-auth.session-token"
        );
        response.cookies.delete("lastActivity");
        return response;
      }

      // 🔄 Mise à jour du cookie s’il approche de l’expiration
      if (inactivityTime > INACTIVITY_LIMIT - 30000) {
        const response = NextResponse.next();
        response.cookies.set({
          name: "lastActivity",
          value: now.toString(),
          path: "/",
          maxAge: 86400, // 24h
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
        return response;
      }
    } else {
      // 📝 Initialisation du cookie
      const response = NextResponse.next();
      response.cookies.set({
        name: "lastActivity",
        value: now.toString(),
        path: "/",
        maxAge: 86400,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      return response;
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
