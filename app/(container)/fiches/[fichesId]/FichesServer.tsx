import React from "react";
import { getOneClient } from "@/lib/actions/clientActions";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { getRecapVisitesByTabIdVisite } from "@/lib/actions/recapActions";
import { Client, Visite, RecapVisite } from "@prisma/client";

interface FichesServerProps {
  fichesId: string;
  children: (data: {
    client: Client;
    visites: Visite[];
    recaps: RecapVisite[];
  }) => React.ReactNode;
}

async function safe<T>(fn: Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn;
  } catch (error) {
    console.error("FichesServer query failed:", error);
    return fallback;
  }
}

export default async function FichesServer({
  fichesId,
  children,
}: FichesServerProps) {
  const [client, visites] = await Promise.all([
    safe(getOneClient(fichesId), null),
    safe(getAllVisiteByIdClient(fichesId), []),
  ]);

  const safeVisites = (visites ?? []) as Visite[];

  const recaps =
    safeVisites.length > 0
      ? await safe(getRecapVisitesByTabIdVisite(safeVisites.map((v) => v.id)), [])
      : [];

  return children({
    client: (client ?? {}) as Client,
    visites: safeVisites,
    recaps,
  });
}
