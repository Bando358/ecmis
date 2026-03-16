"use client";
import { useEffect, useState } from "react";

import { useForm, useWatch, SubmitHandler } from "react-hook-form";
import { RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  getAllPlanningByIdClient,
  createPlanning,
} from "@/lib/actions/planningActions";
import { Planning, TableName } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { Label } from "@/components/ui/label";
import ConstanteClient from "@/components/constanteClient";
import { updateRecapVisite } from "@/lib/actions/recapActions";
import { Checkbox } from "@/components/ui/checkbox";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import type { SharedFormProps } from "./types";

const TYPE_CONTRACEPTION = [
  { value: "ordinaire", label: "Ordinaire" },
  { value: "post_abortum", label: "Post Abortum" },
  { value: "post_partum_immediat", label: "Post Partum Immédiat" },
  { value: "post_partum", label: "Post Partum" },
];
const MOTIFS = [
  { value: "premiere", label: "1ème Prise" },
  { value: "reapprovisionnement", label: "Reapprovisionnement" },
  { value: "controle", label: "Contrôle" },
  { value: "changement", label: "Changement" },
  { value: "arret", label: "Arrêt" },
];
const MCD = [
  { value: "noristera", label: "Injectable 2 mois" },
  { value: "injectable", label: "Injectable 3 mois" },
  { value: "pilule", label: "Pilule" },
  { value: "spotting", label: "Spotting pilule" },
  { value: "preservatif", label: "Préservatif" },
  { value: "spermicide", label: "Spermicide" },
  { value: "urgence", label: "Méthode d'urgence" },
];
const TAB_RAISON_EFFET = [
  { value: "desire_maternite", label: "Désire de maternité" },
  { value: "effet_secondaire", label: "Effet sécondaire" },
  { value: "expire", label: "Méthode Expirée" },
  { value: "parent_conjoint", label: "Parent ou Conjoint" },
];
const IMPLANS = [
  { id: "insertion", value: "insertion", label: "Insertion" },
  { id: "controle", value: "controle", label: "Contrôle" },
];
const TAB_STATUT = [
  { id: "nu", value: "nu", label: "NU" },
  { id: "au", value: "au", label: "AU" },
];

const JOURS_SEMAINE = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MOIS_NOMS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export default function PlanningForm({
  clientId,
  visites,
  allPrescripteur,
  isPrescripteur,
  client,
  idUser,
}: SharedFormProps) {
  const [selectedPlanning, setSelectedPlanning] = useState<Planning[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { canCreate } = usePermissionContext();


  const isHomme = client?.sexe === "Masculin";

  useEffect(() => {
    if (!clientId) return;
    getAllPlanningByIdClient(clientId).then((result) =>
      setSelectedPlanning(result as Planning[])
    );
  }, [clientId]);

  const form = useForm<Planning>({
    defaultValues: {
      statut: "au",
      idClient: clientId,
      idVisite: "",
      typeContraception: "",
      motifVisite: "",
      consultation: true,
      counsellingPf: false,
      courtDuree: "",
      implanon: "",
      retraitImplanon: false,
      jadelle: "",
      retraitJadelle: false,
      sterilet: "",
      retraitSterilet: false,
      raisonRetrait: "",
      raisonEffetSecondaire: "",
      rdvPf: null,
      idUser: "",
      idClinique: client?.idClinique || "",
    },
  });

  const watchImplanon = useWatch({ control: form.control, name: "implanon" });
  const watchJadelle = useWatch({ control: form.control, name: "jadelle" });
  const watchSterilet = useWatch({ control: form.control, name: "sterilet" });
  const watchIdVisite = useWatch({ control: form.control, name: "idVisite" });

  const dateFinProtection = (() => {
    const isInsertion =
      watchImplanon === "insertion" ||
      watchJadelle === "insertion" ||
      watchSterilet === "insertion";
    if (!isInsertion || !watchIdVisite) return null;

    const visite = visites.find((v) => v.id === watchIdVisite);
    if (!visite) return null;

    let duree = 0;
    let methode = "";
    if (watchImplanon === "insertion") { duree = 3; methode = "Implanon"; }
    else if (watchJadelle === "insertion") { duree = 5; methode = "Jadelle"; }
    else if (watchSterilet === "insertion") { duree = 10; methode = "DIU"; }

    const dateFin = new Date(visite.dateVisite);
    dateFin.setFullYear(dateFin.getFullYear() + duree);
    const dateFormatee = `${JOURS_SEMAINE[dateFin.getDay()]} ${String(dateFin.getDate()).padStart(2, "0")} ${MOIS_NOMS[dateFin.getMonth()]} ${dateFin.getFullYear()}`;

    return { methode, duree, dateFormatee };
  })();

  const onSubmit: SubmitHandler<Planning> = async (data) => {
    if (!canCreate(TableName.PLANNING)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }
    const isMethodePrise =
      (data.courtDuree && data.courtDuree !== "spotting") ||
      data.implanon === "insertion" ||
      data.jadelle === "insertion" ||
      data.sterilet === "insertion";

    if (isMethodePrise && !data.rdvPf) {
      alert("Veuillez renseigner la date de rendez-vous de rénouvellement ou du retrait du produit");
      return;
    }

    const rawRdv = form.getValues("rdvPf");
    const rdvPfDate: Date | null = rawRdv
      ? typeof rawRdv === "string"
        ? new Date(rawRdv)
        : rawRdv instanceof Date
        ? rawRdv
        : new Date(String(rawRdv))
      : null;

    const formattedData = {
      ...data,
      idUser,
      consultation: form.getValues("consultation"),
      idClient: clientId,
      statut: form.getValues("statut"),
      methodePrise: isMethodePrise,
      courtDuree: form.getValues("courtDuree"),
      implanon: form.getValues("implanon"),
      retraitImplanon: form.getValues("retraitImplanon"),
      jadelle: form.getValues("jadelle"),
      retraitJadelle: form.getValues("retraitJadelle"),
      sterilet: form.getValues("sterilet"),
      retraitSterilet: form.getValues("retraitSterilet"),
      rdvPf: rdvPfDate,
      idClinique: client?.idClinique || "",
    };
    try {
      const newRecord = await createPlanning(formattedData);
      await updateRecapVisite(form.watch("idVisite"), idUser, "03 Fiche Planification familiale");
      setSelectedPlanning((prev) => [...prev, newRecord as Planning]);
      toast.success("Formulaire créer avec succès!");
      setIsSubmitted(true);
    } catch (error) {
      toast.error("La création a échoué");
      console.error("Erreur:", error);
    }
  };

  return (
    <div className="flex flex-col justify-center max-w-4xl mx-auto px-4 py-2 border border-blue-200/60 rounded-md relative">
      <ConstanteClient idVisite={form.watch("idVisite")} />
      <h2 className="text-2xl text-blue-900 font-black text-center">
        Formulaire de planification familiale
      </h2>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-2 max-w-225 rounded-sm mx-auto px-4 py-2 bg-white border border-blue-200/50 shadow-md shadow-blue-100/30"
        >
          {/* Sélection visite */}
          <FormField
            control={form.control}
            name="idVisite"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">Selectionnez la visite</FormLabel>
                <Select required onValueChange={(value) => { field.onChange(value); setIsSubmitted(false); }}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Visite à sélectionner ....." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {visites.map((visite, index) => (
                      <SelectItem
                        key={index}
                        value={visite.id}
                        disabled={selectedPlanning.some((p) => p.idVisite === visite.id)}
                      >
                        {new Date(visite.dateVisite).toLocaleDateString("fr-FR")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Statut */}
          <div className="flex w-full flex-col gap-5">
            <FormField
              control={form.control}
              name="statut"
              render={({ field }) => (
                <FormItem className="flex items-center gap-5 w-full">
                  <FormLabel className="whitespace-nowrap">Statut client :</FormLabel>
                  <FormControl className="flex flex-row gap-x-5 items-center">
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                      className="flex gap-x-5 items-center"
                    >
                      {TAB_STATUT.map((option) => (
                        <FormItem key={option.id} className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value={option.value} />
                          </FormControl>
                          <FormLabel className="font-normal">{option.label}</FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Type contraception */}
          <FormField
            control={form.control}
            name="typeContraception"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">Selectionnez le type de contraception</FormLabel>
                <Select required onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="le type de contraception ....." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TYPE_CONTRACEPTION.map((c, i) => (
                      <SelectItem key={i} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Motif visite */}
          <FormField
            control={form.control}
            name="motifVisite"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">Selectionnez le motif de la visite</FormLabel>
                <Select required onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="le motif ....." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MOTIFS.map((m, i) => (
                      <SelectItem key={i} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Consultation + Counselling */}
          <div className="flex flex-row justify-between">
            <FormField
              control={form.control}
              name="consultation"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Checkbox checked={!!field.value} onCheckedChange={(c) => field.onChange(!!c)} required />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="counsellingPf"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="w-5 h-5 border-2 rounded-full text-blue-500 border-blue-500"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Counselling PF</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>

          {/* Méthode courte durée */}
          <div className="flex flex-col shadow-sm border-blue-200/50 rounded-md p-2">
            <div className="font-sans">
              <div className="text-xl font-bold mb-4 flex justify-between items-center">
                <Label>Méthode de courte durée</Label>
                <RefreshCw
                  onClick={() => form.setValue("courtDuree", "")}
                  className="hover:text-blue-600 transition-all duration-200 hover:bg-slate-300 rounded-full p-1 active:scale-125"
                />
              </div>
              <div className="px-5 pb-4 font-sans relative">
                <FormField
                  control={form.control}
                  name="courtDuree"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value ?? ""}
                          className="grid grid-cols-2 space-y-1 gap-2 items-center"
                        >
                          {(isHomme ? MCD.filter((m) => m.value === "preservatif") : MCD).map((option) => (
                            <FormItem key={option.value} className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value={option.value} />
                              </FormControl>
                              <FormLabel className="font-normal">{option.label}</FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Méthode longue durée (femme uniquement) */}
          <AnimatePresence>
            {!isHomme && (
              <motion.div
                key="planning-longue-duree"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="flex flex-col shadow-sm border-blue-200/50 rounded-md p-2">
                  <div className="flex justify-between">
                    <Label className="font-sans">Méthode de longue durée</Label>
                    <RefreshCw
                      onClick={() => {
                        form.setValue("implanon", "");
                        form.setValue("jadelle", "");
                        form.setValue("sterilet", "");
                      }}
                      className="hover:text-blue-600 transition-all duration-200 hover:bg-slate-300 rounded-full p-1 active:scale-125"
                    />
                  </div>

                  {/* Implanon */}
                  <div className="px-5 pb-4 font-sans relative">
                    <FormField
                      control={form.control}
                      name="implanon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Implanon</FormLabel>
                          <FormControl>
                            <RadioGroup onValueChange={field.onChange} value={field.value ?? ""} className="flex gap-x-5 items-center">
                              {IMPLANS.map((o) => (
                                <FormItem key={o.id} className="flex items-center space-x-3 space-y-0">
                                  <FormControl><RadioGroupItem value={o.value} /></FormControl>
                                  <FormLabel className="font-normal">{o.label}</FormLabel>
                                </FormItem>
                              ))}
                            </RadioGroup>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="retraitImplanon"
                      render={({ field }) => (
                        <FormItem className="absolute right-8 bottom-4 flex flex-row items-start space-x-2 space-y-0 mt-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          <FormLabel className="font-normal">Retrait</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Jadelle */}
                  <div className="px-5 pb-4 font-sans relative">
                    <FormField
                      control={form.control}
                      name="jadelle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jadelle</FormLabel>
                          <FormControl>
                            <RadioGroup onValueChange={field.onChange} value={field.value ?? ""} className="flex gap-x-5 items-center">
                              {IMPLANS.map((o) => (
                                <FormItem key={o.id} className="flex items-center space-x-3 space-y-0">
                                  <FormControl><RadioGroupItem value={o.value} /></FormControl>
                                  <FormLabel className="font-normal">{o.label}</FormLabel>
                                </FormItem>
                              ))}
                            </RadioGroup>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="retraitJadelle"
                      render={({ field }) => (
                        <FormItem className="absolute right-8 bottom-4 flex flex-row items-start space-x-2 space-y-0 mt-3">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} className="w-5 h-5 border-2 rounded-full text-blue-500 border-blue-500" />
                          </FormControl>
                          <FormLabel className="font-normal">Retrait</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Stérilet */}
                  <div className="px-5 pb-2 font-sans relative">
                    <FormField
                      control={form.control}
                      name="sterilet"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stérilet</FormLabel>
                          <FormControl>
                            <RadioGroup onValueChange={field.onChange} value={field.value ?? ""} className="flex gap-x-5 items-center">
                              {IMPLANS.map((o) => (
                                <FormItem key={o.id} className="flex items-center space-x-3 space-y-0">
                                  <FormControl><RadioGroupItem value={o.value} /></FormControl>
                                  <FormLabel className="font-normal">{o.label}</FormLabel>
                                </FormItem>
                              ))}
                            </RadioGroup>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="retraitSterilet"
                      render={({ field }) => (
                        <FormItem className="absolute right-8 bottom-2 flex flex-row items-start space-x-2 space-y-0 mt-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          <FormLabel className="font-normal">Retrait</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator className="my-2" />

                  {/* Raison retrait */}
                  {(form.watch("retraitImplanon") || form.watch("retraitJadelle") || form.watch("retraitSterilet")) && (
                    <div className="flex flex-col gap-2">
                      <FormField
                        control={form.control}
                        name="raisonRetrait"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-red-400">Quel est la raison du retraire</FormLabel>
                            <Select onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="La raison ..." /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {TAB_RAISON_EFFET.map((r, i) => (
                                  <SelectItem key={i} value={r.value}>{r.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <AnimatePresence>
                        {form.watch("raisonRetrait") === "effet_secondaire" && (
                          <motion.div
                            key="planning-effet-secondaire"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <Input
                              {...form.register("raisonEffetSecondaire")}
                              placeholder="Quel est l'effet secondaire..."
                              className="border border-red-400"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Date RDV + fin de protection */}
          <div>
            <label className="block text-sm font-medium">Date de Rendez-vous</label>
            <input
              {...form.register("rdvPf")}
              className="mt-1 px-3 py-1 w-full rounded-md border border-slate-200"
              type="date"
              name="rdvPf"
            />
            <AnimatePresence>
              {dateFinProtection && (
                <motion.div
                  key="planning-date-fin"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm font-medium text-blue-800">
                      Fin de protection ({dateFinProtection.methode} - {dateFinProtection.duree} ans)
                    </p>
                    <p className="text-sm font-bold text-blue-900">{dateFinProtection.dateFormatee}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Champs cachés */}
          <FormField
            control={form.control}
            name="idClient"
            render={({ field }) => (
              <FormItem><FormControl><Input {...field} value={clientId} className="hidden" /></FormControl></FormItem>
            )}
          />

          {/* Prescripteur */}
          {isPrescripteur ? (
            <FormField
              control={form.control}
              name="idUser"
              render={({ field }) => (
                <FormItem><FormControl><Input {...field} value={idUser} className="hidden" /></FormControl></FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="idUser"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">Selectionnez le precripteur</FormLabel>
                  <Select required onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Prescripteur ....." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allPrescripteur.map((p, i) => (
                        <SelectItem key={i} value={p.id}><span>{p.name}</span></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <Button type="submit" className="my-2 mx-auto block" disabled={form.formState.isSubmitting || isSubmitted}>
            {form.formState.isSubmitting ? "En cours..." : isSubmitted ? "Soumis" : "Soumettre"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
