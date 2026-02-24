"use server";

import { ExamenPvVih, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { ExamenPvVihCreateSchema } from "@/lib/validations/clinical";
import { logAction } from "./journalPharmacyActions";

// Création de Examen
export async function createExamenPvVih(data: ExamenPvVih) {
  await requirePermission(TableName.PEC_VIH, "canCreate");
  const validated = validateServerData(ExamenPvVihCreateSchema, data);
  const result = await prisma.examenPvVih.create({
    data: validated,
  });
  await logAction({
    idUser: data.examenPvVihIdUser,
    action: "CREATION",
    entite: "ExamenPvVih",
    entiteId: result.id,
    idClinique: data.examenPvVihIdClinique,
    description: `Création fiche Examen PV VIH pour client ${data.examenPvVihIdClient}`,
  });
  return result;
}

// Récupérer toutes les ExamenPvVih
export async function getAllExamenPvVih() {
  return await prisma.examenPvVih.findMany({
    orderBy: {
      examenPvVihCreatedAt: "desc",
    },
  });
}

// Récupérer  toutes les ExamenPvVih par ID client
export async function getAllExamenPvVihByIdClient(clientId: string) {
  return await prisma.examenPvVih.findMany({
    where: { examenPvVihIdClient: clientId },
    orderBy: {
      examenPvVihCreatedAt: "desc",
    },
  });
}

// Récupérer un seul ExamenPvVih
export async function getOneExamenPvVih(id: string) {
  return await prisma.examenPvVih.findUnique({
    where: { id },
  });
}

// Suppression d'un ExamenPvVih
export async function deleteExamenPvVih(id: string) {
  await requirePermission(TableName.PEC_VIH, "canDelete");
  const existing = await prisma.examenPvVih.findUnique({ where: { id }, select: { examenPvVihIdUser: true, examenPvVihIdClinique: true, examenPvVihIdClient: true } });
  const result = await prisma.examenPvVih.delete({
    where: { id },
  });
  if (existing) {
    await logAction({
      idUser: existing.examenPvVihIdUser,
      action: "SUPPRESSION",
      entite: "ExamenPvVih",
      entiteId: id,
      idClinique: existing.examenPvVihIdClinique,
      description: `Suppression fiche Examen PV VIH ${id} du client ${existing.examenPvVihIdClient}`,
    });
  }
  return result;
}

//Mise à jour de ExamenPvVih
export async function updateExamenPvVih(id: string, data: ExamenPvVih) {
  await requirePermission(TableName.PEC_VIH, "canUpdate");
  const validated = validateServerData(ExamenPvVihCreateSchema.partial(), data);
  const result = await prisma.examenPvVih.update({
    where: { id },
    data: validated,
  });
  await logAction({
    idUser: data.examenPvVihIdUser,
    action: "MODIFICATION",
    entite: "ExamenPvVih",
    entiteId: id,
    idClinique: data.examenPvVihIdClinique,
    description: `Modification fiche Examen PV VIH ${id}`,
  });
  return result;
}
