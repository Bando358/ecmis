"use server";
import prisma from "@/lib/prisma";
import { FactureEchographie, Visite, Client, Clinique } from "@prisma/client";

export type EchoServiceItem = {
  idClient: string;
  nomClient: string;
  prenomClient: string;
  sexeClient: string;
  ageClient: number | null;
  serviceEchographie: string;
  libelleEchographie: string;
};

type VisiteWithRelations = Visite & {
  Client: Client | null;
  Clinique: Clinique | null;
  FactureEchographie: FactureEchographie[];
};

const calculerAge = (dateNaissance: Date): number => {
  const diffTemps = Date.now() - new Date(dateNaissance).getTime();
  const ageDate = new Date(diffTemps);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

/**
 * Récupère les données d'échographie pour le rapport.
 * Retourne un tableau plat : une entrée par FactureEchographie,
 * enrichie des informations client (sexe, âge, etc.).
 */
export const fetchEchoData = async (
  clinicIds: string[],
  activiteIds: string[],
  date1: Date,
  date2: Date,
): Promise<EchoServiceItem[]> => {
  if (!clinicIds?.length || !date1 || !date2) return [];

  const allVisites = (await prisma.visite.findMany({
    where: {
      idClinique: { in: clinicIds },
      dateVisite: { gte: date1, lte: date2 },
    },
    include: { Client: true, Clinique: true, FactureEchographie: true },
  })) as VisiteWithRelations[];

  // Parsing activiteIds
  const [tabIdActivite, tabIdLieu] = activiteIds.reduce<[string[], string[]]>(
    ([a, l], v) => {
      const [act, lieu] = v.split(">").map((s) => s?.trim());
      if (act) a.push(act);
      if (lieu) l.push(lieu);
      return [a, l];
    },
    [[], []],
  );

  const noFilter = activiteIds.includes("*");

  const filteredVisites = noFilter
    ? allVisites
    : allVisites.filter((visite) => {
        if (!tabIdActivite.length) return !visite.idActivite;
        const okActivite = tabIdActivite.includes(visite.idActivite ?? "");
        const okLieu =
          !tabIdLieu.length || tabIdLieu.includes(visite.idLieu ?? "");
        return okActivite && okLieu;
      });

  const items: EchoServiceItem[] = [];

  filteredVisites.forEach((visite) => {
    const client = visite.Client;
    if (!client) return;

    visite.FactureEchographie.forEach((facture) => {
      items.push({
        idClient: client.id,
        nomClient: client.nom ?? "",
        prenomClient: client.prenom ?? "",
        sexeClient: client.sexe ?? "",
        ageClient: client.dateNaissance
          ? calculerAge(client.dateNaissance)
          : null,
        serviceEchographie: facture.serviceEchographieFacture,
        libelleEchographie: facture.libelleEchographie,
      });
    });
  });

  return items;
};
