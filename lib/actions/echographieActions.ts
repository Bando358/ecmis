"use server";

import { Echographie } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création de Echographie
export async function createEchographie(data: Echographie) {
  return await prisma.echographie.create({
    data,
  });
}

// Récupérer toutes les Echographies
export async function getAllEchographies() {
  return await prisma.echographie.findMany({
    orderBy: {
      nomEchographie: "desc",
    },
  });
}

// Récupérer un seul Echographie
export async function getOneEchographie(id: string) {
  return await prisma.echographie.findUnique({
    where: { id },
  });
}

// Suppression d'un echographie
export async function deleteEchographie(id: string) {
  return await prisma.echographie.delete({
    where: { id },
  });
}

//Mise à jour de echographie
export async function updateEchographie(id: string, data: Echographie) {
  return await prisma.echographie.update({
    where: { id },
    data,
  });
}
