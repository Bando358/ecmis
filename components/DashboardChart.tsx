"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchDashboardData } from "@/lib/actions/dashboardActions";
import { TrendingUp, Loader2 } from "lucide-react";
import { Client, Planning, Visite } from "@prisma/client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  Legend,
  Bar,
  BarChart,
  LabelList,
  Cell,
  YAxis,
  LineChart,
  Line,
  Pie,
  PieChart,
  Tooltip,
} from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import AnimatedNumber from "./AnimatedNumber";
import { AnimatePresence, motion } from "framer-motion";

type ChartDataType = {
  name: string;
  total: number;
};

type PeriodType = "quotidien" | "hebdomadaire" | "mensuel" | "bimestriel" | "trimestriel" | "semestriel" | "annuel";

// Types pour les factures avec ID clinique et prescripteur
type FactureProduitRaw = { prodMontantTotal?: number; prodIdClinique?: string; prodIdPrescripteur?: string; prodDate?: string | Date; prodLibelle?: string; prodQuantite?: number };
type FacturePrestationRaw = { prestPrixTotal?: number; prestIdClinique?: string; prestIdPrescripteur?: string; prestDate?: string | Date };
type FactureExamenRaw = { examPrixTotal?: number; examIdClinique?: string; examIdPrescripteur?: string; examDate?: string | Date | null };
type FactureEchographieRaw = { echoPrixTotal?: number; echoIdClinique?: string; echoIdPrescripteur?: string; echoDate?: string | Date | null };

type ReferenceRaw = { id: string; idClinique: string; dateReference: string | Date; motifReference: string };
type ContreReferenceRaw = { id: string; idClinique: string; dateReception: string | Date };
type PrescripteurInfoRaw = { id: string; name: string };

// Type pour les données de prestation avec ID clinique et utilisateur (prescripteur)
type PrestationDataItem = {
  name: string;
  data: Array<{ idClinique?: string; idUser?: string; [key: string]: unknown }>
};

interface DashboardChartProps {
  clinicIds: string[];
  filterClinicIds?: string[];
  filterPrescripteurId?: string;
  startDate: string;
  endDate: string;
  period?: PeriodType;
  tabClinique?: { id: string; name: string }[];
  initialData?: {
    facturesProduits?: FactureProduitRaw[];
    facturesPrestations?: FacturePrestationRaw[];
    facturesExamens?: FactureExamenRaw[];
    facturesEchographies?: FactureEchographieRaw[];
    clients?: Client[];
    visites?: Visite[];
    planning?: Planning[];
    allData?: PrestationDataItem[];
    references?: ReferenceRaw[];
    contreReferences?: ContreReferenceRaw[];
    prescripteursList?: PrescripteurInfoRaw[];
  };
}

const colors = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#0ea5e9",
  "#9333ea",
  "#10b981",
  "#eab308",
  "#fb7185",
  "#0891b2",
  "#facc15",
  "#64748b",
  "#dc2626",
  "#475569",
];

// Fonction pour obtenir le numéro de semaine d'une date
const getWeekNumber = (date: Date): number => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

// Fonction pour obtenir la clé de regroupement selon la période
const getGroupKey = (date: Date, period: PeriodType): string => {
  const year = date.getFullYear();
  const month = date.getMonth();

  switch (period) {
    case "quotidien":
      return date.toISOString().split("T")[0];
    case "hebdomadaire":
      return `${year}-S${getWeekNumber(date).toString().padStart(2, "0")}`;
    case "mensuel":
      return `${year}-${(month + 1).toString().padStart(2, "0")}`;
    case "bimestriel":
      return `${year}-B${Math.floor(month / 2) + 1}`;
    case "trimestriel":
      return `${year}-T${Math.floor(month / 3) + 1}`;
    case "semestriel":
      return `${year}-S${Math.floor(month / 6) + 1}`;
    case "annuel":
      return `${year}`;
    default:
      return date.toISOString().split("T")[0];
  }
};

// Fonction pour formater l'affichage de l'axe X selon la période
const formatAxisLabel = (value: string, period: PeriodType): string => {
  const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
  const fullMonthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

  switch (period) {
    case "quotidien": {
      const date = new Date(value);
      return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    }
    case "hebdomadaire": {
      // Format: "2024-S01" -> "S1"
      const weekMatch = value.match(/-S(\d+)$/);
      return weekMatch ? `S${parseInt(weekMatch[1])}` : value;
    }
    case "mensuel": {
      // Format: "2024-01" -> "Janvier"
      const parts = value.split("-");
      if (parts.length === 2) {
        const monthIndex = parseInt(parts[1]) - 1;
        return fullMonthNames[monthIndex] || value;
      }
      return value;
    }
    case "bimestriel": {
      // Format: "2024-B1" -> "Bim. 1"
      const bimMatch = value.match(/-B(\d+)$/);
      return bimMatch ? `Bim. ${bimMatch[1]}` : value;
    }
    case "trimestriel": {
      // Format: "2024-T1" -> "Trim. 1"
      const trimMatch = value.match(/-T(\d+)$/);
      return trimMatch ? `Trim. ${trimMatch[1]}` : value;
    }
    case "semestriel": {
      // Format: "2024-S1" -> "Sem. 1"
      const semMatch = value.match(/-S(\d+)$/);
      return semMatch ? `Sem. ${semMatch[1]}` : value;
    }
    case "annuel": {
      return value;
    }
    default:
      return value;
  }
};

export default function DashboardChart({
  clinicIds,
  filterClinicIds,
  filterPrescripteurId,
  startDate,
  endDate,
  period = "hebdomadaire",
  tabClinique = [],
  initialData,
}: DashboardChartProps) {
  // Utiliser filterClinicIds pour le filtrage côté client, ou clinicIds si non défini
  const activeClinicIds = filterClinicIds || clinicIds;
  // Prescripteur sélectionné (undefined = tous les prescripteurs)
  const activePrescripteurId = filterPrescripteurId;

  // 🔹 Clé unique pour forcer le re-rendu des graphiques quand les filtres changent
  const filterKey = `${activeClinicIds.join("-")}-${activePrescripteurId || "all"}-${period}`;

  // 🔹 Stocker les données BRUTES des factures (avec idClinique)
  const [facturesProduits, setFacturesProduits] = useState<FactureProduitRaw[]>(
    initialData?.facturesProduits || []
  );
  const [facturesPrestations, setFacturesPrestations] = useState<FacturePrestationRaw[]>(
    initialData?.facturesPrestations || []
  );
  const [facturesExamens, setFacturesExamens] = useState<FactureExamenRaw[]>(
    initialData?.facturesExamens || []
  );
  const [facturesEchographies, setFacturesEchographies] = useState<FactureEchographieRaw[]>(
    initialData?.facturesEchographies || []
  );

  const [clients, setClients] = useState<Client[]>(initialData?.clients || []);
  const [visites, setVisites] = useState<Visite[]>(initialData?.visites || []);
  const [planning, setPlanning] = useState<Planning[]>(
    initialData?.planning || []
  );
  const [prestationData, setPrestationData] = useState<PrestationDataItem[]>(
    (initialData?.allData || []) as PrestationDataItem[]
  );
  const [references, setReferences] = useState<ReferenceRaw[]>(
    initialData?.references || []
  );
  const [contreReferences, setContreReferences] = useState<ContreReferenceRaw[]>(
    initialData?.contreReferences || []
  );
  const [prescripteursList, setPrescripteursList] = useState<PrescripteurInfoRaw[]>(
    initialData?.prescripteursList || []
  );
  const [loading, setLoading] = useState(!initialData);

  // 🔹 Ref pour suivre si les données ont déjà été chargées (évite le rechargement quand l'onglet redevient actif)
  const hasLoadedData = useRef(false);
  // 🔹 Ref pour savoir si les données initiales ont été traitées
  const initialDataProcessed = useRef(false);
  // 🔹 Ref pour les dates actuellement chargées
  const loadedDatesRef = useRef({ startDate, endDate });

  // 🔹 Calculer les données du graphique de revenus FILTRÉES par clinique ET prescripteur (memoizé)
  const chartData: ChartDataType[] = useMemo(() => {
    // Filtrer les factures par clinique ET prescripteur sélectionnés
    const filteredProduits = facturesProduits.filter(
      (f) =>
        (!f.prodIdClinique || activeClinicIds.includes(f.prodIdClinique)) &&
        (!activePrescripteurId || f.prodIdPrescripteur === activePrescripteurId)
    );
    const filteredPrestations = facturesPrestations.filter(
      (f) =>
        (!f.prestIdClinique || activeClinicIds.includes(f.prestIdClinique)) &&
        (!activePrescripteurId || f.prestIdPrescripteur === activePrescripteurId)
    );
    const filteredExamens = facturesExamens.filter(
      (f) =>
        (!f.examIdClinique || activeClinicIds.includes(f.examIdClinique)) &&
        (!activePrescripteurId || f.examIdPrescripteur === activePrescripteurId)
    );
    const filteredEchographies = facturesEchographies.filter(
      (f) =>
        (!f.echoIdClinique || activeClinicIds.includes(f.echoIdClinique)) &&
        (!activePrescripteurId || f.echoIdPrescripteur === activePrescripteurId)
    );

    // Calculer les totaux
    const totalProduits = filteredProduits.reduce(
      (acc, f) => acc + (f.prodMontantTotal ?? 0),
      0
    );
    const totalPrestations = filteredPrestations.reduce(
      (acc, f) => acc + (f.prestPrixTotal ?? 0),
      0
    );
    const totalExamens = filteredExamens.reduce(
      (acc, f) => acc + (f.examPrixTotal ?? 0),
      0
    );
    const totalEchographies = filteredEchographies.reduce(
      (acc, f) => acc + (f.echoPrixTotal ?? 0),
      0
    );

    const totalGeneral =
      totalProduits + totalPrestations + totalExamens + totalEchographies;

    return [
      { name: "Produits", total: totalProduits },
      { name: "Prestations", total: totalPrestations },
      { name: "Examens", total: totalExamens },
      { name: "Échographies", total: totalEchographies },
      { name: "Total", total: totalGeneral },
    ];
  }, [facturesProduits, facturesPrestations, facturesExamens, facturesEchographies, activeClinicIds, activePrescripteurId]);

  useEffect(() => {
    // 🔹 Traiter les données initiales au premier rendu
    if (initialData && !initialDataProcessed.current) {
      initialDataProcessed.current = true;
      hasLoadedData.current = true;
      loadedDatesRef.current = { startDate, endDate };
      setLoading(false);
      // Les états sont déjà initialisés avec initialData, pas besoin de fetch
      return;
    }

    // Si pas de clinicIds, ne pas charger
    if (!clinicIds || clinicIds.length === 0) return;

    // 🔹 Vérifier si les dates ont réellement changé (évite le rechargement quand l'onglet redevient actif)
    const datesChanged =
      loadedDatesRef.current.startDate !== startDate ||
      loadedDatesRef.current.endDate !== endDate;

    // Si les données sont déjà chargées et les dates n'ont pas changé, ne pas recharger
    if (hasLoadedData.current && !datesChanged) {
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await fetchDashboardData(
          clinicIds,
          new Date(startDate),
          new Date(endDate)
        );

        // 🔹 Stocker les données BRUTES des factures (avec idClinique)
        setFacturesProduits(
          Array.isArray(data.facturesProduits) ? data.facturesProduits : []
        );
        setFacturesPrestations(
          Array.isArray(data.facturesPrestations) ? data.facturesPrestations : []
        );
        setFacturesExamens(
          Array.isArray(data.facturesExamens) ? data.facturesExamens : []
        );
        setFacturesEchographies(
          Array.isArray(data.facturesEchographies) ? data.facturesEchographies : []
        );
        setClients(Array.isArray(data.clients) ? data.clients : []);
        setVisites(Array.isArray(data.visites) ? data.visites : []);
        setPlanning(Array.isArray(data.planning) ? data.planning : []);
        setPrestationData(
          Array.isArray(data.allData)
            ? data.allData.map((item) => ({
                ...item,
                data: Array.isArray(item.data) ? item.data : [],
              }))
            : []
        );
        setReferences(Array.isArray(data.references) ? data.references : []);
        setContreReferences(Array.isArray(data.contreReferences) ? data.contreReferences : []);
        setPrescripteursList(Array.isArray(data.prescripteursList) ? data.prescripteursList : []);

        // 🔹 Marquer les données comme chargées et sauvegarder les dates
        hasLoadedData.current = true;
        loadedDatesRef.current = { startDate, endDate };
      } catch (error) {
        console.error("Erreur lors du chargement du graphique :", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clinicIds, startDate, endDate, initialData]);

  // 🔹 Filtrer les clients par clinique ET prescripteur sélectionnés (memoizé)
  const clientsFilteredByClinic = useMemo(() => {
    if (!Array.isArray(clients)) return [];
    return clients.filter((client) => {
      const matchesClinic = activeClinicIds.includes(client.cliniqueId);
      // Filtrer par prescripteur si un est sélectionné (utilise idUser du client)
      const matchesPrescripteur = !activePrescripteurId ||
        (client as unknown as { idUser?: string }).idUser === activePrescripteurId;
      return matchesClinic && matchesPrescripteur;
    });
  }, [clients, activeClinicIds, activePrescripteurId]);

  // Calcul des totaux pour la légende (memoizé)
  const { totalNouveaux, totalAnciens, totalClients } = useMemo(() => ({
    totalNouveaux: clientsFilteredByClinic.filter(
      (client) => client.statusClient === "nouveau"
    ).length,
    totalAnciens: clientsFilteredByClinic.filter(
      (client) => client.statusClient === "ancien"
    ).length,
    totalClients: clientsFilteredByClinic.length,
  }), [clientsFilteredByClinic]);

  // 🔹 Préparation des données pour le graphique Statut des Clients (memoizé)
  const statusChartData = useMemo(() => {
    const groupedData: Record<string, { nouveau: number; ancien: number }> = {};
    const start = new Date(startDate);
    const end = new Date(endDate);

    const filteredClients = clientsFilteredByClinic.filter((client) => {
      const clientDate = new Date(client.dateEnregistrement);
      return (
        clientDate >= start &&
        clientDate <= end &&
        !isNaN(clientDate.getTime())
      );
    });

    filteredClients.forEach((client) => {
      const clientDate = new Date(client.dateEnregistrement);
      const dateKey = getGroupKey(clientDate, period);

      if (!groupedData[dateKey]) {
        groupedData[dateKey] = { nouveau: 0, ancien: 0 };
      }

      if (client.statusClient === "nouveau") {
        groupedData[dateKey].nouveau++;
      } else if (client.statusClient === "ancien") {
        groupedData[dateKey].ancien++;
      }
    });

    return Object.entries(groupedData)
      .map(([date, statuses]) => ({
        date,
        nouveau: statuses.nouveau,
        ancien: statuses.ancien,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [clientsFilteredByClinic, startDate, endDate, period]);

  // 🔹 Filtrer les visites par clinique ET prescripteur sélectionnés (memoizé)
  const visitesFilteredByClinic = useMemo(() => {
    if (!Array.isArray(visites)) return [];
    return visites.filter((visite) => {
      const matchesClinic = activeClinicIds.includes(visite.idClinique);
      // Filtrer par prescripteur si un est sélectionné (utilise idUser de la visite)
      const matchesPrescripteur = !activePrescripteurId ||
        (visite as unknown as { idUser?: string }).idUser === activePrescripteurId;
      return matchesClinic && matchesPrescripteur;
    });
  }, [visites, activeClinicIds, activePrescripteurId]);

  // 🔹 Préparation des données pour les motifs de visite
  const motifVisiteData = () => {
    if (visitesFilteredByClinic.length === 0) return [];
    const motifsCount: Record<string, number> = {};
    visitesFilteredByClinic.forEach((visite) => {
      const motif = visite.motifVisite || "Non spécifié";
      motifsCount[motif] = (motifsCount[motif] || 0) + 1;
    });

    return Object.entries(motifsCount)
      .map(([motif, count]) => ({ motif, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  };

  // 🔹 Préparation des données pour les types de prestations (FILTRÉES par clinique ET prescripteur)
  const prestationByType = () => {
    if (!Array.isArray(prestationData) || prestationData.length === 0)
      return [];

    return prestationData.map((item, index) => {
      // Filtrer les données par clinique ET prescripteur sélectionnés
      const filteredData = Array.isArray(item.data)
        ? item.data.filter((d) => {
            // Vérifier les différents noms de champs idClinique selon le type
            const clinicId =
              d.idClinique ||
              (d as Record<string, unknown>).infertIdClinique ||
              (d as Record<string, unknown>).obstIdClinique ||
              (d as Record<string, unknown>).accouchementIdClinique ||
              (d as Record<string, unknown>).cponIdClinique ||
              (d as Record<string, unknown>).saaIdClinique ||
              (d as Record<string, unknown>).istIdClinique ||
              (d as Record<string, unknown>).depistageVihIdClinique ||
              (d as Record<string, unknown>).pecVihIdClinique ||
              (d as Record<string, unknown>).mdgIdClinique ||
              (d as Record<string, unknown>).vbgIdClinique ||
              (d as Record<string, unknown>).testIdClinique;

            // Vérifier le champ idUser (prescripteur)
            const userId = d.idUser || (d as Record<string, unknown>).idUser;

            // Filtrer par clinique ET prescripteur
            const matchesClinic = !clinicId || activeClinicIds.includes(String(clinicId));
            const matchesPrescripteur = !activePrescripteurId || userId === activePrescripteurId;

            return matchesClinic && matchesPrescripteur;
          })
        : [];

      return {
        name: item.name,
        total: filteredData.length,
        color: colors[index % colors.length],
      };
    });
  };

  // 🔹 Filtrer le planning par clinique ET prescripteur sélectionnés
  const planningFilteredByClinic = Array.isArray(planning)
    ? planning.filter((plan) => {
        const matchesClinic = activeClinicIds.includes(plan.idClinique);
        const matchesPrescripteur = !activePrescripteurId || plan.idUser === activePrescripteurId;
        return matchesClinic && matchesPrescripteur;
      })
    : [];

  // 🔹 Préparation des données pour les Utilisateurs PF
  const pfDataByDate: Record<string, { nouveaux: number; anciens: number }> =
    {};

  planningFilteredByClinic.forEach((plan) => {
    const visite = visitesFilteredByClinic.find((v) => v.id === plan.idVisite);
    if (!visite) return;

    const rawDate = visite.dateVisite;
    let dateObj: Date | null = null;

    if (typeof rawDate === "string") {
      dateObj = new Date(rawDate);
    } else if (rawDate instanceof Date) {
      dateObj = rawDate;
    }

    if (!dateObj || isNaN(dateObj.getTime())) return;

    const dateKey = getGroupKey(dateObj, period);

    if (!pfDataByDate[dateKey]) {
      pfDataByDate[dateKey] = { nouveaux: 0, anciens: 0 };
    }

    if (plan.statut === "nu") {
      pfDataByDate[dateKey].nouveaux++;
    } else if (plan.statut === "au") {
      pfDataByDate[dateKey].anciens++;
    }
  });

  const transformedDataStatusPF = Object.entries(pfDataByDate)
    .map(([date, counts]) => ({
      date,
      utilisateurs: "",
      nouveaux: counts.nouveaux,
      anciens: counts.anciens,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Configuration des chart
  const chartMotifConfig = {
    count: {
      label: "Nombre de visites",
      color: "#22c55e",
    },
  } satisfies ChartConfig;

  const chartConfig = {
    nouveau: {
      label: `Nouveau client (${totalNouveaux})`,
      color: "#22c55e",
    },
    ancien: {
      label: `Ancien client (${totalAnciens})`,
      color: "#0ea5e9",
    },
  };

  const chartPFConfig = {
    nouveaux: {
      label: "Nouveaux utilisateurs",
      color: "#22c55e",
    },
    anciens: {
      label: "Anciens utilisateurs",
      color: "#0ea5e9",
    },
  };

  const chartPrestationConfig = {
    total: {
      label: "Montant total",
      color: "#22c55e",
    },
  } satisfies ChartConfig;

  const getBarColor = (index: number): string => {
    return colors[index % colors.length];
  };

  const motifData = motifVisiteData();
  const prestationDataChart = prestationByType();

  // ========== NOUVEAUX GRAPHIQUES ==========

  // 1. Revenus par type de service (Donut)
  const revenueByServiceData = useMemo(() => {
    return chartData
      .filter((d) => d.name !== "Total" && d.total > 0)
      .map((d, i) => ({
        name: d.name,
        value: d.total,
        color: ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6"][i] || colors[i],
      }));
  }, [chartData]);

  // 2. Évolution des revenus dans le temps (Area)
  const revenueOverTimeData = useMemo(() => {
    const grouped: Record<string, { produits: number; prestations: number; examens: number; echographies: number }> = {};

    const filteredProduits = facturesProduits.filter(
      (f) => (!f.prodIdClinique || activeClinicIds.includes(f.prodIdClinique)) &&
        (!activePrescripteurId || f.prodIdPrescripteur === activePrescripteurId)
    );
    const filteredPrestations = facturesPrestations.filter(
      (f) => (!f.prestIdClinique || activeClinicIds.includes(f.prestIdClinique)) &&
        (!activePrescripteurId || f.prestIdPrescripteur === activePrescripteurId)
    );
    const filteredExamens = facturesExamens.filter(
      (f) => (!f.examIdClinique || activeClinicIds.includes(f.examIdClinique)) &&
        (!activePrescripteurId || f.examIdPrescripteur === activePrescripteurId)
    );
    const filteredEchographies = facturesEchographies.filter(
      (f) => (!f.echoIdClinique || activeClinicIds.includes(f.echoIdClinique)) &&
        (!activePrescripteurId || f.echoIdPrescripteur === activePrescripteurId)
    );

    const ensureGroup = (key: string) => {
      if (!grouped[key]) grouped[key] = { produits: 0, prestations: 0, examens: 0, echographies: 0 };
    };

    filteredProduits.forEach((f) => {
      if (!f.prodDate) return;
      const key = getGroupKey(new Date(f.prodDate), period);
      ensureGroup(key);
      grouped[key].produits += f.prodMontantTotal ?? 0;
    });
    filteredPrestations.forEach((f) => {
      if (!f.prestDate) return;
      const key = getGroupKey(new Date(f.prestDate), period);
      ensureGroup(key);
      grouped[key].prestations += f.prestPrixTotal ?? 0;
    });
    filteredExamens.forEach((f) => {
      if (!f.examDate) return;
      const key = getGroupKey(new Date(f.examDate), period);
      ensureGroup(key);
      grouped[key].examens += f.examPrixTotal ?? 0;
    });
    filteredEchographies.forEach((f) => {
      if (!f.echoDate) return;
      const key = getGroupKey(new Date(f.echoDate), period);
      ensureGroup(key);
      grouped[key].echographies += f.echoPrixTotal ?? 0;
    });

    return Object.entries(grouped)
      .map(([date, vals]) => ({ date, ...vals }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [facturesProduits, facturesPrestations, facturesExamens, facturesEchographies, activeClinicIds, activePrescripteurId, period]);

  // 3. Répartition par âge et sexe (Pyramide)
  const ageSexData = useMemo(() => {
    const buckets: Record<string, { hommes: number; femmes: number }> = {
      "0-9": { hommes: 0, femmes: 0 },
      "10-19": { hommes: 0, femmes: 0 },
      "20-29": { hommes: 0, femmes: 0 },
      "30-39": { hommes: 0, femmes: 0 },
      "40-49": { hommes: 0, femmes: 0 },
      "50-59": { hommes: 0, femmes: 0 },
      "60+": { hommes: 0, femmes: 0 },
    };

    clientsFilteredByClinic.forEach((client) => {
      if (!client.dateNaissance) return;
      const age = Math.floor((Date.now() - new Date(client.dateNaissance).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      const sex = client.sexe?.toLowerCase();
      const isMale = sex === "m" || sex === "masculin";

      let bucket = "60+";
      if (age < 10) bucket = "0-9";
      else if (age < 20) bucket = "10-19";
      else if (age < 30) bucket = "20-29";
      else if (age < 40) bucket = "30-39";
      else if (age < 50) bucket = "40-49";
      else if (age < 60) bucket = "50-59";

      if (isMale) buckets[bucket].hommes++;
      else buckets[bucket].femmes++;
    });

    return Object.entries(buckets).map(([tranche, vals]) => ({
      tranche,
      hommes: -vals.hommes,
      hommesAbs: vals.hommes,
      femmes: vals.femmes,
    }));
  }, [clientsFilteredByClinic]);

  // 4. Références / Contre-références (Bar)
  const refContreRefData = useMemo(() => {
    const filteredRefs = references.filter((r) => activeClinicIds.includes(r.idClinique));
    const filteredContreRefs = contreReferences.filter((r) => activeClinicIds.includes(r.idClinique));

    const grouped: Record<string, { references: number; contreReferences: number }> = {};
    filteredRefs.forEach((r) => {
      const key = getGroupKey(new Date(r.dateReference), period);
      if (!grouped[key]) grouped[key] = { references: 0, contreReferences: 0 };
      grouped[key].references++;
    });
    filteredContreRefs.forEach((r) => {
      const key = getGroupKey(new Date(r.dateReception), period);
      if (!grouped[key]) grouped[key] = { references: 0, contreReferences: 0 };
      grouped[key].contreReferences++;
    });

    return Object.entries(grouped)
      .map(([date, vals]) => ({ date, ...vals }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [references, contreReferences, activeClinicIds, period]);

  const totalRefs = useMemo(() => references.filter((r) => activeClinicIds.includes(r.idClinique)).length, [references, activeClinicIds]);
  const totalContreRefs = useMemo(() => contreReferences.filter((r) => activeClinicIds.includes(r.idClinique)).length, [contreReferences, activeClinicIds]);

  // 5. Top 10 produits vendus (Horizontal Bar)
  const topProduitsData = useMemo(() => {
    const filteredProduits = facturesProduits.filter(
      (f) => (!f.prodIdClinique || activeClinicIds.includes(f.prodIdClinique)) &&
        (!activePrescripteurId || f.prodIdPrescripteur === activePrescripteurId)
    );
    const prodMap: Record<string, { nom: string; quantite: number; montant: number }> = {};
    filteredProduits.forEach((f) => {
      const nom = f.prodLibelle || "Inconnu";
      if (!prodMap[nom]) prodMap[nom] = { nom, quantite: 0, montant: 0 };
      prodMap[nom].quantite += f.prodQuantite ?? 0;
      prodMap[nom].montant += f.prodMontantTotal ?? 0;
    });
    return Object.values(prodMap)
      .sort((a, b) => b.quantite - a.quantite)
      .slice(0, 10);
  }, [facturesProduits, activeClinicIds, activePrescripteurId]);

  // 6. Top 10 consultations par prestataire (Horizontal Bar)
  const topPrestatairesData = useMemo(() => {
    const userMap: Record<string, number> = {};
    visitesFilteredByClinic.forEach((v) => {
      const uid = (v as unknown as { idUser?: string }).idUser;
      if (uid) userMap[uid] = (userMap[uid] || 0) + 1;
    });
    return Object.entries(userMap)
      .map(([id, count]) => {
        const user = prescripteursList.find((p) => p.id === id);
        return { name: user?.name || id.slice(0, 8), count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [visitesFilteredByClinic, prescripteursList]);

  // 7. Clients par clinique (Bar)
  const clientsParCliniqueData = useMemo(() => {
    if (tabClinique.length <= 1) return [];
    const cliniqueMap: Record<string, number> = {};
    clientsFilteredByClinic.forEach((c) => {
      const cid = c.cliniqueId;
      cliniqueMap[cid] = (cliniqueMap[cid] || 0) + 1;
    });
    return tabClinique
      .filter((c) => activeClinicIds.includes(c.id))
      .map((c) => ({
        name: c.name,
        total: cliniqueMap[c.id] || 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [clientsFilteredByClinic, tabClinique, activeClinicIds]);

  // 8. Visites par clinique (Bar)
  const visitesParCliniqueData = useMemo(() => {
    if (tabClinique.length <= 1) return [];
    const cliniqueMap: Record<string, number> = {};
    visitesFilteredByClinic.forEach((v) => {
      cliniqueMap[v.idClinique] = (cliniqueMap[v.idClinique] || 0) + 1;
    });
    return tabClinique
      .filter((c) => activeClinicIds.includes(c.id))
      .map((c) => ({
        name: c.name,
        total: cliniqueMap[c.id] || 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [visitesFilteredByClinic, tabClinique, activeClinicIds]);

  // Chart configs for new charts
  const revenueOverTimeConfig = {
    produits: { label: "Produits", color: "#3b82f6" },
    prestations: { label: "Prestations", color: "#22c55e" },
    examens: { label: "Examens", color: "#f59e0b" },
    echographies: { label: "Échographies", color: "#8b5cf6" },
  } satisfies ChartConfig;

  const refConfig = {
    references: { label: "Références", color: "#3b82f6" },
    contreReferences: { label: "Contre-références", color: "#22c55e" },
  } satisfies ChartConfig;

  const ageSexConfig = {
    hommes: { label: "Hommes", color: "#3b82f6" },
    femmes: { label: "Femmes", color: "#ec4899" },
  } satisfies ChartConfig;

  // Composant de chargement
  const LoadingState = ({
    message = "Chargement des données...",
  }: {
    message?: string;
  }) => (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
        <p className="text-sm text-green-700">{message}</p>
      </div>
    </div>
  );

  // Composant d'état vide
  const EmptyState = ({
    message = "Aucune donnée disponible pour cette période.",
  }: {
    message?: string;
  }) => (
    <div className="flex items-center justify-center h-full">
      <p className="text-center text-sm text-green-700">{message}</p>
    </div>
  );

  return (
    <div id="chart" className="w-full flex flex-col gap-6">
      {/* 🧩 Section des cartes récapitulatives */}
      {/* Recette de la période */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
        {chartData.map((data, idx) => (
          <Card
            key={`revenue-${idx}-${filterKey}`}
            className="
        group relative overflow-hidden
        rounded-2xl 
        border border-blue-100/80
        bg-white backdrop-blur-sm
        shadow-lg shadow-blue-100/50
        hover:shadow-2xl hover:shadow-blue-200/70
        hover:border-blue-200
        hover:bg-white/90
        transition-all duration-500
      "
          >
            {/* Effet glow au hover */}
            <div
              className="
          absolute inset-0
          opacity-0 group-hover:opacity-100
          transition-opacity duration-700
          bg-radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.08), transparent 70%)
          pointer-events-none
        "
            />

            <CardHeader className="relative z-10 space-y-3">
              <CardDescription
                className="
            text-blue-600/80
            text-xs uppercase tracking-wider font-bold
          "
              >
                {data.name}
              </CardDescription>

              <CardTitle
                className="
            flex items-center justify-center
            font-extrabold tabular-nums
            text-blue-900
            group-hover:text-blue-950
            transition-colors duration-300
            w-full text-balance
          "
                style={{
                  fontSize: "clamp(1.5rem, 2.5vw, 3rem)",
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                }}
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={data.total}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: [1, 1.1, 1], opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="flex flex-wrap items-baseline justify-center gap-1 text-center w-full"
                    >
                      <AnimatedNumber value={data.total} />
                      <span className="text-sm sm:text-base md:text-lg text-blue-600/90">
                        CFA
                      </span>
                    </motion.div>
                  </AnimatePresence>
                )}
              </CardTitle>

              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="
              flex items-center gap-1
              border-blue-200
              text-blue-700
              bg-blue-50/80
              hover:bg-blue-100/90
              transition-colors
              backdrop-blur-sm
            "
                >
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  +12.5%
                </Badge>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* 📈 Graphique Statut des Clients */}
      <Card
        className="
    group relative overflow-hidden
    rounded-2xl
    border border-blue-100/80
    bg-white backdrop-blur-sm
    shadow-lg shadow-blue-100/50
    hover:shadow-2xl hover:shadow-blue-200/70
    hover:border-blue-200
    hover:bg-white/90
    transition-all duration-500
  "
      >
        {/* Effet glow au hover */}
        <div
          className="
      absolute inset-0
      opacity-0 group-hover:opacity-100
      transition-opacity duration-700
      bg-radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.08), transparent 70%)
      pointer-events-none
    "
        />

        <CardHeader className="relative z-10">
          <CardTitle
            className="
        text-blue-900
        group-hover:text-blue-950
        transition-colors duration-300
      "
          >
            Statut des Clients
          </CardTitle>
          <CardDescription
            className="
        text-blue-600/80
      "
          >
            Évolution des nouveaux et anciens clients dans le temps
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="space-y-4">
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-45 w-full"
            >
              {loading ? (
                <LoadingState />
              ) : statusChartData.length === 0 ? (
                <EmptyState />
              ) : (
                <AreaChart key={`status-chart-${filterKey}`} data={statusChartData}>
                  <CartesianGrid
                    vertical={false}
                    stroke="#dbeafe"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                    tick={{ fill: "#1d4ed8" }}
                    tickFormatter={(value) => formatAxisLabel(value, period)}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#1d4ed8" }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) => formatAxisLabel(value, period)}
                        indicator="dot"
                      />
                    }
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => (
                      <span
                        style={{
                          color: "#000",
                          fontSize: "14px",
                          fontWeight: "500",
                        }}
                      >
                        {value}
                      </span>
                    )}
                  />
                  <Area
                    dataKey="nouveau"
                    type="natural"
                    fill="url(#gradientNouveau)"
                    stroke="#3b82f6"
                    fillOpacity={0.3}
                    strokeWidth={2}
                    name={`Nouveau client : `}
                  >
                    <LabelList
                      dataKey="nouveau"
                      position="top"
                      offset={10}
                      fill="#1e40af"
                      fontSize={10}
                      fontWeight="bold"
                      formatter={(value: number) => (value > 0 ? value : "")}
                    />
                  </Area>
                  <Area
                    dataKey="ancien"
                    type="natural"
                    fill="url(#gradientAncien)"
                    stroke="#8b5cf6"
                    fillOpacity={0.3}
                    strokeWidth={2}
                    name={`Ancien client : `}
                  >
                    <LabelList
                      dataKey="ancien"
                      position="top"
                      offset={10}
                      fill="#5b21b6"
                      fontSize={10}
                      fontWeight="bold"
                      formatter={(value: number) => (value > 0 ? value : "")}
                    />
                  </Area>
                  <defs>
                    <linearGradient
                      id="gradientNouveau"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop
                        offset="95%"
                        stopColor="#3b82f6"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                    <linearGradient
                      id="gradientAncien"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop
                        offset="95%"
                        stopColor="#8b5cf6"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                </AreaChart>
              )}
            </ChartContainer>
          </div>
        </CardContent>
        <CardFooter className="relative z-10 flex-col items-start gap-2 text-sm">
          <div className="flex gap-2 leading-none font-medium text-blue-700">
            Analyse des statuts clients <TrendingUp className="h-4 w-4" />
          </div>
          <div className="text-blue-600/80 leading-none">
            {totalClients} clients analysés sur la période sélectionnée :{" "}
            {totalNouveaux} nouveaux utilisateurs et {totalAnciens} anciens
            utilisateurs.
          </div>
        </CardFooter>
      </Card>

      {/* 📊 Graphique des Motifs de Visite */}
      <Card
        className="
    group relative overflow-hidden
    rounded-2xl
    border border-blue-100/80
    bg-white backdrop-blur-sm
    shadow-lg shadow-blue-100/50
    hover:shadow-2xl hover:shadow-blue-200/70
    hover:border-blue-200
    hover:bg-white/90
    transition-all duration-500
  "
      >
        {/* Effet glow au hover */}
        <div
          className="
      absolute inset-0
      opacity-0 group-hover:opacity-100
      transition-opacity duration-700
      bg-radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.08), transparent 70%)
      pointer-events-none
    "
        />

        <CardHeader className="relative z-10">
          <CardTitle
            className="
        text-blue-900
        group-hover:text-blue-950
        transition-colors duration-300
      "
          >
            Motifs de Visite
          </CardTitle>
          <CardDescription
            className="
        text-blue-600/80
      "
          >
            Répartition des motifs de visite des clients
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 px-2 h-45 sm:px-6">
          {loading ? (
            <LoadingState message="Chargement des motifs de visite..." />
          ) : visitesFilteredByClinic.length === 0 ? (
            <EmptyState message="Aucune visite enregistrée pour cette période." />
          ) : (
            <ChartContainer
              config={chartMotifConfig}
              className="aspect-auto h-full w-full"
            >
              <BarChart
                key={`motif-chart-${filterKey}`}
                data={motifData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 80,
                }}
                className="w-full"
              >
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke="#dbeafe"
                />
                <XAxis
                  dataKey="motif"
                  tickLine={true}
                  axisLine={true}
                  angle={-45}
                  textAnchor="end"
                  height={10}
                  tick={{ fill: "#1d4ed8", fontSize: 12 }}
                  interval={0}
                  tickFormatter={(value) =>
                    value.length > 20 ? `${value.substring(0, 20)}...` : value
                  }
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#1d4ed8", fontSize: 12 }}
                />
                <ChartTooltip
                  cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white/95 backdrop-blur-sm border border-blue-200 rounded-lg p-3 shadow-lg">
                          <p className="text-blue-800 font-medium mb-2">
                            {label}
                          </p>
                          <div className="flex items-center gap-2 text-sm">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: payload[0].color }}
                            />
                            <span className="text-gray-700">
                              Nombre de visites :{" "}
                            </span>
                            <span className="text-blue-700 font-bold">
                              {payload[0].value}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                  {motifData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getBarColor(index)}
                      className="hover:opacity-80 transition-opacity"
                    />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="top"
                    offset={12}
                    fill="#1d4ed8"
                    fontSize={12}
                    fontWeight="bold"
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
        <CardFooter className="relative z-10 flex-col items-start gap-2 text-sm">
          <div className="flex gap-2 leading-none font-medium text-blue-700">
            Analyse des motifs de visite <TrendingUp className="h-4 w-4" />
          </div>
          <div className="text-blue-600/80 leading-none">
            {visitesFilteredByClinic.length} visites analysées sur la période sélectionnée
          </div>
        </CardFooter>
      </Card>

      {/* 📈 Graphique Utilisateurs PF */}
      <Card
        className="
    group relative overflow-hidden
    rounded-2xl
    border border-blue-100/80
    bg-white backdrop-blur-sm
    shadow-lg shadow-blue-100/50
    hover:shadow-2xl hover:shadow-blue-200/70
    hover:border-blue-200
    hover:bg-white/90
    transition-all duration-500
  "
      >
        {/* Effet glow au hover */}
        <div
          className="
      absolute inset-0
      opacity-0 group-hover:opacity-100
      transition-opacity duration-700
      bg-radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.08), transparent 70%)
      pointer-events-none
    "
        />

        <CardHeader className="relative z-10">
          <CardTitle
            className="
        text-blue-900
        group-hover:text-blue-950
        transition-colors duration-300
      "
          >
            Utilisateurs PF
          </CardTitle>
          <CardDescription
            className="
        text-blue-600/80
      "
          >
            Évolution des nouveaux et anciens utilisateurs PF
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="space-y-4">
            <ChartContainer
              config={chartPFConfig}
              className="aspect-auto h-45 w-full"
            >
              {loading ? (
                <LoadingState message="Chargement des données utilisateurs PF..." />
              ) : transformedDataStatusPF.length === 0 ? (
                <EmptyState message="Aucune donnée utilisateur PF disponible pour cette période." />
              ) : (
                <LineChart key={`pf-chart-${filterKey}`} data={transformedDataStatusPF}>
                  <CartesianGrid
                    vertical={false}
                    stroke="#dbeafe"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fill: "#1d4ed8" }}
                    tickFormatter={(value) => formatAxisLabel(value, period)}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#1d4ed8" }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) => formatAxisLabel(value, period)}
                        indicator="line"
                      />
                    }
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => (
                      <span
                        style={{
                          color: "#000",
                          fontSize: "14px",
                          fontWeight: "500",
                        }}
                      >
                        {value}
                      </span>
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="nouveaux"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{
                      fill: "#3b82f6",
                      strokeWidth: 2,
                      r: 4,
                      stroke: "white",
                    }}
                    activeDot={{
                      r: 8,
                      fill: "#1d4ed8",
                      stroke: "white",
                      strokeWidth: 2,
                    }}
                    name="Nouveaux utilisateurs : "
                  >
                    <LabelList
                      dataKey="nouveaux"
                      position="top"
                      offset={10}
                      fill="#1e40af"
                      fontSize={10}
                      fontWeight="bold"
                      formatter={(value: number) => (value > 0 ? value : "")}
                    />
                  </Line>
                  <Line
                    type="monotone"
                    dataKey="anciens"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{
                      fill: "#8b5cf6",
                      strokeWidth: 2,
                      r: 4,
                      stroke: "white",
                    }}
                    activeDot={{
                      r: 8,
                      fill: "#5b21b6",
                      stroke: "white",
                      strokeWidth: 2,
                    }}
                    name="Anciens utilisateurs : "
                  >
                    <LabelList
                      dataKey="anciens"
                      position="top"
                      offset={10}
                      fill="#5b21b6"
                      fontSize={10}
                      fontWeight="bold"
                      formatter={(value: number) => (value > 0 ? value : "")}
                    />
                  </Line>
                </LineChart>
              )}
            </ChartContainer>
          </div>
        </CardContent>
        <CardFooter className="relative z-10 flex-col items-start gap-2 text-sm">
          <div className="flex gap-2 leading-none font-medium text-blue-700">
            Analyse des utilisateurs PF <TrendingUp className="h-4 w-4" />
          </div>
          <div className="text-blue-600/80 leading-none">
            {planningFilteredByClinic.length} consultations de PF analysées :{" "}
            {planningFilteredByClinic.filter((item) => item.statut === "nu").length} nouveaux
            utilisateurs et{" "}
            {planningFilteredByClinic.filter((item) => item.statut === "au").length} anciens
            utilisateurs.
          </div>
        </CardFooter>
      </Card>

      {/* 📊 Graphique des types de prestations */}
      <Card
        className="
    group relative overflow-hidden
    rounded-2xl
    border border-blue-100/80
    bg-white backdrop-blur-sm
    shadow-lg shadow-blue-100/50
    hover:shadow-2xl hover:shadow-blue-200/70
    hover:border-blue-200
    hover:bg-white/90
    transition-all duration-500
  "
      >
        {/* Effet glow au hover */}
        <div
          className="
      absolute inset-0
      opacity-0 group-hover:opacity-100
      transition-opacity duration-700
      bg-radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.08), transparent 70%)
      pointer-events-none
    "
        />

        <CardHeader className="relative z-10">
          <CardTitle
            className="
        text-blue-900
        group-hover:text-blue-950
        transition-colors duration-300
      "
          >
            Types de Prestations
          </CardTitle>
          <CardDescription
            className="
        text-blue-600/80
      "
          >
            Répartition des consultations par type de prestation
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 px-2 h-45 sm:px-6">
          {loading ? (
            <LoadingState message="Chargement des prestations..." />
          ) : prestationDataChart.length === 0 ? (
            <EmptyState message="Aucune prestation enregistrée pour cette période." />
          ) : (
            <ChartContainer
              config={chartPrestationConfig}
              className="aspect-auto h-full w-full"
            >
              <BarChart
                key={`prestation-chart-${filterKey}`}
                data={prestationDataChart}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 80,
                }}
                className="w-full"
              >
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke="#dbeafe"
                />
                <XAxis
                  dataKey="name"
                  tickLine={true}
                  axisLine={true}
                  angle={-45}
                  textAnchor="end"
                  height={10}
                  tick={{ fill: "#1d4ed8", fontSize: 12 }}
                  interval={0}
                  tickFormatter={(value) =>
                    value.length > 20 ? `${value.substring(0, 20)}...` : value
                  }
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#1d4ed8", fontSize: 12 }}
                  tickFormatter={(value) => `${value}`}
                />
                <ChartTooltip
                  cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white/95 backdrop-blur-sm border border-blue-200 rounded-lg p-3 shadow-lg">
                          <p className="text-blue-800 font-medium mb-2">
                            {label}
                          </p>
                          <div className="flex items-center gap-2 text-sm">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: payload[0].color }}
                            />
                            <span className="text-gray-700">
                              Nombre total :{" "}
                            </span>
                            <span className="text-blue-700 font-bold">
                              {payload[0].value?.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} barSize={40}>
                  {prestationDataChart.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || getBarColor(index)}
                      className="hover:opacity-80 transition-opacity"
                    />
                  ))}
                  <LabelList
                    dataKey="total"
                    position="top"
                    fill="#1d4ed8"
                    fontSize={12}
                    fontWeight="bold"
                    formatter={(value: number) => value?.toLocaleString()}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
        <CardFooter className="relative z-10 flex-col items-start gap-2 text-sm">
          <div className="flex gap-2 leading-none font-medium text-blue-700">
            Analyse des types de prestations <TrendingUp className="h-4 w-4" />
          </div>
          <div className="text-blue-600/80 leading-none">
            {prestationDataChart.length} types de prestations analysés sur la
            période sélectionnée
          </div>
        </CardFooter>
      </Card>
      {/* ====== NOUVEAUX GRAPHIQUES ====== */}

      {/* 🍩 Revenus par type de service (Donut) + Évolution des revenus */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="group relative overflow-hidden rounded-2xl border border-blue-100/80 bg-white backdrop-blur-sm shadow-lg shadow-blue-100/50 hover:shadow-2xl hover:shadow-blue-200/70 hover:border-blue-200 hover:bg-white/90 transition-all duration-500">
          <CardHeader className="relative z-10">
            <CardTitle className="text-blue-900">Revenus par type de service</CardTitle>
            <CardDescription className="text-blue-600/80">Répartition des revenus entre les différents services</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 flex items-center justify-center">
            {loading ? (
              <LoadingState />
            ) : revenueByServiceData.length === 0 ? (
              <EmptyState message="Aucun revenu pour cette période." />
            ) : (
              <PieChart width={350} height={280}>
                <Pie
                  data={revenueByServiceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={11}
                >
                  {revenueByServiceData.map((entry, index) => (
                    <Cell key={`cell-donut-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `${value.toLocaleString()} CFA`}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #dbeafe" }}
                />
              </PieChart>
            )}
          </CardContent>
          <CardFooter className="relative z-10 flex-col items-start gap-2 text-sm">
            <div className="flex gap-2 leading-none font-medium text-blue-700">
              Répartition financière <TrendingUp className="h-4 w-4" />
            </div>
          </CardFooter>
        </Card>

        {/* 📈 Évolution des revenus dans le temps */}
        <Card className="group relative overflow-hidden rounded-2xl border border-blue-100/80 bg-white backdrop-blur-sm shadow-lg shadow-blue-100/50 hover:shadow-2xl hover:shadow-blue-200/70 hover:border-blue-200 hover:bg-white/90 transition-all duration-500">
          <CardHeader className="relative z-10">
            <CardTitle className="text-blue-900">Évolution des revenus</CardTitle>
            <CardDescription className="text-blue-600/80">Tendance des revenus par type de service dans le temps</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 px-2 pt-4 sm:px-6 sm:pt-6">
            <ChartContainer config={revenueOverTimeConfig} className="aspect-auto h-[250px] w-full">
              {loading ? (
                <LoadingState />
              ) : revenueOverTimeData.length === 0 ? (
                <EmptyState message="Aucune donnée de revenu pour cette période." />
              ) : (
                <AreaChart key={`revenue-time-${filterKey}`} data={revenueOverTimeData}>
                  <CartesianGrid vertical={false} stroke="#dbeafe" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: "#1d4ed8" }} tickFormatter={(v) => formatAxisLabel(v, period)} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#1d4ed8" }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => formatAxisLabel(v, period)} indicator="dot" />} />
                  <Legend verticalAlign="top" height={36} />
                  <Area type="monotone" dataKey="produits" stackId="1" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.3} name="Produits" />
                  <Area type="monotone" dataKey="prestations" stackId="1" fill="#22c55e" stroke="#22c55e" fillOpacity={0.3} name="Prestations" />
                  <Area type="monotone" dataKey="examens" stackId="1" fill="#f59e0b" stroke="#f59e0b" fillOpacity={0.3} name="Examens" />
                  <Area type="monotone" dataKey="echographies" stackId="1" fill="#8b5cf6" stroke="#8b5cf6" fillOpacity={0.3} name="Échographies" />
                </AreaChart>
              )}
            </ChartContainer>
          </CardContent>
          <CardFooter className="relative z-10 flex-col items-start gap-2 text-sm">
            <div className="flex gap-2 leading-none font-medium text-blue-700">
              Tendance financière <TrendingUp className="h-4 w-4" />
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* 👥 Pyramide des âges + Références/Contre-références */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pyramide des âges */}
        <Card className="group relative overflow-hidden rounded-2xl border border-blue-100/80 bg-white backdrop-blur-sm shadow-lg shadow-blue-100/50 hover:shadow-2xl hover:shadow-blue-200/70 hover:border-blue-200 hover:bg-white/90 transition-all duration-500">
          <CardHeader className="relative z-10">
            <CardTitle className="text-blue-900">Répartition par âge et sexe</CardTitle>
            <CardDescription className="text-blue-600/80">Pyramide des âges des patients enregistrés</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 px-2 pt-4 sm:px-6 sm:pt-6">
            <ChartContainer config={ageSexConfig} className="aspect-auto h-[280px] w-full">
              {loading ? (
                <LoadingState />
              ) : clientsFilteredByClinic.length === 0 ? (
                <EmptyState message="Aucun patient pour cette période." />
              ) : (
                <BarChart key={`age-sex-${filterKey}`} data={ageSexData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid horizontal={false} stroke="#dbeafe" strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fill: "#1d4ed8" }} tickFormatter={(v) => Math.abs(v).toString()} />
                  <YAxis type="category" dataKey="tranche" tick={{ fill: "#1d4ed8", fontSize: 12 }} width={45} />
                  <ChartTooltip content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white/95 backdrop-blur-sm border border-blue-200 rounded-lg p-3 shadow-lg">
                          <p className="text-blue-800 font-medium mb-2">{label} ans</p>
                          {payload.map((p, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                              <span>{p.name} : <strong>{Math.abs(Number(p.value))}</strong></span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="hommes" fill="#3b82f6" radius={[4, 0, 0, 4]} name="Hommes">
                    <LabelList dataKey="hommesAbs" position="left" fill="#1d4ed8" fontSize={10} fontWeight="bold" formatter={(v: number) => v > 0 ? v : ""} />
                  </Bar>
                  <Bar dataKey="femmes" fill="#ec4899" radius={[0, 4, 4, 0]} name="Femmes">
                    <LabelList dataKey="femmes" position="right" fill="#be185d" fontSize={10} fontWeight="bold" formatter={(v: number) => v > 0 ? v : ""} />
                  </Bar>
                </BarChart>
              )}
            </ChartContainer>
          </CardContent>
          <CardFooter className="relative z-10 flex-col items-start gap-2 text-sm">
            <div className="flex gap-2 leading-none font-medium text-blue-700">
              Démographie des patients <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-blue-600/80 leading-none">
              {clientsFilteredByClinic.length} patients analysés
            </div>
          </CardFooter>
        </Card>

        {/* Références / Contre-références */}
        <Card className="group relative overflow-hidden rounded-2xl border border-blue-100/80 bg-white backdrop-blur-sm shadow-lg shadow-blue-100/50 hover:shadow-2xl hover:shadow-blue-200/70 hover:border-blue-200 hover:bg-white/90 transition-all duration-500">
          <CardHeader className="relative z-10">
            <CardTitle className="text-blue-900">Références / Contre-références</CardTitle>
            <CardDescription className="text-blue-600/80">Suivi des références et contre-références dans le temps</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 px-2 pt-4 sm:px-6 sm:pt-6">
            <ChartContainer config={refConfig} className="aspect-auto h-[280px] w-full">
              {loading ? (
                <LoadingState />
              ) : refContreRefData.length === 0 ? (
                <EmptyState message="Aucune référence pour cette période." />
              ) : (
                <BarChart key={`ref-${filterKey}`} data={refContreRefData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid vertical={false} stroke="#dbeafe" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#1d4ed8" }} tickFormatter={(v) => formatAxisLabel(v, period)} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#1d4ed8" }} />
                  <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => formatAxisLabel(v, period)} indicator="dot" />} />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="references" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Références" barSize={25}>
                    <LabelList dataKey="references" position="top" fill="#1d4ed8" fontSize={10} fontWeight="bold" formatter={(v: number) => v > 0 ? v : ""} />
                  </Bar>
                  <Bar dataKey="contreReferences" fill="#22c55e" radius={[4, 4, 0, 0]} name="Contre-réf." barSize={25}>
                    <LabelList dataKey="contreReferences" position="top" fill="#15803d" fontSize={10} fontWeight="bold" formatter={(v: number) => v > 0 ? v : ""} />
                  </Bar>
                </BarChart>
              )}
            </ChartContainer>
          </CardContent>
          <CardFooter className="relative z-10 flex-col items-start gap-2 text-sm">
            <div className="flex gap-2 leading-none font-medium text-blue-700">
              Analyse des références <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-blue-600/80 leading-none">
              {totalRefs} références et {totalContreRefs} contre-références sur la période
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* 📦 Top 10 produits + Top 10 prestataires */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 produits vendus */}
        <Card className="group relative overflow-hidden rounded-2xl border border-blue-100/80 bg-white backdrop-blur-sm shadow-lg shadow-blue-100/50 hover:shadow-2xl hover:shadow-blue-200/70 hover:border-blue-200 hover:bg-white/90 transition-all duration-500">
          <CardHeader className="relative z-10">
            <CardTitle className="text-blue-900">Top 10 produits vendus</CardTitle>
            <CardDescription className="text-blue-600/80">Produits les plus vendus par quantité</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 px-2 pt-4 sm:px-6 sm:pt-6">
            <ChartContainer config={{ quantite: { label: "Quantité", color: "#22c55e" } }} className="aspect-auto h-[320px] w-full">
              {loading ? (
                <LoadingState />
              ) : topProduitsData.length === 0 ? (
                <EmptyState message="Aucune vente de produit pour cette période." />
              ) : (
                <BarChart key={`top-prod-${filterKey}`} data={topProduitsData} layout="vertical" margin={{ left: 10, right: 40 }}>
                  <CartesianGrid horizontal={false} stroke="#dbeafe" strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fill: "#1d4ed8" }} />
                  <YAxis type="category" dataKey="nom" tick={{ fill: "#1d4ed8", fontSize: 11 }} width={120} tickFormatter={(v) => v.length > 18 ? `${v.slice(0, 18)}...` : v} />
                  <ChartTooltip content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white/95 backdrop-blur-sm border border-blue-200 rounded-lg p-3 shadow-lg">
                          <p className="text-blue-800 font-medium mb-2">{label}</p>
                          <p className="text-sm">Quantité : <strong>{d.quantite}</strong></p>
                          <p className="text-sm">Montant : <strong>{d.montant?.toLocaleString()} CFA</strong></p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Bar dataKey="quantite" radius={[0, 4, 4, 0]} barSize={20}>
                    {topProduitsData.map((_, index) => (
                      <Cell key={`prod-cell-${index}`} fill={getBarColor(index)} />
                    ))}
                    <LabelList dataKey="quantite" position="right" fill="#1d4ed8" fontSize={11} fontWeight="bold" />
                  </Bar>
                </BarChart>
              )}
            </ChartContainer>
          </CardContent>
          <CardFooter className="relative z-10 flex-col items-start gap-2 text-sm">
            <div className="flex gap-2 leading-none font-medium text-blue-700">
              Analyse des ventes produits <TrendingUp className="h-4 w-4" />
            </div>
          </CardFooter>
        </Card>

        {/* Top 10 consultations par prestataire */}
        <Card className="group relative overflow-hidden rounded-2xl border border-blue-100/80 bg-white backdrop-blur-sm shadow-lg shadow-blue-100/50 hover:shadow-2xl hover:shadow-blue-200/70 hover:border-blue-200 hover:bg-white/90 transition-all duration-500">
          <CardHeader className="relative z-10">
            <CardTitle className="text-blue-900">Top 10 consultations par prestataire</CardTitle>
            <CardDescription className="text-blue-600/80">Prestataires avec le plus de consultations</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 px-2 pt-4 sm:px-6 sm:pt-6">
            <ChartContainer config={{ count: { label: "Consultations", color: "#3b82f6" } }} className="aspect-auto h-[320px] w-full">
              {loading ? (
                <LoadingState />
              ) : topPrestatairesData.length === 0 ? (
                <EmptyState message="Aucune consultation pour cette période." />
              ) : (
                <BarChart key={`top-prest-${filterKey}`} data={topPrestatairesData} layout="vertical" margin={{ left: 10, right: 40 }}>
                  <CartesianGrid horizontal={false} stroke="#dbeafe" strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fill: "#1d4ed8" }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#1d4ed8", fontSize: 11 }} width={120} tickFormatter={(v) => v.length > 18 ? `${v.slice(0, 18)}...` : v} />
                  <ChartTooltip content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white/95 backdrop-blur-sm border border-blue-200 rounded-lg p-3 shadow-lg">
                          <p className="text-blue-800 font-medium mb-2">{label}</p>
                          <p className="text-sm">Consultations : <strong>{payload[0].value}</strong></p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                    {topPrestatairesData.map((_, index) => (
                      <Cell key={`prest-cell-${index}`} fill={getBarColor(index)} />
                    ))}
                    <LabelList dataKey="count" position="right" fill="#1d4ed8" fontSize={11} fontWeight="bold" />
                  </Bar>
                </BarChart>
              )}
            </ChartContainer>
          </CardContent>
          <CardFooter className="relative z-10 flex-col items-start gap-2 text-sm">
            <div className="flex gap-2 leading-none font-medium text-blue-700">
              Activité des prestataires <TrendingUp className="h-4 w-4" />
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* 🏥 Clients et Visites par clinique (conditionnel : seulement si multi-cliniques) */}
      {tabClinique.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Clients par clinique */}
          <Card className="group relative overflow-hidden rounded-2xl border border-blue-100/80 bg-white backdrop-blur-sm shadow-lg shadow-blue-100/50 hover:shadow-2xl hover:shadow-blue-200/70 hover:border-blue-200 hover:bg-white/90 transition-all duration-500">
            <CardHeader className="relative z-10">
              <CardTitle className="text-blue-900">Clients par clinique</CardTitle>
              <CardDescription className="text-blue-600/80">Nombre de clients enregistrés par clinique</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 px-2 h-[280px] sm:px-6">
              {loading ? (
                <LoadingState />
              ) : clientsParCliniqueData.length === 0 ? (
                <EmptyState message="Aucune donnée pour cette période." />
              ) : (
                <ChartContainer config={{ total: { label: "Clients", color: "#3b82f6" } }} className="aspect-auto h-full w-full">
                  <BarChart key={`clients-clinique-${filterKey}`} data={clientsParCliniqueData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid vertical={false} stroke="#dbeafe" strokeDasharray="3 3" />
                    <XAxis dataKey="name" tickLine={true} axisLine={true} angle={-30} textAnchor="end" height={10} tick={{ fill: "#1d4ed8", fontSize: 11 }} interval={0} tickFormatter={(v) => v.length > 15 ? `${v.slice(0, 15)}...` : v} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#1d4ed8" }} />
                    <ChartTooltip content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white/95 backdrop-blur-sm border border-blue-200 rounded-lg p-3 shadow-lg">
                            <p className="text-blue-800 font-medium mb-1">{label}</p>
                            <p className="text-sm">Clients : <strong>{payload[0].value}</strong></p>
                          </div>
                        );
                      }
                      return null;
                    }} />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]} barSize={40}>
                      {clientsParCliniqueData.map((_, i) => (
                        <Cell key={`cc-${i}`} fill={getBarColor(i)} />
                      ))}
                      <LabelList dataKey="total" position="top" fill="#1d4ed8" fontSize={12} fontWeight="bold" />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
            <CardFooter className="relative z-10 flex-col items-start gap-2 text-sm">
              <div className="flex gap-2 leading-none font-medium text-blue-700">
                Répartition des clients <TrendingUp className="h-4 w-4" />
              </div>
            </CardFooter>
          </Card>

          {/* Visites par clinique */}
          <Card className="group relative overflow-hidden rounded-2xl border border-blue-100/80 bg-white backdrop-blur-sm shadow-lg shadow-blue-100/50 hover:shadow-2xl hover:shadow-blue-200/70 hover:border-blue-200 hover:bg-white/90 transition-all duration-500">
            <CardHeader className="relative z-10">
              <CardTitle className="text-blue-900">Visites par clinique</CardTitle>
              <CardDescription className="text-blue-600/80">Nombre de visites par clinique</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 px-2 h-[280px] sm:px-6">
              {loading ? (
                <LoadingState />
              ) : visitesParCliniqueData.length === 0 ? (
                <EmptyState message="Aucune visite pour cette période." />
              ) : (
                <ChartContainer config={{ total: { label: "Visites", color: "#22c55e" } }} className="aspect-auto h-full w-full">
                  <BarChart key={`visites-clinique-${filterKey}`} data={visitesParCliniqueData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid vertical={false} stroke="#dbeafe" strokeDasharray="3 3" />
                    <XAxis dataKey="name" tickLine={true} axisLine={true} angle={-30} textAnchor="end" height={10} tick={{ fill: "#1d4ed8", fontSize: 11 }} interval={0} tickFormatter={(v) => v.length > 15 ? `${v.slice(0, 15)}...` : v} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#1d4ed8" }} />
                    <ChartTooltip content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white/95 backdrop-blur-sm border border-blue-200 rounded-lg p-3 shadow-lg">
                            <p className="text-blue-800 font-medium mb-1">{label}</p>
                            <p className="text-sm">Visites : <strong>{payload[0].value}</strong></p>
                          </div>
                        );
                      }
                      return null;
                    }} />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]} barSize={40}>
                      {visitesParCliniqueData.map((_, i) => (
                        <Cell key={`vc-${i}`} fill={getBarColor(i)} />
                      ))}
                      <LabelList dataKey="total" position="top" fill="#1d4ed8" fontSize={12} fontWeight="bold" />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
            <CardFooter className="relative z-10 flex-col items-start gap-2 text-sm">
              <div className="flex gap-2 leading-none font-medium text-blue-700">
                Répartition des visites <TrendingUp className="h-4 w-4" />
              </div>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
