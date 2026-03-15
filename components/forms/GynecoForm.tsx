"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import {
  getAllGynecoByIdClient,
  createGyneco,
} from "@/lib/actions/gynecoActions";
import { updateRecapVisite } from "@/lib/actions/recapActions";
import { Gynecologie, TableName } from "@prisma/client";
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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import type { SharedFormProps } from "./types";

const tabTypeTraitement = [
  { value: "chryotherapie", label: "Chryothérapie" },
  { value: "thermocoagulation", label: "Thermocoagulation" },
];
const TabMotifConsultation = [
  { value: "PF", label: "Client PF" },
  { value: "iva", label: "Dépistage cancer du col de utérus" },
  { value: "masseMammaire", label: "Masse Mammaire" },
  { value: "massePelvienne", label: "Masse Pelvienne" },
  { value: "troubleDuCycle", label: "Trouble du cycle" },
  { value: "ecoulement", label: "Ecoulement" },
  { value: "autres", label: "Autres Maladies" },
];
const TabResultatIva = [
  { value: "negatif", label: "Négatif" },
  { value: "positif", label: "Positif" },
];
const tabResultatSeins = [
  { value: "Seins Normaux", label: "Seins Normaux" },
  { value: "Douleur", label: "Douleur" },
  { value: "Picotement", label: "Picotement" },
  { value: "Présence de Nodule", label: "Présence de Nodule" },
  { value: "Présence de masse", label: "Présence de masse" },
  { value: "Epaississement de la peau", label: "Epaississement de la peau" },
  {
    value: "Fossette ou retraction",
    label: "Fossette ou retraction (capitons)",
  },
  { value: "Inversion de mamelon", label: "Inversion de mamelon" },
  { value: "Eczéma mammaire persistant", label: "Eczéma mammaire persistant" },
  { value: "Suspiçion de Cancer", label: "Suspiçion de Cancer" },
];

export default function GynecoForm({
  clientId,
  visites,
  allPrescripteur,
  isPrescripteur,
  client,
  idUser,
}: SharedFormProps) {
  const [selectedGyneco, setSelectedGyneco] = useState<Gynecologie[]>([]);
  const { canCreate } = usePermissionContext();

  const router = useRouter();

  // Chargement des données spécifiques au formulaire
  useEffect(() => {
    if (!clientId) return;

    const fetchGynecoData = async () => {
      try {
        const resultGyneco = await getAllGynecoByIdClient(clientId);
        setSelectedGyneco(resultGyneco as Gynecologie[]);
      } catch (error) {
        console.error("Erreur lors du chargement des données gynéco:", error);
      }
    };

    fetchGynecoData();
  }, [clientId]);

  // console.log(visites);
  useEffect(() => {
    form.setValue("idClient", clientId);
    if (isPrescripteur) {
      form.setValue("idUser", idUser);
    }
  }, [clientId, isPrescripteur, idUser]);

  const form = useForm<Gynecologie>({
    defaultValues: {
      consultation: true, // Exemple de valeur par défaut
      counselingAutreProbleme: true,
      idClinique: client?.idClinique ?? "",
    },
  });
  const onSubmit: SubmitHandler<Gynecologie> = async (data) => {
    if (!canCreate(TableName.GYNECOLOGIE)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }
    const formattedData = {
      ...data,
      idUser: isPrescripteur ? idUser : form.getValues("idUser") || idUser,
      consultation: form.getValues("consultation"),
      idClient: form.getValues("idClient"),
      idClinique: client?.idClinique ?? "",
    };
    console.log(formattedData);
    try {
      await createGyneco(formattedData as Gynecologie);
      await updateRecapVisite(
        form.watch("idVisite"),
        form.watch("idUser"),
        "04 Fiche gynécologique",
      );
      toast.success("Gynéco créer avec succès! 🎉");
      router.push(`/fiches/${clientId}`);
    } catch (error) {
      toast.error("La création du formulaire a échoué");
      console.error("Erreur lors de la création de la Constante:", error);
    }
  };

  return (
    <div className="flex flex-col justify-center max-w-4xl mx-auto px-4 py-2 border border-blue-200/60 rounded-md">
      <ConstanteClient idVisite={form.watch("idVisite")} />
      <h2 className="text-2xl text-blue-900 font-black text-center">
        Formulaire de Gynécologie
      </h2>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-2 max-w-6xl rounded-sm mx-auto px-4 py-2 bg-white border border-blue-200/50 shadow-md shadow-blue-100/30"
        >
          <FormField
            control={form.control}
            name="idVisite"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">
                  Selectionnez la visite
                </FormLabel>
                <Select
                  required
                  // value={field.value}
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
                        disabled={selectedGyneco.some(
                          (p) => p.idVisite === visite.id,
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

          {/* ************************* */}

          <div className="p-2 font-sans">
            <FormField
              control={form.control}
              name="consultation"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">Consultation</FormLabel>
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="motifConsultation"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">
                  Selectionnez le motif
                </FormLabel>
                <Select required onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Visite à sélectionner" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TabMotifConsultation.map((option, index) => (
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
          <div className="my-2 shadow-sm border-blue-200/50 rounded-md">
            <FormField
              control={form.control}
              name="counsellingAvantDepitage"
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
                      Counselling Avant dépistage cancer du col
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="counsellingApresDepitage"
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
                      Counselling Après dépistage cancer du col
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="resultatIva"
              render={({ field }) => (
                <FormItem className=" px-4 pb-4">
                  <div className="text-xl font-bold flex justify-between items-center">
                    <FormLabel className="ml-4">
                      Résultat dépistage IVA :
                    </FormLabel>
                    <RefreshCw
                      onClick={() => {
                        form.setValue("resultatIva", "");
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
                      {TabResultatIva.map((option) => (
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
            <AnimatePresence>
              {form.watch("resultatIva") === "positif" && (
                <motion.div
                  key="gyneco-iva-positif"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <FormField
                    control={form.control}
                    name="eligibleTraitementIva"
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
                            Eligibilité au traitement IVA
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <AnimatePresence>
                    {form.watch("eligibleTraitementIva") === true && (
                      <motion.div
                        key="gyneco-type-traitement"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <FormField
                          control={form.control}
                          name="typeTraitement"
                          render={({ field }) => (
                            <FormItem className="mx-6 mb-3 outline-red-500">
                              <FormLabel className="font-medium">
                                Selectionnez le type de traitement
                              </FormLabel>
                              <Select onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Traitement à sélectionner" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {tabTypeTraitement.map((option, index) => (
                                    <SelectItem
                                      key={index}
                                      value={option.value}
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
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* counselingCancerSein */}
            <Separator />
            <FormField
              control={form.control}
              name="counselingCancerSein"
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
                      Counseling Cancer des seins
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <AnimatePresence>
              {form.watch("counselingCancerSein") === true && (
                <motion.div
                  key="gyneco-cancer-sein"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="font-normal px-4">
                    <FormField
                      control={form.control}
                      name="resultatCancerSein"
                      render={({ field }) => (
                        <FormItem>
                          <div className="text-xl font-bold flex justify-between items-center">
                            <FormLabel className="font-medium">
                              Résultat du dépistage
                            </FormLabel>
                            <RefreshCw
                              onClick={() => {
                                form.setValue("resultatCancerSein", "");
                              }}
                              className="hover:text-blue-600 transition-all duration-200 hover:bg-slate-300 rounded-full p-1 active:scale-125"
                            />
                          </div>
                          <Select
                            required
                            value={field.value ?? ""}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full mb-2">
                                <SelectValue placeholder="Select Résultat ....." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {tabResultatSeins.map((resultat) => (
                                <SelectItem
                                  key={resultat.value}
                                  value={resultat.value}
                                >
                                  <span>{resultat.label}</span>
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
          </div>
          <div className="my-2 shadow-sm border-blue-200/50 rounded-md">
            <FormField
              control={form.control}
              name="counselingAutreProbleme"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md px-4 py-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-normal">
                      Counselling Autre problème gynécologique
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="examenPhysique"
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
                      Examen physique
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="examenPalpation"
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
                      Examen palpation
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="toucheeVaginale"
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
                      Touchée vaginale
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reglesIrreguliere"
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
                      Règles irrégulières
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="regularisationMenstruelle"
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
                      Régularisation menstruelle
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="autreProblemeGyneco"
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
                      PEC Autre problème gynécologique
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="idClient"
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
              name="idUser"
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
              name="idUser"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">
                    Selectionnez le precripteur
                  </FormLabel>
                  <Select
                    required
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
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
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Soumettre..." : "Soumettre"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
