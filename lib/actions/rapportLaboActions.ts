// "use server";
// // lib/actions/dashboardActions.ts
// import prisma from "@/lib/prisma";
// import { ResultatExamen, Visite, Client, Clinique } from "../generated/prisma";

// export type ClientLaboType = {
//   nomClient: string;
//   prenomClient: string;
//   sexeClient: string;
//   dateNaissanceClient: Date | null;
//   ageClient: number | null;
//   visites: Visite[];
//   resultatsExamens: (ResultatExamen & {
//     typeExamen: string;
//     libelleExamen: string;
//   })[];
// };

// // Type pour les visites avec relations incluses
// type VisiteWithRelations = Visite & {
//   Client: Client | null;
//   Clinique: Clinique | null;
//   ResultatExamen: ResultatExamen[];
// };

// const calculerAge = (dateNaissance: Date): number => {
//   const diffTemps = Date.now() - new Date(dateNaissance).getTime();
//   const ageDate = new Date(diffTemps);
//   return Math.abs(ageDate.getUTCFullYear() - 1970);
// };

// export const fetchLaboData = async (
//   clinicIds: string[],
//   date1: Date,
//   date2: Date
// ): Promise<{
//   clientLabo: ClientLaboType[];
// }> => {
//   if (!clinicIds || clinicIds.length === 0) {
//     alert("Veuillez choisir au moins une clinique");
//     return {
//       clientLabo: [],
//     };
//   }
//   if (!date1 || !date2) {
//     alert("Veuillez choisir une date de début et une date de fin");
//     return {
//       clientLabo: [],
//     };
//   }

//   const factureExamen = await prisma.factureExamen.findMany({
//     where: {
//       idClinique: { in: clinicIds },
//       Visite: {
//         dateVisite: {
//           gte: date1,
//           lte: date2,
//         },
//       },
//     },
//   });

//   const allExamens = await prisma.examen.findMany();

//   // Typage explicite du résultat
//   const allVisites = (await prisma.visite.findMany({
//     where: {
//       idClinique: { in: clinicIds },
//       dateVisite: {
//         gte: date1,
//         lte: date2,
//       },
//     },
//     include: {
//       Client: true,
//       Clinique: true,
//       ResultatExamen: true,
//     },
//   })) as VisiteWithRelations[];

//   // Grouper les visites par client
//   const visitesParClient = new Map<string, VisiteWithRelations[]>();

//   allVisites.forEach((visite) => {
//     // Utiliser idClient au lieu de Client.id
//     const clientId = visite.idClient || "unknown";
//     if (!visitesParClient.has(clientId)) {
//       visitesParClient.set(clientId, []);
//     }
//     visitesParClient.get(clientId)!.push(visite);
//   });

//   // Créer un ClientLaboType pour chaque client
//   const clientLabo: ClientLaboType[] = Array.from(
//     visitesParClient.entries()
//   ).map(([clientId, visites]) => {
//     const premiereVisite = visites[0];
//     const client = premiereVisite.Client;

//     // Récupérer tous les résultats d'examens pour ce client
//     const resultatsExamensClient = visites.flatMap((visite) =>
//       visite.ResultatExamen.map((resultat: ResultatExamen) => ({
//         ...resultat,
//         typeExamen:
//           allExamens.find(
//             (examen) =>
//               examen.nomExamen ===
//               factureExamen.find((fe) => fe.id === resultat.idFactureExamen)
//                 ?.libelleExamen
//           )?.nomExamen ?? "",
//         libelleExamen:
//           factureExamen.find((fe) => fe.id === resultat.idFactureExamen)
//             ?.libelleExamen ?? "",
//       }))
//     );

//     return {
//       nomClient: client?.nom ?? "",
//       prenomClient: client?.prenom ?? "",
//       sexeClient: client?.sexe ?? "",
//       dateNaissanceClient: client?.dateNaissance ?? null,
//       ageClient: client?.dateNaissance
//         ? calculerAge(client.dateNaissance)
//         : null,
//       visites: visites,
//       resultatsExamens: resultatsExamensClient,
//     };
//   });
//   const clientLab = clientLabo.filter(
//     (client) => client.resultatsExamens.length > 0
//   );

//   return {
//     clientLabo: clientLab,
//   };
// };
// "use server";
// import prisma from "@/lib/prisma";
// import { ResultatExamen, Visite, Client, Clinique } from "../generated/prisma";

// enum TypeExamen {
//   MEDECIN = "MEDECIN",
//   GYNECOLOGIE = "GYNECOLOGIE",
//   OBSTETRIQUE = "OBSTETRIQUE",
//   VIH = "VIH",
//   IST = "IST",
// }

// export type ClientLaboType = {
//   nomClient: string;
//   prenomClient: string;
//   sexeClient: string;
//   dateNaissanceClient: Date | null;
//   ageClient: number | null;
//   typeExamen: TypeExamen; // ✅ Nouveau champ
//   visites: Visite[];
//   resultatsExamens: (ResultatExamen & {
//     typeExamen: string;
//     libelleExamen: string;
//   })[];
// };

// type VisiteWithRelations = Visite & {
//   Client: Client | null;
//   Clinique: Clinique | null;
//   ResultatExamen: ResultatExamen[];
// };

// const calculerAge = (dateNaissance: Date): number => {
//   const diffTemps = Date.now() - new Date(dateNaissance).getTime();
//   const ageDate = new Date(diffTemps);
//   return Math.abs(ageDate.getUTCFullYear() - 1970);
// };

// export const fetchLaboData = async (
//   clinicIds: string[],
//   date1: Date,
//   date2: Date
// ): Promise<{ clientLabo: ClientLaboType[] }> => {
//   if (!clinicIds?.length) {
//     console.warn("Veuillez choisir au moins une clinique");
//     return { clientLabo: [] };
//   }
//   if (!date1 || !date2) {
//     console.warn("Veuillez choisir une date de début et une date de fin");
//     return { clientLabo: [] };
//   }

//   const factureExamen = await prisma.factureExamen.findMany({
//     where: {
//       idClinique: { in: clinicIds },
//       Visite: { dateVisite: { gte: date1, lte: date2 } },
//     },
//   });

//   const allExamens = await prisma.examen.findMany();

//   const allVisites = (await prisma.visite.findMany({
//     where: {
//       idClinique: { in: clinicIds },
//       dateVisite: { gte: date1, lte: date2 },
//     },
//     include: { Client: true, Clinique: true, ResultatExamen: true },
//   })) as VisiteWithRelations[];

//   // Grouper les visites par client
//   const visitesParClient = new Map<string, VisiteWithRelations[]>();
//   allVisites.forEach((visite) => {
//     const clientId = visite.idClient || "unknown";
//     if (!visitesParClient.has(clientId)) visitesParClient.set(clientId, []);
//     visitesParClient.get(clientId)!.push(visite);
//   });

//   const clientLabo: ClientLaboType[] = [];

//   // Pour chaque client
//   for (const [clientId, visites] of visitesParClient.entries()) {
//     const premiereVisite = visites[0];
//     const client = premiereVisite.Client;
//     if (!client) continue;

//     // Tous les résultats d'examens de ce client
//     const resultatsExamensClient = visites.flatMap((visite) =>
//       visite.ResultatExamen.map((resultat: ResultatExamen) => {
//         const facture = factureExamen.find(
//           (fe) => fe.id === resultat.idFactureExamen
//         );
//         const examen = allExamens.find(
//           (e) => e.nomExamen === facture?.libelleExamen
//         );

//         return {
//           ...resultat,
//           typeExamen: examen?.typeExamen ?? "",
//           libelleExamen: facture?.libelleExamen ?? "",
//         };
//       })
//     );

//     // ✅ Grouper les résultats par type d'examen
//     const examensParType = new Map<
//       string,
//       (ResultatExamen & { typeExamen: string; libelleExamen: string })[]
//     >();
//     resultatsExamensClient.forEach((res) => {
//       if (!res.typeExamen) return;
//       if (!examensParType.has(res.typeExamen))
//         examensParType.set(res.typeExamen, []);
//       examensParType
//         .get(res.typeExamen)!
//         .push(
//           res as ResultatExamen & { typeExamen: string; libelleExamen: string }
//         );
//     });

//     // ✅ Créer un client pour chaque type d'examen présent
//     examensParType.forEach((examens, type) => {
//       clientLabo.push({
//         nomClient: client.nom ?? "",
//         prenomClient: client.prenom ?? "",
//         sexeClient: client.sexe ?? "",
//         dateNaissanceClient: client.dateNaissance ?? null,
//         ageClient: client.dateNaissance
//           ? calculerAge(client.dateNaissance)
//           : null,
//         typeExamen: type as TypeExamen,
//         visites,
//         resultatsExamens: examens,
//       });
//     });
//   }

//   return { clientLabo };
// };

"use server";
import prisma from "@/lib/prisma";
import { ResultatExamen, Visite, Client, Clinique } from "@prisma/client";

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
  resultatsExamens: (ResultatExamen & {
    typeExamen: string;
    libelleExamen: string;
  })[];
};

type VisiteWithRelations = Visite & {
  Client: Client | null;
  Clinique: Clinique | null;
  ResultatExamen: ResultatExamen[];
};

const calculerAge = (dateNaissance: Date): number => {
  const diffTemps = Date.now() - new Date(dateNaissance).getTime();
  const ageDate = new Date(diffTemps);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

export const fetchLaboData = async (
  clinicIds: string[],
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

  const factureExamen = await prisma.factureExamen.findMany({
    where: {
      idClinique: { in: clinicIds },
      Visite: { dateVisite: { gte: date1, lte: date2 } },
    },
  });

  const allExamens = await prisma.examen.findMany();

  const allVisites = (await prisma.visite.findMany({
    where: {
      idClinique: { in: clinicIds },
      dateVisite: { gte: date1, lte: date2 },
    },
    include: { Client: true, Clinique: true, ResultatExamen: true },
  })) as VisiteWithRelations[];

  // Grouper les visites par client
  const visitesParClient = new Map<string, VisiteWithRelations[]>();
  allVisites.forEach((visite) => {
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

    // Récupérer tous les résultats d'examens du client
    const resultatsExamensClient = visites.flatMap((visite) =>
      visite.ResultatExamen.map((resultat: ResultatExamen) => {
        const facture = factureExamen.find(
          (fe) => fe.id === resultat.idFactureExamen
        );
        const examen = allExamens.find(
          (e) => e.nomExamen === facture?.libelleExamen
        );

        return {
          ...resultat,
          typeExamen: examen?.typeExamen ?? "",
          libelleExamen: facture?.libelleExamen ?? "",
        };
      })
    );

    // Grouper les résultats par type d'examen
    const examensParType = new Map<
      string,
      (ResultatExamen & { typeExamen: string; libelleExamen: string })[]
    >();

    resultatsExamensClient.forEach((res) => {
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
