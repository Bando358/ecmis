"use server";
// pecVihActions.ts
import { PecVih } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création d'une Fiche de PEC VIH
export async function createPecVih(data: PecVih) {
  return await prisma.pecVih.create({
    data,
  });
}
// Création d'une Fiche de PEC VIH
export async function createPecVihViaData(data: {
  pecVihCreatedAt: Date;
  pecVihUpdatedAt: Date;
  pecVihCounselling: boolean;
  pecVihTypeclient: string;
  pecVihMoleculeArv: string | null;
  pecDateRdvSuivi: Date;
  pecVihAesArv: boolean;
  pecVihCotrimo: boolean;
  pecVihSpdp: boolean;
  pecVihIoPaludisme: boolean;
  pecVihIoTuberculose: boolean;
  pecVihIoAutre: boolean;
  pecVihSoutienPsychoSocial: boolean;
  pecVihIdUser: string;
  pecVihIdClient: string;
  pecVihIdVisite: string;
  pecVihIdClinique: string; // Ajout obligatoire
}) {
  return await prisma.pecVih.create({
    data: {
      pecVihCreatedAt: data.pecVihCreatedAt,
      pecVihUpdatedAt: data.pecVihUpdatedAt,
      pecVihCounselling: data.pecVihCounselling,
      pecVihTypeclient: data.pecVihTypeclient,
      pecVihMoleculeArv: data.pecVihMoleculeArv ?? "",
      pecDateRdvSuivi: data.pecDateRdvSuivi,
      pecVihAesArv: data.pecVihAesArv,
      pecVihCotrimo: data.pecVihCotrimo,
      pecVihSpdp: data.pecVihSpdp,
      pecVihIoPaludisme: data.pecVihIoPaludisme,
      pecVihIoTuberculose: data.pecVihIoTuberculose,
      pecVihIoAutre: data.pecVihIoAutre,
      pecVihSoutienPsychoSocial: data.pecVihSoutienPsychoSocial,
      User: {
        connect: { id: data.pecVihIdUser },
      },
      Client: {
        connect: { id: data.pecVihIdClient },
      },
      Visite: {
        connect: { id: data.pecVihIdVisite },
      },
      Clinique: {
        // Connexion obligatoire ajoutée
        connect: { id: data.pecVihIdClinique },
      },
    },
  });
}
// check si une idVisite existe pour un PecVih. Si oui, on retourne true, sinon false
export async function checkIdVisiteExists(idVisite: string | null) {
  if (!idVisite) {
    return false;
  }
  const pecVih = await prisma.pecVih.findFirst({
    where: { pecVihIdVisite: idVisite },
  });
  return pecVih ? true : false;
}

// ************* Fiche de PEC VIH **************
export const getAllPecVih = async () => {
  const allPecVih = await prisma.pecVih.findMany({
    orderBy: { pecVihCreatedAt: "desc" },
  });
  return allPecVih;
};

// Récupération de Fiche de PEC VIH par ID
export const getAllPecVihByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allPecVih = await prisma.pecVih.findMany({
    where: { pecVihIdClient: id },
  });
  return allPecVih;
};

// Récupération de une seul Fiche de PEC VIH
export const getOnePecVih = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const onePecVih = await prisma.pecVih.findUnique({
    where: { id },
  });

  return onePecVih;
};

// Suppression d'une Fiche de PEC VIH
export async function deletePecVih(id: string) {
  return await prisma.pecVih.delete({
    where: { id },
  });
}

//Mise à jour de la Fiche de PEC VIH
export async function updatePecVih(id: string, data: PecVih) {
  return await prisma.pecVih.update({
    where: { id },
    data,
  });
}
