"use server";

import { TarifProduit } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création de TarifProduit
export async function createTarifProduit(data: {
  prixUnitaire: number;
  quantiteStock: number;
  idProduit: string;
  idClinique: string;
  idUser: string;
}) {
  return await prisma.tarifProduit.create({
    data: {
      prixUnitaire: data.prixUnitaire,
      quantiteStock: data.quantiteStock,
      Produit: { connect: { id: data.idProduit } },
      Clinique: { connect: { id: data.idClinique } },
      User: { connect: { id: data.idUser } },
    },
  });
}

// Récupérer toutes les TarifProduit
export async function getAllTarifProduits() {
  return await prisma.tarifProduit.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
}

// Récupérer toutes les getAllTarifProduitsByTabIclinique
export async function getAllTarifProduitsByTabIclinique(clinicIds: string[]) {
  return await prisma.tarifProduit.findMany({
    where: {
      idClinique: {
        in: clinicIds,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}
// Récupération de tous les TarifProduit par idClinique
export const getAllTarifProduitsByIdClinique = async (idClinique: string) => {
  const allTarifProduits = await prisma.tarifProduit.findMany({
    where: { idClinique },
  });
  return allTarifProduits;
};

// Suppression d'un client
export async function deleteTarifProduit(id: string) {
  return await prisma.tarifProduit.delete({
    where: { id },
  });
}

//Mise à jour de TarifProduit
export async function updateTarifProduit(id: string, data: TarifProduit) {
  return await prisma.tarifProduit.update({
    where: { id },
    data,
  });
}

export async function updateQuantiteStockTarifProduit(
  idTarifProduit: string,
  quantiteAjoutee: number
) {
  try {
    const tarif = await prisma.tarifProduit.findUnique({
      where: { id: idTarifProduit },
      select: { quantiteStock: true },
    });

    if (!tarif) {
      throw new Error("Produit non trouvé");
    }

    // const nouvelleQuantite = tarif.quantiteStock + quantiteAjoutee;

    await prisma.tarifProduit.update({
      where: { id: idTarifProduit },
      data: { quantiteStock: quantiteAjoutee },
    });

    return { success: true, quantiteAjoutee };
  } catch (error) {
    console.error(
      "Erreur lors de la mise à jour de la quantité en stock :",
      error
    );
    return { success: false };
  }
}
export async function updateQuantiteStockTarifProduitByDetailCommande(
  idTarifProduit: string,
  quantiteAjoutee: number
) {
  try {
    const tarif = await prisma.tarifProduit.findUnique({
      where: { id: idTarifProduit },
      select: { quantiteStock: true },
    });

    if (!tarif) {
      throw new Error("Produit non trouvé");
    }

    // const nouvelleQuantite = tarif.quantiteStock + quantiteAjoutee;

    await prisma.tarifProduit.update({
      where: { id: idTarifProduit },
      data: { quantiteStock: tarif.quantiteStock + quantiteAjoutee },
    });

    return { success: true, quantiteAjoutee };
  } catch (error) {
    console.error(
      "Erreur lors de la mise à jour de la quantité en stock :",
      error
    );
    return { success: false };
  }
}
export async function updateTarifProduitByDetailCommandeAnnule(
  idTarifProduit: string,
  quantiteAjoutee: number
) {
  try {
    const tarif = await prisma.tarifProduit.findUnique({
      where: { id: idTarifProduit },
      select: { quantiteStock: true },
    });

    if (!tarif) {
      throw new Error("Produit non trouvé");
    }

    // const nouvelleQuantite = tarif.quantiteStock + quantiteAjoutee;

    await prisma.tarifProduit.update({
      where: { id: idTarifProduit },
      data: { quantiteStock: tarif.quantiteStock - quantiteAjoutee },
    });

    return { success: true, quantiteAjoutee };
  } catch (error) {
    console.error(
      "Erreur lors de la mise à jour de la quantité en stock :",
      error
    );
    return { success: false };
  }
}
