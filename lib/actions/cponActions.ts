"use server";

import { Cpon, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";

// Création d'une Fiche CPoN
export async function createCpon(data: Cpon) {
  await requirePermission(TableName.CPON, "canCreate");
  return await prisma.cpon.create({
    data,
  });
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
  return await prisma.cpon.delete({
    where: { id },
  });
}

//Mise à jour de la Fiche CPoN
export async function updateCpon(id: string, data: Cpon) {
  await requirePermission(TableName.CPON, "canUpdate");
  return await prisma.cpon.update({
    where: { id },
    data,
  });
}
