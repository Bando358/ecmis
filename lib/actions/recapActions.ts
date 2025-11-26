"use server";

import prisma from "../prisma";

export async function getRecapVisiteByIdVisite(idVisite: string) {
  return await prisma.recapVisite.findMany({
    where: { idVisite: idVisite },
  });
}

export async function createRecapVisite(data: {
  idVisite: string;
  idClient: string;
  prescripteurs: string[];
  formulaires: string[];
}) {
  try {
    // Si un RecapVisite existe déjà pour cette visite, on fusionne les tableaux
    const existing = await prisma.recapVisite.findUnique({
      where: { idVisite: data.idVisite },
    });

    if (existing) {
      const mergedPrescripteurs = Array.from(
        new Set([
          ...(existing.prescripteurs || []),
          ...(data.prescripteurs || []),
        ])
      );
      const mergedFormulaires = Array.from(
        new Set([...(existing.formulaires || []), ...(data.formulaires || [])])
      );

      const updated = await prisma.recapVisite.update({
        where: { idVisite: data.idVisite },
        data: {
          prescripteurs: mergedPrescripteurs,
          formulaires: mergedFormulaires,
        },
      });
      return updated;
    }

    // Sinon, création normale
    const recapVisite = await prisma.recapVisite.create({
      data: {
        idVisite: data.idVisite,
        idClient: data.idClient,
        prescripteurs: data.prescripteurs,
        formulaires: data.formulaires,
      },
    });
    return recapVisite;
  } catch (error) {
    console.error(
      "Erreur lors de la création ou mise à jour de RecapVisite :",
      error
    );
    // Retourner null permet au caller de gérer l'échec sans se prendre une exception générique
    return null;
  }
}

// Mise à jour d'une RecapVisite
export async function updateRecapVisite(
  idVisite: string,
  prescripteurs: string,
  formulaire: string
): Promise<void> {
  try {
    const recapVisite = await prisma.recapVisite.findUnique({
      where: { idVisite },
    });

    if (!recapVisite) {
      throw new Error(`RecapVisite with idVisite ${idVisite} not found.`);
    }

    // Ajouter le nouveau formulaire à la liste existante
    if (recapVisite.formulaires.includes(formulaire) === false) {
      const updatedFormulaires = [...recapVisite.formulaires, formulaire];

      // Mettre à jour le RecapVisite avec le nouveau tableau de formulaires
      await prisma.recapVisite.update({
        where: { idVisite },
        data: {
          formulaires: updatedFormulaires,
        },
      });
    }
    // Ajouter le nouveau formulaire à la liste existante
    if (recapVisite.prescripteurs.includes(prescripteurs) === false) {
      const updatedPrescripteurs = [
        ...recapVisite.prescripteurs,
        prescripteurs,
      ];

      // Mettre à jour le RecapVisite avec le nouveau tableau de prescripteurs
      await prisma.recapVisite.update({
        where: { idVisite },
        data: {
          prescripteurs: updatedPrescripteurs,
        },
      });
    }
  } catch (error) {
    console.error(error);
  }
}
