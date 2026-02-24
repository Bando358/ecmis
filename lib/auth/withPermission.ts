"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import { TableName } from "@prisma/client";
import { PermissionError } from "./errors";

type PermissionAction = "canCreate" | "canRead" | "canUpdate" | "canDelete";

/**
 * Vérifie qu'un utilisateur authentifié a la permission requise.
 * Lance PermissionError si non autorisé.
 * Les ADMIN ont un bypass automatique.
 *
 * @example
 * ```ts
 * export async function deleteClient(id: string) {
 *   const { userId } = await requirePermission(TableName.CLIENT, "canDelete");
 *   // ... logique de suppression
 * }
 * ```
 */
export async function requirePermission(
  table: TableName,
  action: PermissionAction
): Promise<{ userId: string; role: string }> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new PermissionError("Non authentifié.");
  }

  const { id: userId, role } = session.user;

  // Admin bypass
  if (role === "ADMIN") {
    return { userId, role };
  }

  const perm = await prisma.permission.findFirst({
    where: { userId, table },
    select: { [action]: true },
  });

  if (!perm || !(perm as Record<string, boolean>)[action]) {
    throw new PermissionError(
      `Permission refusée: ${action} sur ${table}`
    );
  }

  return { userId, role };
}
