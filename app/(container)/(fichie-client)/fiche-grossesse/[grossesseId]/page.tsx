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
import { useSession } from "next-auth/react";
import {
  Client,
  Grossesse,
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
import { Label } from "@/components/ui/label";
import ConstanteClient from "@/components/constanteClient";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  createGrossesse,
  getAllGrossesseByIdClient,
} from "@/lib/actions/grossesseActions";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { getOneClient } from "@/lib/actions/clientActions";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";

const TabHta = [
  { value: "oui", label: "Oui" },
  { value: "non", label: "Non" },
];
// grossesseId
export default function GrossessePage({
  params,
}: {
  params: Promise<{ grossesseId: string }>;
}) {
  const { grossesseId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [selectedGrossesse, setSelectedGrossesse] = useState<Grossesse[]>([]);
  const [client, setClient] = useState<Client | null>(null);

  const [prescripteur, setPrescripteur] = useState<User>();
  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();
  const [permission, setPermission] = useState<Permission | null>(null);

  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const router = useRouter();

  useEffect(() => {
    const fetUser = async () => {
      const user = await getOneUser(idUser);
      setIsPrescripteur(user?.prescripteur ? true : false);
      setPrescripteur(user!);
    };
    fetUser();
  }, [idUser]);

  useEffect(() => {
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!prescripteur) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(prescripteur.id);
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
  }, [prescripteur]);

  useEffect(() => {
    const fetchData = async () => {
      const resultGyneco = await getAllGrossesseByIdClient(grossesseId);
      setSelectedGrossesse(resultGyneco as Grossesse[]); // Assurez-vous que result est bien de type CliniqueData[]
      const result = await getAllVisiteByIdClient(grossesseId);
      setVisites(result as Visite[]); // Assurez-vous que result est bien de type CliniqueData[]

      const cliniqueClient = await getOneClient(grossesseId);
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
  }, [grossesseId]);

  // console.log(visites);

  useEffect(() => {
    form.setValue("grossesseIdClient", grossesseId);
  }, [grossesseId]);

  const form = useForm<Grossesse>();
  const onSubmit: SubmitHandler<Grossesse> = async (data) => {
    if (!permission?.canCreate && prescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de créer une grossesse. Contactez un administrateur."
      );
      return router.back();
    }
    const formattedData = {
      ...data,
      grossesseIdUser: idUser,
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
      grossesseIdClinique: client?.idClinique || "",
    };
    try {
      await createGrossesse(formattedData);
      await updateRecapVisite(
        form.watch("grossesseIdVisite"),
        form.watch("grossesseIdUser"),
        "06 Fiche grossesse"
      );
      toast.success("Formulaire créer avec succès! 🎉");
      console.log("formattedData : ", formattedData);
      router.push(`/fiches/${grossesseId}`);
    } catch (error) {
      toast.error("La création de la Grossesse a échoué");
      console.error("Erreur lors de la création de la Grossesse:", error);
    }
  };

  return (
    <div className="flex flex-col w-full justify-center max-w-4xl mx-auto px-4 py-2 border rounded-md">
      <ConstanteClient idVisite={form.getValues("grossesseIdVisite")} />
      <h2 className="text-2xl text-gray-600 font-black text-center">
        {`Formulaire de Création de Grossesse`}
      </h2>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-2 max-w-3xl rounded-sm mx-auto px-4 py-2 bg-white shadow-md"
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
                      <SelectItem
                        key={index}
                        value={visite.id}
                        disabled={selectedGrossesse.some(
                          (p) => p.grossesseIdVisite === visite.id
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
              <Separator orientation="vertical" className="mx-2 bg-gray-400" />
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
            {form.formState.isSubmitting ? "En cours..." : "Créer la Grossesse"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
