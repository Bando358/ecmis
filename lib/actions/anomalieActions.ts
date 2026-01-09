"use server";

import { AnomalieInventaire } from "@prisma/client";
import prisma from "../prisma";

// ************ Inventaire **********
export async function createAnomalie(data: AnomalieInventaire) {
  return await prisma.anomalieInventaire.create({
    data,
  });
}

// Récupération des anomalies par détails d'inventaire
export async function getAnomaliesByDetailInventaireIds(detailIds: string[]) {
  if (detailIds.length === 0) return [];

  return await prisma.anomalieInventaire.findMany({
    where: { idDetailInventaire: { in: detailIds } },
  });
}

// Suppression d'une anomalie
export async function deleteAnomaliesByIds(ids: string[]) {
  return await prisma.anomalieInventaire.deleteMany({
    where: { id: { in: ids } },
  });
}
