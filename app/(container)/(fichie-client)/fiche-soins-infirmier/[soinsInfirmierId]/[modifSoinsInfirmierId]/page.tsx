"use client";
import { use, useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { useClientContext } from "@/components/ClientContext";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import {
  getOneSoinsInfirmier,
  updateSoinsInfirmier,
} from "@/lib/actions/soinsInfirmierActions";
import { updateRecapVisite } from "@/lib/actions/recapActions";
import { motion, AnimatePresence } from "framer-motion";
import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import { useSession } from "next-auth/react";
import { SoinsInfirmier, Visite, TableName } from "@prisma/client";
import { SafeUser } from "@/types/prisma";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import PrescripteurFieldBlock from "@/components/ui/PrescripteurFieldBlock";
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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RefreshCw, Loader2, Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getOneClient } from "@/lib/actions/clientActions";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Retour from "@/components/retour";
import { TAB_SOINS_INFIRMIER } from "@/components/forms/SoinsInfirmierForm";

export default function SoinsInfirmierModifPage({
  params,
}: {
  params: Promise<{ modifSoinsInfirmierId: string }>;
}) {
  const { modifSoinsInfirmierId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [selectedSoins, setSelectedSoins] = useState<SoinsInfirmier>();
  const [dateVisite, setDateVisite] = useState<Date>();
  const [prescripteur, setPrescripteur] = useState<string>();
  const [allPrescripteur, setAllPrescripteur] = useState<SafeUser[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();

  const { setSelectedClientId } = useClientContext();
  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const router = useRouter();
  const { canUpdate } = usePermissionContext();

  useEffect(() => {
    if (!idUser) return;
    const fetchData = async () => {
      try {
        const [user, oneSoins] = await Promise.all([
          getOneUser(idUser),
          getOneSoinsInfirmier(modifSoinsInfirmierId),
        ]);

        setIsPrescripteur(!!user?.prescripteur);

        if (oneSoins) {
          setSelectedSoins(oneSoins);

          const [client, result, nomPrescripteur] = await Promise.all([
            getOneClient(oneSoins.idClient),
            getAllVisiteByIdClient(oneSoins.idClient),
            getOneUser(oneSoins.idUser ?? null),
          ]);

          setPrescripteur(nomPrescripteur?.name);
          setVisites(
            result.filter(
              (r: { id: string }) => r.id === oneSoins.idVisite,
            ),
          );
          const visiteDate = result.find(
            (r: { id: string }) => r.id === oneSoins.idVisite,
          );
          setDateVisite(visiteDate?.dateVisite);

          let allUser: SafeUser[] = [];
          if (client?.idClinique) {
            allUser = await getAllUserIncludedIdClinique(client.idClinique);
          }
          setAllPrescripteur(allUser);
          setSelectedClientId(oneSoins.idClient);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        toast.error("Erreur de chargement des données");
      }
    };

    fetchData();
  }, [modifSoinsInfirmierId, idUser, setSelectedClientId]);

  const form = useForm<SoinsInfirmier>({
    defaultValues: {
      typeSoin: "",
      observations: "",
    },
  });

  useEffect(() => {
    if (selectedSoins) {
      form.setValue("idClient", selectedSoins.idClient);
      form.setValue("idClinique", selectedSoins.idClinique);
    }
  }, [selectedSoins, form]);

  const onSubmit: SubmitHandler<SoinsInfirmier> = async (data) => {
    if (!selectedSoins) return;
    const formattedData: SoinsInfirmier = {
      ...data,
      idUser: form.getValues("idUser"),
      idClient: form.getValues("idClient"),
      idClinique: selectedSoins.idClinique,
      idVisite: form.getValues("idVisite") || selectedSoins.idVisite,
    };
    try {
      await updateSoinsInfirmier(selectedSoins.id, formattedData);
      const newIdUser = form.getValues("idUser");
      const idVisite =
        form.getValues("idVisite") || selectedSoins.idVisite;
      if (newIdUser && idVisite) {
        await updateRecapVisite(idVisite, newIdUser, "18 Fiche Soins Infirmiers");
      }
      const fresh = await getOneSoinsInfirmier(selectedSoins.id);
      if (fresh) setSelectedSoins(fresh as SoinsInfirmier);
      toast.info("Formulaire modifié avec succès!");
    } catch (error) {
      toast.error("La modification du formulaire a échoué");
      console.error("Erreur lors de la modification:", error);
    } finally {
      setIsVisible(false);
    }
  };

  const handleEdit = () => {
    if (!canUpdate(TableName.SOINS_INFIRMIER)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_UPDATE);
      return router.back();
    }
    if (selectedSoins) {
      form.setValue("idVisite", selectedSoins.idVisite);
      form.setValue("idUser", selectedSoins.idUser);
      form.setValue("typeSoin", selectedSoins.typeSoin);
      form.setValue("observations", selectedSoins.observations);
      setIsVisible(true);
    }
  };

  const renameTypeSoin = (val: string) => {
    return TAB_SOINS_INFIRMIER.find((t) => t.value === val)?.label ?? val;
  };

  return (
    <div className="w-full relative">
      <Retour />
      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {selectedSoins && (
          <ConstanteClient idVisite={selectedSoins.idVisite} />
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
                      Modifier - Soins Infirmiers
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <Form {...form}>
                      <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-3 max-w-4xl mx-auto px-4 py-4"
                      >
                        <FormField
                          control={form.control}
                          name="typeSoin"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel className="text-blue-900">
                                  Type de soin
                                </FormLabel>
                                <RefreshCw
                                  onClick={() => form.setValue("typeSoin", "")}
                                  className="hover:text-blue-600 cursor-pointer transition-all duration-200 hover:bg-slate-300 rounded-full p-1 active:scale-125"
                                />
                              </div>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  value={field.value ?? ""}
                                  className="grid grid-cols-1 gap-y-2"
                                >
                                  {TAB_SOINS_INFIRMIER.map((option) => (
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

                        <FormField
                          control={form.control}
                          name="observations"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-medium">
                                Observations
                              </FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  value={field.value ?? ""}
                                  placeholder="Détails complémentaires"
                                  rows={3}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

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
                                <FormControl>
                                  <PrescripteurFieldBlock
                                    instanceId="soins-modif-prescripteur"
                                    prescripteurs={allPrescripteur}
                                    value={field.value ?? ""}
                                    onChange={field.onChange}
                                    required
                                  />
                                </FormControl>
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
                                En cours ...
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
                {!selectedSoins ? (
                  <Card className="max-w-3xl mx-auto border-blue-200/60 shadow-sm shadow-blue-100/30">
                    <CardContent className="flex items-center justify-center py-16">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="max-w-3xl mx-auto border-blue-200/60 shadow-sm shadow-blue-100/30">
                    <CardHeader className="bg-blue-50/40 rounded-t-xl border-b border-blue-100/60 pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg font-semibold text-blue-900">
                            Soins Infirmiers
                          </CardTitle>
                          <CardDescription className="text-blue-700/60">
                            Fiche de soins infirmiers / petite chirurgie
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
                            {dateVisite ? (
                              new Date(dateVisite).toLocaleDateString("fr-FR")
                            ) : (
                              <div className="space-x-2 flex flex-row">
                                <Skeleton className="h-4 w-4 bg-slate-600" />
                                <Skeleton className="h-4 w-25 bg-slate-600" />
                              </div>
                            )}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Type de soin
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {renameTypeSoin(selectedSoins.typeSoin)}
                          </span>
                        </div>
                        {selectedSoins.observations && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Observations
                            </span>
                            <span className="col-span-2 text-sm text-gray-700 whitespace-pre-wrap">
                              {selectedSoins.observations}
                            </span>
                          </div>
                        )}
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
                      <Button onClick={handleEdit}>
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
