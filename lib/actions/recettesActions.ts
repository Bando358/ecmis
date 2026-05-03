"use server";

import prisma from "@/lib/prisma";

/** Recettes agrégées pour un mois calendaire et un ensemble de cliniques. */
export interface RecettesMois {
  label: string; // "Octobre 2026"
  year: number;
  month: number; // 0..11
  produits: number;
  ventesDirectes: number;
  prestations: number;
  examens: number;
  echographies: number;
  total: number;
}

const MOIS_NOMS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

/**
 * Retourne les recettes des trois derniers mois (mois ancré + 2 mois en
 * arrière), en se basant sur la `dateVisite` des visites associées à
 * chaque facture pour rester cohérent avec les autres rapports.
 *
 * @param clinicIds liste des cliniques considérées
 * @param anchor    date d'ancrage (typiquement la dateFin de la période)
 */
export async function getRecettesTroisDerniersMois(
  clinicIds: string[],
  anchor: Date,
): Promise<RecettesMois[]> {
  if (!clinicIds || clinicIds.length === 0) return [];
  const anchorDate = new Date(anchor);
  if (isNaN(anchorDate.getTime())) return [];

  const months: RecettesMois[] = [];

  for (let i = 2; i >= 0; i--) {
    const d = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const start = new Date(year, month, 1, 0, 0, 0, 0);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // ATTENTION : on s'aligne strictement sur le rapport financier (dashboard).
    //   - FactureProduit / FacturePrestation : filtrés par `dateFacture`
    //     (ces tables ont leur propre date de facturation)
    //   - FactureExamen / FactureEchographie : filtrés par `Visite.dateVisite`
    //     (pas de date de facture sur ces modèles)
    //   - VenteDirecte : ajoutée au total (ventes hors visite, par `dateVente`)
    //   - Pas d'application de remise/réduction sur examens & échos pour
    //     rester identique au rapport financier (qui prend les prix bruts).
    const factureDateFilter = { dateFacture: { gte: start, lte: end } };
    const visiteDateFilter = {
      Visite: { dateVisite: { gte: start, lte: end } },
    };

    const [produits, prestations, examens, echographies, ventesDirectes] =
      await Promise.all([
        prisma.factureProduit.aggregate({
          where: { idClinique: { in: clinicIds }, ...factureDateFilter },
          _sum: { montantProduit: true },
        }),
        prisma.facturePrestation.aggregate({
          where: { idClinique: { in: clinicIds }, ...factureDateFilter },
          _sum: { prixPrestation: true },
        }),
        prisma.factureExamen.aggregate({
          where: { idClinique: { in: clinicIds }, ...visiteDateFilter },
          _sum: { prixExamen: true },
        }),
        prisma.factureEchographie.aggregate({
          where: { idClinique: { in: clinicIds }, ...visiteDateFilter },
          _sum: { prixEchographie: true },
        }),
        prisma.venteDirecte.aggregate({
          where: {
            idClinique: { in: clinicIds },
            dateVente: { gte: start, lte: end },
          },
          _sum: { montantProduit: true },
        }),
      ]);

    const totalProduits = produits._sum.montantProduit ?? 0;
    const totalPrestations = prestations._sum.prixPrestation ?? 0;
    const totalExamens = examens._sum.prixExamen ?? 0;
    const totalEchographies = echographies._sum.prixEchographie ?? 0;
    const totalVentesDirectes = ventesDirectes._sum.montantProduit ?? 0;

    months.push({
      label: `${MOIS_NOMS[month]} ${year}`,
      year,
      month,
      produits: totalProduits,
      ventesDirectes: totalVentesDirectes,
      prestations: totalPrestations,
      examens: totalExamens,
      echographies: totalEchographies,
      total:
        totalProduits +
        totalVentesDirectes +
        totalPrestations +
        totalExamens +
        totalEchographies,
    });
  }

  return months;
}
