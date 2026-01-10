"use client";

import { useEffect, useState, useRef } from "react";
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

interface DashboardChartProps {
  clinicIds: string[];
  startDate: string;
  endDate: string;
  initialData?: {
    facturesProduits?: { prodMontantTotal?: number }[];
    facturesPrestations?: { prestPrixTotal?: number }[];
    facturesExamens?: { examPrixTotal?: number }[];
    facturesEchographies?: { echoPrixTotal?: number }[];
    clients?: Client[];
    visites?: Visite[];
    planning?: Planning[];
    allData?: { name: string; data: unknown[] }[];
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

export default function DashboardChart({
  clinicIds,
  startDate,
  endDate,
  initialData,
}: DashboardChartProps) {
  // Initialisation des states avec les données initiales
  const [chartData, setChartData] = useState<ChartDataType[]>(() => {
    if (initialData) {
      type FactureProduit = { prodMontantTotal?: number };
      const totalProduits =
        initialData.facturesProduits?.reduce(
          (acc: number, f: FactureProduit) => acc + (f.prodMontantTotal ?? 0),
          0
        ) || 0;
      type FacturePrestation = { prestPrixTotal?: number };
      const totalPrestations =
        initialData.facturesPrestations?.reduce(
          (acc: number, f: FacturePrestation) => acc + (f.prestPrixTotal ?? 0),
          0
        ) || 0;
      type FactureExamen = { examPrixTotal?: number };
      const totalExamens =
        initialData.facturesExamens?.reduce(
          (acc: number, f: FactureExamen) => acc + (f.examPrixTotal ?? 0),
          0
        ) || 0;
      type FactureEchographie = { echoPrixTotal?: number };
      const totalEchographies =
        initialData.facturesEchographies?.reduce(
          (acc: number, f: FactureEchographie) => acc + (f.echoPrixTotal ?? 0),
          0
        ) || 0;

      const totalGeneral =
        totalProduits + totalPrestations + totalExamens + totalEchographies;

      return [
        { name: "Produits", total: totalProduits },
        { name: "Prestations", total: totalPrestations },
        { name: "Examens", total: totalExamens },
        { name: "Échographies", total: totalEchographies },
        { name: "Total", total: totalGeneral },
      ];
    }
    return [];
  });

  const [clients, setClients] = useState<Client[]>(initialData?.clients || []);
  const [visites, setVisites] = useState<Visite[]>(initialData?.visites || []);
  const [planning, setPlanning] = useState<Planning[]>(
    initialData?.planning || []
  );
  const [prestationData, setPrestationData] = useState<
    { name: string; data: unknown[] }[]
  >(initialData?.allData || []);
  const [loading, setLoading] = useState(!initialData);

  // Références pour suivre les valeurs précédentes
  const prevStartDateRef = useRef<string>(startDate);
  const prevEndDateRef = useRef<string>(endDate);
  const prevClinicIdsRef = useRef<string>(clinicIds.join(","));
  const isFirstRender = useRef(true);

  useEffect(() => {
    const currentClinicIdsStr = clinicIds.join(",");

    // Si c'est le premier render et qu'on a des données initiales, ne pas recharger
    if (isFirstRender.current && initialData && chartData.length > 0) {
      isFirstRender.current = false;
      prevStartDateRef.current = startDate;
      prevEndDateRef.current = endDate;
      prevClinicIdsRef.current = currentClinicIdsStr;
      return;
    }

    isFirstRender.current = false;

    // Vérifier si les paramètres ont changé
    const datesChanged =
      prevStartDateRef.current !== startDate ||
      prevEndDateRef.current !== endDate;

    const clinicIdsChanged = prevClinicIdsRef.current !== currentClinicIdsStr;

    // Si rien n'a changé, ne pas recharger les données
    if (!datesChanged && !clinicIdsChanged) {
      return;
    }

    if (!clinicIds || clinicIds.length === 0) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await fetchDashboardData(
          clinicIds,
          new Date(startDate),
          new Date(endDate)
        );

        // Agrégation des totaux par catégorie
        const totalProduits =
          data.facturesProduits?.reduce(
            (acc: number, f: { prodMontantTotal?: number }) =>
              acc + (f.prodMontantTotal ?? 0),
            0
          ) || 0;
        type FacturePrestation = { prestPrixTotal?: number };
        const totalPrestations =
          data.facturesPrestations?.reduce(
            (acc: number, f: FacturePrestation) =>
              acc + (f.prestPrixTotal ?? 0),
            0
          ) || 0;
        type FactureExamen = { examPrixTotal?: number };
        const totalExamens =
          data.facturesExamens?.reduce(
            (acc: number, f: FactureExamen) => acc + (f.examPrixTotal ?? 0),
            0
          ) || 0;
        type FactureEchographie = { echoPrixTotal?: number };
        const totalEchographies =
          data.facturesEchographies?.reduce(
            (acc: number, f: FactureEchographie) =>
              acc + (f.echoPrixTotal ?? 0),
            0
          ) || 0;

        const totalGeneral =
          totalProduits + totalPrestations + totalExamens + totalEchographies;

        setChartData([
          { name: "Produits", total: totalProduits },
          { name: "Prestations", total: totalPrestations },
          { name: "Examens", total: totalExamens },
          { name: "Échographies", total: totalEchographies },
          { name: "Total", total: totalGeneral },
        ]);
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

        // Mettre à jour les références
        prevStartDateRef.current = startDate;
        prevEndDateRef.current = endDate;
        prevClinicIdsRef.current = currentClinicIdsStr;
      } catch (error) {
        console.error("Erreur lors du chargement du graphique :", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clinicIds, startDate, endDate]);

  // Calcul des totaux pour la légende
  const totalNouveaux = Array.isArray(clients)
    ? clients.filter((client) => client.statusClient === "nouveau").length
    : 0;
  const totalAnciens = Array.isArray(clients)
    ? clients.filter((client) => client.statusClient === "ancien").length
    : 0;
  const totalClients = Array.isArray(clients) ? clients.length : 0;

  // 🔹 Préparation des données pour le graphique Statut des Clients
  const groupedData: Record<string, { nouveau: number; ancien: number }> = {};

  const filteredClients = Array.isArray(clients)
    ? clients.filter((client) => {
        const clientDate = new Date(client.dateEnregistrement);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return (
          clientDate >= start &&
          clientDate <= end &&
          !isNaN(clientDate.getTime())
        );
      })
    : [];

  filteredClients.forEach((client) => {
    const dateKey = new Date(client.dateEnregistrement)
      .toISOString()
      .split("T")[0];

    if (!groupedData[dateKey]) {
      groupedData[dateKey] = { nouveau: 0, ancien: 0 };
    }

    if (client.statusClient === "nouveau") {
      groupedData[dateKey].nouveau++;
    } else if (client.statusClient === "ancien") {
      groupedData[dateKey].ancien++;
    }
  });

  const statusChartData = Object.entries(groupedData)
    .map(([date, statuses]) => ({
      date,
      nouveau: statuses.nouveau,
      ancien: statuses.ancien,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 🔹 Préparation des données pour les motifs de visite
  const motifVisiteData = () => {
    if (!Array.isArray(visites)) return [];
    const motifsCount: Record<string, number> = {};
    visites.forEach((visite) => {
      const motif = visite.motifVisite || "Non spécifié";
      motifsCount[motif] = (motifsCount[motif] || 0) + 1;
    });

    return Object.entries(motifsCount)
      .map(([motif, count]) => ({ motif, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  };

  // 🔹 Préparation des données pour les types de prestations
  const prestationByType = () => {
    if (!Array.isArray(prestationData) || prestationData.length === 0)
      return [];

    return prestationData.map((item, index) => ({
      name: item.name,
      total: Array.isArray(item.data) ? item.data.length : 0,
      color: colors[index % colors.length],
    }));
  };

  // 🔹 Préparation des données pour les Utilisateurs PF
  const pfDataByDate: Record<string, { nouveaux: number; anciens: number }> =
    {};

  planning.forEach((plan) => {
    const visite = visites.find((v) => v.id === plan.idVisite);
    if (!visite) return;

    const rawDate = visite.dateVisite;
    let dateString = "";

    if (typeof rawDate === "string") {
      dateString = rawDate;
    } else if (rawDate instanceof Date) {
      dateString = rawDate.toISOString().split("T")[0];
    }

    if (!dateString) return;

    if (!pfDataByDate[dateString]) {
      pfDataByDate[dateString] = { nouveaux: 0, anciens: 0 };
    }

    if (plan.statut === "nu") {
      pfDataByDate[dateString].nouveaux++;
    } else if (plan.statut === "au") {
      pfDataByDate[dateString].anciens++;
    }
  });

  const transformedDataStatusPF = Object.entries(pfDataByDate)
    .map(([date, counts]) => ({
      date,
      utilisateurs: "",
      nouveaux: counts.nouveaux,
      anciens: counts.anciens,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
            key={idx}
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
                <AreaChart data={statusChartData}>
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
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                      });
                    }}
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
                        labelFormatter={(value) =>
                          new Date(value).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        }
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
          ) : visites.length === 0 ? (
            <EmptyState message="Aucune visite enregistrée pour cette période." />
          ) : (
            <ChartContainer
              config={chartMotifConfig}
              className="aspect-auto h-full w-full"
            >
              <BarChart
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
            {visites.length} visites analysées sur la période sélectionnée
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
                <LineChart data={transformedDataStatusPF}>
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
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                      });
                    }}
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
                        labelFormatter={(value) =>
                          new Date(value).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        }
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
            {planning.length} consultations de PF analysées :{" "}
            {planning.filter((item) => item.statut === "nu").length} nouveaux
            utilisateurs et{" "}
            {planning.filter((item) => item.statut === "au").length} anciens
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
    </div>
  );
}
