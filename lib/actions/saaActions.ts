"use server";

import { Saa } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création d'une Fiche Saa
export async function createSaa(data: Saa) {
  return await prisma.saa.create({
    data,
  });
}

// ************* Fiche Saa **************
export const getAllSaa = async () => {
  const allSaa = await prisma.saa.findMany({
    orderBy: { saaCreatedAt: "desc" },
  });
  return allSaa;
};

// Récupération de Fiche Saa par ID
export const getAllSaaByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allSaa = await prisma.saa.findMany({
    where: { saaIdClient: id },
  });
  return allSaa;
};

// Récupération de une seul Fiche Saa
export const getOneSaa = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneSaa = await prisma.saa.findUnique({
    where: { id },
  });

  return oneSaa;
};

// Suppression d'une Fiche Saa
export async function deleteSaa(id: string) {
  return await prisma.saa.delete({
    where: { id },
  });
}

//Mise à jour de la Fiche Saa
export async function updateSaa(id: string, data: Saa) {
  return await prisma.saa.update({
    where: { id },
    data,
  });
}
