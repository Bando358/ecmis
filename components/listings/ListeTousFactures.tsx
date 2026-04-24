"use client";

import { useMemo, useState } from "react";
import {
  FactureItem,
  FactureTypeFilter,
} from "@/lib/actions/facturesListingActions";
import { exportReportToExcel } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

interface Props {
  items: FactureItem[];
}

const TYPE_OPTIONS: { value: FactureTypeFilter | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "produit", label: "Produits" },
  { value: "prestation", label: "Prestations" },
  { value: "examen", label: "Examens laboratoire" },
  { value: "echographie", label: "Échographies" },
];

const typeLabel: Record<FactureTypeFilter, string> = {
  produit: "Produit",
  prestation: "Prestation",
  examen: "Examen",
  echographie: "Échographie",
};

const typeColor: Record<FactureTypeFilter, string> = {
  produit: "bg-blue-50 text-blue-700 border-blue-200",
  prestation: "bg-purple-50 text-purple-700 border-purple-200",
  examen: "bg-amber-50 text-amber-700 border-amber-200",
  echographie: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function ListeTousFactures({ items }: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<FactureTypeFilter | "all">(
    "all",
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (typeFilter !== "all" && it.type !== typeFilter) return false;
      if (!q) return true;
      return (
        it.libelle.toLowerCase().includes(q) ||
        it.categorie.toLowerCase().includes(q) ||
        it.clientCode.toLowerCase().includes(q) ||
        it.clientNom.toLowerCase().includes(q) ||
        it.clientPrenom.toLowerCase().includes(q) ||
        it.prescripteur.toLowerCase().includes(q) ||
        it.clinique.toLowerCase().includes(q)
      );
    });
  }, [items, search, typeFilter]);

  const totalMontant = filtered.reduce((s, it) => s + it.montant, 0);
  const countByType = useMemo(() => {
    const acc: Record<string, { count: number; total: number }> = {
      produit: { count: 0, total: 0 },
      prestation: { count: 0, total: 0 },
      examen: { count: 0, total: 0 },
      echographie: { count: 0, total: 0 },
    };
    filtered.forEach((it) => {
      acc[it.type].count += 1;
      acc[it.type].total += it.montant;
    });
    return acc;
  }, [filtered]);

  const handleExportExcel = async () => {
    const data = filtered.map((it) => ({
      Date: new Date(it.date).toLocaleDateString("fr-FR"),
      Type: typeLabel[it.type],
      Catégorie: it.categorie,
      Libellé: it.libelle,
      Code: it.clientCode,
      Nom: it.clientNom,
      Prénom: it.clientPrenom,
      Âge: it.clientAge,
      Sexe: it.clientSexe,
      Clinique: it.clinique,
      Prescripteur: it.prescripteur,
      Quantité: it.quantite,
      "PU (CFA)": it.prixUnitaire,
      "Remise %": it.remise,
      "Réduction (CFA)": it.reduction,
      "Montant (CFA)": it.montant,
    }));
    await exportReportToExcel.medical(data, "liste_factures");
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold">Liste des éléments facturés</h2>
        <button
          onClick={handleExportExcel}
          disabled={filtered.length === 0}
          className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-900 disabled:opacity-50"
        >
          Télécharger Excel
        </button>
      </div>

      {/* Stats par type */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {(["produit", "prestation", "examen", "echographie"] as const).map(
          (t) => (
            <div
              key={t}
              className={`rounded-md border px-3 py-2 ${typeColor[t]}`}
            >
              <div className="text-xs font-medium">{typeLabel[t]}</div>
              <div className="text-sm font-bold">
                {countByType[t].count} ligne(s)
              </div>
              <div className="text-xs">
                {countByType[t].total.toLocaleString("fr-FR")} CFA
              </div>
            </div>
          ),
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center mb-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              className={`px-3 py-1.5 text-xs rounded-md border transition ${
                typeFilter === opt.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="text-sm text-muted-foreground ml-auto">
          {filtered.length} ligne(s) —{" "}
          <span className="font-semibold">
            {totalMontant.toLocaleString("fr-FR")} CFA
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          Aucune facture sur la période sélectionnée.
        </p>
      ) : (
        <div className="overflow-x-auto border rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left border-b">Date</th>
                <th className="px-3 py-2 text-left border-b">Type</th>
                <th className="px-3 py-2 text-left border-b">Libellé</th>
                <th className="px-3 py-2 text-left border-b">Catégorie</th>
                <th className="px-3 py-2 text-left border-b">Code</th>
                <th className="px-3 py-2 text-left border-b">Nom</th>
                <th className="px-3 py-2 text-left border-b">Prénom</th>
                <th className="px-3 py-2 text-center border-b">Âge</th>
                <th className="px-3 py-2 text-center border-b">Sexe</th>
                <th className="px-3 py-2 text-left border-b">Clinique</th>
                <th className="px-3 py-2 text-left border-b">Prescripteur</th>
                <th className="px-3 py-2 text-center border-b">Qté</th>
                <th className="px-3 py-2 text-right border-b">PU</th>
                <th className="px-3 py-2 text-right border-b">Montant</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => (
                <tr key={`${it.type}-${it.id}`} className="border-b hover:bg-slate-50">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(it.date).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant="outline"
                      className={`${typeColor[it.type]} text-xs`}
                    >
                      {typeLabel[it.type]}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">{it.libelle}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {it.categorie}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{it.clientCode}</td>
                  <td className="px-3 py-2">{it.clientNom}</td>
                  <td className="px-3 py-2">{it.clientPrenom}</td>
                  <td className="px-3 py-2 text-center">{it.clientAge}</td>
                  <td className="px-3 py-2 text-center">{it.clientSexe}</td>
                  <td className="px-3 py-2">{it.clinique}</td>
                  <td className="px-3 py-2">{it.prescripteur}</td>
                  <td className="px-3 py-2 text-center">{it.quantite}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {it.prixUnitaire.toLocaleString("fr-FR")}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">
                    {it.montant.toLocaleString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
