import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { ClientData, clientDataProps } from "../rapportPfActions";
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

type AgeRange = {
  min: number;
  max: number;
};

export type convertedType = clientDataProps & {
  recu: boolean;
  consultation: boolean;
};

type DateType = string | Date;

interface TableRapportConsultationProps {
  ageRanges: AgeRange[];
  clientData: ClientData[];
  dateDebut: DateType;
  dateFin: DateType;
  clinic: string;
}

const tabIndicateurs = [
  { label: "Nombre total de personne reçu", value: "recu" },
  {
    label: "Nombre total de personne reçu pour une consultation",
    value: "consultation",
  },
];

const countByBooleanAndSexe = (
  clientData: convertedType[],
  minAge: number,
  maxAge: number,
  propriete: string,
  sexe: "Masculin" | "Féminin",
): number => {
  if (!Array.isArray(clientData) || clientData.length === 0) return 0;
  return clientData.reduce((acc, client) => {
    const ageOk = client.age >= minAge && client.age <= maxAge;
    const sexeOk = client.sexe === sexe;
    const valueOk = client[propriete as keyof convertedType] === true;
    return ageOk && sexeOk && valueOk ? acc + 1 : acc;
  }, 0);
};

export default function TableRapportConsultation({
  ageRanges,
  clientData,
  dateDebut,
  dateFin,
  clinic,
}: TableRapportConsultationProps) {
  const [converted, setConverted] = useState<convertedType[]>([]);
  const [spinnerPdf, setSpinnerPdf] = useState(false);

  useEffect(() => {
    if (!clientData || clientData.length === 0) {
      setConverted([]);
    } else {
      const newConverted = clientData.map((item) => {
        const aConsultation =
          item.consultationPf === true ||
          item.consultationGyneco === true ||
          item.mdgConsultation === true ||
          item.obstConsultation === true ||
          item.cponConsultation === true ||
          item.testConsultation === true ||
          item.accouchementConsultation === true ||
          item.saaConsultation === true ||
          item.depistageVihConsultation === true ||
          item.examenPvVihConsultation === true ||
          item.infertConsultation === true;

        return {
          ...item,
          recu: true,
          consultation: aConsultation,
        };
      });
      setConverted(newConverted);
    }
  }, [clientData]);

  if (converted.length === 0) {
    return <p className="text-center">Aucune donnée disponible.</p>;
  }

  const exportToPdf = async () => {
    setSpinnerPdf(true);
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = doc.internal.pageSize.getWidth();

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

      if (logoBase64) {
        const logoWidth = pageWidth * 0.6;
        const logoHeight = 20;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(logoBase64, "PNG", logoX, 10, logoWidth, logoHeight);
      }

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

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`Rapport Consultation - ${clinic}`, pageWidth / 2, 35, {
        align: "center",
      });
      doc.setFontSize(11);
      doc.text(`Période: ${periodeText}`, pageWidth / 2, 42, {
        align: "center",
      });

      const ageLabels = ageRanges.map((r) =>
        r.max >= 120 ? `${r.min}+` : `${r.min}-${r.max}`,
      );

      const headers = [
        [
          { content: "Indicateurs", rowSpan: 2 },
          { content: "Masculin", colSpan: ageRanges.length },
          { content: "Féminin", colSpan: ageRanges.length },
          { content: "Total", rowSpan: 2 },
        ],
        [...ageLabels, ...ageLabels],
      ];

      const body = tabIndicateurs.map((ind) => {
        const masc = ageRanges.map((r) =>
          countByBooleanAndSexe(converted, r.min, r.max, ind.value, "Masculin"),
        );
        const fem = ageRanges.map((r) =>
          countByBooleanAndSexe(converted, r.min, r.max, ind.value, "Féminin"),
        );
        const total =
          masc.reduce((a, b) => a + b, 0) + fem.reduce((a, b) => a + b, 0);
        return [ind.label, ...masc, ...fem, total];
      });

      autoTable(doc, {
        startY: 50,
        head: headers,
        body,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 2, halign: "center" },
        headStyles: {
          fillColor: [200, 200, 200],
          textColor: 0,
          fontStyle: "bold",
        },
        columnStyles: { 0: { halign: "left", cellWidth: 100 } },
      });

      doc.save(
        `Rapport_Consultation_${new Date().toLocaleDateString("fr-FR")}.pdf`,
      );
    } catch (error) {
      console.error("Erreur export PDF:", error);
    } finally {
      setSpinnerPdf(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 bg-gray-50 opacity-90 p-4 rounded-sm mt-2 w-full overflow-x-auto">
      <Button
        onClick={exportToPdf}
        type="button"
        disabled={spinnerPdf}
        className="bg-red-500 mx-auto text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
      >
        <Spinner
          show={spinnerPdf}
          size="small"
          className="text-white dark:text-slate-400"
        />
        Exporter PDF
      </Button>

      <div>
        <h2 className="font-bold mb-2">Rapport Consultation</h2>
        <Table className="border">
          <TableHeader className="bg-slate-100">
            <TableRow>
              <TableHead rowSpan={2} className="border border-gray-300 font-semibold align-middle">
                Indicateurs
              </TableHead>
              <TableHead colSpan={ageRanges.length} className="border border-gray-300 font-semibold text-center">
                Masculin
              </TableHead>
              <TableHead colSpan={ageRanges.length} className="border border-gray-300 font-semibold text-center">
                Féminin
              </TableHead>
              <TableHead rowSpan={2} className="border border-gray-300 font-semibold align-middle text-center">
                Total
              </TableHead>
            </TableRow>
            <TableRow>
              {ageRanges.map((r, idx) => (
                <TableHead
                  key={`m-${idx}`}
                  className="border border-gray-300 font-semibold text-center"
                >
                  {r.max >= 120 ? `${r.min}+` : `${r.min}-${r.max}`}
                </TableHead>
              ))}
              {ageRanges.map((r, idx) => (
                <TableHead
                  key={`f-${idx}`}
                  className="border border-gray-300 font-semibold text-center"
                >
                  {r.max >= 120 ? `${r.min}+` : `${r.min}-${r.max}`}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tabIndicateurs.map((ind) => {
              const masc = ageRanges.map((r) =>
                countByBooleanAndSexe(
                  converted,
                  r.min,
                  r.max,
                  ind.value,
                  "Masculin",
                ),
              );
              const fem = ageRanges.map((r) =>
                countByBooleanAndSexe(
                  converted,
                  r.min,
                  r.max,
                  ind.value,
                  "Féminin",
                ),
              );
              const total =
                masc.reduce((a, b) => a + b, 0) +
                fem.reduce((a, b) => a + b, 0);
              return (
                <TableRow key={ind.value}>
                  <TableCell className="border border-gray-300 break-word whitespace-normal overflow-hidden w-[350px] min-w-[350px] max-w-[350px]">
                    {ind.label}
                  </TableCell>
                  {masc.map((v, i) => (
                    <TableCell
                      key={`m-${i}`}
                      className="text-center border"
                    >
                      {v}
                    </TableCell>
                  ))}
                  {fem.map((v, i) => (
                    <TableCell
                      key={`f-${i}`}
                      className="text-center border"
                    >
                      {v}
                    </TableCell>
                  ))}
                  <TableCell className="text-center border font-semibold">
                    {total}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
