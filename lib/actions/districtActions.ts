"use server";

import prisma from "@/lib/prisma";
import { TableName } from "@prisma/client";
import { requirePermission } from "@/lib/auth/withPermission";

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
  await requirePermission(TableName.DISTRICT, "canCreate");
  return prisma.district.create({ data });
}

export async function updateDistrict(
  id: string,
  data: { nomDistrict?: string; codeDistrict?: string; idRegion?: string }
) {
  await requirePermission(TableName.DISTRICT, "canUpdate");
  return prisma.district.update({ where: { id }, data });
}

export async function deleteDistrict(id: string) {
  await requirePermission(TableName.DISTRICT, "canDelete");
  return prisma.district.delete({ where: { id } });
}
