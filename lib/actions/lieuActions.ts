"use server";

//lib/actions/lieuActions.ts
import { Lieu } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création d'une Fiche Lieu
export async function createLieu(data: Lieu) {
  return await prisma.lieu.create({
    data,
  });
}

// ************* Fiche Lieu BY tableau idActivite **************
export const getAllLieuByTabIdActivite = async (idActivite: string[]) => {
  const allLieu = await prisma.lieu.findMany({
    where: { idActivite: { in: idActivite } },
  });
  return allLieu;
};
// ************* Fiche Lieu **************
export const getAllLieu = async () => {
  const allLieu = await prisma.lieu.findMany();
  return allLieu;
};

// Récupération de une seul Fiche Lieu
export const getOneLieu = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneLieu = await prisma.lieu.findUnique({
    where: { id },
  });

  return oneLieu;
};

// Suppression d'une Fiche Lieu
export async function deleteLieu(id: string) {
  return await prisma.lieu.delete({
    where: { id },
  });
}

//Mise à jour de la Fiche Lieu
export async function updateLieu(id: string, data: Lieu) {
  return await prisma.lieu.update({
    where: { id },
    data,
  });
}
