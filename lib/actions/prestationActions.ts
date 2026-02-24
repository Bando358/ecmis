"use server";

import { Prestation, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";

// Création de Prestation
export async function createPrestation(data: Prestation) {
  await requirePermission(TableName.PRESTATION, "canCreate");
  return await prisma.prestation.create({
    data,
  });
}

// Récupérer toutes les Prestation
export async function getAllPrestation() {
  return await prisma.prestation.findMany();
}
// Suppression d'un client
export async function deletePrestation(id: string) {
  await requirePermission(TableName.PRESTATION, "canDelete");
  return await prisma.prestation.delete({
    where: { id },
  });
}

//Mise à jour de prestation
export async function updatePrestation(id: string, data: Prestation) {
  await requirePermission(TableName.PRESTATION, "canUpdate");
  return await prisma.prestation.update({
    where: { id },
    data,
  });
}
