"use client";

import { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { Constante, TableName } from "@prisma/client";
import { createContante } from "@/lib/actions/constanteActions";
import { createRecapVisite } from "@/lib/actions/recapActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";

export type ConstanteVisiteOption = {
  id: string;
  dateVisite: Date;
  motifVisite: string;
  hasConstante: boolean;
};

interface ConstanteCreationFormProps {
  clientId: string;
  idUser: string;
  visites: ConstanteVisiteOption[];
  initialVisiteId?: string;
  onCreated?: () => void;
}

export default function ConstanteCreationForm({
  clientId,
  idUser,
  visites,
  initialVisiteId,
  onCreated,
}: ConstanteCreationFormProps) {
  const [resulImc, setResulImc] = useState<number>(0);
  const [etatImc, setEtatImc] = useState<string>("");
  const [styleImc, setStyleImc] = useState<string>("");

  const { canCreate } = usePermissionContext();

  const form = useForm<Constante>({
    defaultValues: {
      idClient: clientId,
      idUser,
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
      idVisite: initialVisiteId ?? "",
    },
  });

  // Pré-sélection de la visite si fournie par le parent
  useEffect(() => {
    if (initialVisiteId) {
      form.setValue("idVisite", initialVisiteId);
    }
  }, [initialVisiteId, form]);

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
        idClient: clientId,
        prescripteurs: [],
        formulaires: ["01 Créer la visite", "02 Fiche des constantes"],
      });
      toast.success("Constante créée avec succès !");
      onCreated?.();
    } catch (error) {
      toast.error("La création de la constante a échoué.");
      console.error("Erreur lors de la création de la constante :", error);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 w-full max-w-md mx-auto p-4 border border-blue-200/60 rounded-md bg-white"
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
                  {visites.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      Aucune visite disponible
                    </div>
                  ) : (
                    visites.map((visite) => (
                      <SelectItem
                        key={visite.id}
                        value={visite.id}
                        disabled={visite.hasConstante}
                      >
                        {new Date(visite.dateVisite).toLocaleDateString(
                          "fr-FR",
                        )}{" "}
                        — {visite.motifVisite}
                        {visite.hasConstante ? " (déjà saisie)" : ""}
                      </SelectItem>
                    ))
                  )}
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
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    placeholder="Axillaire, Buccal..."
                  />
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
  );
}
