"use client";

import { useEffect, useState } from "react";
import ExcelJS from "exceljs";
import { Worksheet } from "exceljs";
import { clientDataProps } from "../rapportPfActions";
import {
  Table,
  TableBody,
  TableCell,
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

  if (clientData) console.log("clientData laboratoire ", clientData);

  useEffect(() => {
    if (listeExamenMedecine.length > 0) {
      console.log("listeExamenMedecine : ", listeExamenMedecine);
    }
    if (listeExamenObstetrique.length > 0) {
      console.log("listeExamenObstetrique : ", listeExamenObstetrique);
    }
  }, [listeExamenMedecine, listeExamenObstetrique]);

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
            ws.getCell(row, col++).value = v;
          });
          femininCounts.forEach((v) => {
            ws.getCell(row, col++).value = v;
          });
          ws.getCell(row, col).value = total;
          row++;
        }

        // Apply styles for this table
        const colCount = 2 + ageRanges.length * 2;
        applyTableStyles(ws, headerStart, row - 1, colCount);

        return row; // next empty row
      };

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
          ws.getCell(row, col++).value = countClientBySexe(
            dataArray,
            range.min,
            range.max,
            "Masculin"
          );
        });
        ageRanges.forEach((range) => {
          ws.getCell(row, col++).value = countClientBySexe(
            dataArray,
            range.min,
            range.max,
            "Féminin"
          );
        });
        ws.getCell(row, col).value = calculateTotalByLaboType(dataArray);
        row++;

        // Exam details
        for (const examen of examens) {
          ws.getCell(row, 1).value = `SRV - LABO - ${
            title.split(" ")[2] || title
          } - ${examen.nomExamen}`;
          col = 2;
          ageRanges.forEach((range) => {
            const m = countClientBySexeAndExamenName(
              dataArray,
              examen.nomExamen,
              range.min,
              range.max,
              "Masculin"
            );
            ws.getCell(row, col++).value = m;
          });
          ageRanges.forEach((range) => {
            const f = countClientBySexeAndExamenName(
              dataArray,
              examen.nomExamen,
              range.min,
              range.max,
              "Féminin"
            );
            ws.getCell(row, col++).value = f;
          });
          const total = ageRanges.reduce(
            (s, r) =>
              s +
              countClientBySexeAndExamenName(
                dataArray,
                examen.nomExamen,
                r.min,
                r.max,
                "Masculin"
              ) +
              countClientBySexeAndExamenName(
                dataArray,
                examen.nomExamen,
                r.min,
                r.max,
                "Féminin"
              ),
            0
          );
          ws.getCell(row, col).value = total;
          row++;
        }

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

  // Fonction pour rendre les lignes détaillées des examens - CORRIGÉE
  // Accepte soit les données spécifiques du labo (ClientLaboType[]) soit le tableau complet clientAllData
  const renderExamDetails = (
    laboData: ClientLaboType[] | clientDataProps[],
    examens: Examen[],
    laboType: string
  ) => {
    console.log(`🔍 DEBUG ${laboType}:`, {
      nbClients: laboData.length,
      nbExamens: examens.length,
      examensNames: examens.map((e) => e.nomExamen),
    });

    // Normaliser le type localement pour les opérations d'examen
    const clients = laboData as unknown as ClientLaboType[];
    // Vérifier les résultats d'examens des clients (casting sûr si la source comporte resultatsExamens)
    clients.forEach((client, clientIndex) => {
      const examensClient = (
        client as unknown as {
          resultatsExamens?: { libelleExamen?: string }[];
        }
      ).resultatsExamens;
      if (Array.isArray(examensClient) && examensClient.length > 0) {
        console.log(
          `Client ${clientIndex} examens:`,
          examensClient.map((e) => e.libelleExamen)
        );
      }
    });

    return examens.map((examen) => {
      const debugResults = ageRanges.map((range) => {
        const masculin = countClientBySexeAndExamenName(
          clients,
          examen.nomExamen,
          range.min,
          range.max,
          "Masculin"
        );
        const feminin = countClientBySexeAndExamenName(
          clients,
          examen.nomExamen,
          range.min,
          range.max,
          "Féminin"
        );
        return { range: `${range.min}-${range.max}`, masculin, feminin };
      });

      console.log(`📊 ${examen.nomExamen}:`, debugResults);

      return (
        <TableRow key={`${laboType}-${examen.id}`}>
          <TableCell className="pl-8 font-medium">
            {`SRV - LABO - ${laboType} - ${examen.nomExamen}`}
          </TableCell>

          {/* Colonnes "Masculin" */}
          {debugResults.map((result, index) => (
            <TableCell
              key={`masculin-${laboType}-${examen.id}-${index}`}
              className="text-center"
            >
              {result.masculin}
            </TableCell>
          ))}

          {/* Colonnes "Féminin" */}
          {debugResults.map((result, index) => (
            <TableCell
              key={`feminin-${laboType}-${examen.id}-${index}`}
              className="text-center"
            >
              {result.feminin}
            </TableCell>
          ))}

          {/* Colonne Total */}
          <TableCell className="text-center font-semibold">
            {debugResults.reduce(
              (sum, result) => sum + result.masculin + result.feminin,
              0
            )}
          </TableCell>
        </TableRow>
      );
    });
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

      const laboTypeRows = laboTypesConfig.map((laboType) => {
        const data = laboDataMap[laboType.dataKey];
        const row = [laboType.label];
        // Masculin
        ageRanges.forEach((range) => {
          row.push(
            String(countClientBySexe(data, range.min, range.max, "Masculin"))
          );
        });
        // Féminin
        ageRanges.forEach((range) => {
          row.push(
            String(countClientBySexe(data, range.min, range.max, "Féminin"))
          );
        });
        // Total
        row.push(String(calculateTotalByLaboType(data)));
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
        // Masculin
        ageRanges.forEach((range) => {
          row.push(
            String(countConvertedBySex(converted, range.min, range.max, item.value, "Masculin"))
          );
        });
        // Féminin
        ageRanges.forEach((range) => {
          row.push(
            String(countConvertedBySex(converted, range.min, range.max, item.value, "Féminin"))
          );
        });
        // Total
        const total = ageRanges.reduce(
          (sum, range) =>
            sum +
            countConvertedBySex(converted, range.min, range.max, item.value, "Masculin") +
            countConvertedBySex(converted, range.min, range.max, item.value, "Féminin"),
          0
        );
        row.push(String(total));
        return row;
      });

      // Ajouter les examens VIH détaillés
      listeExamenVih.forEach((examen) => {
        const row = [`SRV - LABO - VIH - ${examen.nomExamen}`];
        ageRanges.forEach((range) => {
          row.push(
            String(countClientBySexeAndExamenName(
              clientAllData as unknown as ClientLaboType[],
              examen.nomExamen,
              range.min,
              range.max,
              "Masculin"
            ))
          );
        });
        ageRanges.forEach((range) => {
          row.push(
            String(countClientBySexeAndExamenName(
              clientAllData as unknown as ClientLaboType[],
              examen.nomExamen,
              range.min,
              range.max,
              "Féminin"
            ))
          );
        });
        const total = ageRanges.reduce(
          (s, r) =>
            s +
            countClientBySexeAndExamenName(clientAllData as unknown as ClientLaboType[], examen.nomExamen, r.min, r.max, "Masculin") +
            countClientBySexeAndExamenName(clientAllData as unknown as ClientLaboType[], examen.nomExamen, r.min, r.max, "Féminin"),
          0
        );
        row.push(String(total));
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
          mainRow.push(String(countClientBySexe(data, range.min, range.max, "Masculin")));
        });
        ageRanges.forEach((range) => {
          mainRow.push(String(countClientBySexe(data, range.min, range.max, "Féminin")));
        });
        mainRow.push(String(calculateTotal(data)));
        rows.push(mainRow);

        // Examens détaillés
        examens.forEach((examen) => {
          const row = [`SRV - LABO - ${title} - ${examen.nomExamen}`];
          ageRanges.forEach((range) => {
            row.push(
              String(countClientBySexeAndExamenName(data, examen.nomExamen, range.min, range.max, "Masculin"))
            );
          });
          ageRanges.forEach((range) => {
            row.push(
              String(countClientBySexeAndExamenName(data, examen.nomExamen, range.min, range.max, "Féminin"))
            );
          });
          const total = ageRanges.reduce(
            (s, r) =>
              s +
              countClientBySexeAndExamenName(data, examen.nomExamen, r.min, r.max, "Masculin") +
              countClientBySexeAndExamenName(data, examen.nomExamen, r.min, r.max, "Féminin"),
            0
          );
          row.push(String(total));
          rows.push(row);
        });

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

  return (
    <div className="flex flex-col gap-4 bg-gray-50 opacity-90 p-4 rounded-sm mt-2 w-full overflow-x-auto">
      <div className="flex gap-2 justify-center">
        <Button
          onClick={exportToExcel}
          type="button"
          disabled={spinner}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          <Spinner
            show={spinner}
            size={"small"}
            className="text-white dark:text-slate-400"
          />
          Exporter Excel
        </Button>
        <Button
          onClick={exportToPdf}
          type="button"
          disabled={spinnerPdf}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
        >
          <Spinner
            show={spinnerPdf}
            size={"small"}
            className="text-white dark:text-slate-400"
          />
          Exporter PDF
        </Button>
      </div>

      <h2 className="font-bold">Rapport clients Laboratoire</h2>

      {/* Tableau principal des types de laboratoire */}
      <Table className="border">
        <TableHeader className="bg-gray-200">
          <TableRow>
            <TableCell rowSpan={2} className="font-bold">
              Indicateurs
            </TableCell>
            <TableCell
              colSpan={ageRanges.length}
              className="font-bold text-center border border-r-gray-400 border-l-gray-400"
            >
              Masculin
            </TableCell>
            <TableCell
              colSpan={ageRanges.length}
              className="font-bold text-center"
            >
              Féminin
            </TableCell>
            <TableCell rowSpan={2} className="font-bold">
              Total
            </TableCell>
          </TableRow>
          <TableRow className="bg-gray-300 text-center">
            {/* En-têtes Masculin */}
            {ageRanges.map((range, index) => (
              <TableCell
                key={`masculin-header-${index}`}
                className={
                  index === 0
                    ? "border border-l-gray-400"
                    : index === ageRanges.length - 1
                    ? "border border-r-gray-400"
                    : ""
                }
              >
                {range.max < 120
                  ? `${range.min}-${range.max} ans`
                  : `${range.min} ans et +`}
              </TableCell>
            ))}

            {/* En-têtes Féminin */}
            {ageRanges.map((range, index) => (
              <TableCell
                key={`feminin-header-${index}`}
                className={
                  index === ageRanges.length - 1
                    ? "border border-r-gray-400"
                    : ""
                }
              >
                {range.max < 120
                  ? `${range.min}-${range.max} ans`
                  : `${range.min} ans et +`}
              </TableCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {laboTypesConfig.map((laboType) => {
            const data = laboDataMap[laboType.dataKey];
            const total = calculateTotalByLaboType(data);

            return (
              <TableRow key={laboType.key}>
                <TableCell className="font-medium">{laboType.label}</TableCell>

                {/* Colonnes "Masculin" */}
                {ageRanges.map((range, index) => (
                  <TableCell
                    key={`masculin-${laboType.key}-${index}`}
                    className="text-center"
                  >
                    {countClientBySexe(data, range.min, range.max, "Masculin")}
                  </TableCell>
                ))}

                {/* Colonnes "Féminin" */}
                {ageRanges.map((range, index) => (
                  <TableCell
                    key={`feminin-${laboType.key}-${index}`}
                    className="text-center"
                  >
                    {countClientBySexe(data, range.min, range.max, "Féminin")}
                  </TableCell>
                ))}

                {/* Colonne Total */}
                <TableCell className="text-center font-semibold">
                  {total}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Section pour les statistiques Laboratoire détaillées */}
      <h2 className="font-bold mt-8">Détails des services Laboratoire</h2>
      <Table className="border">
        <TableHeader className="bg-gray-200">
          <TableRow>
            <TableCell rowSpan={2} className="font-bold">
              Services Laboratoire
            </TableCell>
            <TableCell
              colSpan={ageRanges.length}
              className="font-bold text-center border border-r-gray-400 border-l-gray-400"
            >
              Masculin
            </TableCell>
            <TableCell
              colSpan={ageRanges.length}
              className="font-bold text-center"
            >
              Féminin
            </TableCell>
            <TableCell rowSpan={2} className="font-bold">
              Total
            </TableCell>
          </TableRow>
          <TableRow className="bg-gray-300 text-center">
            {/* En-têtes Masculin */}
            {ageRanges.map((range, index) => (
              <TableCell
                key={`masculin-detail-header-${index}`}
                className={
                  index === 0
                    ? "border border-l-gray-400"
                    : index === ageRanges.length - 1
                    ? "border border-r-gray-400"
                    : ""
                }
              >
                {range.max < 120
                  ? `${range.min}-${range.max} ans`
                  : `${range.min} ans et +`}
              </TableCell>
            ))}

            {/* En-têtes Féminin */}
            {ageRanges.map((range, index) => (
              <TableCell
                key={`feminin-detail-header-${index}`}
                className={
                  index === ageRanges.length - 1
                    ? "border border-r-gray-400"
                    : ""
                }
              >
                {range.max < 120
                  ? `${range.min}-${range.max} ans`
                  : `${range.min} ans et +`}
              </TableCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Section VIH */}
          <TableRow className="bg-gray-100">
            <TableCell
              colSpan={2 + ageRanges.length * 2}
              className="font-bold bg-gray-200"
            >
              VIH
            </TableCell>
          </TableRow>
          {/* Render rows defined in dataLaboVih using converted flags */}
          {dataLaboVih.map((item) => (
            <TableRow key={`vih-item-${item.value}`}>
              <TableCell className="font-medium pl-4" style={labelCellStyle}>
                {item.label}
              </TableCell>

              {/* Masculin */}
              {ageRanges.map((range, index) => (
                <TableCell
                  key={`masculin-${item.value}-${index}`}
                  className="text-center"
                >
                  {countConvertedBySex(
                    converted,
                    range.min,
                    range.max,
                    item.value,
                    "Masculin"
                  )}
                </TableCell>
              ))}

              {/* Féminin */}
              {ageRanges.map((range, index) => (
                <TableCell
                  key={`feminin-${item.value}-${index}`}
                  className="text-center"
                >
                  {countConvertedBySex(
                    converted,
                    range.min,
                    range.max,
                    item.value,
                    "Féminin"
                  )}
                </TableCell>
              ))}

              {/* Total */}
              <TableCell className="text-center font-semibold">
                {ageRanges.reduce((sum, range) => {
                  const m = countConvertedBySex(
                    converted,
                    range.min,
                    range.max,
                    item.value,
                    "Masculin"
                  );
                  const f = countConvertedBySex(
                    converted,
                    range.min,
                    range.max,
                    item.value,
                    "Féminin"
                  );
                  return sum + m + f;
                }, 0)}
              </TableCell>
            </TableRow>
          ))}

          {/* Détails des examens VIH (utilise clientAllData comme source) */}
          {renderExamDetails(
            clientAllData as unknown as ClientLaboType[],
            listeExamenVih,
            "VIH"
          )}

          {/* Section IST */}
          <TableRow className="bg-gray-100">
            <TableCell
              colSpan={2 + ageRanges.length * 2}
              className="font-bold bg-gray-200"
            >
              IST
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium pl-4" style={labelCellStyle}>
              SRV - LABO - IST - Procédures {"d'échantillonnage"}
            </TableCell>
            {/* Colonnes "Masculin" */}
            {ageRanges.map((range, index) => (
              <TableCell
                key={`masculin-ist-procedure-${index}`}
                className="text-center"
              >
                {countClientBySexe(istLabo, range.min, range.max, "Masculin")}
              </TableCell>
            ))}

            {/* Colonnes "Féminin" */}
            {ageRanges.map((range, index) => (
              <TableCell
                key={`feminin-ist-procedure-${index}`}
                className="text-center"
              >
                {countClientBySexe(istLabo, range.min, range.max, "Féminin")}
              </TableCell>
            ))}

            {/* Colonne Total */}
            <TableCell className="text-center font-semibold">
              {calculateTotal(istLabo)}
            </TableCell>
          </TableRow>

          {/* Détails des examens IST */}
          {renderExamDetails(istLabo, listeExamenIst, "IST")}

          {/* Section OBSTÉTRIQUE */}
          <TableRow className="bg-gray-100">
            <TableCell
              colSpan={2 + ageRanges.length * 2}
              className="font-bold bg-gray-200"
            >
              OBSTÉTRIQUE
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium pl-4" style={labelCellStyle}>
              SRV - LABO - OBST - Procédures {"d'échantillonnage"}
            </TableCell>
            {/* Colonnes "Masculin" */}
            {ageRanges.map((range, index) => (
              <TableCell
                key={`masculin-obst-procedure-${index}`}
                className="text-center"
              >
                {countClientBySexe(
                  obstetriqueLabo,
                  range.min,
                  range.max,
                  "Masculin"
                )}
              </TableCell>
            ))}

            {/* Colonnes "Féminin" */}
            {ageRanges.map((range, index) => (
              <TableCell
                key={`feminin-obst-procedure-${index}`}
                className="text-center"
              >
                {countClientBySexe(
                  obstetriqueLabo,
                  range.min,
                  range.max,
                  "Féminin"
                )}
              </TableCell>
            ))}

            {/* Colonne Total */}
            <TableCell className="text-center font-semibold">
              {calculateTotal(obstetriqueLabo)}
            </TableCell>
          </TableRow>

          {/* Détails des examens OBSTÉTRIQUE */}
          {renderExamDetails(obstetriqueLabo, listeExamenObstetrique, "OBST")}

          {/* Section GYNÉCOLOGIE */}
          <TableRow className="bg-gray-100">
            <TableCell
              colSpan={2 + ageRanges.length * 2}
              className="font-bold bg-gray-200"
            >
              GYNÉCOLOGIE
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium pl-4" style={labelCellStyle}>
              SRV - LABO - GYN - Procédures {"d'échantillonnage"}
            </TableCell>
            {/* Colonnes "Masculin" */}
            {ageRanges.map((range, index) => (
              <TableCell
                key={`masculin-gyne-procedure-${index}`}
                className="text-center"
              >
                {countClientBySexe(
                  gynecoLabo,
                  range.min,
                  range.max,
                  "Masculin"
                )}
              </TableCell>
            ))}

            {/* Colonnes "Féminin" */}
            {ageRanges.map((range, index) => (
              <TableCell
                key={`feminin-gyne-procedure-${index}`}
                className="text-center"
              >
                {countClientBySexe(gynecoLabo, range.min, range.max, "Féminin")}
              </TableCell>
            ))}

            {/* Colonne Total */}
            <TableCell className="text-center font-semibold">
              {calculateTotal(gynecoLabo)}
            </TableCell>
          </TableRow>

          {/* Détails des examens GYNÉCOLOGIE */}
          {renderExamDetails(gynecoLabo, listeExamenGyneco, "GYN")}

          {/* Section MÉDECINE GÉNÉRALE */}
          <TableRow className="bg-gray-100">
            <TableCell
              colSpan={2 + ageRanges.length * 2}
              className="font-bold bg-gray-200"
            >
              MÉDECINE GÉNÉRALE
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium pl-4" style={labelCellStyle}>
              SRV - LABO - MG - Procédures {"d'échantillonnage"}
            </TableCell>
            {/* Colonnes "Masculin" */}
            {ageRanges.map((range, index) => (
              <TableCell
                key={`masculin-med-procedure-${index}`}
                className="text-center"
              >
                {countClientBySexe(
                  medecineLabo,
                  range.min,
                  range.max,
                  "Masculin"
                )}
              </TableCell>
            ))}

            {/* Colonnes "Féminin" */}
            {ageRanges.map((range, index) => (
              <TableCell
                key={`feminin-med-procedure-${index}`}
                className="text-center"
              >
                {countClientBySexe(
                  medecineLabo,
                  range.min,
                  range.max,
                  "Féminin"
                )}
              </TableCell>
            ))}

            {/* Colonne Total */}
            <TableCell className="text-center font-semibold">
              {calculateTotal(medecineLabo)}
            </TableCell>
          </TableRow>

          {/* Détails des examens MÉDECINE GÉNÉRALE */}
          {renderExamDetails(medecineLabo, listeExamenMedecine, "MG")}
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
