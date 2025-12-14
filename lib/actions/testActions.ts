"use server";

import { TestGrossesse } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création d'une Fiche Test de Grossesse
export async function createTestGrossesse(data: TestGrossesse) {
  return await prisma.testGrossesse.create({
    data,
  });
}

// ************* Fiche TestGrossesse **************
export const getAllTestGrossesse = async () => {
  const allTestGrossesse = await prisma.testGrossesse.findMany({
    orderBy: { testCreatedAt: "desc" },
  });
  return allTestGrossesse;
};

// Récupération de Fiche TestGrossesse par ID
export const getAllTestGrossesseByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allTestGrossesse = await prisma.testGrossesse.findMany({
    where: { testIdClient: id },
  });
  return allTestGrossesse;
};

// Récupération de une seul Fiche TestGrossesse
export const getOneTestGrossesse = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneTestGrossesse = await prisma.testGrossesse.findUnique({
    where: { id },
  });

  return oneTestGrossesse;
};

// Suppression d'une Fiche TestGrossesse
export async function deleteTestGrossesse(id: string) {
  return await prisma.testGrossesse.delete({
    where: { id },
  });
}

//Mise à jour de la Fiche TestGrossesse
export async function updateTestGrossesse(id: string, data: TestGrossesse) {
  return await prisma.testGrossesse.update({
    where: { id },
    data,
  });
}
