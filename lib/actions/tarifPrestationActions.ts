"use server";

import { TarifPrestation, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { TarifPrestationCreateSchema } from "@/lib/validations/finance";
import { logAction } from "./journalPharmacyActions";

// Création de TarifPrestation
export async function createTarifPrestation(data: TarifPrestation) {
  await requirePermission(TableName.TARIF_PRESTATION, "canCreate");
  const validated = validateServerData(TarifPrestationCreateSchema, data);
  const tarif = await prisma.tarifPrestation.create({
    data: validated,
  });
  await logAction({
    idUser: validated.idUser,
    action: "CREATION",
    entite: "TarifPrestation",
    entiteId: tarif.id,
    idClinique: validated.idClinique,
    description: `Création tarif prestation: ${validated.nomPrestation} - ${validated.montantPrestation} FCFA`,
  });
  return tarif;
}

// Récupérer toutes les TarifPrestation
export async function getAllTarifPrestation() {
  return await prisma.tarifPrestation.findMany();
}

// Récupérer les TarifPrestation par clinique
export async function getAllTarifPrestationByClinique(cliniqueId: string) {
  return await prisma.tarifPrestation.findMany({
    where: { idClinique: cliniqueId },
  });
}
// Suppression d'un tarif prestation
export async function deleteTarifPrestation(id: string) {
  await requirePermission(TableName.TARIF_PRESTATION, "canDelete");
  const existing = await prisma.tarifPrestation.findUnique({ where: { id } });
  if (existing) {
    await logAction({
      idUser: existing.idUser,
      action: "SUPPRESSION",
      entite: "TarifPrestation",
      entiteId: id,
      idClinique: existing.idClinique,
      description: `Suppression tarif prestation: ${existing.nomPrestation} - ${existing.montantPrestation} FCFA`,
      anciennesDonnees: existing as unknown as Record<string, unknown>,
    });
  }
  return await prisma.tarifPrestation.delete({
    where: { id },
  });
}

//Mise à jour de TarifPrestation
export async function updateTarifPrestation(id: string, data: TarifPrestation) {
  await requirePermission(TableName.TARIF_PRESTATION, "canUpdate");
  const validated = validateServerData(TarifPrestationCreateSchema.partial(), data);
  const updated = await prisma.tarifPrestation.update({
    where: { id },
    data: validated,
  });
  await logAction({
    idUser: data.idUser,
    action: "MODIFICATION",
    entite: "TarifPrestation",
    entiteId: id,
    idClinique: data.idClinique,
    description: `Modification tarif prestation: ${data.nomPrestation} - ${data.montantPrestation} FCFA`,
    nouvellesDonnees: validated as unknown as Record<string, unknown>,
  });
  return updated;
}
