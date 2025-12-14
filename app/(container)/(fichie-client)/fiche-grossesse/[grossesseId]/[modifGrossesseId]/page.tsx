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
          (p: { table: string }) => p.table === TableName.GROSSESSE
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
      const oneGrossesse = await getOneGrossesse(modifGrossesseId);
      setSelectedGrossesse(oneGrossesse as Grossesse);
      if (oneGrossesse) {
        const result = await getAllVisiteByIdClient(
          oneGrossesse.grossesseIdClient
        );
        const visiteDate = result.find(
          (r: { id: string }) => r.id === oneGrossesse.grossesseIdVisite
        );

        const cliniqueClient = await getOneClient(
          oneGrossesse.grossesseIdClient
        );
        let allPrestataire: User[] = [];
        if (cliniqueClient?.idClinique) {
          allPrestataire = await getAllUserIncludedIdClinique(
            cliniqueClient.idClinique
          );
        }
        setAllPrescripteur(allPrestataire as User[]);

        setVisites(
          result.filter((r: { id: string; }) => r.id === oneGrossesse.grossesseIdVisite)
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
        10
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
        "Vous n'avez pas la permission de modifier une grossesse. Contactez un administrateur."
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
    <div className="flex flex-col w-full justify-center max-w-250 mx-auto px-4 py-2 border rounded-md">
      {selectedGrossesse && (
        <ConstanteClient idVisite={selectedGrossesse.grossesseIdVisite} />
      )}
      {isVisible ? (
        <>
          <h2 className="text-2xl text-gray-600 font-black text-center">
            {`Formulaire de Création de Grossesse`}
          </h2>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-2 max-w-225 rounded-sm mx-auto px-4 py-2 bg-white shadow-md"
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
              <div className="my-2 px-4 py-2 shadow-md border rounded-md ">
                <Label>Patologies Antécédentes</Label>
                <div className="flex flex-row justify-between">
                  <FormField
                    control={form.control}
                    name="grossesseHta"
                    render={({ field }) => (
                      <FormItem className="  pb-4">
                        <div className="text-xl font-bold flex justify-between items-center">
                          <FormLabel className="ml-4">HTA :</FormLabel>
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
                          <FormLabel className="ml-4">Diabète :</FormLabel>
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
              </div>
              <div className="my-2 px-4 py-2 shadow-md border rounded-md ">
                <FormField
                  control={form.control}
                  name="grossesseGestite"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center">
                      <FormLabel className="flex-1">Gestité :</FormLabel>
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
                      <FormLabel className="flex-1">Parité :</FormLabel>
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

              <div className="my-2 px-4 py-2 flex flex-col shadow-md border rounded-md ">
                <FormField
                  control={form.control}
                  name="grossesseAge"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center">
                      <FormLabel className="flex-1">Âge en Semaine :</FormLabel>
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

              <Button type="submit" className="mt-4">
                {form.formState.isSubmitting ? "En cours..." : "Appliquer"}
              </Button>
            </form>
          </Form>
        </>
      ) : (
        <div className="flex flex-col gap-2 max-w-md mx-auto">
          {!selectedGrossesse ? (
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                  <Skeleton className="h-4 w-62.5" />
                  <Skeleton className="h-4 w-50" />
                </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>{selectedGrossesse && <span>Date de visite : </span>}</div>
              <div>
                {dateVisite && new Date(dateVisite).toLocaleDateString("fr-FR")}
              </div>
              <div>
                {selectedGrossesse &&
                  selectedGrossesse.grossesseHta !== null && (
                    <span>HTA : </span>
                  )}
              </div>
              <div>
                {selectedGrossesse &&
                  selectedGrossesse.grossesseHta !== null && (
                    <span>
                      {renameValue(selectedGrossesse.grossesseHta, TabHta)}
                    </span>
                  )}
              </div>
              <div>
                {selectedGrossesse &&
                  selectedGrossesse.grossesseDiabete !== null && (
                    <span>Diabète : </span>
                  )}
              </div>
              <div>
                {selectedGrossesse &&
                  selectedGrossesse.grossesseDiabete !== null && (
                    <span>
                      {renameValue(selectedGrossesse.grossesseDiabete, TabHta)}
                    </span>
                  )}
              </div>
              <div>
                {selectedGrossesse &&
                  selectedGrossesse.grossesseGestite !== null && (
                    <span>Gestité : </span>
                  )}
              </div>
              <div>
                {selectedGrossesse &&
                  selectedGrossesse.grossesseGestite !== null && (
                    <span>{selectedGrossesse.grossesseGestite}</span>
                  )}
              </div>
              <div>
                {selectedGrossesse &&
                  selectedGrossesse.grossesseParite !== null && (
                    <span>Parité : </span>
                  )}
              </div>
              <div>
                {selectedGrossesse &&
                  selectedGrossesse.grossesseParite !== null && (
                    <span>{selectedGrossesse.grossesseParite}</span>
                  )}
              </div>
              <div>
                {selectedGrossesse &&
                  selectedGrossesse.grossesseAge !== null && (
                    <span>Âge gestationnel : </span>
                  )}
              </div>
              <div>
                {selectedGrossesse &&
                  selectedGrossesse.grossesseAge !== null && (
                    <span>{selectedGrossesse.grossesseAge} semaines</span>
                  )}
              </div>
              <div>{selectedGrossesse && <span>DDR : </span>}</div>
              <div>
                {dateVisite &&
                  selectedGrossesse.grossesseDdr !== null &&
                  new Date(selectedGrossesse.grossesseDdr).toLocaleDateString(
                    "fr-FR"
                  )}
              </div>
              <div>{selectedGrossesse && <span>Terme Prévu : </span>}</div>
              <div>
                {dateVisite &&
                  selectedGrossesse.termePrevu !== null &&
                  new Date(selectedGrossesse.termePrevu).toLocaleDateString(
                    "fr-FR"
                  )}
              </div>

              <div>
                {selectedGrossesse && (
                  <small className="italic">Prescripteur :</small>
                )}
              </div>
              <div>
                {selectedGrossesse && (
                  <small className="italic">
                    {
                      allPrescripteur?.find(
                        (item) => item.id === selectedGrossesse.grossesseIdUser
                      )?.name
                    }
                  </small>
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
