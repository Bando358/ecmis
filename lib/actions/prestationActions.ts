"use server";

import { Prestation, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { PrestationCreateSchema } from "@/lib/validations/finance";
import { logAction } from "./journalPharmacyActions";

// Création de Prestation
export async function createPrestation(data: Prestation) {
  await requirePermission(TableName.PRESTATION, "canCreate");
  const validated = validateServerData(PrestationCreateSchema, data);
  const prestation = await prisma.prestation.create({
    data: validated,
  });
  await logAction({
    idUser: validated.idUser,
    action: "CREATION",
    entite: "Prestation",
    entiteId: prestation.id,
    description: `Création prestation: ${validated.nomPrestation}`,
  });
  return prestation;
}

// Récupérer toutes les Prestation
export async function getAllPrestation() {
  return await prisma.prestation.findMany();
}
// Suppression d'une prestation
export async function deletePrestation(id: string) {
  await requirePermission(TableName.PRESTATION, "canDelete");
  const existing = await prisma.prestation.findUnique({ where: { id } });
  if (existing) {
    await logAction({
      idUser: existing.idUser,
      action: "SUPPRESSION",
      entite: "Prestation",
      entiteId: id,
      description: `Suppression prestation: ${existing.nomPrestation}`,
      anciennesDonnees: existing as unknown as Record<string, unknown>,
    });
  }
  return await prisma.prestation.delete({
    where: { id },
  });
}

//Mise à jour de prestation
export async function updatePrestation(id: string, data: Prestation) {
  await requirePermission(TableName.PRESTATION, "canUpdate");
  const validated = validateServerData(PrestationCreateSchema.partial(), data);
  const updated = await prisma.prestation.update({
    where: { id },
    data: validated,
  });
  await logAction({
    idUser: data.idUser,
    action: "MODIFICATION",
    entite: "Prestation",
    entiteId: id,
    description: `Modification prestation: ${data.nomPrestation}`,
    nouvellesDonnees: validated as unknown as Record<string, unknown>,
  });
  return updated;
}
