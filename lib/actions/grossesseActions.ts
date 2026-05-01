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

// Renvoie la grossesse "en cours" pour ce client si elle existe.
// Le blocage de création d'une nouvelle grossesse n'est levé que par :
//   - un accouchement enregistré
//   - un soin après avortement (SAA) enregistré
//   - un terme prévu dépassé (termePrevu < aujourd'hui)
// Une grossesse est donc encore "en cours" si :
//   - grossesseInterruption === false
//   - ET aucun Accouchement
//   - ET aucun Saa
//   - ET (termePrevu null OU termePrevu >= aujourd'hui)
export const getOngoingGrossesseByIdClient = async (
  idClient: string | null,
) => {
  if (!idClient) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const candidates = await prisma.grossesse.findMany({
    where: {
      grossesseIdClient: idClient,
      grossesseInterruption: false,
      Accouchement: { none: {} },
      Saa: { none: {} },
      OR: [{ termePrevu: null }, { termePrevu: { gte: today } }],
    },
    orderBy: { grossesseCreatedAt: "desc" },
    take: 1,
  });
  return candidates[0] ?? null;
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
