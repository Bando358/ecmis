"use server";

import { Produit } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création de Produit
export async function createProduit(data: Produit) {
  return await prisma.produit.create({
    data,
  });
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
// Suppression d'un client
export async function deleteProduit(id: string) {
  return await prisma.produit.delete({
    where: { id },
  });
}

//Mise à jour de Produit
export async function updateProduit(id: string, data: Produit) {
  return await prisma.produit.update({
    where: { id },
    data,
  });
}
