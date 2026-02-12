"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { useClientContext } from "@/components/ClientContext";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { getOnePecVih, updatePecVih } from "@/lib/actions/pecVihActions";
import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import { useSession } from "next-auth/react";
import {
  Client,
  PecVih,
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
import ConstanteClient from "@/components/constanteClient";
import { Checkbox } from "@/components/ui/checkbox";
import { getOneClient } from "@/lib/actions/clientActions";
import { RefreshCw, Loader2, Pencil } from "lucide-react";
import { CheckedFalse, CheckedTrue } from "@/components/checkedTrue";
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

const tabTypeClientPec = [
  { value: "initiale", label: "Consultation Initiale" },
  { value: "suivi", label: "Consultation Suivi" },
  { value: "autre", label: "Consultation Autre" },
];

const tabTypeMoleculeArv = [
  { value: "ABC 3TC DTG", label: "ABC 3TC DTG" },
  { value: "TDF 3TC DTG", label: "TDF 3TC DTG" },
  { value: "autre", label: "Autre" },
];

type Option = {
  value: string;
  label: string;
};

export default function ModifPecVihPage({
  params,
}: {
  params: Promise<{ modifpecVihId: string }>;
}) {
  const { modifpecVihId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [selectedPecVih, setSelectedPecVih] = useState<PecVih>();
  const [dateVisite, setDateVisite] = useState<Date>();
  const [prescripteur, setPrescripteur] = useState<string>();
  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
  const [onePrescripteur, setOnePrescripteur] = useState<User>();
  const [client, setClient] = useState<Client | null>(null);
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();
  const [permission, setPermission] = useState<Permission | null>(null);
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
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!onePrescripteur) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(onePrescripteur.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.PEC_VIH,
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
      try {
        const onePecVih = await getOnePecVih(modifpecVihId);
        setSelectedPecVih(onePecVih as PecVih);

        let allPrestataire: User[] = [];

        if (onePecVih?.pecVihIdClient) {
          const cliniqueClient = await getOneClient(onePecVih.pecVihIdClient);
          setClient(cliniqueClient);

          if (cliniqueClient?.idClinique) {
            allPrestataire = await getAllUserIncludedIdClinique(
              cliniqueClient.idClinique,
            );
          }
        }

        setAllPrescripteur(allPrestataire);
      } catch (err) {
        console.error("Erreur chargement prescripteurs:", err);
      }
    };

    fetchData();
  }, [modifpecVihId]);

  useEffect(() => {
    const fetchData = async () => {
      if (selectedPecVih) {
        const result = await getAllVisiteByIdClient(
          selectedPecVih.pecVihIdClient,
        );
        const visiteDate = result.find(
          (r: { id: string }) => r.id === selectedPecVih.pecVihIdVisite,
        );

        const nomPrescripteur = await getOneUser(selectedPecVih.pecVihIdUser);
        const nomP = nomPrescripteur?.name;
        setPrescripteur(nomP);

        setVisites(
          result.filter(
            (r: { id: string }) => r.id === selectedPecVih.pecVihIdVisite,
          ),
        );
        setDateVisite(visiteDate?.dateVisite);
        setSelectedClientId(selectedPecVih.pecVihIdClient);
      }
    };
    fetchData();
  }, [selectedPecVih, setSelectedClientId]);

  const form = useForm<PecVih>();

  const onSubmit: SubmitHandler<PecVih> = async (data) => {
    const formattedData = {
      ...data,
      pecVihIdUser: form.getValues("pecVihIdUser"),
      pecVihIdClient: form.getValues("pecVihIdClient"),
      pecVihIdVisite: form.getValues("pecVihIdVisite"),
      pecVihTypeclient: form.getValues("pecVihTypeclient"),
      pecVihMoleculeArv: form.getValues("pecVihMoleculeArv"),
      pecDateRdvSuivi: new Date(data.pecDateRdvSuivi),
      pecVihUpdatedAt: new Date(),
      pecVihIdClinique: client?.idClinique || "",
    };

    try {
      if (selectedPecVih) {
        await updatePecVih(selectedPecVih.id, formattedData);
        const onePecVih = await getOnePecVih(modifpecVihId);
        if (onePecVih) {
          setSelectedPecVih(onePecVih as PecVih);
        }
      }
      toast.info("Formulaire modifié avec succès! 🎉");
    } catch (error) {
      toast.error("La Modification du formulaire a échoué");
      console.error("Erreur lors de la modification du formulaire:", error);
    } finally {
      setIsVisible(false);
    }
  };

  const renameTypeClient = (val: string, tab: Option[]) => {
    const newVal = tab.find((t) => t.value === val);
    return newVal?.label;
  };

  const renameMoleculeArv = (val: string, tab: Option[]) => {
    const newVal = tab.find((t) => t.value === val);
    return newVal?.label;
  };

  const formatDate = (date: Date | string) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("fr-FR");
  };

  const handleUpdatePecVih = async () => {
    if (!permission?.canUpdate && onePrescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de modifier une PEC VIH. Contactez un administrateur.",
      );
      return router.back();
    }
    if (selectedPecVih) {
      form.setValue("pecVihIdVisite", selectedPecVih.pecVihIdVisite);
      form.setValue("pecVihIdUser", selectedPecVih.pecVihIdUser);
      form.setValue("pecVihIdClient", selectedPecVih.pecVihIdClient);
      form.setValue("pecVihTypeclient", selectedPecVih.pecVihTypeclient);
      form.setValue("pecVihCounselling", selectedPecVih.pecVihCounselling);
      form.setValue("pecVihMoleculeArv", selectedPecVih.pecVihMoleculeArv);
      form.setValue("pecVihAesArv", selectedPecVih.pecVihAesArv);
      form.setValue("pecVihCotrimo", selectedPecVih.pecVihCotrimo);
      form.setValue("pecVihSpdp", selectedPecVih.pecVihSpdp);
      form.setValue("pecVihIoPaludisme", selectedPecVih.pecVihIoPaludisme);
      form.setValue("pecVihIoTuberculose", selectedPecVih.pecVihIoTuberculose);
      form.setValue("pecVihIoAutre", selectedPecVih.pecVihIoAutre);
      form.setValue(
        "pecVihSoutienPsychoSocial",
        selectedPecVih.pecVihSoutienPsychoSocial,
      );
      form.setValue("pecDateRdvSuivi", selectedPecVih.pecDateRdvSuivi);
      setIsVisible(true);
    }
  };

  return (
    <div className="w-full relative">
      <Retour />
      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {selectedPecVih && (
          <ConstanteClient idVisite={selectedPecVih.pecVihIdVisite} />
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
                      Modifier - Prise en Charge VIH
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
                          name="pecVihIdVisite"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-medium">
                                Selectionnez la visite
                              </FormLabel>
                              <Select
                                required
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Visite à sélectionner" />
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

                        <FormField
                          control={form.control}
                          name="pecVihTypeclient"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-medium">
                                Type de consultation
                              </FormLabel>
                              <Select
                                required
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Sélectionnez le type de consultation" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {tabTypeClientPec.map((option, index) => (
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

                        <div className="my-2 shadow-sm border-blue-200/50 rounded-md p-4 transition-all duration-300">
                          <FormField
                            control={form.control}
                            name="pecVihCounselling"
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
                                    Counselling
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="pecVihMoleculeArv"
                            render={({ field }) => (
                              <FormItem>
                                <div className="text-xl font-bold flex justify-between items-center">
                                  <FormLabel className="font-medium">
                                    Type de Molécule ARV
                                  </FormLabel>
                                  <RefreshCw
                                    onClick={() => {
                                      form.setValue("pecVihMoleculeArv", "");
                                    }}
                                    className="hover:text-blue-600 transition-all duration-200 hover:bg-slate-300 rounded-full p-1 active:scale-125 cursor-pointer"
                                  />
                                </div>
                                <Select
                                  required
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Sélectionnez la Molécule ARV" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {tabTypeMoleculeArv.map((option, index) => (
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

                          <FormField
                            control={form.control}
                            name="pecVihAesArv"
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
                                    ARV / AES
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="pecVihCotrimo"
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
                                    Prophylaxie au Cotrimoxazole
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="pecVihSpdp"
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
                                    SPDP
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />

                          <div className="pt-4">
                            <h3 className="font-medium mb-2">
                              Infections opportunistes:
                            </h3>

                            <FormField
                              control={form.control}
                              name="pecVihIoPaludisme"
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
                                      Paludisme
                                    </FormLabel>
                                  </div>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="pecVihIoTuberculose"
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
                                      Tuberculose
                                    </FormLabel>
                                  </div>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="pecVihIoAutre"
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
                                      Autre infection opportuniste
                                    </FormLabel>
                                  </div>
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="pecVihSoutienPsychoSocial"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2 pt-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value ?? false}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="font-normal">
                                    Soutien psychosocial
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="pecDateRdvSuivi"
                          render={({ field }) => (
                            <FormItem className="flex flex-row justify-center items-center">
                              <FormLabel className="font-normal flex-1">
                                Date de RDV
                              </FormLabel>
                              <FormControl>
                                <Input
                                  className="flex-1"
                                  type="date"
                                  required
                                  value={
                                    field.value
                                      ? new Date(field.value)
                                          .toISOString()
                                          .split("T")[0]
                                      : ""
                                  }
                                  onChange={(e) =>
                                    field.onChange(new Date(e.target.value))
                                  }
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="pecVihIdClient"
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
                            name="pecVihIdUser"
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
                            name="pecVihIdUser"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="font-medium">
                                  Selectionnez le prescripteur
                                </FormLabel>
                                <Select
                                  required
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select Prescripteur ....." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {allPrescripteur.map(
                                      (prescripteur, index) => (
                                        <SelectItem
                                          key={index}
                                          value={prescripteur.id}
                                        >
                                          <span>{prescripteur.name}</span>
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
                {!selectedPecVih ? (
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
                            Prise en Charge VIH
                          </CardTitle>
                          <CardDescription className="text-blue-700/60">
                            Fiche de PEC VIH
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
                            Type de consultation
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {renameTypeClient(
                              selectedPecVih.pecVihTypeclient,
                              tabTypeClientPec,
                            )}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Counselling
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedPecVih.pecVihCounselling ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Molécule ARV
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {renameMoleculeArv(
                              selectedPecVih.pecVihMoleculeArv,
                              tabTypeMoleculeArv,
                            )}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            ARV / AES
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedPecVih.pecVihAesArv ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Prophylaxie Cotrimoxazole
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedPecVih.pecVihCotrimo ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            SPDP
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedPecVih.pecVihSpdp ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            IO Paludisme
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedPecVih.pecVihIoPaludisme ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            IO Tuberculose
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedPecVih.pecVihIoTuberculose ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            IO Autre
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedPecVih.pecVihIoAutre ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Soutien psychosocial
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedPecVih.pecVihSoutienPsychoSocial ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Date RDV suivi
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {formatDate(selectedPecVih.pecDateRdvSuivi)}
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
                      <Button onClick={handleUpdatePecVih}>
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
