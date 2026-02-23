"use server";

import { AnomalieInventaire } from "@prisma/client";
import prisma from "../prisma";
import { logAction } from "./journalPharmacyActions";

// ************ Inventaire **********
export async function createAnomalie(data: AnomalieInventaire) {
  const result = await prisma.anomalieInventaire.create({ data });
  await logAction({
    idUser: data.idUser,
    action: "CREATION",
    entite: "AnomalieInventaire",
    entiteId: result.id,
    description: `Anomalie inventaire: ${data.quantiteManquante} unites manquantes${data.description ? " - " + data.description : ""}`,
    nouvellesDonnees: { quantiteManquante: data.quantiteManquante, description: data.description },
  });
  return result;
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
