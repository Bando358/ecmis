"use server";

import { FactureProduit } from "@prisma/client";
import prisma from "@/lib/prisma";
import { logAction } from "./journalPharmacyActions";

// Création de FactureProduit
export async function createFactureProduit(data: FactureProduit) {
  const result = await prisma.factureProduit.create({ data });
  await logAction({
    idUser: data.idUser,
    action: "CREATION",
    entite: "FactureProduit",
    entiteId: result.id,
    idClinique: data.idClinique,
    description: `Vente produit: ${data.nomProduit} (x${data.quantite}) - ${data.montantProduit} FCFA`,
    nouvellesDonnees: { nomProduit: data.nomProduit, quantite: data.quantite, montantProduit: data.montantProduit },
  });
  return result;
}

// Récupérer toutes les FactureProduit par idVisite
export async function getAllFactureProduitByIdVisite(idVisite: string) {
  return await prisma.factureProduit.findMany({
    where: { idVisite: idVisite },
    orderBy: { idVisite: "desc" },
  });
}

// Récupérer toutes les FactureProduit par idClient
export async function getAllFactureProduitByIdClient(idClient: string) {
  return await prisma.factureProduit.findMany({
    where: { idClient: idClient },
    orderBy: { idClient: "desc" },
  });
}
// Récupérer toutes les FactureProduit
export async function getAllFactureProduit() {
  return await prisma.factureProduit.findMany();
}
// Récupérer toutes les FactureProduit par idVisite via data (ClientData)
type ClientData = { idVisite: string };

export async function getAllFactureProduitByIdVisiteByData(data: ClientData[]) {
  const idVisiteList = data.map((client) => client.idVisite);
  return await prisma.factureProduit.findMany({
    where: { idVisite: { in: idVisiteList } },
  });
}
// Suppression d'une FactureProduit
export async function deleteFactureProduit(id: string) {
  const existing = await prisma.factureProduit.findUnique({ where: { id } });
  const result = await prisma.factureProduit.delete({ where: { id } });
  if (existing) {
    await logAction({
      idUser: existing.idUser,
      action: "SUPPRESSION",
      entite: "FactureProduit",
      entiteId: id,
      idClinique: existing.idClinique,
      description: `Suppression vente produit: ${existing.nomProduit} (x${existing.quantite})`,
      anciennesDonnees: { nomProduit: existing.nomProduit, quantite: existing.quantite, montantProduit: existing.montantProduit },
    });
  }
  return result;
}

//Mise à jour de FactureProduit
export async function updateFactureProduit(id: string, data: FactureProduit) {
  const oldRecord = await prisma.factureProduit.findUnique({ where: { id } });
  const result = await prisma.factureProduit.update({ where: { id }, data });
  await logAction({
    idUser: data.idUser,
    action: "MODIFICATION",
    entite: "FactureProduit",
    entiteId: id,
    idClinique: data.idClinique,
    description: `Modification vente produit: ${data.nomProduit}`,
    anciennesDonnees: oldRecord ? { nomProduit: oldRecord.nomProduit, quantite: oldRecord.quantite, montantProduit: oldRecord.montantProduit } : null,
    nouvellesDonnees: { nomProduit: data.nomProduit, quantite: data.quantite, montantProduit: data.montantProduit },
  });
  return result;
}

export async function updateProduitByFactureProduit(
  idProduit: string,
  quantiteProduit: number
) {
  try {
    // Vérifier si le produit existe
    const produit = await prisma.tarifProduit.findUnique({
      where: { id: idProduit },
    });

    if (!produit) {
      throw new Error("Produit non trouvé");
    }

    // Vérifier si la quantité en stock est suffisante
    if (produit.quantiteStock < quantiteProduit) {
      throw new Error("Stock insuffisant");
    }

    // Mettre à jour la quantité en stock
    const updatedProduit = await prisma.tarifProduit.update({
      where: { id: idProduit },
      data: { quantiteStock: produit.quantiteStock - quantiteProduit },
    });

    await logAction({
      idUser: produit.idUser,
      action: "MODIFICATION",
      entite: "TarifProduit",
      entiteId: idProduit,
      idClinique: produit.idClinique,
      description: `Decrement stock: -${quantiteProduit} unites (vente) | ${produit.quantiteStock} -> ${updatedProduit.quantiteStock}`,
      anciennesDonnees: { quantiteStock: produit.quantiteStock },
      nouvellesDonnees: { quantiteStock: updatedProduit.quantiteStock },
    });

    return updatedProduit;
  } catch (error) {
    console.error("Erreur lors de la mise à jour du produit:", error);
    throw error;
  }
}
