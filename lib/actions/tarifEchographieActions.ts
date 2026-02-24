"use server";

import { TarifEchographie, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { TarifEchographieCreateSchema } from "@/lib/validations/labo";

// Création de TarifEchographie
export async function createTarifEchographie(data: TarifEchographie) {
  await requirePermission(TableName.TARIF_ECHOGRAPHIE, "canCreate");
  const validated = validateServerData(TarifEchographieCreateSchema, data);
  return await prisma.tarifEchographie.create({
    data: validated,
  });
}

// Récupérer toutes les TarifEchographie
export async function getAllTarifEchographie() {
  return await prisma.tarifEchographie.findMany({
    orderBy: {
      nomEchographie: "desc",
    },
  });
}

// Récupérer toutes les TarifEchographie par clinique
export async function getAllTarifEchographieByClinique(cliniqueId: string) {
  return await prisma.tarifEchographie.findMany({
    where: { idClinique: cliniqueId },
    orderBy: {
      nomEchographie: "asc",
    },
  });
}

// Récupérer un seul TarifEchographie
export async function getOneTarifEchographie(id: string) {
  return await prisma.tarifEchographie.findUnique({
    where: { id },
  });
}

// Suppression d'un TarifEchographie
export async function deleteTarifEchographie(id: string) {
  await requirePermission(TableName.TARIF_ECHOGRAPHIE, "canDelete");
  return await prisma.tarifEchographie.delete({
    where: { id },
  });
}

//Mise à jour de TarifEchographie
export async function updateTarifEchographie(
  id: string,
  data: TarifEchographie
) {
  await requirePermission(TableName.TARIF_ECHOGRAPHIE, "canUpdate");
  const validated = validateServerData(TarifEchographieCreateSchema.partial(), data);
  return await prisma.tarifEchographie.update({
    where: { id },
    data: validated,
  });
}
