"use server";

import { DetailCommande } from "@prisma/client";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Création de DetailCommande
export async function createDetailCommande(data: DetailCommande) {
  return await prisma.detailCommande.create({
    data,
  });
}

// Récupérer toutes les DetailCommande
export async function getAllDetailCommande() {
  return await prisma.detailCommande.findMany();
}
// Suppression d'un client
export async function deleteDetailCommande(id: string) {
  return await prisma.detailCommande.delete({
    where: { id },
  });
}

//Mise à jour de DetailCommande
export async function updateDetailCommande(id: string, data: DetailCommande) {
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

    revalidatePath("/commandes");
    return result;
  } catch (error) {
    console.error("Erreur lors de la suppression des détails:", error);
    throw error;
  }
}
