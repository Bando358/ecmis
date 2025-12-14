"use server";

import { FactureProduit } from "@prisma/client";
import prisma from "@/lib/prisma";
// import { ClientData } from "./rapportActions";

// Création de FactureProduit
export async function createFactureProduit(data: FactureProduit) {
  return await prisma.factureProduit.create({
    data,
  });
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
  return await prisma.factureProduit.delete({
    where: { id },
  });
}

//Mise à jour de FactureProduit
export async function updateFactureProduit(id: string, data: FactureProduit) {
  return await prisma.factureProduit.update({
    where: { id },
    data,
  });
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

    return updatedProduit;
  } catch (error) {
    console.error("Erreur lors de la mise à jour du produit:", error);
    throw error;
  }
}
