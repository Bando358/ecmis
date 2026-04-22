"use client";

import { useMemo, useState } from "react";
import { FactureProduitPfItem } from "@/lib/actions/factureProduitActions";
import { exportReportToExcel } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface Props {
  items: FactureProduitPfItem[];
}

export default function ListeFactureProduitPf({ items }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.nomProduit.toLowerCase().includes(q) ||
        it.clientCode.toLowerCase().includes(q) ||
        it.clientNom.toLowerCase().includes(q) ||
        it.clientPrenom.toLowerCase().includes(q) ||
        it.prescripteur.toLowerCase().includes(q) ||
        it.clinique.toLowerCase().includes(q),
    );
  }, [items, search]);

  // Groupement par produit
  const grouped = useMemo(() => {
    const map = new Map<string, FactureProduitPfItem[]>();
    filtered.forEach((it) => {
      const key = it.nomProduit || "Non renseigné";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const handleExportExcel = async () => {
    const data = filtered.map((it) => ({
      Produit: it.nomProduit,
      "Date facture": new Date(it.dateFacture).toLocaleDateString("fr-FR"),
      "Date visite": it.dateVisite
        ? new Date(it.dateVisite).toLocaleDateString("fr-FR")
        : "",
      Code: it.clientCode,
      Nom: it.clientNom,
      Prénom: it.clientPrenom,
      Âge: it.clientAge,
      Sexe: it.clientSexe,
      Clinique: it.clinique,
      Prescripteur: it.prescripteur,
      Quantité: it.quantite,
      "Montant (CFA)": it.montantProduit,
    }));
    await exportReportToExcel.medical(data, "liste_clients_par_produit_pf");
  };

  const totalQuantite = filtered.reduce((acc, it) => acc + it.quantite, 0);
  const totalMontant = filtered.reduce((acc, it) => acc + it.montantProduit, 0);

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold">
          Clients par produit PF facturé
        </h2>
        <button
          onClick={handleExportExcel}
          disabled={filtered.length === 0}
          className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-900 disabled:opacity-50"
        >
          Télécharger Excel
        </button>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <Input
          placeholder="Rechercher (produit, client, code, prescripteur...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-sm"
        />
        <div className="text-sm text-muted-foreground">
          {filtered.length} ligne(s) — {totalQuantite} unité(s) —{" "}
          {totalMontant.toLocaleString("fr-FR")} CFA
        </div>
      </div>

      {grouped.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          Aucune facturation de produit PF sur la période sélectionnée.
        </p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([produit, list]) => {
            const qte = list.reduce((s, it) => s + it.quantite, 0);
            const mnt = list.reduce((s, it) => s + it.montantProduit, 0);
            return (
              <div
                key={produit}
                className="border rounded-lg overflow-hidden bg-white"
              >
                <div className="bg-blue-50 px-4 py-2 border-b flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-blue-900">{produit}</span>
                  <span className="text-xs text-blue-700">
                    {list.length} client(s) — {qte} unité(s) —{" "}
                    {mnt.toLocaleString("fr-FR")} CFA
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-3 py-2 text-left border-b">Date</th>
                        <th className="px-3 py-2 text-left border-b">Code</th>
                        <th className="px-3 py-2 text-left border-b">Nom</th>
                        <th className="px-3 py-2 text-left border-b">Prénom</th>
                        <th className="px-3 py-2 text-center border-b">Âge</th>
                        <th className="px-3 py-2 text-center border-b">Sexe</th>
                        <th className="px-3 py-2 text-left border-b">Clinique</th>
                        <th className="px-3 py-2 text-left border-b">
                          Prescripteur
                        </th>
                        <th className="px-3 py-2 text-center border-b">Qté</th>
                        <th className="px-3 py-2 text-right border-b">
                          Montant
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((it) => (
                        <tr key={it.id} className="border-b hover:bg-slate-50">
                          <td className="px-3 py-2">
                            {new Date(it.dateFacture).toLocaleDateString(
                              "fr-FR",
                            )}
                          </td>
                          <td className="px-3 py-2">{it.clientCode}</td>
                          <td className="px-3 py-2">{it.clientNom}</td>
                          <td className="px-3 py-2">{it.clientPrenom}</td>
                          <td className="px-3 py-2 text-center">
                            {it.clientAge}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {it.clientSexe}
                          </td>
                          <td className="px-3 py-2">{it.clinique}</td>
                          <td className="px-3 py-2">{it.prescripteur}</td>
                          <td className="px-3 py-2 text-center">
                            {it.quantite}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {it.montantProduit.toLocaleString("fr-FR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
