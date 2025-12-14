"use server";

import { Examen } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création de Examen
export async function createExamen(data: Examen) {
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
  return await prisma.examen.delete({
    where: { id },
  });
}

//Mise à jour de examen
export async function updateExamen(id: string, data: Examen) {
  return await prisma.examen.update({
    where: { id },
    data,
  });
}
