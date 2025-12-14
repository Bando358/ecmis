"use server";
import DashboardServer from "@/components/DashboardServer";

interface DashboardPageProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    period?: string;
    clinique?: string;
    prescripteur?: string;
  }>;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const resolvedSearchParams = await searchParams;

  return <DashboardServer searchParams={resolvedSearchParams} />;
}
