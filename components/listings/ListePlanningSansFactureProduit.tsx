"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PlanningSansFactureItem } from "@/lib/actions/planningSansFactureActions";
import { exportReportToExcel } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Search, Eye } from "lucide-react";

interface Props {
  items: PlanningSansFactureItem[];
}

type RaisonType = PlanningSansFactureItem["raison"];

const RAISON_OPTIONS: { value: RaisonType | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  {
    value: "aucune_facture_produit",
    label: "Aucune facture produit",
  },
  {
    value: "produit_non_correspondant",
    label: "Produit non correspondant",
  },
];

const RAISON_BADGE: Record<RaisonType, { label: string; color: string }> = {
  aucune_facture_produit: {
    label: "Aucune facture produit",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  produit_non_correspondant: {
    label: "Produit non correspondant",
    color: "bg-orange-50 text-orange-700 border-orange-200",
  },
};

export default function ListePlanningSansFactureProduit({ items }: Props) {
  const [search, setSearch] = useState("");
  const [raisonFilter, setRaisonFilter] = useState<RaisonType | "all">("all");
  const [methodeFilter, setMethodeFilter] = useState<string>("all");

  const methodes = useMemo(
    () => Array.from(new Set(items.map((it) => it.methodeAttendue))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (raisonFilter !== "all" && it.raison !== raisonFilter) return false;
      if (methodeFilter !== "all" && it.methodeAttendue !== methodeFilter)
        return false;
      if (!q) return true;
      return (
        it.clientCode.toLowerCase().includes(q) ||
        it.clientNom.toLowerCase().includes(q) ||
        it.clientPrenom.toLowerCase().includes(q) ||
        it.prescripteur.toLowerCase().includes(q) ||
        it.clinique.toLowerCase().includes(q) ||
        it.methodeAttendue.toLowerCase().includes(q) ||
        it.produitsFactures.some((p) => p.toLowerCase().includes(q))
      );
    });
  }, [items, search, raisonFilter, methodeFilter]);

  const counts = useMemo(() => {
    const acc: Record<RaisonType, number> = {
      aucune_facture_produit: 0,
      produit_non_correspondant: 0,
    };
    items.forEach((it) => {
      acc[it.raison] += 1;
    });
    return acc;
  }, [items]);

  const handleExportExcel = async () => {
    const data = filtered.map((it) => ({
      Anomalie: it.libelleRaison,
      "Méthode déclarée": it.methodeAttendue,
      Date: new Date(it.dateVisite).toLocaleDateString("fr-FR"),
      "Motif visite": it.motifVisite,
      Code: it.clientCode,
      Nom: it.clientNom,
      Prénom: it.clientPrenom,
      Âge: it.clientAge,
      Sexe: it.clientSexe,
      Clinique: it.clinique,
      Prescripteur: it.prescripteur,
      "Produits facturés": it.produitsFactures.join(", "),
    }));
    await exportReportToExcel.medical(data, "planning_sans_facture_produit");
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Planning PF sans facture produit correspondante
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
        Liste des consultations de Planification Familiale ayant déclaré une
        méthode contraceptive nécessitant un produit (pilule, injectable,
        préservatif, urgence, spermicide), mais pour lesquelles soit
        <strong> aucune facture produit n&apos;a été enregistrée</strong>, soit
        le produit facturé <strong>ne correspond pas à la méthode déclarée</strong>.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {(Object.keys(RAISON_BADGE) as RaisonType[]).map((r) => (
          <div
            key={r}
            className={`rounded-md border px-3 py-2 ${RAISON_BADGE[r].color}`}
          >
            <div className="text-xs font-medium">{RAISON_BADGE[r].label}</div>
            <div className="text-lg font-bold">{counts[r]} ligne(s)</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher (code, nom, méthode, produit...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {RAISON_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRaisonFilter(opt.value)}
              className={`px-3 py-1.5 text-xs rounded-md border transition ${
                raisonFilter === opt.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {methodes.length > 1 && (
          <select
            value={methodeFilter}
            onChange={(e) => setMethodeFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white"
          >
            <option value="all">Toutes méthodes</option>
            {methodes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        )}
        <div className="text-sm text-muted-foreground sm:ml-auto">
          {filtered.length} ligne(s)
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          Aucune anomalie de facturation produit pour la période sélectionnée.
        </p>
      ) : (
        <div className="overflow-x-auto border rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-3 py-2 text-left border-b">Anomalie</th>
                <th className="px-3 py-2 text-left border-b">Méthode déclarée</th>
                <th className="px-3 py-2 text-left border-b">Date</th>
                <th className="px-3 py-2 text-left border-b">Code</th>
                <th className="px-3 py-2 text-left border-b">Nom</th>
                <th className="px-3 py-2 text-left border-b">Prénom</th>
                <th className="px-3 py-2 text-center border-b">Âge</th>
                <th className="px-3 py-2 text-center border-b">Sexe</th>
                <th className="px-3 py-2 text-left border-b">Clinique</th>
                <th className="px-3 py-2 text-left border-b">Prescripteur</th>
                <th className="px-3 py-2 text-left border-b">Produits facturés</th>
                <th className="px-3 py-2 text-center border-b">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => (
                <tr key={it.key} className="border-b hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <Badge
                      variant="outline"
                      className={`${RAISON_BADGE[it.raison].color} text-xs`}
                    >
                      {RAISON_BADGE[it.raison].label}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {it.methodeAttendue}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(it.dateVisite).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-3 py-2">{it.clientCode}</td>
                  <td className="px-3 py-2">{it.clientNom}</td>
                  <td className="px-3 py-2">{it.clientPrenom}</td>
                  <td className="px-3 py-2 text-center">{it.clientAge}</td>
                  <td className="px-3 py-2 text-center">{it.clientSexe}</td>
                  <td className="px-3 py-2">{it.clinique}</td>
                  <td className="px-3 py-2">{it.prescripteur}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">
                    {it.produitsFactures.length === 0 ? (
                      <span className="italic text-amber-700">
                        (aucune facture)
                      </span>
                    ) : (
                      it.produitsFactures.join(", ")
                    )}
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
