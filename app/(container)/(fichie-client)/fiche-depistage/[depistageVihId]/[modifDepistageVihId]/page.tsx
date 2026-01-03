"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { useClientContext } from "@/components/ClientContext";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import {
  getOneDepistageVih,
  updateDepistageVih,
} from "@/lib/actions/depistageVihActions";
import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import { useSession } from "next-auth/react";
import {
  DepistageVih,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckedFalse, CheckedTrue } from "@/components/checkedTrue";
import { getOneClient } from "@/lib/actions/clientActions";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";

const tabTypeClient = [
  { value: "cdip", label: "CDIP" },
  { value: "ptme", label: "PTME" },
  { value: "ist", label: "IST" },
  { value: "enfantMerePos", label: "Enfant de mère positive" },
  { value: "conjointPos", label: "Conjoint positif" },
  { value: "autre", label: "Autre" },
];

const TabResultatVih = [
  { value: "negatif", label: "Négatif" },
  { value: "positif", label: "Positif" },
  { value: "indetermine", label: "Indéterminé" },
];

type Option = {
  value: string;
  label: string;
};

// Composant pour les champs conditionnels de résultat et counselling
const ConditionalResultFields = ({
  form,
}: {
  form: UseFormReturn<DepistageVih>;
}) => {
  const showResultFields = form.watch("depistageVihInvestigationTestRapide");

  return (
    <div
      className={`transition-all duration-300 ease-in-out overflow-hidden ${
        showResultFields ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <div className="pt-2">
        <FormField
          control={form.control}
          name="depistageVihResultat"
          render={({ field }) => (
            <FormItem className="pt-4 pb-2">
              <div className="text-xl font-bold flex justify-between items-center">
                <FormLabel className="ml-4">Résultat du test VIH :</FormLabel>
                <RefreshCw
                  onClick={() => {
                    form.setValue("depistageVihResultat", "");
                  }}
                  className="hover:text-blue-600 transition-all duration-200 hover:bg-slate-300 rounded-full p-1 active:scale-125 cursor-pointer"
                />
              </div>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value ?? ""}
                  className="flex gap-x-5 items-center"
                >
                  {TabResultatVih.map((option) => (
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
          name="depistageVihCounsellingPostTest"
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
                  Counselling post-test
                </FormLabel>
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

// Composant pour les champs conditionnels de counselling supplémentaire
const ConditionalCounsellingFields = ({
  form,
}: {
  form: UseFormReturn<DepistageVih>;
}) => {
  const showCounsellingFields =
    form.watch("depistageVihCounsellingPostTest") &&
    form.watch("depistageVihResultat") === "positif";

  return (
    <div
      className={`transition-all duration-300 ease-in-out overflow-hidden ${
        showCounsellingFields ? "max-h-52 opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <div className="pt-2">
        <FormField
          control={form.control}
          name="depistageVihCounsellingReductionRisque"
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
                  Counselling de réduction des risques
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="depistageVihCounsellingSoutienPsychoSocial"
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
                  Counselling de soutien psychosocial
                </FormLabel>
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default function ModifDepistageVihPage({
  params,
}: {
  params: Promise<{ modifDepistageVihId: string }>;
}) {
  const { modifDepistageVihId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [selectedDepistageVih, setSelectedDepistageVih] =
    useState<DepistageVih>();
  const [dateVisite, setDateVisite] = useState<Date>();
  const [prescripteur, setPrescripteur] = useState<string>();
  const [onePrescripteur, setOnePrescripteur] = useState<User>();
  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
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
          (p: { table: string }) => p.table === TableName.DEPISTAGE_VIH
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
  }, [onePrescripteur, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const oneDepistageVih = await getOneDepistageVih(modifDepistageVihId);
        setSelectedDepistageVih(oneDepistageVih as DepistageVih);

        let allPrestataire: User[] = [];

        if (oneDepistageVih?.depistageVihIdClient) {
          const cliniqueClient = await getOneClient(
            oneDepistageVih.depistageVihIdClient
          );

          if (cliniqueClient?.idClinique) {
            allPrestataire = await getAllUserIncludedIdClinique(
              cliniqueClient.idClinique
            );
          }
        }

        setAllPrescripteur(allPrestataire);
      } catch (err) {
        console.error("Erreur chargement prescripteurs:", err);
      }
    };

    fetchData();
  }, [modifDepistageVihId]);

  useEffect(() => {
    const fetchData = async () => {
      if (selectedDepistageVih) {
        const result = await getAllVisiteByIdClient(
          selectedDepistageVih.depistageVihIdClient
        );
        const visiteDate = result.find(
          (r: { id: string }) =>
            r.id === selectedDepistageVih.depistageVihIdVisite
        );

        const nomPrescripteur = await getOneUser(
          selectedDepistageVih.depistageVihIdUser
        );
        const nomP = nomPrescripteur?.name;
        setPrescripteur(nomP);

        setVisites(
          result.filter(
            (r: { id: string }) =>
              r.id === selectedDepistageVih.depistageVihIdVisite
          )
        );
        setDateVisite(visiteDate?.dateVisite);
        setSelectedClientId(selectedDepistageVih.depistageVihIdClient);
      }
    };
    fetchData();
  }, [selectedDepistageVih, setSelectedClientId]);

  const form = useForm<DepistageVih>();

  const onSubmit: SubmitHandler<DepistageVih> = async (data) => {
    const formattedData = {
      ...data,
      depistageVihIdUser: form.getValues("depistageVihIdUser"),
      depistageVihIdClient: form.getValues("depistageVihIdClient"),
      depistageVihIdVisite: form.getValues("depistageVihIdVisite"),
      depistageVihTypeClient: form.getValues("depistageVihTypeClient"),
      depistageVihResultat: form.getValues("depistageVihResultat"),
      depistageVihIdClinique:
        selectedDepistageVih?.depistageVihIdClinique ?? "",
    };

    try {
      if (selectedDepistageVih) {
        await updateDepistageVih(selectedDepistageVih.id, formattedData);
        const oneDepistageVih = await getOneDepistageVih(modifDepistageVihId);
        if (oneDepistageVih) {
          setSelectedDepistageVih(oneDepistageVih as DepistageVih);
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

  const renameResultat = (val: string, tab: Option[]) => {
    const newVal = tab.find((t) => t.value === val);
    return newVal?.label;
  };

  const handleUpdateVisite = async () => {
    if (!permission?.canUpdate && onePrescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de modifier un dépistage VIH. Contactez un administrateur."
      );
      return router.back();
    }
    if (selectedDepistageVih) {
      form.setValue(
        "depistageVihIdVisite",
        selectedDepistageVih.depistageVihIdVisite
      );
      form.setValue(
        "depistageVihIdUser",
        selectedDepistageVih.depistageVihIdUser
      );
      form.setValue(
        "depistageVihIdClient",
        selectedDepistageVih.depistageVihIdClient
      );
      form.setValue(
        "depistageVihTypeClient",
        selectedDepistageVih.depistageVihTypeClient
      );
      form.setValue(
        "depistageVihConsultation",
        selectedDepistageVih.depistageVihConsultation
      );
      form.setValue(
        "depistageVihCounsellingPreTest",
        selectedDepistageVih.depistageVihCounsellingPreTest
      );
      form.setValue(
        "depistageVihInvestigationTestRapide",
        selectedDepistageVih.depistageVihInvestigationTestRapide
      );
      form.setValue(
        "depistageVihResultat",
        selectedDepistageVih.depistageVihResultat
      );
      form.setValue(
        "depistageVihCounsellingPostTest",
        selectedDepistageVih.depistageVihCounsellingPostTest
      );
      form.setValue(
        "depistageVihCounsellingReductionRisque",
        selectedDepistageVih.depistageVihCounsellingReductionRisque
      );
      form.setValue(
        "depistageVihCounsellingSoutienPsychoSocial",
        selectedDepistageVih.depistageVihCounsellingSoutienPsychoSocial
      );
      setIsVisible(true);
    }
  };

  return (
    <div className="flex flex-col w-full justify-center max-w-4xl mx-auto px-4 py-2 border rounded-md">
      {selectedDepistageVih && (
        <ConstanteClient idVisite={selectedDepistageVih.depistageVihIdVisite} />
      )}
      {isVisible ? (
        <>
          <h2 className="text-2xl text-gray-600 font-black text-center">
            Formulaire de modification de Dépistage VIH
          </h2>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-2 max-w-4xl rounded-sm mx-auto px-4 py-2 bg-white shadow-md"
            >
              <FormField
                control={form.control}
                name="depistageVihIdVisite"
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

              <FormField
                control={form.control}
                name="depistageVihTypeClient"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">
                      Type de client
                    </FormLabel>
                    <Select
                      required
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionnez le type de client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tabTypeClient.map((option, index) => (
                          <SelectItem key={index} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="my-2 shadow-md border rounded-md p-4 transition-all duration-300">
                <FormField
                  control={form.control}
                  name="depistageVihConsultation"
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
                          Consultation
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="depistageVihCounsellingPreTest"
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
                          Counselling pré-test
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="depistageVihInvestigationTestRapide"
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
                          Investigation par test rapide
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Champs conditionnels de résultat avec transition */}
                <ConditionalResultFields form={form} />

                {/* Champs conditionnels de counselling supplémentaire avec transition */}
                <ConditionalCounsellingFields form={form} />
              </div>

              <FormField
                control={form.control}
                name="depistageVihIdClient"
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
                  name="depistageVihIdUser"
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
                  name="depistageVihIdUser"
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
              <div className="flex flex-row  justify-center items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsVisible(false)}
                  disabled={form.formState.isSubmitting}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "En cours..." : "Appliquer"}
                </Button>
              </div>
            </form>
          </Form>
        </>
      ) : (
        <div className="flex flex-col gap-2 max-w-md mx-auto">
          {!selectedDepistageVih ? (
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-62.5" />
                <Skeleton className="h-4 w-50" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                {selectedDepistageVih && <span>Date de visite : </span>}
              </div>
              <div>
                {dateVisite && new Date(dateVisite).toLocaleDateString("fr-FR")}
              </div>

              <div>
                {selectedDepistageVih && <span>Type de client : </span>}
              </div>
              <div>
                {selectedDepistageVih && (
                  <span>
                    {renameTypeClient(
                      selectedDepistageVih.depistageVihTypeClient,
                      tabTypeClient
                    )}
                  </span>
                )}
              </div>

              <div>{selectedDepistageVih && <span>Consultation : </span>}</div>
              <div>
                {selectedDepistageVih && (
                  <span>
                    {selectedDepistageVih.depistageVihConsultation ? (
                      <CheckedTrue />
                    ) : (
                      <CheckedFalse />
                    )}
                  </span>
                )}
              </div>

              <div>
                {selectedDepistageVih && <span>Counselling pré-test : </span>}
              </div>
              <div>
                {selectedDepistageVih && (
                  <span>
                    {selectedDepistageVih.depistageVihCounsellingPreTest ? (
                      <CheckedTrue />
                    ) : (
                      <CheckedFalse />
                    )}
                  </span>
                )}
              </div>

              <div>{selectedDepistageVih && <span>Test rapide : </span>}</div>
              <div>
                {selectedDepistageVih && (
                  <span>
                    {selectedDepistageVih.depistageVihInvestigationTestRapide ? (
                      <CheckedTrue />
                    ) : (
                      <CheckedFalse />
                    )}
                  </span>
                )}
              </div>

              {selectedDepistageVih.depistageVihInvestigationTestRapide && (
                <>
                  <div>{selectedDepistageVih && <span>Résultat : </span>}</div>
                  <div>
                    {selectedDepistageVih && (
                      <span>
                        {renameResultat(
                          selectedDepistageVih.depistageVihResultat,
                          TabResultatVih
                        )}
                      </span>
                    )}
                  </div>

                  <div>
                    {selectedDepistageVih && (
                      <span>Counselling post-test : </span>
                    )}
                  </div>
                  <div>
                    {selectedDepistageVih && (
                      <span>
                        {selectedDepistageVih.depistageVihCounsellingPostTest ? (
                          <CheckedTrue />
                        ) : (
                          <CheckedFalse />
                        )}
                      </span>
                    )}
                  </div>

                  {selectedDepistageVih.depistageVihResultat === "positif" && (
                    <>
                      <div>
                        {selectedDepistageVih && (
                          <span>Réduction risques : </span>
                        )}
                      </div>
                      <div>
                        {selectedDepistageVih && (
                          <span>
                            {selectedDepistageVih.depistageVihCounsellingReductionRisque ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        )}
                      </div>

                      <div>
                        {selectedDepistageVih && (
                          <span>Soutien psychosocial : </span>
                        )}
                      </div>
                      <div>
                        {selectedDepistageVih && (
                          <span>
                            {selectedDepistageVih.depistageVihCounsellingSoutienPsychoSocial ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}

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

              <div className="col-span-2 flex flex-row justify-center mt-6 gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Retour
                </Button>
                <Button onClick={handleUpdateVisite}>Modifier</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
