"use server";

import prisma from "../prisma";

export async function getRecapVisiteByIdVisite(idVisite: string) {
  return await prisma.recapVisite.findMany({
    where: { idVisite: idVisite },
  });
}

export async function getRecapVisitesByTabIdVisite(idVisites: string[]) {
  return await prisma.recapVisite.findMany({
    where: { idVisite: { in: idVisites } },
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

    // Si RecapVisite n'existe pas, le créer avec les valeurs initiales
    if (!recapVisite) {
      // Récupérer l'idClient via la visite
      const visite = await prisma.visite.findUnique({
        where: { id: idVisite },
        select: { idClient: true },
      });
      if (!visite) {
        console.error(`Visite ${idVisite} introuvable pour créer RecapVisite`);
        return;
      }
      await prisma.recapVisite.create({
        data: {
          idVisite,
          idClient: visite.idClient,
          prescripteurs: prescripteurs ? [prescripteurs] : [],
          formulaires: formulaire ? [formulaire] : [],
        },
      });
      return;
    }

    // Ajouter le nouveau formulaire à la liste existante
    const updates: { formulaires?: string[]; prescripteurs?: string[] } = {};

    if (formulaire && !recapVisite.formulaires.includes(formulaire)) {
      updates.formulaires = [...recapVisite.formulaires, formulaire];
    }
    if (prescripteurs && !recapVisite.prescripteurs.includes(prescripteurs)) {
      updates.prescripteurs = [...recapVisite.prescripteurs, prescripteurs];
    }

    // Une seule requête DB si au moins un champ à mettre à jour
    if (Object.keys(updates).length > 0) {
      await prisma.recapVisite.update({
        where: { idVisite },
        data: updates,
      });
    }
  } catch (error) {
    console.error("Erreur updateRecapVisite:", error);
  }
}

/**
 * Supprime entièrement le RecapVisite lié à une visite.
 * Appelé quand la visite elle-même est supprimée.
 */
export async function deleteRecapVisite(idVisite: string) {
  try {
    await prisma.recapVisite.deleteMany({
      where: { idVisite },
    });
  } catch (error) {
    console.error("Erreur deleteRecapVisite:", error);
  }
}

/**
 * Retire un formulaire du RecapVisite si plus aucun enregistrement
 * de ce type n'existe pour la visite.
 * Appelé depuis les composants table après suppression d'un record.
 */
export async function removeFormulaireFromRecap(
  idVisite: string,
  formulaire: string,
) {
  try {
    const recapVisite = await prisma.recapVisite.findUnique({
      where: { idVisite },
    });
    if (recapVisite && recapVisite.formulaires.includes(formulaire)) {
      await prisma.recapVisite.update({
        where: { idVisite },
        data: {
          formulaires: recapVisite.formulaires.filter((f) => f !== formulaire),
        },
      });
    }
  } catch (error) {
    console.error("Erreur removeFormulaireFromRecap:", error);
  }
}
