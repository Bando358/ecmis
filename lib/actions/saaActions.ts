"use server";

import { Saa, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { SaaCreateSchema } from "@/lib/validations/clinical";
import { logAction } from "./journalPharmacyActions";

// Création d'une Fiche Saa
export async function createSaa(data: Saa) {
  await requirePermission(TableName.SAA, "canCreate");
  const validated = validateServerData(SaaCreateSchema, data);
  const result = await prisma.saa.create({
    data: validated,
  });
  await logAction({
    idUser: data.saaIdUser,
    action: "CREATION",
    entite: "Saa",
    entiteId: result.id,
    idClinique: data.saaIdClinique,
    description: `Création fiche SAA pour client ${data.saaIdClient}`,
  });
  return result;
}

// ************* Fiche Saa **************
export const getAllSaa = async () => {
  const allSaa = await prisma.saa.findMany({
    orderBy: { saaCreatedAt: "desc" },
  });
  return allSaa;
};

// Récupération de Fiche Saa par ID
export const getAllSaaByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allSaa = await prisma.saa.findMany({
    where: { saaIdClient: id },
  });
  return allSaa;
};

// Récupération de une seul Fiche Saa
export const getOneSaa = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneSaa = await prisma.saa.findUnique({
    where: { id },
  });

  return oneSaa;
};

// Suppression d'une Fiche Saa
export async function deleteSaa(id: string) {
  await requirePermission(TableName.SAA, "canDelete");
  const existing = await prisma.saa.findUnique({ where: { id }, select: { saaIdUser: true, saaIdClinique: true, saaIdClient: true } });
  const result = await prisma.saa.delete({
    where: { id },
  });
  if (existing) {
    await logAction({
      idUser: existing.saaIdUser,
      action: "SUPPRESSION",
      entite: "Saa",
      entiteId: id,
      idClinique: existing.saaIdClinique,
      description: `Suppression fiche SAA ${id} du client ${existing.saaIdClient}`,
    });
  }
  return result;
}

//Mise à jour de la Fiche Saa
export async function updateSaa(id: string, data: Saa) {
  await requirePermission(TableName.SAA, "canUpdate");
  const validated = validateServerData(SaaCreateSchema.partial(), data);
  const result = await prisma.saa.update({
    where: { id },
    data: validated,
  });
  await logAction({
    idUser: data.saaIdUser,
    action: "MODIFICATION",
    entite: "Saa",
    entiteId: id,
    idClinique: data.saaIdClinique,
    description: `Modification fiche SAA ${id}`,
  });
  return result;
}
