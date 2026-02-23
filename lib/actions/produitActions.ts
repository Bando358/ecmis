"use server";

import { Produit } from "@prisma/client";
import prisma from "@/lib/prisma";
import { logAction } from "./journalPharmacyActions";

// Création de Produit
export async function createProduit(data: Produit) {
  const result = await prisma.produit.create({ data });
  await logAction({
    idUser: data.idUser,
    action: "CREATION",
    entite: "Produit",
    entiteId: result.id,
    description: `Creation produit: ${data.nomProduit} (${data.typeProduit})`,
    nouvellesDonnees: { nomProduit: data.nomProduit, typeProduit: data.typeProduit, description: data.description },
  });
  return result;
}

// Récupérer un Produit par son nomProduit
export async function getOneProduitByNom(nomProduit: string) {
  return await prisma.produit.findFirst({
    where: { nomProduit },
  });
}

// Récupérer un Produit par son ID
export async function getOneProduitById(id: string) {
  return await prisma.produit.findUnique({
    where: { id },
  });
}
// Récupérer toutes les Produit
export async function getAllProduits() {
  return await prisma.produit.findMany();
}
// Suppression d'un produit
export async function deleteProduit(id: string) {
  const existing = await prisma.produit.findUnique({ where: { id } });
  const result = await prisma.produit.delete({ where: { id } });
  if (existing) {
    await logAction({
      idUser: existing.idUser,
      action: "SUPPRESSION",
      entite: "Produit",
      entiteId: id,
      description: `Suppression produit: ${existing.nomProduit} (${existing.typeProduit})`,
      anciennesDonnees: { nomProduit: existing.nomProduit, typeProduit: existing.typeProduit },
    });
  }
  return result;
}

//Mise à jour de Produit
export async function updateProduit(id: string, data: Produit) {
  const oldRecord = await prisma.produit.findUnique({ where: { id } });
  const result = await prisma.produit.update({ where: { id }, data });
  await logAction({
    idUser: data.idUser,
    action: "MODIFICATION",
    entite: "Produit",
    entiteId: id,
    description: `Modification produit: ${data.nomProduit}`,
    anciennesDonnees: oldRecord ? { nomProduit: oldRecord.nomProduit, typeProduit: oldRecord.typeProduit } : null,
    nouvellesDonnees: { nomProduit: data.nomProduit, typeProduit: data.typeProduit, description: data.description },
  });
  return result;
}
