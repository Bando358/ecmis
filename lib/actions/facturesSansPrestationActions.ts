"use server";

import prisma from "@/lib/prisma";

export type ClientFactureSansPrestationItem = {
  idVisite: string;
  idClient: string;
  dateVisite: Date;
  motifVisite: string;
  clientCode: string;
  clientNom: string;
  clientPrenom: string;
  clientAge: number;
  clientSexe: string;
  clinique: string;
  prescripteur: string;
  totalFacture: number;
  // Détail par type de facturation pour mieux comprendre la situation
  nbProduits: number;
  nbPrestations: number;
  nbExamens: number;
  nbEchographies: number;
};

const calcAge = (dob: Date): number => {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
};

// Liste des visites de la période où le client a été facturé
// (au moins 1 Facture*) mais où aucune prestation n'a été enregistrée
// (aucun formulaire médical et aucun résultat d'examen/écho).
//
// Optimisation : au lieu de 17 sous-requêtes "none" empilées (très coûteux),
// on procède en 2 étapes :
//   1) Récupérer toutes les visites de la période avec au moins une facture.
//   2) Identifier en parallèle les visites qui possèdent au moins une
//      prestation médicale, puis filtrer en mémoire.
export async function getClientsFacturesSansPrestation(
  clinicIds: string[],
  dateDebut: Date,
  dateFin: Date,
): Promise<ClientFactureSansPrestationItem[]> {
  if (!clinicIds || clinicIds.length === 0) return [];

  // Étape 1 : visites facturées de la période
  const visitesAvecFacture = await prisma.visite.findMany({
    where: {
      idClinique: { in: clinicIds },
      dateVisite: { gte: dateDebut, lte: dateFin },
      OR: [
        { FactureProduit: { some: {} } },
        { FacturePrestation: { some: {} } },
        { FactureExamen: { some: {} } },
        { FactureEchographie: { some: {} } },
      ],
    },
    include: {
      Client: true,
      Clinique: { select: { nomClinique: true } },
      User: { select: { name: true } },
      FactureProduit: { select: { montantProduit: true } },
      FacturePrestation: { select: { prixPrestation: true } },
      FactureExamen: {
        select: {
          prixExamen: true,
          remiseExamen: true,
          reductionExamen: true,
        },
      },
      FactureEchographie: {
        select: { prixEchographie: true, remiseEchographie: true },
      },
    },
    orderBy: { dateVisite: "desc" },
  });

  if (visitesAvecFacture.length === 0) return [];

  const visiteIds = visitesAvecFacture.map((v) => v.id);

  // Étape 2 : visites qui ont au moins une prestation médicale
  // 17 requêtes simples (idVisite IN (...)) lancées en parallèle.
  // Chacune utilise l'index sur idVisite -> très rapide.
  const [
    planning,
    gyneco,
    ist,
    infert,
    vbg,
    medecine,
    grossesse,
    obst,
    cpon,
    test,
    accouch,
    saa,
    dep,
    pec,
    examPv,
    resultEx,
    resultEcho,
  ] = await Promise.all([
    prisma.planning.findMany({
      where: { idVisite: { in: visiteIds } },
      select: { idVisite: true },
    }),
    prisma.gynecologie.findMany({
      where: { idVisite: { in: visiteIds } },
      select: { idVisite: true },
    }),
    prisma.ist.findMany({
      where: { istIdVisite: { in: visiteIds } },
      select: { istIdVisite: true },
    }),
    prisma.infertilite.findMany({
      where: { infertIdVisite: { in: visiteIds } },
      select: { infertIdVisite: true },
    }),
    prisma.vbg.findMany({
      where: { vbgIdVisite: { in: visiteIds } },
      select: { vbgIdVisite: true },
    }),
    prisma.medecine.findMany({
      where: { mdgIdVisite: { in: visiteIds } },
      select: { mdgIdVisite: true },
    }),
    prisma.grossesse.findMany({
      where: { grossesseIdVisite: { in: visiteIds } },
      select: { grossesseIdVisite: true },
    }),
    prisma.obstetrique.findMany({
      where: { obstIdVisite: { in: visiteIds } },
      select: { obstIdVisite: true },
    }),
    prisma.cpon.findMany({
      where: { cponIdVisite: { in: visiteIds } },
      select: { cponIdVisite: true },
    }),
    prisma.testGrossesse.findMany({
      where: { testIdVisite: { in: visiteIds } },
      select: { testIdVisite: true },
    }),
    prisma.accouchement.findMany({
      where: { accouchementIdVisite: { in: visiteIds } },
      select: { accouchementIdVisite: true },
    }),
    prisma.saa.findMany({
      where: { saaIdVisite: { in: visiteIds } },
      select: { saaIdVisite: true },
    }),
    prisma.depistageVih.findMany({
      where: { depistageVihIdVisite: { in: visiteIds } },
      select: { depistageVihIdVisite: true },
    }),
    prisma.pecVih.findMany({
      where: { pecVihIdVisite: { in: visiteIds } },
      select: { pecVihIdVisite: true },
    }),
    prisma.examenPvVih.findMany({
      where: { examenPvVihIdVisite: { in: visiteIds } },
      select: { examenPvVihIdVisite: true },
    }),
    prisma.resultatExamen.findMany({
      where: { idVisite: { in: visiteIds } },
      select: { idVisite: true },
    }),
    prisma.resultatEchographie.findMany({
      where: { idVisite: { in: visiteIds } },
      select: { idVisite: true },
    }),
  ]);

  const idsAvecPrestation = new Set<string>([
    ...planning.map((p) => p.idVisite),
    ...gyneco.map((g) => g.idVisite),
    ...ist.map((i) => i.istIdVisite),
    ...infert.map((i) => i.infertIdVisite),
    ...vbg.map((v) => v.vbgIdVisite),
    ...medecine.map((m) => m.mdgIdVisite),
    ...grossesse.map((g) => g.grossesseIdVisite),
    ...obst.map((o) => o.obstIdVisite),
    ...cpon.map((c) => c.cponIdVisite),
    ...test.map((t) => t.testIdVisite),
    ...accouch.map((a) => a.accouchementIdVisite),
    ...saa.map((s) => s.saaIdVisite),
    ...dep.map((d) => d.depistageVihIdVisite),
    ...pec.map((p) => p.pecVihIdVisite),
    ...examPv.map((e) => e.examenPvVihIdVisite),
    ...resultEx.map((r) => r.idVisite),
    ...resultEcho.map((r) => r.idVisite),
  ]);

  // Filtrer : ne garder que les visites SANS prestation
  const visitesSansPrestation = visitesAvecFacture.filter(
    (v) => !idsAvecPrestation.has(v.id),
  );

  return visitesSansPrestation.map((v) => {
    const totalProduits = v.FactureProduit.reduce(
      (s, f) => s + (f.montantProduit || 0),
      0,
    );
    const totalPrestations = v.FacturePrestation.reduce(
      (s, f) => s + (f.prixPrestation || 0),
      0,
    );
    const totalExamens = v.FactureExamen.reduce(
      (s, f) =>
        s +
        Math.max(
          0,
          Math.round(
            (f.prixExamen - (f.reductionExamen || 0)) *
              (1 - (f.remiseExamen || 0) / 100),
          ),
        ),
      0,
    );
    const totalEchographies = v.FactureEchographie.reduce(
      (s, f) =>
        s +
        Math.max(
          0,
          Math.round(
            f.prixEchographie * (1 - (f.remiseEchographie || 0) / 100),
          ),
        ),
      0,
    );

    return {
      idVisite: v.id,
      idClient: v.idClient,
      dateVisite: v.dateVisite,
      motifVisite: v.motifVisite,
      clientCode: v.Client?.code ?? "",
      clientNom: v.Client?.nom ?? "",
      clientPrenom: v.Client?.prenom ?? "",
      clientAge: v.Client?.dateNaissance ? calcAge(v.Client.dateNaissance) : 0,
      clientSexe: v.Client?.sexe ?? "",
      clinique: v.Clinique?.nomClinique ?? "",
      prescripteur: v.User?.name ?? "",
      totalFacture:
        totalProduits + totalPrestations + totalExamens + totalEchographies,
      nbProduits: v.FactureProduit.length,
      nbPrestations: v.FacturePrestation.length,
      nbExamens: v.FactureExamen.length,
      nbEchographies: v.FactureEchographie.length,
    };
  });
}
