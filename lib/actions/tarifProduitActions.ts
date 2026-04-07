"use server";

import { TarifProduit, Prisma, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { normalizePagination, buildPaginatedResult, type PaginatedResult, type PaginationParams } from "./paginationHelper";
import { logAction } from "./journalPharmacyActions";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { TarifProduitCreateSchema } from "@/lib/validations/finance";

// Création de TarifProduit
export async function createTarifProduit(data: {
  prixUnitaire: number;
  quantiteStock: number;
  idProduit: string;
  idClinique: string;
  idUser: string;
}) {
  await requirePermission(TableName.TARIF_PRODUIT, "canCreate");
  const validated = validateServerData(TarifProduitCreateSchema, data);
  const result = await prisma.tarifProduit.create({
    data: {
      prixUnitaire: validated.prixUnitaire,
      quantiteStock: validated.quantiteStock,
      Produit: { connect: { id: validated.idProduit } },
      Clinique: { connect: { id: validated.idClinique } },
      User: { connect: { id: validated.idUser } },
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
  await requirePermission(TableName.TARIF_PRODUIT, "canDelete");
  return await prisma.tarifProduit.delete({
    where: { id },
  });
}

//Mise à jour de TarifProduit
export async function updateTarifProduit(id: string, data: TarifProduit) {
  await requirePermission(TableName.TARIF_PRODUIT, "canUpdate");
  const validated = validateServerData(TarifProduitCreateSchema.partial(), data);
  const oldRecord = await prisma.tarifProduit.findUnique({ where: { id } });
  const result = await prisma.tarifProduit.update({ where: { id }, data: validated });
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
  await requirePermission(TableName.TARIF_PRODUIT, "canUpdate");
  try {
    const tarif = await prisma.tarifProduit.findUnique({
      where: { id: idTarifProduit },
      select: { quantiteStock: true, idUser: true, idClinique: true },
    });

    if (!tarif) {
      throw new Error("Produit non trouvé");
    }

    const updated = await prisma.tarifProduit.update({
      where: { id: idTarifProduit },
      data: { quantiteStock: { increment: quantiteAjoutee } },
    });

    await logAction({
      idUser: tarif.idUser,
      action: "MODIFICATION",
      entite: "TarifProduit",
      entiteId: idTarifProduit,
      idClinique: tarif.idClinique,
      description: `Restauration stock: +${quantiteAjoutee} unites -> ${updated.quantiteStock}`,
      anciennesDonnees: { quantiteStock: tarif.quantiteStock },
      nouvellesDonnees: { quantiteStock: updated.quantiteStock },
    });

    return { success: true, quantiteAjoutee, nouveauStock: updated.quantiteStock };
  } catch (error) {
    console.error(
      "Erreur lors de la mise à jour de la quantité en stock :",
      error
    );
    return { success: false };
  }
}
// SET absolu du stock (utilisé par l'inventaire pour ajuster à la quantité réelle)
export async function setQuantiteStockTarifProduit(
  idTarifProduit: string,
  nouvelleQuantite: number
) {
  await requirePermission(TableName.TARIF_PRODUIT, "canUpdate");
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
      data: { quantiteStock: nouvelleQuantite },
    });

    await logAction({
      idUser: tarif.idUser,
      action: "MODIFICATION",
      entite: "TarifProduit",
      entiteId: idTarifProduit,
      idClinique: tarif.idClinique,
      description: `Ajustement inventaire: ${tarif.quantiteStock} -> ${nouvelleQuantite}`,
      anciennesDonnees: { quantiteStock: tarif.quantiteStock },
      nouvellesDonnees: { quantiteStock: nouvelleQuantite },
    });

    return { success: true, nouvelleQuantite };
  } catch (error) {
    console.error(
      "Erreur lors de l'ajustement du stock par inventaire :",
      error
    );
    return { success: false };
  }
}

export async function updateQuantiteStockTarifProduitByDetailCommande(
  idTarifProduit: string,
  quantiteAjoutee: number
) {
  await requirePermission(TableName.TARIF_PRODUIT, "canUpdate");
  try {
    // Opération atomique pour éviter les race conditions
    const updated = await prisma.tarifProduit.update({
      where: { id: idTarifProduit },
      data: { quantiteStock: { increment: quantiteAjoutee } },
      select: { quantiteStock: true, idUser: true, idClinique: true },
    });

    await logAction({
      idUser: updated.idUser,
      action: "MODIFICATION",
      entite: "TarifProduit",
      entiteId: idTarifProduit,
      idClinique: updated.idClinique,
      description: `Approvisionnement stock: +${quantiteAjoutee} unites -> ${updated.quantiteStock}`,
      nouvellesDonnees: { quantiteStock: updated.quantiteStock },
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
  await requirePermission(TableName.TARIF_PRODUIT, "canUpdate");
  try {
    // Opération atomique pour éviter les race conditions
    const updated = await prisma.tarifProduit.update({
      where: { id: idTarifProduit },
      data: { quantiteStock: { decrement: quantiteAjoutee } },
      select: { quantiteStock: true, idUser: true, idClinique: true },
    });

    await logAction({
      idUser: updated.idUser,
      action: "MODIFICATION",
      entite: "TarifProduit",
      entiteId: idTarifProduit,
      idClinique: updated.idClinique,
      description: `Annulation commande: -${quantiteAjoutee} unites -> ${updated.quantiteStock}`,
      nouvellesDonnees: { quantiteStock: updated.quantiteStock },
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

// ************* TarifProduit paginé **************
export async function getTarifProduitsPaginated(
  params?: PaginationParams & { idClinique?: string }
): Promise<PaginatedResult<TarifProduit>> {
  const { skip, take, validPage, validPageSize } = normalizePagination(params);
  const where: Prisma.TarifProduitWhereInput = {};
  if (params?.idClinique) where.idClinique = params.idClinique;

  const [data, total] = await Promise.all([
    prisma.tarifProduit.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
    prisma.tarifProduit.count({ where }),
  ]);

  return buildPaginatedResult(data, total, validPage, validPageSize);
}
