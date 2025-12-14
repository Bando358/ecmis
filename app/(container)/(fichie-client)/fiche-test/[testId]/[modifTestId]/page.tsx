"use client";
import { use, useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";

import { toast } from "sonner";
import {
  getAllUserIncludedIdClinique,
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
          (p: { table: string }) => p.table === TableName.TEST_GROSSESSE
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
      const oneTest = await getOneTestGrossesse(modifTestId);
      const oneUser = await getOneUser(oneTest?.testIdUser as string);
      setPrescripteur(oneUser?.name);
      setSelectedTest(oneTest as TestGrossesse);
      if (oneTest) {
        const result = await getAllVisiteByIdClient(oneTest.testIdClient);
        const visiteDate = result.find(
          (r: { id: string }) => r.id === oneTest.testIdVisite
        );

        const cliniqueClient = await getOneClient(oneTest.testIdClient);
        let allPrestataire: User[] = [];
        if (cliniqueClient?.idClinique) {
          allPrestataire = await getAllUserIncludedIdClinique(
            cliniqueClient.idClinique
          );
        }
        setAllPrescripteur(allPrestataire as User[]);

        setVisites(
          result.filter((r: { id: string }) => r.id === oneTest.testIdVisite)
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
        await updateTestGrossesse(selectedTest.id, formattedData);
        const oneTest = await getOneTestGrossesse(modifTestId);
        if (oneTest) {
          setSelectedTest(oneTest as TestGrossesse);
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
        "Vous n'avez pas la permission de modifier un TEST. Contactez un administrateur."
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
    <div className="flex flex-col w-full justify-center max-w-250 mx-auto px-4 py-2 border rounded-md">
      {selectedTest && <ConstanteClient idVisite={selectedTest.testIdVisite} />}
      {isVisible ? (
        <>
          <h2 className="text-2xl text-gray-600 font-black text-center">
            {`Formulaire de modification de Test de Grossesse`}
          </h2>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-2 max-w-225 rounded-sm mx-auto px-4 py-2 bg-white shadow-md"
            >
              <div className="my-2 px-4 py-2 shadow-md border rounded-md ">
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
                        <Input {...field} value={idUser} className="hidden" />
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
                          {allPrescripteur.map((prescripteur, index) => (
                            <SelectItem key={index} value={prescripteur.id}>
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

              <Button type="submit" className="mt-4">
                {form.formState.isSubmitting ? "En cours..." : "Appliquer"}
              </Button>
            </form>
          </Form>
        </>
      ) : (
        <div className="flex flex-col gap-2 max-w-md mx-auto">
          {!selectedTest ? (
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-62.5" />
                <Skeleton className="h-4 w-50" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>{selectedTest && <span>Date de visite : </span>}</div>
              <div>
                {dateVisite && new Date(dateVisite).toLocaleDateString("fr-FR")}
              </div>
              <div>
                {selectedTest && selectedTest.testResultat !== null && (
                  <span>Résulat Test</span>
                )}
              </div>
              <div>
                {selectedTest && selectedTest.testResultat !== null && (
                  <span>{renameValue(selectedTest.testResultat, TabTest)}</span>
                )}
              </div>
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
