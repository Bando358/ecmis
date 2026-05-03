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

// -----------------------------------------------------------------------------
// Déduplication des prescripteurs par "fonction" (post principal).
//
// Règle métier : pour une même visite, on ne doit pas avoir deux prescripteurs
// qui exercent la même fonction (ex: deux sage-femmes). Quand on ajoute un
// nouveau prescripteur dont la fonction est déjà représentée dans le tableau
// existant, on remplace l'ancien par le nouveau.
//
// Le post principal d'un utilisateur est le plus prioritaire dans cet ordre :
// MEDECIN > SAGE_FEMME > INFIRMIER > LABORANTIN > AIDE_SOIGNANT > AMD >
// CONSEILLER > CAISSIERE > COMPTABLE > SUIVI_EVALLUATION > ADMIN.
// -----------------------------------------------------------------------------
const POSTES_PRIORITE_ORDRE: string[] = [
  "MEDECIN",
  "SAGE_FEMME",
  "INFIRMIER",
  "LABORANTIN",
  "AIDE_SOIGNANT",
  "AMD",
  "CONSEILLER",
  "CAISSIERE",
  "COMPTABLE",
  "SUIVI_EVALLUATION",
  "ADMIN",
];

function getPrimaryPost(titles: string[]): string | null {
  if (!titles || titles.length === 0) return null;
  for (const p of POSTES_PRIORITE_ORDRE) {
    if (titles.includes(p)) return p;
  }
  return titles[0] ?? null;
}

/**
 * Retourne un nouveau tableau de prescripteurs où chaque "fonction" (post
 * principal) n'apparaît qu'une seule fois. Les nouveaux prescripteurs (toAdd)
 * remplacent les anciens (existing) qui partagent la même fonction.
 */
async function mergePrescripteursDedupedByPost(
  existing: string[],
  toAdd: string[],
): Promise<string[]> {
  const cleanedToAdd = (toAdd || []).filter((id): id is string => !!id);
  if (cleanedToAdd.length === 0) return Array.from(new Set(existing));

  const allIds = Array.from(new Set([...(existing || []), ...cleanedToAdd]));
  const users = await prisma.user.findMany({
    where: { id: { in: allIds } },
    select: { id: true, post: { select: { title: true } } },
  });
  const postById = new Map<string, string | null>();
  for (const u of users) {
    const titles = (u.post || []).map((p) => p.title as string);
    postById.set(u.id, getPrimaryPost(titles));
  }

  // On part du tableau existant puis on applique chaque nouveau prescripteur
  // en évinçant ceux qui partagent la même fonction.
  let result = Array.from(new Set(existing || []));
  for (const newId of cleanedToAdd) {
    const newPost = postById.get(newId);
    if (newPost) {
      result = result.filter((id) => {
        if (id === newId) return false; // évite les doublons d'id
        const p = postById.get(id);
        return p !== newPost;
      });
    } else {
      // Pas de post connu pour le nouvel utilisateur : on retire juste l'id
      // s'il existait déjà pour ne pas le dupliquer.
      result = result.filter((id) => id !== newId);
    }
    result.push(newId);
  }
  return result;
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
      const mergedPrescripteurs = await mergePrescripteursDedupedByPost(
        existing.prescripteurs || [],
        data.prescripteurs || [],
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

    // Sinon, création normale (on dédoublonne quand même : utile si la liste
    // initiale contient elle-même deux prescripteurs avec la même fonction).
    const dedupedPrescripteurs = await mergePrescripteursDedupedByPost(
      [],
      data.prescripteurs || [],
    );
    const recapVisite = await prisma.recapVisite.create({
      data: {
        idVisite: data.idVisite,
        idClient: data.idClient,
        prescripteurs: dedupedPrescripteurs,
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
    // Pour le prescripteur, on délègue au helper de dédoublonnage par
    // fonction : si l'ancien tableau contient déjà un user partageant la
    // même fonction (post principal) que le nouveau, il sera remplacé.
    if (prescripteurs) {
      const merged = await mergePrescripteursDedupedByPost(
        recapVisite.prescripteurs || [],
        [prescripteurs],
      );
      // On ne déclenche un update que si la liste a effectivement changé.
      const before = recapVisite.prescripteurs || [];
      const sameLength = merged.length === before.length;
      const sameContent =
        sameLength && merged.every((id, i) => id === before[i]);
      if (!sameContent) {
        updates.prescripteurs = merged;
      }
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
