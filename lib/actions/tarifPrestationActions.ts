"use server";

import { TarifPrestation, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";

// Création de TarifPrestation
export async function createTarifPrestation(data: TarifPrestation) {
  await requirePermission(TableName.TARIF_PRESTATION, "canCreate");
  return await prisma.tarifPrestation.create({
    data,
  });
}

// Récupérer toutes les TarifPrestation
export async function getAllTarifPrestation() {
  return await prisma.tarifPrestation.findMany();
}

// Récupérer les TarifPrestation par clinique
export async function getAllTarifPrestationByClinique(cliniqueId: string) {
  return await prisma.tarifPrestation.findMany({
    where: { idClinique: cliniqueId },
  });
}
// Suppression d'un client
export async function deleteTarifPrestation(id: string) {
  await requirePermission(TableName.TARIF_PRESTATION, "canDelete");
  return await prisma.tarifPrestation.delete({
    where: { id },
  });
}

//Mise à jour de TarifPrestation
export async function updateTarifPrestation(id: string, data: TarifPrestation) {
  await requirePermission(TableName.TARIF_PRESTATION, "canUpdate");
  return await prisma.tarifPrestation.update({
    where: { id },
    data,
  });
}
