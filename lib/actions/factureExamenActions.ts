"use server";

import { FactureExamen, Prisma, TableName } from "@prisma/client";
import { normalizePagination, buildPaginatedResult, type PaginatedResult, type PaginationParams } from "./paginationHelper";
import prisma from "@/lib/prisma";
import { logAction } from "./journalPharmacyActions";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { FactureExamenCreateSchema } from "@/lib/validations/finance";

// Création de FactureExamen
export async function createFactureExamen(data: FactureExamen) {
  await requirePermission(TableName.FACTURE_EXAMEN, "canCreate");
  const validated = validateServerData(FactureExamenCreateSchema, data);
  const result = await prisma.factureExamen.create({ data: validated });
  await logAction({
    idUser: data.idUser,
    action: "CREATION",
    entite: "FactureExamen",
    entiteId: result.id,
    idClinique: data.idClinique,
    description: `Facturation examen: ${data.libelleExamen} - ${data.prixExamen} FCFA`,
    nouvellesDonnees: { libelleExamen: data.libelleExamen, prixExamen: data.prixExamen, remiseExamen: data.remiseExamen },
  });
  return result;
}

// Récupérer toutes les FactureExamen
export async function getAllFactureExamenByIdClient(idClient: string) {
  return await prisma.factureExamen.findMany({
    where: { idClient: idClient },
  });
}

// Récupérer toutes les FactureExamen
export async function getAllFactureExamen() {
  return await prisma.factureExamen.findMany();
}
// Suppression d'une FactureExamen
export async function deleteFactureExamen(id: string) {
  await requirePermission(TableName.FACTURE_EXAMEN, "canDelete");
  const existing = await prisma.factureExamen.findUnique({ where: { id } });
  const result = await prisma.factureExamen.delete({ where: { id } });
  if (existing) {
    await logAction({
      idUser: existing.idUser,
      action: "SUPPRESSION",
      entite: "FactureExamen",
      entiteId: id,
      idClinique: existing.idClinique,
      description: `Suppression examen: ${existing.libelleExamen} - ${existing.prixExamen} FCFA`,
      anciennesDonnees: { libelleExamen: existing.libelleExamen, prixExamen: existing.prixExamen },
    });
  }
  return result;
}

//Mise à jour de FactureExamen
export async function updateFactureExamen(id: string, data: FactureExamen) {
  await requirePermission(TableName.FACTURE_EXAMEN, "canUpdate");
  const validated = validateServerData(FactureExamenCreateSchema.partial(), data);
  const oldRecord = await prisma.factureExamen.findUnique({ where: { id } });
  const result = await prisma.factureExamen.update({ where: { id }, data: validated });
  await logAction({
    idUser: data.idUser,
    action: "MODIFICATION",
    entite: "FactureExamen",
    entiteId: id,
    idClinique: data.idClinique,
    description: `Modification examen: ${data.libelleExamen}`,
    anciennesDonnees: oldRecord ? { libelleExamen: oldRecord.libelleExamen, prixExamen: oldRecord.prixExamen } : null,
    nouvellesDonnees: { libelleExamen: data.libelleExamen, prixExamen: data.prixExamen },
  });
  return result;
}

// Récupérer toutes les FactureExamen par idVisite
export async function getAllFactureExamenByIdVisite(idVisite: string) {
  return await prisma.factureExamen.findMany({
    where: { idVisite: idVisite },
    orderBy: { idVisite: "desc" },
  });
}

// ************* FactureExamen paginée **************
export async function getFactureExamensPaginated(
  params?: PaginationParams & { idClinique?: string }
): Promise<PaginatedResult<FactureExamen>> {
  const { skip, take, validPage, validPageSize } = normalizePagination(params);
  const where: Prisma.FactureExamenWhereInput = {};
  if (params?.idClinique) where.idClinique = params.idClinique;

  const [data, total] = await Promise.all([
    prisma.factureExamen.findMany({ where, skip, take, orderBy: { id: "desc" } }),
    prisma.factureExamen.count({ where }),
  ]);

  return buildPaginatedResult(data, total, validPage, validPageSize);
}
