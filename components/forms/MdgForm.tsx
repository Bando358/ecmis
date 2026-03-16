"use client";
import { useEffect, useState } from "react";

import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import {
  createMedecine,
  getAllMedecineByIdClient,
} from "@/lib/actions/mdgActions";
import { Medecine, TableName } from "@prisma/client";
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
import ConstanteClient from "@/components/constanteClient";
import { MultiSelectField } from "@/components/multiSelectField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { updateRecapVisite } from "@/lib/actions/recapActions";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import type { SharedFormProps } from "./types";

type Option = {
  value: string;
  label: string;
};
const tabDiagnosticOptions: Option[] = [
  { value: "hepatiteB", label: "Hépatite B" },
  { value: "hepatiteC", label: "Hépatite C" },
  {
    value: "diarrheeSansDeshydratation",
    label: "Diarrhée Aiguë Sans Déshydratation",
  },
  {
    value: "diarrheeAvecSigneDeshydratation",
    label: "Diarrhée Aiguë Avec signe de Déshydratation",
  },
  {
    value: "diarrheeAvecDeshydratationSevere",
    label: "Diarrhée Aiguë Avec Déshydratation sévère",
  },
  { value: "pneumonieSimple", label: "Pneumonie Simple (IRA basse)" },
  { value: "pneumonieGrave", label: "Pneumonie Grave (IRA basse)" },
  { value: "bronchoPneumonie", label: "Broncho-Pneumonie (IRA basse)" },
  { value: "otitesMoyenneAiguE", label: "Otites Moyenne Aiguë (IRA haute)" },
  { value: "rhinopharyngite", label: "Rhinopharyngite (IRA haute)" },
  { value: "angine", label: "Angine (IRA haute)" },
  { value: "sinusite", label: "Sinusite (IRA haute)" },
  { value: "laryngite", label: "Laryngite (IRA haute)" },
  { value: "pian", label: "Pian" },
  {
    value: "bilharzioseUrinaire",
    label: "Cas suspect de bilharziose urinaire",
  },
  {
    value: "trichiasiseTrachomateux",
    label: "Cas suspect de trichiasis trachomateux",
  },
  { value: "hydrocele", label: "Cas suspect d'hydrocèle" },
  { value: "lymphoedeme", label: "Cas suspect de lymphoedème" },
  { value: "tetanos", label: "Tétanos" },
  { value: "coqueluche", label: "Coqueluche" },
  { value: "fievreTyphoide", label: "Fièvre Typhoïde" },
  { value: "fievreJaune", label: "Fièvre Jaune" },
  { value: "cholera", label: "Choléra" },
  { value: "tuberculose", label: "Tuberculose (CS)" },
  { value: "ulcere", label: "Ulcère de burili (CS)" },
  { value: "varicelle", label: "Varicelle" },
  { value: "dermatose", label: "Dermatose" },
  { value: "zona", label: "Zona" },
  { value: "hta", label: "HTA" },
  { value: "anemie", label: "Anémie" },
  { value: "paludisme", label: "Paludisme" },
];

const tabTypeAffectionOptions = [
  { value: "affection_digestives", label: "PEC - Affections Digestives" },
  { value: "affection_orl", label: "PEC - Affections ORL" },
  { value: "affection_pulmonaires", label: "PEC - Affections Pulmonaires" },
  { value: "affection_buccales", label: "PEC - Affections Buccales" },
  { value: "affection_cardiaques", label: "PEC - Affections Cardiaques" },
  { value: "affection_occulaires", label: "PEC - Affections Occulaires" },
  { value: "affection_autres", label: "PEC - Affections Autres" },
];

const tabSoinsInfirmier = [
  { value: "pansements", label: "Pansements" },
  { value: "injections", label: "Injections" },
  { value: "perfusions", label: "Perfusion" },
  { value: "autreSoins", label: "Autres Soins" },
  { value: "circoncision", label: "Circoncision Masculine" },
  { value: "suture", label: "Suture de plaie traumatique" },
  { value: "incision", label: "Incision d'abcès" },
  { value: "autres", label: "Autres petites chirurgies" },
];

const tabTraitement = [
  { value: "cta", label: "CTA" },
  { value: "quinine", label: "Quinine" },
  { value: "sro+zinc", label: "SRO + ZINC" },
];
const TabTypeFemme = [
  { value: "oui", label: "Oui" },
  { value: "non", label: "Non" },
];
const TabSuspicion = [
  { value: "simple", label: "Simple" },
  { value: "grave", label: "Grave" },
  { value: "ras", label: "R.A.S" },
];
const TabTypeVisite = [
  { value: "traite", label: "Traité" },
  { value: "controle", label: "Contrôlé" },
  { value: "refere", label: "Référé" },
];

export default function MdgForm({
  clientId,
  visites,
  allPrescripteur,
  isPrescripteur,
  client,
  idUser,
}: SharedFormProps) {

  const [selectedMedecine, setSelectedMedecine] = useState<Medecine[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<Option[]>([]);
  const { canCreate } = usePermissionContext();
  const [isFormLoading, setIsFormLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsFormLoading(true);
      try {
        const resultMedecine = await getAllMedecineByIdClient(clientId);
        setSelectedMedecine(resultMedecine as Medecine[]);
        const tabReverse = [...tabDiagnosticOptions.reverse()];
        setSelectedDiagnostic(tabReverse);
      } catch (error) {
        console.error("Erreur lors du chargement:", error);
      } finally {
        setIsFormLoading(false);
      }
    };
    fetchData();
  }, [clientId]);

  const form = useForm<Medecine>({
    defaultValues: {
      mdgDiagnostic: [],
      mdgConsultation: true,
      mdgCounselling: true,
      mdgTestRapidePalu: false,
      mdgSuspicionPalu: "ras",
      mdgEtatFemme: "non",
      mdgAutreDiagnostic: "",
      mdgMotifConsultation: "",
      mdgIdClient: clientId,
      mdgIdClinique: client?.idClinique || "",
    },
  });

  useEffect(() => {
    form.setValue("mdgIdClient", clientId);
    if (isPrescripteur) {
      form.setValue("mdgIdUser", idUser);
    }
  }, [clientId, isPrescripteur, idUser]);

  const onSubmit: SubmitHandler<Medecine> = async (data) => {
    if (!canCreate(TableName.MEDECINE)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }
    const { mdgDureeObservation, ...rest } = data;
    const formattedData = {
      ...rest,
      mdgIdUser: isPrescripteur ? idUser : form.getValues("mdgIdUser") || idUser,
      mdgIdClient: form.getValues("mdgIdClient"),
      mdgDureeObservation:
        parseFloat(mdgDureeObservation as unknown as string) || 0,
      mdgIdClinique: client?.idClinique || "",
    };
    try {
      const newRecord = await createMedecine(formattedData as Medecine);
      await updateRecapVisite(
        form.watch("mdgIdVisite"),
        form.watch("mdgIdUser"),
        "17 Fiche Medecine générale",
      );
      setSelectedMedecine((prev) => [...prev, newRecord as Medecine]);
      toast.success("Formulaire créer avec succès! 🎉");
      setIsSubmitted(true);
    } catch (error) {
      toast.error("La création du formulaire a échoué");
      console.error("Erreur lors de la création:", error);
    }
  };

  if (isFormLoading) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center max-w-4xl mx-auto px-4 py-2 border border-blue-200/60 rounded-md">
      <ConstanteClient idVisite={form.watch("mdgIdVisite")} />
      <h2 className="text-2xl text-blue-900 font-black text-center">
        Formulaire de Médecine Générale
      </h2>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-2 max-w-6xl rounded-sm mx-auto px-4 py-2 bg-white shadow-md shadow-blue-100/30 border border-blue-200/50"
        >
          <FormField
            control={form.control}
            name="mdgIdVisite"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">
                  Selectionnez la visite
                </FormLabel>
                <Select required onValueChange={(value) => { field.onChange(value); setIsSubmitted(false); }}>
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
                        disabled={selectedMedecine.some(
                          (p) => p.mdgIdVisite === visite.id,
                        )}
                      >
                        {new Date(visite.dateVisite).toLocaleDateString(
                          "fr-FR",
                        )}
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
            name="mdgConsultation"
            render={({ field }) => (
              <FormItem className="hidden">
                <FormControl>
                  <Checkbox
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="font-normal">Consultation</FormLabel>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mdgCounselling"
            render={({ field }) => (
              <FormItem className="hidden">
                <FormControl>
                  <Checkbox
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="font-normal">Counselling</FormLabel>
                </div>
              </FormItem>
            )}
          />
          <div className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md">
            <FormField
              control={form.control}
              name="mdgEtatFemme"
              render={({ field }) => (
                <FormItem className="pb-4">
                  <div className="text-xl font-bold flex justify-between items-center">
                    <FormLabel className="ml-4">Femme enceinte: :</FormLabel>
                    <RefreshCw
                      onClick={() => {
                        form.setValue("mdgEtatFemme", "");
                      }}
                      className="hover:text-blue-600 transition-all duration-200 hover:bg-slate-300 rounded-full p-1 active:scale-125"
                    />
                  </div>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                      className="flex gap-x-5 items-center"
                    >
                      {TabTypeFemme.map((option) => (
                        <FormItem
                          key={option.value}
                          className="flex items-center space-x-3 space-y-0"
                        >
                          <FormControl>
                            <RadioGroupItem value={option.value} />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {option.label}
                          </FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator className="mb-3" />

            <FormField
              control={form.control}
              name="mdgMotifConsultation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">
                    Motif de la consultation
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Motif de la consultation"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md">
            <FormField
              control={form.control}
              name="mdgExamenPhysique"
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
                      Examen Physique
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <Separator className="my-3" />
            <FormField
              control={form.control}
              name="mdgTypeVisite"
              render={({ field }) => (
                <FormItem className="pb-4">
                  <div className="text-xl font-bold flex justify-between items-center">
                    <FormLabel className="ml-4">
                      Le client a t il été :
                    </FormLabel>
                    <RefreshCw
                      onClick={() => {
                        form.setValue("mdgTypeVisite", "");
                      }}
                      className="hover:text-blue-600 transition-all duration-200 hover:bg-slate-300 rounded-full p-1 active:scale-125"
                    />
                  </div>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                      className="flex gap-x-5 items-center"
                    >
                      {TabTypeVisite.map((option) => (
                        <FormItem
                          key={option.value}
                          className="flex items-center space-x-3 space-y-0"
                        >
                          <FormControl>
                            <RadioGroupItem value={option.value} />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {option.label}
                          </FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator className="mt-3" />
            <FormField
              control={form.control}
              name="mdgSoins"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">
                    Soins infirmier :
                  </FormLabel>
                  <Select onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Type à sélectionner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tabSoinsInfirmier.map((option, index) => (
                        <SelectItem
                          key={index}
                          value={option.value}
                          className="text-blue-600"
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator className="my-3" />
            <AnimatePresence mode="wait" initial={false}>
              {form.watch("mdgTypeVisite") === "traite" && (
                <motion.div
                  key="traite-content"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-visible"
                >
                  <div>
                    <FormField
                      control={form.control}
                      name="mdgSuspicionPalu"
                      render={({ field }) => (
                        <FormItem className="pb-4">
                          <div className="text-xl font-bold flex justify-between items-center">
                            <FormLabel className="ml-4">
                              Suspiçion Paludisme:
                            </FormLabel>
                            <RefreshCw
                              onClick={() => {
                                form.setValue("mdgSuspicionPalu", "");
                              }}
                              className="hover:text-blue-600 transition-all duration-200 hover:bg-slate-300 rounded-full p-1 active:scale-125"
                            />
                          </div>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value ?? ""}
                              className="flex gap-x-5 items-center"
                            >
                              {TabSuspicion.map((option) => (
                                <FormItem
                                  key={option.value}
                                  className="flex items-center space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <RadioGroupItem value={option.value} />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {option.label}
                                  </FormLabel>
                                </FormItem>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <AnimatePresence mode="wait" initial={false}>
                      {(form.watch("mdgSuspicionPalu") === "simple" ||
                        form.watch("mdgSuspicionPalu") === "grave") && (
                        <motion.div
                          key="traite-content-inner"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          style={{ overflow: "hidden" }}
                        >
                          <FormField
                            control={form.control}
                            name="mdgTestRapidePalu"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-y-0 rounded-md py-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value ?? false}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="font-normal">
                                    Test Rapide Paludisme réalisé ?
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Separator className="mb-3" />
                    <FormField
                      control={form.control}
                      name="mdgDiagnostic"
                      render={() => (
                        <FormItem>
                          <FormControl>
                            <MultiSelectField
                              name="Diagnostic :"
                              options={[...selectedDiagnostic].reverse()}
                              placeholder="Sélectionnez les diagnostics"
                              onChange={(values) =>
                                form.setValue("mdgDiagnostic", values) ?? ""
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormItem>
                      <FormLabel className="font-medium">
                        Autre Diagnostic
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...form.register("mdgAutreDiagnostic")}
                          placeholder="Saisissez un autre diagnostic"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>

                    <FormField
                      control={form.control}
                      name="mdgTypeAffection"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel className="font-medium">
                            Selectionnez le type d affection :
                          </FormLabel>
                          <Select onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Type à sélectionner" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {tabTypeAffectionOptions.map((option, index) => (
                                <SelectItem
                                  key={index}
                                  value={option.value}
                                  className="text-blue-600"
                                >
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
                      name="mdgTraitement"
                      render={() => (
                        <FormItem className="mt-4">
                          <FormControl>
                            <MultiSelectField
                              name="Traitement :"
                              options={tabTraitement}
                              placeholder="Type de traitement"
                              onChange={(values) =>
                                form.setValue("mdgTraitement", values) ?? ""
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="my-2 py-2 shadow-sm border-blue-200/50 rounded-md">
            <FormField
              control={form.control}
              name="mdgMiseEnObservation"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md px-4 py-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-normal">
                      Client mis en observation ?
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            {form.watch("mdgMiseEnObservation") === true && (
              <FormField
                control={form.control}
                name="mdgDureeObservation"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center px-4">
                    <FormLabel className="text-red-500 flex-1">
                      Durée(en heure) :
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        className="flex-1 border border-red-500"
                        placeholder="4h"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
          </div>
          <FormField
            control={form.control}
            name="mdgIdClient"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...field}
                    className="hidden"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {isPrescripteur === true ? (
            <FormField
              control={form.control}
              name="mdgIdUser"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      value={idUser ?? ""}
                      onChange={field.onChange}
                      className="hidden"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="mdgIdUser"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">
                    Selectionnez le precripteur
                  </FormLabel>
                  <Select required onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Prescripteur ....." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allPrescripteur.map((prescripteur) => (
                        <SelectItem
                          key={prescripteur.id}
                          value={prescripteur.id}
                        >
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
            className="mt-4 mx-auto block"
            disabled={form.formState.isSubmitting || isSubmitted}
          >
            {form.formState.isSubmitting ? "En cours..." : isSubmitted ? "Soumis" : "Soumettre"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
