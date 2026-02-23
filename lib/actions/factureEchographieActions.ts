"use server";

import { FactureEchographie } from "@prisma/client";
import prisma from "@/lib/prisma";
import { logAction } from "./journalPharmacyActions";

// Création de FactureEchographie
export async function createFactureEchographie(data: FactureEchographie) {
  const result = await prisma.factureEchographie.create({ data });
  await logAction({
    idUser: data.idUser,
    action: "CREATION",
    entite: "FactureEchographie",
    entiteId: result.id,
    idClinique: data.idClinique,
    description: `Facturation echographie: ${data.libelleEchographie} - ${data.prixEchographie} FCFA`,
    nouvellesDonnees: { libelleEchographie: data.libelleEchographie, prixEchographie: data.prixEchographie, remiseEchographie: data.remiseEchographie },
  });
  return result;
}

// Récupérer toutes les FactureEchographie
export async function getAllFactureEchographieByIdClient(idClient: string) {
  return await prisma.factureEchographie.findMany({
    where: { idClient: idClient },
  });
}

// Récupérer toutes les FactureEchographie
export async function getAllFactureEchographie() {
  return await prisma.factureEchographie.findMany();
}
// Suppression d'une FactureEchographie
export async function deleteFactureEchographie(id: string) {
  const existing = await prisma.factureEchographie.findUnique({ where: { id } });
  const result = await prisma.factureEchographie.delete({ where: { id } });
  if (existing) {
    await logAction({
      idUser: existing.idUser,
      action: "SUPPRESSION",
      entite: "FactureEchographie",
      entiteId: id,
      idClinique: existing.idClinique,
      description: `Suppression echographie: ${existing.libelleEchographie} - ${existing.prixEchographie} FCFA`,
      anciennesDonnees: { libelleEchographie: existing.libelleEchographie, prixEchographie: existing.prixEchographie },
    });
  }
  return result;
}

//Mise à jour de FactureEchographie
export async function updateFactureEchographie(
  id: string,
  data: FactureEchographie
) {
  const oldRecord = await prisma.factureEchographie.findUnique({ where: { id } });
  const result = await prisma.factureEchographie.update({ where: { id }, data });
  await logAction({
    idUser: data.idUser,
    action: "MODIFICATION",
    entite: "FactureEchographie",
    entiteId: id,
    idClinique: data.idClinique,
    description: `Modification echographie: ${data.libelleEchographie}`,
    anciennesDonnees: oldRecord ? { libelleEchographie: oldRecord.libelleEchographie, prixEchographie: oldRecord.prixEchographie } : null,
    nouvellesDonnees: { libelleEchographie: data.libelleEchographie, prixEchographie: data.prixEchographie },
  });
  return result;
}

// Récupérer toutes les FactureEchographie par idVisite
export async function getAllFactureEchographieByIdVisite(idVisite: string) {
  return await prisma.factureEchographie.findMany({
    where: { idVisite: idVisite },
    orderBy: { idVisite: "desc" },
  });
}
