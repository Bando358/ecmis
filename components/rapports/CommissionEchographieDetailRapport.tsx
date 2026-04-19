"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { CommissionEchographieDetailRapportProps } from "./types";

export default function CommissionEchographieDetailRapport({
  dateDebut,
  dateFin,
  commissionsEchographieDetail,
}: CommissionEchographieDetailRapportProps) {
  const [search, setSearch] = useState("");

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR");
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return commissionsEchographieDetail;
    return commissionsEchographieDetail.filter(
      (r) =>
        r.prescripteur.toLowerCase().includes(q) ||
        r.client.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.dateVisite.toLowerCase().includes(q),
    );
  }, [commissionsEchographieDetail, search]);

  const totalGlobal = filteredRows.reduce((sum, row) => sum + row.commission, 0);
  const nombreTotalEchographies = filteredRows.length;

  return (
    <>
      <div className="text-center border-b pb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          COMMISSION PRESCRIPTEUR - DETAIL CLIENT (ECHOGRAPHIE)
        </h1>
        <div className="mt-4 text-sm text-gray-600">
          <p>
            <strong>Periode :</strong> {formatDate(dateDebut)}
            {dateDebut !== dateFin && ` au ${formatDate(dateFin)}`}
          </p>
        </div>
      </div>

      {commissionsEchographieDetail.length === 0 ? (
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
                placeholder="Rechercher (prescripteur, code, client, date)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {filteredRows.length} / {commissionsEchographieDetail.length} echographie(s)
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
                    Date visite
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Prescripteur
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Code
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Client
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-right text-sm font-medium text-gray-700">
                    Commission (FCFA)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-3 text-sm text-center text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm">
                      {row.dateVisite}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm">
                      {row.prescripteur}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm font-mono">
                      {row.code}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm">
                      {row.client}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-right font-medium">
                      {row.commission.toLocaleString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-orange-50">
                <tr>
                  <td
                    colSpan={5}
                    className="border border-gray-300 px-4 py-3 text-sm font-bold"
                  >
                    TOTAL COMMISSIONS ECHOGRAPHIE ({nombreTotalEchographies} echographie{nombreTotalEchographies > 1 ? "s" : ""})
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm font-bold text-right text-orange-700">
                    {totalGlobal.toLocaleString("fr-FR")} FCFA
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
