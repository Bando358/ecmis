"use server";

//lib/actions/lieuActions.ts
import { Lieu, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";

// Création d'une Fiche Lieu
export async function createLieu(data: Lieu) {
  await requirePermission(TableName.LIEU, "canCreate");
  return await prisma.lieu.create({
    data,
  });
}

// ************* Fiche Lieu BY tableau idActivite **************
export const getAllLieuByTabIdActivite = async (idActivite: string[]) => {
  const allLieu = await prisma.lieu.findMany({
    where: { idActivite: { in: idActivite } },
  });
  return allLieu;
};
// ************* Fiche Lieu **************
export const getAllLieu = async () => {
  const allLieu = await prisma.lieu.findMany();
  return allLieu;
};

// Récupération de une seul Fiche Lieu
export const getOneLieu = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneLieu = await prisma.lieu.findUnique({
    where: { id },
  });

  return oneLieu;
};

// Suppression d'une Fiche Lieu
export async function deleteLieu(id: string) {
  await requirePermission(TableName.LIEU, "canDelete");
  // Vérifier s'il y a des visites liées
  const visitesCount = await prisma.visite.count({ where: { idLieu: id } });
  if (visitesCount > 0) {
    throw new Error(
      `Impossible de supprimer ce lieu : ${visitesCount} visite(s) y sont rattachée(s).`
    );
  }
  return await prisma.lieu.delete({
    where: { id },
  });
}

//Mise à jour de la Fiche Lieu
export async function updateLieu(id: string, data: Lieu) {
  await requirePermission(TableName.LIEU, "canUpdate");
  return await prisma.lieu.update({
    where: { id },
    data,
  });
}
