"use server";

import { Planning, Prisma, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { normalizePagination, buildPaginatedResult, type PaginatedResult, type PaginationParams } from "./paginationHelper";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { PlanningCreateSchema } from "@/lib/validations";
import { logAction } from "./journalPharmacyActions";

// Création d'une Planning
export async function createPlanning(data: Planning) {
  await requirePermission(TableName.PLANNING, "canCreate");
  validateServerData(PlanningCreateSchema, data);
  const planning = await prisma.planning.create({
    data,
  });
  await logAction({
    idUser: data.idUser,
    action: "CREATION",
    entite: "Planning",
    entiteId: planning.id,
    idClinique: data.idClinique,
    description: `Création planning pour client ${data.idClient} - type: ${data.typeContraception}`,
  });
  return planning;
}

// ************* Planning **************
export const getAllPlanning = async () => {
  const allPlanning = await prisma.planning.findMany({
    orderBy: { createdAt: "desc" },
  });
  return allPlanning;
};

// Récupération de Planning par ID
export const getAllPlanningByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allPlanning = await prisma.planning.findMany({
    where: { idClient: id },
  });
  return allPlanning;
};

// Récupération de une seul Planning
export const getOnePlanning = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const onePlanning = await prisma.planning.findUnique({
    where: { id },
  });

  return onePlanning;
};

// Suppression d'un Planning
export async function deletePlanning(id: string) {
  await requirePermission(TableName.PLANNING, "canDelete");
  const existing = await prisma.planning.findUnique({ where: { id } });
  if (existing) {
    await logAction({
      idUser: existing.idUser,
      action: "SUPPRESSION",
      entite: "Planning",
      entiteId: id,
      idClinique: existing.idClinique,
      description: `Suppression planning pour client ${existing.idClient} - type: ${existing.typeContraception}`,
      anciennesDonnees: existing as unknown as Record<string, unknown>,
    });
  }
  return await prisma.planning.delete({
    where: { id },
  });
}

//Mise à jour de la Planning
export async function updatePlanning(id: string, data: Planning) {
  await requirePermission(TableName.PLANNING, "canUpdate");
  validateServerData(PlanningCreateSchema, data);
  const updated = await prisma.planning.update({
    where: { id },
    data,
  });
  await logAction({
    idUser: data.idUser,
    action: "MODIFICATION",
    entite: "Planning",
    entiteId: id,
    idClinique: data.idClinique,
    description: `Modification planning pour client ${data.idClient} - type: ${data.typeContraception}`,
    nouvellesDonnees: data as unknown as Record<string, unknown>,
  });
  return updated;
}

// ************* Planning paginé **************
export async function getPlanningsPaginated(
  params?: PaginationParams & { idClinique?: string }
): Promise<PaginatedResult<Planning>> {
  const { skip, take, validPage, validPageSize } = normalizePagination(params);
  const where: Prisma.PlanningWhereInput = {};
  if (params?.idClinique) where.idClinique = params.idClinique;

  const [data, total] = await Promise.all([
    prisma.planning.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
    prisma.planning.count({ where }),
  ]);

  return buildPaginatedResult(data, total, validPage, validPageSize);
}
