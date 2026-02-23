"use server";

import { TarifProduit } from "@prisma/client";
import prisma from "@/lib/prisma";
import { logAction } from "./journalPharmacyActions";

// Création de TarifProduit
export async function createTarifProduit(data: {
  prixUnitaire: number;
  quantiteStock: number;
  idProduit: string;
  idClinique: string;
  idUser: string;
}) {
  const result = await prisma.tarifProduit.create({
    data: {
      prixUnitaire: data.prixUnitaire,
      quantiteStock: data.quantiteStock,
      Produit: { connect: { id: data.idProduit } },
      Clinique: { connect: { id: data.idClinique } },
      User: { connect: { id: data.idUser } },
    },
  });
  await logAction({
    idUser: data.idUser,
    action: "CREATION",
    entite: "TarifProduit",
    entiteId: result.id,
    idClinique: data.idClinique,
    description: `Creation tarif produit: prix=${data.prixUnitaire} FCFA, stock=${data.quantiteStock}`,
    nouvellesDonnees: { prixUnitaire: data.prixUnitaire, quantiteStock: data.quantiteStock },
  });
  return result;
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

// Suppression d'un tarif produit
export async function deleteTarifProduit(id: string) {
  return await prisma.tarifProduit.delete({
    where: { id },
  });
}

//Mise à jour de TarifProduit
export async function updateTarifProduit(id: string, data: TarifProduit) {
  const oldRecord = await prisma.tarifProduit.findUnique({ where: { id } });
  const result = await prisma.tarifProduit.update({ where: { id }, data });
  await logAction({
    idUser: data.idUser,
    action: "MODIFICATION",
    entite: "TarifProduit",
    entiteId: id,
    idClinique: data.idClinique,
    description: `Modification tarif produit: prix=${data.prixUnitaire} FCFA, stock=${data.quantiteStock}`,
    anciennesDonnees: oldRecord ? { prixUnitaire: oldRecord.prixUnitaire, quantiteStock: oldRecord.quantiteStock } : null,
    nouvellesDonnees: { prixUnitaire: data.prixUnitaire, quantiteStock: data.quantiteStock },
  });
  return result;
}

export async function updateQuantiteStockTarifProduit(
  idTarifProduit: string,
  quantiteAjoutee: number
) {
  try {
    const tarif = await prisma.tarifProduit.findUnique({
      where: { id: idTarifProduit },
      select: { quantiteStock: true, idUser: true, idClinique: true },
    });

    if (!tarif) {
      throw new Error("Produit non trouvé");
    }

    await prisma.tarifProduit.update({
      where: { id: idTarifProduit },
      data: { quantiteStock: quantiteAjoutee },
    });

    await logAction({
      idUser: tarif.idUser,
      action: "MODIFICATION",
      entite: "TarifProduit",
      entiteId: idTarifProduit,
      idClinique: tarif.idClinique,
      description: `Ajustement stock: ${tarif.quantiteStock} -> ${quantiteAjoutee}`,
      anciennesDonnees: { quantiteStock: tarif.quantiteStock },
      nouvellesDonnees: { quantiteStock: quantiteAjoutee },
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
      select: { quantiteStock: true, idUser: true, idClinique: true },
    });

    if (!tarif) {
      throw new Error("Produit non trouvé");
    }

    const newStock = tarif.quantiteStock + quantiteAjoutee;
    await prisma.tarifProduit.update({
      where: { id: idTarifProduit },
      data: { quantiteStock: newStock },
    });

    await logAction({
      idUser: tarif.idUser,
      action: "MODIFICATION",
      entite: "TarifProduit",
      entiteId: idTarifProduit,
      idClinique: tarif.idClinique,
      description: `Approvisionnement stock: +${quantiteAjoutee} unites | ${tarif.quantiteStock} -> ${newStock}`,
      anciennesDonnees: { quantiteStock: tarif.quantiteStock },
      nouvellesDonnees: { quantiteStock: newStock },
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
      select: { quantiteStock: true, idUser: true, idClinique: true },
    });

    if (!tarif) {
      throw new Error("Produit non trouvé");
    }

    const newStock = tarif.quantiteStock - quantiteAjoutee;
    await prisma.tarifProduit.update({
      where: { id: idTarifProduit },
      data: { quantiteStock: newStock },
    });

    await logAction({
      idUser: tarif.idUser,
      action: "MODIFICATION",
      entite: "TarifProduit",
      entiteId: idTarifProduit,
      idClinique: tarif.idClinique,
      description: `Annulation commande: -${quantiteAjoutee} unites | ${tarif.quantiteStock} -> ${newStock}`,
      anciennesDonnees: { quantiteStock: tarif.quantiteStock },
      nouvellesDonnees: { quantiteStock: newStock },
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
