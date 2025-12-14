"use server";
// depistageVihActions.ts
import { DepistageVih } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création d'une Fiche de Dépistage VIH
export async function createDepistageVih(data: DepistageVih) {
  return await prisma.depistageVih.create({
    data,
  });
}

// ************* Fiche de Dépistage VIH **************
export const getAllDepistageVih = async () => {
  const allDepistageVih = await prisma.depistageVih.findMany({
    orderBy: { depistageVihCreatedAt: "desc" },
  });
  return allDepistageVih;
};

// Récupération de Fiche de Dépistage VIH par ID
export const getAllDepistageVihByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allDepistageVih = await prisma.depistageVih.findMany({
    where: { depistageVihIdClient: id },
  });
  return allDepistageVih;
};

// Récupération de une seul Fiche de Dépistage VIH
export const getOneDepistageVih = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneDepistageVih = await prisma.depistageVih.findUnique({
    where: { id },
  });

  return oneDepistageVih;
};

// Suppression d'une Fiche de Dépistage VIH
export async function deleteDepistageVih(id: string) {
  return await prisma.depistageVih.delete({
    where: { id },
  });
}

//Mise à jour de la Fiche de Dépistage VIH
export async function updateDepistageVih(id: string, data: DepistageVih) {
  return await prisma.depistageVih.update({
    where: { id },
    data,
  });
}
