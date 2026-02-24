"use server";

import { Infertilite, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { InfertiliteCreateSchema } from "@/lib/validations/clinical";
import { logAction } from "./journalPharmacyActions";

// Création d'une Fiche Infertilité
export async function createInfertilite(data: Infertilite) {
  await requirePermission(TableName.INFERTILITE, "canCreate");
  const validated = validateServerData(InfertiliteCreateSchema, data);
  const result = await prisma.infertilite.create({
    data: validated,
  });
  await logAction({
    idUser: data.infertIdUser,
    action: "CREATION",
    entite: "Infertilite",
    entiteId: result.id,
    idClinique: data.infertIdClinique,
    description: `Création fiche Infertilité pour client ${data.infertIdClient}`,
  });
  return result;
}

// ************* Fiche Infertilité **************
export const getAllInfertilite = async () => {
  const allInfertilite = await prisma.infertilite.findMany({
    orderBy: { infertCreatedAt: "desc" },
  });
  return allInfertilite;
};

// Récupération de Fiche Infertilité par ID
export const getAllInfertiliteByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allInfertilite = await prisma.infertilite.findMany({
    where: { infertIdClient: id },
  });
  return allInfertilite;
};

// Récupération de une seul Fiche Infertilité
export const getOneInfertilite = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneInfertilite = await prisma.infertilite.findUnique({
    where: { id },
  });

  return oneInfertilite;
};

// Suppression d'une Fiche Infertilité
export async function deleteInfertilite(id: string) {
  await requirePermission(TableName.INFERTILITE, "canDelete");
  const existing = await prisma.infertilite.findUnique({ where: { id }, select: { infertIdUser: true, infertIdClinique: true, infertIdClient: true } });
  const result = await prisma.infertilite.delete({
    where: { id },
  });
  if (existing) {
    await logAction({
      idUser: existing.infertIdUser,
      action: "SUPPRESSION",
      entite: "Infertilite",
      entiteId: id,
      idClinique: existing.infertIdClinique,
      description: `Suppression fiche Infertilité ${id} du client ${existing.infertIdClient}`,
    });
  }
  return result;
}

//Mise à jour de la Fiche Infertilité
export async function updateInfertilite(id: string, data: Infertilite) {
  await requirePermission(TableName.INFERTILITE, "canUpdate");
  const validated = validateServerData(InfertiliteCreateSchema.partial(), data);
  const result = await prisma.infertilite.update({
    where: { id },
    data: validated,
  });
  await logAction({
    idUser: data.infertIdUser,
    action: "MODIFICATION",
    entite: "Infertilite",
    entiteId: id,
    idClinique: data.infertIdClinique,
    description: `Modification fiche Infertilité ${id}`,
  });
  return result;
}
