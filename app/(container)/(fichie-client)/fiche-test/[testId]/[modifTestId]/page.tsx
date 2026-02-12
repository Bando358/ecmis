"use client";
import { use, useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";

import { toast } from "sonner";
import {
  getAllUser,
  getAllUserIncludedIdClinique,
  getAllUserIncludedTabIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import {
  getOneTestGrossesse,
  updateTestGrossesse,
} from "@/lib/actions/testActions";
import { useSession } from "next-auth/react";
import {
  User,
  TestGrossesse,
  Visite,
  Permission,
  TableName,
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

const TabTest = [
  { value: "positif", label: "Positif" },
  { value: "negatif", label: "Négatif" },
];
// modifTestId
export default function GynecoPage({
  params,
}: {
  params: Promise<{ modifTestId: string }>;
}) {
  const { modifTestId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [selectedTest, setSelectedTest] = useState<TestGrossesse>();

  const [dateVisite, setDateVisite] = useState<Date>();
  const [prescripteur, setPrescripteur] = useState<string>();
  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
  const [onePrescripteur, setOnePrescripteur] = useState<User>();
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();
  const [isVisible, setIsVisible] = useState(false);
  const [permission, setPermission] = useState<Permission | null>(null);

  const { setSelectedClientId } = useClientContext();
  // setSelectedClientId(params.infertiliteId);

  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const form = useForm<TestGrossesse>();
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
          (p: { table: string }) => p.table === TableName.TEST_GROSSESSE,
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
      const oneTest = await getOneTestGrossesse(modifTestId);
      const oneUser = await getOneUser(oneTest?.testIdUser as string);

      setPrescripteur(oneUser?.name);
      setSelectedTest(oneTest as TestGrossesse);
      if (oneTest) {
        const result = await getAllVisiteByIdClient(oneTest.testIdClient);
        const visiteDate = result.find(
          (r: { id: string }) => r.id === oneTest.testIdVisite,
        );

        const cliniqueClient = await getOneClient(oneTest.testIdClient);
        let allPrestataire: User[] = [];
        if (cliniqueClient?.idClinique) {
          allPrestataire = await getAllUserIncludedIdClinique(
            cliniqueClient.idClinique,
          );
        }
        setAllPrescripteur(allPrestataire as User[]);

        setVisites(
          result.filter((r: { id: string }) => r.id === oneTest.testIdVisite),
        ); // Use oneTest instead of selectedTest
        setDateVisite(visiteDate?.dateVisite);
        setSelectedClientId(oneTest.testIdClient); // Use oneTest instead of selectedTest
      }
    };
    fetchData();
  }, [modifTestId, setSelectedClientId]);

  // Fonction pour récupérer et définir l'état IMC

  const onSubmit: SubmitHandler<TestGrossesse> = async (data) => {
    const formattedData = {
      ...data,
      testIdUser: form.getValues("testIdUser"),
      testIdClient: form.getValues("testIdClient"),
      testIdVisite: form.getValues("testIdVisite"),
      testIdClinique: selectedTest?.testIdClinique || "",
    };
    try {
      if (selectedTest) {
        console.log(formattedData);
        const result = await updateTestGrossesse(
          selectedTest.id,
          formattedData,
        );
        if (result) {
          setSelectedTest(result as TestGrossesse);
        }
      }
      toast.info("Formulaire modifiée avec succès! 🎉");
    } catch (error) {
      toast.error("La modification test de Grossesse a échoué");
      console.error("Erreur lors de la modification test de Grossesse:", error);
    } finally {
      setIsVisible(false);
    }
  };

  const handleUpdateVisite = async () => {
    if (!permission?.canUpdate && onePrescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de modifier un TEST. Contactez un administrateur.",
      );
      return router.back();
    }
    if (selectedTest) {
      form.setValue("testIdVisite", selectedTest.testIdVisite);
      form.setValue("testIdClient", selectedTest.testIdClient);
      form.setValue("testIdUser", selectedTest.testIdUser);
      form.setValue("testResultat", selectedTest.testResultat);

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
        {selectedTest && (
          <ConstanteClient idVisite={selectedTest.testIdVisite} />
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
                      Modifier - Test de Grossesse
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
                            name="testIdVisite"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Selectionnez la visite</FormLabel>
                                <Select required onValueChange={field.onChange}>
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
                          <Separator className="my-4" />
                          <FormField
                            control={form.control}
                            name="testResultat"
                            render={({ field }) => (
                              <FormItem className="  pb-4">
                                <div className="text-xl font-bold flex justify-between items-center">
                                  <FormLabel className="ml-4">
                                    Résultat test de grossesse :
                                  </FormLabel>
                                </div>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value ?? ""}
                                    className="gap-x-5 items-center grid-cols-3"
                                  >
                                    {TabTest.map((option) => (
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
                          name="testIdClient"
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
                            name="testIdUser"
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
                            name="testIdUser"
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
                {!selectedTest ? (
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
                            Test de Grossesse
                          </CardTitle>
                          <CardDescription className="text-blue-700/60">
                            Fiche de test de grossesse
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

                        {selectedTest.testResultat !== null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Résultat Test
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {renameValue(selectedTest.testResultat, TabTest)}
                            </span>
                          </div>
                        )}

                        {prescripteur && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Prescripteur
                            </span>
                            <span className="col-span-2 text-sm text-gray-700 italic">
                              {
                                allPrescripteur.find(
                                  (p) => p.id === selectedTest?.testIdUser,
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
