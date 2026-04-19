"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { CommissionEchographieTotalRapportProps } from "./types";

export default function CommissionEchographieTotalRapport({
  dateDebut,
  dateFin,
  commissionsEchographieTotal,
}: CommissionEchographieTotalRapportProps) {
  const [search, setSearch] = useState("");

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR");
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return commissionsEchographieTotal;
    return commissionsEchographieTotal.filter(
      (d) =>
        d.prescripteur.toLowerCase().includes(q) ||
        (d.contact || "").toLowerCase().includes(q),
    );
  }, [commissionsEchographieTotal, search]);

  const totalCommissions = filteredRows.reduce(
    (sum, d) => sum + d.nombreCommissions,
    0,
  );
  const totalMontant = filteredRows.reduce((sum, d) => sum + d.total, 0);

  return (
    <>
      <div className="text-center border-b pb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          COMMISSION PRESCRIPTEUR - TOTAL (ECHOGRAPHIE)
        </h1>
        <div className="mt-4 text-sm text-gray-600">
          <p>
            <strong>Periode :</strong> {formatDate(dateDebut)}
            {dateDebut !== dateFin && ` au ${formatDate(dateFin)}`}
          </p>
        </div>
      </div>

      {commissionsEchographieTotal.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Aucune commission d&apos;echographie trouvee pour cette periode
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 print:hidden">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher (prescripteur, contact)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {filteredRows.length} / {commissionsEchographieTotal.length} prescripteur(s)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead className="bg-orange-50">
                <tr>
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700 w-12">
                    N°
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Prescripteur
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Contact
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700">
                    Nombre d&apos;echographies
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-right text-sm font-medium text-gray-700">
                    Total (FCFA)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRows.map((data, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-3 text-sm text-center text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm">
                      {data.prescripteur}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm">
                      {data.contact}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-center">
                      {data.nombreCommissions}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-right font-medium">
                      {data.total.toLocaleString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-orange-50">
                <tr>
                  <td colSpan={2} className="border border-gray-300 px-4 py-3 text-sm font-bold">
                    TOTAL
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm"></td>
                  <td className="border border-gray-300 px-4 py-3 text-sm font-bold text-center">
                    {totalCommissions}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm font-bold text-right text-orange-700">
                    {totalMontant.toLocaleString("fr-FR")} FCFA
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </>
  );
}
