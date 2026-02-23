"use client";

import { useEffect, useState } from "react";
import ExcelJS from "exceljs";
import { Worksheet } from "exceljs";
import { clientDataProps } from "../rapportPfActions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Spinner } from "../ui/spinner";
import { Button } from "../ui/button";
// Separator intentionally removed (unused)
import { ClientLaboType } from "@/lib/actions/rapportLaboActions";
import { Examen, TypeExamen } from "@prisma/client";
import { getAllExamen } from "@/lib/actions/examenActions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// types.ts ou en haut du fichier
type AgeRange = {
  min: number;
  max: number;
};

type convertedType = clientDataProps & {
  istEcoulementUretralIst: boolean;
  istDouleursTesticulairesIst: boolean;
  istEcoulementVaginalIst: boolean;
  istTypePecEtiologiqueIst: boolean;
  istTypePecSyndromiqueIst: boolean;
  istBubonInguinalIst: boolean;
  istPecEtiologiqueChancreMouIst: boolean;
  istDouleursAbdominalesBassesIst: boolean;
  istUlcerationGenitaleIst: boolean;
  istPecEtiologiqueCandidoseIst: boolean;

  laboClientVih: boolean;
  laboClientDepistageVih: boolean;
  laboClientChargeVirale: boolean;
  laboClientChargeCd4: boolean;
  laboClientNfsHemoglobine: boolean;
  laboClientTransaminases: boolean;
  laboClientUree: boolean;
  laboClientGlycemie: boolean;
  laboClientCreatinine: boolean;
};

type DateType = string | Date;

interface TableRapportGynecoProps {
  ageRanges: AgeRange[];
  clientAllData: clientDataProps[];
  clientData: Record<string, ClientLaboType[]>;
  dateDebut: DateType;
  dateFin: DateType;
  clinic: string;
}

// Configuration des types de laboratoire
const dataLaboVih = [
  {
    label: "SRV - LABO - VIH - Procédure d'échantillonnage",
    value: "laboClientVih",
  },
  {
    label:
      "SRV - LABO - VIH - Test rapides (MUREX - SUDS)/ Détermine - Bioline / Génie 3 - Starpack",
    value: "laboClientDepistageVih",
  },
  {
    label:
      "SRV - LABO - VIH - Evaluation de la fonction immunologique charge virale",
    value: "laboClientChargeVirale",
  },
  {
    label: "SRV - LABO - VIH - Evaluation de la fonction immunologique CD4",
    value: "laboClientChargeCd4",
  },
  {
    label: "SRV - LABO - VIH - NFS / Hémoglobine",
    value: "laboClientNfsHemoglobine",
  },
  {
    label: "SRV - LABO - VIH - Transaminases (ASAT/ALAT)",
    value: "laboClientTransaminases",
  },
  {
    label: "SRV - LABO - VIH - Urée",
    value: "laboClientUree",
  },
  {
    label: "SRV - LABO - VIH - Glycémie",
    value: "laboClientGlycemie",
  },
  {
    label: "SRV - LABO - VIH - Créatinine",
    value: "laboClientCreatinine",
  },
];

const laboTypesConfig = [
  // {
  //   key: "VIH",
  //   label:
  //     "Nombre de personnes reçues pour les Analyses Médicales liées au VIH",
  //   dataKey: "vihLabo" as const,
  // },
  {
    key: "IST",
    label:
      "Nombre de personnes reçues pour les Analyses Médicales liées au IST",
    dataKey: "istLabo" as const,
  },
  {
    key: "OBST",
    label:
      "Nombre de personnes reçues pour les Analyses Médicales liées à l'obstétrique",
    dataKey: "obstetriqueLabo" as const,
  },
  {
    key: "GYNE",
    label:
      "Nombre de personnes reçues pour les Analyses Médicales liées à la Gynécologie",
    dataKey: "gynecoLabo" as const,
  },
  {
    key: "MEDECIN",
    label:
      "Nombre de personnes reçues pour les Analyses Médicales liées au Soins Curatifs",
    dataKey: "medecineLabo" as const,
  },
];

// Style pour la colonne des libellés (limite la largeur et autorise le retour à la ligne)
const labelCellStyle: React.CSSProperties = {
  maxWidth: "450px",
  width: "450px",
  minWidth: "150px",
  whiteSpace: "normal",
  wordBreak: "break-word",
  overflowWrap: "break-word",
};

// Affiche "-" au lieu de 0 pour une meilleure lisibilité
const displayValue = (value: number) => (value === 0 ? "-" : value);

// Styles communs pour les cellules
const dataCellClass = "text-center border border-gray-200 px-2 py-1";
const totalCellClass = "text-center border border-gray-200 px-2 py-1 font-semibold";
const headerCellClass = "font-semibold text-center border border-gray-300";
const sectionHeaderClass = "font-bold bg-blue-50 text-blue-900 border border-gray-300";
const subTotalRowClass = "bg-amber-50 font-semibold";

export default function TableRapportLabo({
  ageRanges,
  clientAllData,
  clientData,
  dateDebut,
  dateFin,
  clinic,
}: TableRapportGynecoProps) {
  const [converted, setConverted] = useState<convertedType[]>([]);
  const [medecineLabo, setMedecineLabo] = useState<ClientLaboType[]>([]);
  const [vihLabo, setVihLabo] = useState<ClientLaboType[]>([]);
  const [istLabo, setIstLabo] = useState<ClientLaboType[]>([]);
  const [gynecoLabo, setGynecoLabo] = useState<ClientLaboType[]>([]);
  const [obstetriqueLabo, setObstetriqueLabo] = useState<ClientLaboType[]>([]);
  const [spinner, setSpinner] = useState(false);
  const [spinnerPdf, setSpinnerPdf] = useState(false);
  const [listeExamenVih, setListeExamenVih] = useState<Examen[]>([]);
  const [listeExamenObstetrique, setListeExamenObstetrique] = useState<
    Examen[]
  >([]);
  const [listeExamenIst, setListeExamenIst] = useState<Examen[]>([]);
  const [listeExamenGyneco, setListeExamenGyneco] = useState<Examen[]>([]);
  const [listeExamenMedecine, setListeExamenMedecine] = useState<Examen[]>([]);

  useEffect(() => {
    const fetchExamens = async () => {
      try {
        const response = await getAllExamen();
        setListeExamenVih(
          response.filter(
            (examen: Examen) => examen.typeExamen === TypeExamen.VIH
          )
        );
        setListeExamenObstetrique(
          response.filter(
            (examen: Examen) => examen.typeExamen === TypeExamen.OBSTETRIQUE
          )
        );

        setListeExamenIst(
          response.filter(
            (examen: Examen) => examen.typeExamen === TypeExamen.IST
          )
        );
        setListeExamenGyneco(
          response.filter(
            (examen: Examen) => examen.typeExamen === TypeExamen.GYNECOLOGIE
          )
        );
        setListeExamenMedecine(
          response.filter(
            (examen: Examen) => examen.typeExamen === TypeExamen.MEDECIN
          )
        );
      } catch (error) {
        console.error("Error fetching examens:", error);
      }
    };

    fetchExamens();
  }, []);

  useEffect(() => {
    if (!clientData || Object.keys(clientData).length === 0) {
      setConverted([]);
      setMedecineLabo([]);
      setVihLabo([]);
      setIstLabo([]);
      setGynecoLabo([]);
      setObstetriqueLabo([]);
      return;
    }

    if (clientAllData) {
      const newConverted = clientAllData.map((item) => ({
        ...item,
        // IST fields (default false)
        istEcoulementUretralIst: false,
        istDouleursTesticulairesIst: false,
        istEcoulementVaginalIst: false,
        istTypePecEtiologiqueIst: false,
        istTypePecSyndromiqueIst: false,
        istBubonInguinalIst: false,
        istPecEtiologiqueChancreMouIst: false,
        istDouleursAbdominalesBassesIst: false,
        istUlcerationGenitaleIst: false,
        istPecEtiologiqueCandidoseIst: false,
        // Labo VIH derived flags
        laboClientVih: item.examenPvVihConsultation || false,
        laboClientDepistageVih: !!item.examenPvVihCholesterolHdl,
        laboClientChargeVirale:
          (item.examenPvVihChargeVirale &&
            Number(item.examenPvVihChargeVirale) >= 0) ||
          false,
        laboClientChargeCd4:
          (item.examenPvVihCd4 && Number(item.examenPvVihCd4) >= 0) || false,
        laboClientNfsHemoglobine:
          (item.examenPvVihHemoglobineNfs &&
            item.examenPvVihHemoglobineNfs > 0) ||
          false,
        laboClientTransaminases:
          (item.examenPvVihTransaminases &&
            item.examenPvVihTransaminases > 0) ||
          false,
        laboClientUree:
          (item.examenPvVihUree && item.examenPvVihUree > 0) || false,
        laboClientGlycemie:
          (item.examenPvVihGlycemie && item.examenPvVihGlycemie > 0) || false,
        laboClientCreatinine:
          (item.examenPvVihCreatinemie && item.examenPvVihCreatinemie > 0) ||
          false,
      }));
      setConverted(newConverted);
    }

    setMedecineLabo(clientData["MEDECIN"] || []);
    setVihLabo(clientData["VIH"] || []);
    setIstLabo(clientData["IST"] || []);
    setGynecoLabo(clientData["GYNECOLOGIE"] || []);
    setObstetriqueLabo(clientData["OBSTETRIQUE"] || []);
  }, [clientData, clientAllData]);

  // Export to Excel using ExcelJS (inspiré du composant TableRapportSaa)
  async function exportToExcel() {
    setSpinner(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "ecmis";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Rapport_Labo");

      // === En-tête période ===
      worksheet.getCell("A3").value = "Période";
      worksheet.getCell("B3").value = new Date(dateDebut).toLocaleDateString(
        "fr-FR"
      );
      worksheet.getCell("B4").value = new Date(dateFin).toLocaleDateString(
        "fr-FR"
      );
      worksheet.getCell("D3").value = clinic;

      worksheet.mergeCells("A3:A4");
      worksheet.mergeCells("B3:C3");
      worksheet.mergeCells("B4:C4");
      worksheet.mergeCells("D3:J4");

      // Ajouter un logo (optionnel) depuis /public/logo
      try {
        const logoBase64 = await fetch("/LOGO_AIBEF_IPPF.png")
          .then((res) => res.blob())
          .then(
            (blob) =>
              new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              })
          );
        const imageId = workbook.addImage({
          base64: logoBase64,
          extension: "png",
        });
        worksheet.addImage(imageId, "B1:H2");
      } catch (err) {
        // ignore logo errors
        console.warn("Logo non trouvé ou erreur lors du chargement:", err);
      }

      // Largeur de colonne A
      worksheet.getColumn(1).width = 50;

      // Style entête
      ["A3", "B3", "B4", "D3"].forEach((cellRef) => {
        const cell = worksheet.getCell(cellRef);
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.font = {
          bold: true,
          size: cellRef === "A3" || cellRef === "D3" ? 14 : 12,
        };
      });

      // Bordure simple autour des cellules d'en-tête
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

      // Helpers pour écrire tableaux Excel au format attendu
      const writeTableHeader = (
        ws: Worksheet,
        startRow: number,
        colSpan: number
      ) => {
        // Ligne 1 fusion et titre champ Indicateurs
        ws.mergeCells(startRow, 1, startRow + 1, colSpan);
        ws.getCell(startRow, 1).value = "Indicateurs";

        // Masculin
        ws.mergeCells(
          startRow,
          colSpan + 1,
          startRow,
          colSpan + ageRanges.length
        );
        ws.getCell(startRow, colSpan + 1).value = "Masculin";

        // Feminin
        const femininStart = colSpan + ageRanges.length + 1;
        const femininEnd = femininStart + ageRanges.length - 1;
        ws.mergeCells(startRow, femininStart, startRow, femininEnd);
        ws.getCell(startRow, femininStart).value = "Féminin";

        // Total
        const totalColIndex = femininEnd + 1;
        ws.mergeCells(startRow, totalColIndex, startRow + 1, totalColIndex);
        ws.getCell(startRow, totalColIndex).value = "Total";

        // Age ranges on second row
        const headerRow2 = ws.getRow(startRow + 1);
        ageRanges.forEach((range, index) => {
          const label =
            range.max < 120
              ? `${range.min}-${range.max} ans`
              : `${range.min} ans et +`;
          headerRow2.getCell(colSpan + 1 + index).value = label;
          headerRow2.getCell(femininStart + index).value = label;
        });
      };

      // Appliquer styles basiques pour une zone de tableau
      const applyTableStyles = (
        ws: Worksheet,
        headerStart: number,
        lastRow: number,
        colCount: number
      ) => {
        try {
          // Header rows bold
          ws.getRow(headerStart).font = { bold: true } as Partial<ExcelJS.Font>;
          ws.getRow(headerStart + 1).font = {
            bold: true,
          } as Partial<ExcelJS.Font>;

          for (let r = headerStart; r <= lastRow; r++) {
            const row = ws.getRow(r);
            for (let c = 1; c <= colCount; c++) {
              const cell = row.getCell(c);
              // default alignment and wrap
              cell.alignment = {
                vertical: "middle",
                horizontal: "center",
                wrapText: true,
              } as Partial<ExcelJS.Alignment>;
              cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
              } as Partial<ExcelJS.Borders>;
            }
          }
        } catch (e) {
          // ignore styling errors
          console.warn("applyTableStyles error", e);
        }
      };

      const writeMainLaboTable = (ws: Worksheet, startRow: number): number => {
        // Écrire titre
        ws.getCell(startRow, 1).value = "Tableau - Types de laboratoire";
        ws.getCell(startRow, 1).font = { bold: true };
        const headerStart = startRow + 2;
        writeTableHeader(ws, headerStart, 1);

        let row = headerStart + 2;
        // Pour chaque laboType, écrire une ligne avec comptes
        for (const cfg of laboTypesConfig) {
          const data = laboDataMap[cfg.dataKey as keyof typeof laboDataMap] as
            | ClientLaboType[]
            | undefined;
          const masculinCounts = ageRanges.map((r) =>
            countClientBySexe(data || [], r.min, r.max, "Masculin")
          );
          const femininCounts = ageRanges.map((r) =>
            countClientBySexe(data || [], r.min, r.max, "Féminin")
          );
          const total =
            masculinCounts.reduce((s, v) => s + v, 0) +
            femininCounts.reduce((s, v) => s + v, 0);

          ws.getCell(row, 1).value = cfg.label;
          let col = 2;
          masculinCounts.forEach((v) => {
            ws.getCell(row, col++).value = excelVal(v);
          });
          femininCounts.forEach((v) => {
            ws.getCell(row, col++).value = excelVal(v);
          });
          ws.getCell(row, col).value = excelVal(total);
          row++;
        }

        // Apply styles for this table
        const colCount = 2 + ageRanges.length * 2;
        applyTableStyles(ws, headerStart, row - 1, colCount);

        return row; // next empty row
      };

      // Helper: écrire une valeur Excel (0 → "-")
      const excelVal = (v: number): string | number => (v === 0 ? "-" : v);

      const writeServiceProcedureTable = (
        ws: Worksheet,
        startRow: number,
        title: string,
        procedureLabel: string,
        dataArray: ClientLaboType[],
        examens: Examen[]
      ): number => {
        // Section title
        ws.getCell(startRow, 1).value = title;
        ws.getCell(startRow, 1).font = { bold: true };
        // Header
        const headerStart = startRow + 1;
        writeTableHeader(ws, headerStart, 1);

        // Procedure row
        let row = headerStart + 2;
        ws.getCell(row, 1).value = procedureLabel;
        let col = 2;
        ageRanges.forEach((range) => {
          ws.getCell(row, col++).value = excelVal(countClientBySexe(dataArray, range.min, range.max, "Masculin"));
        });
        ageRanges.forEach((range) => {
          ws.getCell(row, col++).value = excelVal(countClientBySexe(dataArray, range.min, range.max, "Féminin"));
        });
        ws.getCell(row, col).value = excelVal(calculateTotalByLaboType(dataArray));
        row++;

        // Exam details
        for (const examen of examens) {
          ws.getCell(row, 1).value = `SRV - LABO - ${title.split(" ")[2] || title} - ${examen.nomExamen}`;
          col = 2;
          ageRanges.forEach((range) => {
            ws.getCell(row, col++).value = excelVal(countClientBySexeAndExamenName(dataArray, examen.nomExamen, range.min, range.max, "Masculin"));
          });
          ageRanges.forEach((range) => {
            ws.getCell(row, col++).value = excelVal(countClientBySexeAndExamenName(dataArray, examen.nomExamen, range.min, range.max, "Féminin"));
          });
          const total = ageRanges.reduce(
            (s, r) =>
              s +
              countClientBySexeAndExamenName(dataArray, examen.nomExamen, r.min, r.max, "Masculin") +
              countClientBySexeAndExamenName(dataArray, examen.nomExamen, r.min, r.max, "Féminin"),
            0
          );
          ws.getCell(row, col).value = excelVal(total);
          row++;
        }

        // Sous-total row = somme des colonnes (procédure + examens)
        ws.getCell(row, 1).value = `Sous-total ${title}`;
        ws.getCell(row, 1).font = { bold: true };
        col = 2;
        let subTotalAll = 0;
        ageRanges.forEach((range) => {
          let v = countClientBySexe(dataArray, range.min, range.max, "Masculin");
          examens.forEach((ex) => { v += countClientBySexeAndExamenName(dataArray, ex.nomExamen, range.min, range.max, "Masculin"); });
          subTotalAll += v;
          ws.getCell(row, col).value = excelVal(v);
          ws.getCell(row, col).font = { bold: true };
          col++;
        });
        ageRanges.forEach((range) => {
          let v = countClientBySexe(dataArray, range.min, range.max, "Féminin");
          examens.forEach((ex) => { v += countClientBySexeAndExamenName(dataArray, ex.nomExamen, range.min, range.max, "Féminin"); });
          subTotalAll += v;
          ws.getCell(row, col).value = excelVal(v);
          ws.getCell(row, col).font = { bold: true };
          col++;
        });
        ws.getCell(row, col).value = excelVal(subTotalAll);
        ws.getCell(row, col).font = { bold: true };
        row++;

        // Apply styles for this service table
        const colCount = 2 + ageRanges.length * 2;
        applyTableStyles(ws, headerStart, row - 1, colCount);

        return row;
      };

      // Now write all tables sequentially
      let currentRow = 3;
      // deux lignes vides avant le tableau principal
      currentRow += 2;
      currentRow = writeMainLaboTable(worksheet, currentRow) + 1;

      // Detailed services
      // VIH section using tableExportWithSexe for indicators (uses converted)
      const countConvertedWrapper = (
        data: convertedType[],
        min: number,
        max: number,
        field: string,
        _value: boolean,
        sexe: "Masculin" | "Féminin"
      ): number => countConvertedBySex(data, min, max, field, sexe);

      // VIH: deux lignes vides puis table
      currentRow += 2;
      const startRowForVihHeader = currentRow;
      // Use colSpan = 1 for VIH so the "Indicateurs" label occupies only the first column
      // (keeps the same structure as other tables and avoids an empty gap)
      tableExportWithSexe(
        "VIH",
        worksheet,
        startRowForVihHeader,
        1,
        dataLaboVih as { label: string; value: string }[],
        ageRanges,
        converted,
        countConvertedWrapper
      );
      // compute last row used by tableExportWithSexe
      const lastVihDataRow = startRowForVihHeader + 1 + dataLaboVih.length;
      applyTableStyles(
        worksheet,
        startRowForVihHeader,
        lastVihDataRow,
        2 + ageRanges.length * 2
      );
      // No manual unmerge required when colSpan = 1 (keeps same layout as other tables)

      currentRow = lastVihDataRow + 1;

      // Add VIH exam details
      for (const examen of listeExamenVih) {
        // write a row similar to renderExamDetails
        worksheet.getCell(
          currentRow,
          1
        ).value = `SRV - LABO - VIH - ${examen.nomExamen}`;
        let col = 2;
        ageRanges.forEach((range) => {
          const m = countClientBySexeAndExamenName(
            clientAllData as unknown as ClientLaboType[],
            examen.nomExamen,
            range.min,
            range.max,
            "Masculin"
          );
          worksheet.getCell(currentRow, col++).value = m;
        });
        ageRanges.forEach((range) => {
          const f = countClientBySexeAndExamenName(
            clientAllData as unknown as ClientLaboType[],
            examen.nomExamen,
            range.min,
            range.max,
            "Féminin"
          );
          worksheet.getCell(currentRow, col++).value = f;
        });
        const total = ageRanges.reduce(
          (s, r) =>
            s +
            countClientBySexeAndExamenName(
              clientAllData as unknown as ClientLaboType[],
              examen.nomExamen,
              r.min,
              r.max,
              "Masculin"
            ) +
            countClientBySexeAndExamenName(
              clientAllData as unknown as ClientLaboType[],
              examen.nomExamen,
              r.min,
              r.max,
              "Féminin"
            ),
          0
        );
        worksheet.getCell(currentRow, col).value = total;
        currentRow++;
      }

      // IST
      currentRow += 2;
      currentRow =
        writeServiceProcedureTable(
          worksheet,
          currentRow,
          "SRV - LABO - IST",
          "SRV - LABO - IST - Procédures d'échantillonnage",
          istLabo,
          listeExamenIst
        ) + 1;

      // OBSTETRIQUE
      currentRow += 2;
      currentRow =
        writeServiceProcedureTable(
          worksheet,
          currentRow,
          "SRV - LABO - OBST",
          "SRV - LABO - OBST - Procédures d'échantillonnage",
          obstetriqueLabo,
          listeExamenObstetrique
        ) + 1;

      // GYNECO
      currentRow += 2;
      currentRow =
        writeServiceProcedureTable(
          worksheet,
          currentRow,
          "SRV - LABO - GYN",
          "SRV - LABO - GYN - Procédures d'échantillonnage",
          gynecoLabo,
          listeExamenGyneco
        ) + 1;

      // MEDECINE
      currentRow += 2;
      currentRow =
        writeServiceProcedureTable(
          worksheet,
          currentRow,
          "SRV - LABO - MG",
          "SRV - LABO - MG - Procédures d'échantillonnage",
          medecineLabo,
          listeExamenMedecine
        ) + 1;

      // TOTAL GÉNÉRAL = somme de tous les sous-totaux
      currentRow += 1;
      // Recalculer les sous-totaux de chaque section pour la somme
      const excelSectionSums: { m: number; f: number }[][] = [];
      // VIH
      const vihExcelSums = ageRanges.map((range) => {
        let m = 0, f = 0;
        dataLaboVih.forEach((item) => {
          m += countConvertedBySex(converted, range.min, range.max, item.value, "Masculin");
          f += countConvertedBySex(converted, range.min, range.max, item.value, "Féminin");
        });
        listeExamenVih.forEach((ex) => {
          m += countClientBySexeAndExamenName(clientAllData as unknown as ClientLaboType[], ex.nomExamen, range.min, range.max, "Masculin");
          f += countClientBySexeAndExamenName(clientAllData as unknown as ClientLaboType[], ex.nomExamen, range.min, range.max, "Féminin");
        });
        return { m, f };
      });
      excelSectionSums.push(vihExcelSums);
      // IST, OBST, GYN, MG
      const excelServiceSections: [ClientLaboType[], Examen[]][] = [
        [istLabo, listeExamenIst],
        [obstetriqueLabo, listeExamenObstetrique],
        [gynecoLabo, listeExamenGyneco],
        [medecineLabo, listeExamenMedecine],
      ];
      excelServiceSections.forEach(([data, examens]) => {
        excelSectionSums.push(ageRanges.map((range) => {
          let m = countClientBySexe(data, range.min, range.max, "Masculin");
          let f = countClientBySexe(data, range.min, range.max, "Féminin");
          examens.forEach((ex) => {
            m += countClientBySexeAndExamenName(data, ex.nomExamen, range.min, range.max, "Masculin");
            f += countClientBySexeAndExamenName(data, ex.nomExamen, range.min, range.max, "Féminin");
          });
          return { m, f };
        }));
      });

      worksheet.getCell(currentRow, 1).value = "TOTAL GÉNÉRAL";
      worksheet.getCell(currentRow, 1).font = { bold: true, size: 12 };
      let gtCol = 2;
      let gtAll = 0;
      ageRanges.forEach((_, i) => {
        const v = excelSectionSums.reduce((s, sec) => s + sec[i].m, 0);
        gtAll += v;
        const cell = worksheet.getCell(currentRow, gtCol++);
        cell.value = excelVal(v);
        cell.font = { bold: true };
      });
      ageRanges.forEach((_, i) => {
        const v = excelSectionSums.reduce((s, sec) => s + sec[i].f, 0);
        gtAll += v;
        const cell = worksheet.getCell(currentRow, gtCol++);
        cell.value = excelVal(v);
        cell.font = { bold: true };
      });
      const gtCell = worksheet.getCell(currentRow, gtCol);
      gtCell.value = excelVal(gtAll);
      gtCell.font = { bold: true, size: 12 };
      // Style pour la ligne total général
      for (let c = 1; c <= gtCol; c++) {
        const cell = worksheet.getCell(currentRow, c);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
        cell.font = { ...cell.font, color: { argb: "FFFFFFFF" }, bold: true };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      }

      // Générer et déclencher le téléchargement
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Rapport_Labo_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Erreur export Excel:", error);
    } finally {
      setSpinner(false);
    }
  }

  // Mappage des données
  const laboDataMap = {
    vihLabo,
    istLabo,
    obstetriqueLabo,
    gynecoLabo,
    medecineLabo,
  };

  // Fonction pour calculer le total pour une ligne
  const calculateTotal = (data: ClientLaboType[]) => {
    if (!Array.isArray(data) || data.length === 0) return 0;
    return data.length;
  };

  // Fonction pour calculer le total par type de labo
  // Accepte désormais un tableau optionnel et un second paramètre optionnel (clé du labo)
  const calculateTotalByLaboType = (data: ClientLaboType[] | undefined) => {
    if (!Array.isArray(data) || data.length === 0) return 0;
    return ageRanges.reduce((sum, range) => {
      const masculin = countClientBySexe(
        data,
        range.min,
        range.max,
        "Masculin"
      );
      const feminin = countClientBySexe(data, range.min, range.max, "Féminin");
      return sum + masculin + feminin;
    }, 0);
  };

  // Fonction pour rendre les lignes détaillées des examens
  const renderExamDetails = (
    laboData: ClientLaboType[] | clientDataProps[],
    examens: Examen[],
    laboType: string
  ) => {
    const clients = laboData as unknown as ClientLaboType[];

    return examens.map((examen, exIdx) => {
      const results = ageRanges.map((range) => ({
        masculin: countClientBySexeAndExamenName(clients, examen.nomExamen, range.min, range.max, "Masculin"),
        feminin: countClientBySexeAndExamenName(clients, examen.nomExamen, range.min, range.max, "Féminin"),
      }));
      const total = results.reduce((s, r) => s + r.masculin + r.feminin, 0);

      return (
        <TableRow key={`${laboType}-${examen.id}`} className={exIdx % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50/50 hover:bg-gray-100"}>
          <TableCell className="pl-8 font-medium border border-gray-200" style={labelCellStyle}>
            {`SRV - LABO - ${laboType} - ${examen.nomExamen}`}
          </TableCell>
          {results.map((r, i) => (
            <TableCell key={`m-${laboType}-${examen.id}-${i}`} className={dataCellClass}>{displayValue(r.masculin)}</TableCell>
          ))}
          {results.map((r, i) => (
            <TableCell key={`f-${laboType}-${examen.id}-${i}`} className={dataCellClass}>{displayValue(r.feminin)}</TableCell>
          ))}
          <TableCell className={totalCellClass}>{displayValue(total)}</TableCell>
        </TableRow>
      );
    });
  };

  // Sous-total = somme des colonnes (somme arithmétique de toutes les lignes de la section)
  const renderSubTotalRow = (label: string, columnSums: { masculin: number; feminin: number }[]) => {
    const total = columnSums.reduce((s, r) => s + r.masculin + r.feminin, 0);

    return (
      <TableRow className={subTotalRowClass}>
        <TableCell className="font-semibold border border-gray-200 pl-4" style={labelCellStyle}>
          {label}
        </TableCell>
        {columnSums.map((r, i) => (
          <TableCell key={`st-m-${label}-${i}`} className={totalCellClass}>{displayValue(r.masculin)}</TableCell>
        ))}
        {columnSums.map((r, i) => (
          <TableCell key={`st-f-${label}-${i}`} className={totalCellClass}>{displayValue(r.feminin)}</TableCell>
        ))}
        <TableCell className="text-center border border-gray-200 px-2 py-1 font-bold">{displayValue(total)}</TableCell>
      </TableRow>
    );
  };

  // Export to PDF using jsPDF
  const exportToPdf = async () => {
    setSpinnerPdf(true);
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Charger le logo
      let logoBase64 = "";
      try {
        const logoResponse = await fetch("/LOGO_AIBEF_IPPF.png");
        const logoBlob = await logoResponse.blob();
        logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(logoBlob);
        });
      } catch (err) {
        console.warn("Logo non trouvé:", err);
      }

      // Ajouter le logo (60% de la largeur, centré)
      if (logoBase64) {
        const logoWidth = pageWidth * 0.6;
        const logoHeight = 20;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(logoBase64, "PNG", logoX, 10, logoWidth, logoHeight);
      }

      // Détection du mois complet
      const debut = new Date(dateDebut);
      const fin = new Date(dateFin);
      const isFullMonth =
        debut.getDate() === 1 &&
        fin.getDate() ===
          new Date(fin.getFullYear(), fin.getMonth() + 1, 0).getDate() &&
        debut.getMonth() === fin.getMonth() &&
        debut.getFullYear() === fin.getFullYear();

      let periodeText: string;
      if (isFullMonth) {
        const moisNoms = [
          "JANVIER", "FEVRIER", "MARS", "AVRIL", "MAI", "JUIN",
          "JUILLET", "AOUT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DECEMBRE",
        ];
        periodeText = `${moisNoms[debut.getMonth()]} ${debut.getFullYear()}`;
      } else {
        periodeText = `${debut.toLocaleDateString("fr-FR")} - ${fin.toLocaleDateString("fr-FR")}`;
      }

      // Titre et période
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`Rapport Laboratoire - ${clinic}`, pageWidth / 2, 35, {
        align: "center",
      });
      doc.setFontSize(11);
      doc.text(`Période: ${periodeText}`, pageWidth / 2, 42, {
        align: "center",
      });

      let currentY = 50;

      // Génération des en-têtes pour les tableaux avec sexe
      const generateHeaders = () => {
        const headers = [
          [
            { content: "Indicateurs", rowSpan: 2 },
            { content: "Masculin", colSpan: ageRanges.length },
            { content: "Féminin", colSpan: ageRanges.length },
            { content: "Total", rowSpan: 2 },
          ],
          [
            ...ageRanges.map((r) =>
              r.max < 120 ? `${r.min}-${r.max}` : `${r.min}+`
            ),
            ...ageRanges.map((r) =>
              r.max < 120 ? `${r.min}-${r.max}` : `${r.min}+`
            ),
          ],
        ];
        return headers;
      };

      // Tableau 1: Types de laboratoire
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Rapport clients Laboratoire", 14, currentY);
      currentY += 5;

      const pdfVal = (v: number) => (v === 0 ? "-" : String(v));

      const laboTypeRows = laboTypesConfig.map((laboType) => {
        const data = laboDataMap[laboType.dataKey];
        const row = [laboType.label];
        ageRanges.forEach((range) => {
          row.push(pdfVal(countClientBySexe(data, range.min, range.max, "Masculin")));
        });
        ageRanges.forEach((range) => {
          row.push(pdfVal(countClientBySexe(data, range.min, range.max, "Féminin")));
        });
        row.push(pdfVal(calculateTotalByLaboType(data)));
        return row;
      });

      autoTable(doc, {
        startY: currentY,
        head: generateHeaders(),
        body: laboTypeRows,
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: "bold" },
        columnStyles: { 0: { cellWidth: 50 } },
      });

      currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

      // Tableau VIH avec indicateurs
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("VIH", 14, currentY);
      currentY += 5;

      const vihRows = dataLaboVih.map((item) => {
        const row = [item.label];
        ageRanges.forEach((range) => {
          row.push(pdfVal(countConvertedBySex(converted, range.min, range.max, item.value, "Masculin")));
        });
        ageRanges.forEach((range) => {
          row.push(pdfVal(countConvertedBySex(converted, range.min, range.max, item.value, "Féminin")));
        });
        const total = ageRanges.reduce(
          (sum, range) =>
            sum +
            countConvertedBySex(converted, range.min, range.max, item.value, "Masculin") +
            countConvertedBySex(converted, range.min, range.max, item.value, "Féminin"),
          0
        );
        row.push(pdfVal(total));
        return row;
      });

      // Ajouter les examens VIH détaillés
      listeExamenVih.forEach((examen) => {
        const row = [`SRV - LABO - VIH - ${examen.nomExamen}`];
        ageRanges.forEach((range) => {
          row.push(pdfVal(countClientBySexeAndExamenName(clientAllData as unknown as ClientLaboType[], examen.nomExamen, range.min, range.max, "Masculin")));
        });
        ageRanges.forEach((range) => {
          row.push(pdfVal(countClientBySexeAndExamenName(clientAllData as unknown as ClientLaboType[], examen.nomExamen, range.min, range.max, "Féminin")));
        });
        const total = ageRanges.reduce(
          (s, r) =>
            s +
            countClientBySexeAndExamenName(clientAllData as unknown as ClientLaboType[], examen.nomExamen, r.min, r.max, "Masculin") +
            countClientBySexeAndExamenName(clientAllData as unknown as ClientLaboType[], examen.nomExamen, r.min, r.max, "Féminin"),
          0
        );
        row.push(pdfVal(total));
        vihRows.push(row);
      });

      autoTable(doc, {
        startY: currentY,
        head: generateHeaders(),
        body: vihRows,
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: "bold" },
        columnStyles: { 0: { cellWidth: 50 } },
      });

      currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

      // Helper pour générer les tableaux de service
      const generateServiceTable = (
        title: string,
        data: ClientLaboType[],
        examens: Examen[]
      ) => {
        if (currentY > 180) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(title, 14, currentY);
        currentY += 5;

        const rows: string[][] = [];

        // Ligne principale du service
        const mainRow = [`SRV - LABO - ${title}`];
        ageRanges.forEach((range) => {
          mainRow.push(pdfVal(countClientBySexe(data, range.min, range.max, "Masculin")));
        });
        ageRanges.forEach((range) => {
          mainRow.push(pdfVal(countClientBySexe(data, range.min, range.max, "Féminin")));
        });
        mainRow.push(pdfVal(calculateTotal(data)));
        rows.push(mainRow);

        // Examens détaillés
        examens.forEach((examen) => {
          const row = [`SRV - LABO - ${title} - ${examen.nomExamen}`];
          ageRanges.forEach((range) => {
            row.push(pdfVal(countClientBySexeAndExamenName(data, examen.nomExamen, range.min, range.max, "Masculin")));
          });
          ageRanges.forEach((range) => {
            row.push(pdfVal(countClientBySexeAndExamenName(data, examen.nomExamen, range.min, range.max, "Féminin")));
          });
          const total = ageRanges.reduce(
            (s, r) =>
              s +
              countClientBySexeAndExamenName(data, examen.nomExamen, r.min, r.max, "Masculin") +
              countClientBySexeAndExamenName(data, examen.nomExamen, r.min, r.max, "Féminin"),
            0
          );
          row.push(pdfVal(total));
          rows.push(row);
        });

        // Sous-total row = somme des colonnes (procédure + examens)
        const subTotalRow = [`Sous-total ${title}`];
        let subAll = 0;
        ageRanges.forEach((range) => {
          let v = countClientBySexe(data, range.min, range.max, "Masculin");
          examens.forEach((ex) => { v += countClientBySexeAndExamenName(data, ex.nomExamen, range.min, range.max, "Masculin"); });
          subAll += v;
          subTotalRow.push(pdfVal(v));
        });
        ageRanges.forEach((range) => {
          let v = countClientBySexe(data, range.min, range.max, "Féminin");
          examens.forEach((ex) => { v += countClientBySexeAndExamenName(data, ex.nomExamen, range.min, range.max, "Féminin"); });
          subAll += v;
          subTotalRow.push(pdfVal(v));
        });
        subTotalRow.push(pdfVal(subAll));
        rows.push(subTotalRow);

        autoTable(doc, {
          startY: currentY,
          head: generateHeaders(),
          body: rows,
          theme: "grid",
          styles: { fontSize: 7, cellPadding: 1 },
          headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: "bold" },
          columnStyles: { 0: { cellWidth: 50 } },
        });

        currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      };

      // Générer les tableaux pour chaque service
      generateServiceTable("IST", istLabo, listeExamenIst);
      generateServiceTable("OBSTETRIQUE", obstetriqueLabo, listeExamenObstetrique);
      generateServiceTable("GYNECOLOGIE", gynecoLabo, listeExamenGyneco);
      generateServiceTable("MEDECINE", medecineLabo, listeExamenMedecine);

      // Total Général
      if (currentY > 180) {
        doc.addPage();
        currentY = 20;
      }
      // Recalculer les sous-totaux pour le PDF total général
      const pdfSectionSums: { m: number; f: number }[][] = [];
      // VIH
      pdfSectionSums.push(ageRanges.map((range) => {
        let m = 0, f = 0;
        dataLaboVih.forEach((item) => {
          m += countConvertedBySex(converted, range.min, range.max, item.value, "Masculin");
          f += countConvertedBySex(converted, range.min, range.max, item.value, "Féminin");
        });
        listeExamenVih.forEach((ex) => {
          m += countClientBySexeAndExamenName(clientAllData as unknown as ClientLaboType[], ex.nomExamen, range.min, range.max, "Masculin");
          f += countClientBySexeAndExamenName(clientAllData as unknown as ClientLaboType[], ex.nomExamen, range.min, range.max, "Féminin");
        });
        return { m, f };
      }));
      // IST, OBST, GYN, MG
      ([
        [istLabo, listeExamenIst],
        [obstetriqueLabo, listeExamenObstetrique],
        [gynecoLabo, listeExamenGyneco],
        [medecineLabo, listeExamenMedecine],
      ] as [ClientLaboType[], Examen[]][]).forEach(([data, examens]) => {
        pdfSectionSums.push(ageRanges.map((range) => {
          let m = countClientBySexe(data, range.min, range.max, "Masculin");
          let f = countClientBySexe(data, range.min, range.max, "Féminin");
          examens.forEach((ex) => {
            m += countClientBySexeAndExamenName(data, ex.nomExamen, range.min, range.max, "Masculin");
            f += countClientBySexeAndExamenName(data, ex.nomExamen, range.min, range.max, "Féminin");
          });
          return { m, f };
        }));
      });

      const gtRow = ["TOTAL GÉNÉRAL"];
      let gtPdfAll = 0;
      ageRanges.forEach((_, i) => {
        const v = pdfSectionSums.reduce((s, sec) => s + sec[i].m, 0);
        gtPdfAll += v;
        gtRow.push(pdfVal(v));
      });
      ageRanges.forEach((_, i) => {
        const v = pdfSectionSums.reduce((s, sec) => s + sec[i].f, 0);
        gtPdfAll += v;
        gtRow.push(pdfVal(v));
      });
      gtRow.push(pdfVal(gtPdfAll));

      autoTable(doc, {
        startY: currentY,
        body: [gtRow],
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2, fontStyle: "bold" },
        bodyStyles: { fillColor: [51, 65, 85], textColor: 255 },
        columnStyles: { 0: { cellWidth: 50 } },
      });

      // Section signature (même page que le dernier tableau)
      currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
      if (currentY > 180) {
        doc.addPage();
        currentY = 30;
      }
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Réalisé par: ____________________________", 14, currentY);
      doc.text("Signature: ____________________________", pageWidth - 100, currentY);

      doc.save(`Rapport_Labo_${new Date().toLocaleDateString("fr-FR")}.pdf`);
    } catch (error) {
      console.error("Erreur export PDF:", error);
    } finally {
      setSpinnerPdf(false);
    }
  };

  // Nombre total de colonnes
  const totalColSpan = 2 + ageRanges.length * 2;

  // Helper pour rendre une section de service (header + procédure + examens + sous-total)
  const renderServiceSection = (
    title: string,
    shortCode: string,
    data: ClientLaboType[],
    examens: Examen[],
  ) => {
    // Calculer les valeurs de chaque ligne pour pouvoir sommer les colonnes
    const procResults = ageRanges.map((range) => ({
      masculin: countClientBySexe(data, range.min, range.max, "Masculin"),
      feminin: countClientBySexe(data, range.min, range.max, "Féminin"),
    }));
    const procTotal = procResults.reduce((s, r) => s + r.masculin + r.feminin, 0);

    const examResults = examens.map((examen) =>
      ageRanges.map((range) => ({
        masculin: countClientBySexeAndExamenName(data, examen.nomExamen, range.min, range.max, "Masculin"),
        feminin: countClientBySexeAndExamenName(data, examen.nomExamen, range.min, range.max, "Féminin"),
      }))
    );

    // Sous-total = somme colonne par colonne (procédure + tous les examens)
    const columnSums = ageRanges.map((_, i) => {
      let m = procResults[i].masculin;
      let f = procResults[i].feminin;
      examResults.forEach((ex) => { m += ex[i].masculin; f += ex[i].feminin; });
      return { masculin: m, feminin: f };
    });

    return (
      <>
        {/* Header de section */}
        <TableRow>
          <TableCell colSpan={totalColSpan} className={sectionHeaderClass}>
            {title}
          </TableCell>
        </TableRow>
        {/* Ligne procédure d'échantillonnage */}
        <TableRow className="bg-white hover:bg-gray-50">
          <TableCell className="font-medium pl-4 border border-gray-200" style={labelCellStyle}>
            {`SRV - LABO - ${shortCode} - Procédures d'échantillonnage`}
          </TableCell>
          {procResults.map((r, i) => (
            <TableCell key={`proc-m-${shortCode}-${i}`} className={dataCellClass}>{displayValue(r.masculin)}</TableCell>
          ))}
          {procResults.map((r, i) => (
            <TableCell key={`proc-f-${shortCode}-${i}`} className={dataCellClass}>{displayValue(r.feminin)}</TableCell>
          ))}
          <TableCell className={totalCellClass}>{displayValue(procTotal)}</TableCell>
        </TableRow>
        {/* Examens détaillés */}
        {renderExamDetails(data, examens, shortCode)}
        {/* Sous-total = somme des colonnes */}
        {renderSubTotalRow(`Sous-total ${title}`, columnSums)}
      </>
    );
  };

  // Calculer les sous-totaux de chaque section (somme des colonnes)
  const computeSectionColumnSums = (data: ClientLaboType[], examens: Examen[]) => {
    return ageRanges.map((range) => {
      let m = countClientBySexe(data, range.min, range.max, "Masculin");
      let f = countClientBySexe(data, range.min, range.max, "Féminin");
      examens.forEach((examen) => {
        m += countClientBySexeAndExamenName(data, examen.nomExamen, range.min, range.max, "Masculin");
        f += countClientBySexeAndExamenName(data, examen.nomExamen, range.min, range.max, "Féminin");
      });
      return { masculin: m, feminin: f };
    });
  };

  const computeVihColumnSums = () => {
    return ageRanges.map((range) => {
      let m = 0, f = 0;
      dataLaboVih.forEach((item) => {
        m += countConvertedBySex(converted, range.min, range.max, item.value, "Masculin");
        f += countConvertedBySex(converted, range.min, range.max, item.value, "Féminin");
      });
      listeExamenVih.forEach((examen) => {
        m += countClientBySexeAndExamenName(clientAllData as unknown as ClientLaboType[], examen.nomExamen, range.min, range.max, "Masculin");
        f += countClientBySexeAndExamenName(clientAllData as unknown as ClientLaboType[], examen.nomExamen, range.min, range.max, "Féminin");
      });
      return { masculin: m, feminin: f };
    });
  };

  // Total général = somme de tous les sous-totaux section par section
  const sectionSums = [
    computeVihColumnSums(),
    computeSectionColumnSums(istLabo, listeExamenIst),
    computeSectionColumnSums(obstetriqueLabo, listeExamenObstetrique),
    computeSectionColumnSums(gynecoLabo, listeExamenGyneco),
    computeSectionColumnSums(medecineLabo, listeExamenMedecine),
  ];
  const grandTotalResults = ageRanges.map((_, i) => {
    let m = 0, f = 0;
    sectionSums.forEach((s) => { m += s[i].masculin; f += s[i].feminin; });
    return { masculin: m, feminin: f };
  });
  const grandTotal = grandTotalResults.reduce((s, r) => s + r.masculin + r.feminin, 0);

  return (
    <div className="flex flex-col gap-4 bg-gray-50 opacity-90 p-4 rounded-sm mt-2 w-full overflow-x-auto">
      <div className="flex gap-2 justify-center">
        <Button
          onClick={exportToExcel}
          type="button"
          disabled={spinner}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          <Spinner show={spinner} size={"small"} className="text-white dark:text-slate-400" />
          Exporter Excel
        </Button>
        <Button
          onClick={exportToPdf}
          type="button"
          disabled={spinnerPdf}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
        >
          <Spinner show={spinnerPdf} size={"small"} className="text-white dark:text-slate-400" />
          Exporter PDF
        </Button>
      </div>

      <h2 className="font-bold text-lg">Rapport clients Laboratoire</h2>

      {/* Table unique unifiée */}
      <Table className="border border-gray-300">
        <TableHeader className="bg-slate-100 sticky top-0 z-10">
          <TableRow>
            <TableHead rowSpan={2} className={`${headerCellClass} min-w-[250px]`} style={labelCellStyle}>
              Indicateurs
            </TableHead>
            <TableHead colSpan={ageRanges.length} className={`${headerCellClass} bg-blue-50`}>
              Masculin
            </TableHead>
            <TableHead colSpan={ageRanges.length} className={`${headerCellClass} bg-pink-50`}>
              Féminin
            </TableHead>
            <TableHead rowSpan={2} className={`${headerCellClass} min-w-[60px]`}>
              Total
            </TableHead>
          </TableRow>
          <TableRow className="bg-slate-200 text-center">
            {ageRanges.map((range, index) => (
              <TableHead key={`m-h-${index}`} className={`${headerCellClass} bg-blue-50/50 text-xs min-w-[55px]`}>
                {range.max < 120 ? `${range.min}-${range.max}` : `${range.min}+`}
              </TableHead>
            ))}
            {ageRanges.map((range, index) => (
              <TableHead key={`f-h-${index}`} className={`${headerCellClass} bg-pink-50/50 text-xs min-w-[55px]`}>
                {range.max < 120 ? `${range.min}-${range.max}` : `${range.min}+`}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* === Tableau résumé par type === */}
          <TableRow>
            <TableCell colSpan={totalColSpan} className="font-bold bg-slate-200 text-slate-800 border border-gray-300 text-center">
              Résumé par type de laboratoire
            </TableCell>
          </TableRow>
          {laboTypesConfig.map((laboType, idx) => {
            const data = laboDataMap[laboType.dataKey];
            const results = ageRanges.map((range) => ({
              masculin: countClientBySexe(data, range.min, range.max, "Masculin"),
              feminin: countClientBySexe(data, range.min, range.max, "Féminin"),
            }));
            const total = results.reduce((s, r) => s + r.masculin + r.feminin, 0);

            return (
              <TableRow key={laboType.key} className={idx % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50/50 hover:bg-gray-100"}>
                <TableCell className="font-medium border border-gray-200" style={labelCellStyle}>{laboType.label}</TableCell>
                {results.map((r, i) => (
                  <TableCell key={`sum-m-${laboType.key}-${i}`} className={dataCellClass}>{displayValue(r.masculin)}</TableCell>
                ))}
                {results.map((r, i) => (
                  <TableCell key={`sum-f-${laboType.key}-${i}`} className={dataCellClass}>{displayValue(r.feminin)}</TableCell>
                ))}
                <TableCell className={totalCellClass}>{displayValue(total)}</TableCell>
              </TableRow>
            );
          })}

          {/* === Section VIH (indicateurs spéciaux + examens) === */}
          <TableRow>
            <TableCell colSpan={totalColSpan} className={sectionHeaderClass}>
              VIH
            </TableCell>
          </TableRow>
          {dataLaboVih.map((item, idx) => {
            const results = ageRanges.map((range) => ({
              masculin: countConvertedBySex(converted, range.min, range.max, item.value, "Masculin"),
              feminin: countConvertedBySex(converted, range.min, range.max, item.value, "Féminin"),
            }));
            const total = results.reduce((s, r) => s + r.masculin + r.feminin, 0);

            return (
              <TableRow key={`vih-${item.value}`} className={idx % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50/50 hover:bg-gray-100"}>
                <TableCell className="font-medium pl-4 border border-gray-200" style={labelCellStyle}>
                  {item.label}
                </TableCell>
                {results.map((r, i) => (
                  <TableCell key={`vih-m-${item.value}-${i}`} className={dataCellClass}>{displayValue(r.masculin)}</TableCell>
                ))}
                {results.map((r, i) => (
                  <TableCell key={`vih-f-${item.value}-${i}`} className={dataCellClass}>{displayValue(r.feminin)}</TableCell>
                ))}
                <TableCell className={totalCellClass}>{displayValue(total)}</TableCell>
              </TableRow>
            );
          })}
          {renderExamDetails(clientAllData as unknown as ClientLaboType[], listeExamenVih, "VIH")}
          {(() => {
            // Sous-total VIH = somme des indicateurs converted + somme des examens VIH
            const vihColumnSums = ageRanges.map((range, i) => {
              let m = 0, f = 0;
              // Somme des lignes indicateurs VIH (converted)
              dataLaboVih.forEach((item) => {
                m += countConvertedBySex(converted, range.min, range.max, item.value, "Masculin");
                f += countConvertedBySex(converted, range.min, range.max, item.value, "Féminin");
              });
              // Somme des lignes examens VIH
              listeExamenVih.forEach((examen) => {
                m += countClientBySexeAndExamenName(clientAllData as unknown as ClientLaboType[], examen.nomExamen, range.min, range.max, "Masculin");
                f += countClientBySexeAndExamenName(clientAllData as unknown as ClientLaboType[], examen.nomExamen, range.min, range.max, "Féminin");
              });
              return { masculin: m, feminin: f };
            });
            return renderSubTotalRow("Sous-total VIH", vihColumnSums);
          })()}

          {/* === Sections IST / OBST / GYN / MG === */}
          {renderServiceSection("IST", "IST", istLabo, listeExamenIst)}
          {renderServiceSection("OBSTÉTRIQUE", "OBST", obstetriqueLabo, listeExamenObstetrique)}
          {renderServiceSection("GYNÉCOLOGIE", "GYN", gynecoLabo, listeExamenGyneco)}
          {renderServiceSection("MÉDECINE GÉNÉRALE", "MG", medecineLabo, listeExamenMedecine)}

          {/* === Total Général === */}
          <TableRow className="bg-slate-800 text-white">
            <TableCell className="font-bold border border-gray-400 pl-4" style={labelCellStyle}>
              TOTAL GÉNÉRAL
            </TableCell>
            {grandTotalResults.map((r, i) => (
              <TableCell key={`gt-m-${i}`} className="text-center border border-gray-400 px-2 py-1 font-bold">
                {displayValue(r.masculin)}
              </TableCell>
            ))}
            {grandTotalResults.map((r, i) => (
              <TableCell key={`gt-f-${i}`} className="text-center border border-gray-400 px-2 py-1 font-bold">
                {displayValue(r.feminin)}
              </TableCell>
            ))}
            <TableCell className="text-center border border-gray-400 px-2 py-1 font-bold text-lg">
              {displayValue(grandTotal)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

// Fonction d'export avec sexe
export function tableExportWithSexe(
  tableTitle: string,
  worksheet: Worksheet,
  startRow: number,
  colSpan: number,
  tabClient: { label: string; value: string }[],
  ageRanges: { min: number; max: number }[],
  clientData: convertedType[],
  countClientBySexe: (
    data: convertedType[],
    min: number,
    max: number,
    field: string,
    value: boolean,
    sexe: "Masculin" | "Féminin"
  ) => number
) {
  // === Titre du tableau ===
  worksheet.getCell(startRow - 1, 1).value = tableTitle;
  worksheet.getCell(startRow - 1, 1).font = { bold: true };

  // === En-tête du tableau ===
  // "Indicateurs" fusionne colSpan colonnes
  worksheet.mergeCells(startRow, 1, startRow + 1, colSpan);
  worksheet.getCell(startRow, 1).value = "Indicateurs";

  // Colonnes Masculin
  worksheet.mergeCells(
    startRow,
    colSpan + 1,
    startRow,
    colSpan + ageRanges.length
  );
  worksheet.getCell(startRow, colSpan + 1).value = "Masculin";

  // Colonnes Féminin
  const femininStart = colSpan + ageRanges.length + 1;
  const femininEnd = femininStart + ageRanges.length - 1;
  worksheet.mergeCells(startRow, femininStart, startRow, femininEnd);
  worksheet.getCell(startRow, femininStart).value = "Féminin";

  // Colonne Total
  const totalColIndex = femininEnd + 1;
  worksheet.mergeCells(startRow, totalColIndex, startRow + 1, totalColIndex);
  worksheet.getCell(startRow, totalColIndex).value = "Total";

  // === Deuxième ligne : tranches d'âge ===
  const headerRow2 = worksheet.getRow(startRow + 1);
  ageRanges.forEach((range, index) => {
    const label =
      range.max < 120
        ? `${range.min}-${range.max} ans`
        : `${range.min} ans et +`;
    headerRow2.getCell(colSpan + 1 + index).value = label; // Masculin
    headerRow2.getCell(femininStart + index).value = label; // Féminin
  });

  // === Données ===
  let currentRow = startRow + 2;
  tabClient.forEach((item) => {
    const row = worksheet.getRow(currentRow);

    // libellé indicateur
    worksheet.mergeCells(currentRow, 1, currentRow, colSpan);
    row.getCell(1).value = item.label;

    // Masculin
    ageRanges.forEach((range, index) => {
      row.getCell(colSpan + 1 + index).value = countClientBySexe(
        clientData,
        range.min,
        range.max,
        item.value,
        true,
        "Masculin"
      );
    });

    // Féminin
    ageRanges.forEach((range, index) => {
      row.getCell(femininStart + index).value = countClientBySexe(
        clientData,
        range.min,
        range.max,
        item.value,
        true,
        "Féminin"
      );
    });

    // Total (Masculin + Féminin sur toutes les tranches)
    const total = ageRanges.reduce(
      (sum, range) =>
        sum +
        countClientBySexe(
          clientData,
          range.min,
          range.max,
          item.value,
          true,
          "Masculin"
        ) +
        countClientBySexe(
          clientData,
          range.min,
          range.max,
          item.value,
          true,
          "Féminin"
        ),
      0
    );
    row.getCell(totalColIndex).value = total;

    currentRow++;
  });

  // === Styles basiques ===
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell((cell) => {
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });
}

export const countClientBySexe = (
  clientData: ClientLaboType[],
  minAge: number,
  maxAge: number,
  sexe: "Masculin" | "Féminin"
): number => {
  if (!Array.isArray(clientData) || clientData.length === 0) return 0;

  return clientData.reduce((acc, client) => {
    const ageCondition =
      client.ageClient !== null &&
      client.ageClient !== undefined &&
      client.ageClient >= minAge &&
      client.ageClient <= maxAge;
    const sexeCondition = client.sexeClient === sexe;

    return ageCondition && sexeCondition ? acc + 1 : acc;
  }, 0);
};

// ✅ Fonction pour compter le nombre de clients par sexe, tranche d'âge et nom d'examen - CORRIGÉE
export const countClientBySexeAndExamenName = (
  clientData: ClientLaboType[],
  examenName: string,
  minAge: number,
  maxAge: number,
  sexe: "Masculin" | "Féminin"
): number => {
  if (!Array.isArray(clientData) || clientData.length === 0) return 0;

  return clientData.reduce((acc, client) => {
    const ageCondition =
      client.ageClient !== null &&
      client.ageClient !== undefined &&
      client.ageClient >= minAge &&
      client.ageClient <= maxAge;

    const sexeCondition = client.sexeClient === sexe;

    // Vérification plus permissive des noms d'examens
    const examenCondition =
      Array.isArray(client.resultatsExamens) &&
      client.resultatsExamens.some((examen) => {
        if (!examen.libelleExamen) return false;

        // Normaliser les chaînes pour la comparaison
        const clientExamenName = examen.libelleExamen.trim().toLowerCase();
        const targetExamenName = examenName.trim().toLowerCase();

        // Plusieurs méthodes de matching
        return (
          clientExamenName === targetExamenName ||
          clientExamenName.includes(targetExamenName) ||
          targetExamenName.includes(clientExamenName)
        );
      });

    return ageCondition && sexeCondition && examenCondition ? acc + 1 : acc;
  }, 0);
};

// ✅ Fonction pour calculer le total (tous sexes confondus) d'un examen donné sur toutes les tranches d'âge - CORRIGÉE
export const calculateTotalByExamenName = (
  clientData: ClientLaboType[],
  examenName: string,
  minAge: number,
  maxAge: number
): number => {
  if (!Array.isArray(clientData) || clientData.length === 0) return 0;

  const totalMasculin = countClientBySexeAndExamenName(
    clientData,
    examenName,
    minAge,
    maxAge,
    "Masculin"
  );

  const totalFeminin = countClientBySexeAndExamenName(
    clientData,
    examenName,
    minAge,
    maxAge,
    "Féminin"
  );

  return totalMasculin + totalFeminin;
};

// Compte les occurrences d'une propriété booléenne dans `converted` par sexe et tranche d'âge
export const countConvertedBySex = (
  clientData: convertedType[],
  minAge: number,
  maxAge: number,
  field: string,
  sexe: "Masculin" | "Féminin"
): number => {
  if (!Array.isArray(clientData) || clientData.length === 0) return 0;

  return clientData.reduce((acc, client) => {
    const ageCondition = client.age >= minAge && client.age <= maxAge;
    // On suppose que le champ existe et est booléen ou convertible
    const value = client[field as keyof convertedType] as unknown;
    const truthy =
      value === true || value === "true" || value === 1 || value === "1";
    const sexeCondition = client.sexe === sexe;
    return ageCondition && sexeCondition && truthy ? acc + 1 : acc;
  }, 0);
};
