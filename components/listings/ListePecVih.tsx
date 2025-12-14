"use client";
import { ClientData } from "@/components/rapportPfActions";
import { exportToExcel } from "@/lib/utils";

interface PecVihProps {
  clients: ClientData[];
}

export default function PecVih({ clients }: PecVihProps) {
  const handleExportExcel = async () => {
    const data = clients.map((client) => ({
      Code: client.code,
      Nom: client.nom,
      Prénom: client.prenom,
      Âge: client.age,
      Sexe: client.sexe,
      "Date visite": client.dateVisite,
      "Type client PEC VIH": client.pecVihTypeclient,
      "Molécule ARV": client.pecVihMoleculeArv,
      "Counseling PEC": client.pecVihCounselling ? "Oui" : "Non",
      "Traitement Cotrimo": client.pecVihCotrimo ? "Oui" : "Non",
      SPDP: client.pecVihSpdp ? "Oui" : "Non",
      "Soutien psychosocial": client.pecVihSoutienPsychoSocial ? "Oui" : "Non",
      "IO Paludisme": client.pecVihIoPaludisme ? "Oui" : "Non",
      "IO Tuberculose": client.pecVihIoTuberculose ? "Oui" : "Non",
      "IO Autre": client.pecVihIoAutre ? "Oui" : "Non",
      "AES ARV": client.pecVihAesArv ? "Oui" : "Non",
      "Charge virale": client.examenPvVihChargeVirale || "N/A",
      CD4: client.examenPvVihCd4 || "N/A",
      Glycémie: client.examenPvVihGlycemie || "N/A",
      Créatininémie: client.examenPvVihCreatinemie || "N/A",
      Transaminases: client.examenPvVihTransaminases || "N/A",
      Urée: client.examenPvVihUree || "N/A",
      "Cholestérol HDL": client.examenPvVihCholesterolHdl || "N/A",
      "Cholestérol Total": client.examenPvVihCholesterolTotal || "N/A",
      Hémoglobine: client.examenPvVihHemoglobineNfs || "N/A",
      "Femme enceinte": client.examenPvVihFemmeEnceinte ? "Oui" : "Non",
      Allaitement: client.examenPvVihAllaitement ? "Oui" : "Non",
      "Typage VIH": client.examenPvVihTypage || "N/A",
      "Date prélèvement": client.examenPvVihDatePrelevement
        ? new Date(client.examenPvVihDatePrelevement).toLocaleDateString(
            "fr-FR"
          )
        : "N/A",
      "Date traitement": client.examenPvVihDateTraitement
        ? new Date(client.examenPvVihDateTraitement).toLocaleDateString("fr-FR")
        : "N/A",
    }));

    await exportToExcel(data, "liste_pec_vih", {
      sheetName: "PEC VIH",
      headerStyle: {
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE74C3C" },
        },
        font: { bold: true, color: { argb: "FFFFFFFF" }, size: 11 },
      },
      columnWidths: [
        12, 18, 18, 8, 8, 12, 15, 20, 12, 12, 10, 10, 15, 12, 12, 12, 12, 12,
        12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12,
      ],
      autoFilter: true,
      freezeHeaders: true,
    });
  };

  return (
    <div className="p-6">
      <div className="flex flex-col gap-3 items-center mb-6">
        <h2 className="text-xl font-bold">Rapport PEC VIH</h2>
        <button
          onClick={handleExportExcel}
          className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-900"
        >
          Télécharger Excel
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2">Code</th>
              <th className="border border-gray-300 px-4 py-2">Nom</th>
              <th className="border border-gray-300 px-4 py-2">Prénom</th>
              <th className="border border-gray-300 px-4 py-2">Âge</th>
              <th className="border border-gray-300 px-4 py-2">Date visite</th>
              <th className="border border-gray-300 px-4 py-2">Type client</th>
              <th className="border border-gray-300 px-4 py-2">Molecule ARV</th>
              <th className="border border-gray-300 px-4 py-2">Counseling</th>
              <th className="border border-gray-300 px-4 py-2">Cotrimo</th>
              <th className="border border-gray-300 px-4 py-2">SPDP</th>
              <th className="border border-gray-300 px-4 py-2">
                Soutien psychosocial
              </th>
              <th className="border border-gray-300 px-4 py-2">IO Paludisme</th>
              <th className="border border-gray-300 px-4 py-2">
                IO Tuberculose
              </th>
              <th className="border border-gray-300 px-4 py-2">IO Autre</th>
              <th className="border border-gray-300 px-4 py-2">AES ARV</th>
              <th className="border border-gray-300 px-4 py-2">
                Charge virale
              </th>
              <th className="border border-gray-300 px-4 py-2">CD4</th>
              <th className="border border-gray-300 px-4 py-2">
                Femme enceinte
              </th>
              <th className="border border-gray-300 px-4 py-2">Allaitement</th>
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
                <td className="border border-gray-300 px-4 py-2">
                  {client.pecVihTypeclient}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {client.pecVihMoleculeArv}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {client.pecVihCounselling ? "Oui" : "Non"}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {client.pecVihCotrimo ? "Oui" : "Non"}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {client.pecVihSpdp ? "Oui" : "Non"}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {client.pecVihSoutienPsychoSocial ? "Oui" : "Non"}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {client.pecVihIoPaludisme ? "Oui" : "Non"}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {client.pecVihIoTuberculose ? "Oui" : "Non"}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {client.pecVihIoAutre ? "Oui" : "Non"}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {client.pecVihAesArv ? "Oui" : "Non"}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {client.examenPvVihChargeVirale || "N/A"}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {client.examenPvVihCd4 || "N/A"}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {client.examenPvVihFemmeEnceinte ? "Oui" : "Non"}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {client.examenPvVihAllaitement ? "Oui" : "Non"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
