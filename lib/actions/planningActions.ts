"use server";

import { Planning } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création d'une Planning
export async function createPlanning(data: Planning) {
  return await prisma.planning.create({
    data,
  });
}

// ************* Planning **************
export const getAllPlanning = async () => {
  const allPlanning = await prisma.planning.findMany({
    orderBy: { createdAt: "desc" },
  });
  return allPlanning;
};

// Récupération de Planning par ID
export const getAllPlanningByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allPlanning = await prisma.planning.findMany({
    where: { idClient: id },
  });
  return allPlanning;
};

// Récupération de une seul Planning
export const getOnePlanning = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const onePlanning = await prisma.planning.findUnique({
    where: { id },
  });

  return onePlanning;
};

// Suppression d'un Planning
export async function deletePlanning(id: string) {
  return await prisma.planning.delete({
    where: { id },
  });
}

//Mise à jour de la Planning
export async function updatePlanning(id: string, data: Planning) {
  return await prisma.planning.update({
    where: { id },
    data,
  });
}
