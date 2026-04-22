"use server";

import { FactureProduit, Prisma, TableName } from "@prisma/client";
import { normalizePagination, buildPaginatedResult, type PaginatedResult, type PaginationParams } from "./paginationHelper";
import prisma from "@/lib/prisma";
import { logAction } from "./journalPharmacyActions";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { FactureProduitCreateSchema } from "@/lib/validations/finance";

// Création de FactureProduit
export async function createFactureProduit(data: FactureProduit) {
  await requirePermission(TableName.FACTURE_PRODUIT, "canCreate");
  const validated = validateServerData(FactureProduitCreateSchema, data);
  const result = await prisma.factureProduit.create({ data: validated });
  await logAction({
    idUser: data.idUser,
    action: "CREATION",
    entite: "FactureProduit",
    entiteId: result.id,
    idClinique: data.idClinique,
    description: `Vente produit: ${data.nomProduit} (x${data.quantite}) - ${data.montantProduit} FCFA`,
    nouvellesDonnees: { nomProduit: data.nomProduit, quantite: data.quantite, montantProduit: data.montantProduit },
  });
  return result;
}

// Récupérer toutes les FactureProduit par idVisite
export async function getAllFactureProduitByIdVisite(idVisite: string) {
  return await prisma.factureProduit.findMany({
    where: { idVisite: idVisite },
    orderBy: { idVisite: "desc" },
  });
}

// Récupérer toutes les FactureProduit par idClient
export async function getAllFactureProduitByIdClient(idClient: string) {
  return await prisma.factureProduit.findMany({
    where: { idClient: idClient },
    orderBy: { idClient: "desc" },
  });
}
// Récupérer toutes les FactureProduit
export async function getAllFactureProduit() {
  return await prisma.factureProduit.findMany();
}
// Récupérer toutes les FactureProduit par idVisite via data (ClientData)
type ClientData = { idVisite: string };

export async function getAllFactureProduitByIdVisiteByData(data: ClientData[]) {
  const idVisiteList = data.map((client) => client.idVisite);
  return await prisma.factureProduit.findMany({
    where: { idVisite: { in: idVisiteList } },
  });
}
// Suppression d'une FactureProduit
export async function deleteFactureProduit(id: string) {
  await requirePermission(TableName.FACTURE_PRODUIT, "canDelete");
  const existing = await prisma.factureProduit.findUnique({ where: { id } });
  const result = await prisma.factureProduit.delete({ where: { id } });
  if (existing) {
    await logAction({
      idUser: existing.idUser,
      action: "SUPPRESSION",
      entite: "FactureProduit",
      entiteId: id,
      idClinique: existing.idClinique,
      description: `Suppression vente produit: ${existing.nomProduit} (x${existing.quantite})`,
      anciennesDonnees: { nomProduit: existing.nomProduit, quantite: existing.quantite, montantProduit: existing.montantProduit },
    });
  }
  return result;
}

//Mise à jour de FactureProduit
export async function updateFactureProduit(id: string, data: FactureProduit) {
  await requirePermission(TableName.FACTURE_PRODUIT, "canUpdate");
  const validated = validateServerData(FactureProduitCreateSchema.partial(), data);
  const oldRecord = await prisma.factureProduit.findUnique({ where: { id } });
  const result = await prisma.factureProduit.update({ where: { id }, data: validated });
  await logAction({
    idUser: data.idUser,
    action: "MODIFICATION",
    entite: "FactureProduit",
    entiteId: id,
    idClinique: data.idClinique,
    description: `Modification vente produit: ${data.nomProduit}`,
    anciennesDonnees: oldRecord ? { nomProduit: oldRecord.nomProduit, quantite: oldRecord.quantite, montantProduit: oldRecord.montantProduit } : null,
    nouvellesDonnees: { nomProduit: data.nomProduit, quantite: data.quantite, montantProduit: data.montantProduit },
  });
  return result;
}

export async function updateProduitByFactureProduit(
  idProduit: string,
  quantiteProduit: number
) {
  await requirePermission(TableName.FACTURE_PRODUIT, "canUpdate");
  try {
    // Opération atomique : décrémentation + vérification stock >= 0 en une seule query
    const updatedProduit = await prisma.tarifProduit.update({
      where: { id: idProduit },
      data: { quantiteStock: { decrement: quantiteProduit } },
    });

    // Vérifier que le stock n'est pas devenu négatif (rollback si nécessaire)
    if (updatedProduit.quantiteStock < 0) {
      // Remettre le stock à sa valeur précédente
      await prisma.tarifProduit.update({
        where: { id: idProduit },
        data: { quantiteStock: { increment: quantiteProduit } },
      });
      throw new Error("Stock insuffisant");
    }

    await logAction({
      idUser: updatedProduit.idUser,
      action: "MODIFICATION",
      entite: "TarifProduit",
      entiteId: idProduit,
      idClinique: updatedProduit.idClinique,
      description: `Decrement stock: -${quantiteProduit} unites (vente) -> ${updatedProduit.quantiteStock}`,
      nouvellesDonnees: { quantiteStock: updatedProduit.quantiteStock },
    });

    return updatedProduit;
  } catch (error) {
    console.error("Erreur lors de la mise à jour du produit:", error);
    throw error;
  }
}

// ************* FactureProduit paginée **************
export async function getFactureProduitsPaginated(
  params?: PaginationParams & { idClinique?: string; dateDebut?: Date; dateFin?: Date }
): Promise<PaginatedResult<FactureProduit>> {
  const { skip, take, validPage, validPageSize } = normalizePagination(params);
  const where: Prisma.FactureProduitWhereInput = {};
  if (params?.idClinique) where.idClinique = params.idClinique;
  if (params?.dateDebut || params?.dateFin) {
    where.dateFacture = {};
    if (params?.dateDebut) where.dateFacture.gte = params.dateDebut;
    if (params?.dateFin) where.dateFacture.lte = params.dateFin;
  }

  const [data, total] = await Promise.all([
    prisma.factureProduit.findMany({ where, skip, take, orderBy: { dateFacture: "desc" } }),
    prisma.factureProduit.count({ where }),
  ]);

  return buildPaginatedResult(data, total, validPage, validPageSize);
}

// Liste des factures produit PF (méthode de contraception) avec données client,
// visite et prescripteur, filtrée par cliniques + période.
export type FactureProduitPfItem = {
  id: string;
  dateFacture: Date;
  nomProduit: string;
  quantite: number;
  montantProduit: number;
  clientCode: string;
  clientNom: string;
  clientPrenom: string;
  clientAge: number;
  clientSexe: string;
  clinique: string;
  prescripteur: string;
  idVisite: string;
  dateVisite: Date | null;
};

export async function getFactureProduitPfByClinique(
  clinicIds: string[],
  dateDebut: Date,
  dateFin: Date,
): Promise<FactureProduitPfItem[]> {
  if (!clinicIds || clinicIds.length === 0) return [];

  const factures = await prisma.factureProduit.findMany({
    where: {
      idClinique: { in: clinicIds },
      methode: true,
      dateFacture: { gte: dateDebut, lte: dateFin },
    },
    include: {
      Client: true,
      Clinique: { select: { nomClinique: true } },
      User: { select: { name: true } },
      Visite: { select: { dateVisite: true } },
    },
    orderBy: [{ nomProduit: "asc" }, { dateFacture: "desc" }],
  });

  const calcAge = (dob: Date): number => {
    const diff = Date.now() - new Date(dob).getTime();
    return Math.abs(new Date(diff).getUTCFullYear() - 1970);
  };

  return factures.map((f) => ({
    id: f.id,
    dateFacture: f.dateFacture,
    nomProduit: f.nomProduit,
    quantite: f.quantite,
    montantProduit: f.montantProduit,
    clientCode: f.Client?.code ?? "",
    clientNom: f.Client?.nom ?? "",
    clientPrenom: f.Client?.prenom ?? "",
    clientAge: f.Client?.dateNaissance ? calcAge(f.Client.dateNaissance) : 0,
    clientSexe: f.Client?.sexe ?? "",
    clinique: f.Clinique?.nomClinique ?? "",
    prescripteur: f.User?.name ?? "",
    idVisite: f.idVisite,
    dateVisite: f.Visite?.dateVisite ?? null,
  }));
}
