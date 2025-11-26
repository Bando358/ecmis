"use client";
import { ClientData } from "@/components/rapportPfActions";
import { exportReportToExcel } from "@/lib/utils";

interface PlanningFamilialProps {
  clients: ClientData[];
}

export default function PlanningFamilial({ clients }: PlanningFamilialProps) {
  const handleExportExcel = async () => {
    const data = clients.map((client) => ({
      Code: client.code,
      Nom: client.nom,
      Prénom: client.prenom,
      Âge: client.age,
      Sexe: client.sexe,
      "Date visite": client.dateVisite,
      "Motif visite": client.motifVisite,
      "Statut PF": client.statut,
      "Méthode prise": client.methodePrise ? "Oui" : "Non",
      "Consultation PF": client.consultationPf ? "Oui" : "Non",
      "Counseling PF": client.counsellingPf ? "Oui" : "Non",
      "Méthode courte durée": client.courtDuree || "N/A",
      "Date Implanon": client.implanon || "N/A",
      "Date Jadelle": client.jadelle || "N/A",
      "Date Stérilet": client.sterilet || "N/A",
      "Retrait Implanon": client.retraitImplanon ? "Oui" : "Non",
      "Retrait Jadelle": client.retraitJadelle ? "Oui" : "Non",
      "Retrait Stérilet": client.retraitSterilet ? "Oui" : "Non",
      "Prochain RDV PF": client.rdvPf
        ? new Date(client.rdvPf).toLocaleDateString()
        : "N/A",
      Prescripteur: client.nomPrescripteur || "N/A",
    }));

    await exportReportToExcel.medical(data, "liste_planning_familial");
  };

  return (
    <div className="p-6">
      <div className="flex flex-col gap-3 items-center mb-6">
        <h2 className="text-xl font-bold">Rapport Planning Familial</h2>
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
              <th className="border border-gray-300 px-4 py-2">Sexe</th>
              <th className="border border-gray-300 px-4 py-2">Date visite</th>
              <th className="border border-gray-300 px-4 py-2">Motif visite</th>
              <th className="border border-gray-300 px-4 py-2">Statut</th>
              <th className="border border-gray-300 px-4 py-2">
                Méthode prise
              </th>
              <th className="border border-gray-300 px-4 py-2">
                Consultation PF
              </th>
              <th className="border border-gray-300 px-4 py-2">
                Counseling PF
              </th>
              <th className="border border-gray-300 px-4 py-2">Courte durée</th>
              <th className="border border-gray-300 px-4 py-2">Implanon</th>
              <th className="border border-gray-300 px-4 py-2">Jadelle</th>
              <th className="border border-gray-300 px-4 py-2">Stérilet</th>
              <th className="border border-gray-300 px-4 py-2">RDV PF</th>
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
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {client.sexe}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {client.dateVisite}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {client.motifVisite}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {client.statut}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {client.methodePrise ? "Oui" : "Non"}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {client.consultationPf ? "Oui" : "Non"}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {client.counsellingPf ? "Oui" : "Non"}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {client.courtDuree || "N/A"}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {client.implanon || "N/A"}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {client.jadelle || "N/A"}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {client.sterilet || "N/A"}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {client.rdvPf
                    ? new Date(client.rdvPf).toLocaleDateString()
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
