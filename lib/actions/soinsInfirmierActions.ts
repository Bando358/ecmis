"use server";

import { Prisma, SoinsInfirmier, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { normalizePagination, buildPaginatedResult, type PaginatedResult, type PaginationParams } from "./paginationHelper";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { SoinsInfirmierCreateSchema } from "@/lib/validations/clinical";
import { logAction } from "./journalPharmacyActions";

// Création d'une fiche Soins Infirmiers
export async function createSoinsInfirmier(data: SoinsInfirmier) {
  await requirePermission(TableName.SOINS_INFIRMIER, "canCreate");
  const validated = validateServerData(SoinsInfirmierCreateSchema, data);
  const result = await prisma.soinsInfirmier.create({ data: validated });
  await logAction({
    idUser: data.idUser,
    action: "CREATION",
    entite: "SoinsInfirmier",
    entiteId: result.id,
    idClinique: data.idClinique,
    description: `Création fiche Soins Infirmiers (${data.typeSoin}) pour client ${data.idClient}`,
    nouvellesDonnees: { typeSoin: data.typeSoin, observations: data.observations },
  });
  return result;
}

// Récupérer toutes les fiches Soins Infirmiers
export const getAllSoinsInfirmier = async () => {
  return await prisma.soinsInfirmier.findMany({
    orderBy: { createdAt: "desc" },
  });
};

// Récupérer toutes les fiches Soins Infirmiers d'un client
export const getAllSoinsInfirmierByIdClient = async (id: string | null) => {
  if (!id) return [];
  return await prisma.soinsInfirmier.findMany({
    where: { idClient: id },
    orderBy: { createdAt: "desc" },
  });
};

// Récupérer une seule fiche Soins Infirmiers
export const getOneSoinsInfirmier = async (id: string | null) => {
  if (!id) return null;
  return await prisma.soinsInfirmier.findUnique({ where: { id } });
};

// Suppression d'une fiche Soins Infirmiers
export async function deleteSoinsInfirmier(id: string) {
  await requirePermission(TableName.SOINS_INFIRMIER, "canDelete");
  const existing = await prisma.soinsInfirmier.findUnique({
    where: { id },
    select: { idUser: true, idClinique: true, idClient: true, typeSoin: true },
  });
  const result = await prisma.soinsInfirmier.delete({ where: { id } });
  if (existing) {
    await logAction({
      idUser: existing.idUser,
      action: "SUPPRESSION",
      entite: "SoinsInfirmier",
      entiteId: id,
      idClinique: existing.idClinique,
      description: `Suppression fiche Soins Infirmiers (${existing.typeSoin}) du client ${existing.idClient}`,
      anciennesDonnees: { typeSoin: existing.typeSoin },
    });
  }
  return result;
}

// Mise à jour d'une fiche Soins Infirmiers
export async function updateSoinsInfirmier(id: string, data: SoinsInfirmier) {
  await requirePermission(TableName.SOINS_INFIRMIER, "canUpdate");
  const validated = validateServerData(SoinsInfirmierCreateSchema.partial(), data);
  const oldRecord = await prisma.soinsInfirmier.findUnique({ where: { id } });
  const result = await prisma.soinsInfirmier.update({ where: { id }, data: validated });
  await logAction({
    idUser: data.idUser,
    action: "MODIFICATION",
    entite: "SoinsInfirmier",
    entiteId: id,
    idClinique: data.idClinique,
    description: `Modification fiche Soins Infirmiers ${id}`,
    anciennesDonnees: oldRecord ? { typeSoin: oldRecord.typeSoin, observations: oldRecord.observations } : null,
    nouvellesDonnees: { typeSoin: data.typeSoin, observations: data.observations },
  });
  return result;
}

// Récupérer toutes les fiches Soins Infirmiers d'une visite
export const getAllSoinsInfirmierByIdVisite = async (idVisite: string | null) => {
  if (!idVisite) return [];
  return await prisma.soinsInfirmier.findMany({
    where: { idVisite },
    orderBy: { createdAt: "desc" },
  });
};

// ************* Soins Infirmiers paginés **************
export async function getSoinsInfirmierPaginated(
  params?: PaginationParams & { idClinique?: string; dateDebut?: Date; dateFin?: Date }
): Promise<PaginatedResult<SoinsInfirmier>> {
  const { skip, take, validPage, validPageSize } = normalizePagination(params);
  const where: Prisma.SoinsInfirmierWhereInput = {};
  if (params?.idClinique) where.idClinique = params.idClinique;
  if (params?.dateDebut || params?.dateFin) {
    where.createdAt = {};
    if (params?.dateDebut) where.createdAt.gte = params.dateDebut;
    if (params?.dateFin) where.createdAt.lte = params.dateFin;
  }

  const [data, total] = await Promise.all([
    prisma.soinsInfirmier.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
    prisma.soinsInfirmier.count({ where }),
  ]);

  return buildPaginatedResult(data, total, validPage, validPageSize);
}

// Récupérer toutes les fiches Soins Infirmiers d'un ensemble de visites (rapports)
export async function getSoinsInfirmierByVisiteIds(idVisiteList: string[]) {
  if (!Array.isArray(idVisiteList) || idVisiteList.length === 0) return [];
  return await prisma.soinsInfirmier.findMany({
    where: { idVisite: { in: idVisiteList } },
  });
}

// ************* Soins Infirmiers enrichis pour le rapport SIG **************
// Renvoie chaque enregistrement avec les données client (age/sexe) déjà résolues,
// afin que le composant tableau puisse les agréger directement par tranche d'âge.
export type SoinsInfirmierForReport = {
  id: string;
  idVisite: string;
  idClient: string;
  typeSoin: string;
  age: number;
  sexe: string;
  dateVisite: Date | null;
};

export async function getSoinsInfirmierForReport(
  clinicIds: string[],
  dateDebut: Date,
  dateFin: Date,
): Promise<SoinsInfirmierForReport[]> {
  if (!clinicIds || clinicIds.length === 0) return [];

  const soins = await prisma.soinsInfirmier.findMany({
    where: {
      idClinique: { in: clinicIds },
      Visite: {
        dateVisite: { gte: dateDebut, lte: dateFin },
      },
    },
    include: {
      Client: { select: { dateNaissance: true, sexe: true } },
      Visite: { select: { dateVisite: true } },
    },
  });

  const calcAge = (dob: Date): number => {
    const diff = Date.now() - new Date(dob).getTime();
    return Math.abs(new Date(diff).getUTCFullYear() - 1970);
  };

  return soins.map((s) => ({
    id: s.id,
    idVisite: s.idVisite,
    idClient: s.idClient,
    typeSoin: s.typeSoin,
    age: s.Client?.dateNaissance ? calcAge(s.Client.dateNaissance) : 0,
    sexe: s.Client?.sexe ?? "",
    dateVisite: s.Visite?.dateVisite ?? null,
  }));
}
