"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { fetchDashboardData } from "@/lib/actions/dashboardActions";

type Client = {
  id: string;
  dateEnregistrement: Date;
  statusClient: string;
};

export async function getClientsData(
  clinicIds: string[],
  dateFrom: Date,
  dateTo: Date
): Promise<Client[]> {
  const { clients } = await fetchDashboardData(clinicIds, dateFrom, dateTo);
  return clients.map((c) => ({
    id: c.id,
    dateEnregistrement: new Date(c.dateEnregistrement),
    statusClient: c.statusClient,
  }));
}

export function ChartStatusClient({
  clinicIds,
  dateFrom,
  dateTo,
}: {
  clinicIds: string[];
  dateFrom: Date;
  dateTo: Date;
}) {
  const isMobile = useIsMobile();
  const [clients, setClients] = React.useState<Client[]>([]);
  const [timeRange, setTimeRange] = React.useState("90d");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (isMobile) setTimeRange("7d");
  }, [isMobile]);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await getClientsData(clinicIds, dateFrom, dateTo);
      setClients(data);
      setLoading(false);
    })();
  }, [clinicIds, dateFrom, dateTo]);

  // Filtrage par période
  const referenceDate = new Date(dateTo);
  let daysToSubtract = 90;
  if (timeRange === "30d") daysToSubtract = 30;
  else if (timeRange === "7d") daysToSubtract = 7;

  const startDate = new Date(referenceDate);
  startDate.setDate(referenceDate.getDate() - daysToSubtract);

  const filteredClients = clients.filter(
    (c) => new Date(c.dateEnregistrement) >= startDate
  );

  // Regrouper par date et par statut
  const groupedData: Record<string, Record<string, number>> = {};

  filteredClients.forEach((client) => {
    const dateKey = new Date(client.dateEnregistrement)
      .toISOString()
      .split("T")[0];
    if (!groupedData[dateKey]) groupedData[dateKey] = {};
    if (!groupedData[dateKey][client.statusClient])
      groupedData[dateKey][client.statusClient] = 0;
    groupedData[dateKey][client.statusClient]++;
  });

  // Conversion pour Recharts
  const chartData = Object.entries(groupedData).map(([date, statuses]) => ({
    date,
    ...statuses,
  }));

  // Couleurs dynamiques
  const uniqueStatuses = Array.from(
    new Set(filteredClients.map((c) => c.statusClient))
  );
  const colors = [
    "#0ea5e9",
    "#22c55e",
    "#eab308",
    "#ef4444",
    "#8b5cf6",
    "#14b8a6",
  ];
  const chartConfig: ChartConfig = Object.fromEntries(
    uniqueStatuses.map((status, idx) => [
      status,
      {
        label: status,
        color: colors[idx % colors.length],
      },
    ])
  );

  return (
    <Card className="@container/card mt-6">
      <CardHeader>
        <CardTitle>Statut des Clients</CardTitle>
        <CardDescription>
          Répartition des statuts sur{" "}
          {timeRange === "7d"
            ? "7 jours"
            : timeRange === "30d"
            ? "30 jours"
            : "3 mois"}
        </CardDescription>

        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">3 derniers mois</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 derniers jours</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 derniers jours</ToggleGroupItem>
          </ToggleGroup>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="flex w-40 @[767px]/card:hidden" size="sm">
              <SelectValue placeholder="3 derniers mois" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d">3 derniers mois</SelectItem>
              <SelectItem value="30d">30 derniers jours</SelectItem>
              <SelectItem value="7d">7 derniers jours</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>

      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground">
            Chargement des données...
          </p>
        ) : chartData.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Aucune donnée disponible pour cette période.
          </p>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-64 w-full"
          >
            <AreaChart data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                  });
                }}
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
              {uniqueStatuses.map((status) => (
                <Area
                  key={status}
                  dataKey={status}
                  type="natural"
                  fill={chartConfig[status].color}
                  stroke={chartConfig[status].color}
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
