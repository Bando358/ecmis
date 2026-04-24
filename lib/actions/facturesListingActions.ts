"use server";

import prisma from "@/lib/prisma";

export type FactureTypeFilter =
  | "produit"
  | "prestation"
  | "examen"
  | "echographie";

export type FactureItem = {
  id: string;
  type: FactureTypeFilter;
  date: Date;
  libelle: string;
  categorie: string; // type produit / type examen / region écho / "Prestation"
  quantite: number;
  prixUnitaire: number;
  remise: number;
  reduction: number;
  montant: number;
  clientId: string;
  clientCode: string;
  clientNom: string;
  clientPrenom: string;
  clientAge: number;
  clientSexe: string;
  clinique: string;
  prescripteur: string;
  idVisite: string;
};

const calcAge = (dob: Date): number => {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
};

export async function getAllFacturesByClinique(
  clinicIds: string[],
  dateDebut: Date,
  dateFin: Date,
): Promise<FactureItem[]> {
  if (!clinicIds || clinicIds.length === 0) return [];

  const [produits, prestations, examens, echographies] = await Promise.all([
    prisma.factureProduit.findMany({
      where: {
        idClinique: { in: clinicIds },
        dateFacture: { gte: dateDebut, lte: dateFin },
      },
      include: {
        Client: true,
        Clinique: { select: { nomClinique: true } },
        User: { select: { name: true } },
        tarifProduit: {
          include: {
            Produit: { select: { typeProduit: true } },
          },
        },
      },
    }),
    prisma.facturePrestation.findMany({
      where: {
        idClinique: { in: clinicIds },
        dateFacture: { gte: dateDebut, lte: dateFin },
      },
      include: {
        Client: true,
        Clinique: { select: { nomClinique: true } },
        User: { select: { name: true } },
      },
    }),
    prisma.factureExamen.findMany({
      where: {
        idClinique: { in: clinicIds },
        Visite: { dateVisite: { gte: dateDebut, lte: dateFin } },
      },
      include: {
        Client: true,
        Clinique: { select: { nomClinique: true } },
        User: { select: { name: true } },
        Visite: { select: { dateVisite: true } },
      },
    }),
    prisma.factureEchographie.findMany({
      where: {
        idClinique: { in: clinicIds },
        Visite: { dateVisite: { gte: dateDebut, lte: dateFin } },
      },
      include: {
        Client: true,
        Clinique: { select: { nomClinique: true } },
        User: { select: { name: true } },
        Visite: { select: { dateVisite: true } },
        DemandeEchographie: { select: { serviceEchographie: true } },
      },
    }),
  ]);

  const items: FactureItem[] = [];

  produits.forEach((f) => {
    const pu = f.quantite > 0 ? Math.round(f.montantProduit / f.quantite) : 0;
    items.push({
      id: f.id,
      type: "produit",
      date: f.dateFacture,
      libelle: f.nomProduit,
      categorie: f.tarifProduit?.Produit?.typeProduit ?? "",
      quantite: f.quantite,
      prixUnitaire: pu,
      remise: 0,
      reduction: 0,
      montant: f.montantProduit,
      clientId: f.idClient,
      clientCode: f.Client?.code ?? "",
      clientNom: f.Client?.nom ?? "",
      clientPrenom: f.Client?.prenom ?? "",
      clientAge: f.Client?.dateNaissance ? calcAge(f.Client.dateNaissance) : 0,
      clientSexe: f.Client?.sexe ?? "",
      clinique: f.Clinique?.nomClinique ?? "",
      prescripteur: f.User?.name ?? "",
      idVisite: f.idVisite,
    });
  });

  prestations.forEach((f) => {
    items.push({
      id: f.id,
      type: "prestation",
      date: f.dateFacture,
      libelle: f.libellePrestation,
      categorie: "Prestation",
      quantite: 1,
      prixUnitaire: f.prixPrestation,
      remise: 0,
      reduction: 0,
      montant: f.prixPrestation,
      clientId: f.idClient,
      clientCode: f.Client?.code ?? "",
      clientNom: f.Client?.nom ?? "",
      clientPrenom: f.Client?.prenom ?? "",
      clientAge: f.Client?.dateNaissance ? calcAge(f.Client.dateNaissance) : 0,
      clientSexe: f.Client?.sexe ?? "",
      clinique: f.Clinique?.nomClinique ?? "",
      prescripteur: f.User?.name ?? "",
      idVisite: f.idVisite,
    });
  });

  examens.forEach((f) => {
    items.push({
      id: f.id,
      type: "examen",
      date: f.Visite?.dateVisite ?? new Date(),
      libelle: f.libelleExamen,
      categorie: f.soustraitanceExamen ? "Sous-traitance" : "Laboratoire",
      quantite: 1,
      prixUnitaire: f.prixExamen,
      remise: f.remiseExamen,
      reduction: f.reductionExamen,
      montant: Math.max(
        0,
        Math.round(
          (f.prixExamen - (f.reductionExamen || 0)) *
            (1 - (f.remiseExamen || 0) / 100),
        ),
      ),
      clientId: f.idClient,
      clientCode: f.Client?.code ?? "",
      clientNom: f.Client?.nom ?? "",
      clientPrenom: f.Client?.prenom ?? "",
      clientAge: f.Client?.dateNaissance ? calcAge(f.Client.dateNaissance) : 0,
      clientSexe: f.Client?.sexe ?? "",
      clinique: f.Clinique?.nomClinique ?? "",
      prescripteur: f.User?.name ?? "",
      idVisite: f.idVisite,
    });
  });

  echographies.forEach((f) => {
    items.push({
      id: f.id,
      type: "echographie",
      date: f.Visite?.dateVisite ?? new Date(),
      libelle: f.libelleEchographie,
      categorie: f.DemandeEchographie?.serviceEchographie ?? "Echographie",
      quantite: 1,
      prixUnitaire: f.prixEchographie,
      remise: f.remiseEchographie,
      reduction: 0,
      montant: Math.max(
        0,
        Math.round(f.prixEchographie * (1 - (f.remiseEchographie || 0) / 100)),
      ),
      clientId: f.idClient,
      clientCode: f.Client?.code ?? "",
      clientNom: f.Client?.nom ?? "",
      clientPrenom: f.Client?.prenom ?? "",
      clientAge: f.Client?.dateNaissance ? calcAge(f.Client.dateNaissance) : 0,
      clientSexe: f.Client?.sexe ?? "",
      clinique: f.Clinique?.nomClinique ?? "",
      prescripteur: f.User?.name ?? "",
      idVisite: f.idVisite,
    });
  });

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return items;
}
