"use client";
import { use, useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { useClientContext } from "@/components/ClientContext";

import {
  getAllUser,
  getAllUserIncludedIdClinique,
  getAllUserIncludedTabIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";

import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";

import { useSession } from "next-auth/react";
import { Permission, TableName, User, Vbg, Visite } from "@prisma/client";
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
import { Separator } from "@/components/ui/separator";
import { CheckedFalse, CheckedTrue } from "@/components/checkedTrue";
import { getOneClient } from "@/lib/actions/clientActions";
import {
  getAllVbgByIdClient,
  getOneVbg,
  updateVbg,
} from "@/lib/actions/vbgActions";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useRouter } from "next/navigation";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import { Loader2, Pencil } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import Retour from "@/components/retour";

const TabTypeVbg = [
  { value: "viol", label: "Viol" },
  { value: "agressionsSexuelles", label: "Agressions Sexuelles" },
  { value: "agressionsPhysiques", label: "Agressions Physiques" },
  { value: "mariageForce", label: "Mariage Forcé" },
  { value: "deniRessources", label: "Dénis de Ressources" },
  { value: "maltraitancePsychologique", label: "Maltraitance Psychologique" },
];

type Option = {
  value: string;
  label: string;
};
const tabPec: Option[] = [
  { value: "pec", label: "PEC" },
  { value: "refere", label: "Référé" },
];

export default function IstPage({
  params,
}: {
  params: Promise<{ istId: string; modifvbgId: string }>;
}) {
  const { modifvbgId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [selectedVbg, setSelectedVbg] = useState<Vbg[]>([]);
  const [selectedOneVbg, setSelectedOneVbg] = useState<Vbg>();

  const [dateVisite, setDateVisite] = useState<Date>();
  const [prescripteur, setPrescripteur] = useState<string>();
  const [onePrescripteur, setOnePrescripteur] = useState<User>();
  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();
  const [isVisible, setIsVisible] = useState(false);
  const [permission, setPermission] = useState<Permission | null>(null);

  const { setSelectedClientId } = useClientContext();
  // setSelectedClientId(params.infertiliteId);

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
          (p: { table: string }) => p.table === TableName.VBG,
        );
        setPermission(perm || null);
        if (onePrescripteur.role !== "ADMIN") {
          const allPrescripteur = await getAllUserIncludedTabIdClinique(
            onePrescripteur.idCliniques,
          );
          setAllPrescripteur(allPrescripteur as User[]);
        } else {
          const allPrescripteur = await getAllUser();
          setAllPrescripteur(allPrescripteur as User[]);
        }
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
      try {
        const resultVbg = await getAllVbgByIdClient(modifvbgId);
        setSelectedVbg(resultVbg as Vbg[]); // Assurez-vous que result est bien de type CliniqueData[]
        const oneVbg = await getOneVbg(modifvbgId);
        setSelectedOneVbg(oneVbg as Vbg);

        let allPrestataire: User[] = [];

        if (oneVbg?.vbgIdClient) {
          const cliniqueClient = await getOneClient(oneVbg.vbgIdClient);

          if (cliniqueClient?.idClinique) {
            allPrestataire = await getAllUserIncludedIdClinique(
              cliniqueClient.idClinique,
            );
          }
        }

        setAllPrescripteur(allPrestataire);
        console.log("allPrestataire ", allPrestataire);
      } catch (err) {
        console.error("Erreur chargement prescripteurs:", err);
      }
    };

    fetchData();
  }, [modifvbgId]); // ✅ plus propre

  useEffect(() => {
    const fetchData = async () => {
      if (selectedOneVbg) {
        const result = await getAllVisiteByIdClient(selectedOneVbg.vbgIdClient);
        const visiteDate = result.find(
          (r: { id: string }) => r.id === selectedOneVbg.vbgIdVisite,
        );

        const nomPrescripteur = await getOneUser(selectedOneVbg.vbgIdUser);
        setPrescripteur(nomPrescripteur?.name);

        setVisites(
          result.filter(
            (r: { id: string }) => r.id === selectedOneVbg.vbgIdVisite,
          ),
        ); // Assurez-vous que result est bien de type CliniqueData[]
        setDateVisite(visiteDate?.dateVisite);
        // const clientData = await getOneClient(selectedGyneco.idClient);
        setSelectedClientId(selectedOneVbg.vbgIdClient);
      }
    };
    fetchData();
  }, [selectedOneVbg, setSelectedClientId]);
  // console.log(visites);

  const form = useForm<Vbg>();
  const onSubmit: SubmitHandler<Vbg> = async (data) => {
    const formattedData = {
      ...data,
      vbgType: form.getValues("vbgType") ?? "",
      vbgDuree: Number(form.getValues("vbgDuree")) || 0,
      vbgConsultation: form.getValues("vbgConsultation") ?? "",
      vbgCounsellingRelation: form.getValues("vbgCounsellingRelation") ?? false,
      vbgCounsellingViolenceSexuel:
        form.getValues("vbgCounsellingViolenceSexuel") ?? false,
      vbgCounsellingViolencePhysique:
        form.getValues("vbgCounsellingViolencePhysique") ?? false,
      vbgCounsellingSexuelite:
        form.getValues("vbgCounsellingSexuelite") ?? false,
      vbgPreventionViolenceSexuelle:
        form.getValues("vbgPreventionViolenceSexuelle") ?? false,
      vbgPreventionViolencePhysique:
        form.getValues("vbgPreventionViolencePhysique") ?? false,
      vbgIdUser: form.getValues("vbgIdUser") ?? "",
      vbgIdClient: selectedOneVbg?.vbgIdClient ?? "",
      vbgIdVisite: form.getValues("vbgIdVisite") ?? "",
      vbgIdClinique: selectedOneVbg?.vbgIdClinique ?? "",
    };
    try {
      if (selectedOneVbg) {
        console.log(formattedData);
        await updateVbg(selectedOneVbg.id, formattedData);
        const oneVbg = await getOneVbg(modifvbgId);
        if (oneVbg) {
          setSelectedOneVbg(oneVbg as Vbg);
        }
      }
      toast.info("Formulaire modifiée avec succès! 🎉");
    } catch (error) {
      toast.error("La création du formulaire a échoué");
      console.error("Erreur lors de la modification de Ist:", error);
    } finally {
      setIsVisible(false);
    }
  };

  const renameValue = (val: string, tab: Option[]) => {
    const newVal = tab.find((t) => t.value === val);
    return newVal?.label;
  };

  const handleUpdateVisite = async () => {
    if (!permission?.canCreate && onePrescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de modifier une fiche VBG. Contactez un administrateur.",
      );
      return router.back();
    }
    if (selectedOneVbg) {
      form.setValue("vbgIdVisite", selectedOneVbg.vbgIdVisite);
      form.setValue("vbgIdClient", selectedOneVbg.vbgIdClient);
      form.setValue("vbgIdUser", selectedOneVbg.vbgIdUser);
      form.setValue("vbgType", selectedOneVbg.vbgType);
      form.setValue("vbgDuree", selectedOneVbg.vbgDuree);
      form.setValue("vbgConsultation", selectedOneVbg.vbgConsultation);
      form.setValue(
        "vbgCounsellingRelation",
        selectedOneVbg.vbgCounsellingRelation,
      );
      form.setValue(
        "vbgCounsellingViolenceSexuel",
        selectedOneVbg.vbgCounsellingViolenceSexuel,
      );
      form.setValue(
        "vbgCounsellingViolencePhysique",
        selectedOneVbg.vbgCounsellingViolencePhysique,
      );
      form.setValue(
        "vbgCounsellingSexuelite",
        selectedOneVbg.vbgCounsellingSexuelite,
      );
      form.setValue(
        "vbgPreventionViolenceSexuelle",
        selectedOneVbg.vbgPreventionViolenceSexuelle,
      );
      form.setValue(
        "vbgPreventionViolencePhysique",
        selectedOneVbg.vbgPreventionViolencePhysique,
      );
      setIsVisible(true);
    }
  };
  const consultationValue = form.watch("vbgConsultation");

  return (
    <div className="w-full relative">
      <Retour />
      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {selectedOneVbg && (
          <ConstanteClient idVisite={selectedOneVbg.vbgIdVisite} />
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
                      Modifier - VBG
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
                          name="vbgIdVisite"
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
                                  {visites.map((visite) => (
                                    <SelectItem
                                      key={visite.id}
                                      value={visite.id}
                                      disabled={selectedVbg.some(
                                        (p) => p.vbgIdVisite === visite.id,
                                      )}
                                    >
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
                        <div className="my-2 p-3 shadow-sm border-blue-200/50 rounded-md ">
                          <FormField
                            control={form.control}
                            name="vbgType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="font-medium">
                                  Selectionnez le type de client
                                </FormLabel>
                                <Select required onValueChange={field.onChange}>
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Type à sélectionner" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {TabTypeVbg.map((option) => (
                                      <SelectItem
                                        key={option.value}
                                        value={option.value ?? ""}
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
                          <FormField
                            control={form.control}
                            name="vbgDuree"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Duree écoulée en (heures)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    value={field.value}
                                    placeholder="28"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex w-full flex-col gap-5 my-2">
                          <FormField
                            control={form.control}
                            name="vbgConsultation"
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-5 mt-2 w-full">
                                {/* Label aligné avec les options */}
                                <FormLabel className="whitespace-nowrap">
                                  Consultation :
                                </FormLabel>
                                <FormControl className="flex flex-row gap-x-5 items-center">
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value ?? ""}
                                    className="flex gap-x-5 items-center"
                                  >
                                    {tabPec.map((option) => (
                                      <FormItem
                                        key={option.value}
                                        className="flex items-center space-x-3 space-y-0"
                                      >
                                        <FormControl>
                                          <RadioGroupItem
                                            value={option.value ?? ""}
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
                        </div>
                        <div>
                          {/* S'affiche uniquement si la consultation est PEC */}
                          {consultationValue === "pec" && (
                            <div className="my-2  shadow-sm border-blue-200/50 rounded-md ">
                              <FormField
                                control={form.control}
                                name="vbgCounsellingRelation"
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
                                        Counselling - Relation Sexuelle
                                      </FormLabel>
                                    </div>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="vbgCounsellingViolenceSexuel"
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
                                        Counselling - Violence Sexuelle
                                      </FormLabel>
                                    </div>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="vbgCounsellingViolencePhysique"
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
                                        Counselling - Violence Physique
                                      </FormLabel>
                                    </div>
                                  </FormItem>
                                )}
                              />

                              {/* <Separator /> */}
                              <FormField
                                control={form.control}
                                name="vbgCounsellingSexuelite"
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
                                        Counseling - Sexualité
                                      </FormLabel>
                                    </div>
                                  </FormItem>
                                )}
                              />
                              <Separator className="my-3" />
                              <FormField
                                control={form.control}
                                name="vbgPreventionViolenceSexuelle"
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
                                        Prévention - Violence Sexuelle
                                      </FormLabel>
                                    </div>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="vbgPreventionViolencePhysique"
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
                                        Prévention - Violence Physique
                                      </FormLabel>
                                    </div>
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                        </div>

                        <FormField
                          control={form.control}
                          name="vbgIdClient"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} className="hidden" />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="vbgIdUser"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-medium">
                                Selectionnez le prescripteur
                              </FormLabel>
                              <Select
                                required
                                onValueChange={field.onChange}
                                value={field.value}
                                defaultValue={
                                  isPrescripteur ? idUser : undefined
                                }
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Sélectionnez un prescripteur" />
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
                {!selectedOneVbg ? (
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
                            VBG
                          </CardTitle>
                          <CardDescription className="text-blue-700/60">
                            Fiche de violence basée sur le genre
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
                            {dateVisite &&
                              new Date(dateVisite).toLocaleDateString("fr-FR")}
                          </span>
                        </div>

                        {selectedOneVbg.vbgType !== null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Type VBG
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {renameValue(selectedOneVbg.vbgType, TabTypeVbg)}
                            </span>
                          </div>
                        )}

                        {selectedOneVbg.vbgDuree !== null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Durée en heures
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {selectedOneVbg.vbgDuree} heures
                            </span>
                          </div>
                        )}

                        {selectedOneVbg.vbgConsultation !== null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Consultation
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {renameValue(
                                selectedOneVbg.vbgConsultation,
                                tabPec,
                              )}
                            </span>
                          </div>
                        )}

                        {selectedOneVbg.vbgCounsellingRelation && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Counselling Relation
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {selectedOneVbg.vbgCounsellingRelation ? (
                                <CheckedTrue />
                              ) : (
                                <CheckedFalse />
                              )}
                            </span>
                          </div>
                        )}

                        {selectedOneVbg.vbgCounsellingViolenceSexuel && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Counselling Violence Sexuelle
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {selectedOneVbg.vbgCounsellingViolencePhysique ? (
                                <CheckedTrue />
                              ) : (
                                <CheckedFalse />
                              )}
                            </span>
                          </div>
                        )}

                        {selectedOneVbg.vbgCounsellingSexuelite && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Counselling Sexualité
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {selectedOneVbg.vbgCounsellingSexuelite ? (
                                <CheckedTrue />
                              ) : (
                                <CheckedFalse />
                              )}
                            </span>
                          </div>
                        )}

                        {selectedOneVbg.vbgPreventionViolenceSexuelle && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Prévention Violence Sexuelle
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {selectedOneVbg.vbgPreventionViolenceSexuelle ? (
                                <CheckedTrue />
                              ) : (
                                <CheckedFalse />
                              )}
                            </span>
                          </div>
                        )}

                        {selectedOneVbg.vbgPreventionViolencePhysique && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Prévention Violence Physique
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {selectedOneVbg.vbgPreventionViolencePhysique ? (
                                <CheckedTrue />
                              ) : (
                                <CheckedFalse />
                              )}
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Prescripteur
                          </span>
                          <span className="col-span-2 text-sm text-gray-700 italic">
                            {
                              allPrescripteur.find(
                                (p) => p.id === selectedOneVbg.vbgIdUser,
                              )?.name
                            }
                          </span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-center gap-4 border-t border-blue-100/60 pt-4">
                      <Button variant="outline" onClick={() => router.back()}>
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
