"use client";
import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowBigLeftDash,
  CalendarHeart,
  Stethoscope,
  Baby,
  ShieldCheck,
  Syringe,
  HeartPulse,
  ActivitySquare,
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

import PlanningForm from "@/components/forms/PlanningForm";
import GynecoForm from "@/components/forms/GynecoForm";
import TestGrossesseForm from "@/components/forms/TestGrossesseForm";
import DepistageVihForm from "@/components/forms/DepistageVihForm";
import IstForm from "@/components/forms/IstForm";
import CponForm from "@/components/forms/CponForm";
import SaaForm from "@/components/forms/SaaForm";
import VisiteConstanteTab from "@/components/forms/VisiteConstanteTab";
import { ClipboardPlus } from "lucide-react";

const TABS_CONFIG = [
  {
    value: "visite-constante",
    label: "Visite & Constante",
    shortLabel: "Visite",
    icon: ClipboardPlus,
    accent: "#2563eb",
    accentLight: "#eff6ff",
  },
  {
    value: "planning",
    label: "Planning Familial",
    shortLabel: "PF",
    icon: CalendarHeart,
    accent: "#ec4899",
    accentLight: "#fce7f3",
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
    value: "test",
    label: "Test Grossesse",
    shortLabel: "Test",
    icon: Baby,
    accent: "#0284c7",
    accentLight: "#e0f2fe",
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
    value: "cpon",
    label: "CPoN",
    shortLabel: "CPoN",
    icon: Stethoscope,
    accent: "#0d9488",
    accentLight: "#f0fdfa",
  },
  {
    value: "saa",
    label: "SAA",
    shortLabel: "SAA",
    icon: ActivitySquare,
    accent: "#d97706",
    accentLight: "#fffbeb",
  },
] as const;

const FORM_COMPONENTS: Record<string, React.ComponentType<SharedFormProps>> = {
  "visite-constante": VisiteConstanteTab,
  planning: PlanningForm,
  gyneco: GynecoForm,
  test: TestGrossesseForm,
  depistage: DepistageVihForm,
  ist: IstForm,
  cpon: CponForm,
  saa: SaaForm,
};

export default function PlanningPage({
  params,
}: {
  params: Promise<{ planningId: string }>;
}) {
  const { planningId } = use(params);
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
    new Set(["planning"]),
  );
  const [activeTab, setActiveTab] = useState("planning");

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
    setSelectedClientId(planningId);
  }, [planningId, setSelectedClientId]);

  // Chargement unique des données partagées
  useEffect(() => {
    if (!idUser || !planningId) return;

    const fetchSharedData = async () => {
      setIsLoading(true);
      try {
        const [user, resultVisites, cliniqueClient] = await Promise.all([
          getOneUser(idUser),
          getAllVisiteByIdClient(planningId),
          getOneClient(planningId),
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
  }, [idUser, planningId]);

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
    clientId: planningId,
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
        onClick={() => router.push(`/fiches/${planningId}`)}
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
          <TabsList className="sticky top-0 z-20 grid grid-cols-4 sm:grid-cols-8 h-auto gap-2 p-2.5 w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm backdrop-blur-sm">
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
                    boxShadow: isActive ? `0 2px 8px ${tab.accent}30` : "none",
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
