"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
// import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import { updateRecapVisite } from "@/lib/actions/recapActions";
import {
  getAllTestGrossesseByIdClient,
  createTestGrossesse,
} from "@/lib/actions/testActions";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { useSession } from "next-auth/react";
import { User, TestGrossesse, Visite, TableName, Client } from "@prisma/client";
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
import { getOneClient } from "@/lib/actions/clientActions";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import Retour from "@/components/retour";

const TabTest = [
  { value: "positif", label: "Positif" },
  { value: "negatif", label: "Négatif" },
];
// testId
export default function GynecoPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [selectedTest, setSelectedTest] = useState<TestGrossesse[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
  const [prescripteur, setPrescripteur] = useState<User>();
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>(false);
  const [client, setClient] = useState<Client | null>(null);

  const { canCreate } = usePermissionContext();

  const { data: session } = useSession();
  const form = useForm<TestGrossesse>();
  const testIdUser = session?.user?.id ?? "";
  // When session becomes available, ensure the form field is populated so the input is controlled
  useEffect(() => {
    if (testIdUser) {
      form.setValue("testIdUser", testIdUser);
    }
  }, [testIdUser, form]);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Chargement initial optimisé : requêtes en parallèle
  useEffect(() => {
    if (!testIdUser || !testId) return;

    const fetchAllData = async () => {
      try {
        // Wave 1: toutes les requêtes indépendantes en parallèle
        const [user, resultTest, resultVisites, cliniqueClient] = await Promise.all([
          getOneUser(testIdUser),
          getAllTestGrossesseByIdClient(testId),
          getAllVisiteByIdClient(testId),
          getOneClient(testId),
        ]);

        setIsPrescripteur(user?.prescripteur ? true : false);
        setPrescripteur(user!);
        setSelectedTest(resultTest as TestGrossesse[]);
        setVisites(resultVisites as Visite[]);
        setClient(cliniqueClient);

        // Wave 2: requête dépendante du client
        let allPrestataire: User[] = [];
        if (cliniqueClient?.idClinique) {
          allPrestataire = await getAllUserIncludedIdClinique(
            cliniqueClient.idClinique
          );
        }
        setAllPrescripteur(allPrestataire as User[]);
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
      }
    };
    fetchAllData();
  }, [testIdUser, testId]);

  useEffect(() => {
    form.setValue("testIdClient", testId);
  }, [testId, form]);

  // Fonction pour récupérer et définir l'état IMC

  const onSubmit: SubmitHandler<TestGrossesse> = async (data) => {
    if (!canCreate(TableName.TEST_GROSSESSE)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }
    const formattedData = {
      ...data,
      testIdUser: form.getValues("testIdUser"),
      testIdClient: form.getValues("testIdClient"),
      testIdVisite: form.getValues("testIdVisite"),
      testIdClinique: client?.idClinique || "",
    };
    console.log("formattedData : ", formattedData);
    try {
      await createTestGrossesse(formattedData);
      await updateRecapVisite(
        form.watch("testIdVisite"),
        form.watch("testIdUser"),
        "07 Fiche Test TBG"
      );
      toast.success("Formulaire créer avec succès! 🎉");
      router.push(`/fiches/${testId}`);
    } catch (error) {
      toast.error("La création de la Grossesse a échoué");
      console.error("Erreur lors de la création de la Grossesse:", error);
    }
  };

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-600">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="w-full relative">
      <Retour />
      <div className="flex flex-col justify-center max-w-4xl mx-auto px-4 py-2 border border-blue-200/60 rounded-md">
        <ConstanteClient idVisite={form.watch("testIdVisite")} />
        <h2 className="text-2xl text-blue-900 font-black text-center">
          {`Formulaire de Test de Grossesse`}
        </h2>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-2 max-w-225 rounded-sm mx-auto px-4 py-2 bg-white border border-blue-200/50 shadow-md shadow-blue-100/30"
          >
            <div className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md">
              <FormField
                control={form.control}
                name="testIdVisite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selectionnez la visite</FormLabel>
                    <Select required onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Visite à sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {visites.map((visite) => {
                          const dateStr = new Date(
                            visite.dateVisite
                          ).toLocaleDateString("fr-FR", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          });
                          return (
                            <SelectItem
                              key={visite.id}
                              value={visite.id}
                              disabled={selectedTest.some(
                                (p) => p.testIdVisite === visite.id
                              )}
                            >
                              {dateStr}
                            </SelectItem>
                          );
                        })}
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
                        value={
                          typeof field.value === "string" ? field.value : ""
                        }
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
                      {/* Hidden controlled input. value is stable string to avoid uncontrolled->controlled warning */}
                      <Input {...field} value={testIdUser} className="hidden" />
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

            <Button
              type="submit"
              className="mt-4 mx-auto block"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "En cours..." : "Soumettre"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
