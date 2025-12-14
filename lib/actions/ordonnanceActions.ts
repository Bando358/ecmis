"use server";

// Type d'entrée sans la relation Visite
import { Ordonnance } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création d'une Fiche Ordonnance
export const createOrdonnance = async (data: Ordonnance) => {
  return await prisma.ordonnance.create({
    data,
  });
};

// ************* Fiche Ordonnance **************
export const getAllOrdonnance = async () => {
  const allOrdonnance = await prisma.ordonnance.findMany({
    orderBy: { ordonnanceCreatedAt: "desc" },
  });
  return allOrdonnance;
};

// Récupération de Fiche Ordonnance par ID
export const getAllOrdonnanceByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allOrdonnance = await prisma.ordonnance.findMany({
    where: { ordonnanceIdClient: id },
  });
  return allOrdonnance;
};

// Récupération de une seul Fiche Ordonnance
export const getOneOrdonnance = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneOrdonnance = await prisma.ordonnance.findUnique({
    where: { id },
  });

  return oneOrdonnance;
};

// Suppression d'une Fiche Ordonnance
export async function deleteOrdonnance(id: string) {
  return await prisma.ordonnance.delete({
    where: { id },
  });
}

//Mise à jour de la Fiche Ordonnance
export async function updateOrdonnance(id: string, data: Ordonnance) {
  return await prisma.ordonnance.update({
    where: { id },
    data,
  });
}
