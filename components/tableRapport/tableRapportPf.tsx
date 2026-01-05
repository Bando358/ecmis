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
  countClientPfRetrait,
} from "../rapport/pf/pf";
import { ClientStatusInfo } from "@/lib/actions/rapportActions";
import { ClientData } from "../rapportPfActions";
import { useEffect, useState, useMemo, useCallback } from "react";
import ExcelJS from "exceljs";
import { Worksheet } from "exceljs";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { countProduitByOldSync } from "@/components/rapport/pf/pfProduit";
import { getAllProduits } from "@/lib/actions/produitActions";
import { getAllTarifProduitsByTabIclinique } from "@/lib/actions/tarifProduitActions";
import { getAllFactureProduitByIdVisiteByData } from "@/lib/actions/factureProduitActions";
import { FactureProduit, Produit, TarifProduit } from "@prisma/client";

// types.ts ou en haut du fichier
type ConvertedTypeProtege = Omit<
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
type ConvertedTypePDV = Omit<
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
type ConvertedTypeAbandon = Omit<
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

const ageRanges = [
  { min: 10, max: 14 },
  { min: 15, max: 19 },
  { min: 20, max: 24 },
  { min: 25, max: 120 },
];

const pfColumns = [
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
  const [allProduits, setAllProduits] = useState<Produit[]>([]);
  const [allFactureProduits, setAllFactureProduits] = useState<
    FactureProduit[]
  >([]);
  const [allTarifProduits, setAllTarifProduits] = useState<TarifProduit[]>([]);
  const [convertedProtege, setConvertedProtege] = useState<
    ConvertedTypeProtege[]
  >([]);
  const [convertedPDV, setConvertedPDV] = useState<ConvertedTypePDV[]>([]);
  const [convertedAbandon, setConvertedAbandon] = useState<
    ConvertedTypeAbandon[]
  >([]);

  // Mémoriser les IDs des cliniques pour éviter les re-rendus
  const clinicIdsString = useMemo(() => clinicIds.join(","), [clinicIds]);

  // Mémoriser les IDs des visites pour détecter les vrais changements
  const clientDataKey = useMemo(
    () => clientData.map((c) => c.idVisite).join(","),
    [clientData]
  );

  useEffect(() => {
    const newConvertProtege = clientDataProtege.map((client) => ({
      ...client,
      pilule: client.courtDuree === "pilule" && client.protege,
      noristera: client.courtDuree === "noristera" && client.protege,
      injectable: client.courtDuree === "injectable" && client.protege,
      implanon: client.implanon === "insertion" && client.protege,
      jadelle: client.jadelle === "insertion" && client.protege,
      sterilet: client.sterilet === "insertion" && client.protege,
    }));
    const newConvertPDV = clientDataProtege.map((client) => ({
      ...client,
      pilule: client.courtDuree === "pilule" && client.perdueDeVue,
      noristera: client.courtDuree === "noristera" && client.perdueDeVue,
      injectable: client.courtDuree === "injectable" && client.perdueDeVue,
      implanon: client.implanon === "insertion" && client.perdueDeVue,
      jadelle: client.jadelle === "insertion" && client.perdueDeVue,
      sterilet: client.sterilet === "insertion" && client.perdueDeVue,
    }));
    const newConvertAbandon = clientDataProtege.map((client) => ({
      ...client,
      pilule: client.courtDuree === "pilule" && client.abandon,
      noristera: client.courtDuree === "noristera" && client.abandon,
      injectable: client.courtDuree === "injectable" && client.abandon,
      implanon: client.implanon === "insertion" && client.abandon,
      jadelle: client.jadelle === "insertion" && client.abandon,
      sterilet: client.sterilet === "insertion" && client.abandon,
    }));
    setConvertedProtege(newConvertProtege);
    setConvertedPDV(newConvertPDV);
    setConvertedAbandon(newConvertAbandon);
  }, [clientDataProtege]);

  useEffect(() => {
    const fetchData = async () => {
      // Préparer les données d'abord
      const allProduit = await getAllProduits();
      const allTarifProduits = await getAllTarifProduitsByTabIclinique(
        clinicIds
      );

      const facture = await getAllFactureProduitByIdVisiteByData(clientData);

      setAllProduits(allProduit);
      setAllTarifProduits(allTarifProduits);
      setAllFactureProduits(facture);
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicIdsString, clientDataKey]);

  // Créer une fonction helper pour récupérer les factures par visite
  const getFacturesByVisiteId = useCallback(
    (idVisite: string) => {
      return allFactureProduits.filter(
        (facture) => facture.idVisite === idVisite
      );
    },
    [allFactureProduits]
  );

  const exportToExcel = async () => {
    setSpinner(true);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Planning");

    // AJOUTER UN LOGO A LA LIGNE DU HAUT
    // le logo se trouve dans le fichier public
    const logoBase64 = await fetch("/LOGO_AIBEF_IPPF.png")
      .then((res) => res.blob())
      .then((blob) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      });
    const imageId = workbook.addImage({
      base64: logoBase64 as string,
      extension: "png",
    });
    worksheet.addImage(imageId, "B1:H2");

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

    // Style entête
    ["A3", "B3", "B4", "D3"].forEach((cellRef) => {
      const cell = worksheet.getCell(cellRef);
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.font = {
        bold: true,
        size: cellRef === "A3" || cellRef === "D3" ? 16 : 12,
      };
    });

    // Bordure pour les cellules entête
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

    function setCellAlignment(
      worksheet: Worksheet,
      columns: string[],
      startRow: number,
      endRow: number,
      alignment: "left" | "center" | "right"
    ): void {
      for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
        for (const col of columns) {
          const cell = worksheet.getCell(`${col}${rowIndex}`);
          cell.alignment = { horizontal: alignment };
        }
      }
    }

    // ============ PREMIER TABLEAU ============

    const clientsPfSexe = (startRow: number, titre: string) => {
      worksheet.getCell(`A${startRow}`).value = titre;
      worksheet.mergeCells(`A${startRow}:J${startRow}`);
      worksheet.getRow(startRow).height = 20;

      const mergeHeaderRow = startRow + 1;
      const columnHeaderRow = startRow + 2;

      worksheet.getCell(`A${mergeHeaderRow}`).value = "";
      worksheet.getCell(`B${mergeHeaderRow}`).value = "Nouveau utilisateur";
      worksheet.getCell(`G${mergeHeaderRow}`).value = "Ancien utilisateur";

      worksheet.mergeCells(`A${mergeHeaderRow}:${"A"}${columnHeaderRow}`);
      worksheet.mergeCells(`B${mergeHeaderRow}:F${mergeHeaderRow}`);
      worksheet.mergeCells(`G${mergeHeaderRow}:K${mergeHeaderRow}`);
      worksheet.mergeCells(`L${mergeHeaderRow}:${"L"}${columnHeaderRow}`);

      worksheet.columns = pfColumns;

      const headerRow = worksheet.getRow(columnHeaderRow);
      headerRow.values = pfColumns.map((col) => col.header);
      headerRow.commit();

      const dataRows = [
        {
          indicateurs: "Masculin",
          moins10: countClientPf(clientData, 0, 9, "sexe", "Masculin", "nu"),
          "10a14": countClientPf(clientData, 10, 14, "sexe", "Masculin", "nu"),
          "15a19": countClientPf(clientData, 15, 19, "sexe", "Masculin", "nu"),
          "20a24": countClientPf(clientData, 20, 24, "sexe", "Masculin", "nu"),
          "25plus": countClientPf(
            clientData,
            25,
            100,
            "sexe",
            "Masculin",
            "nu"
          ),
          moins10_au: countClientPf(clientData, 0, 9, "sexe", "Masculin", "au"),
          "10a14_au": countClientPf(
            clientData,
            10,
            14,
            "sexe",
            "Masculin",
            "au"
          ),
          "15a19_au": countClientPf(
            clientData,
            15,
            19,
            "sexe",
            "Masculin",
            "au"
          ),
          "20a24_au": countClientPf(
            clientData,
            20,
            24,
            "sexe",
            "Masculin",
            "au"
          ),
          "25plus_au": countClientPf(
            clientData,
            25,
            100,
            "sexe",
            "Masculin",
            "au"
          ),
          total: ageRanges.reduce(
            (sum, range) =>
              sum +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "sexe",
                "Masculin",
                "nu"
              ) +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "sexe",
                "Masculin",
                "au"
              ),
            0
          ),
        },
        {
          indicateurs: "Féminin",
          moins10: countClientPf(clientData, 0, 9, "sexe", "Féminin", "nu"),
          "10a14": countClientPf(clientData, 10, 14, "sexe", "Féminin", "nu"),
          "15a19": countClientPf(clientData, 15, 19, "sexe", "Féminin", "nu"),
          "20a24": countClientPf(clientData, 20, 24, "sexe", "Féminin", "nu"),
          "25plus": countClientPf(clientData, 25, 100, "sexe", "Féminin", "nu"),
          moins10_au: countClientPf(clientData, 0, 9, "sexe", "Féminin", "au"),
          "10a14_au": countClientPf(
            clientData,
            10,
            14,
            "sexe",
            "Féminin",
            "au"
          ),
          "15a19_au": countClientPf(
            clientData,
            15,
            19,
            "sexe",
            "Féminin",
            "au"
          ),
          "20a24_au": countClientPf(
            clientData,
            20,
            24,
            "sexe",
            "Féminin",
            "au"
          ),
          "25plus_au": countClientPf(
            clientData,
            25,
            100,
            "sexe",
            "Féminin",
            "au"
          ),
          total: ageRanges.reduce(
            (sum, range) =>
              sum +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "sexe",
                "Féminin",
                "nu"
              ) +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "sexe",
                "Féminin",
                "au"
              ),
            0
          ),
        },
      ];

      dataRows.forEach((row) => worksheet.addRow(row));

      // Style
      for (
        let i = mergeHeaderRow;
        i <= columnHeaderRow + dataRows.length;
        i++
      ) {
        worksheet.getRow(i).eachCell((cell) => {
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
          if (i === mergeHeaderRow || i === columnHeaderRow) {
            cell.font = { bold: true };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "EEEEEE" },
            };
          }
        });
      }

      return columnHeaderRow + dataRows.length + 2; // prochaine ligne de départ
    };
    clientsPfSexe(6, "Clients par sexe");

    // ============ Deuxième TABLEAU ============

    const clientsPf = (startRow: number, titre: string) => {
      worksheet.getCell(`A${startRow}`).value = titre;
      worksheet.mergeCells(`A${startRow}:J${startRow}`);
      worksheet.getRow(startRow).height = 20;

      const mergeHeaderRow = startRow + 1;
      const columnHeaderRow = startRow + 2;

      worksheet.getCell(`A${mergeHeaderRow}`).value = "";
      worksheet.getCell(`B${mergeHeaderRow}`).value = "Nouveau utilisateur";
      worksheet.getCell(`G${mergeHeaderRow}`).value = "Ancien utilisateur";

      worksheet.mergeCells(`A${mergeHeaderRow}:${"A"}${columnHeaderRow}`);
      worksheet.mergeCells(`B${mergeHeaderRow}:F${mergeHeaderRow}`);
      worksheet.mergeCells(`G${mergeHeaderRow}:K${mergeHeaderRow}`);
      worksheet.mergeCells(`L${mergeHeaderRow}:${"L"}${columnHeaderRow}`);

      worksheet.columns = pfColumns;

      const headerRow = worksheet.getRow(columnHeaderRow);
      headerRow.values = pfColumns.map((col) => col.header);
      headerRow.commit();

      const dataRows = [
        {
          indicateurs: "CLT - PF - Pilules",
          moins10: countClientPf(
            clientData,
            0,
            9,
            "courtDuree",
            "pilule",
            "nu"
          ),
          "10a14": countClientPf(
            clientData,
            10,
            14,
            "courtDuree",
            "pilule",
            "nu"
          ),
          "15a19": countClientPf(
            clientData,
            15,
            19,
            "courtDuree",
            "pilule",
            "nu"
          ),
          "20a24": countClientPf(
            clientData,
            20,
            24,
            "courtDuree",
            "pilule",
            "nu"
          ),
          "25plus": countClientPf(
            clientData,
            25,
            100,
            "courtDuree",
            "pilule",
            "nu"
          ),
          moins10_au: countClientPf(
            clientData,
            0,
            9,
            "courtDuree",
            "pilule",
            "au"
          ),
          "10a14_au": countClientPf(
            clientData,
            10,
            14,
            "courtDuree",
            "pilule",
            "au"
          ),
          "15a19_au": countClientPf(
            clientData,
            15,
            19,
            "courtDuree",
            "pilule",
            "au"
          ),
          "20a24_au": countClientPf(
            clientData,
            20,
            24,
            "courtDuree",
            "pilule",
            "au"
          ),

          "25plus_au": countClientPf(
            clientData,
            25,
            100,
            "courtDuree",
            "pilule",
            "au"
          ),
          total: ageRanges.reduce(
            (sum, range) =>
              sum +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "courtDuree",
                "pilule",
                "nu"
              ) +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "courtDuree",
                "pilule",
                "au"
              ),
            0
          ),
        },
        {
          indicateurs: "CLT - PF - Injectable 2 mois",
          moins10: countClientPf(
            clientData,
            0,
            9,
            "courtDuree",
            "noristera",
            "nu"
          ),
          "10a14": countClientPf(
            clientData,
            10,
            14,
            "courtDuree",
            "noristera",
            "nu"
          ),
          "15a19": countClientPf(
            clientData,
            15,
            19,
            "courtDuree",
            "noristera",
            "nu"
          ),
          "20a24": countClientPf(
            clientData,
            20,
            24,
            "courtDuree",
            "noristera",
            "nu"
          ),
          "25plus": countClientPf(
            clientData,
            25,
            100,
            "courtDuree",
            "noristera",
            "nu"
          ),
          moins10_au: countClientPf(
            clientData,
            0,
            9,
            "courtDuree",
            "noristera",
            "au"
          ),
          "10a14_au": countClientPf(
            clientData,
            10,
            14,
            "courtDuree",
            "noristera",
            "au"
          ),
          "15a19_au": countClientPf(
            clientData,
            15,
            19,
            "courtDuree",
            "noristera",
            "au"
          ),
          "20a24_au": countClientPf(
            clientData,
            20,
            24,
            "courtDuree",
            "noristera",
            "au"
          ),

          "25plus_au": countClientPf(
            clientData,
            25,
            100,
            "courtDuree",
            "noristera",
            "au"
          ),
          total: ageRanges.reduce(
            (sum, range) =>
              sum +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "courtDuree",
                "noristera",
                "nu"
              ) +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "courtDuree",
                "noristera",
                "au"
              ),
            0
          ),
        },
        {
          indicateurs: "CLT - PF - Injectable 3 mois",
          moins10: countClientPf(
            clientData,
            0,
            9,
            "courtDuree",
            "injectable",
            "nu"
          ),
          "10a14": countClientPf(
            clientData,
            10,
            14,
            "courtDuree",
            "injectable",
            "nu"
          ),
          "15a19": countClientPf(
            clientData,
            15,
            19,
            "courtDuree",
            "injectable",
            "nu"
          ),
          "20a24": countClientPf(
            clientData,
            20,
            24,
            "courtDuree",
            "injectable",
            "nu"
          ),
          "25plus": countClientPf(
            clientData,
            25,
            100,
            "courtDuree",
            "injectable",
            "nu"
          ),
          moins10_au: countClientPf(
            clientData,
            0,
            9,
            "courtDuree",
            "injectable",
            "au"
          ),
          "10a14_au": countClientPf(
            clientData,
            10,
            14,
            "courtDuree",
            "injectable",
            "au"
          ),
          "15a19_au": countClientPf(
            clientData,
            15,
            19,
            "courtDuree",
            "injectable",
            "au"
          ),
          "20a24_au": countClientPf(
            clientData,
            20,
            24,
            "courtDuree",
            "injectable",
            "au"
          ),

          "25plus_au": countClientPf(
            clientData,
            25,
            100,
            "courtDuree",
            "injectable",
            "au"
          ),
          total: ageRanges.reduce(
            (sum, range) =>
              sum +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "courtDuree",
                "injectable",
                "nu"
              ) +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "courtDuree",
                "injectable",
                "au"
              ),
            0
          ),
        },
        {
          indicateurs: "CLT - PF - DIU - 10 ans (Insertion & Contrôle) ",
          moins10: countClientPfInsertionAndControl(
            clientData,
            0,
            9,
            "sterilet",
            "nu"
          ),
          "10a14": countClientPfInsertionAndControl(
            clientData,
            10,
            14,
            "sterilet",
            "nu"
          ),
          "15a19": countClientPfInsertionAndControl(
            clientData,
            15,
            19,
            "sterilet",
            "nu"
          ),
          "20a24": countClientPfInsertionAndControl(
            clientData,
            20,
            24,
            "sterilet",
            "nu"
          ),
          "25plus": countClientPfInsertionAndControl(
            clientData,
            25,
            100,
            "sterilet",
            "nu"
          ),
          moins10_au: countClientPfInsertionAndControl(
            clientData,
            0,
            9,
            "sterilet",
            "au"
          ),
          "10a14_au": countClientPfInsertionAndControl(
            clientData,
            10,
            14,
            "sterilet",
            "au"
          ),
          "15a19_au": countClientPfInsertionAndControl(
            clientData,
            15,
            19,
            "sterilet",
            "au"
          ),
          "20a24_au": countClientPfInsertionAndControl(
            clientData,
            20,
            24,
            "sterilet",
            "au"
          ),

          "25plus_au": countClientPfInsertionAndControl(
            clientData,
            25,
            100,
            "sterilet",
            "au"
          ),
          total: ageRanges.reduce(
            (sum, range) =>
              sum +
              countClientPfInsertionAndControl(
                clientData,
                range.min,
                range.max,
                "sterilet",
                "nu"
              ) +
              countClientPfInsertionAndControl(
                clientData,
                range.min,
                range.max,
                "sterilet",
                "au"
              ),
            0
          ),
        },
        {
          indicateurs: "CLT - PF - DIU 10 ans - Retrait",
          moins10: countClientPfRetrait(
            clientData,
            0,
            9,
            "retraitSterilet",
            true,
            "au"
          ),
          "10a14": countClientPfRetrait(
            clientData,
            10,
            14,
            "retraitSterilet",
            true,
            "au"
          ),
          "15a19": countClientPfRetrait(
            clientData,
            15,
            19,
            "retraitSterilet",
            true,
            "nu"
          ),
          "20a24": countClientPfRetrait(
            clientData,
            20,
            24,
            "retraitSterilet",
            true,
            "nu"
          ),
          "25plus": countClientPfRetrait(
            clientData,
            25,
            100,
            "retraitSterilet",
            true,
            "nu"
          ),
          moins10_au: countClientPfRetrait(
            clientData,
            0,
            9,
            "retraitSterilet",
            true,
            "au"
          ),
          "10a14_au": countClientPfRetrait(
            clientData,
            10,
            14,
            "retraitSterilet",
            true,
            "au"
          ),
          "15a19_au": countClientPfRetrait(
            clientData,
            15,
            19,
            "retraitSterilet",
            true,
            "au"
          ),
          "20a24_au": countClientPfRetrait(
            clientData,
            20,
            24,
            "retraitSterilet",
            true,
            "au"
          ),
          "25plus_au": countClientPfRetrait(
            clientData,
            25,
            100,
            "retraitSterilet",
            true,
            "au"
          ),
          total: ageRanges.reduce(
            (sum, range) =>
              sum +
              countClientPfRetrait(
                clientData,
                range.min,
                range.max,
                "retraitSterilet",
                true,
                "nu"
              ) +
              countClientPfRetrait(
                clientData,
                range.min,
                range.max,
                "retraitSterilet",
                true,
                "au"
              ),
            0
          ),
        },
        {
          indicateurs: "CLT - PF - Implant - 3 ans (Insertion & Contrôle)",
          moins10: countClientPfInsertionAndControl(
            clientData,
            0,
            9,
            "implanon",
            "nu"
          ),
          "10a14": countClientPfInsertionAndControl(
            clientData,
            10,
            14,
            "implanon",
            "nu"
          ),
          "15a19": countClientPfInsertionAndControl(
            clientData,
            15,
            19,
            "implanon",
            "nu"
          ),
          "20a24": countClientPfInsertionAndControl(
            clientData,
            20,
            24,
            "implanon",
            "nu"
          ),
          "25plus": countClientPfInsertionAndControl(
            clientData,
            25,
            100,
            "implanon",
            "nu"
          ),
          moins10_au: countClientPfInsertionAndControl(
            clientData,
            0,
            9,
            "implanon",
            "au"
          ),
          "10a14_au": countClientPfInsertionAndControl(
            clientData,
            10,
            14,
            "implanon",
            "au"
          ),
          "15a19_au": countClientPfInsertionAndControl(
            clientData,
            15,
            19,
            "implanon",
            "au"
          ),
          "20a24_au": countClientPfInsertionAndControl(
            clientData,
            20,
            24,
            "implanon",
            "au"
          ),

          "25plus_au": countClientPfInsertionAndControl(
            clientData,
            25,
            100,
            "implanon",
            "au"
          ),
          total: ageRanges.reduce(
            (sum, range) =>
              sum +
              countClientPfInsertionAndControl(
                clientData,
                range.min,
                range.max,
                "implanon",
                "nu"
              ) +
              countClientPfInsertionAndControl(
                clientData,
                range.min,
                range.max,
                "implanon",
                "au"
              ),
            0
          ),
        },
        {
          indicateurs: "CLT - PF - Implant - 3 ans - Retrait",
          moins10: countClientPfRetrait(
            clientData,
            0,
            9,
            "retraitImplanon",
            true,
            "au"
          ),
          "10a14": countClientPfRetrait(
            clientData,
            10,
            14,
            "retraitImplanon",
            true,
            "au"
          ),
          "15a19": countClientPfRetrait(
            clientData,
            15,
            19,
            "retraitImplanon",
            true,
            "nu"
          ),
          "20a24": countClientPfRetrait(
            clientData,
            20,
            24,
            "retraitImplanon",
            true,
            "nu"
          ),
          "25plus": countClientPfRetrait(
            clientData,
            25,
            100,
            "retraitImplanon",
            true,
            "nu"
          ),
          moins10_au: countClientPfRetrait(
            clientData,
            0,
            9,
            "retraitImplanon",
            true,
            "au"
          ),
          "10a14_au": countClientPfRetrait(
            clientData,
            10,
            14,
            "retraitImplanon",
            true,
            "au"
          ),
          "15a19_au": countClientPfRetrait(
            clientData,
            15,
            19,
            "retraitImplanon",
            true,
            "au"
          ),
          "20a24_au": countClientPfRetrait(
            clientData,
            20,
            24,
            "retraitImplanon",
            true,
            "au"
          ),
          "25plus_au": countClientPfRetrait(
            clientData,
            25,
            100,
            "retraitImplanon",
            true,
            "au"
          ),
          total: ageRanges.reduce(
            (sum, range) =>
              sum +
              countClientPfRetrait(
                clientData,
                range.min,
                range.max,
                "retraitImplanon",
                true,
                "nu"
              ) +
              countClientPfRetrait(
                clientData,
                range.min,
                range.max,
                "retraitImplanon",
                true,
                "au"
              ),
            0
          ),
        },
        {
          indicateurs: "CLT - PF - Implant - 5 ans (Insertion & Contrôle)",
          moins10: countClientPfInsertionAndControl(
            clientData,
            0,
            9,
            "jadelle",
            "nu"
          ),
          "10a14": countClientPfInsertionAndControl(
            clientData,
            10,
            14,
            "jadelle",
            "nu"
          ),
          "15a19": countClientPfInsertionAndControl(
            clientData,
            15,
            19,
            "jadelle",
            "nu"
          ),
          "20a24": countClientPfInsertionAndControl(
            clientData,
            20,
            24,
            "jadelle",
            "nu"
          ),
          "25plus": countClientPfInsertionAndControl(
            clientData,
            25,
            100,
            "jadelle",
            "nu"
          ),
          moins10_au: countClientPfInsertionAndControl(
            clientData,
            0,
            9,
            "jadelle",
            "au"
          ),
          "10a14_au": countClientPfInsertionAndControl(
            clientData,
            10,
            14,
            "jadelle",
            "au"
          ),
          "15a19_au": countClientPfInsertionAndControl(
            clientData,
            15,
            19,
            "jadelle",
            "au"
          ),
          "20a24_au": countClientPfInsertionAndControl(
            clientData,
            20,
            24,
            "jadelle",
            "au"
          ),

          "25plus_au": countClientPfInsertionAndControl(
            clientData,
            25,
            100,
            "jadelle",
            "au"
          ),
          total: ageRanges.reduce(
            (sum, range) =>
              sum +
              countClientPfInsertionAndControl(
                clientData,
                range.min,
                range.max,
                "jadelle",
                "nu"
              ) +
              countClientPfInsertionAndControl(
                clientData,
                range.min,
                range.max,
                "jadelle",
                "au"
              ),
            0
          ),
        },
        // {
        //   indicateurs: "Jadelle",
        //   moins10: countClientPf(
        //     clientData,
        //     0,
        //     9,
        //     "jadelle",
        //     "insertion",
        //     "nu"
        //   ),
        //   "10a14": countClientPf(
        //     clientData,
        //     10,
        //     14,
        //     "jadelle",
        //     "insertion",
        //     "nu"
        //   ),
        //   "15a19": countClientPf(
        //     clientData,
        //     15,
        //     19,
        //     "jadelle",
        //     "insertion",
        //     "nu"
        //   ),
        //   "20a24": countClientPf(
        //     clientData,
        //     20,
        //     24,
        //     "jadelle",
        //     "insertion",
        //     "nu"
        //   ),
        //   "25plus": countClientPf(
        //     clientData,
        //     25,
        //     100,
        //     "jadelle",
        //     "insertion",
        //     "nu"
        //   ),
        //   moins10_au: countClientPf(
        //     clientData,
        //     0,
        //     9,
        //     "jadelle",
        //     "insertion",
        //     "au"
        //   ),
        //   "10a14_au": countClientPf(
        //     clientData,
        //     10,
        //     14,
        //     "jadelle",
        //     "insertion",
        //     "au"
        //   ),
        //   "15a19_au": countClientPf(
        //     clientData,
        //     15,
        //     19,
        //     "jadelle",
        //     "insertion",
        //     "au"
        //   ),
        //   "20a24_au": countClientPf(
        //     clientData,
        //     20,
        //     24,
        //     "jadelle",
        //     "insertion",
        //     "au"
        //   ),

        //   "25plus_au": countClientPf(
        //     clientData,
        //     25,
        //     100,
        //     "jadelle",
        //     "insertion",
        //     "au"
        //   ),
        //   total: ageRanges.reduce(
        //     (sum, range) =>
        //       sum +
        //       countClientPf(
        //         clientData,
        //         range.min,
        //         range.max,
        //         "jadelle",
        //         "insertion",
        //         "nu"
        //       ) +
        //       countClientPf(
        //         clientData,
        //         range.min,
        //         range.max,
        //         "jadelle",
        //         "insertion",
        //         "au"
        //       ),
        //     0
        //   ),
        // },
        {
          indicateurs: "CLT - PF - Implant - 5 ans - Retrait",
          moins10: countClientPfRetrait(
            clientData,
            0,
            9,
            "retraitJadelle",
            true,
            "au"
          ),
          "10a14": countClientPfRetrait(
            clientData,
            10,
            14,
            "retraitJadelle",
            true,
            "au"
          ),
          "15a19": countClientPfRetrait(
            clientData,
            15,
            19,
            "retraitJadelle",
            true,
            "nu"
          ),
          "20a24": countClientPfRetrait(
            clientData,
            20,
            24,
            "retraitJadelle",
            true,
            "nu"
          ),
          "25plus": countClientPfRetrait(
            clientData,
            25,
            100,
            "retraitJadelle",
            true,
            "nu"
          ),
          moins10_au: countClientPfRetrait(
            clientData,
            0,
            9,
            "retraitJadelle",
            true,
            "au"
          ),
          "10a14_au": countClientPfRetrait(
            clientData,
            10,
            14,
            "retraitJadelle",
            true,
            "au"
          ),
          "15a19_au": countClientPfRetrait(
            clientData,
            15,
            19,
            "retraitJadelle",
            true,
            "au"
          ),
          "20a24_au": countClientPfRetrait(
            clientData,
            20,
            24,
            "retraitJadelle",
            true,
            "au"
          ),
          "25plus_au": countClientPfRetrait(
            clientData,
            25,
            100,
            "retraitJadelle",
            true,
            "au"
          ),
          total: ageRanges.reduce(
            (sum, range) =>
              sum +
              countClientPfRetrait(
                clientData,
                range.min,
                range.max,
                "retraitJadelle",
                true,
                "nu"
              ) +
              countClientPfRetrait(
                clientData,
                range.min,
                range.max,
                "retraitJadelle",
                true,
                "au"
              ),
            0
          ),
        },
        {
          indicateurs: "CLT - PF - Contraception d'urgence",
          moins10: countClientPf(
            clientData,
            0,
            9,
            "courtDuree",
            "urgence",
            "nu"
          ),
          "10a14": countClientPf(
            clientData,
            10,
            14,
            "courtDuree",
            "urgence",
            "nu"
          ),
          "15a19": countClientPf(
            clientData,
            15,
            19,
            "courtDuree",
            "urgence",
            "nu"
          ),
          "20a24": countClientPf(
            clientData,
            20,
            24,
            "courtDuree",
            "urgence",
            "nu"
          ),
          "25plus": countClientPf(
            clientData,
            25,
            100,
            "courtDuree",
            "urgence",
            "nu"
          ),
          moins10_au: countClientPf(
            clientData,
            0,
            9,
            "courtDuree",
            "urgence",
            "au"
          ),
          "10a14_au": countClientPf(
            clientData,
            10,
            14,
            "courtDuree",
            "urgence",
            "au"
          ),
          "15a19_au": countClientPf(
            clientData,
            15,
            19,
            "courtDuree",
            "urgence",
            "au"
          ),
          "20a24_au": countClientPf(
            clientData,
            20,
            24,
            "courtDuree",
            "urgence",
            "au"
          ),

          "25plus_au": countClientPf(
            clientData,
            25,
            100,
            "courtDuree",
            "urgence",
            "au"
          ),
          total: ageRanges.reduce(
            (sum, range) =>
              sum +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "courtDuree",
                "urgence",
                "nu"
              ) +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "courtDuree",
                "urgence",
                "au"
              ),
            0
          ),
        },
        {
          indicateurs: "CLT - PF - Préservatif (Féminin & Masculin)",
          moins10: countClientPf(
            clientData,
            0,
            9,
            "courtDuree",
            "preservatif",
            "nu"
          ),
          "10a14": countClientPf(
            clientData,
            10,
            14,
            "courtDuree",
            "preservatif",
            "nu"
          ),
          "15a19": countClientPf(
            clientData,
            15,
            19,
            "courtDuree",
            "preservatif",
            "nu"
          ),
          "20a24": countClientPf(
            clientData,
            20,
            24,
            "courtDuree",
            "preservatif",
            "nu"
          ),
          "25plus": countClientPf(
            clientData,
            25,
            100,
            "courtDuree",
            "preservatif",
            "nu"
          ),
          moins10_au: countClientPf(
            clientData,
            0,
            9,
            "courtDuree",
            "preservatif",
            "au"
          ),
          "10a14_au": countClientPf(
            clientData,
            10,
            14,
            "courtDuree",
            "preservatif",
            "au"
          ),
          "15a19_au": countClientPf(
            clientData,
            15,
            19,
            "courtDuree",
            "preservatif",
            "au"
          ),
          "20a24_au": countClientPf(
            clientData,
            20,
            24,
            "courtDuree",
            "preservatif",
            "au"
          ),

          "25plus_au": countClientPf(
            clientData,
            25,
            100,
            "courtDuree",
            "preservatif",
            "au"
          ),
          total: ageRanges.reduce(
            (sum, range) =>
              sum +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "courtDuree",
                "preservatif",
                "nu"
              ) +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "courtDuree",
                "preservatif",
                "au"
              ),
            0
          ),
        },
        {
          indicateurs: "CLT - PF - Spermicides",
          moins10: countClientPf(
            clientData,
            0,
            9,
            "courtDuree",
            "spermicide",
            "nu"
          ),
          "10a14": countClientPf(
            clientData,
            10,
            14,
            "courtDuree",
            "spermicide",
            "nu"
          ),
          "15a19": countClientPf(
            clientData,
            15,
            19,
            "courtDuree",
            "spermicide",
            "nu"
          ),
          "20a24": countClientPf(
            clientData,
            20,
            24,
            "courtDuree",
            "spermicide",
            "nu"
          ),
          "25plus": countClientPf(
            clientData,
            25,
            100,
            "courtDuree",
            "spermicide",
            "nu"
          ),
          moins10_au: countClientPf(
            clientData,
            0,
            9,
            "courtDuree",
            "spermicide",
            "au"
          ),
          "10a14_au": countClientPf(
            clientData,
            10,
            14,
            "courtDuree",
            "spermicide",
            "au"
          ),
          "15a19_au": countClientPf(
            clientData,
            15,
            19,
            "courtDuree",
            "spermicide",
            "au"
          ),
          "20a24_au": countClientPf(
            clientData,
            20,
            24,
            "courtDuree",
            "spermicide",
            "au"
          ),

          "25plus_au": countClientPf(
            clientData,
            25,
            100,
            "courtDuree",
            "spermicide",
            "au"
          ),
          total: ageRanges.reduce(
            (sum, range) =>
              sum +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "courtDuree",
                "spermicide",
                "nu"
              ) +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "courtDuree",
                "spermicide",
                "au"
              ),
            0
          ),
        },
      ];

      dataRows.forEach((row) => worksheet.addRow(row));

      // Style
      for (
        let i = mergeHeaderRow;
        i <= columnHeaderRow + dataRows.length;
        i++
      ) {
        worksheet.getRow(i).eachCell((cell) => {
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
          if (i === mergeHeaderRow || i === columnHeaderRow) {
            cell.font = { bold: true };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "EEEEEE" },
            };
          }
        });
      }
      setCellAlignment(worksheet, ["A"], 16, 28, "left");

      return columnHeaderRow + dataRows.length + 2; // prochaine ligne de départ
    };
    clientsPf(13, "Tableau Client");

    // ============ Fin Deuxième TABLEAU ============
    // ============ Troisième TABLEAU ============
    const clientsSevicePf = (startRow: number, titre: string) => {
      worksheet.getCell(`A${startRow}`).value = titre;
      worksheet.mergeCells(`A${startRow}:J${startRow}`);
      worksheet.getRow(startRow).height = 20;

      const mergeHeaderRow = startRow + 1;
      const columnHeaderRow = startRow + 2;

      worksheet.getCell(`A${mergeHeaderRow}`).value = "";
      worksheet.getCell(`B${mergeHeaderRow}`).value = "Nouveau utilisateur";
      worksheet.getCell(`G${mergeHeaderRow}`).value = "Ancien utilisateur";

      worksheet.mergeCells(`A${mergeHeaderRow}:${"A"}${columnHeaderRow}`);
      worksheet.mergeCells(`B${mergeHeaderRow}:F${mergeHeaderRow}`);
      worksheet.mergeCells(`G${mergeHeaderRow}:K${mergeHeaderRow}`);
      worksheet.mergeCells(`L${mergeHeaderRow}:${"L"}${columnHeaderRow}`);

      worksheet.columns = pfColumns;

      const headerRow = worksheet.getRow(columnHeaderRow);
      headerRow.values = pfColumns.map((col) => col.header);
      headerRow.commit();

      const dataRows = [
        {
          indicateurs: "CLT - PF - Pilules",
          moins10: countClientPf(
            clientData,
            0,
            9,
            "courtDuree",
            "pilule",
            "nu"
          ),
          "10a14": countClientPf(
            clientData,
            10,
            14,
            "courtDuree",
            "pilule",
            "nu"
          ),
          "15a19": countClientPf(
            clientData,
            15,
            19,
            "courtDuree",
            "pilule",
            "nu"
          ),
          "20a24": countClientPf(
            clientData,
            20,
            24,
            "courtDuree",
            "pilule",
            "nu"
          ),
          "25plus": countClientPf(
            clientData,
            25,
            100,
            "courtDuree",
            "pilule",
            "nu"
          ),
          moins10_au: countClientPf(
            clientData,
            0,
            9,
            "courtDuree",
            "pilule",
            "au"
          ),
          "10a14_au": countClientPf(
            clientData,
            10,
            14,
            "courtDuree",
            "pilule",
            "au"
          ),
          "15a19_au": countClientPf(
            clientData,
            15,
            19,
            "courtDuree",
            "pilule",
            "au"
          ),
          "20a24_au": countClientPf(
            clientData,
            20,
            24,
            "courtDuree",
            "pilule",
            "au"
          ),

          "25plus_au": countClientPf(
            clientData,
            25,
            100,
            "courtDuree",
            "pilule",
            "au"
          ),
          total: ageRanges.reduce(
            (sum, range) =>
              sum +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "courtDuree",
                "pilule",
                "nu"
              ) +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "courtDuree",
                "pilule",
                "au"
              ),
            0
          ),
        },
        {
          indicateurs: "CLT - PF - Injectable 2 mois",
          moins10: countClientPf(
            clientData,
            0,
            9,
            "courtDuree",
            "noristera",
            "nu"
          ),
          "10a14": countClientPf(
            clientData,
            10,
            14,
            "courtDuree",
            "noristera",
            "nu"
          ),
          "15a19": countClientPf(
            clientData,
            15,
            19,
            "courtDuree",
            "noristera",
            "nu"
          ),
          "20a24": countClientPf(
            clientData,
            20,
            24,
            "courtDuree",
            "noristera",
            "nu"
          ),
          "25plus": countClientPf(
            clientData,
            25,
            100,
            "courtDuree",
            "noristera",
            "nu"
          ),
          moins10_au: countClientPf(
            clientData,
            0,
            9,
            "courtDuree",
            "noristera",
            "au"
          ),
          "10a14_au": countClientPf(
            clientData,
            10,
            14,
            "courtDuree",
            "noristera",
            "au"
          ),
          "15a19_au": countClientPf(
            clientData,
            15,
            19,
            "courtDuree",
            "noristera",
            "au"
          ),
          "20a24_au": countClientPf(
            clientData,
            20,
            24,
            "courtDuree",
            "noristera",
            "au"
          ),

          "25plus_au": countClientPf(
            clientData,
            25,
            100,
            "courtDuree",
            "noristera",
            "au"
          ),
          total: ageRanges.reduce(
            (sum, range) =>
              sum +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "courtDuree",
                "noristera",
                "nu"
              ) +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "courtDuree",
                "noristera",
                "au"
              ),
            0
          ),
        },
        {
          indicateurs: "CLT - PF - Injectable 3 mois",
          moins10: countClientPf(
            clientData,
            0,
            9,
            "courtDuree",
            "injectable",
            "nu"
          ),
          "10a14": countClientPf(
            clientData,
            10,
            14,
            "courtDuree",
            "injectable",
            "nu"
          ),
          "15a19": countClientPf(
            clientData,
            15,
            19,
            "courtDuree",
            "injectable",
            "nu"
          ),
          "20a24": countClientPf(
            clientData,
            20,
            24,
            "courtDuree",
            "injectable",
            "nu"
          ),
          "25plus": countClientPf(
            clientData,
            25,
            100,
            "courtDuree",
            "injectable",
            "nu"
          ),
          moins10_au: countClientPf(
            clientData,
            0,
            9,
            "courtDuree",
            "injectable",
            "au"
          ),
          "10a14_au": countClientPf(
            clientData,
            10,
            14,
            "courtDuree",
            "injectable",
            "au"
          ),
          "15a19_au": countClientPf(
            clientData,
            15,
            19,
            "courtDuree",
            "injectable",
            "au"
          ),
          "20a24_au": countClientPf(
            clientData,
            20,
            24,
            "courtDuree",
            "injectable",
            "au"
          ),

          "25plus_au": countClientPf(
            clientData,
            25,
            100,
            "courtDuree",
            "injectable",
            "au"
          ),
          total: ageRanges.reduce(
            (sum, range) =>
              sum +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "courtDuree",
                "injectable",
                "nu"
              ) +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "courtDuree",
                "injectable",
                "au"
              ),
            0
          ),
        },
        {
          indicateurs: "CLT - PF - DIU - 10 ans - Insertion ",
          moins10: countClientPfInsertionAndControl(
            clientData,
            0,
            9,
            "sterilet",
            "nu"
          ),
          "10a14": countClientPfInsertionAndControl(
            clientData,
            10,
            14,
            "sterilet",
            "nu"
          ),
          "15a19": countClientPfInsertionAndControl(
            clientData,
            15,
            19,
            "sterilet",
            "nu"
          ),
          "20a24": countClientPfInsertionAndControl(
            clientData,
            20,
            24,
            "sterilet",
            "nu"
          ),
          "25plus": countClientPfInsertionAndControl(
            clientData,
            25,
            100,
            "sterilet",
            "nu"
          ),
          moins10_au: countClientPfInsertionAndControl(
            clientData,
            0,
            9,
            "sterilet",
            "au"
          ),
          "10a14_au": countClientPfInsertionAndControl(
            clientData,
            10,
            14,
            "sterilet",
            "au"
          ),
          "15a19_au": countClientPfInsertionAndControl(
            clientData,
            15,
            19,
            "sterilet",
            "au"
          ),
          "20a24_au": countClientPfInsertionAndControl(
            clientData,
            20,
            24,
            "sterilet",
            "au"
          ),

          "25plus_au": countClientPfInsertionAndControl(
            clientData,
            25,
            100,
            "sterilet",
            "au"
          ),
          total: ageRanges.reduce(
            (sum, range) =>
              sum +
              countClientPfInsertionAndControl(
                clientData,
                range.min,
                range.max,
                "sterilet",
                "nu"
              ) +
              countClientPfInsertionAndControl(
                clientData,
                range.min,
                range.max,
                "sterilet",
                "au"
              ),
            0
          ),
        },
        {
          indicateurs: "CLT - PF - DIU - 10 ans - Contrôle ",
          moins10: countClientPfInsertionAndControl(
            clientData,
            0,
            9,
            "controlSterilet",
            "nu"
          ),
          "10a14": countClientPfInsertionAndControl(
            clientData,
            10,
            14,
            "controlSterilet",
            "nu"
          ),
          "15a19": countClientPfInsertionAndControl(
            clientData,
            15,
            19,
            "controlSterilet",
            "nu"
          ),
          "20a24": countClientPfInsertionAndControl(
            clientData,
            20,
            24,
            "controlSterilet",
            "nu"
          ),
          "25plus": countClientPfInsertionAndControl(
            clientData,
            25,
            100,
            "controlSterilet",
            "nu"
          ),
          moins10_au: countClientPfInsertionAndControl(
            clientData,
            0,
            9,
            "controlSterilet",
            "au"
          ),
          "10a14_au": countClientPfInsertionAndControl(
            clientData,
            10,
            14,
            "controlSterilet",
            "au"
          ),
          "15a19_au": countClientPfInsertionAndControl(
            clientData,
            15,
            19,
            "controlSterilet",
            "au"
          ),
          "20a24_au": countClientPfInsertionAndControl(
            clientData,
            20,
            24,
            "controlSterilet",
            "au"
          ),

          "25plus_au": countClientPfInsertionAndControl(
            clientData,
            25,
            100,
            "controlSterilet",
            "au"
          ),
          total: ageRanges.reduce(
            (sum, range) =>
              sum +
              countClientPfInsertionAndControl(
                clientData,
                range.min,
                range.max,
                "controlSterilet",
                "nu"
              ) +
              countClientPfInsertionAndControl(
                clientData,
                range.min,
                range.max,
                "controlSterilet",
                "au"
              ),
            0
          ),
        },
        {
          indicateurs: "CLT - PF - DIU 10 ans - Retrait",
          moins10: countClientPfRetrait(
            clientData,
            0,
            9,
            "retraitSterilet",
            true,
            "au"
          ),
          "10a14": countClientPfRetrait(
            clientData,
            10,
            14,
            "retraitSterilet",
            true,
            "au"
          ),
          "15a19": countClientPfRetrait(
            clientData,
            15,
            19,
            "retraitSterilet",
            true,
            "nu"
          ),
          "20a24": countClientPfRetrait(
            clientData,
            20,
            24,
            "retraitSterilet",
            true,
            "nu"
          ),
          "25plus": countClientPfRetrait(
            clientData,
            25,
            100,
            "retraitSterilet",
            true,
            "nu"
          ),
          moins10_au: countClientPfRetrait(
            clientData,
            0,
            9,
            "retraitSterilet",
            true,
            "au"
          ),
          "10a14_au": countClientPfRetrait(
            clientData,
            10,
            14,
            "retraitSterilet",
            true,
            "au"
          ),
          "15a19_au": countClientPfRetrait(
            clientData,
            15,
            19,
            "retraitSterilet",
            true,
            "au"
          ),
          "20a24_au": countClientPfRetrait(
            clientData,
            20,
            24,
            "retraitSterilet",
            true,
            "au"
          ),
          "25plus_au": countClientPfRetrait(
            clientData,
            25,
            100,
            "retraitSterilet",
            true,
            "au"
          ),
          total: ageRanges.reduce(
            (sum, range) =>
              sum +
              countClientPfRetrait(
                clientData,
                range.min,
                range.max,
                "retraitSterilet",
                true,
                "nu"
              ) +
              countClientPfRetrait(
                clientData,
                range.min,
                range.max,
                "retraitSterilet",
                true,
                "au"
              ),
            0
          ),
        },
        {
          indicateurs: "CLT - PF - Implant - 3 ans (Insertion & Contrôle)",
          moins10: countClientPfInsertionAndControl(
            clientData,
            0,
            9,
            "implanon",
            "nu"
          ),
          "10a14": countClientPfInsertionAndControl(
            clientData,
            10,
            14,
            "implanon",
            "nu"
          ),
          "15a19": countClientPfInsertionAndControl(
            clientData,
            15,
            19,
            "implanon",
            "nu"
          ),
          "20a24": countClientPfInsertionAndControl(
            clientData,
            20,
            24,
            "implanon",
            "nu"
          ),
          "25plus": countClientPfInsertionAndControl(
            clientData,
            25,
            100,
            "implanon",
            "nu"
          ),
          moins10_au: countClientPfInsertionAndControl(
            clientData,
            0,
            9,
            "implanon",
            "au"
          ),
          "10a14_au": countClientPfInsertionAndControl(
            clientData,
            10,
            14,
            "implanon",
            "au"
          ),
          "15a19_au": countClientPfInsertionAndControl(
            clientData,
            15,
            19,
            "implanon",
            "au"
          ),
          "20a24_au": countClientPfInsertionAndControl(
            clientData,
            20,
            24,
            "implanon",
            "au"
          ),

          "25plus_au": countClientPfInsertionAndControl(
            clientData,
            25,
            100,
            "implanon",
            "au"
          ),
          total: ageRanges.reduce(
            (sum, range) =>
              sum +
              countClientPfInsertionAndControl(
                clientData,
                range.min,
                range.max,
                "implanon",
                "nu"
              ) +
              countClientPfInsertionAndControl(
                clientData,
                range.min,
                range.max,
                "implanon",
                "au"
              ),
            0
          ),
        },
        {
          indicateurs: "CLT - PF - Implant - 3 ans - Retrait",
          moins10: countClientPfRetrait(
            clientData,
            0,
            9,
            "retraitImplanon",
            true,
            "au"
          ),
          "10a14": countClientPfRetrait(
            clientData,
            10,
            14,
            "retraitImplanon",
            true,
            "au"
          ),
          "15a19": countClientPfRetrait(
            clientData,
            15,
            19,
            "retraitImplanon",
            true,
            "nu"
          ),
          "20a24": countClientPfRetrait(
            clientData,
            20,
            24,
            "retraitImplanon",
            true,
            "nu"
          ),
          "25plus": countClientPfRetrait(
            clientData,
            25,
            100,
            "retraitImplanon",
            true,
            "nu"
          ),
          moins10_au: countClientPfRetrait(
            clientData,
            0,
            9,
            "retraitImplanon",
            true,
            "au"
          ),
          "10a14_au": countClientPfRetrait(
            clientData,
            10,
            14,
            "retraitImplanon",
            true,
            "au"
          ),
          "15a19_au": countClientPfRetrait(
            clientData,
            15,
            19,
            "retraitImplanon",
            true,
            "au"
          ),
          "20a24_au": countClientPfRetrait(
            clientData,
            20,
            24,
            "retraitImplanon",
            true,
            "au"
          ),
          "25plus_au": countClientPfRetrait(
            clientData,
            25,
            100,
            "retraitImplanon",
            true,
            "au"
          ),
          total: ageRanges.reduce(
            (sum, range) =>
              sum +
              countClientPfRetrait(
                clientData,
                range.min,
                range.max,
                "retraitImplanon",
                true,
                "nu"
              ) +
              countClientPfRetrait(
                clientData,
                range.min,
                range.max,
                "retraitImplanon",
                true,
                "au"
              ),
            0
          ),
        },
        {
          indicateurs: "CLT - PF - Implant - 5 ans (Insertion & Contrôle)",
          moins10: countClientPfInsertionAndControl(
            clientData,
            0,
            9,
            "jadelle",
            "nu"
          ),
          "10a14": countClientPfInsertionAndControl(
            clientData,
            10,
            14,
            "jadelle",
            "nu"
          ),
          "15a19": countClientPfInsertionAndControl(
            clientData,
            15,
            19,
            "jadelle",
            "nu"
          ),
          "20a24": countClientPfInsertionAndControl(
            clientData,
            20,
            24,
            "jadelle",
            "nu"
          ),
          "25plus": countClientPfInsertionAndControl(
            clientData,
            25,
            100,
            "jadelle",
            "nu"
          ),
          moins10_au: countClientPfInsertionAndControl(
            clientData,
            0,
            9,
            "jadelle",
            "au"
          ),
          "10a14_au": countClientPfInsertionAndControl(
            clientData,
            10,
            14,
            "jadelle",
            "au"
          ),
          "15a19_au": countClientPfInsertionAndControl(
            clientData,
            15,
            19,
            "jadelle",
            "au"
          ),
          "20a24_au": countClientPfInsertionAndControl(
            clientData,
            20,
            24,
            "jadelle",
            "au"
          ),

          "25plus_au": countClientPfInsertionAndControl(
            clientData,
            25,
            100,
            "jadelle",
            "au"
          ),
          total: ageRanges.reduce(
            (sum, range) =>
              sum +
              countClientPfInsertionAndControl(
                clientData,
                range.min,
                range.max,
                "jadelle",
                "nu"
              ) +
              countClientPfInsertionAndControl(
                clientData,
                range.min,
                range.max,
                "jadelle",
                "au"
              ),
            0
          ),
        },

        {
          indicateurs: "CLT - PF - Implant - 5 ans - Retrait",
          moins10: countClientPfRetrait(
            clientData,
            0,
            9,
            "retraitJadelle",
            true,
            "au"
          ),
          "10a14": countClientPfRetrait(
            clientData,
            10,
            14,
            "retraitJadelle",
            true,
            "au"
          ),
          "15a19": countClientPfRetrait(
            clientData,
            15,
            19,
            "retraitJadelle",
            true,
            "nu"
          ),
          "20a24": countClientPfRetrait(
            clientData,
            20,
            24,
            "retraitJadelle",
            true,
            "nu"
          ),
          "25plus": countClientPfRetrait(
            clientData,
            25,
            100,
            "retraitJadelle",
            true,
            "nu"
          ),
          moins10_au: countClientPfRetrait(
            clientData,
            0,
            9,
            "retraitJadelle",
            true,
            "au"
          ),
          "10a14_au": countClientPfRetrait(
            clientData,
            10,
            14,
            "retraitJadelle",
            true,
            "au"
          ),
          "15a19_au": countClientPfRetrait(
            clientData,
            15,
            19,
            "retraitJadelle",
            true,
            "au"
          ),
          "20a24_au": countClientPfRetrait(
            clientData,
            20,
            24,
            "retraitJadelle",
            true,
            "au"
          ),
          "25plus_au": countClientPfRetrait(
            clientData,
            25,
            100,
            "retraitJadelle",
            true,
            "au"
          ),
          total: ageRanges.reduce(
            (sum, range) =>
              sum +
              countClientPfRetrait(
                clientData,
                range.min,
                range.max,
                "retraitJadelle",
                true,
                "nu"
              ) +
              countClientPfRetrait(
                clientData,
                range.min,
                range.max,
                "retraitJadelle",
                true,
                "au"
              ),
            0
          ),
        },
        {
          indicateurs: "CLT - PF - Contraception d'urgence",
          moins10: countClientPf(
            clientData,
            0,
            9,
            "courtDuree",
            "urgence",
            "nu"
          ),
          "10a14": countClientPf(
            clientData,
            10,
            14,
            "courtDuree",
            "urgence",
            "nu"
          ),
          "15a19": countClientPf(
            clientData,
            15,
            19,
            "courtDuree",
            "urgence",
            "nu"
          ),
          "20a24": countClientPf(
            clientData,
            20,
            24,
            "courtDuree",
            "urgence",
            "nu"
          ),
          "25plus": countClientPf(
            clientData,
            25,
            100,
            "courtDuree",
            "urgence",
            "nu"
          ),
          moins10_au: countClientPf(
            clientData,
            0,
            9,
            "courtDuree",
            "urgence",
            "au"
          ),
          "10a14_au": countClientPf(
            clientData,
            10,
            14,
            "courtDuree",
            "urgence",
            "au"
          ),
          "15a19_au": countClientPf(
            clientData,
            15,
            19,
            "courtDuree",
            "urgence",
            "au"
          ),
          "20a24_au": countClientPf(
            clientData,
            20,
            24,
            "courtDuree",
            "urgence",
            "au"
          ),

          "25plus_au": countClientPf(
            clientData,
            25,
            100,
            "courtDuree",
            "urgence",
            "au"
          ),
          total: ageRanges.reduce(
            (sum, range) =>
              sum +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "courtDuree",
                "urgence",
                "nu"
              ) +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "courtDuree",
                "urgence",
                "au"
              ),
            0
          ),
        },
        {
          indicateurs: "CLT - PF - Préservatif (Féminin & Masculin)",
          moins10: countClientPf(
            clientData,
            0,
            9,
            "courtDuree",
            "preservatif",
            "nu"
          ),
          "10a14": countClientPf(
            clientData,
            10,
            14,
            "courtDuree",
            "preservatif",
            "nu"
          ),
          "15a19": countClientPf(
            clientData,
            15,
            19,
            "courtDuree",
            "preservatif",
            "nu"
          ),
          "20a24": countClientPf(
            clientData,
            20,
            24,
            "courtDuree",
            "preservatif",
            "nu"
          ),
          "25plus": countClientPf(
            clientData,
            25,
            100,
            "courtDuree",
            "preservatif",
            "nu"
          ),
          moins10_au: countClientPf(
            clientData,
            0,
            9,
            "courtDuree",
            "preservatif",
            "au"
          ),
          "10a14_au": countClientPf(
            clientData,
            10,
            14,
            "courtDuree",
            "preservatif",
            "au"
          ),
          "15a19_au": countClientPf(
            clientData,
            15,
            19,
            "courtDuree",
            "preservatif",
            "au"
          ),
          "20a24_au": countClientPf(
            clientData,
            20,
            24,
            "courtDuree",
            "preservatif",
            "au"
          ),

          "25plus_au": countClientPf(
            clientData,
            25,
            100,
            "courtDuree",
            "preservatif",
            "au"
          ),
          total: ageRanges.reduce(
            (sum, range) =>
              sum +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "courtDuree",
                "preservatif",
                "nu"
              ) +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "courtDuree",
                "preservatif",
                "au"
              ),
            0
          ),
        },
        {
          indicateurs: "CLT - PF - Spermicides",
          moins10: countClientPf(
            clientData,
            0,
            9,
            "courtDuree",
            "spermicide",
            "nu"
          ),
          "10a14": countClientPf(
            clientData,
            10,
            14,
            "courtDuree",
            "spermicide",
            "nu"
          ),
          "15a19": countClientPf(
            clientData,
            15,
            19,
            "courtDuree",
            "spermicide",
            "nu"
          ),
          "20a24": countClientPf(
            clientData,
            20,
            24,
            "courtDuree",
            "spermicide",
            "nu"
          ),
          "25plus": countClientPf(
            clientData,
            25,
            100,
            "courtDuree",
            "spermicide",
            "nu"
          ),
          moins10_au: countClientPf(
            clientData,
            0,
            9,
            "courtDuree",
            "spermicide",
            "au"
          ),
          "10a14_au": countClientPf(
            clientData,
            10,
            14,
            "courtDuree",
            "spermicide",
            "au"
          ),
          "15a19_au": countClientPf(
            clientData,
            15,
            19,
            "courtDuree",
            "spermicide",
            "au"
          ),
          "20a24_au": countClientPf(
            clientData,
            20,
            24,
            "courtDuree",
            "spermicide",
            "au"
          ),

          "25plus_au": countClientPf(
            clientData,
            25,
            100,
            "courtDuree",
            "spermicide",
            "au"
          ),
          total: ageRanges.reduce(
            (sum, range) =>
              sum +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "courtDuree",
                "spermicide",
                "nu"
              ) +
              countClientPf(
                clientData,
                range.min,
                range.max,
                "courtDuree",
                "spermicide",
                "au"
              ),
            0
          ),
        },
      ];

      dataRows.forEach((row) => worksheet.addRow(row));

      // Style
      for (
        let i = mergeHeaderRow;
        i <= columnHeaderRow + dataRows.length;
        i++
      ) {
        worksheet.getRow(i).eachCell((cell) => {
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
          if (i === mergeHeaderRow || i === columnHeaderRow) {
            cell.font = { bold: true };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "EEEEEE" },
            };
          }
        });
      }
      setCellAlignment(worksheet, ["A"], 30, 45, "left");

      return columnHeaderRow + dataRows.length + 2; // prochaine ligne de départ
    };
    clientsSevicePf(30, "Tableau des services clients PF");
    // ============ Fin Troisième TABLEAU ============

    // Téléchargement
    ["A1", "B1", "C1", "D1", "E1", "F1", "G1", "H1", "I1", "J1", "K1"].forEach(
      (cellRef) => {
        worksheet.getCell(cellRef).value = "";
      }
    );

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Rapport_Planning_${new Date().toLocaleDateString(
      "fr-FR"
    )}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSpinner(false);
  };

  return (
    <div>
      <div className="flex flex-col justify-center gap-3">
        <Button
          variant="secondary"
          onClick={exportToExcel}
          className="flex justify-center mx-auto items-center px-4 py-2 rounded active:bg-green-700 transition"
        >
          <Spinner
            show={spinner}
            size={"small"}
            className="text-white dark:text-slate-400"
          />
          Exporter vers Excel
        </Button>
      </div>
      {/* Rapport Clients du mois */}
      <div className="flex flex-col gap-4 bg-gray-50 opacity-90 p-4 rounded-sm mt-2">
        <h2 className="font-bold">Rapport client de Planning</h2>
        <Table className="border shadow-blue-300 shadow-md  ">
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
              <TableCell className="border border-l-gray-400">
                -10 ans
              </TableCell>
              <TableCell>10-14 ans</TableCell>
              <TableCell>15-19 ans</TableCell>
              <TableCell>20-24 ans</TableCell>
              <TableCell className="border border-r-gray-400">
                25 ans et +
              </TableCell>
              <TableCell>-10 ans</TableCell>
              <TableCell>10-14 ans</TableCell>
              <TableCell>15-19 ans</TableCell>
              <TableCell>20-24 ans</TableCell>
              <TableCell className="border border-r-gray-400">
                25 ans et +
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Counselling PF */}
            <TableRow>
              <TableCell>Masculin</TableCell>
              {/* Colonnes dynamiques pour "nu" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`nu-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "sexe",
                    "Masculin",
                    "nu"
                  )}
                </TableCell>
              ))}

              {/* Colonnes dynamiques pour "au" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`au-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "sexe",
                    "Masculin",
                    "au"
                  )}
                </TableCell>
              ))}

              {/* Colonne dynamique pour le total */}
              <TableCell>
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "sexe",
                      "Masculin",
                      "nu"
                    ) +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "sexe",
                      "Masculin",
                      "au"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>
            {/* Féminin */}
            <TableRow>
              <TableCell>Féminin</TableCell>
              {/* Colonnes dynamiques pour "nu" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`nu-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "sexe",
                    "Féminin",
                    "nu"
                  )}
                </TableCell>
              ))}

              {/* Colonnes dynamiques pour "au" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`au-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "sexe",
                    "Féminin",
                    "au"
                  )}
                </TableCell>
              ))}

              {/* Colonne dynamique pour le total */}
              <TableCell>
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "sexe",
                      "Féminin",
                      "nu"
                    ) +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "sexe",
                      "Féminin",
                      "au"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Separator className="bg-green-300"></Separator>
        <Table className="border">
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
              <TableCell className="border border-l-gray-400">
                -10 ans
              </TableCell>
              <TableCell>10-14 ans</TableCell>
              <TableCell>15-19 ans</TableCell>
              <TableCell>20-24 ans</TableCell>
              <TableCell className="border border-r-gray-400">
                25 ans et +
              </TableCell>
              <TableCell>-10 ans</TableCell>
              <TableCell>10-14 ans</TableCell>
              <TableCell>15-19 ans</TableCell>
              <TableCell>20-24 ans</TableCell>
              <TableCell className="border border-r-gray-400">
                25 ans et +
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Pilules */}
            <TableRow>
              <TableCell>CLT - PF - Pilules</TableCell>
              {/* Colonnes dynamiques pour "nu" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`nu-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "courtDuree",
                    "pilule",
                    "nu"
                  )}
                </TableCell>
              ))}

              {/* Colonnes dynamiques pour "au" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`au-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "courtDuree",
                    "pilule",
                    "au"
                  )}
                </TableCell>
              ))}

              {/* Colonne dynamique pour le total */}
              <TableCell>
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "courtDuree",
                      "pilule",
                      "nu"
                    ) +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "courtDuree",
                      "pilule",
                      "au"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>

            {/* Noristéra */}
            <TableRow>
              <TableCell>CLT - PF - Injectable 2 mois</TableCell>
              {/* Colonnes dynamiques pour "nu" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`nu-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "courtDuree",
                    "noristera",
                    "nu"
                  )}
                </TableCell>
              ))}

              {/* Colonnes dynamiques pour "au" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`au-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "courtDuree",
                    "noristera",
                    "au"
                  )}
                </TableCell>
              ))}

              {/* Colonne dynamique pour le total */}
              <TableCell>
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "courtDuree",
                      "noristera",
                      "nu"
                    ) +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "courtDuree",
                      "noristera",
                      "au"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>

            {/* Injectable */}
            <TableRow>
              <TableCell>CLT - PF - Injectable 3 mois</TableCell>
              {/* Colonnes dynamiques pour "nu" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`nu-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "courtDuree",
                    "injectable",
                    "nu"
                  )}
                </TableCell>
              ))}

              {/* Colonnes dynamiques pour "au" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`au-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "courtDuree",
                    "injectable",
                    "au"
                  )}
                </TableCell>
              ))}

              {/* Colonne dynamique pour le total */}
              <TableCell>
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "courtDuree",
                      "injectable",
                      "nu"
                    ) +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "courtDuree",
                      "injectable",
                      "au"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>
            {/* Implanon */}
            <TableRow>
              <TableCell>
                CLT - PF - Implant - 3 ans (Insertion, Contrôle)
              </TableCell>
              {/* Colonnes dynamiques pour "nu" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`nu-${index}`}>
                  {countClientPfInsertionAndControl(
                    clientData,
                    range.min,
                    range.max,
                    "implanon",
                    "nu"
                  )}
                </TableCell>
              ))}

              {/* Colonnes dynamiques pour "au" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`au-${index}`}>
                  {countClientPfInsertionAndControl(
                    clientData,
                    range.min,
                    range.max,
                    "implanon",
                    "au"
                  )}
                </TableCell>
              ))}

              {/* Colonne dynamique pour le total */}
              <TableCell>
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientPfInsertionAndControl(
                      clientData,
                      range.min,
                      range.max,
                      "implanon",
                      "nu"
                    ) +
                    countClientPfInsertionAndControl(
                      clientData,
                      range.min,
                      range.max,
                      "implanon",
                      "au"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell>CLT - PF - Implant 3 ans - retrait</TableCell>
              {/* Colonnes dynamiques pour "nu" */}

              {ageRanges.map((range, index) => (
                <TableCell key={`nu-${index}`} className="bg-gray-600">
                  {countClientPfRetrait(
                    clientData,
                    range.min,
                    range.max,
                    "retraitImplanon",
                    true,
                    "nu"
                  )}
                </TableCell>
              ))}

              {/* Colonnes dynamiques pour "au" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`au-${index}`}>
                  {countClientPfRetrait(
                    clientData,
                    range.min,
                    range.max,
                    "retraitImplanon",
                    true,
                    "au"
                  )}
                </TableCell>
              ))}

              {/* Colonne dynamique pour le total */}
              <TableCell>
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientPfRetrait(
                      clientData,
                      range.min,
                      range.max,
                      "retraitImplanon",
                      true,
                      "nu"
                    ) +
                    countClientPfRetrait(
                      clientData,
                      range.min,
                      range.max,
                      "retraitImplanon",
                      true,
                      "au"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>

            {/* Jadelle */}
            <TableRow>
              <TableCell>
                CLT - PF - Implant - 5 ans (insertion, contrôle)
              </TableCell>
              {/* Colonnes dynamiques pour "nu" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`nu-${index}`}>
                  {countClientPfInsertionAndControl(
                    clientData,
                    range.min,
                    range.max,
                    "jadelle",
                    "nu"
                  )}
                </TableCell>
              ))}

              {/* Colonnes dynamiques pour "au" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`au-${index}`}>
                  {countClientPfInsertionAndControl(
                    clientData,
                    range.min,
                    range.max,
                    "jadelle",
                    "au"
                  )}
                </TableCell>
              ))}

              {/* Colonne dynamique pour le total */}
              <TableCell>
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientPfInsertionAndControl(
                      clientData,
                      range.min,
                      range.max,
                      "jadelle",
                      "nu"
                    ) +
                    countClientPfInsertionAndControl(
                      clientData,
                      range.min,
                      range.max,
                      "jadelle",
                      "au"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>CLT - PF - Implant 5 ans - retrait</TableCell>
              {/* Colonnes dynamiques pour "nu" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`nu-${index}`} className="bg-gray-600">
                  {countClientPfRetrait(
                    clientData,
                    range.min,
                    range.max,
                    "retraitJadelle",
                    true,
                    "nu"
                  )}
                </TableCell>
              ))}

              {/* Colonnes dynamiques pour "au" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`au-${index}`}>
                  {countClientPfRetrait(
                    clientData,
                    range.min,
                    range.max,
                    "retraitJadelle",
                    true,
                    "au"
                  )}
                </TableCell>
              ))}

              {/* Colonne dynamique pour le total */}
              <TableCell>
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientPfRetrait(
                      clientData,
                      range.min,
                      range.max,
                      "retraitJadelle",
                      true,
                      "nu"
                    ) +
                    countClientPfRetrait(
                      clientData,
                      range.min,
                      range.max,
                      "retraitJadelle",
                      true,
                      "au"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>

            {/* Stérilet */}
            <TableRow>
              <TableCell>
                CLT - PF - DIU - 10 ans Diu (insertion, contrôle)
              </TableCell>
              {/* Colonnes dynamiques pour "nu" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`nu-${index}`}>
                  {countClientPfInsertionAndControl(
                    clientData,
                    range.min,
                    range.max,
                    "sterilet",
                    "nu"
                  )}
                </TableCell>
              ))}

              {/* Colonnes dynamiques pour "au" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`au-${index}`}>
                  {countClientPfInsertionAndControl(
                    clientData,
                    range.min,
                    range.max,
                    "sterilet",
                    "au"
                  )}
                </TableCell>
              ))}

              {/* Colonne dynamique pour le total */}
              <TableCell>
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientPfInsertionAndControl(
                      clientData,
                      range.min,
                      range.max,
                      "sterilet",
                      "nu"
                    ) +
                    countClientPfInsertionAndControl(
                      clientData,
                      range.min,
                      range.max,
                      "sterilet",
                      "au"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>CLT - PF - Diu retrait</TableCell>
              {/* Colonnes dynamiques pour "nu" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`nu-${index}`} className="bg-gray-600">
                  {countClientPfRetrait(
                    clientData,
                    range.min,
                    range.max,
                    "retraitSterilet",
                    true,
                    "nu"
                  )}
                </TableCell>
              ))}

              {/* Colonnes dynamiques pour "au" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`au-${index}`}>
                  {countClientPfRetrait(
                    clientData,
                    range.min,
                    range.max,
                    "retraitSterilet",
                    true,
                    "au"
                  )}
                </TableCell>
              ))}

              {/* Colonne dynamique pour le total */}
              <TableCell>
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientPfRetrait(
                      clientData,
                      range.min,
                      range.max,
                      "retraitSterilet",
                      true,
                      "nu"
                    ) +
                    countClientPfRetrait(
                      clientData,
                      range.min,
                      range.max,
                      "retraitSterilet",
                      true,
                      "au"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>
            {/* Counselling PF */}
            <TableRow>
              <TableCell>CLT - PF - Counselling PF</TableCell>
              {/* Colonnes dynamiques pour "nu" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`nu-${index}`}>
                  {countClientPfRetrait(
                    clientData,
                    range.min,
                    range.max,
                    "counsellingPf",
                    true,
                    "nu"
                  )}
                </TableCell>
              ))}

              {/* Colonnes dynamiques pour "au" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`au-${index}`}>
                  {countClientPfRetrait(
                    clientData,
                    range.min,
                    range.max,
                    "counsellingPf",
                    true,
                    "au"
                  )}
                </TableCell>
              ))}

              {/* Colonne dynamique pour le total */}
              <TableCell>
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientPfRetrait(
                      clientData,
                      range.min,
                      range.max,
                      "counsellingPf",
                      true,
                      "nu"
                    ) +
                    countClientPfRetrait(
                      clientData,
                      range.min,
                      range.max,
                      "counsellingPf",
                      true,
                      "au"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>
            {/* CLT - PF - Préservatif (Féminin, Masculin) */}
            <TableRow>
              <TableCell>CLT - PF - Préservatif (Féminin, Masculin)</TableCell>
              {/* Colonnes dynamiques pour "nu" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`nu-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "courtDuree",
                    "preservatif",
                    "nu"
                  )}
                </TableCell>
              ))}

              {/* Colonnes dynamiques pour "au" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`au-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "courtDuree",
                    "preservatif",
                    "au"
                  )}
                </TableCell>
              ))}

              {/* Colonne dynamique pour le total */}
              <TableCell>
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "courtDuree",
                      "preservatif",
                      "nu"
                    ) +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "courtDuree",
                      "preservatif",
                      "au"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Separator className="bg-green-300"></Separator>
        <h2 className="font-bold">Rapport clients services</h2>
        <Table className="border">
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
              <TableCell className="border border-l-gray-400">
                -10 ans
              </TableCell>
              <TableCell>10-14 ans</TableCell>
              <TableCell>15-19 ans</TableCell>
              <TableCell>20-24 ans</TableCell>
              <TableCell className="border border-r-gray-400">
                25 ans et +
              </TableCell>
              <TableCell>-10 ans</TableCell>
              <TableCell>10-14 ans</TableCell>
              <TableCell>15-19 ans</TableCell>
              <TableCell>20-24 ans</TableCell>
              <TableCell className="border border-r-gray-400">
                25 ans et +
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Counseling PF */}
            <TableRow>
              <TableCell>SRV - PF - Counseling Général</TableCell>
              {/* Colonnes dynamiques pour "nu" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`nu-${index}`}>
                  {countClientPfRetrait(
                    clientData,
                    range.min,
                    range.max,
                    "counsellingPf",
                    true,
                    "nu"
                  )}
                </TableCell>
              ))}

              {/* Colonnes dynamiques pour "au" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`au-${index}`}>
                  {countClientPfRetrait(
                    clientData,
                    range.min,
                    range.max,
                    "counsellingPf",
                    true,
                    "au"
                  )}
                </TableCell>
              ))}

              {/* Colonne dynamique pour le total */}
              <TableCell>
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientPfRetrait(
                      clientData,
                      range.min,
                      range.max,
                      "counsellingPf",
                      true,
                      "nu"
                    ) +
                    countClientPfRetrait(
                      clientData,
                      range.min,
                      range.max,
                      "counsellingPf",
                      true,
                      "au"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>
            {/* Préservatif */}
            <TableRow>
              <TableCell>SRV - PF - Consultation - Préservatif</TableCell>
              {/* Colonnes dynamiques pour "nu" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`nu-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "courtDuree",
                    "preservatif",
                    "nu"
                  )}
                </TableCell>
              ))}

              {/* Colonnes dynamiques pour "au" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`au-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "courtDuree",
                    "preservatif",
                    "au"
                  )}
                </TableCell>
              ))}

              {/* Colonne dynamique pour le total */}
              <TableCell>
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "courtDuree",
                      "preservatif",
                      "nu"
                    ) +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "courtDuree",
                      "preservatif",
                      "au"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>
            {/* Pilules */}
            <TableRow>
              <TableCell>SRV - PF - Consultation - Pilules</TableCell>
              {/* Colonnes dynamiques pour "nu" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`nu-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "courtDuree",
                    "pilule",
                    "nu"
                  )}
                </TableCell>
              ))}

              {/* Colonnes dynamiques pour "au" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`au-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "courtDuree",
                    "pilule",
                    "au"
                  )}
                </TableCell>
              ))}

              {/* Colonne dynamique pour le total */}
              <TableCell>
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "courtDuree",
                      "pilule",
                      "nu"
                    ) +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "courtDuree",
                      "pilule",
                      "au"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>

            {/* Noristéra */}
            <TableRow>
              <TableCell>SRV - PF - Consultation - Injectable 2 mois</TableCell>
              {/* Colonnes dynamiques pour "nu" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`nu-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "courtDuree",
                    "noristera",
                    "nu"
                  )}
                </TableCell>
              ))}

              {/* Colonnes dynamiques pour "au" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`au-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "courtDuree",
                    "noristera",
                    "au"
                  )}
                </TableCell>
              ))}

              {/* Colonne dynamique pour le total */}
              <TableCell>
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "courtDuree",
                      "noristera",
                      "nu"
                    ) +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "courtDuree",
                      "noristera",
                      "au"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>

            {/* Injectable */}
            <TableRow>
              <TableCell>SRV - PF - Consultation - Injectable 3 mois</TableCell>
              {/* Colonnes dynamiques pour "nu" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`nu-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "courtDuree",
                    "injectable",
                    "nu"
                  )}
                </TableCell>
              ))}

              {/* Colonnes dynamiques pour "au" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`au-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "courtDuree",
                    "injectable",
                    "au"
                  )}
                </TableCell>
              ))}

              {/* Colonne dynamique pour le total */}
              <TableCell>
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "courtDuree",
                      "injectable",
                      "nu"
                    ) +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "courtDuree",
                      "injectable",
                      "au"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>
            {/* Implanon */}
            <TableRow>
              <TableCell>
                SRV - PF - Consultation - Implant 3 ans - Insertion
              </TableCell>
              {/* Colonnes dynamiques pour "nu" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`nu-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "implanon",
                    "insertion",
                    "nu"
                  )}
                </TableCell>
              ))}

              {/* Colonnes dynamiques pour "au" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`au-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "implanon",
                    "insertion",
                    "au"
                  )}
                </TableCell>
              ))}

              {/* Colonne dynamique pour le total */}
              <TableCell>
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "implanon",
                      "insertion",
                      "nu"
                    ) +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "implanon",
                      "insertion",
                      "au"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                SRV - PF - Consultation - Implant 3 ans contrôle
              </TableCell>
              {/* Colonnes dynamiques pour "nu" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`nu-${index}`} className="bg-gray-600">
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "implanon",
                    "controle",
                    "nu"
                  )}
                </TableCell>
              ))}

              {/* Colonnes dynamiques pour "au" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`au-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "implanon",
                    "controle",
                    "au"
                  )}
                </TableCell>
              ))}

              {/* Colonne dynamique pour le total */}
              <TableCell>
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "implanon",
                      "controle",
                      "nu"
                    ) +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "implanon",
                      "controle",
                      "au"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                SRV - PF - Consultation - Implant 3 ans - retrait
              </TableCell>
              {/* Colonnes dynamiques pour "nu" */}

              {ageRanges.map((range, index) => (
                <TableCell key={`nu-${index}`} className="bg-gray-600">
                  {countClientPfRetrait(
                    clientData,
                    range.min,
                    range.max,
                    "retraitImplanon",
                    true,
                    "nu"
                  )}
                </TableCell>
              ))}

              {/* Colonnes dynamiques pour "au" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`au-${index}`}>
                  {countClientPfRetrait(
                    clientData,
                    range.min,
                    range.max,
                    "retraitImplanon",
                    true,
                    "au"
                  )}
                </TableCell>
              ))}

              {/* Colonne dynamique pour le total */}
              <TableCell>
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientPfRetrait(
                      clientData,
                      range.min,
                      range.max,
                      "retraitImplanon",
                      true,
                      "nu"
                    ) +
                    countClientPfRetrait(
                      clientData,
                      range.min,
                      range.max,
                      "retraitImplanon",
                      true,
                      "au"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>

            {/* Jadelle */}
            <TableRow>
              <TableCell>
                SRV - PF - Consultation - Implant 5 ans insertion
              </TableCell>
              {/* Colonnes dynamiques pour "nu" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`nu-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "jadelle",
                    "insertion",
                    "nu"
                  )}
                </TableCell>
              ))}

              {/* Colonnes dynamiques pour "au" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`au-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "jadelle",
                    "insertion",
                    "au"
                  )}
                </TableCell>
              ))}

              {/* Colonne dynamique pour le total */}
              <TableCell>
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "jadelle",
                      "insertion",
                      "nu"
                    ) +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "jadelle",
                      "insertion",
                      "au"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                SRV - PF - Consultation - Implant 5 ans contrôle
              </TableCell>
              {/* Colonnes dynamiques pour "nu" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`nu-${index}`} className="bg-gray-600">
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "jadelle",
                    "controle",
                    "nu"
                  )}
                </TableCell>
              ))}

              {/* Colonnes dynamiques pour "au" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`au-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "jadelle",
                    "controle",
                    "au"
                  )}
                </TableCell>
              ))}

              {/* Colonne dynamique pour le total */}
              <TableCell>
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "jadelle",
                      "controle",
                      "nu"
                    ) +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "jadelle",
                      "controle",
                      "au"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                SRV - PF - Consultation - Implant 5 ans retrait
              </TableCell>
              {/* Colonnes dynamiques pour "nu" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`nu-${index}`} className="bg-gray-600">
                  {countClientPfRetrait(
                    clientData,
                    range.min,
                    range.max,
                    "retraitJadelle",
                    true,
                    "nu"
                  )}
                </TableCell>
              ))}

              {/* Colonnes dynamiques pour "au" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`au-${index}`}>
                  {countClientPfRetrait(
                    clientData,
                    range.min,
                    range.max,
                    "retraitJadelle",
                    true,
                    "au"
                  )}
                </TableCell>
              ))}

              {/* Colonne dynamique pour le total */}
              <TableCell>
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientPfRetrait(
                      clientData,
                      range.min,
                      range.max,
                      "retraitJadelle",
                      true,
                      "nu"
                    ) +
                    countClientPfRetrait(
                      clientData,
                      range.min,
                      range.max,
                      "retraitJadelle",
                      true,
                      "au"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>

            {/* Stérilet */}
            <TableRow>
              <TableCell>
                SRV - PF - Consultation - DIU 10 ans insertion
              </TableCell>
              {/* Colonnes dynamiques pour "nu" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`nu-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "sterilet",
                    "insertion",
                    "nu"
                  )}
                </TableCell>
              ))}

              {/* Colonnes dynamiques pour "au" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`au-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "sterilet",
                    "insertion",
                    "au"
                  )}
                </TableCell>
              ))}

              {/* Colonne dynamique pour le total */}
              <TableCell>
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "sterilet",
                      "insertion",
                      "nu"
                    ) +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "sterilet",
                      "insertion",
                      "au"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                SRV - PF - Consultation - DIU 10 ans contrôle
              </TableCell>
              {/* Colonnes dynamiques pour "nu" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`nu-${index}`} className="bg-gray-600">
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "sterilet",
                    "controle",
                    "nu"
                  )}
                </TableCell>
              ))}

              {/* Colonnes dynamiques pour "au" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`au-${index}`}>
                  {countClientPf(
                    clientData,
                    range.min,
                    range.max,
                    "sterilet",
                    "controle",
                    "au"
                  )}
                </TableCell>
              ))}

              {/* Colonne dynamique pour le total */}
              <TableCell>
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "sterilet",
                      "controle",
                      "nu"
                    ) +
                    countClientPf(
                      clientData,
                      range.min,
                      range.max,
                      "sterilet",
                      "controle",
                      "au"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                SRV - PF - Consultation - DIU 10 ans retrait
              </TableCell>
              {/* Colonnes dynamiques pour "nu" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`nu-${index}`} className="bg-gray-600">
                  {countClientPfRetrait(
                    clientData,
                    range.min,
                    range.max,
                    "retraitSterilet",
                    true,
                    "nu"
                  )}
                </TableCell>
              ))}

              {/* Colonnes dynamiques pour "au" */}
              {ageRanges.map((range, index) => (
                <TableCell key={`au-${index}`}>
                  {countClientPfRetrait(
                    clientData,
                    range.min,
                    range.max,
                    "retraitSterilet",
                    true,
                    "au"
                  )}
                </TableCell>
              ))}

              {/* Colonne dynamique pour le total */}
              <TableCell>
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientPfRetrait(
                      clientData,
                      range.min,
                      range.max,
                      "retraitSterilet",
                      true,
                      "nu"
                    ) +
                    countClientPfRetrait(
                      clientData,
                      range.min,
                      range.max,
                      "retraitSterilet",
                      true,
                      "au"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Separator className="bg-green-300"></Separator>
        <h2 className="font-bold text-shadow-lg ">
          Nombre de Produits distribués
        </h2>
        <Table className="border">
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
              <TableCell className="border border-l-gray-400">
                -10 ans
              </TableCell>
              <TableCell>10-14 ans</TableCell>
              <TableCell>15-19 ans</TableCell>
              <TableCell>20-24 ans</TableCell>
              <TableCell className="border border-r-gray-400">
                25 ans et +
              </TableCell>
              <TableCell>-10 ans</TableCell>
              <TableCell>10-14 ans</TableCell>
              <TableCell>15-19 ans</TableCell>
              <TableCell>20-24 ans</TableCell>
              <TableCell className="border border-r-gray-400">
                25 ans et +
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allProduits.map((produit) => (
              <TableRow key={produit.id}>
                {/* Nom du produit */}
                <TableCell>{produit.nomProduit}</TableCell>

                {/* Colonnes "nouveaux utilisateurs" */}
                {ageRanges.map((range, index) => (
                  <TableCell
                    key={`nu-${produit.id}-${index}`}
                    className="text-center border border-l-gray-400 border-r-gray-400"
                  >
                    {countProduitByOldSync(
                      clientData,
                      range.min,
                      range.max,
                      true,
                      produit.nomProduit,
                      "nu",
                      allProduits,
                      allTarifProduits,
                      allFactureProduits,
                      getFacturesByVisiteId
                    )}
                  </TableCell>
                ))}

                {/* Colonnes "anciens utilisateurs" */}
                {ageRanges.map((range, index) => (
                  <TableCell
                    key={`au-${produit.id}-${index}`}
                    className="text-center border border-l-gray-400 border-r-gray-400"
                  >
                    {countProduitByOldSync(
                      clientData,
                      range.min,
                      range.max,
                      true,
                      produit.nomProduit,
                      "au",
                      allProduits,
                      allTarifProduits,
                      allFactureProduits,
                      getFacturesByVisiteId
                    )}
                  </TableCell>
                ))}

                {/* Colonne Total */}
                <TableCell className="text-center font-semibold">
                  {ageRanges.reduce(
                    (sum, range) =>
                      sum +
                      countProduitByOldSync(
                        clientData,
                        range.min,
                        range.max,
                        true,
                        produit.nomProduit,
                        "nu",
                        allProduits,
                        allTarifProduits,
                        allFactureProduits,
                        getFacturesByVisiteId
                      ) +
                      countProduitByOldSync(
                        clientData,
                        range.min,
                        range.max,
                        true,
                        produit.nomProduit,
                        "au",
                        allProduits,
                        allTarifProduits,
                        allFactureProduits,
                        getFacturesByVisiteId
                      ),
                    0
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Separator className="bg-green-300"></Separator>
        <h2 className="font-bold text-shadow-lg ">Statuts des Clients PF</h2>
        {/* Tableau des statuts contraceptifs */}
        <Table className="table-auto w-full">
          <TableHeader className="bg-gray-200 border border-gray-400">
            {/* Ligne 1 */}
            <TableRow>
              <TableCell
                rowSpan={2}
                className="font-bold text-center align-middle border border-gray-400"
                style={{ width: 400 }}
              >
                Méthode contraceptive
              </TableCell>

              <TableCell
                colSpan={5}
                className="font-bold text-center border bg-blue-50"
              >
                Protégés
              </TableCell>
              <TableCell
                colSpan={5}
                className="font-bold text-center border bg-yellow-50"
              >
                Perdus de vue
              </TableCell>
              <TableCell
                colSpan={5}
                className="font-bold text-center border bg-red-50"
              >
                Abandons
              </TableCell>
            </TableRow>

            {/* Ligne 2 */}
            <TableRow className="bg-gray-300 text-center">
              {["10-14", "15-19", "20-24", "25+", "Total"].map((label, i) => (
                <TableCell key={`p-${i}`} className="font-semibold border">
                  {label}
                </TableCell>
              ))}
              {["10-14", "15-19", "20-24", "25+", "Total"].map((label, i) => (
                <TableCell key={`pdv-${i}`} className="font-semibold border">
                  {label}
                </TableCell>
              ))}
              {["10-14", "15-19", "20-24", "25+", "Total"].map((label, i) => (
                <TableCell key={`a-${i}`} className="font-semibold border">
                  {label}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {[
              { label: "Pilule", key: "pilule" as const },
              { label: "Noristéra", key: "noristera" as const },
              { label: "Injectable", key: "injectable" as const },
              { label: "Implanon", key: "implanon" as const },
              { label: "Jadelle", key: "jadelle" as const },
              { label: "Stérilet", key: "sterilet" as const },
            ].map((method) => (
              <TableRow key={method.key}>
                <TableCell className="border font-semibold p-2">
                  {method.label}
                </TableCell>

                {/* Protégés */}
                {[10, 15, 20, 25].map((age, i) => (
                  <TableCell key={`p-${i}`} className="text-center border">
                    {countByAgeAndMethod(
                      convertedProtege,
                      age,
                      age === 25 ? 120 : age + 4,
                      method.key
                    )}
                  </TableCell>
                ))}
                <TableCell className="text-center border font-bold bg-blue-50">
                  {convertedProtege.filter((i) => i[method.key]).length}
                </TableCell>

                {/* Perdus de vue */}
                {[10, 15, 20, 25].map((age, i) => (
                  <TableCell key={`pdv-${i}`} className="text-center border">
                    {countByAgeAndMethod(
                      convertedPDV,
                      age,
                      age === 25 ? 120 : age + 4,
                      method.key
                    )}
                  </TableCell>
                ))}
                <TableCell className="text-center border font-bold bg-yellow-50">
                  {convertedPDV.filter((i) => i[method.key]).length}
                </TableCell>

                {/* Abandons */}
                {[10, 15, 20, 25].map((age, i) => (
                  <TableCell key={`a-${i}`} className="text-center border">
                    {countByAgeAndMethod(
                      convertedAbandon,
                      age,
                      age === 25 ? 120 : age + 4,
                      method.key
                    )}
                  </TableCell>
                ))}
                <TableCell className="text-center border font-bold bg-red-50">
                  {convertedAbandon.filter((i) => i[method.key]).length}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Listing Clients du mois */}
      <div className="mt-8 flex flex-col gap-4">
        <h2 className="text-lg font-bold mt-3">Listing Clients du mois</h2>

        <Table>
          <TableHeader>
            <TableRow>
              <TableCell>Nom</TableCell>
              <TableCell>Prénom</TableCell>
              <TableCell>Âge</TableCell>
              <TableCell>Sexe</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Court Durée</TableCell>
              <TableCell>implanon</TableCell>
              <TableCell>Retrait implanon</TableCell>
              <TableCell>Jadelle</TableCell>
              <TableCell>Retrait Jadelle</TableCell>
              <TableCell>Stériler</TableCell>
              <TableCell>Retrait Stérilet</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientData.map((client, index) => (
              <TableRow key={index}>
                <TableCell>{client.nom}</TableCell>
                <TableCell>{client.prenom}</TableCell>
                <TableCell>{client.age}</TableCell>
                <TableCell>{client.sexe}</TableCell>
                <TableCell>{client.statut}</TableCell>
                <TableCell>{client.courtDuree}</TableCell>
                <TableCell>{client.implanon}</TableCell>
                <TableCell>{client.retraitImplanon ? "Oui" : "Non"}</TableCell>
                <TableCell>{client.jadelle}</TableCell>
                <TableCell>{client.retraitJadelle ? "Oui" : "Non"}</TableCell>
                <TableCell>{client.sterilet}</TableCell>
                <TableCell>{client.retraitSterilet ? "Oui" : "Non"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <h2 className="text-lg font-bold mt-3">
          Listing Clients Protégés du mois
        </h2>
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
              <TableCell>implanon</TableCell>
              <TableCell>Jadelle</TableCell>
              <TableCell>Stériler</TableCell>
              <TableCell>RDV</TableCell>

              <TableCell>Protégés</TableCell>
              <TableCell>PDV</TableCell>
              <TableCell>Abandon </TableCell>
              <TableCell>Arret</TableCell>
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

// Fonction utilitaire pour compter par âge et méthode
const countByAgeAndMethod = (
  data: ConvertedTypeProtege[] | ConvertedTypePDV[] | ConvertedTypeAbandon[],
  minAge: number,
  maxAge: number,
  method: keyof Pick<
    ConvertedTypeProtege,
    "pilule" | "noristera" | "injectable" | "implanon" | "jadelle" | "sterilet"
  >
): number => {
  return data.filter((item) => {
    // Remplacez 'age' par le nom réel de votre propriété d'âge
    const age = item.age; // À adapter selon votre structure
    return item[method] === true && age >= minAge && age <= maxAge;
  }).length;
};
