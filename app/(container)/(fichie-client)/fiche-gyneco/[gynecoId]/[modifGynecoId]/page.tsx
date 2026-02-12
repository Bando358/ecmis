"use client";
import { use, useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
// import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useClientContext } from "@/components/ClientContext";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { getOneGyneco, updateGyneco } from "@/lib/actions/gynecoActions";
import { useSession } from "next-auth/react";
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
import { RefreshCw, Loader2, Pencil } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckedFalse, CheckedTrue } from "@/components/checkedTrue";
import {
  Gynecologie,
  Permission,
  TableName,
  User,
  Visite,
} from "@prisma/client";
import { getOneClient } from "@/lib/actions/clientActions";
import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import { useRouter } from "next/navigation";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import Retour from "@/components/retour";

const tabTypeTraitement = [
  { value: "chryotherapie", label: "Chryothérapie" },
  { value: "thermocoagulation", label: "Thermocoagulation" },
];
const TabMotifConsultation = [
  { value: "PF", label: "Client PF" },
  { value: "iva", label: "Dépistage cancer du col de utérus" },
  { value: "masse_mammaire", label: "Masse Mammaire" },
  { value: "masse_pelvienne", label: "Masse Pelvienne" },
  { value: "trouble_du_cycle", label: "Trouble du cycle" },
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

export default function GynecoPage({
  params,
}: {
  params: Promise<{ modifGynecoId: string }>;
}) {
  const { modifGynecoId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [selectedGyneco, setSelectedGyneco] = useState<Gynecologie>();
  const [dateVisite, setDateVisite] = useState<Date>();
  const [prescripteur, setPrescripteur] = useState<string>();
  const [onePrescripteur, setOnePrescripteur] = useState<User>();
  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();
  const [isVisible, setIsVisible] = useState(false);
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
          (p: { table: string }) => p.table === TableName.GYNECOLOGIE,
        );
        setPermission(perm || null);
      } catch (error) {
        console.error(
          "Erreur lors de la vérification des permissions :",
          error,
        );
      }
    };

    fetchPermissions();
  }, [onePrescripteur]);

  useEffect(() => {
    const fetchData = async () => {
      const oneGyneco = await getOneGyneco(modifGynecoId);
      const oneUser = await getOneUser(oneGyneco?.idUser as string);
      setPrescripteur(oneUser?.name);
      setSelectedGyneco(oneGyneco as Gynecologie);
      if (oneGyneco) {
        const result = await getAllVisiteByIdClient(oneGyneco.idClient);
        const visiteDate = result.find(
          (r: { id: string }) => r.id === oneGyneco.idVisite,
        );

        const cliniqueClient = await getOneClient(oneGyneco.idClient);
        let allPrestataire: User[] = [];
        if (cliniqueClient?.idClinique) {
          allPrestataire = await getAllUserIncludedIdClinique(
            cliniqueClient.idClinique,
          );
        }
        setAllPrescripteur(allPrestataire as User[]);

        setVisites(
          result.filter((r: { id: string }) => r.id === oneGyneco.idVisite),
        ); // Use oneGyneco instead of selectedGyneco
        setDateVisite(visiteDate?.dateVisite);
        setSelectedClientId(oneGyneco.idClient); // Use oneGyneco instead of selectedGyneco
      }
    };
    fetchData();
  }, [modifGynecoId, setSelectedClientId]);

  const form = useForm<Gynecologie>({
    defaultValues: {
      consultation: true, // Exemple de valeur par défaut
    },
  });
  useEffect(() => {
    if (selectedGyneco) {
      form.setValue("idClient", selectedGyneco.idClient);
    }
  }, [selectedGyneco, form]);

  const onSubmit: SubmitHandler<Gynecologie> = async (data) => {
    const formattedData = {
      ...data,
      idUser: form.getValues("idUser"),
      consultation: form.getValues("consultation"),
      idClient: form.getValues("idClient"),
      idClinique: selectedGyneco?.idClinique ?? "",
    };
    console.log(formattedData);
    try {
      if (selectedGyneco) {
        await updateGyneco(selectedGyneco.id, formattedData);
        const gyneco = await getOneGyneco(selectedGyneco.id);
        if (gyneco) {
          setSelectedGyneco(gyneco as Gynecologie);
        }
      }
      toast.info("Formulaire modifiée avec succès! 🎉");
      // router.push(`/fiches/${params.gynecoId}`);
    } catch (error) {
      toast.error("La modification du formulaire a échoué");
      console.error("Erreur lors de la modification du formulaire:", error);
    } finally {
      setIsVisible(false);
    }
  };
  const handleUpdateVisite = async () => {
    if (!permission?.canUpdate && onePrescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de modifier une gynécologie. Contactez un administrateur.",
      );
      return router.back();
    }
    if (selectedGyneco) {
      form.setValue("idVisite", selectedGyneco.idVisite);
      form.setValue("idUser", selectedGyneco.idUser);
      form.setValue("consultation", selectedGyneco.consultation);
      form.setValue("autreProblemeGyneco", selectedGyneco.autreProblemeGyneco);
      form.setValue(
        "counselingAutreProbleme",
        selectedGyneco.counselingAutreProbleme,
      );
      form.setValue(
        "counselingCancerSein",
        selectedGyneco.counselingCancerSein,
      );
      form.setValue(
        "counsellingApresDepitage",
        selectedGyneco.counsellingApresDepitage,
      );
      form.setValue(
        "counsellingAvantDepitage",
        selectedGyneco.counsellingAvantDepitage,
      );
      form.setValue(
        "eligibleTraitementIva",
        selectedGyneco.eligibleTraitementIva,
      );
      form.setValue("examenPhysique", selectedGyneco.examenPhysique);
      form.setValue("examenPalpation", selectedGyneco.examenPalpation);
      form.setValue("toucheeVaginale", selectedGyneco.toucheeVaginale);
      form.setValue("motifConsultation", selectedGyneco.motifConsultation);
      form.setValue("reglesIrreguliere", selectedGyneco.reglesIrreguliere);
      form.setValue(
        "regularisationMenstruelle",
        selectedGyneco.regularisationMenstruelle,
      );
      form.setValue("resultatCancerSein", selectedGyneco.resultatCancerSein);
      form.setValue("resultatIva", selectedGyneco.resultatIva);
      form.setValue("typeTraitement", selectedGyneco.typeTraitement);

      setIsVisible(true);
    }
  };

  return (
    <div className="w-full relative">
      <Retour />
      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {selectedGyneco && (
          <ConstanteClient idVisite={selectedGyneco.idVisite} />
        )}
        <div className="max-w-md mx-auto">
          <AnimatePresence mode="wait">
            {isVisible ? (
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
                      Modifier - Gynécologie
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <Form {...form}>
                      <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-2 max-w-4xl mx-auto px-4 py-4"
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
                                    <SelectValue placeholder="Visite à sélectionner ....." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {visites.map((visite, index) => (
                                    <SelectItem key={index} value={visite.id}>
                                      {new Date(
                                        visite.dateVisite,
                                      ).toLocaleDateString("fr-FR")}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* ************************* */}

                        <div className="hidden">
                          <FormField
                            control={form.control}
                            name="consultation"
                            render={({ field }) => (
                              <FormItem className="hidden">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value ?? true}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Consultation
                                </FormLabel>
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
                                    <SelectValue placeholder="Visite à sélectionner ....." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {TabMotifConsultation.map((option, index) => (
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
                        <div className="my-2 shadow-sm border-blue-200/50 rounded-md ">
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
                                          <RadioGroupItem
                                            value={option.value}
                                          />
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
                          {form.watch("resultatIva") === "positif" && (
                            <div>
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
                              {form.watch("eligibleTraitementIva") === true && (
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
                                          {tabTypeTraitement.map(
                                            (option, index) => (
                                              <SelectItem
                                                key={index}
                                                value={option.value}
                                              >
                                                {option.label}
                                              </SelectItem>
                                            ),
                                          )}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}
                            </div>
                          )}

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
                          {form.watch("counselingCancerSein") === true && (
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
                                          form.setValue(
                                            "resultatCancerSein",
                                            "",
                                          );
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
                          )}
                        </div>
                        <div className="my-2 shadow-sm border-blue-200/50 rounded-md ">
                          <FormField
                            control={form.control}
                            name="counselingAutreProbleme"
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
                                <Input {...field} className="hidden" />
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
                                    value={idUser}
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
                                  // value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select Prescripteur ....." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {allPrescripteur.map(
                                      (prescipteur, index) => (
                                        <SelectItem
                                          key={index}
                                          value={prescipteur.id}
                                        >
                                          <span>{prescipteur.name}</span>
                                        </SelectItem>
                                      ),
                                    )}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
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
                {!selectedGyneco ? (
                  <Card className=" mx-auto border-blue-200/60 shadow-sm shadow-blue-100/30">
                    <CardContent className="flex items-center justify-center py-16">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </CardContent>
                  </Card>
                ) : (
                  <Card className=" mx-auto border-blue-200/60 shadow-sm shadow-blue-100/30">
                    <CardHeader className="bg-blue-50/40 rounded-t-xl border-b border-blue-100/60 pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg font-semibold text-blue-900">
                            Gynécologie
                          </CardTitle>
                          <CardDescription className="text-blue-700/60">
                            Fiche de consultation gynécologique
                          </CardDescription>
                        </div>
                        {prescripteur && (
                          <Badge
                            variant="outline"
                            className="text-blue-700 border-blue-300"
                          >
                            {prescripteur}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="divide-y divide-blue-100/60">
                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Date de visite
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {dateVisite &&
                              new Date(dateVisite).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Motif de visite
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedGyneco.motifConsultation.toLowerCase()}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Counselling Avant Dépistage du cancer du col
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedGyneco.counsellingAvantDepitage ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Counselling Après Dépistage du cancer du col
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedGyneco.counsellingApresDepitage ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        </div>
                        {selectedGyneco.resultatIva && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Résultat IVA
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {selectedGyneco.resultatIva.toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Counselling cancer des seins
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedGyneco.counselingCancerSein ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        </div>
                        {selectedGyneco.counselingCancerSein &&
                          selectedGyneco.resultatCancerSein !== null && (
                            <div className="grid grid-cols-3 gap-x-4 py-2.5">
                              <span className="text-sm font-medium text-blue-800">
                                Résultat Cancer de Sein
                              </span>
                              <span className="col-span-2 text-sm text-gray-700">
                                {selectedGyneco.resultatCancerSein &&
                                  selectedGyneco.resultatCancerSein.toUpperCase()}
                              </span>
                            </div>
                          )}
                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Counselling Autres problèmes Gynécologique
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedGyneco.counselingAutreProbleme ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Examen Physique
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedGyneco.examenPhysique ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Examen Palpation
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedGyneco.examenPalpation ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Touché Vaginale
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedGyneco.toucheeVaginale ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Règles Irrégulières
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedGyneco.reglesIrreguliere ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Regularisation Menstruelle
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedGyneco.regularisationMenstruelle ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            PEC Autre Problème Gynécologique
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedGyneco.autreProblemeGyneco ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-center gap-4 border-t border-blue-100/60 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                      >
                        Retour
                      </Button>
                      <Button onClick={handleUpdateVisite}>
                        <Pencil className="h-4 w-4 mr-2" /> Modifier
                      </Button>
                    </CardFooter>
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
