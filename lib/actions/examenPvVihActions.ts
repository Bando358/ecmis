"use server";

import { ExamenPvVih } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création de Examen
export async function createExamenPvVih(data: ExamenPvVih) {
  return await prisma.examenPvVih.create({
    data,
  });
}

// Récupérer toutes les ExamenPvVih
export async function getAllExamenPvVih() {
  return await prisma.examenPvVih.findMany({
    orderBy: {
      examenPvVihCreatedAt: "desc",
    },
  });
}

// Récupérer  toutes les ExamenPvVih par ID client
export async function getAllExamenPvVihByIdClient(clientId: string) {
  return await prisma.examenPvVih.findMany({
    where: { examenPvVihIdClient: clientId },
    orderBy: {
      examenPvVihCreatedAt: "desc",
    },
  });
}

// Récupérer un seul ExamenPvVih
export async function getOneExamenPvVih(id: string) {
  return await prisma.examenPvVih.findUnique({
    where: { id },
  });
}

// Suppression d'un ExamenPvVih
export async function deleteExamenPvVih(id: string) {
  return await prisma.examenPvVih.delete({
    where: { id },
  });
}

//Mise à jour de ExamenPvVih
export async function updateExamenPvVih(id: string, data: ExamenPvVih) {
  return await prisma.examenPvVih.update({
    where: { id },
    data,
  });
}
