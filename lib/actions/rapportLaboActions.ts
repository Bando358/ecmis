"use server";
import prisma from "@/lib/prisma";
import { FactureExamen, Visite, Client, Clinique } from "@prisma/client";

enum TypeExamen {
  MEDECIN = "MEDECIN",
  GYNECOLOGIE = "GYNECOLOGIE",
  OBSTETRIQUE = "OBSTETRIQUE",
  VIH = "VIH",
  IST = "IST",
}

export type ClientLaboType = {
  nomClient: string;
  prenomClient: string;
  sexeClient: string;
  dateNaissanceClient: Date | null;
  ageClient: number | null;
  typeExamen: TypeExamen;
  visites: Visite[];
  resultatsExamens: {
    typeExamen: string;
    libelleExamen: string;
  }[];
};

type VisiteWithRelations = Visite & {
  Client: Client | null;
  Clinique: Clinique | null;
  FactureExamen: FactureExamen[];
};

const calculerAge = (dateNaissance: Date): number => {
  const diffTemps = Date.now() - new Date(dateNaissance).getTime();
  const ageDate = new Date(diffTemps);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

export const fetchLaboData = async (
  clinicIds: string[],
  activiteIds: string[],
  date1: Date,
  date2: Date
): Promise<Record<TypeExamen, ClientLaboType[]>> => {
  if (!clinicIds?.length) {
    console.warn("Veuillez choisir au moins une clinique");
    return {
      MEDECIN: [],
      GYNECOLOGIE: [],
      OBSTETRIQUE: [],
      VIH: [],
      IST: [],
    };
  }

  if (!date1 || !date2) {
    console.warn("Veuillez choisir une date de début et une date de fin");
    return {
      MEDECIN: [],
      GYNECOLOGIE: [],
      OBSTETRIQUE: [],
      VIH: [],
      IST: [],
    };
  }

  const [allExamens, allVisites] = await Promise.all([
    prisma.examen.findMany(),
    prisma.visite.findMany({
      where: {
        idClinique: { in: clinicIds },
        dateVisite: { gte: date1, lte: date2 },
      },
      include: { Client: true, Clinique: true, FactureExamen: true },
    }) as Promise<VisiteWithRelations[]>,
  ]);

  // Parsing activiteIds : séparer les idActivite et idLieu
  const [tabIdActivite, tabIdLieu] = activiteIds.reduce<[string[], string[]]>(
    ([a, l], v) => {
      const [act, lieu] = v.split(">").map((s) => s?.trim());
      if (act) a.push(act);
      if (lieu) l.push(lieu);
      return [a, l];
    },
    [[], []]
  );

  // Sentinel "*" → pas de filtre (toutes les visites)
  const noFilter = activiteIds.includes("*");

  const filteredVisites = noFilter
    ? allVisites
    : allVisites.filter((visite) => {
        if (!tabIdActivite.length) {
          // Aucune activité sélectionnée → routine uniquement (sans activité)
          return !visite.idActivite;
        }
        const okActivite = tabIdActivite.includes(visite.idActivite ?? "");
        const okLieu =
          !tabIdLieu.length || tabIdLieu.includes(visite.idLieu ?? "");
        return okActivite && okLieu;
      });

  // Grouper les visites filtrées par client
  const visitesParClient = new Map<string, VisiteWithRelations[]>();
  filteredVisites.forEach((visite) => {
    const clientId = visite.idClient || "unknown";
    if (!visitesParClient.has(clientId)) visitesParClient.set(clientId, []);
    visitesParClient.get(clientId)!.push(visite);
  });

  // Préparer la structure finale : un tableau par type d'examen
  const result: Record<TypeExamen, ClientLaboType[]> = {
    MEDECIN: [],
    GYNECOLOGIE: [],
    OBSTETRIQUE: [],
    VIH: [],
    IST: [],
  };

  // Pour chaque client
  for (const [, visites] of visitesParClient.entries()) {
    const premiereVisite = visites[0];
    const client = premiereVisite.Client;
    if (!client) continue;

    // Récupérer tous les examens facturés du client
    const facturesExamensClient = visites.flatMap((visite) =>
      visite.FactureExamen.map((facture) => {
        const examen = allExamens.find(
          (e) => e.nomExamen === facture.libelleExamen
        );
        return {
          typeExamen: examen?.typeExamen ?? "",
          libelleExamen: facture.libelleExamen,
        };
      })
    );

    // Grouper par type d'examen
    const examensParType = new Map<
      string,
      { typeExamen: string; libelleExamen: string }[]
    >();

    facturesExamensClient.forEach((res) => {
      if (!res.typeExamen) return;
      if (!examensParType.has(res.typeExamen))
        examensParType.set(res.typeExamen, []);
      examensParType.get(res.typeExamen)!.push(res);
    });

    // Créer un client pour chaque type d'examen présent
    examensParType.forEach((examens, type) => {
      if (Object.values(TypeExamen).includes(type as TypeExamen)) {
        result[type as TypeExamen].push({
          nomClient: client.nom ?? "",
          prenomClient: client.prenom ?? "",
          sexeClient: client.sexe ?? "",
          dateNaissanceClient: client.dateNaissance ?? null,
          ageClient: client.dateNaissance
            ? calculerAge(client.dateNaissance)
            : null,
          typeExamen: type as TypeExamen,
          visites,
          resultatsExamens: examens,
        });
      }
    });
  }

  return result;
};
