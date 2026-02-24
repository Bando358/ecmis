"use server";

import { Medecine, Prisma, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { normalizePagination, buildPaginatedResult, type PaginatedResult, type PaginationParams } from "./paginationHelper";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { MedecineCreateSchema } from "@/lib/validations/clinical";
import { logAction } from "./journalPharmacyActions";

// Création d'une Fiche Medecine
export async function createMedecine(data: Medecine) {
  await requirePermission(TableName.MEDECINE, "canCreate");
  const validated = validateServerData(MedecineCreateSchema, data);
  const result = await prisma.medecine.create({
    data: validated,
  });
  await logAction({
    idUser: data.mdgIdUser,
    action: "CREATION",
    entite: "Medecine",
    entiteId: result.id,
    idClinique: data.mdgIdClinique,
    description: `Création fiche Médecine pour client ${data.mdgIdClient}`,
  });
  return result;
}

// ************* Fiche Medecine **************
export const getAllMedecine = async () => {
  const allMedecine = await prisma.medecine.findMany({
    orderBy: { mdgCreatedAt: "desc" },
  });
  return allMedecine;
};

// Récupération de Fiche Medecine par ID
export const getAllMedecineByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allMedecine = await prisma.medecine.findMany({
    where: { mdgIdClient: id },
  });
  return allMedecine;
};

// Récupération de une seul Fiche Medecine
export const getOneMedecine = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneMedecine = await prisma.medecine.findUnique({
    where: { id },
  });

  return oneMedecine;
};

// Suppression d'une Fiche Medecine
export async function deleteMedecine(id: string) {
  await requirePermission(TableName.MEDECINE, "canDelete");
  const existing = await prisma.medecine.findUnique({ where: { id }, select: { mdgIdUser: true, mdgIdClinique: true, mdgIdClient: true } });
  const result = await prisma.medecine.delete({
    where: { id },
  });
  if (existing) {
    await logAction({
      idUser: existing.mdgIdUser,
      action: "SUPPRESSION",
      entite: "Medecine",
      entiteId: id,
      idClinique: existing.mdgIdClinique,
      description: `Suppression fiche Médecine ${id} du client ${existing.mdgIdClient}`,
    });
  }
  return result;
}

//Mise à jour de la Fiche Medecine
export async function updateMedecine(id: string, data: Medecine) {
  await requirePermission(TableName.MEDECINE, "canUpdate");
  const validated = validateServerData(MedecineCreateSchema.partial(), data);
  const result = await prisma.medecine.update({
    where: { id },
    data: validated,
  });
  await logAction({
    idUser: data.mdgIdUser,
    action: "MODIFICATION",
    entite: "Medecine",
    entiteId: id,
    idClinique: data.mdgIdClinique,
    description: `Modification fiche Médecine ${id}`,
  });
  return result;
}

// ************* Médecine paginée **************
export async function getMedecinePaginated(
  params?: PaginationParams & { mdgIdClinique?: string }
): Promise<PaginatedResult<Medecine>> {
  const { skip, take, validPage, validPageSize } = normalizePagination(params);
  const where: Prisma.MedecineWhereInput = {};
  if (params?.mdgIdClinique) where.mdgIdClinique = params.mdgIdClinique;

  const [data, total] = await Promise.all([
    prisma.medecine.findMany({ where, skip, take, orderBy: { mdgCreatedAt: "desc" } }),
    prisma.medecine.count({ where }),
  ]);

  return buildPaginatedResult(data, total, validPage, validPageSize);
}
