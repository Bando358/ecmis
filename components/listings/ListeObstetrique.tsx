"use client";
import { ClientData } from "@/components/rapportPfActions";
import { exportReportToExcel } from "@/lib/utils";

interface ObstetriqueProps {
  clients: ClientData[];
}

export default function Obstetrique({ clients }: ObstetriqueProps) {
  const handleExportExcel = async () => {
    const data = clients.map((client) => ({
      Code: client.code,
      Nom: client.nom,
      Prénom: client.prenom,
      Âge: client.age,
      "Date visite": client.dateVisite,
      "Consultation obstétricale": client.obstConsultation ? "Oui" : "Non",
      "Counseling obstétrical": client.obstCounselling ? "Oui" : "Non",
      "Type visite": client.obstTypeVisite,
      VAT: client.obstVat || "N/A",
      SP: client.obstSp || "N/A",
      "Prescription Fer": client.obstFer ? "Oui" : "Non",
      "Prescription Folate": client.obstFolate ? "Oui" : "Non",
      "Prescription Déparasitant": client.obstDeparasitant ? "Oui" : "Non",
      "Prescription MILDA": client.obstMilda ? "Oui" : "Non",
      "Investigations réalisées": client.obstInvestigations ? "Oui" : "Non",
      "État nutritionnel": client.obstEtatNutritionnel,
      "État grossesse": client.obstEtatGrossesse,
      PFPI: client.obstPfppi ? "Oui" : "Non",
      "Dépistage Albuminie/Sucre": client.obstAlbuminieSucre ? "Oui" : "Non",
      "Dépistage Anémie": client.obstAnemie ? "Oui" : "Non",
      "Dépistage Syphilis": client.obstSyphilis ? "Oui" : "Non",
      "Dépistage AGHBS": client.obstAghbs ? "Oui" : "Non",
      "Prochain RDV": client.obstRdv || "N/A",
      "HTA Grossesse": client.grossesseHta || "N/A",
      "Diabète Grossesse": client.grossesseDiabete || "N/A",
      Gestité: client.grossesseGestite || 0,
      Parité: client.grossesseParite || 0,
      "Âge grossesse": client.grossesseAge || 0,
      DDR: client.grossesseDdr
        ? new Date(client.grossesseDdr).toLocaleDateString("fr-FR")
        : "N/A",
      "Terme prévu": client.termePrevu
        ? new Date(client.termePrevu).toLocaleDateString("fr-FR")
        : "N/A",
    }));

    await exportReportToExcel.medical(data, "liste obstetrique");
  };

  return (
    <div className="p-6">
      <div className="flex flex-col gap-3 items-center mb-6">
        <h2 className="text-xl font-bold">Rapport Obstétrique</h2>
        <button
          onClick={handleExportExcel}
          className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-900"
        >
          Télécharger Excel
        </button>
      </div>

      <div className="overflow-x-auto hidden">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2">Code</th>
              <th className="border border-gray-300 px-4 py-2">Nom</th>
              <th className="border border-gray-300 px-4 py-2">Prénom</th>
              <th className="border border-gray-300 px-4 py-2">Âge</th>
              <th className="border border-gray-300 px-4 py-2">Date visite</th>
              <th className="border border-gray-300 px-4 py-2">Consultation</th>
              <th className="border border-gray-300 px-4 py-2">Counseling</th>
              <th className="border border-gray-300 px-4 py-2">Type visite</th>
              <th className="border border-gray-300 px-4 py-2">VAT</th>
              <th className="border border-gray-300 px-4 py-2">SP</th>
              <th className="border border-gray-300 px-4 py-2">Fer</th>
              <th className="border border-gray-300 px-4 py-2">Folate</th>
              <th className="border border-gray-300 px-4 py-2">Déparasitant</th>
              <th className="border border-gray-300 px-4 py-2">MILDA</th>
              <th className="border border-gray-300 px-4 py-2">
                Investigations
              </th>
              <th className="border border-gray-300 px-4 py-2">
                État nutritionnel
              </th>
              <th className="border border-gray-300 px-4 py-2">
                État grossesse
              </th>
              <th className="border border-gray-300 px-4 py-2">PFPI</th>
              <th className="border border-gray-300 px-4 py-2">RDV</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client, index) => (
              <tr
                key={index}
                className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="border border-gray-300 px-4 py-2">
                  {client.code}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {client.nom}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {client.prenom}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {client.age}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {client.dateVisite}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {client.obstConsultation ? "Oui" : "Non"}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {client.obstCounselling ? "Oui" : "Non"}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {client.obstTypeVisite}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {client.obstVat || "N/A"}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {client.obstSp || "N/A"}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {client.obstFer ? "Oui" : "Non"}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {client.obstFolate ? "Oui" : "Non"}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {client.obstDeparasitant ? "Oui" : "Non"}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {client.obstMilda ? "Oui" : "Non"}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {client.obstInvestigations ? "Oui" : "Non"}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {client.obstEtatNutritionnel}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {client.obstEtatGrossesse}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {client.obstPfppi ? "Oui" : "Non"}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {client.obstRdv
                    ? client.obstRdv instanceof Date
                      ? client.obstRdv.toLocaleDateString("fr-FR")
                      : new Date(client.obstRdv).toLocaleDateString("fr-FR")
                    : "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
