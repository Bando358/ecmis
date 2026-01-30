"use client";
// components/DashboardClient.tsx
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import DashboardChart from "./DashboardChart";
import type { Client, Planning, Visite, Activite } from "@prisma/client";
import type {
  FactureExamenType,
  FactureProduitType,
  FacturePrestationType,
  FactureEchographieType,
} from "@/lib/actions/dashboardActions";

// 🔹 Type strict pour les données du dashboard
interface DashboardData {
  facturesExamens?: FactureExamenType[];
  facturesProduits?: FactureProduitType[];
  facturesPrestations?: FacturePrestationType[];
  facturesEchographies?: FactureEchographieType[];
  clients?: Client[];
  activites?: Activite[];
  visites?: Visite[];
  planning?: Planning[];
  allData?: { name: string; data: unknown }[];
}

interface DashboardClientProps {
  // Données des filtres
  tabClinique: { id: string; name: string }[];
  tabPrescripteur: { id: string; name: string; cliniqueId: string }[];

  // Données du dashboard
  dashboardData: DashboardData;

  // Paramètres par défaut
  defaultStartDate: string;
  defaultEndDate: string;
  defaultCliniqueId: string;
  defaultPrescripteurId: string;

  // Message d'erreur (optionnel)
  errorMessage?: string;
}

export default function DashboardClient({
  tabClinique,
  tabPrescripteur,
  dashboardData,
  defaultStartDate,
  defaultEndDate,
  defaultCliniqueId,
  defaultPrescripteurId,
  errorMessage,
}: DashboardClientProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Types
  type PeriodType =
    | "quotidien"
    | "hebdomadaire"
    | "mensuel"
    | "bimestriel"
    | "trimestriel"
    | "semestriel"
    | "annuel";

  // 🔹 Calculer le premier jour du mois en cours
  const getFirstDayOfMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
  };

  // États locaux pour les filtres (modification en cours)
  // startDate est toujours le premier jour du mois en cours par défaut
  const [startDate, setStartDate] = useState<string>(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState<string>(defaultEndDate);
  const [period, setPeriod] = useState<PeriodType>("hebdomadaire");

  // États appliqués (envoyés au graphique après clic sur Rechercher - uniquement les dates)
  const [appliedStartDate, setAppliedStartDate] =
    useState<string>(getFirstDayOfMonth());
  const [appliedEndDate, setAppliedEndDate] = useState<string>(defaultEndDate);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [selectedClinique, setSelectedClinique] = useState<{
    id: string;
    name: string;
  }>(() => {
    if (defaultCliniqueId === "all") {
      return { id: "all", name: "Toutes les cliniques" };
    }
    const clinique = tabClinique.find((c) => c.id === defaultCliniqueId);
    return clinique || { id: "all", name: "Toutes les cliniques" };
  });
  const [selectedPrescripteur, setSelectedPrescripteur] = useState<{
    id: string;
    name: string;
  }>(() => {
    if (defaultPrescripteurId === "all") {
      return { id: "all", name: "Tous les prescripteurs" };
    }
    const prescripteur = tabPrescripteur.find(
      (p) => p.id === defaultPrescripteurId,
    );
    return prescripteur || { id: "all", name: "Tous les prescripteurs" };
  });

  // 🔹 Mise à jour des URL search params (avec debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams();

      params.set("startDate", startDate);
      params.set("endDate", endDate);

      if (selectedClinique.id !== "all") {
        params.set("clinique", selectedClinique.id);
      }

      if (selectedPrescripteur.id !== "all") {
        params.set("prescripteur", selectedPrescripteur.id);
      }

      // Mettre à jour l'URL sans recharger la page
      const newUrl = `${pathname}?${params.toString()}`;
      router.replace(newUrl, { scroll: false });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [
    startDate,
    endDate,
    selectedClinique.id,
    selectedPrescripteur.id,
    pathname,
    router,
  ]);

  // 🔹 Fonction pour calculer la date de début selon la période
  const calculateStartDateFromPeriod = useCallback(
    (period: PeriodType): string => {
      const now = new Date();
      const formatDate = (date: Date) => date.toISOString().split("T")[0];

      switch (period) {
        case "quotidien":
          return formatDate(now);
        case "hebdomadaire": {
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          return formatDate(weekAgo);
        }
        case "mensuel":
          return formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
        case "bimestriel":
          return formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        case "trimestriel":
          return formatDate(new Date(now.getFullYear(), now.getMonth() - 2, 1));
        case "semestriel":
          return formatDate(new Date(now.getFullYear(), now.getMonth() - 5, 1));
        case "annuel":
          return formatDate(new Date(now.getFullYear(), 0, 1));
        default: {
          const defaultWeekAgo = new Date(now);
          defaultWeekAgo.setDate(now.getDate() - 7);
          return formatDate(defaultWeekAgo);
        }
      }
    },
    [],
  );

  // 🔹 Gestionnaire pour la sélection de période (recalcule les dates)
  const handlePeriodChange = useCallback(
    (value: PeriodType) => {
      setPeriod(value);
      // Recalculer la date de début selon la période
      const newStartDate = calculateStartDateFromPeriod(value);
      setStartDate(newStartDate);
      // La date de fin reste aujourd'hui
      setEndDate(new Date().toISOString().split("T")[0]);
    },
    [calculateStartDateFromPeriod],
  );

  // 🔹 Vérifier si les DATES ont été modifiées (seul critère pour recharger les données)
  const hasDateChanges = useMemo(() => {
    return startDate !== appliedStartDate || endDate !== appliedEndDate;
  }, [startDate, endDate, appliedStartDate, appliedEndDate]);

  // 🔹 IDs des cliniques actuellement sélectionnées (pour filtrage côté client)
  const currentClinicIds =
    selectedClinique.id === "all"
      ? tabClinique.map((c) => c.id)
      : [selectedClinique.id];

  // 🔹 Gestionnaire pour le bouton Rechercher (uniquement pour les dates)
  const handleSearch = useCallback(() => {
    if (!hasDateChanges) return;
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setRefreshKey((prev) => prev + 1);
  }, [startDate, endDate, hasDateChanges]);

  // 🔹 Gestionnaire pour la sélection de clinique (mémorisé)
  const handleCliniqueChange = useCallback(
    (value: string) => {
      if (value === "all") {
        setSelectedClinique({ id: "all", name: "Toutes les cliniques" });
      } else {
        const clinique = tabClinique.find((c) => c.id === value);
        if (clinique) {
          setSelectedClinique(clinique);
        }
      }
      // Réinitialiser le prescripteur quand on change de clinique
      setSelectedPrescripteur({ id: "all", name: "Tous les prescripteurs" });
    },
    [tabClinique],
  );

  // 🔹 Gestionnaire pour la sélection de prescripteur (mémorisé)
  const handlePrescripteurChange = useCallback(
    (value: string) => {
      if (value === "all") {
        setSelectedPrescripteur({ id: "all", name: "Tous les prescripteurs" });
      } else {
        const prescripteur = tabPrescripteur.find((p) => p.id === value);
        if (prescripteur) {
          setSelectedPrescripteur(prescripteur);
        }
      }
    },
    [tabPrescripteur],
  );

  // 🔹 Filtrer les prescripteurs selon la clinique sélectionnée (mémorisé)
  const filteredPrescripteurs = useMemo(
    () =>
      selectedClinique.id === "all"
        ? tabPrescripteur
        : tabPrescripteur.filter((p) => p.cliniqueId === selectedClinique.id),
    [selectedClinique.id, tabPrescripteur],
  );

  // 🔹 Redirection si non authentifié
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen">
      {/* 🔹 Affichage de l'erreur si présente */}
      {errorMessage && (
        <div className="mx-4 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-red-700 font-medium">Erreur</span>
          </div>
          <p className="mt-1 text-red-600 text-sm">{errorMessage}</p>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-start gap-2  sm:gap-3 px-2 sm:px-4 mx-4 sm:mx-4 py-2 sm:py-3 bg-white shadow-md rounded-2xl opacity-90">
        <div className="flex flex-col w-full sm:w-auto">
          <label className="font-semibold mb-1 text-xs sm:text-sm">
            Date de début
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded-md p-2 w-full text-xs sm:text-sm"
          />
        </div>

        <div className="flex flex-col w-full sm:w-auto">
          <label className="font-semibold mb-1 text-xs sm:text-sm">
            Date de fin
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded-md p-2 w-full text-xs sm:text-sm"
          />
        </div>

        <div className="flex flex-col">
          <label className=" font-semibold mb-1">Période</label>
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-45">
              <SelectValue placeholder="Sélectionner une période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quotidien">Quotidien</SelectItem>
              <SelectItem value="hebdomadaire">Hebdomadaire</SelectItem>
              <SelectItem value="mensuel">Mensuel</SelectItem>
              <SelectItem value="bimestriel">Bimestriel</SelectItem>
              <SelectItem value="trimestriel">Trimestriel</SelectItem>
              <SelectItem value="semestriel">Semestriel</SelectItem>
              <SelectItem value="annuel">Annuel</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col w-full sm:w-auto">
          <label className="font-semibold mb-1 text-xs sm:text-sm">
            Clinique
          </label>
          <Select
            value={selectedClinique.id}
            onValueChange={handleCliniqueChange}
          >
            <SelectTrigger className="w-full sm:w-50 text-xs sm:text-sm">
              <SelectValue placeholder="Sélectionner une clinique">
                {selectedClinique.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les cliniques</SelectItem>
              {tabClinique.map((clinique) => (
                <SelectItem key={clinique.id} value={clinique.id}>
                  {clinique.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col w-full sm:w-auto">
          <label className="font-semibold mb-1 text-xs sm:text-sm">
            Prescripteur
          </label>
          <Select
            value={selectedPrescripteur.id}
            onValueChange={handlePrescripteurChange}
          >
            <SelectTrigger className="w-full sm:w-55 text-xs sm:text-sm">
              <SelectValue placeholder="Sélectionner un prescripteur">
                {selectedPrescripteur.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les prescripteurs</SelectItem>
              {filteredPrescripteurs.map((prescripteur) => (
                <SelectItem key={prescripteur.id} value={prescripteur.id}>
                  {prescripteur.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col w-full sm:w-auto justify-end">
          <Button
            variant={"default"}
            onClick={handleSearch}
            disabled={!hasDateChanges}
            aria-label="Rechercher les données du dashboard"
            className="mt-6 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Search className="w-4 h-4 mr-2" />
            Rechercher
          </Button>
        </div>
      </div>

      <div className="px-4 -py-2">
        <DashboardChart
          key={refreshKey}
          clinicIds={tabClinique.map((c) => c.id)}
          filterClinicIds={currentClinicIds}
          filterPrescripteurId={
            selectedPrescripteur.id !== "all"
              ? selectedPrescripteur.id
              : undefined
          }
          startDate={appliedStartDate}
          endDate={appliedEndDate}
          period={period}
          initialData={
            refreshKey === 0
              ? (dashboardData as Parameters<
                  typeof DashboardChart
                >[0]["initialData"])
              : undefined
          }
        />

        <div className="mt-4 p-3 sm:p-4 bg-white rounded-lg shadow">
          <h3 className="font-semibold mb-2 text-sm sm:text-base">
            Paramètres sélectionnés :
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs sm:text-sm">
            <p>
              🗓️ <strong>Période :</strong> {startDate} → {endDate}
            </p>
            <p>
              📍 <strong>Clinique :</strong> {selectedClinique.name}
            </p>
            <p>
              👨‍⚕️ <strong>Prescripteur :</strong> {selectedPrescripteur.name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
