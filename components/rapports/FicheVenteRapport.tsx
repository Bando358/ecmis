"use client";

import { FicheVenteRapportProps, GroupedExamen } from "./types";

export default function FicheVenteRapport({
  session,
  selectedCliniqueIds,
  getAllCliniqueNameById,
  dateDebut,
  dateFin,
  produitsGroupedByType,
  produitsCalculations,
  totalProduitsQuantite,
  facturesProduits,
  allPrestations,
  prestationsCalculations,
  facturesPrestations,
  groupedExamens,
  formatExamenLibelle,
  facturesExamens,
  groupedEchographies,
  facturesEchographies,
  totalRecette,
}: FicheVenteRapportProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR");
  };

  return (
    <>
      {/* En-tete du rapport */}
      <div className="text-center border-b pb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          FICHE DE VENTE JOURNALIERE
        </h1>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div className="text-left">
            <p>
              <strong>Caissiere :</strong> {session?.user?.name || "Non specifie"}
            </p>
          </div>
          <div className="text-center">
            <p>
              <strong>Clinique(s) :</strong> {getAllCliniqueNameById(selectedCliniqueIds)}
            </p>
          </div>
          <div className="text-right">
            <p>
              <strong>Periode :</strong> {formatDate(dateDebut)}
              {dateDebut !== dateFin && ` au ${formatDate(dateFin)}`}
            </p>
          </div>
        </div>
      </div>

      {/* Produits */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
          PRODUITS VENDUS
        </h3>

        {Object.entries(produitsGroupedByType).map(([type, produits]) => (
          <div key={type} className="mb-6">
            <h4 className="font-medium text-gray-700 mb-3 bg-gray-50 p-3 rounded-lg">
              {type === "CONTRACEPTIF" && "Contraceptifs"}
              {type === "MEDICAMENTS" && "Medicaments"}
              {type === "CONSOMMABLES" && "Consommables"}
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Libelle
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Prix Unitaire (FCFA)
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Quantite
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Montant (FCFA)
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Stock Final
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {produits.map((produit) => {
                    const calc = produitsCalculations[produit.nomProduit] || {
                      prixUnitaire: 0,
                      quantite: 0,
                      montant: 0,
                      stockFinal: 0,
                    };
                    return (
                      <tr key={produit.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-3 text-sm">
                          {produit.nomProduit}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-sm text-right">
                          {calc.prixUnitaire.toLocaleString("fr-FR")}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-sm text-right">
                          {calc.quantite}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-sm text-right font-medium">
                          {calc.montant.toLocaleString("fr-FR")}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-sm text-right">
                          {calc.stockFinal}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td
                      colSpan={2}
                      className="border border-gray-300 px-4 py-3 text-sm font-medium"
                    >
                      Total Produits
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-right">
                      {totalProduitsQuantite}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-right">
                      {facturesProduits
                        .reduce((sum, f) => sum + f.prodMontantTotal, 0)
                        .toLocaleString("fr-FR")}
                    </td>
                    <td className="border border-gray-300 px-4 py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Prestations */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
          PRESTATIONS
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Libelle
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Prix Unitaire (FCFA)
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Quantite
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Montant (FCFA)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {allPrestations.map((prestation) => {
                const calc = prestationsCalculations[prestation.nomPrestation] || {
                  prixUnitaire: 0,
                  quantite: 0,
                  montant: 0,
                };
                return (
                  <tr key={prestation.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-3 text-sm">
                      {prestation.nomPrestation}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-right">
                      {calc.prixUnitaire.toLocaleString("fr-FR")}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-right">
                      {calc.quantite}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-right font-medium">
                      {calc.montant.toLocaleString("fr-FR")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td
                  colSpan={2}
                  className="border border-gray-300 px-4 py-3 text-sm font-medium"
                >
                  Total Prestations
                </td>
                <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-right">
                  {facturesPrestations.length}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-right">
                  {facturesPrestations
                    .reduce((sum, f) => sum + f.prestPrixTotal, 0)
                    .toLocaleString("fr-FR")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Examens */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
          EXAMENS
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Libelle
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Prix Unitaire (FCFA)
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Quantite
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Montant (FCFA)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {groupedExamens.map((examen, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-3 text-sm">
                    {formatExamenLibelle(examen)}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-right">
                    {examen.prixUnitaire.toLocaleString("fr-FR")}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-right">
                    {examen.quantite}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-right font-medium">
                    {examen.montant.toLocaleString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td
                  colSpan={2}
                  className="border border-gray-300 px-4 py-3 text-sm font-medium"
                >
                  Total Examens
                </td>
                <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-right">
                  {facturesExamens.length}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-right">
                  {facturesExamens
                    .reduce((sum, f) => sum + f.examPrixTotal, 0)
                    .toLocaleString("fr-FR")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Echographies */}
      {groupedEchographies.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
            ECHOGRAPHIES
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Libelle
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Prix Unitaire (FCFA)
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Quantite
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Montant (FCFA)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {groupedEchographies.map((echographie, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-3 text-sm">
                      {echographie.remise > 0
                        ? `${echographie.libelle} (${echographie.remise}%)`
                        : echographie.libelle}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-right">
                      {echographie.prixUnitaire.toLocaleString("fr-FR")}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-right">
                      {echographie.quantite}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-right font-medium">
                      {echographie.montant.toLocaleString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td
                    colSpan={2}
                    className="border border-gray-300 px-4 py-3 text-sm font-medium"
                  >
                    Total Echographies
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-right">
                    {facturesEchographies.length}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-right">
                    {facturesEchographies
                      .reduce((sum, f) => sum + f.echoPrixTotal, 0)
                      .toLocaleString("fr-FR")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Resume global */}
      <div className="mt-8 pt-6 border-t">
        <div className="max-w-md ml-auto">
          <div className="bg-blue-50 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-blue-900 mb-4">
              RECAPITULATIF
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-700">Caissiere :</span>
                <span className="font-medium">
                  {session?.user?.name || "Non specifie"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Clinique(s) :</span>
                <span className="font-medium text-right max-w-xs">
                  {getAllCliniqueNameById(selectedCliniqueIds)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Periode :</span>
                <span className="font-medium">
                  {formatDate(dateDebut)}
                  {dateDebut !== dateFin && ` - ${formatDate(dateFin)}`}
                </span>
              </div>
              <div className="pt-3 border-t mt-3">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-gray-900">
                    RECETTE TOTALE :
                  </span>
                  <span className="text-lg font-bold text-blue-700">
                    {totalRecette.toLocaleString("fr-FR")} FCFA
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
