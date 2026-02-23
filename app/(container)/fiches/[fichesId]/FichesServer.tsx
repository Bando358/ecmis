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

export default async function FichesServer({
  fichesId,
  children,
}: FichesServerProps) {
  try {
    const [client, visites] = await Promise.all([
      getOneClient(fichesId),
      getAllVisiteByIdClient(fichesId),
    ]);

    const recaps =
      visites.length > 0
        ? await getRecapVisitesByTabIdVisite(visites.map((v) => v.id))
        : [];

    return children({
      client: client as Client,
      visites: visites as Visite[],
      recaps,
    });
  } catch (error) {
    console.error("Erreur lors du chargement des données fiches:", error);
    return children({
      client: {} as Client,
      visites: [],
      recaps: [],
    });
  }
}
