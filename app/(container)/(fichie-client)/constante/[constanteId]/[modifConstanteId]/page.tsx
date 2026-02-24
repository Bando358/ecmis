"use client";
import { use, useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { useClientContext } from "@/components/ClientContext";

import {
  updateConstante,
  getOneConstante,
} from "@/lib/actions/constanteActions";
import { useSession } from "next-auth/react";
import { TableName, Visite } from "@prisma/client";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { Button } from "@/components/ui/button";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Constante } from "@prisma/client";
import { getOneVisite } from "@/lib/actions/visiteActions";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Loader2, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Retour from "@/components/retour";

export default function ConstantePage({
  params,
}: {
  params: Promise<{ modifConstanteId: string }>;
}) {
  const { modifConstanteId } = use(params);
  const [visite, setVisite] = useState<Visite | null>(null);
  const [constante, setConstante] = useState<Constante>();
  const [isLoading, setIsLoading] = useState(true);

  const [resulImc, setResulImc] = useState<number>(0);
  const [etatImc, setEtatImc] = useState<string>("");
  const [styleImc, setStyleImc] = useState<string>("");
  const [isVisible, setIsVisible] = useState(false);
  const { setSelectedClientId } = useClientContext();
  const { canUpdate } = usePermissionContext();

  const { data: session } = useSession();
  const idPrestataire = session?.user?.id || "";
  const router = useRouter();

  // Chargement initial optimisé : requêtes en parallèle
  useEffect(() => {
    if (!idPrestataire || !modifConstanteId) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);

        const oneConstante = await getOneConstante(modifConstanteId);

        if (oneConstante) {
          setConstante(oneConstante);
          setSelectedClientId(oneConstante.idClient);

          const visiteData = await getOneVisite(oneConstante.idVisite);
          setVisite(visiteData);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données :", error);
        toast.error("Erreur lors du chargement des données");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [idPrestataire, modifConstanteId, setSelectedClientId]);

  const form = useForm<Constante>({
    defaultValues: {
      poids: 0,
      taille: null,
      psSystolique: null,
      psDiastolique: null,
      temperature: null,
      lieuTemprature: "",
      pouls: null,
      frequenceRespiratoire: null,
      saturationOxygene: null,
      imc: null,
      etatImc: "",
      idClient: "",
      idUser: "",
      idVisite: "",
    },
  });

  // Réinitialiser le formulaire quand constante est chargée
  useEffect(() => {
    if (constante && !isLoading) {
      form.reset({
        poids: constante.poids,
        taille: constante.taille,
        psSystolique: constante.psSystolique,
        psDiastolique: constante.psDiastolique,
        temperature: constante.temperature,
        lieuTemprature: constante.lieuTemprature,
        pouls: constante.pouls,
        frequenceRespiratoire: constante.frequenceRespiratoire,
        saturationOxygene: constante.saturationOxygene,
        imc: constante.imc,
        etatImc: constante.etatImc,
        idClient: constante.idClient,
        idUser: idPrestataire,
        idVisite: constante.idVisite,
      });
    }
  }, [constante, isLoading, form, idPrestataire]);

  const watchPoids = form.watch("poids") || 0;
  const watchTaille = form.watch("taille") || 0;

  // Calcul IMC — utilise une variable locale pour éviter le stale state
  useEffect(() => {
    if (watchPoids > 0 && watchTaille > 0) {
      const imc = parseFloat(
        (watchPoids / ((watchTaille / 100) * (watchTaille / 100))).toFixed(2),
      );
      setResulImc(imc);
      form.setValue("imc", imc);

      let newEtat = "";
      let newStyle = "";
      if (imc < 18.5) {
        newEtat = "Maigreur";
        newStyle = "text-yellow-500 font-black";
      } else if (imc < 25) {
        newEtat = "Poids normal";
        newStyle = "text-green-500 font-black";
      } else if (imc < 30) {
        newEtat = "Surpoids";
        newStyle = "text-orange-500 font-black";
      } else {
        newEtat = "Obésité";
        newStyle = "text-red-600 font-black";
      }
      setEtatImc(newEtat);
      setStyleImc(newStyle);
      form.setValue("etatImc", newEtat);
    } else {
      setResulImc(0);
      setEtatImc("");
      setStyleImc("");
      form.setValue("imc", 0);
      form.setValue("etatImc", "");
    }
  }, [watchPoids, watchTaille, form]);

  const onSubmit: SubmitHandler<Constante> = async (data) => {
    const poids = parseFloat(data.poids as unknown as string) || 0;
    if (poids <= 0) {
      toast.error("Le poids doit être supérieur à 0.");
      return;
    }

    const formattedData = {
      ...data,
      idUser: idPrestataire,
      idClient: constante?.idClient,
      idVisite: constante?.idVisite,
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
      if (constante) {
        await updateConstante(modifConstanteId, formattedData);
        const oneConstante = await getOneConstante(modifConstanteId);
        if (oneConstante) {
          setConstante(oneConstante);
        }
      }
      toast.success("Constante modifiée avec succès !");
    } catch (error) {
      console.error("Erreur lors de la modification de la constante :", error);
      toast.error("La modification de la constante a échoué.");
    } finally {
      setIsVisible(false);
    }
  };

  const handleUpdateConstante = () => {
    if (!canUpdate(TableName.CONSTANTE)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_UPDATE);
      return router.back();
    }
    if (constante) {
      form.reset({
        poids: constante.poids,
        taille: constante.taille,
        psSystolique: constante.psSystolique,
        psDiastolique: constante.psDiastolique,
        temperature: constante.temperature,
        lieuTemprature: constante.lieuTemprature,
        pouls: constante.pouls,
        frequenceRespiratoire: constante.frequenceRespiratoire,
        saturationOxygene: constante.saturationOxygene,
        imc: constante.imc,
        etatImc: constante.etatImc,
        idClient: constante.idClient,
        idUser: idPrestataire,
        idVisite: constante.idVisite,
      });
      setIsVisible(true);
    }
  };

  return (
    <div className="w-full relative">
      <Retour />
      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <Card className=" mx-auto border-blue-200/60 shadow-sm shadow-blue-100/30">
                <CardContent className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </CardContent>
              </Card>
            </motion.div>
          ) : isVisible ? (
            <motion.div
              key="edit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="border-blue-200/60 shadow-sm shadow-blue-100/30">
                <CardHeader className="bg-blue-50/40 rounded-t-xl border-b border-blue-100/60 pb-4">
                  <CardTitle className="text-lg font-semibold text-blue-900 text-center">
                    Modifier - Constantes
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-4 max-w-4xl mx-auto px-4 py-4"
                    >
                      <div className="text-sm text-gray-600 bg-blue-50/50 rounded-md p-2">
                        Visite du{" "}
                        {visite
                          ? new Date(visite.dateVisite).toLocaleDateString("fr-FR")
                          : "—"}{" "}
                        {visite?.motifVisite ? `— ${visite.motifVisite}` : ""}
                      </div>

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
                              <Input
                                required
                                type="number"
                                step="0.1"
                                {...field}
                                value={field.value ?? ""}
                              />
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
                              <Input
                                type="number"
                                step="0.1"
                                {...field}
                                value={field.value ?? ""}
                              />
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
                              <Input
                                type="number"
                                step="0.1"
                                {...field}
                                value={field.value ?? ""}
                              />
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
                              <Input
                                type="number"
                                {...field}
                                value={field.value ?? ""}
                              />
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
                              <Input
                                type="number"
                                {...field}
                                value={field.value ?? ""}
                              />
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
                              <Input
                                type="number"
                                {...field}
                                value={field.value ?? ""}
                              />
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
                              <Input
                                disabled
                                type="number"
                                {...field}
                                value={resulImc ?? ""}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className={`${styleImc}`}>
                        <FormField
                          control={form.control}
                          name="etatImc"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>État IMC</FormLabel>
                              <FormControl>
                                <Input
                                  disabled
                                  {...field}
                                  value={etatImc ?? ""}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <input type="hidden" {...form.register("idClient")} />
                      <input type="hidden" {...form.register("idUser")} />
                      <input type="hidden" {...form.register("idVisite")} />

                      <div className="flex justify-center gap-4 pt-4 border-t border-blue-100/60 mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsVisible(false)}
                          disabled={form.formState.isSubmitting}
                        >
                          Annuler
                        </Button>
                        <Button
                          type="submit"
                          disabled={form.formState.isSubmitting}
                        >
                          {form.formState.isSubmitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              En cours...
                            </>
                          ) : (
                            "Appliquer"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <Card className=" mx-auto border-blue-200/60 shadow-sm shadow-blue-100/30">
                <CardHeader className="bg-blue-50/40 rounded-t-xl border-b border-blue-100/60 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold text-blue-900">
                        Constantes
                      </CardTitle>
                      <CardDescription className="text-blue-700/60">
                        Fiche des constantes
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="divide-y divide-blue-100/60">
                    <div className="grid grid-cols-3 gap-x-4 py-2.5">
                      <span className="text-sm font-medium text-blue-800">
                        Date de visite
                      </span>
                      <span className="col-span-2 text-sm text-gray-700">
                        {visite
                          ? new Date(visite.dateVisite).toLocaleDateString("fr-FR")
                          : "—"}
                      </span>
                    </div>

                    {constante?.taille != null && (
                      <div className="grid grid-cols-3 gap-x-4 py-2.5">
                        <span className="text-sm font-medium text-blue-800">
                          Taille
                        </span>
                        <span className="col-span-2 text-sm text-gray-700">
                          {constante.taille} cm
                        </span>
                      </div>
                    )}

                    {constante?.poids != null && (
                      <div className="grid grid-cols-3 gap-x-4 py-2.5">
                        <span className="text-sm font-medium text-blue-800">
                          Poids
                        </span>
                        <span className="col-span-2 text-sm text-gray-700">
                          {constante.poids} kg
                        </span>
                      </div>
                    )}

                    {constante?.psSystolique != null && (
                      <div className="grid grid-cols-3 gap-x-4 py-2.5">
                        <span className="text-sm font-medium text-blue-800">
                          Pression systolique
                        </span>
                        <span className="col-span-2 text-sm text-gray-700">
                          {constante.psSystolique} mmHg
                        </span>
                      </div>
                    )}

                    {constante?.psDiastolique != null && (
                      <div className="grid grid-cols-3 gap-x-4 py-2.5">
                        <span className="text-sm font-medium text-blue-800">
                          Pression diastolique
                        </span>
                        <span className="col-span-2 text-sm text-gray-700">
                          {constante.psDiastolique} mmHg
                        </span>
                      </div>
                    )}

                    {constante?.temperature != null && (
                      <div className="grid grid-cols-3 gap-x-4 py-2.5">
                        <span className="text-sm font-medium text-blue-800">
                          Température
                        </span>
                        <span className="col-span-2 text-sm text-gray-700">
                          {constante.temperature} °C
                        </span>
                      </div>
                    )}

                    {constante?.lieuTemprature && (
                      <div className="grid grid-cols-3 gap-x-4 py-2.5">
                        <span className="text-sm font-medium text-blue-800">
                          Lieu de température
                        </span>
                        <span className="col-span-2 text-sm text-gray-700">
                          {constante.lieuTemprature}
                        </span>
                      </div>
                    )}

                    {constante?.pouls != null && (
                      <div className="grid grid-cols-3 gap-x-4 py-2.5">
                        <span className="text-sm font-medium text-blue-800">
                          Pouls
                        </span>
                        <span className="col-span-2 text-sm text-gray-700">
                          {constante.pouls} bpm
                        </span>
                      </div>
                    )}

                    {constante?.frequenceRespiratoire != null && (
                      <div className="grid grid-cols-3 gap-x-4 py-2.5">
                        <span className="text-sm font-medium text-blue-800">
                          Fréquence respiratoire
                        </span>
                        <span className="col-span-2 text-sm text-gray-700">
                          {constante.frequenceRespiratoire} c/min
                        </span>
                      </div>
                    )}

                    {constante?.saturationOxygene != null && (
                      <div className="grid grid-cols-3 gap-x-4 py-2.5">
                        <span className="text-sm font-medium text-blue-800">
                          Saturation oxygène
                        </span>
                        <span className="col-span-2 text-sm text-gray-700">
                          {constante.saturationOxygene} %
                        </span>
                      </div>
                    )}

                    {constante?.imc != null && (
                      <div className="grid grid-cols-3 gap-x-4 py-2.5">
                        <span className="text-sm font-medium text-blue-800">
                          IMC
                        </span>
                        <span className="col-span-2 text-sm">
                          {constante.imc <= 25 ? (
                            <span className="text-green-500 font-semibold">
                              {Math.floor(constante.imc)}
                              {" = "} {constante.etatImc}
                            </span>
                          ) : (
                            <span className="text-red-500 font-semibold">
                              {Math.floor(constante.imc)}
                              {" = "}
                              {constante.etatImc}
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-center gap-4 border-t border-blue-100/60 pt-4">
                  <Button variant="outline" onClick={() => router.back()}>
                    Retour
                  </Button>
                  <Button onClick={handleUpdateConstante}>
                    <Pencil className="h-4 w-4 mr-2" /> Modifier
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
