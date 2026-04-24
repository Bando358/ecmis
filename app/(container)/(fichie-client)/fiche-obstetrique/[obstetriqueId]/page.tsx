"use client";
import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowBigLeftDash,
  Baby,
  BriefcaseMedical,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Syringe,
  UserCog,
} from "lucide-react";
import ReactSelect from "react-select";
import { useSession } from "next-auth/react";
import { useClientContext } from "@/components/ClientContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Client, Grossesse, Obstetrique, Visite } from "@prisma/client";
import { SafeUser } from "@/types/prisma";
import { getObstetriquePageData } from "@/lib/actions/obstetriqueActions";
import type { SharedFormProps } from "@/components/forms/types";

import GrossesseForm from "@/components/forms/GrossesseForm";
import ObstetriqueForm from "@/components/forms/ObstetriqueForm";
import GynecoForm from "@/components/forms/GynecoForm";
import DepistageVihForm from "@/components/forms/DepistageVihForm";
import IstForm from "@/components/forms/IstForm";
import MdgForm from "@/components/forms/MdgForm";
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
    value: "grossesse",
    label: "Grossesse",
    shortLabel: "Gross.",
    icon: Baby,
    accent: "#0284c7",
    accentLight: "#e0f2fe",
  },
  {
    value: "obstetrique",
    label: "Obstétrique",
    shortLabel: "Obst.",
    icon: Stethoscope,
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
    value: "mdg",
    label: "Médecine Générale",
    shortLabel: "MDG",
    icon: BriefcaseMedical,
    accent: "#16a34a",
    accentLight: "#f0fdf4",
  },
] as const;

const FORM_COMPONENTS: Record<string, React.ComponentType<SharedFormProps>> = {
  "visite-constante": VisiteConstanteTab,
  grossesse: GrossesseForm,
  obstetrique: ObstetriqueForm,
  gyneco: GynecoForm,
  depistage: DepistageVihForm,
  ist: IstForm,
  mdg: MdgForm,
};

export default function ObstetriquePage({
  params,
}: {
  params: Promise<{ obstetriqueId: string }>;
}) {
  const { obstetriqueId } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const idUser = session?.user.id as string;

  const [visites, setVisites] = useState<Visite[]>([]);
  const [allPrescripteur, setAllPrescripteur] = useState<SafeUser[]>([]);
  const [isPrescripteur, setIsPrescripteur] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [grossesses, setGrossesses] = useState<Grossesse[]>([]);
  const [obstetriques, setObstetriques] = useState<Obstetrique[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tabs déjà visités : seul le tab actif est monté, puis on garde en mémoire
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(
    new Set(["obstetrique"]),
  );
  const [activeTab, setActiveTab] = useState("obstetrique");
  const [selectedPrescripteurId, setSelectedPrescripteurId] = useState("");

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
    setSelectedClientId(obstetriqueId);
  }, [obstetriqueId, setSelectedClientId]);

  // Chargement unique : données partagées + données du tab par défaut en parallèle
  useEffect(() => {
    if (!idUser || !obstetriqueId) return;

    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        // Un seul round-trip serveur qui charge toutes les données en parallèle
        const data = await getObstetriquePageData(obstetriqueId, idUser);

        setIsPrescripteur(!!data.user?.prescripteur);
        setVisites(data.visites as Visite[]);
        setClient(data.client);
        setGrossesses(data.grossesses as Grossesse[]);
        setObstetriques(data.obstetriques as Obstetrique[]);
        setAllPrescripteur(data.prescripteurs as SafeUser[]);
      } catch (error) {
        console.error(
          "Erreur lors du chargement des données:",
          error,
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, [idUser, obstetriqueId]);

  const handleGrossesseCreated = useCallback((newGrossesse: Grossesse) => {
    setGrossesses((prev) => [...prev, newGrossesse]);
  }, []);

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
    clientId: obstetriqueId,
    visites,
    allPrescripteur,
    isPrescripteur,
    client,
    idUser,
    selectedPrescripteurId,
    initialGrossesses: grossesses,
    initialObstetriques: obstetriques,
    onGrossesseCreated: handleGrossesseCreated,
    onVisiteCreated: (visite) => setVisites((prev) => [visite, ...prev]),
  };

  return (
    <div className="w-full relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-0 left-4 z-10"
        onClick={() => router.push(`/fiches/${obstetriqueId}`)}
        title="Retour à la page fiche"
      >
        <ArrowBigLeftDash className="h-5 w-5" />
      </Button>

      <div className="pt-8 relative">
        {!isPrescripteur && allPrescripteur.length > 0 && (
          <div className="mx-4 mb-3 rounded-xl border border-blue-200/60 bg-blue-50/50 p-3 flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-sm font-semibold text-blue-900 flex items-center gap-1.5 shrink-0">
              <UserCog className="h-4 w-4" />
              Prestataire pour tous les onglets
              <span className="text-red-500">*</span>
            </label>
            <div className="w-full sm:max-w-sm">
              <ReactSelect
                instanceId="prescripteur-obstetrique"
                isClearable
                options={allPrescripteur.map((p) => ({
                  value: p.id,
                  label: p.name || "",
                }))}
                value={
                  selectedPrescripteurId
                    ? {
                        value: selectedPrescripteurId,
                        label:
                          allPrescripteur.find(
                            (p) => p.id === selectedPrescripteurId,
                          )?.name || "",
                      }
                    : null
                }
                onChange={(opt) =>
                  setSelectedPrescripteurId(
                    (opt as { value: string } | null)?.value || "",
                  )
                }
                placeholder="Rechercher un prestataire..."
                noOptionsMessage={() => "Aucun prestataire trouvé"}
                classNamePrefix="select"
                menuPortalTarget={
                  typeof document !== "undefined" ? document.body : undefined
                }
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                }}
              />
            </div>
          </div>
        )}

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
