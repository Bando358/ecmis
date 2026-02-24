"use server";

import { DetailCommande, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAction } from "./journalPharmacyActions";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { DetailCommandeCreateSchema } from "@/lib/validations/finance";

// Création de DetailCommande
export async function createDetailCommande(data: DetailCommande) {
  await requirePermission(TableName.DETAIL_COMMANDE, "canCreate");
  const validated = validateServerData(DetailCommandeCreateSchema, data);
  const result = await prisma.detailCommande.create({ data: validated });
  await logAction({
    idUser: data.idUser,
    action: "CREATION",
    entite: "DetailCommande",
    entiteId: result.id,
    idClinique: data.idClinique,
    description: `Detail commande: ${data.quantiteCommandee} unites commandees (stock initial: ${data.quantiteInitiale})`,
    nouvellesDonnees: { quantiteCommandee: data.quantiteCommandee, quantiteInitiale: data.quantiteInitiale },
  });
  return result;
}

// Récupérer toutes les DetailCommande
export async function getAllDetailCommande() {
  return await prisma.detailCommande.findMany();
}
// Suppression d'un client
export async function deleteDetailCommande(id: string) {
  await requirePermission(TableName.DETAIL_COMMANDE, "canDelete");
  return await prisma.detailCommande.delete({
    where: { id },
  });
}

//Mise à jour de DetailCommande
export async function updateDetailCommande(id: string, data: DetailCommande) {
  await requirePermission(TableName.DETAIL_COMMANDE, "canUpdate");
  return await prisma.detailCommande.update({
    where: { id },
    data,
  });
}

export async function getAllDetailCommandeByCommandeId(idCommande: string) {
  try {
    return await prisma.detailCommande.findMany({
      where: { idCommande },
      include: {
        tarifProduit: {
          include: {
            Produit: true,
          },
        },
        User: true,
        Clinique: true,
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des détails:", error);
    throw error;
  }
}

export async function deleteDetailCommandesByIds(ids: string[]) {
  await requirePermission(TableName.DETAIL_COMMANDE, "canDelete");
  try {
    const result = await prisma.$transaction(async (tx) => {
      // recupérer les détails à supprimer
      const detailsToDelete = await tx.detailCommande.findMany({
        where: { id: { in: ids } },
      });

      // Soustraire les quantiteCommandee atomiquement dans la transaction
      await Promise.all(
        detailsToDelete.map((detail) =>
          tx.tarifProduit.update({
            where: { id: detail.idTarifProduit },
            data: {
              quantiteStock: {
                decrement: detail.quantiteCommandee,
              },
            },
          })
        )
      );

      const deleteResult = await tx.detailCommande.deleteMany({
        where: { id: { in: ids } },
      });

      return { deleteResult, detailsToDelete };
    });

    if (result.detailsToDelete.length > 0) {
      await logAction({
        idUser: result.detailsToDelete[0].idUser,
        action: "SUPPRESSION",
        entite: "DetailCommande",
        entiteId: ids.join(","),
        idClinique: result.detailsToDelete[0].idClinique,
        description: `Suppression de ${result.detailsToDelete.length} details commande`,
      });
    }

    revalidatePath("/commandes");
    return result.deleteResult;
  } catch (error) {
    console.error("Erreur lors de la suppression des détails:", error);
    throw error;
  }
}
