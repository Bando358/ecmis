"use client";
import { use, useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import {
  updateGrossesse,
  getOneGrossesse,
} from "@/lib/actions/grossesseActions";
import { useSession } from "next-auth/react";
import { Grossesse, Permission, TableName, User, Visite } from "@prisma/client";
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
import { useClientContext } from "@/components/ClientContext";
import { Skeleton } from "@/components/ui/skeleton";
import { getOneClient } from "@/lib/actions/clientActions";
import { useRouter } from "next/navigation";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import Retour from "@/components/retour";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Option = {
  value: string;
  label: string;
};

const TabHta = [
  { value: "oui", label: "Oui" },
  { value: "non", label: "Non" },
];
// modifGrossesseId
export default function GynecoPage({
  params,
}: {
  params: Promise<{ modifGrossesseId: string }>;
}) {
  const { modifGrossesseId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [selectedGrossesse, setSelectedGrossesse] = useState<Grossesse>();

  const [dateVisite, setDateVisite] = useState<Date>();
  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
  const [onePrescripteur, setOnePrescripteur] = useState<User>();
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
          (p: { table: string }) => p.table === TableName.GROSSESSE,
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
      const oneGrossesse = await getOneGrossesse(modifGrossesseId);
      setSelectedGrossesse(oneGrossesse as Grossesse);
      if (oneGrossesse) {
        const result = await getAllVisiteByIdClient(
          oneGrossesse.grossesseIdClient,
        );
        const visiteDate = result.find(
          (r: { id: string }) => r.id === oneGrossesse.grossesseIdVisite,
        );

        const cliniqueClient = await getOneClient(
          oneGrossesse.grossesseIdClient,
        );
        let allPrestataire: User[] = [];
        if (cliniqueClient?.idClinique) {
          allPrestataire = await getAllUserIncludedIdClinique(
            cliniqueClient.idClinique,
          );
        }
        setAllPrescripteur(allPrestataire as User[]);

        setVisites(
          result.filter(
            (r: { id: string }) => r.id === oneGrossesse.grossesseIdVisite,
          ),
        ); // Use oneGrossesse instead of selectedGrossesse
        setDateVisite(visiteDate?.dateVisite);
        setSelectedClientId(oneGrossesse.grossesseIdClient); // Use oneGrossesse instead of selectedGrossesse
      }
    };
    fetchData();
  }, [modifGrossesseId, setSelectedClientId]);

  const form = useForm<Grossesse>();
  const onSubmit: SubmitHandler<Grossesse> = async (data) => {
    const formattedData = {
      ...data,
      grossesseIdUser: data.grossesseIdUser,
      grossesseIdVisite: form.getValues("grossesseIdVisite"),
      // idClient: form.getValues("idClient"),
      grossesseDdr: data.grossesseDdr ? new Date(data.grossesseDdr) : null,
      termePrevu: data.termePrevu ? new Date(data.termePrevu) : null,
      grossesseAge: parseFloat(data.grossesseAge as unknown as string) || 0,
      grossesseParite: parseInt(data.grossesseParite as unknown as string, 10),
      grossesseGestite: parseInt(
        data.grossesseGestite as unknown as string,
        10,
      ),
      grossesseIdClinique: selectedGrossesse?.grossesseIdClinique || "",
    };
    try {
      if (selectedGrossesse) {
        console.log(formattedData);
        await updateGrossesse(selectedGrossesse.id, formattedData);
        const grossesseUpdated = await getOneGrossesse(selectedGrossesse.id);
        if (grossesseUpdated) {
          setSelectedGrossesse(grossesseUpdated as Grossesse);
        }
      }
      toast.info("Formulaire modifiée avec succès! 🎉");
    } catch (error) {
      toast.error("La Modification de la Grossesse a échoué");
      console.error("Erreur lors de la Modification de la Grossesse:", error);
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
        "Vous n'avez pas la permission de modifier une grossesse. Contactez un administrateur.",
      );
      return router.back();
    }
    if (selectedGrossesse) {
      form.setValue("grossesseIdVisite", selectedGrossesse.grossesseIdVisite);
      form.setValue("grossesseIdClient", selectedGrossesse.grossesseIdClient);
      form.setValue("grossesseIdUser", selectedGrossesse.grossesseIdUser);
      form.setValue("grossesseHta", selectedGrossesse.grossesseHta);
      form.setValue("grossesseDiabete", selectedGrossesse.grossesseDiabete);
      form.setValue("grossesseGestite", selectedGrossesse.grossesseGestite);
      form.setValue("grossesseParite", selectedGrossesse.grossesseParite);
      form.setValue("grossesseAge", selectedGrossesse.grossesseAge);
      form.setValue("grossesseDdr", selectedGrossesse.grossesseDdr);
      form.setValue("termePrevu", selectedGrossesse.termePrevu);

      setIsVisible(true);
    }
  };

  return (
    <div className="w-full relative">
      <Retour />
      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {selectedGrossesse && (
          <ConstanteClient idVisite={selectedGrossesse.grossesseIdVisite} />
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
                      Modifier - Grossesse
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
                          name="grossesseIdVisite"
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
                        <div className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md ">
                          <Label>Patologies Antécédentes</Label>
                          <div className="flex flex-row justify-between">
                            <FormField
                              control={form.control}
                              name="grossesseHta"
                              render={({ field }) => (
                                <FormItem className="  pb-4">
                                  <div className="text-xl font-bold flex justify-between items-center">
                                    <FormLabel className="ml-4">
                                      HTA :
                                    </FormLabel>
                                  </div>
                                  <FormControl>
                                    <RadioGroup
                                      onValueChange={field.onChange}
                                      value={field.value ?? ""}
                                      className="flex gap-x-5 items-center"
                                    >
                                      {TabHta.map((option) => (
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
                            <Separator
                              orientation="vertical"
                              className="mx-2 bg-gray-400"
                            />
                            <FormField
                              control={form.control}
                              name="grossesseDiabete"
                              render={({ field }) => (
                                <FormItem className="  pb-4">
                                  <div className="text-xl font-bold flex justify-between items-center">
                                    <FormLabel className="ml-4">
                                      Diabète :
                                    </FormLabel>
                                  </div>
                                  <FormControl>
                                    <RadioGroup
                                      onValueChange={field.onChange}
                                      value={field.value ?? ""}
                                      className="flex gap-x-5 items-center"
                                    >
                                      {TabHta.map((option) => (
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
                        </div>
                        <div className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md ">
                          <FormField
                            control={form.control}
                            name="grossesseGestite"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center">
                                <FormLabel className="flex-1">
                                  Gestité :
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    className="flex-1"
                                    required
                                    type="number"
                                    {...field}
                                    value={field.value ?? ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="grossesseParite"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center">
                                <FormLabel className="flex-1">
                                  Parité :
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    className="flex-1"
                                    required
                                    type="number"
                                    {...field}
                                    value={field.value ?? ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="my-2 px-4 py-2 flex flex-col shadow-sm border-blue-200/50 rounded-md ">
                          <FormField
                            control={form.control}
                            name="grossesseAge"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center">
                                <FormLabel className="flex-1">
                                  Âge en Semaine :
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    className="flex-1"
                                    required
                                    type="number"
                                    {...field}
                                    value={field.value ?? ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="mb-3 flex flex-row items-center">
                            <label className="block text-sm flex-1 font-medium">
                              D.D.R :
                            </label>
                            <Input
                              {...form.register("grossesseDdr")}
                              className="mt-1 px-3 py-1 flex-1 w-full rounded-md border border-slate-200"
                              type="date"
                            />
                          </div>
                          <div className="flex flex-row items-center">
                            <label className="block text-sm flex-1 font-medium">
                              Terme prévu :
                            </label>
                            <Input
                              {...form.register("termePrevu")}
                              className="mt-1 px-3 py-1 flex-1 w-full rounded-md border border-slate-200"
                              type="date"
                            />
                          </div>
                        </div>

                        <FormField
                          control={form.control}
                          name="grossesseIdClient"
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
                            name="grossesseIdUser"
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
                            name="grossesseIdUser"
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
                                      <SelectValue placeholder="Select Prescripteur" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {allPrescripteur.map((prescripteur) => (
                                      <SelectItem
                                        key={prescripteur.id}
                                        value={prescripteur.id ?? ""}
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
                {!selectedGrossesse ? (
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
                            Grossesse
                          </CardTitle>
                          <CardDescription className="text-blue-700/60">
                            Fiche de suivi de grossesse
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

                        {selectedGrossesse.grossesseHta !== null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              HTA
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {renameValue(
                                selectedGrossesse.grossesseHta,
                                TabHta,
                              )}
                            </span>
                          </div>
                        )}

                        {selectedGrossesse.grossesseDiabete !== null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Diabète
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {renameValue(
                                selectedGrossesse.grossesseDiabete,
                                TabHta,
                              )}
                            </span>
                          </div>
                        )}

                        {selectedGrossesse.grossesseGestite !== null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Gestité
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {selectedGrossesse.grossesseGestite}
                            </span>
                          </div>
                        )}

                        {selectedGrossesse.grossesseParite !== null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Parité
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {selectedGrossesse.grossesseParite}
                            </span>
                          </div>
                        )}

                        {selectedGrossesse.grossesseAge !== null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Âge gestationnel
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {selectedGrossesse.grossesseAge} semaines
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            DDR
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {dateVisite &&
                              selectedGrossesse.grossesseDdr !== null &&
                              new Date(
                                selectedGrossesse.grossesseDdr,
                              ).toLocaleDateString("fr-FR")}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Terme Prévu
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {dateVisite &&
                              selectedGrossesse.termePrevu !== null &&
                              new Date(
                                selectedGrossesse.termePrevu,
                              ).toLocaleDateString("fr-FR")}
                          </span>
                        </div>

                        {selectedGrossesse && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Prescripteur
                            </span>
                            <span className="col-span-2 text-sm text-gray-700 italic">
                              {
                                allPrescripteur?.find(
                                  (item) =>
                                    item.id ===
                                    selectedGrossesse.grossesseIdUser,
                                )?.name
                              }
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
