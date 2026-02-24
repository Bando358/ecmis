"use server";

import { FactureEchographie, Prisma, TableName } from "@prisma/client";
import { normalizePagination, buildPaginatedResult, type PaginatedResult, type PaginationParams } from "./paginationHelper";
import prisma from "@/lib/prisma";
import { logAction } from "./journalPharmacyActions";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { FactureEchographieCreateSchema } from "@/lib/validations/finance";

// Création de FactureEchographie
export async function createFactureEchographie(data: FactureEchographie) {
  await requirePermission(TableName.FACTURE_ECHOGRAPHIE, "canCreate");
  const validated = validateServerData(FactureEchographieCreateSchema, data);
  const result = await prisma.factureEchographie.create({ data: validated });
  await logAction({
    idUser: data.idUser,
    action: "CREATION",
    entite: "FactureEchographie",
    entiteId: result.id,
    idClinique: data.idClinique,
    description: `Facturation echographie: ${data.libelleEchographie} - ${data.prixEchographie} FCFA`,
    nouvellesDonnees: { libelleEchographie: data.libelleEchographie, prixEchographie: data.prixEchographie, remiseEchographie: data.remiseEchographie },
  });
  return result;
}

// Récupérer toutes les FactureEchographie
export async function getAllFactureEchographieByIdClient(idClient: string) {
  return await prisma.factureEchographie.findMany({
    where: { idClient: idClient },
  });
}

// Récupérer toutes les FactureEchographie
export async function getAllFactureEchographie() {
  return await prisma.factureEchographie.findMany();
}
// Suppression d'une FactureEchographie
export async function deleteFactureEchographie(id: string) {
  await requirePermission(TableName.FACTURE_ECHOGRAPHIE, "canDelete");
  const existing = await prisma.factureEchographie.findUnique({ where: { id } });
  const result = await prisma.factureEchographie.delete({ where: { id } });
  if (existing) {
    await logAction({
      idUser: existing.idUser,
      action: "SUPPRESSION",
      entite: "FactureEchographie",
      entiteId: id,
      idClinique: existing.idClinique,
      description: `Suppression echographie: ${existing.libelleEchographie} - ${existing.prixEchographie} FCFA`,
      anciennesDonnees: { libelleEchographie: existing.libelleEchographie, prixEchographie: existing.prixEchographie },
    });
  }
  return result;
}

//Mise à jour de FactureEchographie
export async function updateFactureEchographie(
  id: string,
  data: FactureEchographie
) {
  await requirePermission(TableName.FACTURE_ECHOGRAPHIE, "canUpdate");
  const validated = validateServerData(FactureEchographieCreateSchema.partial(), data);
  const oldRecord = await prisma.factureEchographie.findUnique({ where: { id } });
  const result = await prisma.factureEchographie.update({ where: { id }, data: validated });
  await logAction({
    idUser: data.idUser,
    action: "MODIFICATION",
    entite: "FactureEchographie",
    entiteId: id,
    idClinique: data.idClinique,
    description: `Modification echographie: ${data.libelleEchographie}`,
    anciennesDonnees: oldRecord ? { libelleEchographie: oldRecord.libelleEchographie, prixEchographie: oldRecord.prixEchographie } : null,
    nouvellesDonnees: { libelleEchographie: data.libelleEchographie, prixEchographie: data.prixEchographie },
  });
  return result;
}

// Récupérer toutes les FactureEchographie par idVisite
export async function getAllFactureEchographieByIdVisite(idVisite: string) {
  return await prisma.factureEchographie.findMany({
    where: { idVisite: idVisite },
    orderBy: { idVisite: "desc" },
  });
}

// ************* FactureEchographie paginée **************
export async function getFactureEchographiesPaginated(
  params?: PaginationParams & { idClinique?: string }
): Promise<PaginatedResult<FactureEchographie>> {
  const { skip, take, validPage, validPageSize } = normalizePagination(params);
  const where: Prisma.FactureEchographieWhereInput = {};
  if (params?.idClinique) where.idClinique = params.idClinique;

  const [data, total] = await Promise.all([
    prisma.factureEchographie.findMany({ where, skip, take, orderBy: { id: "desc" } }),
    prisma.factureEchographie.count({ where }),
  ]);

  return buildPaginatedResult(data, total, validPage, validPageSize);
}
