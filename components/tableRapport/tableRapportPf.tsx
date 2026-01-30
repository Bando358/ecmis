import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  countClientPf,
  countClientPfInsertionAndControl,
  countClientPfInsertion,
  countClientPfControle,
  countClientPfRetrait,
} from "../rapport/pf/pf";
import { ClientStatusInfo } from "@/lib/actions/rapportActions";
import { ClientData } from "../rapportPfActions";
import { useEffect, useState, useMemo } from "react";
import ExcelJS from "exceljs";
import { Worksheet } from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { countProduitByOldSync } from "@/components/rapport/pf/pfProduit";
import { getAllProduits } from "@/lib/actions/produitActions";
import { getAllTarifProduitsByTabIclinique } from "@/lib/actions/tarifProduitActions";
import { getAllFactureProduitByIdVisiteByData } from "@/lib/actions/factureProduitActions";
import { FactureProduit, Produit, TarifProduit } from "@prisma/client";

// Type unifié pour les données converties
type ConvertedClientStatus = Omit<
  ClientStatusInfo,
  "implanon" | "jadelle" | "sterilet"
> & {
  pilule: boolean;
  noristera: boolean;
  injectable: boolean;
  implanon: boolean;
  jadelle: boolean;
  sterilet: boolean;
};

type AgeRange = {
  min: number;
  max: number;
};

type DateType = string | Date;

interface TableRapportPfProps {
  ageRanges: AgeRange[];
  clientData: ClientData[];
  clientDataProtege: ClientStatusInfo[];
  dateDebut: DateType;
  dateFin: DateType;
  clinic: string;
  clinicIds: string[];
}

// Constantes pour les colonnes Excel
const PF_COLUMNS = [
  { header: "Indicateurs", key: "indicateurs", width: 40 },
  { header: "<10 ans", key: "moins10", width: 7 },
  { header: "10-14 ans", key: "10a14", width: 7 },
  { header: "15-19 ans", key: "15a19", width: 7 },
  { header: "20-24 ans", key: "20a24", width: 7 },
  { header: "25+ ans", key: "25plus", width: 7 },
  { header: "<10 ans", key: "moins10_au", width: 7 },
  { header: "10-14 ans", key: "10a14_au", width: 7 },
  { header: "15-19 ans", key: "15a19_au", width: 7 },
  { header: "20-24 ans", key: "20a24_au", width: 7 },
  { header: "25+ ans", key: "25plus_au", width: 7 },
  { header: "Total", key: "total", width: 10 },
];

// Labels des âges pour l'affichage
const AGE_LABELS = [
  "-10 ans",
  "10-14 ans",
  "15-19 ans",
  "20-24 ans",
  "25 ans et +",
];

// Configuration des indicateurs de planning familial
type IndicatorConfig = {
  label: string;
  type: "pf" | "insertionControl" | "insertion" | "controle" | "retrait";
  field: string;
  value?: string | boolean;
  highlightNu?: boolean;
};

const CLIENT_INDICATORS: IndicatorConfig[] = [
  {
    label: "CLT - PF - Pilules",
    type: "pf",
    field: "courtDuree",
    value: "pilule",
  },
  {
    label: "CLT - PF - Injectable 2 mois",
    type: "pf",
    field: "courtDuree",
    value: "noristera",
  },
  {
    label: "CLT - PF - Injectable 3 mois",
    type: "pf",
    field: "courtDuree",
    value: "injectable",
  },
  {
    label: "CLT - PF - Implant - 3 ans (Insertion, Contrôle)",
    type: "insertionControl",
    field: "implanon",
  },
  {
    label: "CLT - PF - Implant 3 ans - retrait",
    type: "retrait",
    field: "retraitImplanon",
    value: true,
    highlightNu: true,
  },
  {
    label: "CLT - PF - Implant - 5 ans (insertion, contrôle)",
    type: "insertionControl",
    field: "jadelle",
  },
  {
    label: "CLT - PF - Implant 5 ans - retrait",
    type: "retrait",
    field: "retraitJadelle",
    value: true,
    highlightNu: true,
  },
  {
    label: "CLT - PF - DIU - 10 ans Diu (insertion, contrôle)",
    type: "insertionControl",
    field: "sterilet",
  },
  {
    label: "CLT - PF - Diu retrait",
    type: "retrait",
    field: "retraitSterilet",
    value: true,
    highlightNu: true,
  },
  {
    label: "CLT - PF - Counselling PF",
    type: "retrait",
    field: "counsellingPf",
    value: true,
  },
  {
    label: "CLT - PF - Préservatif (Féminin, Masculin)",
    type: "pf",
    field: "courtDuree",
    value: "preservatif",
  },
  {
    label: "CLT - PF - Contraception d'urgence",
    type: "pf",
    field: "courtDuree",
    value: "urgence",
  },
  {
    label: "CLT - PF - Spermicides",
    type: "pf",
    field: "courtDuree",
    value: "spermicide",
  },
];

const SERVICE_INDICATORS: IndicatorConfig[] = [
  {
    label: "SRV - PF - Counseling Général",
    type: "retrait",
    field: "counsellingPf",
    value: true,
  },
  {
    label: "SRV - PF - Consultation - Préservatif",
    type: "pf",
    field: "courtDuree",
    value: "preservatif",
  },
  {
    label: "SRV - PF - Consultation - Pilules",
    type: "pf",
    field: "courtDuree",
    value: "pilule",
  },
  {
    label: "SRV - PF - Consultation - Injectable 2 mois",
    type: "pf",
    field: "courtDuree",
    value: "noristera",
  },
  {
    label: "SRV - PF - Consultation - Injectable 3 mois",
    type: "pf",
    field: "courtDuree",
    value: "injectable",
  },
  // Implant 3 ans - Insertion, Contrôle, Retrait
  {
    label: "SRV - PF - Consultation - Implant 3 ans - Insertion",
    type: "insertion",
    field: "implanon",
  },
  {
    label: "SRV - PF - Consultation - Implant 3 ans - Contrôle",
    type: "controle",
    field: "implanon",
    highlightNu: true,
  },
  {
    label: "SRV - PF - Consultation - Implant 3 ans - Retrait",
    type: "retrait",
    field: "retraitImplanon",
    value: true,
    highlightNu: true,
  },
  // Implant 5 ans - Insertion, Contrôle, Retrait
  {
    label: "SRV - PF - Consultation - Implant 5 ans - Insertion",
    type: "insertion",
    field: "jadelle",
  },
  {
    label: "SRV - PF - Consultation - Implant 5 ans - Contrôle",
    type: "controle",
    field: "jadelle",
    highlightNu: true,
  },
  {
    label: "SRV - PF - Consultation - Implant 5 ans - Retrait",
    type: "retrait",
    field: "retraitJadelle",
    value: true,
    highlightNu: true,
  },
  // DIU - Insertion, Contrôle, Retrait
  {
    label: "SRV - PF - Consultation - DIU - Insertion",
    type: "insertion",
    field: "sterilet",
  },
  {
    label: "SRV - PF - Consultation - DIU - Contrôle",
    type: "controle",
    field: "sterilet",
    highlightNu: true,
  },
  {
    label: "SRV - PF - Consultation - DIU - Retrait",
    type: "retrait",
    field: "retraitSterilet",
    value: true,
    highlightNu: true,
  },
  {
    label: "SRV - PF - Contraception d'urgence",
    type: "pf",
    field: "courtDuree",
    value: "urgence",
  },
  {
    label: "SRV - PF - Spermicides",
    type: "pf",
    field: "courtDuree",
    value: "spermicide",
  },
];

// Hook personnalisé pour calculer les valeurs d'un indicateur
const useIndicatorValues = (
  clientData: ClientData[],
  ageRanges: AgeRange[],
  indicator: IndicatorConfig,
) => {
  return useMemo(() => {
    const countFn = (range: AgeRange, userType: "nu" | "au") => {
      switch (indicator.type) {
        case "pf":
          return countClientPf(
            clientData,
            range.min,
            range.max,
            indicator.field,
            indicator.value as string,
            userType,
          );
        case "insertionControl":
          return countClientPfInsertionAndControl(
            clientData,
            range.min,
            range.max,
            indicator.field,
            userType,
          );
        case "insertion":
          return countClientPfInsertion(
            clientData,
            range.min,
            range.max,
            indicator.field,
            userType,
          );
        case "controle":
          return countClientPfControle(
            clientData,
            range.min,
            range.max,
            indicator.field,
            userType,
          );
        case "retrait":
          return countClientPfRetrait(
            clientData,
            range.min,
            range.max,
            indicator.field,
            indicator.value as boolean,
            userType,
          );
      }
    };

    const nuValues = ageRanges.map((range) => countFn(range, "nu"));
    const auValues = ageRanges.map((range) => countFn(range, "au"));
    const total =
      (nuValues?.reduce((sum, val) => (sum ?? 0) + (val ?? 0), 0) ?? 0) +
      (auValues?.reduce((sum, val) => (sum ?? 0) + (val ?? 0), 0) ?? 0);

    return { nuValues, auValues, total };
  }, [clientData, ageRanges, indicator]);
};

// Composant pour une ligne d'indicateur
interface IndicatorRowProps {
  indicator: IndicatorConfig;
  clientData: ClientData[];
  ageRanges: AgeRange[];
}

const IndicatorRow = ({
  indicator,
  clientData,
  ageRanges,
}: IndicatorRowProps) => {
  const { nuValues, auValues, total } = useIndicatorValues(
    clientData,
    ageRanges,
    indicator,
  );

  return (
    <TableRow>
      <TableCell>{indicator.label}</TableCell>
      {nuValues.map((value, index) => (
        <TableCell
          key={`nu-${index}`}
          className={indicator.highlightNu ? "bg-gray-600" : ""}
        >
          {value}
        </TableCell>
      ))}
      {auValues.map((value, index) => (
        <TableCell key={`au-${index}`}>{value}</TableCell>
      ))}
      <TableCell>{total}</TableCell>
    </TableRow>
  );
};

// Composant pour l'en-tête de tableau
const TableHeaderSection = () => (
  <TableHeader className="bg-gray-200">
    <TableRow>
      <TableCell rowSpan={2} className="font-bold">
        Indicateurs
      </TableCell>
      <TableCell
        colSpan={5}
        className="font-bold text-center border border-r-gray-400 border-l-gray-400"
      >
        Nouveau utilisateur
      </TableCell>
      <TableCell colSpan={5} className="font-bold text-center">
        Ancien utilisateur
      </TableCell>
      <TableCell rowSpan={2} className="font-bold">
        Total
      </TableCell>
    </TableRow>
    <TableRow className="bg-gray-300 text-center">
      {AGE_LABELS.map((label, index) => (
        <TableCell
          key={`nu-header-${index}`}
          className={
            index === 0
              ? "border border-l-gray-400"
              : index === 4
                ? "border border-r-gray-400"
                : ""
          }
        >
          {label}
        </TableCell>
      ))}
      {AGE_LABELS.map((label, index) => (
        <TableCell
          key={`au-header-${index}`}
          className={index === 4 ? "border border-r-gray-400" : ""}
        >
          {label}
        </TableCell>
      ))}
    </TableRow>
  </TableHeader>
);

// Fonction pour générer les données d'une ligne Excel
const generateExcelRowData = (
  clientData: ClientData[],
  ageRanges: AgeRange[],
  indicator: IndicatorConfig,
) => {
  const countFn = (range: AgeRange, userType: "nu" | "au") => {
    switch (indicator.type) {
      case "pf":
        return countClientPf(
          clientData,
          range.min,
          range.max,
          indicator.field,
          indicator.value as string,
          userType,
        );
      case "insertionControl":
        return countClientPfInsertionAndControl(
          clientData,
          range.min,
          range.max,
          indicator.field,
          userType,
        );
      case "insertion":
        return countClientPfInsertion(
          clientData,
          range.min,
          range.max,
          indicator.field,
          userType,
        );
      case "controle":
        return countClientPfControle(
          clientData,
          range.min,
          range.max,
          indicator.field,
          userType,
        );
      case "retrait":
        return countClientPfRetrait(
          clientData,
          range.min,
          range.max,
          indicator.field,
          indicator.value as boolean,
          userType,
        );
    }
  };

  const nuValues = ageRanges.map((range) => countFn(range, "nu"));
  const auValues = ageRanges.map((range) => countFn(range, "au"));

  return {
    indicateurs: indicator.label,
    moins10: nuValues[0] || 0,
    "10a14": nuValues[1] || 0,
    "15a19": nuValues[2] || 0,
    "20a24": nuValues[3] || 0,
    "25plus": nuValues[4] || 0,
    moins10_au: auValues[0] || 0,
    "10a14_au": auValues[1] || 0,
    "15a19_au": auValues[2] || 0,
    "20a24_au": auValues[3] || 0,
    "25plus_au": auValues[4] || 0,
    total:
      (nuValues?.reduce((a, b) => (a ?? 0) + (b ?? 0), 0) ?? 0) +
      (auValues?.reduce((a, b) => (a ?? 0) + (b ?? 0), 0) ?? 0),
  };
};

export default function TableRapportPf({
  ageRanges,
  clientData,
  clientDataProtege,
  dateDebut,
  dateFin,
  clinic,
  clinicIds,
}: TableRapportPfProps) {
  const [spinner, setSpinner] = useState(false);
  const [spinnerPdf, setSpinnerPdf] = useState(false);
  const [allProduits, setAllProduits] = useState<Produit[]>([]);
  const [allFactureProduits, setAllFactureProduits] = useState<
    FactureProduit[]
  >([]);
  const [allTarifProduits, setAllTarifProduits] = useState<TarifProduit[]>([]);

  // Mémoriser les IDs pour éviter les re-rendus inutiles
  const clinicIdsString = useMemo(() => clinicIds.join(","), [clinicIds]);
  const clientDataKey = useMemo(
    () => clientData.map((c) => c.idVisite).join(","),
    [clientData],
  );

  // Convertir les données de clientDataProtege pour le tableau des protégés
  const convertedData = useMemo(() => {
    const createConverted = (filterFn: (client: ClientStatusInfo) => boolean) =>
      clientDataProtege.map((client) => ({
        ...client,
        pilule: client.courtDuree === "pilule" && filterFn(client),
        noristera: client.courtDuree === "noristera" && filterFn(client),
        injectable: client.courtDuree === "injectable" && filterFn(client),
        implanon: client.implanon === "insertion" && filterFn(client),
        jadelle: client.jadelle === "insertion" && filterFn(client),
        sterilet: client.sterilet === "insertion" && filterFn(client),
      }));

    return {
      protege: createConverted((c) => c.protege),
      pdv: createConverted((c) => c.perdueDeVue),
      abandon: createConverted((c) => c.abandon),
    };
  }, [clientDataProtege]);

  // Charger les données des produits
  useEffect(() => {
    const fetchData = async () => {
      const [produits, tarifProduits, factures] = await Promise.all([
        getAllProduits(),
        getAllTarifProduitsByTabIclinique(clinicIds),
        getAllFactureProduitByIdVisiteByData(clientData),
      ]);
      setAllProduits(produits);
      setAllTarifProduits(tarifProduits);
      setAllFactureProduits(factures);
    };
    fetchData();
  }, [clinicIdsString, clientDataKey, clinicIds, clientData]);

  // Données pour les lignes par sexe
  const sexeRowsData = useMemo(() => {
    const generateSexeRow = (sexe: string) => ({
      nuValues: ageRanges.map((range) =>
        countClientPf(clientData, range.min, range.max, "sexe", sexe, "nu"),
      ),
      auValues: ageRanges.map((range) =>
        countClientPf(clientData, range.min, range.max, "sexe", sexe, "au"),
      ),
    });

    const masculin = generateSexeRow("Masculin");
    const feminin = generateSexeRow("Féminin");

    return {
      masculin: {
        ...masculin,
        total:
          masculin.nuValues.reduce((a, b) => a + b, 0) +
          masculin.auValues.reduce((a, b) => a + b, 0),
      },
      feminin: {
        ...feminin,
        total:
          feminin.nuValues.reduce((a, b) => a + b, 0) +
          feminin.auValues.reduce((a, b) => a + b, 0),
      },
    };
  }, [clientData, ageRanges]);

  const exportToExcel = async () => {
    setSpinner(true);

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Planning");

      // Ajouter le logo
      const logoBase64 = await fetch("/LOGO_AIBEF_IPPF.png")
        .then((res) => res.blob())
        .then((blob) => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        });

      const imageId = workbook.addImage({
        base64: logoBase64,
        extension: "png",
      });
      worksheet.addImage(imageId, "B1:H2");

      // En-tête période
      setupPeriodHeader(worksheet, dateDebut, dateFin, clinic);

      // Fonction helper pour créer un tableau
      const createTable = (
        startRow: number,
        title: string,
        dataRows: Record<string, unknown>[],
      ) => {
        worksheet.getCell(`A${startRow}`).value = title;
        worksheet.mergeCells(`A${startRow}:J${startRow}`);
        worksheet.getRow(startRow).height = 20;

        const mergeHeaderRow = startRow + 1;
        const columnHeaderRow = startRow + 2;

        worksheet.getCell(`A${mergeHeaderRow}`).value = "";
        worksheet.getCell(`B${mergeHeaderRow}`).value = "Nouveau utilisateur";
        worksheet.getCell(`G${mergeHeaderRow}`).value = "Ancien utilisateur";

        worksheet.mergeCells(`A${mergeHeaderRow}:A${columnHeaderRow}`);
        worksheet.mergeCells(`B${mergeHeaderRow}:F${mergeHeaderRow}`);
        worksheet.mergeCells(`G${mergeHeaderRow}:K${mergeHeaderRow}`);
        worksheet.mergeCells(`L${mergeHeaderRow}:L${columnHeaderRow}`);

        worksheet.columns = PF_COLUMNS;

        const headerRow = worksheet.getRow(columnHeaderRow);
        headerRow.values = PF_COLUMNS.map((col) => col.header);
        headerRow.commit();

        dataRows.forEach((row) => worksheet.addRow(row));

        // Style
        for (
          let i = mergeHeaderRow;
          i <= columnHeaderRow + dataRows.length;
          i++
        ) {
          const isHeaderRow = i === mergeHeaderRow || i === columnHeaderRow;
          worksheet.getRow(i).eachCell((cell, colNumber) => {
            // Colonne A (colNumber === 1) alignée à gauche sauf pour les en-têtes
            const isColumnA = colNumber === 1;
            cell.alignment = {
              horizontal: isColumnA && !isHeaderRow ? "left" : "center",
              vertical: "middle",
            };
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
            if (isHeaderRow) {
              cell.font = { bold: true };
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "EEEEEE" },
              };
            }
          });
        }

        return columnHeaderRow + dataRows.length + 2;
      };

      // Tableau par sexe
      const sexeRows = [
        {
          indicateurs: "Masculin",
          moins10: sexeRowsData.masculin.nuValues[0],
          "10a14": sexeRowsData.masculin.nuValues[1],
          "15a19": sexeRowsData.masculin.nuValues[2],
          "20a24": sexeRowsData.masculin.nuValues[3],
          "25plus": sexeRowsData.masculin.nuValues[4],
          moins10_au: sexeRowsData.masculin.auValues[0],
          "10a14_au": sexeRowsData.masculin.auValues[1],
          "15a19_au": sexeRowsData.masculin.auValues[2],
          "20a24_au": sexeRowsData.masculin.auValues[3],
          "25plus_au": sexeRowsData.masculin.auValues[4],
          total: sexeRowsData.masculin.total,
        },
        {
          indicateurs: "Féminin",
          moins10: sexeRowsData.feminin.nuValues[0],
          "10a14": sexeRowsData.feminin.nuValues[1],
          "15a19": sexeRowsData.feminin.nuValues[2],
          "20a24": sexeRowsData.feminin.nuValues[3],
          "25plus": sexeRowsData.feminin.nuValues[4],
          moins10_au: sexeRowsData.feminin.auValues[0],
          "10a14_au": sexeRowsData.feminin.auValues[1],
          "15a19_au": sexeRowsData.feminin.auValues[2],
          "20a24_au": sexeRowsData.feminin.auValues[3],
          "25plus_au": sexeRowsData.feminin.auValues[4],
          total: sexeRowsData.feminin.total,
        },
      ];

      let nextRow = createTable(6, "Clients par sexe", sexeRows);

      // Tableau des clients PF
      const clientPfRows = CLIENT_INDICATORS.map((indicator) =>
        generateExcelRowData(clientData, ageRanges, indicator),
      );
      nextRow = createTable(nextRow, "Tableau des clients PF", clientPfRows);

      // Tableau des services clients PF
      const servicePfRows = SERVICE_INDICATORS.map((indicator) =>
        generateExcelRowData(clientData, ageRanges, indicator),
      );
      nextRow = createTable(
        nextRow,
        "Tableau des services clients PF",
        servicePfRows,
      );

      // Tableau des Produits PF distribués
      const getFacturesByVisiteId = (idVisite: string) =>
        allFactureProduits.filter((f) => f.idVisite === idVisite);

      const produitsPfRows = allProduits
        .filter((p) => p.typeProduit === "CONTRACEPTIF")
        .map((produit) => {
          const nuValues = ageRanges.map((range) =>
            countProduitByOldSync(
              clientData,
              range.min,
              range.max,
              false,
              produit.nomProduit,
              "nu",
              allProduits,
              allTarifProduits,
              allFactureProduits,
              getFacturesByVisiteId,
            ),
          );
          const auValues = ageRanges.map((range) =>
            countProduitByOldSync(
              clientData,
              range.min,
              range.max,
              false,
              produit.nomProduit,
              "au",
              allProduits,
              allTarifProduits,
              allFactureProduits,
              getFacturesByVisiteId,
            ),
          );
          return {
            indicateurs: produit.nomProduit,
            moins10: nuValues[0] || 0,
            "10a14": nuValues[1] || 0,
            "15a19": nuValues[2] || 0,
            "20a24": nuValues[3] || 0,
            "25plus": nuValues[4] || 0,
            moins10_au: auValues[0] || 0,
            "10a14_au": auValues[1] || 0,
            "15a19_au": auValues[2] || 0,
            "20a24_au": auValues[3] || 0,
            "25plus_au": auValues[4] || 0,
            total:
              nuValues.reduce((a, b) => a + b, 0) +
              auValues.reduce((a, b) => a + b, 0),
          };
        });
      nextRow = createTable(
        nextRow,
        "Tableau des Produits PF distribués",
        produitsPfRows,
      );

      // Fonction helper pour créer un tableau simple (sans NU/AU)
      const createSimpleTable = (
        startRow: number,
        title: string,
        dataRows: Record<string, unknown>[],
        headerColor: string,
      ) => {
        worksheet.getCell(`A${startRow}`).value = title;
        worksheet.mergeCells(`A${startRow}:G${startRow}`);
        worksheet.getRow(startRow).height = 20;
        worksheet.getCell(`A${startRow}`).font = { bold: true, size: 12 };

        const headerRow = startRow + 1;
        const headers = [
          "Méthode",
          "-10 ans",
          "10-14 ans",
          "15-19 ans",
          "20-24 ans",
          "25+ ans",
          "Total",
        ];
        headers.forEach((header, idx) => {
          const cell = worksheet.getCell(headerRow, idx + 1);
          cell.value = header;
          cell.font = { bold: true };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: headerColor },
          };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });

        dataRows.forEach((row, rowIdx) => {
          const currentRow = headerRow + 1 + rowIdx;
          const values = [
            row.methode,
            row.moins10,
            row["10a14"],
            row["15a19"],
            row["20a24"],
            row["25plus"],
            row.total,
          ];
          values.forEach((val, colIdx) => {
            const cell = worksheet.getCell(currentRow, colIdx + 1);
            cell.value = val as string | number;
            // Colonne A (colIdx === 0) alignée à gauche
            cell.alignment = {
              horizontal: colIdx === 0 ? "left" : "center",
              vertical: "middle",
            };
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          });
        });

        return headerRow + dataRows.length + 3;
      };

      // Génération des données pour les tableaux par méthode contraceptive
      const methodLabels: Record<string, string> = {
        pilule: "Pilule",
        noristera: "Injectable 2 mois",
        injectable: "Injectable 3 mois",
        implanon: "Implant 3 ans",
        jadelle: "Implant 5 ans",
        sterilet: "DIU",
      };
      const methods = [
        "pilule",
        "noristera",
        "injectable",
        "implanon",
        "jadelle",
        "sterilet",
      ] as const;

      const generateMethodRows = (
        data: ConvertedClientStatus[],
      ): Record<string, unknown>[] => {
        return methods.map((method) => {
          const counts = [
            countByAgeAndMethod(data, 0, 9, method),
            countByAgeAndMethod(data, 10, 14, method),
            countByAgeAndMethod(data, 15, 19, method),
            countByAgeAndMethod(data, 20, 24, method),
            countByAgeAndMethod(data, 25, 120, method),
          ];
          return {
            methode: methodLabels[method],
            moins10: counts[0],
            "10a14": counts[1],
            "15a19": counts[2],
            "20a24": counts[3],
            "25plus": counts[4],
            total: counts.reduce((a, b) => a + b, 0),
          };
        });
      };

      // Titre section Clients par méthode contraceptive
      worksheet.getCell(`A${nextRow}`).value =
        "Clients par méthode contraceptive";
      worksheet.mergeCells(`A${nextRow}:G${nextRow}`);
      worksheet.getCell(`A${nextRow}`).font = { bold: true, size: 14 };
      nextRow += 2;

      // Tableau Protégés
      const protegeRows = generateMethodRows(convertedData.protege);
      nextRow = createSimpleTable(nextRow, "Protégés", protegeRows, "C6EFCE");

      // Tableau Perdu de vue
      const pdvRows = generateMethodRows(convertedData.pdv);
      nextRow = createSimpleTable(
        nextRow,
        "Perdu de vue (PDV)",
        pdvRows,
        "FFEB9C",
      );

      // Tableau Abandon
      const abandonRows = generateMethodRows(convertedData.abandon);
      createSimpleTable(nextRow, "Abandon", abandonRows, "FFC7CE");

      // Nettoyer la première ligne
      [
        "A1",
        "B1",
        "C1",
        "D1",
        "E1",
        "F1",
        "G1",
        "H1",
        "I1",
        "J1",
        "K1",
        "L1",
      ].forEach((cellRef) => {
        worksheet.getCell(cellRef).value = "";
      });

      // Télécharger
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Rapport_Planning_${new Date().toLocaleDateString("fr-FR")}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setSpinner(false);
    }
  };

  const exportToPdf = async () => {
    setSpinnerPdf(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = new jsPDF("landscape", "mm", "a4") as any;
      const pageWidth = doc.internal.pageSize.getWidth();
      let currentY = 10;

      // Charger et ajouter le logo
      try {
        const logoResponse = await fetch("/LOGO_AIBEF_IPPF.png");
        const logoBlob = await logoResponse.blob();
        const logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(logoBlob);
        });

        // Ajouter le logo centré en haut (60% de la largeur de la page)
        const logoWidth = pageWidth * 0.6;
        const logoHeight = 15; // Ratio approximatif pour maintenir les proportions
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(logoBase64, "PNG", logoX, currentY, logoWidth, logoHeight);
        currentY += logoHeight + 8;
      } catch {
        // Si le logo ne peut pas être chargé, continuer sans
        currentY = 15;
      }

      // Fonction pour ajouter un titre
      const addTitle = (title: string, fontSize: number = 12) => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", "bold");
        doc.text(title, 14, currentY);
        currentY += 8;
      };

      // Fonction pour vérifier si un tableau peut tenir sur la page actuelle
      const checkPageBreak = (tableHeight: number) => {
        const pageHeight = doc.internal.pageSize.getHeight();
        if (currentY + tableHeight > pageHeight - 15) {
          doc.addPage();
          currentY = 15;
        }
      };

      // En-tête du rapport
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Rapport Planning Familial", pageWidth / 2, currentY, {
        align: "center",
      });
      currentY += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      // Vérifier si la période couvre un mois complet
      const debut = new Date(dateDebut);
      const fin = new Date(dateFin);
      const isFirstDayOfMonth = debut.getDate() === 1;
      const lastDayOfMonth = new Date(
        fin.getFullYear(),
        fin.getMonth() + 1,
        0,
      ).getDate();
      const isLastDayOfMonth = fin.getDate() === lastDayOfMonth;
      const isSameMonth =
        debut.getMonth() === fin.getMonth() &&
        debut.getFullYear() === fin.getFullYear();

      let periodeStr: string;
      if (isFirstDayOfMonth && isLastDayOfMonth && isSameMonth) {
        // Mois complet - afficher "MOIS ANNÉE"
        const moisFr = [
          "JANVIER",
          "FÉVRIER",
          "MARS",
          "AVRIL",
          "MAI",
          "JUIN",
          "JUILLET",
          "AOÛT",
          "SEPTEMBRE",
          "OCTOBRE",
          "NOVEMBRE",
          "DÉCEMBRE",
        ];
        periodeStr = `${moisFr[debut.getMonth()]} ${debut.getFullYear()}`;
      } else {
        // Période partielle - afficher les dates
        const dateDebutStr = debut.toLocaleDateString("fr-FR");
        const dateFinStr = fin.toLocaleDateString("fr-FR");
        periodeStr = `${dateDebutStr} - ${dateFinStr}`;
      }

      doc.text(
        `Période: ${periodeStr} | Clinique: ${clinic}`,
        pageWidth / 2,
        currentY,
        { align: "center" },
      );
      currentY += 12;

      // En-têtes communs pour les tableaux avec NU/AU
      const headersNuAu = [
        [
          { content: "Indicateurs", rowSpan: 2 },
          { content: "Nouveau utilisateur", colSpan: 5 },
          { content: "Ancien utilisateur", colSpan: 5 },
          { content: "Total", rowSpan: 2 },
        ],
        [
          "-10 ans",
          "10-14",
          "15-19",
          "20-24",
          "25+",
          "-10 ans",
          "10-14",
          "15-19",
          "20-24",
          "25+",
        ],
      ];

      // En-têtes pour les tableaux simples
      const headersSimple = [
        [
          "Méthode",
          "-10 ans",
          "10-14 ans",
          "15-19 ans",
          "20-24 ans",
          "25+ ans",
          "Total",
        ],
      ];

      // Styles communs
      const tableStyles = {
        fontSize: 8,
        cellPadding: 2,
        overflow: "linebreak" as const,
        halign: "center" as const,
        valign: "middle" as const,
      };

      const headStyles = {
        fillColor: [200, 200, 200] as [number, number, number],
        textColor: [0, 0, 0] as [number, number, number],
        fontStyle: "bold" as const,
        halign: "center" as const,
      };

      // Fonction pour générer les données d'un tableau NU/AU
      const generateTableData = (indicators: IndicatorConfig[]) => {
        return indicators.map((indicator) => {
          const data = generateExcelRowData(clientData, ageRanges, indicator);
          return [
            data.indicateurs,
            data.moins10,
            data["10a14"],
            data["15a19"],
            data["20a24"],
            data["25plus"],
            data.moins10_au,
            data["10a14_au"],
            data["15a19_au"],
            data["20a24_au"],
            data["25plus_au"],
            data.total,
          ];
        });
      };

      // 1. Tableau Clients par sexe
      addTitle("Clients par sexe");
      const sexeData = [
        [
          "Masculin",
          ...sexeRowsData.masculin.nuValues,
          ...sexeRowsData.masculin.auValues,
          sexeRowsData.masculin.total,
        ],
        [
          "Féminin",
          ...sexeRowsData.feminin.nuValues,
          ...sexeRowsData.feminin.auValues,
          sexeRowsData.feminin.total,
        ],
      ];

      autoTable(doc, {
        startY: currentY,
        head: headersNuAu,
        body: sexeData,
        styles: tableStyles,
        headStyles: headStyles,
        columnStyles: { 0: { halign: "left" } },
        didDrawPage: () => {},
      });
      currentY = doc.lastAutoTable.finalY + 10;

      // 2. Tableau des clients PF
      checkPageBreak(80);
      addTitle("Clients PF par méthode");
      const clientPfData = generateTableData(CLIENT_INDICATORS);

      autoTable(doc, {
        startY: currentY,
        head: headersNuAu,
        body: clientPfData,
        styles: tableStyles,
        headStyles: headStyles,
        columnStyles: { 0: { halign: "left" } },
        pageBreak: "avoid",
      });
      currentY = doc.lastAutoTable.finalY + 10;

      // 3. Tableau des services PF
      checkPageBreak(100);
      addTitle("Services PF");
      const servicePfData = generateTableData(SERVICE_INDICATORS);

      autoTable(doc, {
        startY: currentY,
        head: headersNuAu,
        body: servicePfData,
        styles: tableStyles,
        headStyles: headStyles,
        columnStyles: { 0: { halign: "left" } },
        pageBreak: "avoid",
      });
      currentY = doc.lastAutoTable.finalY + 10;

      // 4. Tableau des Produits PF distribués
      const getFacturesByVisiteId = (idVisite: string) =>
        allFactureProduits.filter((f) => f.idVisite === idVisite);

      const produitsContraceptifs = allProduits.filter(
        (p) => p.typeProduit === "CONTRACEPTIF",
      );

      if (produitsContraceptifs.length > 0) {
        checkPageBreak(60);
        addTitle("Produits PF distribués");

        const produitsData = produitsContraceptifs.map((produit) => {
          const nuValues = ageRanges.map((range) =>
            countProduitByOldSync(
              clientData,
              range.min,
              range.max,
              false,
              produit.nomProduit,
              "nu",
              allProduits,
              allTarifProduits,
              allFactureProduits,
              getFacturesByVisiteId,
            ),
          );
          const auValues = ageRanges.map((range) =>
            countProduitByOldSync(
              clientData,
              range.min,
              range.max,
              false,
              produit.nomProduit,
              "au",
              allProduits,
              allTarifProduits,
              allFactureProduits,
              getFacturesByVisiteId,
            ),
          );
          return [
            produit.nomProduit,
            ...nuValues,
            ...auValues,
            nuValues.reduce((a, b) => a + b, 0) +
              auValues.reduce((a, b) => a + b, 0),
          ];
        });

        autoTable(doc, {
          startY: currentY,
          head: headersNuAu,
          body: produitsData,
          styles: tableStyles,
          headStyles: headStyles,
          columnStyles: { 0: { halign: "left" } },
          pageBreak: "avoid",
        });
        currentY = doc.lastAutoTable.finalY + 10;
      }

      // 5. Tableaux Clients par méthode contraceptive
      const methodLabels: Record<string, string> = {
        pilule: "Pilule",
        noristera: "Injectable 2 mois",
        injectable: "Injectable 3 mois",
        implanon: "Implant 3 ans",
        jadelle: "Implant 5 ans",
        sterilet: "DIU",
      };
      const methods = [
        "pilule",
        "noristera",
        "injectable",
        "implanon",
        "jadelle",
        "sterilet",
      ] as const;

      const generateMethodData = (data: ConvertedClientStatus[]) => {
        return methods.map((method) => {
          const counts = [
            countByAgeAndMethod(data, 0, 9, method),
            countByAgeAndMethod(data, 10, 14, method),
            countByAgeAndMethod(data, 15, 19, method),
            countByAgeAndMethod(data, 20, 24, method),
            countByAgeAndMethod(data, 25, 120, method),
          ];
          return [
            methodLabels[method],
            ...counts,
            counts.reduce((a, b) => a + b, 0),
          ];
        });
      };

      // Titre section
      checkPageBreak(50);
      addTitle("Clients par méthode contraceptive", 14);
      currentY += 2;

      // Protégés
      addTitle("Protégés", 10);
      autoTable(doc, {
        startY: currentY,
        head: headersSimple,
        body: generateMethodData(convertedData.protege),
        styles: tableStyles,
        headStyles: {
          ...headStyles,
          fillColor: [198, 239, 206] as [number, number, number],
        },
        columnStyles: { 0: { halign: "left" } },
        pageBreak: "avoid",
      });
      currentY = doc.lastAutoTable.finalY + 8;

      // Perdu de vue
      checkPageBreak(50);
      addTitle("Perdu de vue (PDV)", 10);
      autoTable(doc, {
        startY: currentY,
        head: headersSimple,
        body: generateMethodData(convertedData.pdv),
        styles: tableStyles,
        headStyles: {
          ...headStyles,
          fillColor: [255, 235, 156] as [number, number, number],
        },
        columnStyles: { 0: { halign: "left" } },
        pageBreak: "avoid",
      });
      currentY = doc.lastAutoTable.finalY + 8;

      // Abandon
      checkPageBreak(50);
      addTitle("Abandon", 10);
      autoTable(doc, {
        startY: currentY,
        head: headersSimple,
        body: generateMethodData(convertedData.abandon),
        styles: tableStyles,
        headStyles: {
          ...headStyles,
          fillColor: [255, 199, 206] as [number, number, number],
        },
        columnStyles: { 0: { halign: "left" } },
        pageBreak: "avoid",
      });

      // Section signature à la fin (sur la même page que le dernier tableau)
      currentY = doc.lastAutoTable.finalY + 20;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("Réalisé par: ____________________________________", 14, currentY);
      currentY += 15;
      doc.text("Signature: ____________________________________", 14, currentY);

      // Télécharger le PDF
      doc.save(
        `Rapport_Planning_${new Date().toLocaleDateString("fr-FR")}.pdf`,
      );
    } finally {
      setSpinnerPdf(false);
    }
  };

  return (
    <div>
      <div className="flex flex-row justify-center gap-3">
        <Button
          variant="secondary"
          onClick={exportToExcel}
          className="flex justify-center items-center px-4 py-2 rounded active:bg-green-700 transition"
        >
          <Spinner
            show={spinner}
            size="small"
            className="text-white dark:text-slate-400"
          />
          Exporter vers Excel
        </Button>
        <Button
          variant="outline"
          onClick={exportToPdf}
          className="flex justify-center items-center px-4 py-2 rounded active:bg-red-700 transition"
        >
          <Spinner
            show={spinnerPdf}
            size="small"
            className="text-white dark:text-slate-400"
          />
          Exporter vers PDF
        </Button>
      </div>

      {/* Rapport Clients du mois */}
      <div className="flex flex-col gap-4 bg-gray-50 opacity-90 p-4 rounded-sm mt-2">
        <h2 className="font-bold text-xl">Rapport client de Planning</h2>

        {/* Tableau par sexe */}
        <h3 className="font-bold text-lg mt-2">Clients par sexe</h3>
        <Table className="border shadow-blue-300 shadow-md">
          <TableHeaderSection />
          <TableBody>
            <TableRow>
              <TableCell>Masculin</TableCell>
              {sexeRowsData.masculin.nuValues.map((value, index) => (
                <TableCell key={`nu-${index}`}>{value}</TableCell>
              ))}
              {sexeRowsData.masculin.auValues.map((value, index) => (
                <TableCell key={`au-${index}`}>{value}</TableCell>
              ))}
              <TableCell>{sexeRowsData.masculin.total}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Féminin</TableCell>
              {sexeRowsData.feminin.nuValues.map((value, index) => (
                <TableCell key={`nu-${index}`}>{value}</TableCell>
              ))}
              {sexeRowsData.feminin.auValues.map((value, index) => (
                <TableCell key={`au-${index}`}>{value}</TableCell>
              ))}
              <TableCell>{sexeRowsData.feminin.total}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <Separator className="bg-green-300" />

        {/* Tableau des indicateurs clients */}
        <h3 className="font-bold text-lg mt-2">Clients PF par méthode</h3>
        <Table className="border">
          <TableHeaderSection />
          <TableBody>
            {CLIENT_INDICATORS.map((indicator, index) => (
              <IndicatorRow
                key={index}
                indicator={indicator}
                clientData={clientData}
                ageRanges={ageRanges}
              />
            ))}
          </TableBody>
        </Table>

        <Separator className="bg-green-300" />

        {/* Tableau des services */}
        <h3 className="font-bold text-lg mt-2">Services PF</h3>
        <Table className="border">
          <TableHeaderSection />
          <TableBody>
            {SERVICE_INDICATORS.map((indicator, index) => (
              <IndicatorRow
                key={index}
                indicator={indicator}
                clientData={clientData}
                ageRanges={ageRanges}
              />
            ))}
          </TableBody>
        </Table>

        <Separator className="bg-green-300" />

        {/* Tableau des Produits PF distribués */}
        <h3 className="font-bold text-lg mt-2">Produits PF distribués</h3>
        <Table className="border">
          <TableHeaderSection />
          <TableBody>
            {allProduits
              .filter((p) => p.typeProduit === "CONTRACEPTIF")
              .map((produit) => {
                const getFacturesByVisiteId = (idVisite: string) =>
                  allFactureProduits.filter((f) => f.idVisite === idVisite);

                // Calcul par tranche d'âge pour NU
                const nuValues = ageRanges.map((range) =>
                  countProduitByOldSync(
                    clientData,
                    range.min,
                    range.max,
                    false,
                    produit.nomProduit,
                    "nu",
                    allProduits,
                    allTarifProduits,
                    allFactureProduits,
                    getFacturesByVisiteId,
                  ),
                );

                // Calcul par tranche d'âge pour AU
                const auValues = ageRanges.map((range) =>
                  countProduitByOldSync(
                    clientData,
                    range.min,
                    range.max,
                    false,
                    produit.nomProduit,
                    "au",
                    allProduits,
                    allTarifProduits,
                    allFactureProduits,
                    getFacturesByVisiteId,
                  ),
                );

                const total =
                  nuValues.reduce((a, b) => a + b, 0) +
                  auValues.reduce((a, b) => a + b, 0);

                return (
                  <TableRow key={produit.id}>
                    <TableCell>{produit.nomProduit}</TableCell>
                    {nuValues.map((value, index) => (
                      <TableCell key={`nu-${index}`}>{value}</TableCell>
                    ))}
                    {auValues.map((value, index) => (
                      <TableCell key={`au-${index}`}>{value}</TableCell>
                    ))}
                    <TableCell className="font-bold">{total}</TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>

        <Separator className="bg-green-300" />

        {/* Section Clients par méthode contraceptive */}
        <h3 className="font-bold text-lg mt-2">
          Clients par méthode contraceptive
        </h3>

        {/* Sous-section Protégés */}
        <h4 className="text-md font-semibold mt-2 text-green-700">Protégés</h4>
        <Table className="border mb-4">
          <TableHeader className="bg-green-100">
            <TableRow>
              <TableCell className="font-bold">Méthode</TableCell>
              <TableCell className="font-bold">-10 ans</TableCell>
              <TableCell className="font-bold">10-14 ans</TableCell>
              <TableCell className="font-bold">15-19 ans</TableCell>
              <TableCell className="font-bold">20-24 ans</TableCell>
              <TableCell className="font-bold">25+ ans</TableCell>
              <TableCell className="font-bold">Total</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(
              [
                "pilule",
                "noristera",
                "injectable",
                "implanon",
                "jadelle",
                "sterilet",
              ] as const
            ).map((method) => {
              const counts = [
                countByAgeAndMethod(convertedData.protege, 0, 9, method),
                countByAgeAndMethod(convertedData.protege, 10, 14, method),
                countByAgeAndMethod(convertedData.protege, 15, 19, method),
                countByAgeAndMethod(convertedData.protege, 20, 24, method),
                countByAgeAndMethod(convertedData.protege, 25, 120, method),
              ];
              const total = counts.reduce((a, b) => a + b, 0);
              const methodLabels: Record<string, string> = {
                pilule: "Pilule",
                noristera: "Injectable 2 mois",
                injectable: "Injectable 3 mois",
                implanon: "Implant 3 ans",
                jadelle: "Implant 5 ans",
                sterilet: "DIU",
              };
              return (
                <TableRow key={method}>
                  <TableCell>{methodLabels[method]}</TableCell>
                  {counts.map((count, idx) => (
                    <TableCell key={idx}>{count}</TableCell>
                  ))}
                  <TableCell className="font-bold">{total}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Sous-section Perdu de vue */}
        <h4 className="text-md font-semibold mt-2 text-orange-700">
          Perdu de vue (PDV)
        </h4>
        <Table className="border mb-4">
          <TableHeader className="bg-orange-100">
            <TableRow>
              <TableCell className="font-bold">Méthode</TableCell>
              <TableCell className="font-bold">-10 ans</TableCell>
              <TableCell className="font-bold">10-14 ans</TableCell>
              <TableCell className="font-bold">15-19 ans</TableCell>
              <TableCell className="font-bold">20-24 ans</TableCell>
              <TableCell className="font-bold">25+ ans</TableCell>
              <TableCell className="font-bold">Total</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(
              [
                "pilule",
                "noristera",
                "injectable",
                "implanon",
                "jadelle",
                "sterilet",
              ] as const
            ).map((method) => {
              const counts = [
                countByAgeAndMethod(convertedData.pdv, 0, 9, method),
                countByAgeAndMethod(convertedData.pdv, 10, 14, method),
                countByAgeAndMethod(convertedData.pdv, 15, 19, method),
                countByAgeAndMethod(convertedData.pdv, 20, 24, method),
                countByAgeAndMethod(convertedData.pdv, 25, 120, method),
              ];
              const total = counts.reduce((a, b) => a + b, 0);
              const methodLabels: Record<string, string> = {
                pilule: "Pilule",
                noristera: "Injectable 2 mois",
                injectable: "Injectable 3 mois",
                implanon: "Implant 3 ans",
                jadelle: "Implant 5 ans",
                sterilet: "DIU",
              };
              return (
                <TableRow key={method}>
                  <TableCell>{methodLabels[method]}</TableCell>
                  {counts.map((count, idx) => (
                    <TableCell key={idx}>{count}</TableCell>
                  ))}
                  <TableCell className="font-bold">{total}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Sous-section Abandon */}
        <h4 className="text-md font-semibold mt-2 text-red-700">Abandon</h4>
        <Table className="border mb-4">
          <TableHeader className="bg-red-100">
            <TableRow>
              <TableCell className="font-bold">Méthode</TableCell>
              <TableCell className="font-bold">-10 ans</TableCell>
              <TableCell className="font-bold">10-14 ans</TableCell>
              <TableCell className="font-bold">15-19 ans</TableCell>
              <TableCell className="font-bold">20-24 ans</TableCell>
              <TableCell className="font-bold">25+ ans</TableCell>
              <TableCell className="font-bold">Total</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(
              [
                "pilule",
                "noristera",
                "injectable",
                "implanon",
                "jadelle",
                "sterilet",
              ] as const
            ).map((method) => {
              const counts = [
                countByAgeAndMethod(convertedData.abandon, 0, 9, method),
                countByAgeAndMethod(convertedData.abandon, 10, 14, method),
                countByAgeAndMethod(convertedData.abandon, 15, 19, method),
                countByAgeAndMethod(convertedData.abandon, 20, 24, method),
                countByAgeAndMethod(convertedData.abandon, 25, 120, method),
              ];
              const total = counts.reduce((a, b) => a + b, 0);
              const methodLabels: Record<string, string> = {
                pilule: "Pilule",
                noristera: "Injectable 2 mois",
                injectable: "Injectable 3 mois",
                implanon: "Implant 3 ans",
                jadelle: "Implant 5 ans",
                sterilet: "DIU",
              };
              return (
                <TableRow key={method}>
                  <TableCell>{methodLabels[method]}</TableCell>
                  {counts.map((count, idx) => (
                    <TableCell key={idx}>{count}</TableCell>
                  ))}
                  <TableCell className="font-bold">{total}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Separator className="bg-green-300" />

        <h3 className="font-bold text-lg mt-2">
          Listing Clients Protégés du mois
        </h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell>Visite</TableCell>
              <TableCell>Nom</TableCell>
              <TableCell>Prénom</TableCell>
              <TableCell>Âge</TableCell>
              <TableCell>Sexe</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Court Durée</TableCell>
              <TableCell>Implanon</TableCell>
              <TableCell>Jadelle</TableCell>
              <TableCell>Stérilet</TableCell>
              <TableCell>RDV</TableCell>
              <TableCell>Protégés</TableCell>
              <TableCell>PDV</TableCell>
              <TableCell>Abandon</TableCell>
              <TableCell>Arrêt</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientDataProtege.map((client, index) => (
              <TableRow key={index}>
                <TableCell>{client.dateVisiste.toLocaleString()}</TableCell>
                <TableCell>{client.nom}</TableCell>
                <TableCell>{client.prenom}</TableCell>
                <TableCell>{client.age}</TableCell>
                <TableCell>{client.sexe}</TableCell>
                <TableCell>{client.statut}</TableCell>
                <TableCell>{client.courtDuree}</TableCell>
                <TableCell>{client.implanon}</TableCell>
                <TableCell>{client.jadelle}</TableCell>
                <TableCell>{client.sterilet}</TableCell>
                <TableCell>{client.rdvPf?.toLocaleDateString()}</TableCell>
                <TableCell>{client.protege ? "Oui" : "Non"}</TableCell>
                <TableCell>{client.perdueDeVue ? "Oui" : "Non"}</TableCell>
                <TableCell>{client.abandon ? "Oui" : "Non"}</TableCell>
                <TableCell>{client.arret ? "Oui" : "Non"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Fonction helper pour configurer l'en-tête de période dans Excel
function setupPeriodHeader(
  worksheet: Worksheet,
  dateDebut: DateType,
  dateFin: DateType,
  clinic: string,
) {
  worksheet.getCell("A3").value = "Période";
  worksheet.getCell("B3").value = new Date(dateDebut).toLocaleDateString(
    "fr-FR",
  );
  worksheet.getCell("B4").value = new Date(dateFin).toLocaleDateString("fr-FR");
  worksheet.getCell("D3").value = clinic;

  worksheet.mergeCells("A3:A4");
  worksheet.mergeCells("B3:C3");
  worksheet.mergeCells("B4:C4");
  worksheet.mergeCells("D3:J4");

  ["A3", "B3", "B4", "D3"].forEach((cellRef) => {
    const cell = worksheet.getCell(cellRef);
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.font = {
      bold: true,
      size: cellRef === "A3" || cellRef === "D3" ? 16 : 12,
    };
  });

  for (let row = 3; row <= 4; row++) {
    for (let col = 1; col <= 6; col++) {
      worksheet.getCell(row, col).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    }
  }
}

// Fonction utilitaire pour compter par âge et méthode
export const countByAgeAndMethod = (
  data: ConvertedClientStatus[],
  minAge: number,
  maxAge: number,
  method: keyof Pick<
    ConvertedClientStatus,
    "pilule" | "noristera" | "injectable" | "implanon" | "jadelle" | "sterilet"
  >,
): number => {
  return data.filter((item) => {
    const age = item.age;
    return item[method] === true && age >= minAge && age <= maxAge;
  }).length;
};
