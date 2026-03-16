"use client";
import { useEffect, useState } from "react";

import { useForm, SubmitHandler, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import {
  getAllGrossesseByIdClient,
  updateGrossesse,
} from "@/lib/actions/grossesseActions";
import { getAllSaaByIdClient, createSaa } from "@/lib/actions/saaActions";
import { Saa, Grossesse } from "@prisma/client";
import { TableName } from "@prisma/client";
import { Button } from "@/components/ui/button";

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
import ConstanteClient from "@/components/constanteClient";
import { Separator } from "@/components/ui/separator";
import { updateRecapVisite } from "@/lib/actions/recapActions";
import { Checkbox } from "@/components/ui/checkbox";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import type { SharedFormProps } from "./types";

const tabTypeAvortement = [
  { value: "spontanee", label: "Spontanée" },
  { value: "provoquee", label: "Provoquée" },
  { value: "therapeutique", label: "Thérapeutique" },
];

const tabMethodeAvortement = [
  { value: "medicamenteux", label: "Médicamenteux" },
  { value: "chirurgical", label: "Chirurgical" },
];

const tabMotifDemande = [
  { value: "viol", label: "Viol" },
  { value: "inceste", label: "Inceste" },
  { value: "eleve_ecoliere", label: "Élève/Écolière" },
  { value: "pere_inconnu", label: "Père Inconnu" },
  { value: "autre", label: "Autre" },
];

const tabTypePec = [
  { value: "amiu", label: "AMIU" },
  { value: "misoprostol", label: "Misoprostol" },
];

const tabTraitementComplication = [
  {
    value: "intervention_medicamenteuse",
    label: "Intervention médicamenteuse",
  },
  { value: "intervention_chirurgicale", label: "Intervention chirurgicale" },
  { value: "complication_tai", label: "Complication liée à la TAI" },
];

// Composant pour les champs conditionnels
const ConditionalFields = ({ form }: { form: UseFormReturn<Saa> }) => {
  const showConditionalFields =
    form.watch("saaCounsellingPre") === false &&
    form.watch("saaSuiviPostAvortement") === false;

  return (
    <AnimatePresence>
      {showConditionalFields && (
        <motion.div
          key="saa-conditional-fields"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="overflow-hidden"
        >
      <div className="pt-2">
        <FormField
          control={form.control}
          name="saaMethodeAvortement"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">
                {"Méthode d'avortement"}
              </FormLabel>
              <Select onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Méthode d'avortement" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tabMethodeAvortement.map((option, index) => (
                    <SelectItem key={index} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="saaTypeAvortement"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">
                {"Type d'avortement"}
              </FormLabel>
              <Select required onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Type d'avortement" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tabTypeAvortement.map((option, index) => (
                    <SelectItem key={index} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="saaConsultationPost"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
              <FormControl>
                <Checkbox
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="font-normal">
                  Consultation post-avortement
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="saaCounsellingPost"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
              <FormControl>
                <Checkbox
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="font-normal">
                  Counselling post-avortement
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        <Separator className="my-3" />

        <FormField
          control={form.control}
          name="saaTypePec"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">
                Type de prise en charge (optionnel)
              </FormLabel>
              <Select onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Type de PEC" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tabTypePec.map((option, index) => (
                    <SelectItem key={index} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="saaTraitementComplication"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">
                Traitement des complications (optionnel)
              </FormLabel>
              <Select onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Traitement des complications" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tabTraitementComplication.map((option, index) => (
                    <SelectItem key={index} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function SaaForm({ clientId, visites, allPrescripteur, isPrescripteur, client, idUser }: SharedFormProps) {
  const [grossesses, setGrossesses] = useState<Grossesse[]>([]);
  const [selectedSaa, setSelectedSaa] = useState<Saa[]>([]);

  const { canCreate } = usePermissionContext();



  useEffect(() => {
    const fetchData = async () => {
      const [resultSaa, resultGrossesse] = await Promise.all([
        getAllSaaByIdClient(clientId),
        getAllGrossesseByIdClient(clientId),
      ]);

      setSelectedSaa(resultSaa as Saa[]);
      setGrossesses(
        Array.isArray(resultGrossesse)
          ? resultGrossesse.filter((g) => g.grossesseInterruption !== true)
          : []
      );
    };
    fetchData();
  }, [clientId]);

  const form = useForm<Saa>({
    defaultValues: {
      saaCounsellingPre: false,
      saaSuiviPostAvortement: false,
    },
  });

  const onSubmit: SubmitHandler<Saa> = async (data) => {
    if (!canCreate(TableName.SAA)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }
    const formattedData = {
      ...data,
      saaIdUser: form.getValues("saaIdUser"),
      saaIdClient: clientId,
      saaIdClinique: client?.idClinique || "",
      saaCounsellingPre: form.getValues("saaCounsellingPre") ?? false,
      saaConsultationPost: form.getValues("saaConsultationPost") ?? false,
      saaCounsellingPost: form.getValues("saaCounsellingPost") ?? false,
    };

    console.log("Formatted Data:", formattedData);
    try {
      await createSaa(formattedData);
      await updateRecapVisite(
        form.watch("saaIdVisite"),
        form.watch("saaIdUser"),
        "11 Fiche SAA"
      );

      const grossesseId = form.getValues("saaIdGrossesse");
      if (grossesseId) {
        // Fetch the existing grossesse data
        const existingGrossesse = grossesses.find(
          (g) => g && g.id === grossesseId
        );
        if (
          existingGrossesse &&
          existingGrossesse.grossesseInterruption !== true
        ) {
          await updateGrossesse(grossesseId, {
            ...existingGrossesse,
            grossesseInterruption: true,
            grossesseMotifInterruption: "Avortement",
          });
        }
      }

      toast.success("Formulaire SAA créé avec succès! 🎉");
    } catch (error) {
      toast.error("La création du formulaire SAA a échoué");
      console.error("Erreur lors de la création du formulaire SAA:", error);
    }
  };

  return (
    <div className="flex flex-col justify-center max-w-4xl mx-auto px-4 py-2 border border-blue-200/60 rounded-md">
      <ConstanteClient idVisite={form.watch("saaIdVisite")} />
      <h2 className="text-2xl text-blue-900 font-black text-center">
        Formulaire de Soins Après Avortement (SAA)
      </h2>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-2 max-w-6xl rounded-sm mx-auto px-4 py-2 bg-white border border-blue-200/50 shadow-md shadow-blue-100/30"
        >
          <div className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md">
            <FormField
              control={form.control}
              name="saaIdVisite"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sélectionnez la visite</FormLabel>
                  <Select
                    required
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Visite à sélectionner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {visites.map((visite, index) => (
                        <SelectItem
                          key={index}
                          value={visite.id}
                          disabled={selectedSaa.some(
                            (p) => p.saaIdVisite === visite.id
                          )}
                        >
                          {new Date(visite.dateVisite).toLocaleDateString(
                            "fr-FR"
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {grossesses.length > 0 &&
              grossesses[0].grossesseInterruption === false && (
                <FormField
                  control={form.control}
                  name="saaIdGrossesse"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">
                        Sélectionnez la grossesse (optionnel)
                      </FormLabel>
                      <Select onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Grossesse à sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {grossesses.map((grossesse, index) => (
                            <SelectItem
                              key={index}
                              value={grossesse.id}
                              disabled={selectedSaa.some(
                                (p) => p.saaIdGrossesse === grossesse.id
                              )}
                            >
                              {grossesse.grossesseDdr &&
                                new Date(
                                  grossesse.grossesseDdr
                                ).toLocaleDateString("fr-FR")}{" "}
                              -{" "}
                              {grossesse.termePrevu &&
                                new Date(
                                  grossesse.termePrevu
                                ).toLocaleDateString("fr-FR")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
          </div>

          <div className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md">
            <FormField
              control={form.control}
              name="saaSuiviPostAvortement"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-normal">
                      Consultation post-Abortum suivi
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="saaCounsellingPre"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-normal">
                      Counselling pré-avortement
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {/* Champ de motif avec transition */}
            <AnimatePresence>
              {form.watch("saaCounsellingPre") && (
                <motion.div
                  key="saa-motif-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden mt-2"
                >
                  <FormField
                    control={form.control}
                    name="saaMotifDemande"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium">
                          Motif de demande (optionnel)
                        </FormLabel>
                        <Select onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Motif de demande" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tabMotifDemande.map((option, index) => (
                              <SelectItem key={index} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <Separator className="my-3" />

            {/* Champs conditionnels avec transition */}
            <ConditionalFields form={form} />
          </div>

          {isPrescripteur === true ? (
            <FormField
              control={form.control}
              name="saaIdUser"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} value={idUser} className="hidden" />
                  </FormControl>
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="saaIdUser"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">
                    Sélectionnez le prescripteur
                  </FormLabel>
                  <Select required onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionner un prescripteur" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allPrescripteur.map((prescripteur, index) => (
                        <SelectItem key={index} value={prescripteur.id}>
                          <span>{prescripteur.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="w-full mt-4"
          >
            {form.formState.isSubmitting ? "Soumission..." : "Soumettre"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
