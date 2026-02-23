"use server";

import { FacturePrestation } from "@prisma/client";
import prisma from "@/lib/prisma";
import { logAction } from "./journalPharmacyActions";

// Création de FacturePrestation
export async function createFacturePrestation(data: FacturePrestation) {
  const result = await prisma.facturePrestation.create({ data });
  await logAction({
    idUser: data.idUser,
    action: "CREATION",
    entite: "FacturePrestation",
    entiteId: result.id,
    idClinique: data.idClinique,
    description: `Facturation prestation: ${data.libellePrestation} - ${data.prixPrestation} FCFA`,
    nouvellesDonnees: { libellePrestation: data.libellePrestation, prixPrestation: data.prixPrestation },
  });
  return result;
}
// Récupérer toutes les FacturePrestation par idVisite par un tableau d'objets
export async function getAllFacturePrestationByIdVisiteByData(
  tabId: { idVisite: string }[]
) {
  const ids = tabId.map((item) => item.idVisite);
  return await prisma.facturePrestation.findMany({
    where: {
      idVisite: {
        in: ids,
      },
    },
  });
}

// Récupérer toutes les FacturePrestation par idClient
export async function getAllFacturePrestationByIdClient(idClient: string) {
  return await prisma.facturePrestation.findMany({
    where: { idClient: idClient },
  });
}
// Récupérer toutes les FacturePrestation
export async function getAllFacturePrestation() {
  return await prisma.facturePrestation.findMany();
}
// Suppression d'une FacturePrestation
export async function deleteFacturePrestation(id: string) {
  const existing = await prisma.facturePrestation.findUnique({ where: { id } });
  const result = await prisma.facturePrestation.delete({ where: { id } });
  if (existing) {
    await logAction({
      idUser: existing.idUser,
      action: "SUPPRESSION",
      entite: "FacturePrestation",
      entiteId: id,
      idClinique: existing.idClinique,
      description: `Suppression prestation: ${existing.libellePrestation} - ${existing.prixPrestation} FCFA`,
      anciennesDonnees: { libellePrestation: existing.libellePrestation, prixPrestation: existing.prixPrestation },
    });
  }
  return result;
}

//Mise à jour de FacturePrestation
export async function updateFacturePrestation(
  id: string,
  data: FacturePrestation
) {
  const oldRecord = await prisma.facturePrestation.findUnique({ where: { id } });
  const result = await prisma.facturePrestation.update({ where: { id }, data });
  await logAction({
    idUser: data.idUser,
    action: "MODIFICATION",
    entite: "FacturePrestation",
    entiteId: id,
    idClinique: data.idClinique,
    description: `Modification prestation: ${data.libellePrestation}`,
    anciennesDonnees: oldRecord ? { libellePrestation: oldRecord.libellePrestation, prixPrestation: oldRecord.prixPrestation } : null,
    nouvellesDonnees: { libellePrestation: data.libellePrestation, prixPrestation: data.prixPrestation },
  });
  return result;
}

// Récupérer toutes les FacturePrestation par idVisite
export async function getAllFacturePrestationByIdVisite(
  idVisite: string | null
) {
  if (!idVisite) {
    return null; // ou lancez une erreur si nécessaire
  }
  const prestations = await prisma.facturePrestation.findMany({
    where: { idVisite: idVisite },
  });

  return prestations;
}
