"use client";

import { CommissionExamenTotalRapportProps } from "./types";

export default function CommissionExamenTotalRapport({
  dateDebut,
  dateFin,
  commissionsExamenTotal,
}: CommissionExamenTotalRapportProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR");
  };

  const totalCommissions = commissionsExamenTotal.reduce(
    (sum, d) => sum + d.nombreCommissions,
    0
  );
  const totalMontant = commissionsExamenTotal.reduce(
    (sum, d) => sum + d.total,
    0
  );

  return (
    <>
      <div className="text-center border-b pb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          COMMISSION PRESCRIPTEUR - TOTAL (EXAMEN)
        </h1>
        <div className="mt-4 text-sm text-gray-600">
          <p>
            <strong>Periode :</strong> {formatDate(dateDebut)}
            {dateDebut !== dateFin && ` au ${formatDate(dateFin)}`}
          </p>
        </div>
      </div>

      {commissionsExamenTotal.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Aucune commission d&apos;examen trouvee pour cette periode
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead className="bg-purple-50">
              <tr>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Prescripteur
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Contact
                </th>
                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700">
                  Nombre de commissions
                </th>
                <th className="border border-gray-300 px-4 py-3 text-right text-sm font-medium text-gray-700">
                  Total (FCFA)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {commissionsExamenTotal.map((data, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
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
            <tfoot className="bg-purple-50">
              <tr>
                <td className="border border-gray-300 px-4 py-3 text-sm font-bold">
                  TOTAL
                </td>
                <td className="border border-gray-300 px-4 py-3 text-sm"></td>
                <td className="border border-gray-300 px-4 py-3 text-sm font-bold text-center">
                  {totalCommissions}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-sm font-bold text-right text-purple-700">
                  {totalMontant.toLocaleString("fr-FR")} FCFA
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}
