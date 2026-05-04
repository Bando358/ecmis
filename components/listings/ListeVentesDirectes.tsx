"use client";

import { useMemo, useState } from "react";
import { VenteDirecteListingItem } from "@/lib/actions/ventesDirectesListingActions";
import { exportReportToExcel } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Search } from "lucide-react";

interface Props {
  items: VenteDirecteListingItem[];
}

const TYPE_BADGE: Record<string, string> = {
  CONTRACEPTIF: "bg-pink-50 text-pink-700 border-pink-200",
  MEDICAMENTS: "bg-blue-50 text-blue-700 border-blue-200",
  CONSOMMABLES: "bg-amber-50 text-amber-700 border-amber-200",
  "": "bg-gray-50 text-gray-700 border-gray-200",
};

const fmt = (n: number) => n.toLocaleString("fr-FR");

export default function ListeVentesDirectes({ items }: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const types = useMemo(
    () => Array.from(new Set(items.map((it) => it.typeProduit).filter(Boolean))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (typeFilter !== "all" && it.typeProduit !== typeFilter) return false;
      if (!q) return true;
      return (
        it.nomProduit.toLowerCase().includes(q) ||
        it.clinique.toLowerCase().includes(q) ||
        it.vendeur.toLowerCase().includes(q) ||
        it.batchId.toLowerCase().includes(q) ||
        it.methodePaiement.toLowerCase().includes(q)
      );
    });
  }, [items, search, typeFilter]);

  // Agrégats par produit (utiles pour vérification rapide)
  const aggregates = useMemo(() => {
    const map = new Map<
      string,
      { nomProduit: string; typeProduit: string; quantite: number; montant: number }
    >();
    for (const it of filtered) {
      const key = it.nomProduit;
      if (!map.has(key)) {
        map.set(key, {
          nomProduit: it.nomProduit,
          typeProduit: it.typeProduit,
          quantite: 0,
          montant: 0,
        });
      }
      const a = map.get(key)!;
      a.quantite += it.quantite;
      a.montant += it.montantProduit;
    }
    return Array.from(map.values()).sort((a, b) => b.montant - a.montant);
  }, [filtered]);

  const totalQte = filtered.reduce((s, it) => s + it.quantite, 0);
  const totalMontant = filtered.reduce((s, it) => s + it.montantProduit, 0);

  const handleExportExcel = async () => {
    const data = filtered.map((it) => ({
      Date: new Date(it.dateVente).toLocaleDateString("fr-FR"),
      "Type produit": it.typeProduit,
      Produit: it.nomProduit,
      Quantité: it.quantite,
      "Prix unitaire": it.prixUnitaire,
      "Montant total": it.montantProduit,
      Paiement: it.methodePaiement,
      Vendeur: it.vendeur,
      Clinique: it.clinique,
      "ID transaction": it.batchId,
    }));
    await exportReportToExcel.medical(data, "ventes_directes");
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-emerald-600" />
          Produits vendus en vente directe
        </h2>
        <button
          onClick={handleExportExcel}
          disabled={filtered.length === 0}
          className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-900 disabled:opacity-50"
        >
          Télécharger Excel
        </button>
      </div>

      <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-3 text-sm text-emerald-900 mb-4">
        Liste détaillée des ventes directes (ventes au comptoir, sans
        consultation associée). Une ligne = une ligne de produit dans une
        transaction. Plusieurs lignes peuvent partager le même <em>ID transaction</em>
        si le client a acheté plusieurs produits ensemble.
      </div>

      {/* Compteurs / agrégats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
          <div className="text-xs text-gray-500">Lignes affichées</div>
          <div className="text-lg font-bold">{filtered.length}</div>
        </div>
        <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
          <div className="text-xs text-gray-500">Quantité totale</div>
          <div className="text-lg font-bold">{fmt(totalQte)}</div>
        </div>
        <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
          <div className="text-xs text-gray-500">Montant total</div>
          <div className="text-lg font-bold">{fmt(totalMontant)} CFA</div>
        </div>
      </div>

      {/* Filtres */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher (produit, clinique, vendeur...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setTypeFilter("all")}
            className={`px-3 py-1.5 text-xs rounded-md border transition ${
              typeFilter === "all"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            Tous types
          </button>
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs rounded-md border transition ${
                typeFilter === t
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Récap par produit */}
      {aggregates.length > 0 && (
        <details className="mb-4 border border-gray-200 rounded-md bg-white">
          <summary className="px-3 py-2 cursor-pointer text-sm font-semibold text-gray-700 hover:bg-slate-50">
            Récapitulatif par produit ({aggregates.length} produit
            {aggregates.length > 1 ? "s" : ""})
          </summary>
          <div className="overflow-x-auto border-t">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left border-b">Produit</th>
                  <th className="px-3 py-2 text-left border-b">Type</th>
                  <th className="px-3 py-2 text-right border-b">Quantité</th>
                  <th className="px-3 py-2 text-right border-b">Montant</th>
                </tr>
              </thead>
              <tbody>
                {aggregates.map((a) => (
                  <tr key={a.nomProduit} className="border-b hover:bg-slate-50">
                    <td className="px-3 py-1.5">{a.nomProduit}</td>
                    <td className="px-3 py-1.5">
                      {a.typeProduit && (
                        <Badge
                          variant="outline"
                          className={`${TYPE_BADGE[a.typeProduit] || TYPE_BADGE[""]} text-xs`}
                        >
                          {a.typeProduit}
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {fmt(a.quantite)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-semibold">
                      {fmt(a.montant)} CFA
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* Détail ligne par ligne */}
      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          Aucune vente directe sur la période sélectionnée.
        </p>
      ) : (
        <div className="overflow-x-auto border rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-3 py-2 text-left border-b">Date</th>
                <th className="px-3 py-2 text-left border-b">Type</th>
                <th className="px-3 py-2 text-left border-b">Produit</th>
                <th className="px-3 py-2 text-right border-b">Qté</th>
                <th className="px-3 py-2 text-right border-b">PU</th>
                <th className="px-3 py-2 text-right border-b">Montant</th>
                <th className="px-3 py-2 text-left border-b">Paiement</th>
                <th className="px-3 py-2 text-left border-b">Vendeur</th>
                <th className="px-3 py-2 text-left border-b">Clinique</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => (
                <tr key={it.id} className="border-b hover:bg-slate-50">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(it.dateVente).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-3 py-2">
                    {it.typeProduit && (
                      <Badge
                        variant="outline"
                        className={`${TYPE_BADGE[it.typeProduit] || TYPE_BADGE[""]} text-xs`}
                      >
                        {it.typeProduit}
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">{it.nomProduit}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {fmt(it.quantite)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {fmt(it.prixUnitaire)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">
                    {fmt(it.montantProduit)}
                  </td>
                  <td className="px-3 py-2">{it.methodePaiement}</td>
                  <td className="px-3 py-2">{it.vendeur}</td>
                  <td className="px-3 py-2">{it.clinique}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
