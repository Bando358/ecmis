"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
// import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getAllUserIncludedIdClinique } from "@/lib/actions/authActions";
import { updateRecapVisite } from "@/lib/actions/recapActions";
import {
  getAllTestGrossesseByIdClient,
  createTestGrossesse,
} from "@/lib/actions/testActions";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { useSession } from "next-auth/react";
import {
  User,
  TestGrossesse,
  Visite,
  Permission,
  TableName,
  Client,
} from "@/lib/generated/prisma";
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
import { getUserPermissionsById } from "@/lib/actions/permissionActions";

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

  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();
  const [permission, setPermission] = useState<Permission | null>(null);
  const [client, setClient] = useState<Client | null>(null);

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
    const prescripteur = session?.user.prescripteur;
    if (prescripteur != undefined) {
      setIsPrescripteur(prescripteur);
    }
  }, [session]);

  useEffect(() => {
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!session?.user) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(session.user.id);
        const perm = permissions.find(
          (p) => p.table === TableName.TEST_GROSSESSE
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
  }, [session?.user, router]);

  useEffect(() => {
    const fetchData = async () => {
      const resultCpon = await getAllTestGrossesseByIdClient(testId);
      setSelectedTest(resultCpon as TestGrossesse[]); // Assurez-vous que result est bien de type CliniqueData[]
      const result = await getAllVisiteByIdClient(testId);
      setVisites(result as Visite[]); // Assurez-vous que result est bien de type CliniqueData[]

      const cliniqueClient = await getOneClient(testId);
      setClient(cliniqueClient);
      let allPrestataire: User[] = [];
      if (cliniqueClient?.idClinique) {
        allPrestataire = await getAllUserIncludedIdClinique(
          cliniqueClient.idClinique
        );
      }
      setAllPrescripteur(allPrestataire as User[]);
    };
    fetchData();
  }, [testId]);

  useEffect(() => {
    form.setValue("testIdClient", testId);
  }, [testId, form]);

  // Fonction pour récupérer et définir l'état IMC

  const onSubmit: SubmitHandler<TestGrossesse> = async (data) => {
    if (!permission?.canCreate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de créer un TEST. Contactez un administrateur."
      );
      return router.back();
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

  return (
    <div className="flex flex-col w-full justify-center max-w-[1000px] mx-auto px-4 py-2 border rounded-md">
      <ConstanteClient idVisite={form.getValues("testIdVisite")} />
      <h2 className="text-2xl text-gray-600 font-black text-center">
        {`Formulaire de Test de Grossesse`}
      </h2>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-2 max-w-[900px] rounded-sm mx-auto px-4 py-2 bg-white shadow-md"
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
                        <SelectValue placeholder="Visite à sélectionner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {visites.map((visite) => (
                        <SelectItem
                          key={visite.id}
                          value={visite.id}
                          disabled={selectedTest.some(
                            (p) => p.testIdVisite === visite.id
                          )}
                        >
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
                      value={typeof field.value === "string" ? field.value : ""}
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

          <Button type="submit" className="mt-4">
            {form.formState.isSubmitting ? "En cours..." : "Soumettre"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
