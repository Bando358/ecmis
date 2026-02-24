"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import dynamic from "next/dynamic";
import type { FinancialDashboardData } from "@/lib/actions/financialDashboardActions";

const TableauFinancierChart = dynamic(() => import("./TableauFinancierChart"), {
  loading: () => <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />,
  ssr: false,
});

interface TableauFinancierClientProps {
  tabClinique: { id: string; name: string }[];
  dashboardData: FinancialDashboardData;
  defaultStartDate: string;
  defaultEndDate: string;
  defaultCliniqueId: string;
}

export default function TableauFinancierClient({
  tabClinique,
  dashboardData,
  defaultStartDate,
  defaultEndDate,
  defaultCliniqueId,
}: TableauFinancierClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [selectedClinique, setSelectedClinique] = useState(defaultCliniqueId);

  const handleSearch = () => {
    const params = new URLSearchParams();
    params.set("startDate", startDate);
    params.set("endDate", endDate);
    if (selectedClinique !== "all") params.set("clinique", selectedClinique);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      {/* Barre de filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-40"
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-40"
        />
        <Select value={selectedClinique} onValueChange={setSelectedClinique}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Clinique" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les cliniques</SelectItem>
            {tabClinique.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleSearch}>
          <Search className="h-4 w-4 mr-2" />
          Rechercher
        </Button>
      </div>

      {/* Graphiques */}
      <TableauFinancierChart data={dashboardData} />
    </div>
  );
}
