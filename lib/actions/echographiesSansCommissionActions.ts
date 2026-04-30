"use server";

import prisma from "@/lib/prisma";

export type EchographieSansCommissionItem = {
  idFactureEchographie: string;
  idVisite: string;
  idClient: string;
  dateVisite: Date;
  libelleEchographie: string;
  prixEchographie: number;
  remiseEchographie: number;
  partEchographe: number;
  montantNet: number;
  clientCode: string;
  clientNom: string;
  clientPrenom: string;
  clientAge: number;
  clientSexe: string;
  clinique: string;
  prescripteurFacture: string; // l'utilisateur qui a saisi la facture
};

const calcAge = (dob: Date): number => {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
};

// Liste des échographies (FactureEchographie) sur la période où aucune
// commission n'a été attribuée à un prescripteur (CommissionEchographie absente).
export async function getEchographiesSansCommission(
  clinicIds: string[],
  dateDebut: Date,
  dateFin: Date,
): Promise<EchographieSansCommissionItem[]> {
  if (!clinicIds || clinicIds.length === 0) return [];

  const factures = await prisma.factureEchographie.findMany({
    where: {
      idClinique: { in: clinicIds },
      Visite: { dateVisite: { gte: dateDebut, lte: dateFin } },
      // Aucune commission liée
      CommissionEchographie: { none: {} },
    },
    include: {
      Client: true,
      Clinique: { select: { nomClinique: true } },
      User: { select: { name: true } },
      Visite: { select: { dateVisite: true } },
    },
    orderBy: { Visite: { dateVisite: "desc" } },
  });

  return factures.map((f) => {
    const montantNet = Math.max(
      0,
      Math.round(
        f.prixEchographie * (1 - (f.remiseEchographie || 0) / 100),
      ),
    );
    return {
      idFactureEchographie: f.id,
      idVisite: f.idVisite,
      idClient: f.idClient,
      dateVisite: f.Visite?.dateVisite ?? new Date(),
      libelleEchographie: f.libelleEchographie,
      prixEchographie: f.prixEchographie,
      remiseEchographie: f.remiseEchographie || 0,
      partEchographe: f.partEchographe || 0,
      montantNet,
      clientCode: f.Client?.code ?? "",
      clientNom: f.Client?.nom ?? "",
      clientPrenom: f.Client?.prenom ?? "",
      clientAge: f.Client?.dateNaissance ? calcAge(f.Client.dateNaissance) : 0,
      clientSexe: f.Client?.sexe ?? "",
      clinique: f.Clinique?.nomClinique ?? "",
      prescripteurFacture: f.User?.name ?? "",
    };
  });
}
