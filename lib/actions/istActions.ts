"use server";

import { Ist, Prisma, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { normalizePagination, buildPaginatedResult, type PaginatedResult, type PaginationParams } from "./paginationHelper";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { IstCreateSchema } from "@/lib/validations/clinical";
import { logAction } from "./journalPharmacyActions";

// Création d'une Fiche IST
export async function createIst(data: Ist) {
  await requirePermission(TableName.IST, "canCreate");
  const validated = validateServerData(IstCreateSchema, data);
  // Remove idUser, idClient, idVisite, istIdClinique from data before spreading
  const { istIdClient, istIdUser, istIdVisite, istIdClinique, ...rest } = validated;
  const result = await prisma.ist.create({
    data: {
      ...rest,
      User: { connect: { id: istIdUser } },
      Client: { connect: { id: istIdClient } },
      Visite: { connect: { id: istIdVisite } },
      Clinique: { connect: { id: istIdClinique } },
    },
  });
  await logAction({
    idUser: istIdUser,
    action: "CREATION",
    entite: "Ist",
    entiteId: result.id,
    idClinique: istIdClinique,
    description: `Création fiche IST pour client ${istIdClient}`,
  });
  return result;
}

// ************* Fiche IST **************
export const getAllIst = async () => {
  const allIst = await prisma.ist.findMany({
    orderBy: { istCreatedAt: "desc" },
  });
  return allIst;
};

// Récupération de Fiche IST par ID
export const getAllIstByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allIst = await prisma.ist.findMany({
    where: { istIdClient: id },
  });
  return allIst;
};

// Récupération de une seul Fiche ist
export const getOneIst = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneIst = await prisma.ist.findUnique({
    where: { id },
  });

  return oneIst;
};

// Suppression d'une Fiche IST
export async function deleteIst(id: string) {
  await requirePermission(TableName.IST, "canDelete");
  const existing = await prisma.ist.findUnique({ where: { id }, select: { istIdUser: true, istIdClinique: true, istIdClient: true } });
  const result = await prisma.ist.delete({
    where: { id },
  });
  if (existing) {
    await logAction({
      idUser: existing.istIdUser,
      action: "SUPPRESSION",
      entite: "Ist",
      entiteId: id,
      idClinique: existing.istIdClinique,
      description: `Suppression fiche IST ${id} du client ${existing.istIdClient}`,
    });
  }
  return result;
}

//Mise à jour de la Fiche IST
export async function updateIst(id: string, data: Ist) {
  await requirePermission(TableName.IST, "canUpdate");
  const validated = validateServerData(IstCreateSchema.partial(), data);
  const result = await prisma.ist.update({
    where: { id },
    data: validated,
  });
  await logAction({
    idUser: data.istIdUser,
    action: "MODIFICATION",
    entite: "Ist",
    entiteId: id,
    idClinique: data.istIdClinique,
    description: `Modification fiche IST ${id}`,
  });
  return result;
}

// ************* IST paginée **************
export async function getIstPaginated(
  params?: PaginationParams & { istIdClinique?: string }
): Promise<PaginatedResult<Ist>> {
  const { skip, take, validPage, validPageSize } = normalizePagination(params);
  const where: Prisma.IstWhereInput = {};
  if (params?.istIdClinique) where.istIdClinique = params.istIdClinique;

  const [data, total] = await Promise.all([
    prisma.ist.findMany({ where, skip, take, orderBy: { istCreatedAt: "desc" } }),
    prisma.ist.count({ where }),
  ]);

  return buildPaginatedResult(data, total, validPage, validPageSize);
}
