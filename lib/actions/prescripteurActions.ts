"use server";

import { Prescripteur } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création d'un Prescripteur
export async function createPrescripteur(data: Omit<Prescripteur, "createdAt" | "updatedAt">) {
  return await prisma.prescripteur.create({
    data,
  });
}

// Récupérer tous les Prescripteurs
export async function getAllPrescripteurs() {
  return await prisma.prescripteur.findMany({
    orderBy: { nom: "asc" },
  });
}

// Récupérer tous les Prescripteurs par clinique
export async function getAllPrescripteursByClinique(idClinique: string) {
  return await prisma.prescripteur.findMany({
    where: { idClinique },
    orderBy: { nom: "asc" },
  });
}

// Récupérer un Prescripteur par id
export async function getPrescripteurById(id: string) {
  return await prisma.prescripteur.findUnique({
    where: { id },
  });
}

// Mise à jour d'un Prescripteur
export async function updatePrescripteur(id: string, data: Partial<Prescripteur>) {
  return await prisma.prescripteur.update({
    where: { id },
    data,
  });
}

// Suppression d'un Prescripteur
export async function deletePrescripteur(id: string) {
  return await prisma.prescripteur.delete({
    where: { id },
  });
}
