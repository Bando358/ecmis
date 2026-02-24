"use server";

import { Vbg, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { VbgCreateSchema } from "@/lib/validations/clinical";
import { logAction } from "./journalPharmacyActions";

// Création d'une Fiche Vbg
export async function createVbg(data: Vbg) {
  await requirePermission(TableName.VBG, "canCreate");
  const validated = validateServerData(VbgCreateSchema, data);
  const result = await prisma.vbg.create({
    data: validated,
  });
  await logAction({
    idUser: data.vbgIdUser,
    action: "CREATION",
    entite: "Vbg",
    entiteId: result.id,
    idClinique: data.vbgIdClinique,
    description: `Création fiche VBG pour client ${data.vbgIdClient}`,
  });
  return result;
}

// ************* Fiche Vbg **************
export const getAllVbg = async () => {
  const allVbg = await prisma.vbg.findMany({
    orderBy: { vbgCreatedAt: "desc" },
  });
  return allVbg;
};

// Récupération de Fiche Vbg par ID
export const getAllVbgByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allVbg = await prisma.vbg.findMany({
    where: { vbgIdClient: id },
  });
  return allVbg;
};

// Récupération de une seul Fiche Vbg
export const getOneVbg = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneVbg = await prisma.vbg.findUnique({
    where: { id },
  });

  return oneVbg;
};

// Suppression d'une Fiche Vbg
export async function deleteVbg(id: string) {
  await requirePermission(TableName.VBG, "canDelete");
  const existing = await prisma.vbg.findUnique({ where: { id }, select: { vbgIdUser: true, vbgIdClinique: true, vbgIdClient: true } });
  const result = await prisma.vbg.delete({
    where: { id },
  });
  if (existing) {
    await logAction({
      idUser: existing.vbgIdUser,
      action: "SUPPRESSION",
      entite: "Vbg",
      entiteId: id,
      idClinique: existing.vbgIdClinique,
      description: `Suppression fiche VBG ${id} du client ${existing.vbgIdClient}`,
    });
  }
  return result;
}

//Mise à jour de la Fiche Vbg
export async function updateVbg(id: string, data: Vbg) {
  await requirePermission(TableName.VBG, "canUpdate");
  const validated = validateServerData(VbgCreateSchema.partial(), data);
  const result = await prisma.vbg.update({
    where: { id },
    data: validated,
  });
  await logAction({
    idUser: data.vbgIdUser,
    action: "MODIFICATION",
    entite: "Vbg",
    entiteId: id,
    idClinique: data.vbgIdClinique,
    description: `Modification fiche VBG ${id}`,
  });
  return result;
}
