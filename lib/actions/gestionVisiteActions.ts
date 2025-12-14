"use server";

import { GestionVisite } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création d'une Fiche Gestion de Visite
export async function createGestionVisite(data: GestionVisite) {
  return await prisma.gestionVisite.create({
    data,
  });
}

// Récupération  Gestion de Visite par ID visite
export const getAllGestionVisiteByIdVisite = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allGestionVisite = await prisma.gestionVisite.findMany({
    where: { idVisite: id },
  });
  return allGestionVisite;
};
// Récupération  Gestion de Visite par ID visite
export const getAllGestionVisiteByTabIdVisite = async (id: string[]) => {
  if (!id || id.length === 0) {
    return [];
  }
  const allGestionVisite = await prisma.gestionVisite.findMany({
    where: { idVisite: { in: id } },
  });
  return allGestionVisite;
};

// Suppression d'une Fiche Gestion de Visite
export async function deleteGestionVisite({ id }: { id: string }) {
  return await prisma.gestionVisite.delete({
    where: { id },
  });
}
