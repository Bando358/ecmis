"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import UploadFile from "@/components/uploadFile";
import { checkClientVisiteOnDate } from "@/lib/actions/visiteActions";
import { getAllClientByTabCodeVih } from "@/lib/actions/clientActions";
import {
  checkIdVisiteExists,
  createPecVihViaData,
} from "@/lib/actions/pecVihActions";
import { PecVih } from "@prisma/client";
import { useSession } from "next-auth/react";

export default function VisitePecVihUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jsonData, setJsonData] = useState<unknown[] | null>(null);
  const [existeJsonData, setExisteJsonData] = useState<unknown[]>([]);
  const [progress, setProgress] = useState(0);
  const [countValidPush, setCountValidPush] = useState(0);
  const [countInvalidPush, setCountInvalidPush] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: session } = useSession();
  const idUser = session?.user.id as string;

  const handlePushData = async () => {
    if (!jsonData) return;

    setIsProcessing(true);
    setProgress(0);
    setExisteJsonData([]); // reset avant nouveau traitement

    // récupérer toutes les valeurs de __EMPTY_1
    let tabCode: (unknown | null)[] = [];
    interface ExcelRow {
      [key: string]: unknown;
      __EMPTY_1?: unknown;
    }
    tabCode = (jsonData as ExcelRow[]).map(
      (item: ExcelRow) => item["__EMPTY_1"] ?? null
    );
    tabCode.shift(); // enlève l'entête

    const stringTabCode = tabCode.filter(
      (code): code is string => typeof code === "string"
    );
    const client = await getAllClientByTabCodeVih(stringTabCode);

    const excelDateToJSDate = (excelDate: number): Date => {
      const utc_days = Math.floor(excelDate - 25569);
      const utc_value = utc_days * 86400;
      return new Date(utc_value * 1000);
    };

    const total = jsonData.length - 1; // -1 pour l'entête
    let processed = 0;

    let newJsonData = [...jsonData]; // copie à modifier
    let validPush = 0;
    const tempExiste: unknown[] = []; // tableau temporaire des existants

    for (let index = 1; index < jsonData.length; index++) {
      const element = client.find(
        (el: { codeVih: unknown }) => el.codeVih === tabCode[index]
      );

      if (element) {
        const rawDate = (jsonData as { __EMPTY_6: number }[])[index].__EMPTY_6;
        const visiteDate =
          typeof rawDate === "number"
            ? excelDateToJSDate(rawDate)
            : new Date(rawDate);

        const visite = await checkClientVisiteOnDate(
          element.id,
          visiteDate,
          idUser,
          element.idClinique
        );

        if (visite) {
          const rawDateRdv = (jsonData as { __EMPTY_7: number }[])[index]
            .__EMPTY_7;
          const dateRdv =
            typeof rawDateRdv === "number"
              ? excelDateToJSDate(rawDateRdv)
              : new Date(rawDateRdv);

          const pecVihModel = {
            pecVihCreatedAt: new Date(),
            pecVihUpdatedAt: new Date(),
            pecVihCounselling: true,
            pecVihTypeclient: "suivi",
            pecVihMoleculeArv: (jsonData as { __EMPTY_9: string }[])[index]
              .__EMPTY_9 as string,
            pecDateRdvSuivi: dateRdv,
            pecVihAesArv: false,
            pecVihCotrimo: false,
            pecVihSpdp: true,
            pecVihIoPaludisme: false,
            pecVihIoTuberculose: false,
            pecVihIoAutre: false,
            pecVihSoutienPsychoSocial: true,
            pecVihIdUser: idUser,
            pecVihIdClient: visite.idClient,
            pecVihIdVisite: visite.id,
          };

          const existeIdVisite = await checkIdVisiteExists(
            pecVihModel.pecVihIdVisite
          );

          if (!existeIdVisite) {
            await createPecVihViaData(pecVihModel as PecVih);
            validPush++;

            // retire du tableau la ligne traitée
            newJsonData = newJsonData.filter(
              (row) =>
                (row as { __EMPTY_1?: string }).__EMPTY_1 !== element.codeVih
            );
          } else {
            // stocke comme "déjà existant"
            tempExiste.push(jsonData[index]);
          }
        }
      }

      processed++;
      setProgress(Math.round((processed / total) * 100));
    }

    // Supprime tous les éléments existants du jsonData
    if (tempExiste.length > 0) {
      newJsonData = newJsonData.filter((row) => !tempExiste.includes(row));
    }

    // mise à jour finale après la boucle
    setExisteJsonData(tempExiste);
    setJsonData(newJsonData);
    setCountValidPush(validPush);
    setCountInvalidPush(total);

    setIsProcessing(false);
  };

  return (
    <div className="max-w-lg mx-auto mt-10">
      <h1 className="text-xl font-bold mb-4">Importer un fichier Excel</h1>
      <UploadFile
        onFileSelect={(file) => setSelectedFile(file)}
        onJsonConvert={(json) => setJsonData(json)}
      />

      {selectedFile && (
        <p className="mt-4 bg-linear-to-r from-green-600 to-yellow-500 bg-clip-text">
          ✅ {selectedFile.name} prêt.
        </p>
      )}

      {jsonData && jsonData.length > 0 && (
        <div className="mt-6 overflow-x-auto border rounded-lg shadow">
          <table className="min-w-full border-collapse">
            <thead className="bg-blue-600 text-white">
              <tr>
                {Object.keys(jsonData[0] as object).map((key, index) => (
                  <th key={index} className="px-4 py-2 border">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jsonData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={rowIndex % 2 === 0 ? "bg-gray-100" : "bg-white"}
                >
                  {Object.values(row as Record<string, unknown>).map(
                    (value, colIndex) => (
                      <td key={colIndex} className="px-4 py-2 border text-sm">
                        {value as string}
                      </td>
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6">
            <Button
              className="mx-auto block mb-2"
              variant="secondary"
              onClick={handlePushData}
              disabled={!jsonData || jsonData.length === 0 || isProcessing}
            >
              {isProcessing
                ? "Envoi en cours..."
                : `Créer les ${jsonData.length - 1} visites PEC VIH `}
            </Button>

            {isProcessing && (
              <div className="my-2">
                <Progress value={progress} className="w-2/3 mx-auto" />
                <p className="text-center text-sm mt-1">{progress}%</p>
              </div>
            )}
          </div>
          <div className="my-4 text-center">
            {countInvalidPush > 0 && countValidPush > 0 && (
              <p className="mt-4 bg-linear-to-r from-green-600 to-yellow-500 bg-clip-text">
                ✅ Importer Correctement : {countValidPush} /{" "}
                {countInvalidPush - 1}{" "}
              </p>
            )}
            {existeJsonData.length > 0 && (
              <p className="mt-4 bg-linear-to-r from-red-600 to-yellow-500 bg-clip-text">
                ❌ Déjà existant (non importé) :{existeJsonData.length}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
