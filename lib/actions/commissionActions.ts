"use server";

import { CommissionExamen, CommissionEchographie } from "@prisma/client";
import prisma from "@/lib/prisma";

// ==================== COMMISSION EXAMEN ====================

// Création d'une CommissionExamen
export async function createCommissionExamen(
  data: Omit<CommissionExamen, "createdAt" | "updatedAt">
) {
  return await prisma.commissionExamen.create({
    data,
  });
}

// Récupérer toutes les CommissionExamen par prescripteur
export async function getAllCommissionExamenByPrescripteur(idPrescripteur: string) {
  return await prisma.commissionExamen.findMany({
    where: { idPrescripteur },
    include: {
      FactureExamen: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

// Récupérer les commissions non payées par prescripteur
export async function getCommissionsExamenNonPayees(idPrescripteur: string) {
  return await prisma.commissionExamen.findMany({
    where: {
      idPrescripteur,
      paye: false
    },
    include: {
      FactureExamen: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

// Marquer une commission comme payée
export async function payerCommissionExamen(id: string) {
  return await prisma.commissionExamen.update({
    where: { id },
    data: {
      paye: true,
      datePaiement: new Date()
    },
  });
}

// Mise à jour d'une CommissionExamen
export async function updateCommissionExamen(
  id: string,
  data: Partial<CommissionExamen>
) {
  return await prisma.commissionExamen.update({
    where: { id },
    data,
  });
}

// Suppression d'une CommissionExamen
export async function deleteCommissionExamen(id: string) {
  return await prisma.commissionExamen.delete({
    where: { id },
  });
}

// Vérifier si une facture examen a déjà une commission
export async function getCommissionByFactureExamen(idFactureExamen: string) {
  return await prisma.commissionExamen.findFirst({
    where: { idFactureExamen },
  });
}

// ==================== COMMISSION ECHOGRAPHIE ====================

// Création d'une CommissionEchographie
export async function createCommissionEchographie(
  data: Omit<CommissionEchographie, "createdAt" | "updatedAt">
) {
  return await prisma.commissionEchographie.create({
    data,
  });
}

// Récupérer toutes les CommissionEchographie par prescripteur
export async function getAllCommissionEchographieByPrescripteur(idPrescripteur: string) {
  return await prisma.commissionEchographie.findMany({
    where: { idPrescripteur },
    include: {
      FactureEchographie: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

// Récupérer les commissions non payées par prescripteur
export async function getCommissionsEchographieNonPayees(idPrescripteur: string) {
  return await prisma.commissionEchographie.findMany({
    where: {
      idPrescripteur,
      paye: false
    },
    include: {
      FactureEchographie: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

// Marquer une commission comme payée
export async function payerCommissionEchographie(id: string) {
  return await prisma.commissionEchographie.update({
    where: { id },
    data: {
      paye: true,
      datePaiement: new Date()
    },
  });
}

// Mise à jour d'une CommissionEchographie
export async function updateCommissionEchographie(
  id: string,
  data: Partial<CommissionEchographie>
) {
  return await prisma.commissionEchographie.update({
    where: { id },
    data,
  });
}

// Suppression d'une CommissionEchographie
export async function deleteCommissionEchographie(id: string) {
  return await prisma.commissionEchographie.delete({
    where: { id },
  });
}

// Vérifier si une facture echographie a déjà une commission
export async function getCommissionByFactureEchographie(idFactureEchographie: string) {
  return await prisma.commissionEchographie.findFirst({
    where: { idFactureEchographie },
  });
}

// ==================== FONCTIONS UTILITAIRES ====================

// Récupérer le total des commissions non payées pour un prescripteur
export async function getTotalCommissionsNonPayees(idPrescripteur: string) {
  const [examenResult, echographieResult] = await Promise.all([
    prisma.commissionExamen.aggregate({
      where: { idPrescripteur, paye: false },
      _sum: { montantCommission: true },
    }),
    prisma.commissionEchographie.aggregate({
      where: { idPrescripteur, paye: false },
      _sum: { montantCommission: true },
    }),
  ]);

  return {
    totalExamen: examenResult._sum.montantCommission || 0,
    totalEchographie: echographieResult._sum.montantCommission || 0,
    total: (examenResult._sum.montantCommission || 0) + (echographieResult._sum.montantCommission || 0),
  };
}

// Payer toutes les commissions d'un prescripteur
export async function payerToutesCommissions(idPrescripteur: string) {
  const now = new Date();

  await Promise.all([
    prisma.commissionExamen.updateMany({
      where: { idPrescripteur, paye: false },
      data: { paye: true, datePaiement: now },
    }),
    prisma.commissionEchographie.updateMany({
      where: { idPrescripteur, paye: false },
      data: { paye: true, datePaiement: now },
    }),
  ]);

  return { success: true };
}

// ==================== REQUÊTES PAR DATE DE VISITE ====================

// Récupérer les commissions d'examen par plage de dates de visite
export async function getCommissionsExamenByDateRange(
  dateDebut: Date,
  dateFin: Date,
  idPrescripteur?: string
) {
  return await prisma.commissionExamen.findMany({
    where: {
      ...(idPrescripteur && { idPrescripteur }),
      Visite: {
        dateVisite: {
          gte: dateDebut,
          lte: dateFin,
        },
      },
    },
    include: {
      FactureExamen: true,
      Prescripteur: true,
      Visite: {
        include: {
          Client: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Récupérer les commissions d'échographie par plage de dates de visite
export async function getCommissionsEchographieByDateRange(
  dateDebut: Date,
  dateFin: Date,
  idPrescripteur?: string
) {
  return await prisma.commissionEchographie.findMany({
    where: {
      ...(idPrescripteur && { idPrescripteur }),
      Visite: {
        dateVisite: {
          gte: dateDebut,
          lte: dateFin,
        },
      },
    },
    include: {
      FactureEchographie: true,
      Prescripteur: true,
      Visite: {
        include: {
          Client: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Récupérer toutes les commissions (examen + échographie) par plage de dates
export async function getAllCommissionsByDateRange(
  dateDebut: Date,
  dateFin: Date,
  idPrescripteur?: string
) {
  const [examens, echographies] = await Promise.all([
    getCommissionsExamenByDateRange(dateDebut, dateFin, idPrescripteur),
    getCommissionsEchographieByDateRange(dateDebut, dateFin, idPrescripteur),
  ]);

  return {
    examens,
    echographies,
    totalExamen: examens.reduce((acc, c) => acc + c.montantCommission, 0),
    totalEchographie: echographies.reduce((acc, c) => acc + c.montantCommission, 0),
    total: examens.reduce((acc, c) => acc + c.montantCommission, 0) +
           echographies.reduce((acc, c) => acc + c.montantCommission, 0),
  };
}

// Récupérer les commissions par visite
export async function getCommissionsByVisite(idVisite: string) {
  const [examens, echographies] = await Promise.all([
    prisma.commissionExamen.findMany({
      where: { idVisite },
      include: {
        FactureExamen: true,
        Prescripteur: true,
      },
    }),
    prisma.commissionEchographie.findMany({
      where: { idVisite },
      include: {
        FactureEchographie: true,
        Prescripteur: true,
      },
    }),
  ]);

  return { examens, echographies };
}

// Récupérer le total des commissions non payées par plage de dates
export async function getTotalCommissionsNonPayeesByDateRange(
  dateDebut: Date,
  dateFin: Date,
  idPrescripteur?: string
) {
  const [examenResult, echographieResult] = await Promise.all([
    prisma.commissionExamen.aggregate({
      where: {
        paye: false,
        ...(idPrescripteur && { idPrescripteur }),
        Visite: {
          dateVisite: {
            gte: dateDebut,
            lte: dateFin,
          },
        },
      },
      _sum: { montantCommission: true },
    }),
    prisma.commissionEchographie.aggregate({
      where: {
        paye: false,
        ...(idPrescripteur && { idPrescripteur }),
        Visite: {
          dateVisite: {
            gte: dateDebut,
            lte: dateFin,
          },
        },
      },
      _sum: { montantCommission: true },
    }),
  ]);

  return {
    totalExamen: examenResult._sum.montantCommission || 0,
    totalEchographie: echographieResult._sum.montantCommission || 0,
    total:
      (examenResult._sum.montantCommission || 0) +
      (echographieResult._sum.montantCommission || 0),
  };
}
