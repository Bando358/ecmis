"use server";

import { Region } from "@prisma/client";
import prisma from "../prisma";

// ************* Clinique **************
export const getAllRegion = async () => {
  const allRegion = await prisma.region.findMany({
    orderBy: { nomRegion: "desc" },
  });
  return allRegion;
};
// Création d'une région
export async function createRegion(data: Region) {
  return await prisma.region.create({
    data,
  });
}

// Récupération de une seul région
export const getOneRegion = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneRegion = await prisma.region.findUnique({
    where: { id },
  });

  return oneRegion;
};

//Mise à jour de la Région
export async function updateRegion(id: string, data: Region) {
  return await prisma.region.update({
    where: { id },
    data,
  });
}
