"use server";

import { Echographie, TypeEchographie, RegionExaminee } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création de Echographie
export async function createEchographie(data: Echographie) {
  return await prisma.echographie.create({
    data,
  });
}

// Récupérer toutes les Echographies
export async function getAllEchographies() {
  return await prisma.echographie.findMany({
    orderBy: {
      nomEchographie: "desc",
    },
  });
}

// Récupérer un seul Echographie
export async function getOneEchographie(id: string) {
  return await prisma.echographie.findUnique({
    where: { id },
  });
}

// Suppression d'un echographie
export async function deleteEchographie(id: string) {
  return await prisma.echographie.delete({
    where: { id },
  });
}

//Mise à jour de echographie
export async function updateEchographie(id: string, data: Echographie) {
  return await prisma.echographie.update({
    where: { id },
    data,
  });
}

// Seed des 20 échographies prédéfinies
export async function seedEchographies(idUser: string) {
  const echographies: {
    typeEchographie: TypeEchographie;
    regionExaminee: RegionExaminee;
    nomEchographie: string;
    organeExaminee: string;
  }[] = [
    { typeEchographie: "OBST", regionExaminee: "PELVIS_BASSIN", nomEchographie: "Échographie de datation", organeExaminee: "Sac gestationnel, embryon, vésicule vitelline" },
    { typeEchographie: "OBST", regionExaminee: "PELVIS_BASSIN", nomEchographie: "Échographie du 1er trimestre (T1)", organeExaminee: "Fœtus (clarté nucale, LCC), annexes" },
    { typeEchographie: "OBST", regionExaminee: "PELVIENNE_ABDOMINALE", nomEchographie: "Échographie du 2e trimestre (T2)", organeExaminee: "Fœtus (morphologie), placenta, liquide amniotique" },
    { typeEchographie: "OBST", regionExaminee: "PELVIENNE_ABDOMINALE", nomEchographie: "Échographie du 3e trimestre (T3)", organeExaminee: "Fœtus (croissance), placenta, liquide amniotique" },
    { typeEchographie: "OBST", regionExaminee: "PELVIENNE_ABDOMINALE", nomEchographie: "Doppler obstétrical", organeExaminee: "Flux sanguins (artères utérines, ombilicale, cérébrale)" },
    { typeEchographie: "GYN", regionExaminee: "PELVIS_BASSIN", nomEchographie: "Échographie pelvienne sus-pubienne", organeExaminee: "Utérus, ovaires, vessie" },
    { typeEchographie: "GYN", regionExaminee: "PELVIS_BASSIN", nomEchographie: "Échographie endovaginale", organeExaminee: "Utérus (endomètre), ovaires, trompes" },
    { typeEchographie: "GYN", regionExaminee: "SEINS", nomEchographie: "Échographie mammaire", organeExaminee: "Glandes mammaires, ganglions axillaires" },
    { typeEchographie: "GYN", regionExaminee: "PELVIS_BASSIN", nomEchographie: "Hystérosonographie", organeExaminee: "Cavité utérine (polypes, fibromes)" },
    { typeEchographie: "INF", regionExaminee: "PELVIS_BASSIN", nomEchographie: "Échographie de suivi de cycle", organeExaminee: "Follicules ovariens, endomètre" },
    { typeEchographie: "INF", regionExaminee: "PELVIS_BASSIN", nomEchographie: "HyCoSy", organeExaminee: "Cavité utérine et perméabilité des trompes" },
    { typeEchographie: "MDG", regionExaminee: "ABDOMEN", nomEchographie: "Échographie abdominale", organeExaminee: "Foie, vésicule biliaire, pancréas, reins, rate" },
    { typeEchographie: "MDG", regionExaminee: "LOMBES_PELVIENNE", nomEchographie: "Échographie rénale et vésicale", organeExaminee: "Reins, vessie" },
    { typeEchographie: "MDG", regionExaminee: "COU", nomEchographie: "Échographie thyroïdienne", organeExaminee: "Thyroïde" },
    { typeEchographie: "MDG", regionExaminee: "ZONE_LOCALISEE", nomEchographie: "Échographie des parties molles", organeExaminee: "Tissu sous-cutané (abcès, lipome)" },
    { typeEchographie: "MDG", regionExaminee: "BOURSES", nomEchographie: "Échographie scrotale", organeExaminee: "Testicules, épididymes" },
    { typeEchographie: "MDG", regionExaminee: "HANCHES", nomEchographie: "Échographie de hanche (nourrisson)", organeExaminee: "Articulation coxo-fémorale" },
    { typeEchographie: "MDG", regionExaminee: "MEMBRES_COU", nomEchographie: "Doppler vasculaire", organeExaminee: "Veines et artères (flux sanguins)" },
    { typeEchographie: "CAR", regionExaminee: "THORAX", nomEchographie: "Échocardiographie transthoracique", organeExaminee: "Cœur (valves, parois, fonction)" },
    { typeEchographie: "CAR", regionExaminee: "OESOPHAGE", nomEchographie: "Échocardiographie transœsophagienne", organeExaminee: "Cœur (vues plus précises)" },
  ];

  // Vérifier les doublons existants
  const existing = await prisma.echographie.findMany({
    select: { nomEchographie: true },
  });
  const existingNames = new Set(existing.map((e) => e.nomEchographie));

  const toCreate = echographies
    .filter((e) => !existingNames.has(e.nomEchographie))
    .map((e) => ({ id: crypto.randomUUID(), ...e, idUser }));

  if (toCreate.length === 0) {
    return { created: 0, message: "Toutes les échographies existent déjà." };
  }

  await prisma.echographie.createMany({ data: toCreate });
  return { created: toCreate.length, message: `${toCreate.length} échographies créées avec succès.` };
}
