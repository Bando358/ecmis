"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { v4 as uuidv4 } from "uuid";
import * as z from "zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import UploadFile from "@/components/uploadFile";
import {
  checkCodeVih,
  createClient,
  fetchIncrementCounter,
} from "@/lib/actions/clientActions";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import { getAllRegion } from "@/lib/actions/regionActions";
import { Clinique, Region } from "@prisma/client";
import { getOneUser } from "@/lib/actions/authActions";

// ✅ Schéma de validation
const formSchema = z.object({
  idClinique: z.string().nonempty("Vous devez sélectionner un prescripteur"),
});

export default function ClientVihUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jsonDataError, setJsonDataError] = useState<unknown[] | null>(null);
  const [jsonData, setJsonData] = useState<unknown[] | null>(null);
  const [jsonDataVerifyTrue, setJsonDataVerifyTrue] = useState<
    unknown[] | null
  >(null);
  const [jsonDataVerifyFalse, setJsonDataVerifyFalse] = useState<
    unknown[] | null
  >(null);
  const [cleanJsonData, setCleanJsonData] = useState<unknown[] | null>(null);
  const [clinic, setClinic] = useState<Clinique[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [numberClientExisting, setNumberClientExisting] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  const [countClientPushTrue, setCountClientPushTrue] = useState(0); // % progression
  const [countClientPushFalse, setCountClientPushFalse] = useState(0); // % progression
  const [progressClient, setProgressClient] = useState(0); // % progression
  const [isProcessingClient, setIsProcessingClient] = useState(false);
  const [progress, setProgress] = useState(0); // % progression
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: session } = useSession();
  const idUser = session?.user.id as string;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      idClinique: "",
    },
  });

  function excelDateToJSDate(serial: number): Date {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // Excel commence le 30/12/1899
    const jsDate = new Date(
      excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000
    );
    return jsDate;
  }

  const handleVerifyFile = async () => {
    if (!cleanJsonData) return;

    setIsProcessing(true);
    setProgress(0);
    setJsonDataVerifyTrue([]);
    setJsonDataVerifyFalse([]);

    for (let index = 0; index < cleanJsonData.length; index++) {
      const element = cleanJsonData[index] as Record<string, unknown>;

      const isValid = await checkCodeVih(element.__EMPTY_1 as string);

      if (isValid) {
        setJsonDataVerifyTrue((prev) => [...(prev || []), element]);
      } else {
        setJsonDataVerifyFalse((prev) => [...(prev || []), element]);

        // mise à jour progression
        const newProgress = Math.round(
          ((index + 1) / cleanJsonData.length) * 100
        );
        setProgress(newProgress);
      }
    } // <-- Add this closing brace to end the for loop and function

    setIsProcessing(false);
    setIsVerifying(true);
  };

  const handlePushClientFalse = async () => {
    setIsProcessingClient(true);
    setProgressClient(0);
    setJsonDataError([]);
    setCountClientPushFalse(0);
    setCountClientPushTrue(0);

    if (!jsonDataVerifyFalse) return;

    for (let index = 0; index < jsonDataVerifyFalse.length; index++) {
      const renamedJsonDataVerifyFalse = jsonDataVerifyFalse.map((obj) => {
        const newObj: Record<string, unknown> = {};
        let i = 1;
        for (const value of Object.values(obj as Record<string, unknown>)) {
          newObj[`col${i}`] = value;
          i++;
        }
        return newObj;
      });

      const element = renamedJsonDataVerifyFalse[index] as Record<
        string,
        unknown
      >;

      const name = element.col2 as string;
      const lastname = element.col3 as string;
      const dateNaisse = excelDateToJSDate(element.col5 as number);
      const sexe = element.col6 as string;
      const niveauScolaire = element.col13 as string;
      const codeVih = element.col1 as string;
      const etatMatrimonial = element.col11 as string;
      const profession = element.col10 as string;
      const prenom = element.col2 as string;

      const idClinic = form.watch("idClinique");
      const idRegion = clinic.find((c) => c.id === idClinic)?.idRegion || null;
      const selectedRegion = regions.find((r) => r.id === idRegion);
      const selectedClinique = clinic.find((c) => c.id === idClinic);

      // 🛑 Vérification des infos essentielles
      if (!idClinic || !selectedRegion || !selectedClinique) {
        alert(
          "Impossible de créer un client : la clinique ou la région est manquante !"
        );
        setIsProcessingClient(false);
        return; // on sort de la boucle immédiatement
      }

      if (!codeVih || !prenom || !name || !lastname) {
        alert(
          "Impossible de créer un client : certaines données obligatoires sont absentes !"
        );
        setIsProcessingClient(false);
        return; // on sort de la boucle immédiatement
      }

      // ⚡ Vérification si déjà existant
      const alreadyExists = await checkCodeVih(codeVih);
      if (alreadyExists) {
        setNumberClientExisting((prev) => prev + 1);
        setCountClientPushFalse((prev) => prev + 1);
        setJsonDataError((prev) => [...(prev || []), element]);
      } else {
        // Génération du code
        const handleGenerateCode = async () => {
          const dateRef = new Date("2020-01-01");
          const year = dateRef.getFullYear();
          const month = (dateRef.getMonth() + 1).toString().padStart(2, "0");

          const cleanPrenom = prenom
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z]/g, "");

          const initials = cleanPrenom.slice(0, 3).toUpperCase();

          const { counter } = await fetchIncrementCounter(idClinic, year);
          const increment = String(counter).padStart(5, "0");

          return `${selectedRegion.codeRegion}/${selectedClinique.codeClinique}${selectedClinique.numClinique}/${year}/${month}/${increment}-${initials}`;
        };

        const codeVihGenerated = await handleGenerateCode();
        if (!codeVihGenerated) {
          alert("Erreur lors de la génération du code patient !");
          setIsProcessingClient(false);
          return; // on sort pour éviter l’appel Prisma invalide
        }

        // Préparation du client
        const Client = {
          id: uuidv4(),
          cliniqueId: idClinic,
          idClinique: idClinic,
          dateEnregistrement: new Date(),
          nom: name,
          prenom: lastname,
          dateNaissance: new Date(dateNaisse),
          sexe,
          lieuNaissance: null,
          niveauScolaire: niveauScolaire || null,
          ethnie: null,
          profession,
          serologie: "Positif",
          sourceInfo: "Prestataire de santé",
          quartier: null,
          statusClient: "Ancien",
          etatMatrimonial,
          code: codeVihGenerated,
          codeVih,
          tel_1: "00",
          tel_2: "",
          createdAt: new Date(),
          idUser: idUser || null,
        };

        // ✅ Vérification finale avant d’appeler Prisma
        if (!Client.cliniqueId || !Client.idClinique) {
          alert("Client invalide : la clinique est manquante.");
          setIsProcessingClient(false);
          return; // éviter Runtime PrismaClientValidationError
        }

        const newClient = await createClient(Client);
        if (!newClient) {
          setCountClientPushFalse((prev) => prev + 1);
          setJsonDataError((prev) => [...(prev || []), element]);
        } else {
          setCountClientPushTrue((prev) => prev + 1);
        }
      }

      // Progression
      const newProgress = Math.round(
        ((index + 1) / jsonDataVerifyFalse.length) * 100
      );
      setProgressClient(newProgress);
    }

    setIsProcessingClient(false);
    setProgressClient(100);

    if (countClientPushTrue > 0) {
      alert(
        `${
          countClientPushTrue < 10 ? "0" : ""
        }${countClientPushTrue} ✅ Importation terminée avec succès !`
      );
    }
  };

  // ⚡ Fonction téléchargement Excel
  const handleDownloadExcel = () => {
    if (!jsonDataVerifyFalse || jsonDataVerifyFalse.length === 0) return;
    // Récupérer les clés du premier élément pour les en-têtes

    const element = jsonData?.shift() as object;
    // ajouter les en-têtes au début du tableau
    jsonDataVerifyFalse.unshift(element);
    const ws = XLSX.utils.json_to_sheet(jsonDataVerifyFalse as object[]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Non validés");

    XLSX.writeFile(wb, "non-valides.xlsx");
  };
  // ⚡ Fonction téléchargement Excel
  const handleDownloadExcelError = () => {
    if (!jsonDataError || jsonDataError.length === 0) return;
    // Récupérer les clés du premier élément pour les en-têtes

    // const element = jsonDataError?.shift() as object;
    // ajouter les en-têtes au début du tableau
    // jsonDataError.unshift(element);
    const ws = XLSX.utils.json_to_sheet(jsonDataError as object[]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Non validés");

    XLSX.writeFile(wb, "non-valides.xlsx");
  };

  useEffect(() => {
    const fetchData = async () => {
      const userObject = await getOneUser(idUser);
      const allClinique = await getAllClinique();
      const allRegion = await getAllRegion();
      setRegions(allRegion);

      if (
        userObject?.idCliniques.length &&
        userObject?.idCliniques.length > 0
      ) {
        const tabId = userObject.idCliniques;
        for (let index = 0; index < tabId.length; index++) {
          const element = allClinique.filter((c: Clinique) => c.id === tabId[index]);
          setClinic(element);
        }
      } else {
        setClinic(allClinique);
      }
    };
    fetchData();
  }, [session, idUser]);
  useEffect(() => {
    console.log("jsonData", jsonData);
    if (!jsonData) return;
    const renamedJsonDataVerifyFalse = jsonData.map((obj) => {
      const newObj: Record<string, unknown> = {};
      let index = 1;
      for (const value of Object.values(obj as Record<string, unknown>)) {
        newObj[`col${index}`] = value;
        index++;
      }
      return newObj;
    });
    setCleanJsonData(renamedJsonDataVerifyFalse);
  }, [jsonData]);

  return (
    <AnimatePresence>
      <motion.div
        key="upload"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.4 }}
        className="max-w-lg mx-auto mt-10"
      >
        <h2 className="text-xl font-bold mb-4">Importer un fichier Excel</h2>
        <UploadFile
          onFileSelect={(file) => setSelectedFile(file)}
          onJsonConvert={(json) => setJsonData(json)}
        />
        {selectedFile && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 bg-linear-to-r from-green-600 to-yellow-500 bg-clip-text"
          >
            ✅ {selectedFile.name} prêt à être converti.
          </motion.p>
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
            <div className="mt-4">
              {jsonData && jsonData.length > 0 && (
                <div className="mt-6">
                  <Button
                    className="mx-auto block mb-2"
                    variant="secondary"
                    onClick={handleVerifyFile}
                    disabled={
                      !jsonData || jsonData.length === 0 || isProcessing
                    }
                  >
                    {isProcessing
                      ? "Vérification en cours..."
                      : "Vérifier les données"}
                  </Button>

                  {isProcessing && (
                    <div className="my-2">
                      <Progress value={progress} className="w-2/3 mx-auto" />
                      <p className="text-center text-sm mt-1">{progress}%</p>
                    </div>
                  )}
                  {isVerifying && (
                    <div className="mt-4 text-center">
                      <p className="mt-4 bg-linear-to-r from-green-600 to-yellow-500 bg-clip-text font-semibold">
                        ✅ Trouvés :{" "}
                        {(jsonDataVerifyTrue?.length ?? 0) > 0
                          ? (jsonDataVerifyTrue?.length ?? 0) + 1
                          : 0}
                      </p>
                      <p className="text-red-600 font-semibold mb-2">
                        ❌ Absent :{" "}
                        {(jsonDataVerifyFalse?.length ?? 0) > 0
                          ? jsonDataVerifyFalse?.length ?? 0
                          : 0}
                        <span
                          onClick={handleDownloadExcel}
                          className="text-blue-600 cursor-pointer underline ml-2"
                        >
                          Download file
                        </span>
                      </p>
                      {jsonDataVerifyFalse &&
                        jsonDataVerifyFalse.length > 0 && (
                          <div className="flex flex-col items-center justify-center">
                            <Form {...form}>
                              <form
                                // onSubmit={form.handleSubmit(onSubmit)}
                                className="space-y-4 mx-auto "
                              >
                                {/* Champ Select (Prescripteur) */}
                                <FormField
                                  control={form.control}
                                  name="idClinique"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>
                                        Sélectionnez la clinique
                                      </FormLabel>
                                      <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                      >
                                        <FormControl>
                                          <SelectTrigger className="w-full bg-gray-50 opacity-80">
                                            <SelectValue placeholder="Choisissez un prescripteur..." />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {clinic.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                              {c.nomClinique}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </form>
                            </Form>
                            <Button
                              className="mx-auto block my-2"
                              variant="secondary"
                              onClick={handlePushClientFalse}
                              // onClick={() => {
                              //   alert("Not yet implemented");
                              // }}
                              disabled={form.watch("idClinique") === ""}
                            >
                              Créer le(s) {jsonDataVerifyFalse.length} client(s)
                              dans la base
                            </Button>
                          </div>
                        )}
                      {countClientPushTrue > 0 || countClientPushFalse > 0 ? (
                        <div className="w-full">
                          <p className="mt-4 bg-linear-to-r from-green-600 to-yellow-500 bg-clip-text font-semibold">
                            {countClientPushTrue > 0 || countClientPushFalse > 0
                              ? " ✅ Importer Correctement : "
                              : ""}
                            {countClientPushTrue < 10
                              ? "0" + countClientPushTrue
                              : countClientPushTrue}
                          </p>
                          <p className="text-red-600 font-semibold mb-2">
                            {countClientPushFalse > 0 || countClientPushTrue > 0
                              ? " ❌ Echec : "
                              : ""}
                            {countClientPushFalse < 10
                              ? "0" + countClientPushFalse
                              : countClientPushFalse}
                            <span
                              onClick={handleDownloadExcelError}
                              className="text-blue-600 cursor-pointer underline ml-2"
                            >
                              Download file
                            </span>
                          </p>
                          <p className="text-red-600 font-semibold mb-2">
                            {numberClientExisting > 0
                              ? " 🤦🤦‍♂️ Clients Existants : "
                              : ""}
                            {numberClientExisting < 10 &&
                              numberClientExisting > 0 &&
                              "0" + numberClientExisting}
                          </p>
                          {isProcessingClient && (
                            <div className="my-2">
                              <Progress
                                value={progressClient}
                                className="w-2/3 mx-auto"
                              />
                              <p className="text-center text-sm mt-1">
                                {progressClient}%
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        ""
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
