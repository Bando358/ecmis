// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_THRESHOLD = 5000; // marge de 5 sec

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Exclusions : assets, auth, login, register, favicon, fichiers statiques
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/sign-up-admin") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/login")
  ) {
    return NextResponse.next();
  }

  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET!,
    });

    // Non connecté -> login
    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", req.url);
      return NextResponse.redirect(loginUrl);
    }

    // Gestion d'inactivité
    const lastActivityCookie = req.cookies.get("lastActivity")?.value;
    const now = Date.now();

    if (lastActivityCookie) {
      const lastActivity = parseInt(lastActivityCookie, 10);
      const inactivityTime = now - lastActivity;

      // Timeout -> supprimer cookies et rediriger
      if (inactivityTime > INACTIVITY_LIMIT + ACTIVITY_THRESHOLD) {
        const response = NextResponse.redirect(
          new URL("/login?timeout=1", req.url)
        );

        response.cookies.delete("next-auth.session-token");
        response.cookies.delete("__Secure-next-auth.session-token");
        response.cookies.delete("next-auth.callback-url");
        response.cookies.delete("next-auth.csrf-token");
        response.cookies.delete("lastActivity");

        return response;
      }
    }

    // Utilisateur authentifié et actif : toujours rafraîchir le cookie
    // Cela garantit que chaque navigation maintient la session vivante,
    // même si le JS client (ActivityTracker) n'a pas pu le faire
    // (mobile en veille, onglet en arrière-plan, etc.)
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
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|login|sign-up-admin).*)",
  ],
};
