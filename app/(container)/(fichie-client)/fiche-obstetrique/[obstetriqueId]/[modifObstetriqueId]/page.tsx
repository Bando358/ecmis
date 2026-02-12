"use client";
import { use, useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { RefreshCw, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { getAllUserIncludedIdClinique } from "@/lib/actions/authActions";

import { getOneGrossesse } from "@/lib/actions/grossesseActions";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { getOneUser } from "@/lib/actions/authActions";
import {
  getOneObstetrique,
  updateObstetrique,
  getEtatImcByIdVisite,
} from "@/lib/actions/obstetriqueActions";
import { useSession } from "next-auth/react";
import {
  Grossesse,
  Obstetrique,
  Permission,
  TableName,
  User,
  Visite,
} from "@prisma/client";
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
import { Label } from "@/components/ui/label";
import ConstanteClient from "@/components/constanteClient";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useClientContext } from "@/components/ClientContext";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckedFalse, CheckedTrue } from "@/components/checkedTrue";
import { getOneClient } from "@/lib/actions/clientActions";
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
import { motion, AnimatePresence } from "framer-motion";
import Retour from "@/components/retour";

type Option = {
  value: string;
  label: string;
};
const TabEtatGrossesse = [
  { value: "normal", label: "Normal" },
  { value: "risque", label: "A risque" },
];
const TabVat = [
  { value: "vat1", label: "VAT 1" },
  { value: "vat2", label: "VAT 2" },
  { value: "vat3", label: "VAT 3" },
  { value: "vat4", label: "VAT 4" },
  { value: "vat5", label: "VAT 5+" },
];
const TabSp = [
  { value: "sp1", label: "SP 1" },
  { value: "sp2", label: "SP 2" },
  { value: "sp3", label: "SP 3" },
  { value: "sp4", label: "SP 4" },
  { value: "sp5", label: "SP 5+" },
];
const TabCpn = [
  { value: "cpn1", label: "CPN 1" },
  { value: "cpn2", label: "CPN 2" },
  { value: "cpn3", label: "CPN 3" },
  { value: "cpn4", label: "CPN 4" },
  { value: "cpn5", label: "CPN 5+" },
];
// modifObstetriqueId
export default function GynecoPage({
  params,
}: {
  params: Promise<{ modifObstetriqueId: string }>;
}) {
  const { modifObstetriqueId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [grossessesObjt, setGrossessesObjt] = useState<Grossesse | null>();
  const [styleImc, setStyleImc] = useState<string>("");
  const [selectedObstetrique, setSelectedObstetrique] = useState<Obstetrique>();
  const [dateVisite, setDateVisite] = useState<Date>();
  const [prescripteur, setPrescripteur] = useState<string>();
  const [onePrescripteur, setOnePrescripteur] = useState<User>();
  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
  const [permission, setPermission] = useState<Permission | null>(null);
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();
  const [isVisible, setIsVisible] = useState(false);

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
    // Si l'utilisateur n'est pas encore charg\u00e9, on ne fait rien
    if (!onePrescripteur) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(onePrescripteur.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.OBSTETRIQUE,
        );
        setPermission(perm || null);
      } catch (error) {
        console.error(
          "Erreur lors de la v\u00e9rification des permissions :",
          error,
        );
      }
    };

    fetchPermissions();
  }, [onePrescripteur]);

  useEffect(() => {
    const fetchData = async () => {
      const oneObstetrique = await getOneObstetrique(modifObstetriqueId);
      const oneUser = await getOneUser(oneObstetrique?.obstIdUser as string);
      setPrescripteur(oneUser?.name);
      setSelectedObstetrique(oneObstetrique as Obstetrique);
      if (oneObstetrique) {
        const result = await getAllVisiteByIdClient(
          oneObstetrique.obstIdClient,
        );
        const visiteDate = result.find(
          (r: { id: string }) => r.id === oneObstetrique.obstIdVisite,
        );
        const resultGrossesse = await getOneGrossesse(
          oneObstetrique.obstIdGrossesse,
        );
        setGrossessesObjt(resultGrossesse);
        const cliniqueClient = await getOneClient(oneObstetrique.obstIdClient);
        let allPrestataire: User[] = [];
        if (cliniqueClient?.idClinique) {
          allPrestataire = await getAllUserIncludedIdClinique(
            cliniqueClient.idClinique,
          );
        }
        setAllPrescripteur(allPrestataire as User[]);

        setVisites(
          result.filter(
            (r: { id: string }) => r.id === oneObstetrique.obstIdVisite,
          ),
        ); // Use oneObstetrique instead of selectedObstetrique
        setDateVisite(visiteDate?.dateVisite);
        setSelectedClientId(oneObstetrique.obstIdClient); // Use oneObstetrique instead of selectedObstetrique
      }
    };
    fetchData();
  }, [modifObstetriqueId, setSelectedClientId]);

  // Fonction pour r\u00e9cup\u00e9rer et d\u00e9finir l'\u00e9tat IMC
  const handleVisiteChange = async (idVisite: string) => {
    try {
      form.setValue("obstIdVisite", idVisite);
      const etatImc = await getEtatImcByIdVisite(idVisite);
      form.setValue("obstEtatNutritionnel", etatImc || "");
      if (etatImc && etatImc === "Maigreur") {
        setStyleImc("text-yellow-500 font-black");
      } else if (etatImc && etatImc === "Poids normal") {
        setStyleImc("text-green-500 font-black");
      } else if (etatImc && etatImc === "Surpoids") {
        setStyleImc("text-orange-500 font-black");
      } else {
        setStyleImc("text-red-600 font-black");
      }
    } catch (error) {
      console.error(
        "Erreur lors de la r\u00e9cup\u00e9ration de l'\u00e9tat IMC :",
        error,
      );
      toast.error("Impossible de r\u00e9cup\u00e9rer l'\u00e9tat IMC.");
    }
  };

  const form = useForm<Obstetrique>({
    defaultValues: {
      obstRdv: null,
      obstIdVisite: "",
      obstIdGrossesse: "",
      obstTypeVisite: "",
      obstSp: "",
      obstVat: "",
      obstFer: false,
      obstFolate: false,
      obstDeparasitant: false,
      obstMilda: false,
      obstConsultation: true,
      obstCounselling: true,
      obstInvestigations: false,
      obstEtatNutritionnel: "",
      obstEtatGrossesse: "",
      obstPfppi: false,
      obstAlbuminieSucre: false,
      obstAnemie: false,
      obstSyphilis: false,
      obstAghbs: false,
      // obstIdClient: obstId,
      obstIdUser: isPrescripteur === true ? idUser || "" : "",
    },
  });
  const onSubmit: SubmitHandler<Obstetrique> = async (data) => {
    const formattedData = {
      ...data,
      obstIdVisite: form.getValues("obstIdVisite"),
      obstIdUser: form.getValues("obstIdUser"),
      obstIdClient: form.getValues("obstIdClient"),
      obstRdv: form.getValues("obstRdv"),
    };
    try {
      if (selectedObstetrique) {
        console.log(formattedData);
        await updateObstetrique(selectedObstetrique.id, formattedData);
        const oneObtetrique = await getOneObstetrique(modifObstetriqueId);
        if (oneObtetrique) {
          setSelectedObstetrique(oneObtetrique as Obstetrique);
        }
      }
      toast.info("Formulaire modifi\u00e9e avec succ\u00e8s! \ud83c\udf89");
    } catch (error) {
      toast.error("La modification du formulaire a \u00e9chou\u00e9");
      console.error("Erreur lors de la modification du formulaire:", error);
    } finally {
      setIsVisible(false);
    }
  };

  const renameValue = (val: string, tab: Option[]) => {
    const newVal = tab.find((t) => t.value === val);
    return newVal?.label;
  };

  const handleUpdateVisite = async () => {
    if (!permission?.canUpdate && onePrescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de modifier une CPN. Contactez un administrateur.",
      );
      return router.back();
    }
    if (selectedObstetrique) {
      form.setValue("obstIdVisite", selectedObstetrique.obstIdVisite);
      form.setValue("obstIdClient", selectedObstetrique.obstIdClient);
      form.setValue("obstIdUser", selectedObstetrique.obstIdUser);
      form.setValue("obstAghbs", selectedObstetrique.obstAghbs);
      form.setValue(
        "obstAlbuminieSucre",
        selectedObstetrique.obstAlbuminieSucre,
      );
      form.setValue("obstConsultation", selectedObstetrique.obstConsultation);
      form.setValue("obstCounselling", selectedObstetrique.obstCounselling);
      form.setValue("obstDeparasitant", selectedObstetrique.obstDeparasitant);
      form.setValue("obstEtatGrossesse", selectedObstetrique.obstEtatGrossesse);
      form.setValue(
        "obstEtatNutritionnel",
        selectedObstetrique.obstEtatNutritionnel,
      );
      form.setValue("obstFer", selectedObstetrique.obstFer);
      form.setValue("obstFolate", selectedObstetrique.obstFolate);
      form.setValue("obstIdGrossesse", selectedObstetrique.obstIdGrossesse);
      form.setValue(
        "obstInvestigations",
        selectedObstetrique.obstInvestigations,
      );
      form.setValue("obstPfppi", selectedObstetrique.obstPfppi);
      form.setValue("obstAnemie", selectedObstetrique.obstAnemie);
      form.setValue("obstMilda", selectedObstetrique.obstMilda);
      form.setValue("obstRdv", selectedObstetrique.obstRdv);
      form.setValue("obstSp", selectedObstetrique.obstSp);
      form.setValue("obstSyphilis", selectedObstetrique.obstSyphilis);
      form.setValue("obstTypeVisite", selectedObstetrique.obstTypeVisite);
      form.setValue("obstVat", selectedObstetrique.obstVat);
      setIsVisible(true);
    }
  };

  return (
    <div className="w-full relative">
      <Retour />
      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {selectedObstetrique && (
          <ConstanteClient idVisite={selectedObstetrique.obstIdVisite} />
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
                      {"Modifier - Obst\u00e9trique"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <Form {...form}>
                      <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-2 max-w-4xl mx-auto px-4 py-4"
                      >
                        <div className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md ">
                          <FormField
                            control={form.control}
                            name="obstIdVisite"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="font-medium">
                                  Selectionnez la visite
                                </FormLabel>
                                <Select
                                  required
                                  value={field.value} // Correction ici
                                  onValueChange={(value) => {
                                    field.onChange(value); // Met \u00e0 jour la valeur du champ
                                    handleVisiteChange(value); // Appelle la fonction pour charger les donn\u00e9es
                                  }}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Visite \u00e0 s\u00e9lectionner ....." />
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
                          {grossessesObjt && (
                            <FormField
                              control={form.control}
                              name="obstIdGrossesse"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="font-medium">
                                    Selectionnez la grossesse
                                  </FormLabel>
                                  <Select
                                    required
                                    onValueChange={field.onChange}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Grossesse \u00e0 s\u00e9lectionner ....." />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value={grossessesObjt.id}>
                                        {grossessesObjt.grossesseDdr &&
                                          new Date(
                                            grossessesObjt.grossesseDdr,
                                          ).toLocaleDateString("fr-FR")}{" "}
                                        -{" "}
                                        {grossessesObjt.termePrevu &&
                                          new Date(
                                            grossessesObjt.termePrevu,
                                          ).toLocaleDateString("fr-FR")}
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>

                        {/* ************************* */}
                        <FormField
                          control={form.control}
                          name="obstConsultation"
                          render={({ field }) => (
                            <FormItem className="hidden">
                              <FormControl>
                                <Checkbox
                                  checked={field.value || false}
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
                          name="obstCounselling"
                          render={({ field }) => (
                            <FormItem className="hidden">
                              <FormControl>
                                <Checkbox
                                  checked={field.value || false}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="font-normal">
                                  Counselling
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <div className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md ">
                          <FormField
                            control={form.control}
                            name="obstTypeVisite"
                            render={({ field }) => (
                              <FormItem className="pb-4">
                                <div className="text-xl font-bold flex justify-between items-center">
                                  <FormLabel className="ml-4">
                                    Num CPN :
                                  </FormLabel>
                                </div>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value || ""}
                                    className="gap-x-5 items-center grid grid-cols-3"
                                  >
                                    {TabCpn.map((option) => (
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
                          <Separator className="mb-3" />
                          <FormField
                            control={form.control}
                            name="obstSp"
                            render={({ field }) => (
                              <FormItem className="pb-4">
                                <div className="text-xl font-bold flex justify-between items-center">
                                  <FormLabel className="ml-4">SP :</FormLabel>
                                  <RefreshCw
                                    onClick={() => {
                                      form.setValue("obstSp", "");
                                    }}
                                    className="hover:text-blue-600 transition-all duration-200 hover:bg-slate-300 rounded-full p-1 active:scale-125"
                                  />
                                </div>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value || ""}
                                    className="gap-x-5 items-center grid-cols-3"
                                  >
                                    {TabSp.map((option) => (
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
                          <Separator className="mb-3" />
                          <FormField
                            control={form.control}
                            name="obstVat"
                            render={({ field }) => (
                              <FormItem className="pb-4">
                                <div className="text-xl font-bold flex justify-between items-center">
                                  <FormLabel className="ml-4">
                                    Vaccination :
                                  </FormLabel>
                                  <RefreshCw
                                    onClick={() => {
                                      form.setValue("obstVat", "");
                                    }}
                                    className="hover:text-blue-600 transition-all duration-200 hover:bg-slate-300 rounded-full p-1 active:scale-125"
                                  />
                                </div>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value || ""}
                                    className="gap-x-5 items-center grid-cols-3"
                                  >
                                    {TabVat.map((option) => (
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
                        </div>
                        <div className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md ">
                          <Label className="flex justify-center">
                            Prescriptions
                          </Label>
                          <div className="grid grid-cols-2">
                            <FormField
                              control={form.control}
                              name="obstFer"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value || false}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="font-normal">
                                      Fer
                                    </FormLabel>
                                  </div>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="obstFolate"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value || false}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="font-normal">
                                      Folate
                                    </FormLabel>
                                  </div>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="obstDeparasitant"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value || false}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="font-normal">
                                      {"D\u00e9parasitant"}
                                    </FormLabel>
                                  </div>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="obstMilda"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value || false}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="font-normal">
                                      MILDA
                                    </FormLabel>
                                  </div>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        <div className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md ">
                          <FormField
                            control={form.control}
                            name="obstInvestigations"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value || false}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="font-normal">
                                    Investigation Physique
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="obstEtatNutritionnel"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center">
                                <FormLabel className="flex-1">
                                  Etat Nutritionnel :
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    className={`flex-1 ${styleImc}`}
                                    required
                                    disabled
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Separator className="my-3" />
                          <FormField
                            control={form.control}
                            name="obstEtatGrossesse"
                            render={({ field }) => (
                              <FormItem className="pb-4">
                                <div className="text-xl font-bold flex justify-between items-center">
                                  <FormLabel className="ml-4">
                                    Etat de la grossesse :
                                  </FormLabel>
                                </div>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value || ""}
                                    className="flex gap-x-5 items-center"
                                    required
                                  >
                                    {TabEtatGrossesse.map((option) => (
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
                          <Separator />
                          <FormField
                            control={form.control}
                            name="obstPfppi"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value || false}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="font-normal">
                                    Counselling PF ppi
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                          <Separator className="mb-3" />
                          <Label className="flex justify-center mt-2">
                            {"D\u00e9pistages"}
                          </Label>
                          <div className="grid grid-cols-2">
                            <FormField
                              control={form.control}
                              name="obstAlbuminieSucre"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value || false}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="font-normal">
                                      {"D\u00e9pistage sucre"}
                                    </FormLabel>
                                  </div>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="obstAnemie"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value || false}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="font-normal">
                                      {"D\u00e9pistage An\u00e9mie"}
                                    </FormLabel>
                                  </div>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="obstSyphilis"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value || false}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="font-normal">
                                      {"D\u00e9pistage Syphilis"}
                                    </FormLabel>
                                  </div>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="obstAghbs"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value || false}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="font-normal">
                                      {"D\u00e9pistage AgHbs"}
                                    </FormLabel>
                                  </div>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div className="my-2 px-4 py-2 flex flex-col shadow-sm border-blue-200/50 rounded-md ">
                          <div className="mb-3 flex flex-row items-center">
                            <label className="block text-sm flex-1 font-medium">
                              Rendez-Vous :
                            </label>
                            <Input
                              className="mt-1 px-3 py-1 flex-1 w-full rounded-md border border-slate-200"
                              type="date"
                              value={(() => {
                                const v = form.watch("obstRdv");
                                if (!v) return "";
                                const dateObj =
                                  typeof v === "string" ? new Date(v) : v;
                                return dateObj.toISOString().split("T")[0];
                              })()}
                              onChange={(e) => {
                                const val = e.target.value;
                                form.setValue(
                                  "obstRdv",
                                  val ? new Date(val) : null,
                                );
                              }}
                            />
                          </div>
                        </div>

                        <FormField
                          control={form.control}
                          name="obstIdClient"
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
                            name="obstIdUser"
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
                            name="obstIdUser"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="font-medium">
                                  Selectionnez le precripteur .....
                                </FormLabel>
                                <Select
                                  required
                                  value={field.value || ""}
                                  onValueChange={field.onChange}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select Prescripteur" />
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
                {!selectedObstetrique ? (
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
                            {"Obst\u00e9trique"}
                          </CardTitle>
                          <CardDescription className="text-blue-700/60">
                            {"Fiche de consultation obst\u00e9tricale"}
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

                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            {"P\u00e9riode de Grossesse"}
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {dateVisite &&
                              grossessesObjt &&
                              grossessesObjt.grossesseDdr &&
                              new Date(
                                grossessesObjt.grossesseDdr,
                              ).toLocaleDateString("fr-FR")}{" "}
                            -{" "}
                            {dateVisite &&
                              grossessesObjt &&
                              grossessesObjt.termePrevu &&
                              new Date(
                                grossessesObjt.termePrevu,
                              ).toLocaleDateString("fr-FR")}
                          </span>
                        </div>

                        {selectedObstetrique.obstTypeVisite !== null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              {"Num\u00e9ro CPN"}
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {renameValue(
                                selectedObstetrique.obstTypeVisite,
                                TabCpn,
                              )}
                            </span>
                          </div>
                        )}

                        {selectedObstetrique.obstSp !== null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              SP
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {renameValue(selectedObstetrique.obstSp, TabSp)}
                            </span>
                          </div>
                        )}

                        {selectedObstetrique.obstVat !== null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              VAT
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {renameValue(selectedObstetrique.obstVat, TabVat)}
                            </span>
                          </div>
                        )}

                        {/* Prescriptions section header */}
                        <div className="py-2.5">
                          <span className="text-sm font-semibold text-blue-900 block text-center">
                            Prescriptions
                          </span>
                        </div>

                        {selectedObstetrique.obstFer !== null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Fer
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {selectedObstetrique.obstFer ? (
                                <CheckedTrue />
                              ) : (
                                <CheckedFalse />
                              )}
                            </span>
                          </div>
                        )}

                        {selectedObstetrique.obstFolate !== null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Folate
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {selectedObstetrique.obstFolate ? (
                                <CheckedTrue />
                              ) : (
                                <CheckedFalse />
                              )}
                            </span>
                          </div>
                        )}

                        {selectedObstetrique.obstDeparasitant !== null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              {"D\u00e9parasitant"}
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {selectedObstetrique.obstDeparasitant ? (
                                <CheckedTrue />
                              ) : (
                                <CheckedFalse />
                              )}
                            </span>
                          </div>
                        )}

                        {selectedObstetrique.obstMilda !== null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              MILDA
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {selectedObstetrique.obstMilda ? (
                                <CheckedTrue />
                              ) : (
                                <CheckedFalse />
                              )}
                            </span>
                          </div>
                        )}

                        {selectedObstetrique.obstInvestigations !== null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Investigation Physique
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {selectedObstetrique.obstInvestigations ? (
                                <CheckedTrue />
                              ) : (
                                <CheckedFalse />
                              )}
                            </span>
                          </div>
                        )}

                        {selectedObstetrique.obstEtatNutritionnel !== null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Etat Nutritionnel
                            </span>
                            <span className={`col-span-2 text-sm ${styleImc}`}>
                              {selectedObstetrique.obstEtatNutritionnel}
                            </span>
                          </div>
                        )}

                        {selectedObstetrique.obstEtatGrossesse !== null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Etat Grossesse
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {renameValue(
                                selectedObstetrique.obstEtatGrossesse,
                                TabEtatGrossesse,
                              )}
                            </span>
                          </div>
                        )}

                        {selectedObstetrique.obstPfppi !== null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Couselling PF PPI
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {selectedObstetrique.obstPfppi ? (
                                <CheckedTrue />
                              ) : (
                                <CheckedFalse />
                              )}
                            </span>
                          </div>
                        )}

                        {/* D\u00e9pistage section header */}
                        <div className="py-2.5">
                          <span className="text-sm font-semibold text-blue-900 block text-center">
                            {"D\u00e9pistage"}
                          </span>
                        </div>

                        {selectedObstetrique.obstAlbuminieSucre !== null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Albimune Sucre
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {selectedObstetrique.obstAlbuminieSucre ? (
                                <CheckedTrue />
                              ) : (
                                <CheckedFalse />
                              )}
                            </span>
                          </div>
                        )}

                        {selectedObstetrique.obstAnemie !== null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              {"An\u00e9mie"}
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {selectedObstetrique.obstAnemie ? (
                                <CheckedTrue />
                              ) : (
                                <CheckedFalse />
                              )}
                            </span>
                          </div>
                        )}

                        {selectedObstetrique.obstSyphilis !== null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Syphilis
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {selectedObstetrique.obstSyphilis ? (
                                <CheckedTrue />
                              ) : (
                                <CheckedFalse />
                              )}
                            </span>
                          </div>
                        )}

                        {selectedObstetrique.obstAghbs !== null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              {"D\u00e9pistage Aghbs"}
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {selectedObstetrique.obstAghbs ? (
                                <CheckedTrue />
                              ) : (
                                <CheckedFalse />
                              )}
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Date de Rendez-Vous
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedObstetrique.obstRdv !== null &&
                              new Date(
                                selectedObstetrique.obstRdv,
                              ).toLocaleDateString("fr-FR")}
                          </span>
                        </div>

                        {prescripteur && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Prescripteur
                            </span>
                            <span className="col-span-2 text-sm text-gray-700 italic">
                              {prescripteur}
                            </span>
                          </div>
                        )}
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
