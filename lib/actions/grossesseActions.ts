"use server";

import { Grossesse, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { GrossesseCreateSchema } from "@/lib/validations/clinical";
import { logAction } from "./journalPharmacyActions";

// Création d'une Fiche Grossesse
export async function createGrossesse(data: Grossesse) {
  await requirePermission(TableName.GROSSESSE, "canCreate");
  const validated = validateServerData(GrossesseCreateSchema, data);
  const result = await prisma.grossesse.create({
    data: validated,
  });
  await logAction({
    idUser: data.grossesseIdUser,
    action: "CREATION",
    entite: "Grossesse",
    entiteId: result.id,
    idClinique: data.grossesseIdClinique,
    description: `Création fiche Grossesse pour client ${data.grossesseIdClient}`,
  });
  return result;
}

// ************* Fiche Grossesse **************
export const getAllGrossesse = async () => {
  const allGrossesse = await prisma.grossesse.findMany({
    orderBy: { grossesseCreatedAt: "desc" },
  });
  return allGrossesse;
};

// Récupération de Fiche Grossesse par ID
export const getAllGrossesseByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allGrossesse = await prisma.grossesse.findMany({
    where: { grossesseIdClient: id },
  });
  return allGrossesse;
};

// Récupération de une seul Fiche Grossesse
export const getOneGrossesse = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneGrossesse = await prisma.grossesse.findUnique({
    where: { id },
  });

  return oneGrossesse;
};

// Suppression d'une Fiche Grossesse
export async function deleteGrossesse(id: string) {
  await requirePermission(TableName.GROSSESSE, "canDelete");
  const existing = await prisma.grossesse.findUnique({ where: { id }, select: { grossesseIdUser: true, grossesseIdClinique: true, grossesseIdClient: true } });
  const result = await prisma.grossesse.delete({
    where: { id },
  });
  if (existing) {
    await logAction({
      idUser: existing.grossesseIdUser,
      action: "SUPPRESSION",
      entite: "Grossesse",
      entiteId: id,
      idClinique: existing.grossesseIdClinique,
      description: `Suppression fiche Grossesse ${id} du client ${existing.grossesseIdClient}`,
    });
  }
  return result;
}

//Mise à jour de la Fiche Grossesse
export async function updateGrossesse(id: string, data: Grossesse) {
  await requirePermission(TableName.GROSSESSE, "canUpdate");
  const validated = validateServerData(GrossesseCreateSchema.partial(), data);
  const result = await prisma.grossesse.update({
    where: { id },
    data: validated,
  });
  await logAction({
    idUser: data.grossesseIdUser,
    action: "MODIFICATION",
    entite: "Grossesse",
    entiteId: id,
    idClinique: data.grossesseIdClinique,
    description: `Modification fiche Grossesse ${id}`,
  });
  return result;
}
