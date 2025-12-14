"use server";

// Type d'entrée sans la relation Visite
import { Reference } from "@prisma/client";
import prisma from "@/lib/prisma";
type ReferenceCreateInput = Omit<Reference, "Visite">;

// Création d'une Fiche Référence
export const createReference = async (data: ReferenceCreateInput) => {
  try {
    // Valider que les relations obligatoires existent
    const visiteExists = await prisma.visite.findUnique({
      where: { id: data.refIdVisite },
    });

    const clientExists = await prisma.client.findUnique({
      where: { id: data.idClient },
    });

    if (!visiteExists) {
      throw new Error(`La visite avec l'ID ${data.refIdVisite} n'existe pas`);
    }

    if (!clientExists) {
      throw new Error(`Le client avec l'ID ${data.idClient} n'existe pas`);
    }

    // Créer la référence avec les IDs directs
    const newReference = await prisma.reference.create({
      data,
    });

    return newReference;
  } catch (error) {
    console.error("Erreur lors de la création de la référence:", error);
    throw error;
  }
};

// ************* Fiche Référence **************
export const getAllReference = async () => {
  const allReference = await prisma.reference.findMany({
    orderBy: { createdAt: "desc" },
  });
  return allReference;
};

// Récupération de Fiche Référence par ID
export const getAllReferenceByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allReference = await prisma.reference.findMany({
    where: { idClient: id },
  });
  return allReference;
};

// Récupération de une seul Fiche Référence
export const getOneReference = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneReference = await prisma.reference.findUnique({
    where: { id },
  });

  return oneReference;
};

// Suppression d'une Fiche Référence
export async function deleteReference(id: string) {
  return await prisma.reference.delete({
    where: { id },
  });
}

//Mise à jour de la Fiche Référence
export async function updateReference(id: string, data: Reference) {
  return await prisma.reference.update({
    where: { id },
    data,
  });
}
