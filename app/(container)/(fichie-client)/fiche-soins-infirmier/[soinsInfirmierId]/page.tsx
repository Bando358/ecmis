"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowBigLeftDash } from "lucide-react";
import { useSession } from "next-auth/react";
import { useClientContext } from "@/components/ClientContext";
import { Button } from "@/components/ui/button";
import { Client, Visite } from "@prisma/client";
import { SafeUser } from "@/types/prisma";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { getOneClient } from "@/lib/actions/clientActions";
import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import type { SharedFormProps } from "@/components/forms/types";

import SoinsInfirmierForm from "@/components/forms/SoinsInfirmierForm";

export default function SoinsInfirmierPage({
  params,
}: {
  params: Promise<{ soinsInfirmierId: string }>;
}) {
  const { soinsInfirmierId } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const idUser = session?.user.id as string;

  const [visites, setVisites] = useState<Visite[]>([]);
  const [allPrescripteur, setAllPrescripteur] = useState<SafeUser[]>([]);
  const [isPrescripteur, setIsPrescripteur] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { setSelectedClientId } = useClientContext();
  useEffect(() => {
    setSelectedClientId(soinsInfirmierId);
  }, [soinsInfirmierId, setSelectedClientId]);

  useEffect(() => {
    if (!idUser || !soinsInfirmierId) return;

    const fetchSharedData = async () => {
      setIsLoading(true);
      try {
        const [user, resultVisites, cliniqueClient] = await Promise.all([
          getOneUser(idUser),
          getAllVisiteByIdClient(soinsInfirmierId),
          getOneClient(soinsInfirmierId),
        ]);

        setIsPrescripteur(!!user?.prescripteur);
        setVisites(resultVisites as Visite[]);
        setClient(cliniqueClient);

        if (cliniqueClient?.idClinique) {
          const users = await getAllUserIncludedIdClinique(
            cliniqueClient.idClinique,
          );
          setAllPrescripteur(users.filter((u) => u.prescripteur) as SafeUser[]);
        }
      } catch (error) {
        console.error(
          "Erreur lors du chargement des données partagées:",
          error,
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchSharedData();
  }, [idUser, soinsInfirmierId]);

  if (isLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          <p className="text-gray-500">Chargement du formulaire...</p>
        </div>
      </div>
    );
  }

  const sharedProps: SharedFormProps = {
    clientId: soinsInfirmierId,
    visites,
    allPrescripteur,
    isPrescripteur,
    client,
    idUser,
    onVisiteCreated: (visite) => setVisites((prev) => [visite, ...prev]),
  };

  return (
    <div className="w-full relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-0 left-4 z-10"
        onClick={() => router.push(`/fiches/${soinsInfirmierId}`)}
        title="Retour à la page fiche"
      >
        <ArrowBigLeftDash className="h-5 w-5" />
      </Button>

      <div className="pt-8">
        <SoinsInfirmierForm {...sharedProps} />
      </div>
    </div>
  );
}
