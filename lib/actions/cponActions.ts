"use server";

import { Cpon, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { CponCreateSchema } from "@/lib/validations/clinical";
import { logAction } from "./journalPharmacyActions";

// Création d'une Fiche CPoN
export async function createCpon(data: Cpon) {
  await requirePermission(TableName.CPON, "canCreate");
  const validated = validateServerData(CponCreateSchema, data);
  const result = await prisma.cpon.create({
    data: validated,
  });
  await logAction({
    idUser: data.cponIdUser,
    action: "CREATION",
    entite: "Cpon",
    entiteId: result.id,
    idClinique: data.cponIdClinique,
    description: `Création fiche CPoN pour client ${data.cponIdClient}`,
  });
  return result;
}

// ************* Fiche CPoN **************
export const getAllCpon = async () => {
  const allCpon = await prisma.cpon.findMany({
    orderBy: { cponCreatedAt: "desc" },
  });
  return allCpon;
};

// Récupération de Fiche CPoN par ID
export const getAllCponByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allCpon = await prisma.cpon.findMany({
    where: { cponIdClient: id },
  });
  return allCpon;
};

// Récupération de une seul Fiche CPoN
export const getOneCpon = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneCpon = await prisma.cpon.findUnique({
    where: { id },
  });

  return oneCpon;
};

// Suppression d'une Fiche CPoN
export async function deleteCpon(id: string) {
  await requirePermission(TableName.CPON, "canDelete");
  const existing = await prisma.cpon.findUnique({ where: { id }, select: { cponIdUser: true, cponIdClinique: true, cponIdClient: true } });
  const result = await prisma.cpon.delete({
    where: { id },
  });
  if (existing) {
    await logAction({
      idUser: existing.cponIdUser,
      action: "SUPPRESSION",
      entite: "Cpon",
      entiteId: id,
      idClinique: existing.cponIdClinique,
      description: `Suppression fiche CPoN ${id} du client ${existing.cponIdClient}`,
    });
  }
  return result;
}

//Mise à jour de la Fiche CPoN
export async function updateCpon(id: string, data: Cpon) {
  await requirePermission(TableName.CPON, "canUpdate");
  const validated = validateServerData(CponCreateSchema.partial(), data);
  const result = await prisma.cpon.update({
    where: { id },
    data: validated,
  });
  await logAction({
    idUser: data.cponIdUser,
    action: "MODIFICATION",
    entite: "Cpon",
    entiteId: id,
    idClinique: data.cponIdClinique,
    description: `Modification fiche CPoN ${id}`,
  });
  return result;
}
