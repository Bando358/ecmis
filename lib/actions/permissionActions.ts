"use server";
// lib/actions/permissionActions.ts
import { TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";

export async function getUserPermissions(id: string) {
  try {
    const permissions = await prisma.permission.findMany({
      where: { userId: id },
    });
    return permissions;
  } catch (error) {
    console.error("Erreur lors de la récupération des permissions:", error);
    return [];
  }
}

export async function checkPermissionByPostStatus(
  table: TableName,
  action: "canCreate" | "canRead" | "canUpdate" | "canDelete"
): Promise<boolean> {
  try {
    const permission = await prisma.permission.findFirst({
      where: {
        table,
      },
    });

    return permission ? permission[action] : false;
  } catch (error) {
    console.error("Erreur lors de la vérification des permissions:", error);
    return false;
  }
}

export async function getUserPermissionsById(userId: string) {
  try {
    const permissions = await prisma.permission.findMany({
      where: { userId },
    });
    return permissions;
  } catch (error) {
    console.error("Erreur lors de la récupération des permissions:", error);
    return [];
  }
}

export async function checkPermissionById(
  idUser: string,
  table: TableName,
  action: "canCreate" | "canRead" | "canUpdate" | "canDelete"
): Promise<boolean> {
  try {
    const permission = await prisma.permission.findFirst({
      where: {
        userId: idUser,
        table: table,
      },
    });
    return permission ? permission[action] : false;
  } catch (error) {
    console.error("Erreur lors de la vérification des permissions:", error);
    return false;
  }
}

// update permission
export async function updatePermission(
  idUser: string,
  table: TableName,
  action: "canCreate" | "canRead" | "canUpdate" | "canDelete",
  value: boolean
) {
  await requirePermission(TableName.PERMISSION, "canUpdate");
  try {
    const permission = await prisma.permission.updateMany({
      where: {
        userId: idUser,
        table: table,
      },
      data: {
        [action]: value,
      },
    });

    return permission;
  } catch (error) {
    console.error("Erreur lors de la mise à jour des permissions:", error);
    return null;
  }
}

// Définition de l'interface
interface permissionProps {
  userId: string;
  table: TableName;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

// create permission beforehand
export async function createPermissionBeforeChecked(
  tablePermissions: permissionProps[]
) {
  await requirePermission(TableName.PERMISSION, "canCreate");
  try {
    if (!tablePermissions || tablePermissions.length === 0) return null;

    const filteredData: permissionProps[] = [];
    const ignored: permissionProps[] = [];

    for (const permission of tablePermissions) {
      // Vérifier si une permission identique existe déjà
      const exists = await prisma.permission.findFirst({
        where: {
          userId: permission.userId,
          table: permission.table,
        },
      });

      if (!exists) {
        filteredData.push(permission);
      } else {
        ignored.push(permission);
      }
    }

    // Si tout est ignoré, retourner un message
    if (filteredData.length === 0) {
      return {
        created: [],
        ignored,
        message: "Aucune nouvelle permission créée (doublons détectés).",
      };
    }

    // Transformation dans le format attendu par Prisma
    const data = filteredData.map((p) => ({
      userId: p.userId,
      table: p.table,
      canCreate: p.canCreate,
      canRead: p.canRead,
      canUpdate: p.canUpdate,
      canDelete: p.canDelete,
    }));

    const result = await prisma.permission.createMany({
      data,
    });

    return {
      createdCount: result.count,
      created: filteredData,
      ignored: ignored,
      message: `${result.count} permission(s) créée(s).`,
    };
  } catch (error) {
    console.error("Erreur lors de la création des permissions:", error);
    return null;
  }
}

// create permission

export async function createPermission(tablePermissions: permissionProps[]) {
  await requirePermission(TableName.PERMISSION, "canCreate");
  try {
    if (!tablePermissions || tablePermissions.length === 0) return null;

    const data = tablePermissions.map((permission) => ({
      userId: permission.userId,
      table: permission.table,
      canCreate: permission.canCreate,
      canRead: permission.canRead,
      canUpdate: permission.canUpdate,
      canDelete: permission.canDelete,
    }));

    const result = await prisma.permission.createMany({
      data,
    });

    return result;
  } catch (error) {
    console.error("Erreur lors de la création des permissions:", error);
    return null;
  }
}

// get one permission by userId and table
export async function getOnePermissionByUserIdAndTable(
  idUser: string,
  table: TableName
) {
  try {
    const permission = await prisma.permission.findFirst({
      where: {
        userId: idUser,
        table: table,
      },
    });
    return permission;
  } catch (error) {
    console.error("Erreur lors de la récupération de la permission:", error);
    return null;
  }
}

// delete permission by userId
export async function deletePermissionByUserId(idUser: string) {
  await requirePermission(TableName.PERMISSION, "canDelete");
  try {
    const permission = await prisma.permission.deleteMany({
      where: {
        userId: idUser,
      },
    });
    return permission;
  } catch (error) {
    console.error("Erreur lors de la suppression des permissions:", error);
    return null;
  }
}

// interface PermissionProps {
//   userId: string;
//   table: TableName;
//   postStatus: PostStatus;
//   canCreate: boolean;
//   canRead: boolean;
//   canUpdate: boolean;
//   canDelete: boolean;
// }

// export async function createPermission(tablePermissions: PermissionProps[]) {
//   try {
//     if (!tablePermissions || tablePermissions.length === 0) return null;

//     const data = tablePermissions.map((permission) => ({
//       userId: permission.userId,
//       table: permission.table,
//       postStatus: permission.postStatus,
//       canCreate: permission.canCreate,
//       canRead: permission.canRead,
//       canUpdate: permission.canUpdate,
//       canDelete: permission.canDelete,
//     }));

//     const result = await prisma.permission.createMany({
//       data,
//       skipDuplicates: true, // Évite les doublons
//     });

//     return result;
//   } catch (error) {
//     console.error("Erreur lors de la création des permissions:", error);
//     throw new Error("Échec de la création des permissions");
//   }
// }

// ===== Tables liées aux menus du sidebar =====
const MENU_TABLES: TableName[] = [
  TableName.IMPORT_CLIENT_VIH,
  TableName.CLIENT,
  TableName.RAPPORT_FINANCIER,
  TableName.PRODUIT,
  TableName.TARIF_PRODUIT,
  TableName.STOCK_PRODUIT,
  TableName.ANOMALIE_INVENTAIRE,
  TableName.COMMANDE_FOURNISSEUR,
  TableName.HISTORIQUE_INVENTAIRE,
  TableName.TABLEAU_FINANCIER,
  TableName.JOURNAL_PHARMACIE,
  TableName.GESTION_RDV,
  TableName.LISTING,
  TableName.RAPPORT,
  TableName.ANALYSE_VISUALISER,
  TableName.EXAMEN,
  TableName.TARIF_EXAMEN,
  TableName.ECHOGRAPHIE,
  TableName.TARIF_ECHOGRAPHIE,
  TableName.PRESTATION,
  TableName.TARIF_PRESTATION,
  TableName.ADMINISTRATION,
];

/**
 * Attribue les permissions menu (canRead=true) à TOUS les utilisateurs
 * pour chaque TableName du sidebar, sans créer de doublons.
 */
export async function assignMenuPermissionsToAllUsers() {
  await requirePermission(TableName.PERMISSION, "canCreate");
  try {
    const users = await prisma.user.findMany({ select: { id: true } });
    let created = 0;
    let skipped = 0;

    for (const user of users) {
      // Permissions existantes pour cet utilisateur
      const existing = await prisma.permission.findMany({
        where: { userId: user.id, table: { in: MENU_TABLES } },
        select: { table: true },
      });
      const existingSet = new Set(existing.map((p) => p.table));

      // Tables manquantes
      const missing = MENU_TABLES.filter((t) => !existingSet.has(t));
      if (missing.length === 0) {
        skipped += MENU_TABLES.length;
        continue;
      }

      await prisma.permission.createMany({
        data: missing.map((table) => ({
          userId: user.id,
          table,
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: true,
        })),
      });
      created += missing.length;
      skipped += existingSet.size;
    }

    return {
      success: true,
      message: `${created} permission(s) créée(s), ${skipped} déjà existante(s), ${users.length} utilisateur(s) traité(s).`,
      created,
      skipped,
      usersCount: users.length,
    };
  } catch (error) {
    console.error("Erreur assignMenuPermissionsToAllUsers:", error);
    return { success: false, message: "Erreur lors de l'attribution des permissions." };
  }
}
