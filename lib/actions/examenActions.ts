"use server";

import { Examen, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";

// Création de Examen
export async function createExamen(data: Examen) {
  await requirePermission(TableName.EXAMEN, "canCreate");
  return await prisma.examen.create({
    data,
  });
}

// Récupérer toutes les Examen
export async function getAllExamen() {
  return await prisma.examen.findMany({
    orderBy: {
      typeExamen: "desc",
    },
  });
}

// Récupérer un seul Examen
export async function getOneExamen(id: string) {
  return await prisma.examen.findUnique({
    where: { id },
  });
}

// Suppression d'un examen
export async function deleteExamen(id: string) {
  await requirePermission(TableName.EXAMEN, "canDelete");
  return await prisma.examen.delete({
    where: { id },
  });
}

//Mise à jour de examen
export async function updateExamen(id: string, data: Examen) {
  await requirePermission(TableName.EXAMEN, "canUpdate");
  return await prisma.examen.update({
    where: { id },
    data,
  });
}
