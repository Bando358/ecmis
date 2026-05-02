"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AnomalieType,
  ClientFactureSansPrestationItem,
} from "@/lib/actions/facturesSansPrestationActions";
import { exportReportToExcel } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Search, Eye } from "lucide-react";

interface Props {
  items: ClientFactureSansPrestationItem[];
}

const TYPE_OPTIONS: { value: AnomalieType | "all"; label: string }[] = [
  { value: "all", label: "Toutes les anomalies" },
  { value: "aucune_prestation", label: "Aucune prestation enregistrée" },
  { value: "cpn_sans_obstetrique", label: "CPN sans fiche obstétrique" },
  {
    value: "test_grossesse_sans_fiche",
    label: "Test de grossesse sans fiche",
  },
];

const TYPE_BADGE: Record<AnomalieType, { label: string; color: string }> = {
  aucune_prestation: {
    label: "Aucune prestation",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  cpn_sans_obstetrique: {
    label: "CPN sans obstétrique",
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  test_grossesse_sans_fiche: {
    label: "Test grossesse sans fiche",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
};

export default function ListeFacturesSansPrestation({ items }: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AnomalieType | "all">("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (typeFilter !== "all" && it.typeAnomalie !== typeFilter) return false;
      if (!q) return true;
      return (
        it.clientCode.toLowerCase().includes(q) ||
        it.clientNom.toLowerCase().includes(q) ||
        it.clientPrenom.toLowerCase().includes(q) ||
        it.prescripteur.toLowerCase().includes(q) ||
        it.clinique.toLowerCase().includes(q) ||
        it.motifVisite.toLowerCase().includes(q) ||
        it.libelleAnomalie.toLowerCase().includes(q)
      );
    });
  }, [items, search, typeFilter]);

  const totalMontant = filtered.reduce((s, it) => s + it.totalFacture, 0);

  const counts = useMemo(() => {
    const acc: Record<AnomalieType, number> = {
      aucune_prestation: 0,
      cpn_sans_obstetrique: 0,
      test_grossesse_sans_fiche: 0,
    };
    items.forEach((it) => {
      acc[it.typeAnomalie] += 1;
    });
    return acc;
  }, [items]);

  const handleExportExcel = async () => {
    const data = filtered.map((it) => ({
      Anomalie: it.libelleAnomalie,
      Date: new Date(it.dateVisite).toLocaleDateString("fr-FR"),
      "Motif visite": it.motifVisite,
      Code: it.clientCode,
      Nom: it.clientNom,
      Prénom: it.clientPrenom,
      Âge: it.clientAge,
      Sexe: it.clientSexe,
      Clinique: it.clinique,
      Prescripteur: it.prescripteur,
      Produits: it.nbProduits,
      Prestations: it.nbPrestations,
      Examens: it.nbExamens,
      Échographies: it.nbEchographies,
      "Total facturé (CFA)": it.totalFacture,
    }));
    await exportReportToExcel.medical(data, "anomalies_facturation");
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Anomalies de facturation
        </h2>
        <button
          onClick={handleExportExcel}
          disabled={filtered.length === 0}
          className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-900 disabled:opacity-50"
        >
          Télécharger Excel
        </button>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3 text-sm text-amber-900 mb-4">
        Trois types d&apos;anomalies sont détectés : (1) visite facturée sans
        aucune prestation enregistrée ; (2) facture CPN sans fiche obstétrique
        pour la même visite ; (3) vente d&apos;un test de grossesse sans fiche
        TestGrossesse pour la même visite. À vérifier auprès du prestataire.
      </div>

      {/* Compteurs par type */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        {(Object.keys(TYPE_BADGE) as AnomalieType[]).map((t) => (
          <div
            key={t}
            className={`rounded-md border px-3 py-2 ${TYPE_BADGE[t].color}`}
          >
            <div className="text-xs font-medium">{TYPE_BADGE[t].label}</div>
            <div className="text-lg font-bold">{counts[t]} ligne(s)</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher (code, nom, motif, anomalie...)"
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
          Aucune anomalie de facturation sur la période.
        </p>
      ) : (
        <div className="overflow-x-auto border rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-3 py-2 text-left border-b">Anomalie</th>
                <th className="px-3 py-2 text-left border-b">Date</th>
                <th className="px-3 py-2 text-left border-b">Motif</th>
                <th className="px-3 py-2 text-left border-b">Code</th>
                <th className="px-3 py-2 text-left border-b">Nom</th>
                <th className="px-3 py-2 text-left border-b">Prénom</th>
                <th className="px-3 py-2 text-center border-b">Âge</th>
                <th className="px-3 py-2 text-center border-b">Sexe</th>
                <th className="px-3 py-2 text-left border-b">Clinique</th>
                <th className="px-3 py-2 text-left border-b">Prescripteur</th>
                <th className="px-3 py-2 text-center border-b">Prod.</th>
                <th className="px-3 py-2 text-center border-b">Prest.</th>
                <th className="px-3 py-2 text-center border-b">Exam.</th>
                <th className="px-3 py-2 text-center border-b">Écho.</th>
                <th className="px-3 py-2 text-right border-b">Total</th>
                <th className="px-3 py-2 text-center border-b">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => (
                <tr key={it.key} className="border-b hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <Badge
                      variant="outline"
                      className={`${TYPE_BADGE[it.typeAnomalie].color} text-xs`}
                    >
                      {TYPE_BADGE[it.typeAnomalie].label}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(it.dateVisite).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary" className="text-xs">
                      {it.motifVisite}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">{it.clientCode}</td>
                  <td className="px-3 py-2">{it.clientNom}</td>
                  <td className="px-3 py-2">{it.clientPrenom}</td>
                  <td className="px-3 py-2 text-center">{it.clientAge}</td>
                  <td className="px-3 py-2 text-center">{it.clientSexe}</td>
                  <td className="px-3 py-2">{it.clinique}</td>
                  <td className="px-3 py-2">{it.prescripteur}</td>
                  <td className="px-3 py-2 text-center">
                    {it.nbProduits || ""}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {it.nbPrestations || ""}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {it.nbExamens || ""}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {it.nbEchographies || ""}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">
                    {it.totalFacture.toLocaleString("fr-FR")}
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
