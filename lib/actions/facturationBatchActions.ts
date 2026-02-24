"use server";

import prisma from "@/lib/prisma";
import {
  FactureProduit,
  FacturePrestation,
  FactureExamen,
  FactureEchographie,
  TypeCouverture,
  TableName,
} from "@prisma/client";
import { requirePermission } from "@/lib/auth/withPermission";
import { logAction } from "./journalPharmacyActions";

interface BatchFacturationData {
  couverture: {
    id: string;
    couvertIdClient: string;
    couvertType: TypeCouverture;
    couvertIdVisite: string;
  };
  produits: (FactureProduit & { quantiteToDecrement: number })[];
  prestations: FacturePrestation[];
  examens: FactureExamen[];
  echographies: FactureEchographie[];
  recapVisite: {
    idVisite: string;
    idUser: string;
    formulaire: string;
  };
}

export async function batchFacturation(data: BatchFacturationData) {
  await requirePermission(TableName.FACTURE_PRESTATION, "canCreate");
  await prisma.$transaction(
    async (tx) => {
      // 1. Couverture (skip si déjà existante)
      const existing = await tx.couverture.findFirst({
        where: { couvertIdVisite: data.couverture.couvertIdVisite },
      });
      if (!existing) {
        await tx.couverture.create({
          data: {
            id: data.couverture.id,
            couvertIdClient: data.couverture.couvertIdClient,
            couvertType: data.couverture.couvertType,
            couvertIdVisite: data.couverture.couvertIdVisite,
          },
        });
      }

      // 2. Produits : batch create + décrémentation stock en parallèle
      if (data.produits.length > 0) {
        const produitsData = data.produits.map(
          ({ quantiteToDecrement, ...rest }) => rest
        );
        await tx.factureProduit.createMany({ data: produitsData });

        // Décrémentation stock en parallèle
        await Promise.all(
          data.produits.map((produit) =>
            tx.tarifProduit.update({
              where: { id: produit.idTarifProduit },
              data: { quantiteStock: { decrement: produit.quantiteToDecrement } },
            })
          )
        );
      }

      // 3-5. Batch createMany en parallèle pour prestations, examens, echographies
      await Promise.all([
        data.prestations.length > 0
          ? tx.facturePrestation.createMany({ data: data.prestations })
          : Promise.resolve(),
        data.examens.length > 0
          ? tx.factureExamen.createMany({ data: data.examens })
          : Promise.resolve(),
        data.echographies.length > 0
          ? tx.factureEchographie.createMany({ data: data.echographies })
          : Promise.resolve(),
      ]);

      // 6. Recap visite
      const recapVisite = await tx.recapVisite.findUnique({
        where: { idVisite: data.recapVisite.idVisite },
      });
      if (recapVisite) {
        if (!recapVisite.formulaires.includes(data.recapVisite.formulaire)) {
          await tx.recapVisite.update({
            where: { idVisite: data.recapVisite.idVisite },
            data: {
              formulaires: [
                ...recapVisite.formulaires,
                data.recapVisite.formulaire,
              ],
              prescripteurs: [
                ...new Set([
                  ...recapVisite.prescripteurs,
                  data.recapVisite.idUser,
                ]),
              ],
            },
          });
        }
      }
    },
    { maxWait: 10000, timeout: 30000 }
  );

  // Log après la transaction réussie
  const totalProduits = data.produits.reduce((s, p) => s + p.montantProduit, 0);
  const totalPrestations = data.prestations.reduce((s, p) => s + p.prixPrestation, 0);
  const totalExamens = data.examens.reduce((s, e) => s + e.prixExamen, 0);
  const totalEchographies = data.echographies.reduce((s, e) => s + e.prixEchographie, 0);
  const total = totalProduits + totalPrestations + totalExamens + totalEchographies;

  await logAction({
    idUser: data.recapVisite.idUser,
    action: "CREATION",
    entite: "BatchFacturation",
    entiteId: data.recapVisite.idVisite,
    idClinique: data.produits[0]?.idClinique || data.prestations[0]?.idClinique || data.examens[0]?.idClinique || data.echographies[0]?.idClinique,
    description: `Facturation batch: ${data.produits.length} produits, ${data.prestations.length} prestations, ${data.examens.length} examens, ${data.echographies.length} echos - Total: ${total} FCFA`,
    nouvellesDonnees: { totalProduits, totalPrestations, totalExamens, totalEchographies, total },
  });
}

/**
 * Après suppression d'une facture, vérifie s'il reste des factures pour la visite.
 * Si aucune facture ne reste, retire le formulaire du RecapVisite.
 */
export async function updateRecapVisiteAfterDelete(
  idVisite: string,
  formulaire: string,
) {
  const [produits, prestations, examens, echographies] = await Promise.all([
    prisma.factureProduit.count({ where: { idVisite } }),
    prisma.facturePrestation.count({ where: { idVisite } }),
    prisma.factureExamen.count({ where: { idVisite } }),
    prisma.factureEchographie.count({ where: { idVisite } }),
  ]);

  if (produits + prestations + examens + echographies === 0) {
    const recapVisite = await prisma.recapVisite.findUnique({
      where: { idVisite },
    });
    if (recapVisite && recapVisite.formulaires.includes(formulaire)) {
      await prisma.recapVisite.update({
        where: { idVisite },
        data: {
          formulaires: recapVisite.formulaires.filter((f) => f !== formulaire),
        },
      });
    }
  }
}
