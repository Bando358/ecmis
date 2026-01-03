"use client";
import { use, useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { useClientContext } from "@/components/ClientContext";
import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";

import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { getOneIst, updateIst } from "@/lib/actions/istActions";

import { useSession } from "next-auth/react";
import { Ist, Permission, TableName, User, Visite } from "@prisma/client";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckedFalse, CheckedTrue } from "@/components/checkedTrue";
import { getOneClient } from "@/lib/actions/clientActions";
import { useRouter } from "next/navigation";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
// import { Separator } from "@/components/ui/separator";

const tabTypePec = [
  { value: "candidose", label: "Pec Etiologique - Candidose" },
  { value: "chancreMou", label: "Pec Etiologique - Chancre Mou" },
  { value: "chlamydiose", label: "Pec Etiologique - Chlamydiose" },
  { value: "herpesSimplex", label: "Pec Etiologique - Herpes Simplex" },
  { value: "syphilis", label: "Pec Etiologique - Syphilis" },
  { value: "autres", label: "Pec Etiologique - Autres" },
];

const TabTypeIst = [
  { value: "ecoulementVaginal", label: "Ecoulement Vaginal" },
  { value: "ecoulementUretral", label: "Ecoulement Urétral" },
  { value: "douleursTesticulaires", label: "Douleurs Testiculaires" },
  { value: "douleursAbdominales", label: "Douleurs Abdominales Basses" },
  { value: "ulceration", label: "Ulcération Génitale" },
  { value: "bubon", label: "Bubon Inguinal" },
  { value: "cervicite", label: "Cervicite" },
  { value: "conjonctivite", label: "Conjonctivite du nouveau-né" },
  { value: "condylome", label: "Condylome (Végétation vénérienne)" },

  { value: "brulureOuPrurit", label: "Brûlure ou Prurit" },
  { value: "malOdeurVaginal", label: "Mauvaise Odeur Vaginale" },
  { value: "autres", label: "Autres IST" },
];
const TabTypeClient = [
  { value: "cpn", label: "Femme Enceinte" },
  { value: "pvvih", label: "PVVIH" },
  { value: "autres", label: "AUTRES" },
];
const TabTypePec = [
  { value: "syndromique", label: "Syndromique" },
  { value: "etiologique", label: "Etiologique" },
];
type Option = {
  value: string;
  label: string;
};

export default function IstPage({
  params,
}: {
  params: Promise<{ istId: string; modifIstId: string }>;
}) {
  const { modifIstId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [selectedIst, setSelectedIst] = useState<Ist>();

  const [dateVisite, setDateVisite] = useState<Date>();
  const [prescripteur, setPrescripteur] = useState<string>();
  const [onePrescripteur, setOnePrescripteur] = useState<User>();
  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
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
          (p: { table: string }) => p.table === TableName.IST
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
      try {
        const oneIst = await getOneIst(modifIstId);
        setSelectedIst(oneIst as Ist);

        let allPrestataire: User[] = [];

        if (oneIst?.istIdClient) {
          const cliniqueClient = await getOneClient(oneIst.istIdClient);

          if (cliniqueClient?.idClinique) {
            allPrestataire = await getAllUserIncludedIdClinique(
              cliniqueClient.idClinique
            );
          }
        }

        setAllPrescripteur(allPrestataire);
        console.log("allPrestataire ", allPrestataire);
      } catch (err) {
        console.error("Erreur chargement prescripteurs:", err);
      }
    };

    fetchData();
  }, [modifIstId]); // ✅ plus propre

  useEffect(() => {
    const fetchData = async () => {
      if (selectedIst) {
        const result = await getAllVisiteByIdClient(selectedIst.istIdClient);
        const visiteDate = result.find(
          (r: { id: string }) => r.id === selectedIst.istIdVisite
        );

        const nomPrescripteur = await getOneUser(selectedIst.istIdUser);
        setPrescripteur(nomPrescripteur?.name);

        setVisites(
          result.filter((r: { id: string }) => r.id === selectedIst.istIdVisite)
        ); // Assurez-vous que result est bien de type CliniqueData[]
        setDateVisite(visiteDate?.dateVisite);
        // const clientData = await getOneClient(selectedGyneco.idClient);
        setSelectedClientId(selectedIst.istIdClient);
      }
    };
    fetchData();
  }, [selectedIst, setSelectedClientId]);
  // console.log(visites);

  const form = useForm<Ist>();
  const onSubmit: SubmitHandler<Ist> = async (data) => {
    if (!permission?.canUpdate && onePrescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de modifier une IST. Contactez un administrateur."
      );
      return router.back();
    }
    const formattedData = {
      ...data,
      istIdUser: form.getValues("istIdUser"),
      istIdVisite: form.getValues("istIdVisite"),
      istIdClient: form.getValues("istIdClient"),
      istPecEtiologique:
        form.getValues("istTypePec") === "syndromique"
          ? ""
          : form.getValues("istPecEtiologique"),
    };
    try {
      if (selectedIst) {
        console.log(formattedData);
        await updateIst(selectedIst.id, formattedData);
        const oneIst = await getOneIst(modifIstId);
        if (oneIst) {
          setSelectedIst(oneIst as Ist);
        }
      }
      toast.info("Formulaire modifiée avec succès! 🎉");
    } catch (error) {
      toast.error("La création du formulaire a échoué");
      console.error("Erreur lors de la modification de Ist:", error);
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
        "Vous n'avez pas la permission de modifier une IST. Contactez un administrateur."
      );
      return router.back();
    }
    if (selectedIst) {
      form.setValue("istIdVisite", selectedIst.istIdVisite);
      form.setValue("istIdClient", selectedIst.istIdClient);
      form.setValue("istIdUser", selectedIst.istIdUser);
      form.setValue(
        "istCounselingReductionRisque",
        selectedIst.istCounselingReductionRisque
      );
      form.setValue(
        "istCounsellingApresDepitage",
        selectedIst.istCounsellingApresDepitage
      );
      form.setValue(
        "istCounsellingAvantDepitage",
        selectedIst.istCounsellingAvantDepitage
      );
      // form.setValue("pecEtiologique", selectedIst.pecEtiologique);
      form.setValue("istExamenPhysique", selectedIst.istExamenPhysique);
      form.setValue("istTypeClient", selectedIst.istTypeClient);
      form.setValue("istType", selectedIst.istType);
      form.setValue("istTypePec", selectedIst.istTypePec);
      setIsVisible(true);
    }
  };

  return (
    <div className="flex flex-col w-full justify-center max-w-3xl mx-auto px-4 py-2 border rounded-md">
      {selectedIst && <ConstanteClient idVisite={selectedIst.istIdVisite} />}
      {isVisible ? (
        <>
          <h2 className="text-2xl text-gray-600 font-black text-center">
            {"Formulaire de Modification d'Ist"}
          </h2>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-2 max-w-4xl rounded-sm mx-auto px-4 py-2 bg-white shadow-md"
            >
              <FormField
                control={form.control}
                name="istIdVisite"
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

              {/* ************************* */}
              <div className="my-2 p-3 shadow-md border rounded-md ">
                <FormField
                  control={form.control}
                  name="istTypeClient"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">
                        Selectionnez le type de client
                      </FormLabel>
                      <Select required onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Type à sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TabTypeClient.map((option, index) => (
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
                <Separator className="my-3" />
                <FormField
                  control={form.control}
                  name="istType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">
                        Selectionnez le type de Ist
                      </FormLabel>
                      <Select required onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Type à sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TabTypeIst.map((option, index) => (
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
              </div>
              <div className="my-2 shadow-md border rounded-md ">
                <FormField
                  control={form.control}
                  name="istCounsellingAvantDepitage"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md px-4 py-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">
                          Counselling Avant dépistage ist
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="istExamenPhysique"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md px-4 py-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">
                          Exament Physique
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="istCounsellingApresDepitage"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md px-4 py-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">
                          Counselling Après dépistage ist
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                {/* <Separator /> */}
                <FormField
                  control={form.control}
                  name="istCounselingReductionRisque"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md px-4 py-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">
                          Counseling Réduction du risque
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="istTypePec"
                  render={({ field }) => (
                    <FormItem className=" px-4 pb-4">
                      <div className="text-xl font-bold flex justify-between items-center">
                        <FormLabel className="ml-4">
                          Type de traitement IST:
                        </FormLabel>
                        <RefreshCw
                          onClick={() => {
                            form.setValue("istTypePec", "");
                          }}
                          className="hover:text-blue-600 transition-all duration-200 hover:bg-slate-300 rounded-full p-1 active:scale-125"
                        />
                      </div>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value ?? ""}
                          className="flex gap-x-5 items-center"
                        >
                          {TabTypePec.map((option) => (
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

                {form.watch("istTypePec") === "etiologique" && (
                  <FormField
                    control={form.control}
                    name="istPecEtiologique"
                    render={({ field }) => (
                      <FormItem className="mx-6 mb-3 outline-red-500">
                        <FormLabel className="font-medium">
                          Selectionnez le type de PEC
                        </FormLabel>
                        <Select onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Traitement à sélectionner ....." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tabTypePec.map((option, index) => (
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
                )}
              </div>
              <FormField
                control={form.control}
                name="istIdClient"
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
                  name="istIdUser"
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
                  name="istIdUser"
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
                          {allPrescripteur.map((prescipteur, index) => (
                            <SelectItem key={index} value={prescipteur.id}>
                              <span>{prescipteur.name}</span>
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
          {!selectedIst ? (
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-62.5" />
                <Skeleton className="h-4 w-50" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>{selectedIst && <span>Date de visite : </span>}</div>
              <div>
                {dateVisite && new Date(dateVisite).toLocaleDateString("fr-FR")}
              </div>
              <div>
                {selectedIst && selectedIst.istTypeClient !== null && (
                  <span>Type Client : </span>
                )}
              </div>
              <div>
                {selectedIst && selectedIst.istTypeClient !== null && (
                  <span>
                    {renameValue(selectedIst.istTypeClient, TabTypeClient)}
                  </span>
                )}
              </div>
              <div>
                {selectedIst && selectedIst.istType !== null && (
                  <span>Type Ist : </span>
                )}
              </div>
              <div>
                {selectedIst && selectedIst.istType !== null && (
                  <span>{renameValue(selectedIst.istType, TabTypeIst)}</span>
                )}
              </div>

              <div>
                {selectedIst && selectedIst.istCounsellingAvantDepitage && (
                  <span>Counselling Avant dépistage : </span>
                )}
              </div>
              <div>
                {selectedIst && selectedIst.istCounsellingAvantDepitage && (
                  <span>
                    {selectedIst.istCounsellingAvantDepitage ? (
                      <CheckedTrue />
                    ) : (
                      <CheckedFalse />
                    )}
                  </span>
                )}
              </div>
              <div>
                {selectedIst && selectedIst.istExamenPhysique && (
                  <span>Examen Physique : </span>
                )}
              </div>
              <div>
                {selectedIst && selectedIst.istExamenPhysique && (
                  <span>
                    {selectedIst.istExamenPhysique ? (
                      <CheckedTrue />
                    ) : (
                      <CheckedFalse />
                    )}
                  </span>
                )}
              </div>
              <div>
                {selectedIst && selectedIst.istCounsellingApresDepitage && (
                  <span>Counselling Après dépistage : </span>
                )}
              </div>
              <div>
                {selectedIst && selectedIst.istCounsellingApresDepitage && (
                  <span>
                    {selectedIst.istCounsellingApresDepitage ? (
                      <CheckedTrue />
                    ) : (
                      <CheckedFalse />
                    )}
                  </span>
                )}
              </div>
              <div>
                {selectedIst && selectedIst.istCounselingReductionRisque && (
                  <span>Counseling Reduction de Risque : </span>
                )}
              </div>
              <div>
                {selectedIst && selectedIst.istCounselingReductionRisque && (
                  <span>
                    {selectedIst.istCounselingReductionRisque ? (
                      <CheckedTrue />
                    ) : (
                      <CheckedFalse />
                    )}
                  </span>
                )}
              </div>
              <div>
                {selectedIst && selectedIst.istTypePec !== null && (
                  <span>Type de PEC : </span>
                )}
              </div>
              <div>
                {selectedIst && selectedIst.istTypePec !== null && (
                  <span>{renameValue(selectedIst.istTypePec, TabTypePec)}</span>
                )}
              </div>
              <div>
                {selectedIst.istTypePec &&
                  selectedIst.istTypePec === "etiologique" && (
                    <div>Pec Ethiologique</div>
                  )}
              </div>
              <div>
                {selectedIst && selectedIst.istPecEtiologique !== null && (
                  <div>
                    {renameValue(selectedIst.istPecEtiologique, tabTypePec)}
                  </div>
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
