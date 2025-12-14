"use client";
import { use, useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { useClientContext } from "@/components/ClientContext";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { getOneMedecine, updateMedecine } from "@/lib/actions/mdgActions";
import { motion, AnimatePresence } from "framer-motion";
import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import { useSession } from "next-auth/react";
import { Medecine, Visite, User, Permission, TableName } from "@prisma/client";
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
import { Skeleton } from "@/components/ui/skeleton";
import { CheckedFalse, CheckedTrue } from "@/components/checkedTrue";
import { getOneClient } from "@/lib/actions/clientActions";
import { useRouter } from "next/navigation";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";

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
];

const tabSoinsInfirmier = [
  { value: "pensements", label: "Pensements" },
  { value: "injections", label: "Injections" },
  { value: "perfusion", label: "Perfusion" },
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
  { value: "traite", label: "Traité" }, // Traité = consultant
  { value: "controle", label: "Contrôlé" }, // & traité + contrôlé = consultataion
  { value: "refere", label: "Référé" },
];
export default function MdgPage({
  params,
}: {
  params: Promise<{ modifMdgId: string }>;
}) {
  const { modifMdgId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [selectedMedecine, setSelectedMedecine] = useState<Medecine>();
  const [dateVisite, setDateVisite] = useState<Date>();
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<Option[]>([]);
  const [prescripteur, setPrescripteur] = useState<string>();
  const [onePrescripteur, setOnePrescripteur] = useState<User>();
  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();
  const [permission, setPermission] = useState<Permission | null>(null);

  const { setSelectedClientId } = useClientContext();

  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const router = useRouter();

  useEffect(() => {
    const fetUser = async () => {
      const user = await getOneUser(idUser);
      setIsPrescripteur(user?.prescripteur ? true : false);
      setOnePrescripteur(user!);
    };
    fetUser();
  }, [idUser]);

  useEffect(() => {
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!onePrescripteur) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(onePrescripteur.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.MEDECINE
        );
        setPermission(perm || null);
      } catch (error) {
        console.error(
          "Erreur lors de la vérification des permissions :",
          error
        );
      }
    };

    fetchPermissions();
  }, [onePrescripteur]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Récupérer d'abord la médecine
        const oneMedecine = await getOneMedecine(modifMdgId);
        if (oneMedecine) {
          console.log("oneMedecine", oneMedecine);
          setSelectedMedecine(oneMedecine);

          // 2. Récupérer le client pour obtenir son ID
          const client = await getOneClient(oneMedecine.mdgIdClient);

          // 3. Utiliser l'ID client pour récupérer les visites
          const [result] = await Promise.all([
            getAllVisiteByIdClient(oneMedecine.mdgIdClient), // Utiliser mdgIdClient au lieu de modifMdgId
          ]);

          // setAllMedecine(resultMedecine as Medecine[]);
          setVisites(
            result.filter(
              (r: { id: string }) => r.id === oneMedecine.mdgIdVisite
            )
          );

          // 4. Trouver la visite spécifique associée à cette médecine
          const visiteDate = result.find(
            (r: { id: string; }) => r.id === oneMedecine.mdgIdVisite
          );
          console.log("Visite trouvée:", visiteDate);
          setDateVisite(visiteDate?.dateVisite);

          let allUser: User[] = [];
          if (client?.idClinique) {
            allUser = await getAllUserIncludedIdClinique(client.idClinique);
          }
          setAllPrescripteur(allUser);

          const nomPrescripteur = await getOneUser(
            oneMedecine.mdgIdUser ?? null
          );
          setPrescripteur(nomPrescripteur?.name);

          setSelectedClientId(oneMedecine.mdgIdClient);
          const tabReverse = [...tabDiagnosticOptions].reverse();
          setSelectedDiagnostic(tabReverse);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        toast.error("Erreur de chargement des données");
      }
    };

    fetchData();
  }, [modifMdgId, setSelectedClientId]); // Retirer la dépendance circulaire
  const form = useForm<Medecine>({
    defaultValues: {
      mdgDiagnostic: [], // Définit explicitement un tableau de chaînes comme valeur par défaut
      mdgConsultation: true,
      mdgCounselling: true,
      mdgTestRapidePalu: false,
      mdgMotifConsultation: "",
      mdgSuspicionPalu: "ras",
      mdgEtatFemme: "non",
      mdgAutreDiagnostic: "",
    },
  });
  // centraliser la valeur surveillée pour éviter d'appeler form.watch plusieurs fois
  const mdgTypeVisite = form.watch("mdgTypeVisite");

  // debug: log lorsque la valeur change (utile pour vérifier que le toggle se produit)
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("mdgTypeVisite changed:", mdgTypeVisite);
  }, [mdgTypeVisite]);
  useEffect(() => {
    if (selectedMedecine) {
      form.setValue("mdgIdClient", selectedMedecine.mdgIdClient);
    }
  }, [selectedMedecine, form]);

  const onSubmit: SubmitHandler<Medecine> = async (data) => {
    const formattedData = {
      ...data,
      mdgIdUser: form.getValues("mdgIdUser"),
      mdgIdClient: form.getValues("mdgIdClient"),
      mdgDureeObservation:
        parseFloat(data.mdgDureeObservation as unknown as string) || 0,
      mdgIdClinique: selectedMedecine?.mdgIdClinique || "",
    };
    console.log(formattedData);
    // toast.success("Formulaire créer avec succès!");
    try {
      if (selectedMedecine) {
        await updateMedecine(selectedMedecine.id, formattedData);
        const oneMedecine = await getOneMedecine(selectedMedecine.id);
        if (oneMedecine) {
          setSelectedMedecine(oneMedecine as Medecine);
        }
        console.log("formattedData : ", formattedData);
        toast.info("Formulaire modifiée avec succès! 🎉");
      }
    } catch (error) {
      toast.error("La création du formulaire a échoué");
      console.error("Erreur lors de la création de la Constante:", error);
    } finally {
      setIsVisible(false);
    }
  };

  const handleUpdateVisite = async () => {
    if (!permission?.canUpdate && onePrescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de modifier une médecine. Contactez un administrateur."
      );
      return router.back();
    }
    if (selectedMedecine) {
      form.setValue("mdgIdVisite", selectedMedecine.mdgIdVisite);
      form.setValue("mdgIdUser", selectedMedecine.mdgIdUser);
      form.setValue("mdgAutreDiagnostic", selectedMedecine.mdgAutreDiagnostic);
      form.setValue("mdgConsultation", selectedMedecine.mdgConsultation);
      form.setValue("mdgCounselling", selectedMedecine.mdgCounselling);
      form.setValue("mdgDiagnostic", selectedMedecine.mdgDiagnostic);
      form.setValue(
        "mdgDureeObservation",
        selectedMedecine.mdgDureeObservation
      );
      form.setValue("mdgEtatFemme", selectedMedecine.mdgEtatFemme);
      form.setValue("mdgExamenPhysique", selectedMedecine.mdgExamenPhysique);
      form.setValue("mdgIdUser", selectedMedecine.mdgIdUser);
      form.setValue("mdgIdUser", selectedMedecine.mdgIdUser);
      form.setValue(
        "mdgMiseEnObservation",
        selectedMedecine.mdgMiseEnObservation
      );
      form.setValue(
        "mdgMotifConsultation",
        selectedMedecine.mdgMotifConsultation
      );
      form.setValue("mdgPecAffection", selectedMedecine.mdgPecAffection);
      form.setValue("mdgSoins", selectedMedecine.mdgSoins);
      form.setValue("mdgSuspicionPalu", selectedMedecine.mdgSuspicionPalu);
      form.setValue("mdgTraitement", selectedMedecine.mdgTraitement);
      form.setValue("mdgTypeAffection", selectedMedecine.mdgTypeAffection);
      form.setValue("mdgTypeVisite", selectedMedecine.mdgTypeVisite);
      setIsVisible(true);
    }
  };

  const renameDiagnostic = (val: string, tab: Option[]) => {
    const newVal = tab.find((t) => t.value === val);
    return newVal?.label;
  };

  return (
    <div className="flex flex-col w-full justify-center max-w-3xl mx-auto px-4 py-2 border rounded-md">
      {selectedMedecine && (
        <ConstanteClient idVisite={selectedMedecine.mdgIdVisite} />
      )}
      {isVisible ? (
        <>
          <h2 className="text-2xl text-gray-600 font-black text-center">
            Modification du Formulaire de Médecine Générale
          </h2>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-2 max-w-3xl rounded-sm mx-auto px-4 py-2 bg-white shadow-md"
            >
              <FormField
                control={form.control}
                name="mdgIdVisite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">
                      Selectionnez la visite
                    </FormLabel>
                    <Select required onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Visite à sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {visites.map((visite, index) => (
                          <SelectItem key={index} value={visite.id}>
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
                      <FormLabel className="font-normal">
                        Consultation
                      </FormLabel>
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
                      <FormLabel className="font-normal ">
                        Counselling
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <div className="my-2 px-4 py-2 shadow-md border rounded-md ">
                <FormField
                  control={form.control}
                  name="mdgEtatFemme"
                  render={({ field }) => (
                    <FormItem className="  pb-4">
                      <div className="text-xl font-bold flex justify-between items-center">
                        <FormLabel className="ml-4">
                          Femme enceinte: :
                        </FormLabel>
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
              <div className="my-2 px-4 py-2 shadow-md border rounded-md ">
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
                    <FormItem className="  pb-4">
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
                      className="overflow-visible" // Important pour l'animation de height
                    >
                      <div>
                        <FormField
                          control={form.control}
                          name="mdgSuspicionPalu"
                          render={({ field }) => (
                            <FormItem className=" pb-4">
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
                              style={{ overflow: "hidden" }} // Important pour l'animation de height
                            >
                              <FormField
                                control={form.control}
                                name="mdgTestRapidePalu"
                                render={({ field }) => (
                                  <FormItem className=" flex flex-row items-center  space-y-0 rounded-md py-2">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value ?? false}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel className="font-normal ">
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
                                  } // Gère les mises à jour manuellement
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
                            <FormItem className=" mt-4">
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
                                  {tabTypeAffectionOptions.map(
                                    (option, index) => (
                                      <SelectItem
                                        key={index}
                                        value={option.value}
                                        className="text-blue-600"
                                      >
                                        {option.label}
                                      </SelectItem>
                                    )
                                  )}
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
                            <FormItem className=" mt-4">
                              <FormControl>
                                <MultiSelectField
                                  name="Traitement :"
                                  options={tabTraitement}
                                  placeholder="Type de traitement"
                                  onChange={(values) =>
                                    form.setValue("mdgTraitement", values) ?? ""
                                  } // Gère les mises à jour manuellement
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
              <div className="my-2 py-2 shadow-md border rounded-md ">
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
                      <Select
                        required
                        // value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Prescripteur ....." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allPrescripteur.map((prescipteur) => (
                            <SelectItem
                              key={prescipteur.id}
                              value={prescipteur.id}
                            >
                              <span>{prescipteur.name}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Button type="submit" className="mt-4">
                {form.formState.isSubmitting ? "En cours ..." : "Appliquer"}
              </Button>
            </form>
          </Form>
        </>
      ) : (
        <div className="flex flex-col gap-2 max-w-md mx-auto">
          {!selectedMedecine ? (
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-62.5" />
                <Skeleton className="h-4 w-50" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>{selectedMedecine && <span>Date de visite : </span>}</div>
              <div>
                {dateVisite ? (
                  new Date(dateVisite).toLocaleDateString("fr-FR")
                ) : (
                  <div className="space-x-2 flex flex-row">
                    <Skeleton className="h-4 w-4 bg-slate-600" />
                    <Skeleton className="h-4 w-25 bg-slate-600" />
                  </div>
                )}
              </div>
              <div>{selectedMedecine && <span>Femme Enceinte : </span>}</div>
              <div>
                {selectedMedecine.mdgEtatFemme &&
                selectedMedecine.mdgEtatFemme === "oui" ? (
                  <span>Oui</span>
                ) : (
                  <span>Non</span>
                )}
              </div>
              <div>
                {selectedMedecine && <span>Motif de consultation : </span>}
              </div>
              <div>
                {selectedMedecine.mdgMotifConsultation && (
                  <span>{selectedMedecine.mdgMotifConsultation}</span>
                )}
              </div>
              <div>{selectedMedecine && <span>Examen Physique : </span>}</div>
              <div>
                {selectedMedecine.mdgExamenPhysique ? (
                  <CheckedTrue />
                ) : (
                  <CheckedFalse />
                )}
              </div>
              <div>{selectedMedecine && <span>Client Traité? : </span>}</div>
              <div>
                {selectedMedecine.mdgTypeVisite &&
                selectedMedecine.mdgTypeVisite === "traite" ? (
                  <CheckedTrue />
                ) : (
                  <span>Non mais {selectedMedecine.mdgTypeVisite} </span>
                )}
              </div>
              <div>{selectedMedecine && <span>Soins Infirmier : </span>}</div>
              <div>
                {selectedMedecine.mdgSoins && (
                  <span>
                    {renameDiagnostic(
                      selectedMedecine.mdgSoins,
                      tabSoinsInfirmier
                    )}
                  </span>
                )}
              </div>
              {selectedMedecine.mdgTypeVisite &&
                selectedMedecine.mdgTypeVisite === "traite" && (
                  <>
                    <div>
                      {selectedMedecine && <span>Suspiçion Paludisme : </span>}
                    </div>
                    <div>
                      {selectedMedecine.mdgSuspicionPalu && (
                        <span>
                          {renameDiagnostic(
                            selectedMedecine.mdgSuspicionPalu,
                            TabSuspicion
                          )}
                        </span>
                      )}
                    </div>
                    <div>{selectedMedecine && <span>Diagnostic : </span>}</div>
                    <div>
                      {selectedMedecine.mdgDiagnostic.length > 0 && (
                        <ul>
                          {selectedMedecine.mdgDiagnostic.map((d, index) => (
                            <li key={index}>
                              {renameDiagnostic(d, tabDiagnosticOptions)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      {selectedMedecine &&
                        selectedMedecine.mdgAutreDiagnostic !== null && (
                          <span>Autre Diagnostic : </span>
                        )}
                    </div>
                    <div>
                      {selectedMedecine.mdgAutreDiagnostic &&
                      selectedMedecine.mdgAutreDiagnostic !== null ? (
                        <span>{selectedMedecine.mdgAutreDiagnostic}</span>
                      ) : (
                        <span>Aucun</span>
                      )}
                    </div>
                  </>
                )}
              <div>
                {selectedMedecine && selectedMedecine.mdgTypeAffection && (
                  <span>Type Affection : </span>
                )}
              </div>
              <div>
                {selectedMedecine.mdgTypeAffection && (
                  <span>
                    {renameDiagnostic(
                      selectedMedecine.mdgTypeAffection,
                      tabTypeAffectionOptions
                    )}
                  </span>
                )}
              </div>
              <div>
                {selectedMedecine && selectedMedecine.mdgTraitement && (
                  <span>Traitement : </span>
                )}
              </div>
              <div>
                {selectedMedecine.mdgTraitement && (
                  <span className="flex flex-row gap-x-6">
                    {selectedMedecine.mdgTraitement.map((t) => (
                      <span key={t}>{renameDiagnostic(t, tabTraitement)} </span>
                    ))}
                  </span>
                )}
              </div>
              <div>
                {selectedMedecine && selectedMedecine.mdgMiseEnObservation && (
                  <span>Mis en Observation : </span>
                )}
              </div>
              <div>
                {selectedMedecine.mdgMiseEnObservation ? (
                  <CheckedTrue />
                ) : (
                  <CheckedFalse />
                )}
              </div>
              <div>
                {selectedMedecine && selectedMedecine.mdgDureeObservation && (
                  <span>Durée de Mis en Observation : </span>
                )}
              </div>
              <div>{selectedMedecine.mdgDureeObservation} Heure(s)</div>
              <div>
                {prescripteur && (
                  <small className="italic">Prescripteur :</small>
                )}
              </div>
              <div>
                {prescripteur && (
                  <small className="italic">{prescripteur}</small>
                )}
              </div>
              <div className="col-span-2 flex flex-row justify-center">
                <Button onClick={handleUpdateVisite}>Modifier</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
