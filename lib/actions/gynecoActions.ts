"use server";

import { Gynecologie, Prisma, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { normalizePagination, buildPaginatedResult, type PaginatedResult, type PaginationParams } from "./paginationHelper";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { GynecologieCreateSchema } from "@/lib/validations/clinical";
import { logAction } from "./journalPharmacyActions";

// Création d'une Fiche Gynécologique
export async function createGyneco(data: Gynecologie) {
  await requirePermission(TableName.GYNECOLOGIE, "canCreate");
  const validated = validateServerData(GynecologieCreateSchema, data);
  const result = await prisma.gynecologie.create({
    data: validated,
  });
  await logAction({
    idUser: data.idUser,
    action: "CREATION",
    entite: "Gynecologie",
    entiteId: result.id,
    idClinique: data.idClinique,
    description: `Création fiche Gynécologie pour client ${data.idClient}`,
  });
  return result;
}

// ************* Fiche Gynécologique **************
export const getAllGyneco = async () => {
  const allGynecologie = await prisma.gynecologie.findMany({
    orderBy: { createdAt: "desc" },
  });
  return allGynecologie;
};

// Récupération de Fiche Gynécologique par ID
export const getAllGynecoByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allGynecologie = await prisma.gynecologie.findMany({
    where: { idClient: id },
  });
  return allGynecologie;
};

// Récupération de une seul Fiche Gynécologique
export const getOneGyneco = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneGynecologie = await prisma.gynecologie.findUnique({
    where: { id },
  });

  return oneGynecologie;
};

// Suppression d'une Fiche Gynécologique
export async function deleteGyneco(id: string) {
  await requirePermission(TableName.GYNECOLOGIE, "canDelete");
  const existing = await prisma.gynecologie.findUnique({ where: { id }, select: { idUser: true, idClinique: true, idClient: true } });
  const result = await prisma.gynecologie.delete({
    where: { id },
  });
  if (existing) {
    await logAction({
      idUser: existing.idUser,
      action: "SUPPRESSION",
      entite: "Gynecologie",
      entiteId: id,
      idClinique: existing.idClinique,
      description: `Suppression fiche Gynécologie ${id} du client ${existing.idClient}`,
    });
  }
  return result;
}

//Mise à jour de la Fiche Gynécologique
export async function updateGyneco(id: string, data: Gynecologie) {
  await requirePermission(TableName.GYNECOLOGIE, "canUpdate");
  const validated = validateServerData(GynecologieCreateSchema.partial(), data);
  const result = await prisma.gynecologie.update({
    where: { id },
    data: validated,
  });
  await logAction({
    idUser: data.idUser,
    action: "MODIFICATION",
    entite: "Gynecologie",
    entiteId: id,
    idClinique: data.idClinique,
    description: `Modification fiche Gynécologie ${id}`,
  });
  return result;
}

// ************* Gynécologie paginée **************
export async function getGynecoPaginated(
  params?: PaginationParams & { idClinique?: string }
): Promise<PaginatedResult<Gynecologie>> {
  const { skip, take, validPage, validPageSize } = normalizePagination(params);
  const where: Prisma.GynecologieWhereInput = {};
  if (params?.idClinique) where.idClinique = params.idClinique;

  const [data, total] = await Promise.all([
    prisma.gynecologie.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
    prisma.gynecologie.count({ where }),
  ]);

  return buildPaginatedResult(data, total, validPage, validPageSize);
}
