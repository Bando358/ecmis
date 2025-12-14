"use server";

// Type d'entrée sans la relation Visite
import { ContreReference } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création d'une Fiche ContreRéférence
export const createContreReference = async (data: ContreReference) => {
  return await prisma.contreReference.create({
    data,
  });
};

// ************* Fiche ContreRéférence **************
export const getAllContreReference = async () => {
  const allReference = await prisma.contreReference.findMany({
    orderBy: { createdAt: "desc" },
  });
  return allReference;
};

// Récupération de Fiche ContreRéférence par ID
export const getAllContreReferenceByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allContreReference = await prisma.contreReference.findMany({
    where: { idClient: id },
  });
  return allContreReference;
};

// Récupération de une seul Fiche ContreRéférence
export const getOneContreReference = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneContreReference = await prisma.contreReference.findUnique({
    where: { id },
  });

  return oneContreReference;
};

// Suppression d'une Fiche ContreRéférence
export async function deleteContreReference(id: string) {
  return await prisma.contreReference.delete({
    where: { id },
  });
}

//Mise à jour de la Fiche ContreRéférence
export async function updateContreReference(id: string, data: ContreReference) {
  return await prisma.contreReference.update({
    where: { id },
    data,
  });
}
