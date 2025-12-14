"use server";

import { Clinique } from "@prisma/client";
import prisma from "../prisma";

// ************* Clinique **************
export const getAllClinique = async () => {
  const allRegion = await prisma.clinique.findMany({
    orderBy: { nomClinique: "desc" },
  });
  return allRegion;
};
// Création d'une région
export async function createClinique(data: Clinique) {
  return await prisma.clinique.create({
    data,
  });
}

// Récupération de une seul région
export const getOneClinique = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneClinique = await prisma.clinique.findUnique({
    where: { id },
  });

  return oneClinique;
};

//Mise à jour de la Région
export async function updateClinique(id: string, data: Clinique) {
  return await prisma.clinique.update({
    where: { id },
    data,
  });
}

export async function getAllCliniquesByUser(userId: string) {
  const userWithCliniques = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      cliniques: true, // ← relation définie dans le modèle User
    },
  });

  return userWithCliniques?.cliniques ?? [];
}
