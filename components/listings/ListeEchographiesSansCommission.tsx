"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EchographieSansCommissionItem } from "@/lib/actions/echographiesSansCommissionActions";
import { exportReportToExcel } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Search, Eye } from "lucide-react";

interface Props {
  items: EchographieSansCommissionItem[];
}

export default function ListeEchographiesSansCommission({ items }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.libelleEchographie.toLowerCase().includes(q) ||
        it.clientCode.toLowerCase().includes(q) ||
        it.clientNom.toLowerCase().includes(q) ||
        it.clientPrenom.toLowerCase().includes(q) ||
        it.clinique.toLowerCase().includes(q) ||
        it.prescripteurFacture.toLowerCase().includes(q),
    );
  }, [items, search]);

  const totalMontant = filtered.reduce((s, it) => s + it.montantNet, 0);
  const totalPartEcho = filtered.reduce((s, it) => s + it.partEchographe, 0);

  const handleExportExcel = async () => {
    const data = filtered.map((it) => ({
      Date: new Date(it.dateVisite).toLocaleDateString("fr-FR"),
      Échographie: it.libelleEchographie,
      Code: it.clientCode,
      Nom: it.clientNom,
      Prénom: it.clientPrenom,
      Âge: it.clientAge,
      Sexe: it.clientSexe,
      Clinique: it.clinique,
      "Saisi par": it.prescripteurFacture,
      "Prix (CFA)": it.prixEchographie,
      "Remise %": it.remiseEchographie,
      "Part Échographe (CFA)": it.partEchographe,
      "Montant net (CFA)": it.montantNet,
    }));
    await exportReportToExcel.medical(data, "echographies_sans_commission");
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          Échographies sans commission attribuée
        </h2>
        <button
          onClick={handleExportExcel}
          disabled={filtered.length === 0}
          className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-900 disabled:opacity-50"
        >
          Télécharger Excel
        </button>
      </div>

      <div className="rounded-md border border-red-200 bg-red-50/50 p-3 text-sm text-red-900 mb-4">
        Ces échographies ont été facturées mais aucune commission n&apos;a été
        attribuée à un prescripteur. Pensez à régulariser via la page Rapport
        Financier.
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher (échographie, code, nom...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="text-sm text-muted-foreground ml-auto">
          {filtered.length} échographie(s) — net{" "}
          <span className="font-semibold">
            {totalMontant.toLocaleString("fr-FR")} CFA
          </span>{" "}
          — part écho{" "}
          <span className="font-semibold">
            {totalPartEcho.toLocaleString("fr-FR")} CFA
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          Aucune échographie sans commission sur la période.
        </p>
      ) : (
        <div className="overflow-x-auto border rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-3 py-2 text-left border-b">Date</th>
                <th className="px-3 py-2 text-left border-b">Échographie</th>
                <th className="px-3 py-2 text-left border-b">Code</th>
                <th className="px-3 py-2 text-left border-b">Nom</th>
                <th className="px-3 py-2 text-left border-b">Prénom</th>
                <th className="px-3 py-2 text-center border-b">Âge</th>
                <th className="px-3 py-2 text-center border-b">Sexe</th>
                <th className="px-3 py-2 text-left border-b">Clinique</th>
                <th className="px-3 py-2 text-left border-b">Saisi par</th>
                <th className="px-3 py-2 text-right border-b">Prix</th>
                <th className="px-3 py-2 text-center border-b">Remise %</th>
                <th className="px-3 py-2 text-right border-b">Part écho</th>
                <th className="px-3 py-2 text-right border-b">Net</th>
                <th className="px-3 py-2 text-center border-b">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => (
                <tr
                  key={it.idFactureEchographie}
                  className="border-b hover:bg-slate-50"
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(it.dateVisite).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary" className="text-xs">
                      {it.libelleEchographie}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">{it.clientCode}</td>
                  <td className="px-3 py-2">{it.clientNom}</td>
                  <td className="px-3 py-2">{it.clientPrenom}</td>
                  <td className="px-3 py-2 text-center">{it.clientAge}</td>
                  <td className="px-3 py-2 text-center">{it.clientSexe}</td>
                  <td className="px-3 py-2">{it.clinique}</td>
                  <td className="px-3 py-2">{it.prescripteurFacture}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {it.prixEchographie.toLocaleString("fr-FR")}
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums">
                    {it.remiseEchographie || ""}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {it.partEchographe
                      ? it.partEchographe.toLocaleString("fr-FR")
                      : ""}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">
                    {it.montantNet.toLocaleString("fr-FR")}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Link
                      href={`/fiches/${it.idClient}`}
                      prefetch={false}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      <Eye className="h-3 w-3" />
                      Fiche
                    </Link>
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
