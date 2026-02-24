"use server";

import { DetailCommande, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAction } from "./journalPharmacyActions";
import { requirePermission } from "@/lib/auth/withPermission";

// Création de DetailCommande
export async function createDetailCommande(data: DetailCommande) {
  await requirePermission(TableName.DETAIL_COMMANDE, "canCreate");
  const result = await prisma.detailCommande.create({ data });
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
    // recupérer les détails à supprimer
    const detailsToDelete = await prisma.detailCommande.findMany({
      where: { id: { in: ids } },
    });

    // Soustraire les quantiteCommandee de detailsToDelete des tarifProduit correspondants dans le quantiteStock
    for (const detail of detailsToDelete) {
      await prisma.tarifProduit.update({
        where: { id: detail.idTarifProduit },
        data: {
          quantiteStock: {
            decrement: detail.quantiteCommandee,
          },
        },
      });
    }

    const result = await prisma.detailCommande.deleteMany({
      where: { id: { in: ids } },
    });

    if (detailsToDelete.length > 0) {
      await logAction({
        idUser: detailsToDelete[0].idUser,
        action: "SUPPRESSION",
        entite: "DetailCommande",
        entiteId: ids.join(","),
        idClinique: detailsToDelete[0].idClinique,
        description: `Suppression de ${detailsToDelete.length} details commande`,
      });
    }

    revalidatePath("/commandes");
    return result;
  } catch (error) {
    console.error("Erreur lors de la suppression des détails:", error);
    throw error;
  }
}
