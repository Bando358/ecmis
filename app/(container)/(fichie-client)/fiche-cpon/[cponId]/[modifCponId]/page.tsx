"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
// import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { getOneCpon, updateCpon } from "@/lib/actions/cponActions";
import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import { useSession } from "next-auth/react";
import { Cpon, Permission, TableName, User, Visite } from "@prisma/client";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useClientContext } from "@/components/ClientContext";
import { Skeleton } from "@/components/ui/skeleton";
import { getOneClient } from "@/lib/actions/clientActions";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Loader2, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Retour from "@/components/retour";

type Option = {
  value: string;
  label: string;
};
const TabDuree = [
  { value: "6_72", label: "Les 6 et 72 heures" },
  { value: "4_10", label: "Les 4 jrs et 10 jours" },
  { value: "10_6", label: "Les 10 jrs et < 6 semaines " },
  { value: "6_8", label: "Les 6 semaines et  8 semaines " },
];

export default function CpnPage({
  params,
}: {
  params: Promise<{ modifCponId: string }>;
}) {
  const { modifCponId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [selectedCpon, setSelectedCpon] = useState<Cpon>();
  const [dateVisite, setDateVisite] = useState<Date>();
  const [prescripteur, setPrescripteur] = useState<string>();
  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
  const [onePrescripteur, setOnePrescripteur] = useState<User>();
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();
  const [permission, setPermission] = useState<Permission | null>(null);
  const [isVisible, setIsVisible] = useState(false);

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
    // Si l'utilisateur n'est pas encore charg\u00e9, on ne fait rien
    if (!onePrescripteur) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(onePrescripteur?.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.CPON,
        );
        setPermission(perm || null);

        // if (perm?.canRead || session.user.role === "ADMIN") {
        // } else {
        //   alert("Vous n'avez pas la permission d'acc\u00e9der \u00e0 cette page.");
        //   router.back();
        // }
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
      const oneCpon = await getOneCpon(modifCponId);
      const oneUser = await getOneUser(oneCpon?.cponIdUser as string);
      setPrescripteur(oneUser?.name);
      setSelectedCpon(oneCpon as Cpon);
      if (oneCpon) {
        const result = await getAllVisiteByIdClient(oneCpon.cponIdClient);
        const visiteDate = result.find(
          (r: { id: string }) => r.id === oneCpon.cponIdVisite,
        );

        const cliniqueClient = await getOneClient(oneCpon.cponIdClient);
        let allPrestataire: User[] = [];
        if (cliniqueClient?.idClinique) {
          allPrestataire = await getAllUserIncludedIdClinique(
            cliniqueClient.idClinique,
          );
        }
        setAllPrescripteur(allPrestataire as User[]);

        setVisites(
          result.filter((r: { id: any }) => r.id === oneCpon.cponIdVisite),
        ); // Use oneCpon instead of selectedCpon
        setDateVisite(visiteDate?.dateVisite);
        setSelectedClientId(oneCpon.cponIdClient); // Use oneCpon instead of selectedCpon
      }
    };
    fetchData();
  }, [modifCponId, setSelectedClientId]);

  const form = useForm<Cpon>();
  const onSubmit: SubmitHandler<Cpon> = async (data) => {
    if (!permission?.canCreate && onePrescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de cr\u00e9er une CPoN. Contactez un administrateur.",
      );
      return router.back();
    }

    const formattedData = {
      ...data,
      cponIdUser: form.getValues("cponIdUser"),
      // idUser: form.getValues("idUser"),
      cponIdClient: form.getValues("cponIdClient"),
      cponIdVisite: form.getValues("cponIdVisite"),
      cponIdClinique: selectedCpon?.cponIdClinique || "",
    };
    console.log(formattedData);
    try {
      if (selectedCpon) {
        console.log(formattedData);
        await updateCpon(selectedCpon.id, formattedData);
        const oneCpon = await getOneCpon(modifCponId);
        if (oneCpon) {
          setSelectedCpon(oneCpon as Cpon);
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

  const handleUpdateVisite = async () => {
    if (!permission?.canUpdate && onePrescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de modifier une CPoN. Contactez un administrateur.",
      );
      return router.back();
    }
    if (selectedCpon) {
      form.setValue("cponIdVisite", selectedCpon.cponIdVisite);
      form.setValue("cponIdClient", selectedCpon.cponIdClient);
      form.setValue("cponIdUser", selectedCpon.cponIdUser);
      form.setValue("cponDuree", selectedCpon.cponDuree);
      form.setValue("cponConsultation", selectedCpon.cponConsultation);
      form.setValue("cponCounselling", selectedCpon.cponCounselling);
      form.setValue(
        "cponInvestigationPhysique",
        selectedCpon.cponInvestigationPhysique,
      );

      setIsVisible(true);
    }
  };

  const renameValue = (val: string, tab: Option[]) => {
    const newVal = tab.find((t) => t.value === val);
    return newVal?.label;
  };

  return (
    <div className="w-full relative">
      <Retour />
      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {selectedCpon && (
          <ConstanteClient idVisite={selectedCpon.cponIdVisite} />
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
                      Modifier - Consultation CPoN
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
                            name="cponIdVisite"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Selectionnez la visite</FormLabel>
                                <Select required onValueChange={field.onChange}>
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Visite \u00e0 s\u00e9lectionner" />
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
                            name="cponConsultation"
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
                            name="cponCounselling"
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
                                    Counselling
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="cponInvestigationPhysique"
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
                                    Investigation Physique
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                          <Separator className="my-4" />
                          <FormField
                            control={form.control}
                            name="cponDuree"
                            render={({ field }) => (
                              <FormItem className="  pb-4">
                                <div className="text-xl font-bold flex justify-between items-center">
                                  <FormLabel className="ml-4">
                                    Consultation CPon entre :
                                  </FormLabel>
                                </div>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value ?? ""}
                                    className="gap-x-5 items-center"
                                  >
                                    {TabDuree.map((option) => (
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

                        <FormField
                          control={form.control}
                          name="cponIdClient"
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
                            name="cponIdUser"
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
                            name="cponIdUser"
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
                {!selectedCpon ? (
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
                            Consultation CPoN
                          </CardTitle>
                          <CardDescription className="text-blue-700/60">
                            Fiche de consultation post-natale
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

                        {selectedCpon.cponDuree !== null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Consultation CPoN entre
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {renameValue(selectedCpon.cponDuree, TabDuree)}
                            </span>
                          </div>
                        )}

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
