"use server";

import { Gynecologie } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création d'une Fiche Gynécologique
export async function createGyneco(data: Gynecologie) {
  return await prisma.gynecologie.create({
    data,
  });
}

// ************* Fiche Gynécologique **************
export const getAllGyneco = async () => {
  const allGynecologie = await prisma.gynecologie.findMany({
    orderBy: { createdAt: "desc" },
  });
  return allGynecologie;
};

// Récupération de Fiche Gynécologique par ID
export const getAllGynecoByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allGynecologie = await prisma.gynecologie.findMany({
    where: { idClient: id },
  });
  return allGynecologie;
};

// Récupération de une seul Fiche Gynécologique
export const getOneGyneco = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneGynecologie = await prisma.gynecologie.findUnique({
    where: { id },
  });

  return oneGynecologie;
};

// Suppression d'une Fiche Gynécologique
export async function deleteGyneco(id: string) {
  return await prisma.gynecologie.delete({
    where: { id },
  });
}

//Mise à jour de la Fiche Gynécologique
export async function updateGyneco(id: string, data: Gynecologie) {
  return await prisma.gynecologie.update({
    where: { id },
    data,
  });
}
