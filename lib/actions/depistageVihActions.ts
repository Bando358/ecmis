"use server";
// depistageVihActions.ts
import { DepistageVih, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { DepistageVihCreateSchema } from "@/lib/validations/clinical";
import { logAction } from "./journalPharmacyActions";

// Création d'une Fiche de Dépistage VIH
export async function createDepistageVih(data: DepistageVih) {
  await requirePermission(TableName.DEPISTAGE_VIH, "canCreate");
  const validated = validateServerData(DepistageVihCreateSchema, data);
  const result = await prisma.depistageVih.create({
    data: validated,
  });
  await logAction({
    idUser: data.depistageVihIdUser,
    action: "CREATION",
    entite: "DepistageVih",
    entiteId: result.id,
    idClinique: data.depistageVihIdClinique,
    description: `Création fiche Dépistage VIH pour client ${data.depistageVihIdClient}`,
  });
  return result;
}

// ************* Fiche de Dépistage VIH **************
export const getAllDepistageVih = async () => {
  const allDepistageVih = await prisma.depistageVih.findMany({
    orderBy: { depistageVihCreatedAt: "desc" },
  });
  return allDepistageVih;
};

// Récupération de Fiche de Dépistage VIH par ID
export const getAllDepistageVihByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allDepistageVih = await prisma.depistageVih.findMany({
    where: { depistageVihIdClient: id },
  });
  return allDepistageVih;
};

// Récupération de une seul Fiche de Dépistage VIH
export const getOneDepistageVih = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneDepistageVih = await prisma.depistageVih.findUnique({
    where: { id },
  });

  return oneDepistageVih;
};

// Suppression d'une Fiche de Dépistage VIH
export async function deleteDepistageVih(id: string) {
  await requirePermission(TableName.DEPISTAGE_VIH, "canDelete");
  const existing = await prisma.depistageVih.findUnique({ where: { id }, select: { depistageVihIdUser: true, depistageVihIdClinique: true, depistageVihIdClient: true } });
  const result = await prisma.depistageVih.delete({
    where: { id },
  });
  if (existing) {
    await logAction({
      idUser: existing.depistageVihIdUser,
      action: "SUPPRESSION",
      entite: "DepistageVih",
      entiteId: id,
      idClinique: existing.depistageVihIdClinique,
      description: `Suppression fiche Dépistage VIH ${id} du client ${existing.depistageVihIdClient}`,
    });
  }
  return result;
}

//Mise à jour de la Fiche de Dépistage VIH
export async function updateDepistageVih(id: string, data: DepistageVih) {
  await requirePermission(TableName.DEPISTAGE_VIH, "canUpdate");
  const validated = validateServerData(DepistageVihCreateSchema.partial(), data);
  const result = await prisma.depistageVih.update({
    where: { id },
    data: validated,
  });
  await logAction({
    idUser: data.depistageVihIdUser,
    action: "MODIFICATION",
    entite: "DepistageVih",
    entiteId: id,
    idClinique: data.depistageVihIdClinique,
    description: `Modification fiche Dépistage VIH ${id}`,
  });
  return result;
}
