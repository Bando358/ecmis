"use server";

import { Vbg } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création d'une Fiche Vbg
export async function createVbg(data: Vbg) {
  return await prisma.vbg.create({
    data,
  });
}

// ************* Fiche Vbg **************
export const getAllVbg = async () => {
  const allVbg = await prisma.vbg.findMany({
    orderBy: { vbgCreatedAt: "desc" },
  });
  return allVbg;
};

// Récupération de Fiche Vbg par ID
export const getAllVbgByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allVbg = await prisma.vbg.findMany({
    where: { vbgIdClient: id },
  });
  return allVbg;
};

// Récupération de une seul Fiche Vbg
export const getOneVbg = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneVbg = await prisma.vbg.findUnique({
    where: { id },
  });

  return oneVbg;
};

// Suppression d'une Fiche Vbg
export async function deleteVbg(id: string) {
  return await prisma.vbg.delete({
    where: { id },
  });
}

//Mise à jour de la Fiche Vbg
export async function updateVbg(id: string, data: Vbg) {
  return await prisma.vbg.update({
    where: { id },
    data,
  });
}
