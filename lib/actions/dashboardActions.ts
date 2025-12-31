"use server";
// lib/actions/dashboardActions.ts
import prisma from "@/lib/prisma";
import { getAllClientIncludedInDate } from "./clientActions";
import { Activite, Client, Planning, User, Visite } from "@prisma/client";

export type SaleType = "examen" | "produit" | "prestation" | "echographie";
// export type DataPrestation = {
//   nomPf: string;
//   dataPf: Planning[];
// }

export type FactureEchographieType = {
  echoId: string;
  echoIdVisite: string;
  echoIdClient: string;
  echoIdClinique: string;
  echoIdUser: string;
  echoIdPrescripteur?: string;
  echoRemise: number;
  echoLibelle: string;
  echoPrixTotal: number;
  echoIdDemandeEchographie: string;
  echoClient: unknown;
  echoClinique: unknown;
  echoUser: unknown;
};

export type FactureExamenType = {
  examId: string;
  examIdVisite: string;
  examIdClient: string;
  examIdClinique: string;
  examIdUser: string;
  examIdPrescripteur?: string;
  examDate: Date | null;
  examRemise: number;
  examLibelle: string;
  examPrixTotal: number;
  examIdDemandeExamen: string;
  examClient: unknown;
  examClinique: unknown;
  examUser: unknown;
};

export type FactureProduitType = {
  prodId: string;
  prodIdVisite: string;
  prodIdClient: string;
  prodIdClinique: string;
  prodIdUser: string;
  prodIdPrescripteur?: string;
  prodDate: Date;
  prodLibelle: string;
  prodMontantTotal: number;
  prodQuantite: number;
  prodMethode: string;
  prodIdTarifProduit: string;
  prodClient: unknown;
  prodClinique: unknown;
  prodUser: unknown;
};

export type FacturePrestationType = {
  prestId: string;
  prestIdVisite: string;
  prestIdClient: string;
  prestIdClinique: string;
  prestIdUser: string;
  prestIdPrescripteur?: string;
  prestDate: Date;
  prestLibelle: string;
  prestPrixTotal: number;
  prestIdPrestation: string;
  prestLibellePrestation: string;
  prestClient: unknown;
  prestClinique: unknown;
  prestUser: unknown;
};

export const fetchDashboardData = async (
  clinicIds: string[],
  dateFrom: Date,
  dateTo: Date
): Promise<{
  facturesExamens: FactureExamenType[];
  facturesProduits: FactureProduitType[];
  facturesPrestations: FacturePrestationType[];
  facturesEchographies: FactureEchographieType[];
  clients: Client[]; // Adjust type if you know the shape of clients
  activites: Activite[];
  visites: Visite[];
  planning: Planning[];
  allData: { name: string; data: unknown }[]; // Add this line for allData
}> => {
  if (!clinicIds || clinicIds.length === 0) {
    alert("Veuillez choisir au moins une clinique");
    return {
      facturesExamens: [],
      facturesProduits: [],
      facturesPrestations: [],
      facturesEchographies: [],
      clients: [],
      activites: [],
      visites: [],
      planning: [],
      allData: [],
    };
  }
  const allPrescripteurs = await prisma.user.findMany({
    where: {
      idCliniques: {
        hasSome: clinicIds, // Vérifie que le tableau contient au moins un idClinique
      },
      prescripteur: true, // seulement les prescripteurs
    },
  });

  const clients = await getAllClientIncludedInDate({
    dateDebut: dateFrom,
    dateFin: dateTo,
  });
  // récupérer les activités qui ont leur id dans visite
  // Construire dynamiquement le filtre dateVisite
  const whereVisite: any = {};

  if (dateFrom || dateTo) {
    whereVisite.dateVisite = {};

    if (dateFrom) {
      whereVisite.dateVisite.gte = dateFrom;
    }

    if (dateTo) {
      whereVisite.dateVisite.lte = dateTo;
    }
  }

  // 1️⃣ Récupérer les visites selon les dates valides
  const allVisiteByDateFromAndDateTo = await prisma.visite.findMany({
    where: whereVisite,
  });

  // 2️⃣ Extraire les IDs des visites
  const allVisiteIds = allVisiteByDateFromAndDateTo.map((visite) => visite.id);

  // 3️⃣ Récupérer les récapitulatifs liés aux visites
  const allDataRecap = await prisma.recapVisite.findMany({
    where: {
      idVisite: {
        in: allVisiteIds.length > 0 ? allVisiteIds : undefined,
      },
    },
  });

  const activites = await prisma.activite.findMany({
    where: {
      Visites: {
        some: {
          id: { in: allVisiteByDateFromAndDateTo.map((visite) => visite.id) },
        },
      },
    },
  });

  // Construire le filtre de date dynamiquement
  const dateFilter: any = {};
  if (dateFrom) dateFilter.gte = dateFrom;
  if (dateTo) dateFilter.lte = dateTo;

  const visiteWhere: any = {
    ...(Object.keys(dateFilter).length > 0 && { dateVisite: dateFilter }),
  };

  // Requête parallèle pour chaque type de facture
  const [
    facturesExamens,
    facturesProduits,
    facturesPrestations,
    facturesEchographies,
    planning,
    gynecoData,
    infertiliteData,
    obsteriqueData,
    accouchementData,
    cponData,
    saaData,
    istData,
    depistageVihData,
    pecVihData,
    medecineData,
    vbgData,
    testData,
  ] = await Promise.all([
    prisma.factureExamen.findMany({
      where: {
        idClinique: { in: clinicIds },
        ...(Object.keys(visiteWhere).length > 0 && { Visite: visiteWhere }),
      },
      include: {
        Visite: true,
        Client: true,
        Clinique: true,
        DemandeExamen: true,
        User: true,
      },
    }),

    prisma.factureProduit.findMany({
      where: {
        idClinique: { in: clinicIds },
        ...(Object.keys(visiteWhere).length > 0 && { Visite: visiteWhere }),
      },
      include: {
        Visite: true,
        Client: true,
        Clinique: true,
        tarifProduit: true,
        User: true,
      },
    }),

    prisma.facturePrestation.findMany({
      where: {
        idClinique: { in: clinicIds },
        ...(Object.keys(visiteWhere).length > 0 && { Visite: visiteWhere }),
      },
      include: {
        Visite: true,
        Client: true,
        Clinique: true,
        Prestation: true,
        User: true,
      },
    }),
    prisma.factureEchographie.findMany({
      where: {
        idClinique: { in: clinicIds },
        ...(Object.keys(visiteWhere).length > 0 && { Visite: visiteWhere }),
      },
      include: {
        Visite: true,
        Client: true,
        Clinique: true,
        DemandeEchographie: true,
        User: true,
      },
    }),
    // Planning
    prisma.planning.findMany({
      where: {
        idClinique: { in: clinicIds },
        ...(Object.keys(visiteWhere).length > 0 && { Visite: visiteWhere }),
      },
      include: {
        Visite: true,
        Client: true,
        Clinique: true,
        User: true,
      },
    }),

    // Gynecologie
    prisma.gynecologie.findMany({
      where: {
        idClinique: { in: clinicIds },
        ...(Object.keys(visiteWhere).length > 0 && { Visite: visiteWhere }),
      },
      include: {
        Visite: true,
        Client: true,
        Clinique: true,
        User: true,
      },
    }),
    // Infertilité
    prisma.infertilite.findMany({
      where: {
        infertIdClinique: { in: clinicIds },
        ...(Object.keys(visiteWhere).length > 0 && { Visite: visiteWhere }),
      },
      include: {
        Visite: true,
        Client: true,
        Clinique: true,
        User: true,
      },
    }),

    // Obsterique
    prisma.obstetrique.findMany({
      where: {
        obstIdClinique: { in: clinicIds },
        ...(Object.keys(visiteWhere).length > 0 && { Visite: visiteWhere }),
      },
      include: {
        Visite: true,
        Client: true,
        Clinique: true,
        User: true,
      },
    }),
    // Accouchement
    prisma.accouchement.findMany({
      where: {
        accouchementIdClinique: { in: clinicIds },
        ...(Object.keys(visiteWhere).length > 0 && { Visite: visiteWhere }),
      },
      include: {
        Visite: true,
        Client: true,
        Clinique: true,
        User: true,
      },
    }),
    // Cpon
    prisma.cpon.findMany({
      where: {
        cponIdClinique: { in: clinicIds },
        ...(Object.keys(visiteWhere).length > 0 && { Visite: visiteWhere }),
      },
      include: {
        Visite: true,
        Client: true,
        Clinique: true,
        User: true,
      },
    }),
    // SAA
    prisma.saa.findMany({
      where: {
        saaIdClinique: { in: clinicIds },
        ...(Object.keys(visiteWhere).length > 0 && { Visite: visiteWhere }),
      },
      include: {
        Visite: true,
        Client: true,
        Clinique: true,
        User: true,
      },
    }),
    // IST
    prisma.ist.findMany({
      where: {
        istIdClinique: { in: clinicIds },
        ...(Object.keys(visiteWhere).length > 0 && { Visite: visiteWhere }),
      },
      include: {
        Visite: true,
        Client: true,
        Clinique: true,
        User: true,
      },
    }),
    // Dépistage VIH
    prisma.depistageVih.findMany({
      where: {
        depistageVihIdClinique: { in: clinicIds },
        ...(Object.keys(visiteWhere).length > 0 && { Visite: visiteWhere }),
      },
      include: {
        Visite: true,
        Client: true,
        Clinique: true,
        User: true,
      },
    }),
    // PEC VIH
    prisma.pecVih.findMany({
      where: {
        pecVihIdClinique: { in: clinicIds },
        ...(Object.keys(visiteWhere).length > 0 && { Visite: visiteWhere }),
      },
      include: {
        Visite: true,
        Client: true,
        Clinique: true,
        User: true,
      },
    }),
    // Médecine
    prisma.medecine.findMany({
      where: {
        mdgIdClinique: { in: clinicIds },
        ...(Object.keys(visiteWhere).length > 0 && { Visite: visiteWhere }),
      },
      include: {
        Visite: true,
        Client: true,
        Clinique: true,
        User: true,
      },
    }),
    // VBG
    prisma.vbg.findMany({
      where: {
        vbgIdClinique: { in: clinicIds },
        ...(Object.keys(visiteWhere).length > 0 && { Visite: visiteWhere }),
      },
      include: {
        Visite: true,
        Client: true,
        Clinique: true,
        User: true,
      },
    }),
    // test
    prisma.testGrossesse.findMany({
      where: {
        testIdClinique: { in: clinicIds },
        ...(Object.keys(visiteWhere).length > 0 && { Visite: visiteWhere }),
      },
      include: {
        Visite: true,
        Client: true,
        Clinique: true,
        User: true,
      },
    }),
  ]);

  //   const allDataRecap: {
  //     id: string;
  //     idVisite: string;
  //     idClient: string;
  //     updatedAt: Date;
  //     prescripteurs: string[];
  //     formulaires: string[];
  // }[]
  // ========================== Récupérer le id préscripteur du tableau allDataRecap.prescripteurs correspondant à la visite et le prescripteur doit être dans allPrescripteurs ==========================

  // Map FactureExamen
  const examens = facturesExamens.map((f) => ({
    examId: f.id,
    examIdVisite: f.idVisite,
    examIdClient: f.idClient,
    examIdClinique: f.idClinique,
    examIdUser: f.idUser,
    examIdPrescripteur: findPrescripteurFromRecap(
      f.idClient,
      f.idVisite,
      allDataRecap,
      allPrescripteurs
    ),
    examDate: f.Visite?.dateVisite || null,
    examLibelle: f.libelleExamen,
    examRemise: f.remiseExamen || 0,
    examPrixTotal: f.prixExamen,
    examIdDemandeExamen: f.idDemandeExamen,
    examClient: f.Client,
    examClinique: f.Clinique,
    examUser: f.User,
  }));

  // Map FactureProduit
  const produits = facturesProduits.map((f) => ({
    prodId: f.id,
    prodIdVisite: f.idVisite,
    prodIdClient: f.idClient,
    prodIdClinique: f.idClinique,
    prodIdUser: f.idUser,
    prodIdPrescripteur: findPrescripteurFromRecap(
      f.idClient,
      f.idVisite,
      allDataRecap,
      allPrescripteurs
    ),
    prodDate: f.dateFacture,
    prodLibelle: f.idTarifProduit,
    prodMontantTotal: f.montantProduit || 0,
    prodQuantite: f.quantite,
    // prodPrixUnitaire: f.montantProduit,
    prodMethode: String(f.methode),
    prodIdTarifProduit: f.idTarifProduit,
    prodClient: f.Client,
    prodClinique: f.Clinique,
    prodUser: f.User,
  }));

  // Map FacturePrestation
  const prestations = facturesPrestations.map((f) => ({
    prestId: f.id,
    prestIdVisite: f.idVisite,
    prestIdClient: f.idClient,
    prestIdClinique: f.idClinique,
    prestIdUser: f.idUser,
    prestIdPrescripteur: findPrescripteurFromRecap(
      f.idClient,
      f.idVisite,
      allDataRecap,
      allPrescripteurs
    ),
    prestDate: f.dateFacture,
    prestLibelle: f.libellePrestation,
    prestPrixTotal: f.prixPrestation,
    prestIdPrestation: f.idPrestation,
    prestLibellePrestation: f.libellePrestation,
    prestClient: f.Client,
    prestClinique: f.Clinique,
    prestUser: f.User,
  }));

  // Map FactureEchographie
  const echographies = facturesEchographies.map((f) => ({
    echoId: f.id,
    echoIdVisite: f.idVisite,
    echoIdClient: f.idClient,
    echoIdClinique: f.idClinique,
    echoIdUser: f.idUser,
    echoIdPrescripteur: findPrescripteurFromRecap(
      f.idClient,
      f.idVisite,
      allDataRecap,
      allPrescripteurs
    ),
    echoRemise: f.remiseEchographie || 0,
    echoLibelle: f.libelleEchographie,
    echoPrixTotal: f.prixEchographie,
    echoIdDemandeEchographie: f.idDemandeEchographie,
    echoClient: f.Client,
    echoClinique: f.Clinique,
    echoUser: f.User,
  }));

  // ✅ Tableau final structuré
  const allData = [
    { name: "Contraception", data: planning },
    { name: "Gynecologie", data: gynecoData },
    { name: "Infertilité", data: infertiliteData },
    { name: "Test de grossesse", data: testData },
    { name: "Obstétrique", data: obsteriqueData },
    { name: "Accouchement", data: accouchementData },
    { name: "CPON", data: cponData },
    { name: "SAA", data: saaData },
    { name: "IST", data: istData },
    { name: "Dépistage VIH", data: depistageVihData },
    { name: "PEC VIH", data: pecVihData },
    { name: "Médecine", data: medecineData },
    { name: "VBG", data: vbgData },
  ];

  return {
    facturesExamens: examens,
    facturesProduits: produits,
    facturesPrestations: prestations,
    facturesEchographies: echographies,
    clients,
    activites,
    visites: allVisiteByDateFromAndDateTo,
    planning,
    allData,
  };
};

// Utility: find prescripteur id for a given client (and optional visite) inside a recap array
// Ensure the returned prescripteur exists in the provided allPrescripteurs list (if given)
const findPrescripteurFromRecap = (
  idClient: string,
  idVisite: string | undefined,
  tabRecap: {
    id: string;
    idVisite: string;
    idClient: string;
    updatedAt: Date;
    prescripteurs: string[];
    formulaires: string[];
  }[],
  allPrescripteurs?: User[]
): string | undefined => {
  if (!idClient || !Array.isArray(tabRecap) || tabRecap.length === 0)
    return undefined;

  // Build a set of valid prescripteur ids if provided
  const validPrescripteurIds = Array.isArray(allPrescripteurs)
    ? new Set(allPrescripteurs.map((u) => String(u.id)))
    : undefined;

  const pickValid = (ids: string[] | undefined): string | undefined => {
    if (!Array.isArray(ids) || ids.length === 0) return undefined;
    if (!validPrescripteurIds) return ids[0];
    return ids.find((pid) => validPrescripteurIds.has(String(pid)));
  };

  // Prefer an exact match on both client and visite when idVisite is provided
  if (idVisite) {
    const match = tabRecap.find(
      (r) =>
        r.idClient === idClient &&
        r.idVisite === idVisite &&
        Array.isArray(r.prescripteurs) &&
        r.prescripteurs.length > 0
    );
    const found = match ? pickValid(match.prescripteurs) : undefined;
    if (found) return found;
  }

  // Otherwise, find any recap entry matching the client that has prescripteurs
  for (const r of tabRecap) {
    if (r.idClient !== idClient) continue;
    const candidate = pickValid(r.prescripteurs);
    if (candidate) return candidate;
  }

  return undefined;
};
