"use server";

import { TarifExamen } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création de TarifExamen
export async function createTarifExamen(data: TarifExamen) {
  return await prisma.tarifExamen.create({
    data,
  });
}

// Récupérer toutes les TarifExamen
export async function getAllTarifExamen() {
  return await prisma.tarifExamen.findMany({
    orderBy: {
      nomExamen: "asc",
    },
  });
}

// Récupérer toutes les TarifExamen par clinique
export async function getAllTarifExamenByClinique(cliniqueId: string) {
  return await prisma.tarifExamen.findMany({
    where: { idClinique: cliniqueId },
    orderBy: {
      nomExamen: "asc",
    },
  });
}

// Récupérer un seul TarifExamen
export async function getOneTarifExamen(id: string) {
  return await prisma.tarifExamen.findUnique({
    where: { id },
  });
}

// Suppression d'un TarifExamen
export async function deleteTarifExamen(id: string) {
  return await prisma.tarifExamen.delete({
    where: { id },
  });
}

//Mise à jour de TarifExamen
export async function updateTarifExamen(id: string, data: TarifExamen) {
  return await prisma.tarifExamen.update({
    where: { id },
    data,
  });
}
