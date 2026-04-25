"use server";
import prisma from "@/lib/prisma";

export type SaleType = "examen" | "produit" | "prestation" | "echographie";

export type FactureEchographieType = {
  echoId: string;
  echoIdVisite: string;
  echoIdClient: string;
  echoIdClinique: string;
  echoIdUser: string;
  echoRemise: number;
  echoLibelle: string;
  echoPrixTotal: number;
  echoPartEchographe: number;
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
  examDate: Date | null;
  examRemise: number;
  examLibelle: string;
  examPrixTotal: number;
  examIdDemandeExamen: string;
  examSoustraitanceExamen: boolean;
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
  prodDate: Date;
  prodLibelle: string;
  prodMontantTotal: number;
  prodQuantite: number;
  // prodPrixUnitaire: number;
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
  prestDate: Date;
  prestLibelle: string;
  prestPrixTotal: number;
  prestIdPrestation: string;
  prestLibellePrestation: string;
  prestClient: unknown;
  prestClinique: unknown;
  prestUser: unknown;
};

export const fetchVentesData = async (
  clinicIds: string[],
  dateFrom: Date,
  dateTo: Date
): Promise<{
  facturesExamens: FactureExamenType[];
  facturesProduits: FactureProduitType[];
  facturesPrestations: FacturePrestationType[];
  facturesEchographies: FactureEchographieType[];
}> => {
  if (!clinicIds || clinicIds.length === 0) {
    console.warn("venteActions: Aucune clinique sélectionnée");
    return {
      facturesExamens: [],
      facturesProduits: [],
      facturesPrestations: [],
      facturesEchographies: [],
    };
  }

  // Requête parallèle pour chaque type de facture
  const [
    facturesExamens,
    facturesProduits,
    facturesPrestations,
    facturesEchographies,
    ventesDirectes,
  ] = await Promise.all([
    prisma.factureExamen.findMany({
      where: {
        idClinique: { in: clinicIds },
        Visite: {
          dateVisite: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
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
        Visite: {
          dateVisite: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
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
        Visite: {
          dateVisite: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
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
        Visite: {
          dateVisite: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
      },
      include: {
        Visite: true,
        Client: true,
        Clinique: true,
        DemandeEchographie: true,
        User: true,
      },
    }),

    prisma.venteDirecte.findMany({
      where: {
        idClinique: { in: clinicIds },
        dateVente: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      include: {
        Clinique: true,
        User: true,
      },
    }),
  ]);

  // Map FactureExamen
  const examens = facturesExamens.map((f) => ({
    examId: f.id,
    examIdVisite: f.idVisite,
    examIdClient: f.idClient,
    examIdClinique: f.idClinique,
    examIdUser: f.idUser,
    examDate: f.Visite?.dateVisite || null,
    examLibelle: f.libelleExamen,
    examRemise: f.remiseExamen || 0,
    examPrixTotal: f.prixExamen,
    examIdDemandeExamen: f.idDemandeExamen,
    examSoustraitanceExamen: f.soustraitanceExamen || false,
    examClient: f.Client,
    examClinique: f.Clinique,
    examUser: f.User,
  }));

  // Map FactureProduit (date = date de la visite, pas date d'enregistrement)
  const produits = facturesProduits.map((f) => ({
    prodId: f.id,
    prodIdVisite: f.idVisite,
    prodIdClient: f.idClient,
    prodIdClinique: f.idClinique,
    prodIdUser: f.idUser,
    prodDate: f.Visite?.dateVisite ?? f.dateFacture,
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

  // Map VenteDirecte → même shape que FactureProduitType
  const ventesDirectesMapped = ventesDirectes.map((v) => ({
    prodId: v.id,
    prodIdVisite: "",
    prodIdClient: "",
    prodIdClinique: v.idClinique,
    prodIdUser: v.idUser,
    prodDate: v.dateVente,
    prodLibelle: v.idTarifProduit,
    prodMontantTotal: v.montantProduit || 0,
    prodQuantite: v.quantite,
    prodMethode: String(v.methode),
    prodIdTarifProduit: v.idTarifProduit,
    prodClient: null,
    prodClinique: v.Clinique,
    prodUser: v.User,
  }));

  // Map FacturePrestation (date = date de la visite, pas date d'enregistrement)
  const prestations = facturesPrestations.map((f) => ({
    prestId: f.id,
    prestIdVisite: f.idVisite,
    prestIdClient: f.idClient,
    prestIdClinique: f.idClinique,
    prestIdUser: f.idUser,
    prestDate: f.Visite?.dateVisite ?? f.dateFacture,
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
    echoRemise: f.remiseEchographie || 0,
    echoLibelle: f.libelleEchographie,
    echoPrixTotal: f.prixEchographie,
    echoPartEchographe: f.partEchographe || 0,
    echoIdDemandeEchographie: f.idDemandeEchographie,
    echoClient: f.Client,
    echoClinique: f.Clinique,
    echoUser: f.User,
  }));

  return {
    facturesExamens: examens,
    facturesProduits: [...produits, ...ventesDirectesMapped],
    facturesPrestations: prestations,
    facturesEchographies: echographies,
  };
};
