"use client";

import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ClientData } from "../rapportPfActions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import { Separator } from "../ui/separator";
import {
  StockMethodeRow,
  getStockContraceptifs,
} from "@/lib/actions/sigPlanningActions";
import {
  ClientStatusInfo,
  fetchClientsStatusProtege,
} from "@/components/rapportPfActions";
import { FactureProduit } from "@prisma/client";
import { getAllFactureProduitByIdVisiteByData } from "@/lib/actions/factureProduitActions";

// ----------------------------------------------------------------------------
// Tranches d'âge spécifiques au tableau 30a
// ----------------------------------------------------------------------------
const PF_AGE_RANGES = [
  { min: 0, max: 14, label: "< 15 ans" },
  { min: 15, max: 19, label: "15-19 ans" },
  { min: 20, max: 24, label: "20-24 ans" },
  { min: 25, max: 120, label: "25 ans et +" },
] as const;

// ----------------------------------------------------------------------------
// Méthodes contraceptives du tableau 30a (matching produit + courtDuree)
// ----------------------------------------------------------------------------
type MethodeKey =
  | "piluleCoc"
  | "piluleCop"
  | "injectableIm3"
  | "injectableIm2"
  | "injectableSc3"
  | "autoInjection3"
  | "diu"
  | "diuPp"
  | "implant5"
  | "implant3"
  | "condomMasculin"
  | "condomFeminin"
  | "spermicide"
  | "urgence";

const METHODES_30A: { key: MethodeKey; label: string }[] = [
  { key: "piluleCoc", label: "Pilule (COC)" },
  { key: "piluleCop", label: "Pilule (COP)" },
  { key: "injectableIm3", label: "Injectable IM 3 mois (Depo-Provera)" },
  { key: "injectableIm2", label: "Injectable IM 2 mois (Noristerat)" },
  { key: "injectableSc3", label: "Injectable sous Cutané 3 mois (Sayana)" },
  { key: "autoInjection3", label: "Auto-injection 3 mois" },
  { key: "diu", label: "DIU (Copper TCu)" },
  { key: "diuPp", label: "DIU-PP (Post-partum)" },
  { key: "implant5", label: "Implant 5 ans (Jadelle)" },
  { key: "implant3", label: "Implant 3 ans (Implanon)" },
  { key: "condomMasculin", label: "Condom masculin" },
  { key: "condomFeminin", label: "Condom féminin" },
  { key: "spermicide", label: "Spermicide" },
  { key: "urgence", label: "Contraception d'urgence" },
];

// Détermine la méthode utilisée par un client (à partir des produits
// facturés sur la visite, complété par les champs du Planning).
//
// Logique : on s'aligne sur le rapport "Planification Familiale" existant
// qui compte sur la base de FactureProduit. La présence d'un produit
// contraceptif sur la visite est le signal le plus fiable (contre les cas
// de renouvellement où la case "consultation" du Planning n'est pas
// cochée mais où le produit est bien dispensé).
//
// Ordre de priorité :
//   1. Détection par produit facturé (ex: "Sayana Press" → injectableSc3)
//   2. Fallback sur les champs Planning (sterilet/jadelle/implanon
//      en insertion/contrôle, courtDuree)
const detectMethode = (
  c: ClientData,
  produits: string[],
): MethodeKey | null => {
  const has = (kw: string) =>
    produits.some((p) => p.toLowerCase().includes(kw));
  const isPostPartum =
    c.typeContraception === "post_partum" ||
    c.typeContraception === "post_partum_immediat";

  // 1) Détection par FACTURE PRODUIT — signal le plus fiable.
  if (has("microlut")) return "piluleCop";
  if (has("microgynon")) return "piluleCoc";
  if (has("sayana")) return "injectableSc3";
  if (has("depo")) return "injectableIm3";
  if (has("noristerat")) return "injectableIm2";
  if (has("jadelle")) return "implant5";
  if (has("implanon")) return "implant3";
  if (has("norlevo") || has("postinor")) return "urgence";
  if (has("spermicide")) return "spermicide";
  if (has("femidom") || has("feminin")) return "condomFeminin";
  if (has("condom") || has("preservatif")) return "condomMasculin";

  // 2) Fallback sur les fields Planning (insertions/contrôles d'implants
  //    et stérilets ne génèrent pas systématiquement une FactureProduit).
  if (c.implanon === "insertion" || c.implanon === "controle")
    return "implant3";
  if (c.jadelle === "insertion" || c.jadelle === "controle")
    return "implant5";
  if (c.sterilet === "insertion" || c.sterilet === "controle")
    return isPostPartum ? "diuPp" : "diu";

  // 3) Fallback sur courtDuree (cas où ni produit identifié ni
  //    insertion implant/DIU — usage générique de la méthode).
  if (c.courtDuree === "pilule") return "piluleCoc"; // Microgynon par défaut
  if (c.courtDuree === "noristerat") return "injectableIm2";
  if (c.courtDuree === "injectable") return "injectableIm3"; // Depo par défaut
  if (c.courtDuree === "preservatif") return "condomMasculin";
  if (c.courtDuree === "spermicide") return "spermicide";
  if (c.courtDuree === "urgence") return "urgence";
  return null;
};

// ----------------------------------------------------------------------------
// Indicateurs Tableau 30b
// ----------------------------------------------------------------------------
const INDICATEURS_30B: {
  key: string;
  label: string;
  compute: (c: ClientData) => boolean;
}[] = [
  {
    key: "counsellingPostPartum",
    label:
      "Femmes ayant reçu un counseling en PF dans le post-partum",
    compute: (c) =>
      c.consultationPf === true &&
      c.counsellingPf === true &&
      (c.typeContraception === "post_partum" ||
        c.typeContraception === "post_partum_immediat"),
  },
  {
    key: "produitPostPartumImmediat",
    label:
      "Femmes ayant reçu un produit contraceptif dans le post-partum immédiat",
    compute: (c) =>
      c.methodePrise === true &&
      c.typeContraception === "post_partum_immediat",
  },
  {
    key: "produitPostAbortum",
    label: "Femmes ayant reçu un produit contraceptif dans le post-abortum",
    compute: (c) =>
      c.methodePrise === true && c.typeContraception === "post_abortum",
  },
  {
    key: "consultationsPf",
    label: "Total des consultations en PF",
    compute: (c) => c.consultationPf === true,
  },
  {
    key: "changementMethode",
    label: "Femmes ayant changé de méthode",
    compute: (c) =>
      c.consultationPf === true && c.motifVisitePf === "changement",
  },
  {
    key: "formationAutoInjection",
    label: "Femmes formées à l'auto-injection",
    // Pas de champ direct — on flag les sayana avec motif "premiere"
    // (formation initiale). À adapter quand un champ dédié sera ajouté.
    compute: (c) =>
      c.consultationPf === true &&
      c.courtDuree === "injectable" &&
      c.motifVisitePf === "premiere",
  },
  {
    key: "pfAvecIst",
    label: "Femmes reçues en PF avec une IST",
    compute: (c) => c.consultationPf === true && !!c.istType,
  },
  {
    key: "pfVihPos",
    label:
      "Femmes séropositives au VIH sous contraception moderne (toutes méthodes)",
    compute: (c) =>
      c.methodePrise === true &&
      (c.depistageVihResultat === "positif" || !!c.pecVihTypeclient),
  },
  {
    key: "nourrisson06CounselNutri",
    label:
      "Femmes (nourrisson 0-6 mois) reçues en PF avec conseils nutritionnels et vaccins à jour",
    // Pas de champ direct à ce jour — placeholder à 0.
    compute: () => false,
  },
  {
    key: "nourrisson6CounselAlim",
    label:
      "Femmes (nourrisson 6 mois) reçues en PF avec conseils alimentation complémentaire et vitamine A",
    compute: () => false,
  },
];

// ----------------------------------------------------------------------------
// Composant
// ----------------------------------------------------------------------------
type AgeRange = { min: number; max: number };
interface Props {
  clientData: ClientData[];
  ageRanges: AgeRange[]; // utilisé en cas de besoin (non utilisé ici mais conservé pour homogénéité avec les autres SIG)
  dateDebut: string | Date;
  dateFin: string | Date;
  clinic: string;
  clinicIds: string[];
}

export default function TableRapportSigPlanning({
  clientData,
  dateDebut,
  dateFin,
  clinic,
  clinicIds,
}: Props) {
  const [factureProduits, setFactureProduits] = useState<FactureProduit[]>([]);
  const [statusInfo, setStatusInfo] = useState<ClientStatusInfo[]>([]);
  const [stockRows, setStockRows] = useState<StockMethodeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [spinnerPdf, setSpinnerPdf] = useState(false);

  // Pour éviter de relancer le fetch à chaque re-render (focus fenêtre,
  // tab actif, etc.), on dérive des clés stables depuis le CONTENU des
  // tableaux clientData et clinicIds, plutôt que de dépendre de leurs
  // références (qui changent à chaque re-render du parent).
  const clientDataKey = useMemo(
    () => clientData.map((c) => c.idVisite).join(","),
    [clientData],
  );
  const clinicIdsKey = useMemo(() => clinicIds.join(","), [clinicIds]);

  // Charger en parallèle : factures produit (pour le matching méthode),
  // statuts client (protege/PDV/abandon) et stock contraceptifs.
  useEffect(() => {
    if (!clientData || clientData.length === 0) return;
    setLoading(true);
    const dDebut = new Date(dateDebut);
    const dFin = new Date(dateFin);
    dDebut.setHours(0, 0, 0, 0);
    dFin.setHours(23, 59, 59, 999);
    Promise.all([
      getAllFactureProduitByIdVisiteByData(clientData),
      fetchClientsStatusProtege(clinicIds, dDebut, dFin),
      getStockContraceptifs(clinicIds, dDebut, dFin),
    ])
      .then(([fp, status, stock]) => {
        setFactureProduits(fp);
        setStatusInfo(status as ClientStatusInfo[]);
        setStockRows(stock);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientDataKey, clinicIdsKey, dateDebut, dateFin]);

  // Map idVisite → liste des noms de produits facturés
  const produitsByVisite = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const f of factureProduits) {
      if (!map.has(f.idVisite)) map.set(f.idVisite, []);
      map.get(f.idVisite)!.push(f.nomProduit);
    }
    return map;
  }, [factureProduits]);

  // Map code client → liste de TOUS les produits achetés sur la période
  // (toutes visites confondues). Sert à associer un statut (protégée /
  // PDV / abandon) à la méthode contraceptive détectée via les produits.
  // Aligné sur la logique du rapport PF existant.
  const produitsByCode = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of clientData) {
      const arr = map.get(c.code) || [];
      const fact = produitsByVisite.get(c.idVisite) || [];
      arr.push(...fact.map((p) => p.toLowerCase()));
      map.set(c.code, arr);
    }
    return map;
  }, [clientData, produitsByVisite]);

  // Détecter la méthode pour chaque visite et indexer.
  const visiteMethode = useMemo(() => {
    const map = new Map<string, MethodeKey | null>();
    for (const c of clientData) {
      const produits = produitsByVisite.get(c.idVisite) || [];
      map.set(c.idVisite, detectMethode(c, produits));
    }
    return map;
  }, [clientData, produitsByVisite]);

  // Déterminer la méthode d'un statusInfo (protégé/PDV/abandon/arret) en
  // s'appuyant sur courtDuree + produits achetés sur la période. Reproduit
  // exactement la logique de convertedData du rapport PF.
  const detectStatusMethode = (s: ClientStatusInfo): MethodeKey | null => {
    const produits = produitsByCode.get(s.code) || [];
    const has = (kw: string) => produits.some((p) => p.includes(kw));
    if (s.courtDuree === "pilule") {
      if (has("microlut") && !has("microgynon")) return "piluleCop";
      return "piluleCoc"; // fallback Microgynon
    }
    if (s.courtDuree === "noristerat") return "injectableIm2";
    if (s.courtDuree === "injectable") {
      if (has("sayana") && !has("depo")) return "injectableSc3";
      return "injectableIm3"; // fallback Depo-Provera
    }
    if (s.implanon) return "implant3";
    if (s.jadelle) return "implant5";
    if (s.sterilet) return "diu";
    if (s.courtDuree === "preservatif") return "condomMasculin";
    if (s.courtDuree === "spermicide") return "spermicide";
    if (s.courtDuree === "urgence") return "urgence";
    return null;
  };

  // ---------------- Tableau 30a — Contraception moderne ----------------
  // Compte par méthode :
  //   - nouvelles utilisatrices par tranche d'âge (motifVisitePf = "premiere")
  //   - anciennes utilisatrices (motif = reapprovisionnement / controle)
  //   - protégées / PDV / abandons / arrêts (depuis statusInfo)
  type Row30A = {
    methode: string;
    nouvellesByAge: number[];
    nouvellesTotal: number;
    anciennes: number;
    totalUtilisatrices: number;
    protegees: number;
    pdv: number;
    abandons: number;
    arrets: number;
  };

  const rows30A: Row30A[] = useMemo(() => {
    return METHODES_30A.map((methode) => {
      // Nouveau utilisateur = statut "nu" (champ dédié dans le Planning).
      // Ancien utilisateur = statut "au".
      // L'ancien rapport PF utilise EXACTEMENT cette logique.
      const nouvellesByAge = PF_AGE_RANGES.map((range) =>
        clientData.reduce((acc, c) => {
          if (c.age < range.min || c.age > range.max) return acc;
          if (visiteMethode.get(c.idVisite) !== methode.key) return acc;
          if (c.statut !== "nu") return acc;
          return acc + 1;
        }, 0),
      );
      const nouvellesTotal = nouvellesByAge.reduce((a, b) => a + b, 0);

      const anciennes = clientData.reduce((acc, c) => {
        if (visiteMethode.get(c.idVisite) !== methode.key) return acc;
        if (c.statut !== "au") return acc;
        return acc + 1;
      }, 0);

      // Protégées / PDV / abandons / arrêts : on croise statusInfo avec
      // les produits achetés (produitsByCode) pour distinguer Sayana de
      // Depo, Microlut de Microgynon, etc. — exactement comme le fait le
      // rapport PF existant via convertedData.
      const matchStatusMethode = (s: ClientStatusInfo) =>
        detectStatusMethode(s) === methode.key;

      const protegees = statusInfo.filter(
        (s) => s.protege && matchStatusMethode(s),
      ).length;
      const pdv = statusInfo.filter(
        (s) => s.perdueDeVue && matchStatusMethode(s),
      ).length;
      const abandons = statusInfo.filter(
        (s) => s.abandon && matchStatusMethode(s),
      ).length;
      const arrets = statusInfo.filter(
        (s) => s.arret && matchStatusMethode(s),
      ).length;

      return {
        methode: methode.label,
        nouvellesByAge,
        nouvellesTotal,
        anciennes,
        totalUtilisatrices: nouvellesTotal + anciennes,
        protegees,
        pdv,
        abandons,
        arrets,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientData, visiteMethode, statusInfo, produitsByCode]);

  // ---------------- Tableau 30b — Autres indicateurs PF ----------------
  const rows30B = useMemo(
    () =>
      INDICATEURS_30B.map((ind) => ({
        label: ind.label,
        effectif: clientData.reduce((acc, c) => (ind.compute(c) ? acc + 1 : acc), 0),
      })),
    [clientData],
  );

  // ---------------- Export PDF (3 tableaux à la suite) ----------------
  const exportToPdf = async () => {
    setSpinnerPdf(true);
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      const headerInfo = () => {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(
          `Période : ${new Date(dateDebut).toLocaleDateString("fr-FR")} - ${new Date(dateFin).toLocaleDateString("fr-FR")}`,
          14,
          24,
        );
        doc.text(`Clinique : ${clinic}`, pageWidth - 14, 24, { align: "right" });
      };

      // 30a
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Tableau 30a : Contraception moderne", pageWidth / 2, 14, {
        align: "center",
      });
      headerInfo();
      const head30a = [
        [
          { content: "Type de méthode", rowSpan: 2 },
          {
            content: "Nouvelles utilisatrices",
            colSpan: PF_AGE_RANGES.length + 1,
          },
          { content: "Anciennes", rowSpan: 2 },
          { content: "Total utilisatrices", rowSpan: 2 },
          { content: "Protégées", rowSpan: 2 },
          { content: "Perdues de vue", rowSpan: 2 },
          { content: "Abandons", rowSpan: 2 },
          { content: "Arrêts/Retraits", rowSpan: 2 },
        ],
        [...PF_AGE_RANGES.map((r) => r.label), "Total"],
      ];
      const body30a = rows30A.map((r) => [
        r.methode,
        ...r.nouvellesByAge.map(String),
        r.nouvellesTotal.toString(),
        r.anciennes.toString(),
        r.totalUtilisatrices.toString(),
        r.protegees.toString(),
        r.pdv.toString(),
        r.abandons.toString(),
        r.arrets.toString(),
      ]);
      autoTable(doc, {
        startY: 30,
        head: head30a,
        body: body30a,
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: {
          fillColor: [200, 200, 200],
          textColor: 0,
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: { 0: { cellWidth: 55, halign: "left" } },
      });

      // 30b
      doc.addPage();
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(
        "Tableau 30b : Autres indicateurs d'activités en PF",
        pageWidth / 2,
        14,
        { align: "center" },
      );
      headerInfo();
      autoTable(doc, {
        startY: 30,
        head: [["Indicateur", "Effectif"]],
        body: rows30B.map((r) => [r.label, r.effectif.toString()]),
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: {
          fillColor: [200, 200, 200],
          textColor: 0,
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: { 0: { cellWidth: 200, halign: "left" } },
      });

      // 30c
      doc.addPage();
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(
        "Tableau 30c : Gestion de stock contraceptif",
        pageWidth / 2,
        14,
        { align: "center" },
      );
      headerInfo();
      autoTable(doc, {
        startY: 30,
        head: [
          [
            "Type de méthode",
            "Stock initial",
            "Quantité reçue",
            "Quantité distribuée",
            "Autres sorties",
            "Stock disponible",
            "Jours rupture",
          ],
        ],
        body: stockRows.map((r) => [
          r.methode,
          r.stockInitial.toString(),
          r.quantiteRecue.toString(),
          r.quantiteDistribuee.toString(),
          r.autresSorties.toString(),
          r.stockDisponible.toString(),
          r.joursRupture.toString(),
        ]),
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: {
          fillColor: [200, 200, 200],
          textColor: 0,
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: { 0: { cellWidth: 65, halign: "left" } },
      });

      doc.save(
        `Rapport_SIG_PLANNING_${new Date().toLocaleDateString("fr-FR")}.pdf`,
      );
    } finally {
      setSpinnerPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Spinner show size="large" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 bg-gray-50 opacity-90 p-4 rounded-sm mt-2 w-full overflow-x-auto">
      <div className="flex gap-2 mx-auto">
        <Button
          onClick={exportToPdf}
          type="button"
          disabled={spinnerPdf}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
        >
          <Spinner show={spinnerPdf} size="small" className="text-white" />
          Exporter PDF
        </Button>
      </div>

      {/* ============================== Tableau 30a ============================== */}
      <h2 className="font-bold">Tableau 30a : Contraception moderne</h2>
      <Table className="border">
        <TableHeader className="bg-slate-100">
          <TableRow>
            <TableHead rowSpan={2} className="font-semibold align-middle">
              Type de méthode
            </TableHead>
            <TableHead
              colSpan={PF_AGE_RANGES.length + 1}
              className="font-semibold text-center border border-gray-300"
            >
              Nouvelles utilisatrices
            </TableHead>
            <TableHead rowSpan={2} className="font-semibold align-middle text-center">
              Anciennes
            </TableHead>
            <TableHead rowSpan={2} className="font-semibold align-middle text-center">
              Total utilisatrices
            </TableHead>
            <TableHead rowSpan={2} className="font-semibold align-middle text-center">
              Protégées
            </TableHead>
            <TableHead rowSpan={2} className="font-semibold align-middle text-center">
              PDV
            </TableHead>
            <TableHead rowSpan={2} className="font-semibold align-middle text-center">
              Abandons
            </TableHead>
            <TableHead rowSpan={2} className="font-semibold align-middle text-center">
              Arrêts/Retraits
            </TableHead>
          </TableRow>
          <TableRow className="bg-slate-200 text-center">
            {PF_AGE_RANGES.map((r) => (
              <TableHead key={r.label}>{r.label}</TableHead>
            ))}
            <TableHead>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows30A.map((r) => (
            <TableRow key={r.methode}>
              <TableCell className="font-medium">{r.methode}</TableCell>
              {r.nouvellesByAge.map((v, i) => (
                <TableCell key={i} className="text-center">
                  {v}
                </TableCell>
              ))}
              <TableCell className="text-center font-semibold">
                {r.nouvellesTotal}
              </TableCell>
              <TableCell className="text-center">{r.anciennes}</TableCell>
              <TableCell className="text-center font-semibold">
                {r.totalUtilisatrices}
              </TableCell>
              <TableCell className="text-center">{r.protegees}</TableCell>
              <TableCell className="text-center">{r.pdv}</TableCell>
              <TableCell className="text-center">{r.abandons}</TableCell>
              <TableCell className="text-center">{r.arrets}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Separator className="bg-green-300 my-2" />

      {/* ============================== Tableau 30b ============================== */}
      <h2 className="font-bold">
        Tableau 30b : Autres indicateurs d&apos;activités en PF
      </h2>
      <Table className="border">
        <TableHeader className="bg-slate-100">
          <TableRow>
            <TableHead className="font-semibold">Indicateur</TableHead>
            <TableHead className="font-semibold text-center">
              Effectif
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows30B.map((r) => (
            <TableRow key={r.label}>
              <TableCell>{r.label}</TableCell>
              <TableCell className="text-center font-semibold">
                {r.effectif}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Separator className="bg-green-300 my-2" />

      {/* ============================== Tableau 30c ============================== */}
      <h2 className="font-bold">
        Tableau 30c : Gestion de stock de contraceptifs
      </h2>
      <Table className="border">
        <TableHeader className="bg-slate-100">
          <TableRow>
            <TableHead className="font-semibold">Type de méthode</TableHead>
            <TableHead className="font-semibold text-center">
              Stock initial
            </TableHead>
            <TableHead className="font-semibold text-center">
              Qté reçue
            </TableHead>
            <TableHead className="font-semibold text-center">
              Qté distribuée
            </TableHead>
            <TableHead className="font-semibold text-center">
              Autres sorties
            </TableHead>
            <TableHead className="font-semibold text-center">
              Stock disponible
            </TableHead>
            <TableHead className="font-semibold text-center">
              Jours rupture
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stockRows.map((r) => (
            <TableRow key={r.methode}>
              <TableCell className="font-medium">{r.methode}</TableCell>
              <TableCell className="text-center">{r.stockInitial}</TableCell>
              <TableCell className="text-center">{r.quantiteRecue}</TableCell>
              <TableCell className="text-center">
                {r.quantiteDistribuee}
              </TableCell>
              <TableCell className="text-center">{r.autresSorties}</TableCell>
              <TableCell className="text-center font-semibold">
                {r.stockDisponible}
              </TableCell>
              <TableCell className="text-center">{r.joursRupture}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
