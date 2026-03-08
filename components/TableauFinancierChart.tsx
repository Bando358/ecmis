"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  ShoppingCart,
  ShoppingBag,
  Stethoscope,
  Microscope,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Clock,
} from "lucide-react";
import type { FinancialDashboardData } from "@/lib/actions/financialDashboardActions";
import Link from "next/link";

interface TableauFinancierChartProps {
  data: FinancialDashboardData;
}

const formatCFA = (value: number) =>
  new Intl.NumberFormat("fr-FR").format(value) + " FCFA";

const revenueChartConfig: ChartConfig = {
  produits: { label: "Produits", color: "#22c55e" },
  prestations: { label: "Prestations", color: "#3b82f6" },
  examens: { label: "Examens", color: "#f59e0b" },
  echographies: { label: "Echographies", color: "#8b5cf6" },
};

const topProductsChartConfig: ChartConfig = {
  montantTotal: { label: "Montant", color: "#22c55e" },
};

function GrowthBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" /> 0%
      </span>
    );
  }
  if (previous === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <TrendingUp className="h-3 w-3" /> Nouveau
      </span>
    );
  }
  const rate = ((current - previous) / previous) * 100;
  const isPositive = rate >= 0;
  return (
    <span
      className={`flex items-center gap-1 text-xs font-medium ${
        isPositive ? "text-green-600" : "text-red-600"
      }`}
    >
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {isPositive ? "+" : ""}
      {rate.toFixed(1)}%
    </span>
  );
}

export default function TableauFinancierChart({
  data,
}: TableauFinancierChartProps) {
  const { summary, previousPeriod, revenueByPeriod, topProducts, recentLogs } = data;

  return (
    <div className="space-y-4">
      {/* Cartes resume */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Produits</CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">
              {formatCFA(summary.totalVentesProduits)}
            </div>
            {previousPeriod && <GrowthBadge current={summary.totalVentesProduits} previous={previousPeriod.totalVentesProduits} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Prestations</CardTitle>
            <Stethoscope className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-600">
              {formatCFA(summary.totalPrestations)}
            </div>
            {previousPeriod && <GrowthBadge current={summary.totalPrestations} previous={previousPeriod.totalPrestations} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Examens</CardTitle>
            <Microscope className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-amber-600">
              {formatCFA(summary.totalExamens)}
            </div>
            {previousPeriod && <GrowthBadge current={summary.totalExamens} previous={previousPeriod.totalExamens} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Echographies</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-purple-600">
              {formatCFA(summary.totalEchographies)}
            </div>
            {previousPeriod && <GrowthBadge current={summary.totalEchographies} previous={previousPeriod.totalEchographies} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ventes Directes</CardTitle>
            <ShoppingBag className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-teal-600">
              {formatCFA(summary.totalVentesDirectes)}
            </div>
            {previousPeriod && <GrowthBadge current={summary.totalVentesDirectes} previous={previousPeriod.totalVentesDirectes} />}
          </CardContent>
        </Card>
        <Card className="bg-slate-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-700" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {formatCFA(summary.totalGeneral)}
            </div>
            {previousPeriod && <GrowthBadge current={summary.totalGeneral} previous={previousPeriod.totalGeneral} />}
          </CardContent>
        </Card>
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Evolution des revenus */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Evolution des revenus</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByPeriod.length > 0 ? (
              <ChartContainer config={revenueChartConfig} className="h-[300px] w-full">
                <AreaChart data={revenueByPeriod}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="period"
                    tickFormatter={(v) => {
                      const d = new Date(v);
                      return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
                    }}
                    fontSize={12}
                  />
                  <YAxis
                    tickFormatter={(v) => new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(v)}
                    fontSize={12}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => formatCFA(Number(value))}
                      />
                    }
                  />
                  <Area type="monotone" dataKey="produits" stackId="1" fill="#22c55e" stroke="#22c55e" fillOpacity={0.4} />
                  <Area type="monotone" dataKey="prestations" stackId="1" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.4} />
                  <Area type="monotone" dataKey="examens" stackId="1" fill="#f59e0b" stroke="#f59e0b" fillOpacity={0.4} />
                  <Area type="monotone" dataKey="echographies" stackId="1" fill="#8b5cf6" stroke="#8b5cf6" fillOpacity={0.4} />
                </AreaChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Aucune donnee pour cette periode
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top produits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top 10 Produits</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <ChartContainer config={topProductsChartConfig} className="h-[300px] w-full">
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(v)}
                    fontSize={12}
                  />
                  <YAxis
                    dataKey="nomProduit"
                    type="category"
                    width={120}
                    fontSize={11}
                    tickFormatter={(v) => v.length > 15 ? v.slice(0, 15) + "..." : v}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => formatCFA(Number(value))}
                      />
                    }
                  />
                  <Bar dataKey="montantTotal" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Aucune vente de produit
              </p>
            )}
          </CardContent>
        </Card>

        {/* Commissions + Alertes stock */}
        <div className="space-y-4">
          {/* Commissions */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Commission Examens</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-amber-600">
                  {formatCFA(summary.totalCommissionsExamen)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Commission Echos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-purple-600">
                  {formatCFA(summary.totalCommissionsEchographie)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alertes stock */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Alertes Stock
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {summary.stockAlerts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.stockAlerts.map((alert, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">{alert.nomProduit}</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={
                              alert.quantiteStock <= 0
                                ? "text-red-600 border-red-300"
                                : alert.quantiteStock < 5
                                ? "text-orange-600 border-orange-300"
                                : "text-yellow-600 border-yellow-300"
                            }
                          >
                            {alert.quantiteStock}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-4 text-sm">
                  Aucune alerte
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activite recente */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Activite recente
          </CardTitle>
          <Link
            href="/journal-pharmacy"
            className="text-sm text-blue-600 hover:underline"
          >
            Voir tout
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentLogs.length > 0 ? (
            <Table>
              <TableBody>
                {recentLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap w-36">
                      {new Date(log.createdAt).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-sm font-medium w-32">
                      {log.userName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          log.action === "CREATION"
                            ? "text-green-600"
                            : log.action === "SUPPRESSION"
                            ? "text-red-600"
                            : "text-blue-600"
                        }
                      >
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm truncate max-w-[300px]">
                      {log.description}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-4 text-sm">
              Aucune activite recente
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
