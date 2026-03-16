"use client";
import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowBigLeftDash,
  BriefcaseMedical,
  ClipboardList,
  HeartPulse,
  ShieldCheck,
  Syringe,
  FileOutput,
  ShieldAlert,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useClientContext } from "@/components/ClientContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Client, Visite } from "@prisma/client";
import { SafeUser } from "@/types/prisma";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { getOneClient } from "@/lib/actions/clientActions";
import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import type { SharedFormProps } from "@/components/forms/types";

import MdgForm from "@/components/forms/MdgForm";
import OrdonnanceForm from "@/components/forms/OrdonnanceForm";
import GynecoForm from "@/components/forms/GynecoForm";
import DepistageVihForm from "@/components/forms/DepistageVihForm";
import IstForm from "@/components/forms/IstForm";
import ReferenceForm from "@/components/forms/ReferenceForm";
import VbgForm from "@/components/forms/VbgForm";

const TABS_CONFIG = [
  {
    value: "mdg",
    label: "Médecine Générale",
    shortLabel: "MDG",
    icon: BriefcaseMedical,
    accent: "#16a34a",
    accentLight: "#f0fdf4",
  },
  {
    value: "ordonnance",
    label: "Ordonnance",
    shortLabel: "Ordo.",
    icon: ClipboardList,
    accent: "#0284c7",
    accentLight: "#e0f2fe",
  },
  {
    value: "gyneco",
    label: "Gynécologie",
    shortLabel: "Gynéco",
    icon: HeartPulse,
    accent: "#9333ea",
    accentLight: "#f3e8ff",
  },
  {
    value: "depistage",
    label: "Dépistage VIH",
    shortLabel: "VIH",
    icon: ShieldCheck,
    accent: "#dc2626",
    accentLight: "#fef2f2",
  },
  {
    value: "ist",
    label: "IST",
    shortLabel: "IST",
    icon: Syringe,
    accent: "#ea580c",
    accentLight: "#fff7ed",
  },
  {
    value: "reference",
    label: "Référence",
    shortLabel: "Réf.",
    icon: FileOutput,
    accent: "#0d9488",
    accentLight: "#f0fdfa",
  },
  {
    value: "vbg",
    label: "VBG",
    shortLabel: "VBG",
    icon: ShieldAlert,
    accent: "#b91c1c",
    accentLight: "#fef2f2",
  },
] as const;

const FORM_COMPONENTS: Record<string, React.ComponentType<SharedFormProps>> = {
  mdg: MdgForm,
  ordonnance: OrdonnanceForm,
  gyneco: GynecoForm,
  depistage: DepistageVihForm,
  ist: IstForm,
  reference: ReferenceForm,
  vbg: VbgForm,
};

export default function MdgPage({
  params,
}: {
  params: Promise<{ medecineId: string }>;
}) {
  const { medecineId } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const idUser = session?.user.id as string;

  const [visites, setVisites] = useState<Visite[]>([]);
  const [allPrescripteur, setAllPrescripteur] = useState<SafeUser[]>([]);
  const [isPrescripteur, setIsPrescripteur] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tabs déjà visités : seul le tab actif est monté, puis on garde en mémoire
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(
    new Set(["mdg"]),
  );
  const [activeTab, setActiveTab] = useState("mdg");

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    setVisitedTabs((prev) => {
      if (prev.has(value)) return prev;
      const next = new Set(prev);
      next.add(value);
      return next;
    });
  }, []);

  const { setSelectedClientId } = useClientContext();
  useEffect(() => {
    setSelectedClientId(medecineId);
  }, [medecineId, setSelectedClientId]);

  // Chargement unique : données partagées + données du tab par défaut en parallèle
  useEffect(() => {
    if (!idUser || !medecineId) return;

    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const [user, resultVisites, cliniqueClient] = await Promise.all([
          getOneUser(idUser),
          getAllVisiteByIdClient(medecineId),
          getOneClient(medecineId),
        ]);

        setIsPrescripteur(!!user?.prescripteur);
        setVisites(resultVisites as Visite[]);
        setClient(cliniqueClient);

        if (cliniqueClient?.idClinique) {
          const users = await getAllUserIncludedIdClinique(
            cliniqueClient.idClinique,
          );
          setAllPrescripteur(
            users.filter((u) => u.prescripteur) as SafeUser[],
          );
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, [idUser, medecineId]);

  if (isLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          <p className="text-gray-500">Chargement des formulaires...</p>
        </div>
      </div>
    );
  }

  const sharedProps: SharedFormProps = {
    clientId: medecineId,
    visites,
    allPrescripteur,
    isPrescripteur,
    client,
    idUser,
  };

  return (
    <div className="w-full relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-0 left-4 z-10"
        onClick={() => router.push(`/fiches/${medecineId}`)}
        title="Retour à la page fiche"
      >
        <ArrowBigLeftDash className="h-5 w-5" />
      </Button>

      <div className="pt-8 relative">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="gap-3 m-4"
        >
          <TabsList className="sticky top-0 z-20 grid grid-cols-4 sm:grid-cols-7 h-auto gap-2 p-2.5 w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm backdrop-blur-sm">
            {TABS_CONFIG.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.value;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  style={{
                    backgroundColor: isActive ? tab.accent : tab.accentLight,
                    color: isActive ? "#fff" : tab.accent,
                    boxShadow: isActive
                      ? `0 2px 8px ${tab.accent}30`
                      : "none",
                  }}
                  className="group relative flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl! text-xs font-semibold! transition-colors duration-200 border-none! hover:opacity-90"
                >
                  <Icon
                    className="h-5 w-5"
                  />
                  <span className="hidden sm:inline leading-tight text-center">
                    {tab.label}
                  </span>
                  <span className="sm:hidden leading-tight">
                    {tab.shortLabel}
                  </span>
                  {isActive && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-white/70" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div>
            {TABS_CONFIG.map((tab) => {
              const isVisited = visitedTabs.has(tab.value);
              if (!isVisited) return null;

              const FormComponent = FORM_COMPONENTS[tab.value];
              return (
                <TabsContent
                  key={tab.value}
                  value={tab.value}
                  forceMount
                  className="data-[state=inactive]:hidden"
                >
                  <FormComponent {...sharedProps} />
                </TabsContent>
              );
            })}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
