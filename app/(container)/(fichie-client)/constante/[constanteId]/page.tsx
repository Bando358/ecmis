"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { useClientContext } from "@/components/ClientContext";
import {
  createContante,
  getAllContanteByIdClient,
} from "@/lib/actions/constanteActions";
import { createRecapVisite } from "@/lib/actions/recapActions";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { getOneClient } from "@/lib/actions/clientActions";
import { useSession } from "next-auth/react";
import { Visite, Constante, TableName } from "@prisma/client";
import { Button } from "@/components/ui/button";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { ArrowBigLeftDash } from "lucide-react";

export default function ConstantePage({
  params,
}: {
  params: Promise<{ constanteId: string }>;
}) {
  const { constanteId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [selectedConstante, setSelectedConstante] = useState<Constante[]>([]);
  const [resulImc, setResulImc] = useState<number>(0);
  const [etatImc, setEtatImc] = useState<string>("");
  const [styleImc, setStyleImc] = useState<string>("");
  const [client, setClient] = useState<{
    id: string;
    nom: string;
    prenom: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { canCreate } = usePermissionContext();

  const { setSelectedClientId } = useClientContext();
  const { data: session } = useSession();
  const router = useRouter();

  const idUser = session?.user?.id || "";

  useEffect(() => {
    setSelectedClientId(constanteId);
  }, [constanteId, setSelectedClientId]);

  // Chargement initial optimisé : requêtes en parallèle
  useEffect(() => {
    if (!idUser || !constanteId) return;

    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        // Requêtes indépendantes en parallèle
        const [resultConstante, resultVisites, clientData] =
          await Promise.all([
            getAllContanteByIdClient(constanteId),
            getAllVisiteByIdClient(constanteId),
            getOneClient(constanteId),
          ]);

        setSelectedConstante(resultConstante as Constante[]);
        setVisites(resultVisites as Visite[]);
        if (clientData) {
          setClient({
            id: clientData.id,
            nom: clientData.nom,
            prenom: clientData.prenom,
          });
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        toast.error("Erreur lors du chargement");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [idUser, constanteId]);

  const form = useForm<Constante>({
    defaultValues: {
      idClient: constanteId,
      idUser: idUser,
      poids: 0,
      taille: 0,
      psSystolique: null,
      psDiastolique: null,
      temperature: null,
      lieuTemprature: "",
      pouls: null,
      frequenceRespiratoire: null,
      saturationOxygene: null,
      imc: 0,
      etatImc: "",
      idVisite: "",
    },
  });

  const watchPoids = form.watch("poids") || 0;
  const watchTaille = form.watch("taille") || 0;

  useEffect(() => {
    if (watchPoids > 0 && watchTaille > 0) {
      const imc = parseFloat(
        (watchPoids / ((watchTaille / 100) * (watchTaille / 100))).toFixed(2),
      );
      setResulImc(imc);
      form.setValue("imc", imc);
      if (imc < 18.5) {
        setEtatImc("Maigreur");
        setStyleImc("text-yellow-500 font-black");
        form.setValue("etatImc", "Maigreur");
      } else if (imc < 25) {
        setEtatImc("Poids normal");
        setStyleImc("text-green-500 font-black");
        form.setValue("etatImc", "Poids normal");
      } else if (imc < 30) {
        setEtatImc("Surpoids");
        setStyleImc("text-orange-500 font-black");
        form.setValue("etatImc", "Surpoids");
      } else {
        setEtatImc("Obésité");
        setStyleImc("text-red-600 font-black");
        form.setValue("etatImc", "Obésité");
      }
    } else {
      setResulImc(0);
      setEtatImc("");
      setStyleImc("");
      form.setValue("imc", 0);
      form.setValue("etatImc", "");
    }
  }, [watchPoids, watchTaille, form]);

  const onSubmit: SubmitHandler<Constante> = async (data) => {
    if (!canCreate(TableName.CONSTANTE)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }

    if (!data.idVisite) {
      toast.error("Veuillez sélectionner une visite.");
      return;
    }

    const poids = parseFloat(data.poids as unknown as string) || 0;
    if (poids <= 0) {
      toast.error("Le poids doit être supérieur à 0.");
      return;
    }

    const formattedData = {
      ...data,
      idUser,
      poids,
      taille: parseFloat(data.taille as unknown as string) || 0,
      psSystolique:
        parseInt(data.psSystolique as unknown as string, 10) || null,
      psDiastolique:
        parseInt(data.psDiastolique as unknown as string, 10) || null,
      temperature: parseFloat(data.temperature as unknown as string) || null,
      pouls: parseInt(data.pouls as unknown as string, 10) || null,
      frequenceRespiratoire:
        parseInt(data.frequenceRespiratoire as unknown as string, 10) || null,
      saturationOxygene:
        parseInt(data.saturationOxygene as unknown as string, 10) || null,
    };

    try {
      await createContante(formattedData);
      await createRecapVisite({
        idVisite: form.watch("idVisite"),
        idClient: constanteId,
        prescripteurs: [],
        formulaires: ["01 Créer la visite", "02 Fiche des constantes"],
      });
      toast.success("Constante créée avec succès !");
      router.push(`/fiches/${constanteId}`);
    } catch (error) {
      toast.error("La création de la constante a échoué.");
      console.error("Erreur lors de la création de la constante :", error);
    }
  };

  // Affichage du loader pendant le chargement
  if (isLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-500">Chargement du formulaire...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full justify-center relative">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="sticky top-0 left-4 ml-3"
              onClick={() => router.back()}
            >
              <ArrowBigLeftDash className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Retour à la page précédente</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <h2 className="text-2xl text-blue-900 font-black text-center">
        Formulaire des constantes
      </h2>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4 max-w-3xl mx-auto p-4 m-4 border border-blue-200/60 rounded-md bg-white"
        >
          <FormField
            control={form.control}
            name="idVisite"
            rules={{ required: "Veuillez sélectionner une visite" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Visite <span className="text-red-500">*</span>
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Visite à sélectionner" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {visites.map((visite) => (
                      <SelectItem
                        key={visite.id}
                        value={visite.id}
                        disabled={selectedConstante.some(
                          (p) => p.idVisite === visite.id,
                        )}
                      >
                        {new Date(visite.dateVisite).toLocaleDateString(
                          "fr-FR",
                        )}{" "}
                        — {visite.motifVisite}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="poids"
              rules={{
                required: "Le poids est obligatoire",
                min: { value: 0.1, message: "Le poids doit être supérieur à 0" },
                max: { value: 500, message: "Poids invalide" },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Poids (kg) <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="taille"
              rules={{
                min: { value: 1, message: "La taille doit être supérieure à 0" },
                max: { value: 300, message: "Taille invalide" },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Taille (cm)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="psSystolique"
              rules={{
                min: { value: 50, message: "Valeur trop basse" },
                max: { value: 300, message: "Valeur trop haute" },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pression systolique (mmHg)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      type="number"
                      placeholder="120"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="psDiastolique"
              rules={{
                min: { value: 30, message: "Valeur trop basse" },
                max: { value: 200, message: "Valeur trop haute" },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pression diastolique (mmHg)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      type="number"
                      placeholder="80"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="temperature"
              rules={{
                min: { value: 30, message: "Température trop basse" },
                max: { value: 45, message: "Température trop haute" },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Température (°C)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lieuTemprature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lieu de température</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="Axillaire, Buccal..." />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pouls"
              rules={{
                min: { value: 20, message: "Valeur trop basse" },
                max: { value: 300, message: "Valeur trop haute" },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pouls (bpm)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="frequenceRespiratoire"
              rules={{
                min: { value: 5, message: "Valeur trop basse" },
                max: { value: 60, message: "Valeur trop haute" },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fréquence respiratoire (c/min)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="saturationOxygene"
              rules={{
                min: { value: 50, message: "Valeur trop basse" },
                max: { value: 100, message: "Maximum 100%" },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Saturation oxygène (%)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IMC</FormLabel>
                  <FormControl>
                    <Input disabled type="number" {...field} value={resulImc} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className={`${styleImc}`}>
            <FormField
              control={form.control}
              name="etatImc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>État IMC</FormLabel>
                  <FormControl>
                    <Input disabled {...field} value={etatImc} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <input type="hidden" {...form.register("idClient")} />
          <input type="hidden" {...form.register("idUser")} value={idUser} />

          <Button
            type="submit"
            className="mt-4 mx-auto block"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "En cours..." : "Créer la constante"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
