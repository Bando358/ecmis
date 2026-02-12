"use client";

import { CommissionExamenDetailRapportProps } from "./types";

export default function CommissionExamenDetailRapport({
  dateDebut,
  dateFin,
  commissionsExamenDetail,
}: CommissionExamenDetailRapportProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR");
  };

  const totalGlobal = commissionsExamenDetail.reduce(
    (sum, row) => sum + row.commission,
    0
  );

  return (
    <>
      <div className="text-center border-b pb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          COMMISSION PRESCRIPTEUR - DETAIL CLIENT (EXAMEN)
        </h1>
        <div className="mt-4 text-sm text-gray-600">
          <p>
            <strong>Periode :</strong> {formatDate(dateDebut)}
            {dateDebut !== dateFin && ` au ${formatDate(dateFin)}`}
          </p>
        </div>
      </div>

      {commissionsExamenDetail.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Aucune commission d&apos;examen trouvee pour cette periode
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead className="bg-purple-50">
              <tr>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Date visite
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Prescripteur
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
              {commissionsExamenDetail.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-3 text-sm">
                    {row.dateVisite}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm">
                    {row.prescripteur}
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
            <tfoot className="bg-purple-50">
              <tr>
                <td
                  colSpan={3}
                  className="border border-gray-300 px-4 py-3 text-sm font-bold"
                >
                  TOTAL COMMISSIONS EXAMEN
                </td>
                <td className="border border-gray-300 px-4 py-3 text-sm font-bold text-right text-purple-700">
                  {totalGlobal.toLocaleString("fr-FR")} FCFA
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}
