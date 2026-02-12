"use client";

import { useMemo } from "react";
import { AnalysisResult, ChartType } from "@/lib/analytics/types";
import { mapToRechartsData, getChartColors } from "@/lib/analytics/visualization/chart-mapper";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface AnalyticsChartProps {
  result: AnalysisResult;
  chartType: ChartType;
  colorPalette?: string[];
  chartHeight?: string;
}

export function AnalyticsChart({ result, chartType, colorPalette, chartHeight }: AnalyticsChartProps) {
  const colors = getChartColors(colorPalette);
  const height = chartHeight ?? "400px";

  const { data, dataKeys, nameKey } = useMemo(
    () => mapToRechartsData(result, chartType),
    [result, chartType]
  );

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        Aucune donnee a visualiser.
      </div>
    );
  }

  const chartConfig = Object.fromEntries(
    dataKeys.map((key, i) => [
      key,
      { label: key, color: colors[i % colors.length] },
    ])
  );

  if (chartType === "bar" || chartType === "stackedBar") {
    return (
      <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 11 }} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {dataKeys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colors[i % colors.length]}
              stackId={chartType === "stackedBar" ? "stack" : undefined}
              radius={[2, 2, 0, 0]}
            />
          ))}
        </BarChart>
      </ChartContainer>
    );
  }

  if (chartType === "line") {
    return (
      <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {dataKeys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[i % colors.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ChartContainer>
    );
  }

  if (chartType === "area") {
    return (
      <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {dataKeys.map((key, i) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[i % colors.length]}
              fill={colors[i % colors.length]}
              fillOpacity={0.2}
            />
          ))}
        </AreaChart>
      </ChartContainer>
    );
  }

  if (chartType === "pie" || chartType === "doughnut") {
    return (
      <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={chartType === "doughnut" ? 140 : 150}
            innerRadius={chartType === "doughnut" ? 70 : 0}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            labelLine
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
    );
  }

  return null;
}
