import { restoreDatabase } from "@/lib/actions/sauvegardActions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 300; // 5 minutes max

export async function POST(request: Request) {
  // Rate limiting: max 3 restaurations par heure
  if (!rateLimit("api:restore", 3, 60 * 60 * 1000)) {
    return NextResponse.json(
      { success: false, message: "Trop de tentatives. Réessayez dans 1 heure." },
      { status: 429 }
    );
  }

  // 🔒 Vérification de l'authentification et du rôle admin
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json(
      { success: false, message: "Non authentifié" },
      { status: 401 }
    );
  }

  // Vérifier le rôle admin
  const userRole = (session.user as { role?: string }).role;
  if (userRole !== "ADMIN") {
    return NextResponse.json(
      { success: false, message: "Accès non autorisé - Admin requis" },
      { status: 403 }
    );
  }

  const formData = await request.formData();
  const result = await restoreDatabase(formData);

  return NextResponse.json(result, {
    status: result.success ? 200 : 500,
  });
}
