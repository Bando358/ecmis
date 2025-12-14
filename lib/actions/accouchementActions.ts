"use server";

import { Accouchement } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création d'une Fiche Accouchement
export async function createAccouchement(data: Accouchement) {
  return await prisma.accouchement.create({
    data,
  });
}
// export async function createAccouchement(data: Accouchement) {
//   return await prisma.accouchement.create({
//     data: {
//       id: data.id,
//       accouchementCreatedAt: data.accouchementCreatedAt,
//       accouchementUpdatedAt: data.accouchementUpdatedAt,
//       accouchementIdUser: data.accouchementIdUser,
//       accouchementIdClient: data.accouchementIdClient,
//       accouchementIdVisite: data.accouchementIdVisite,
//       accouchementIdGrossesse: data.accouchementIdGrossesse,

//       // ✅ Champs obligatoires du modèle Prisma
//       accouchementLieu: data.accouchementLieu,
//       accouchementStatutVat: data.accouchementStatutVat,
//       accouchementComplications: data.accouchementComplications,
//       accouchementEvacuationEnfant: data.accouchementEvacuationEnfant,
//       accouchementTypeEvacuation: data.accouchementTypeEvacuation,

//       // Ajout des champs obligatoires manquants
//       accouchementMultiple: data.accouchementMultiple,
//       accouchementEtatNaissance: data.accouchementEtatNaissance,
//       accouchementEnfantVivant: data.accouchementEnfantVivant,
//       accouchementEnfantMortNeFrais: data.accouchementEnfantMortNeFrais,
//       accouchementEnfantMortNeMacere: data.accouchementEnfantMortNeMacere,
//       accouchementNbPoidsEfantVivant: data.accouchementNbPoidsEfantVivant, // Ajout du champ manquant
//       // ajoute ici tous les autres champs obligatoires du modèle Prisma si nécessaire
//     },
//   });
// }

// ************* Fiche Accouchement **************
export const getAllAccouchement = async () => {
  const allAccouchement = await prisma.accouchement.findMany({
    orderBy: { accouchementCreatedAt: "desc" },
  });
  return allAccouchement;
};

// Récupération de Fiche Accouchement par ID
export const getAllAccouchementByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allAccouchement = await prisma.accouchement.findMany({
    where: { accouchementIdClient: id },
  });
  return allAccouchement;
};

// Récupération de une seul Fiche Accouchement
export const getOneAccouchement = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneAccouchement = await prisma.accouchement.findUnique({
    where: { id },
  });

  return oneAccouchement;
};

// Suppression d'une Fiche Accouchement
export async function deleteAccouchement(id: string) {
  return await prisma.accouchement.delete({
    where: { id },
  });
}

//Mise à jour de la Fiche Accouchement
export async function updateAccouchement(id: string, data: Accouchement) {
  return await prisma.accouchement.update({
    where: { id },
    data,
  });
}
