"use server";

import prisma from "@/lib/prisma";

export async function getAllDistricts() {
  return prisma.district.findMany({
    include: { Region: { select: { nomRegion: true } } },
    orderBy: { nomDistrict: "asc" },
  });
}

export async function getDistrictsByRegion(regionId: string) {
  return prisma.district.findMany({
    where: { idRegion: regionId },
    orderBy: { nomDistrict: "asc" },
  });
}

export async function createDistrict(data: {
  nomDistrict: string;
  codeDistrict: string;
  idRegion: string;
}) {
  return prisma.district.create({ data });
}

export async function updateDistrict(
  id: string,
  data: { nomDistrict?: string; codeDistrict?: string; idRegion?: string }
) {
  return prisma.district.update({ where: { id }, data });
}

export async function deleteDistrict(id: string) {
  return prisma.district.delete({ where: { id } });
}
