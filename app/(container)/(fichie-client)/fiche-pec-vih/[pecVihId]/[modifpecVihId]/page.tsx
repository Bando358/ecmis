"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { useClientContext } from "@/components/ClientContext";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { getOnePecVih, updatePecVih } from "@/lib/actions/pecVihActions";
import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import { useSession } from "next-auth/react";
import {
  Client,
  PecVih,
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
import { getOneClient } from "@/lib/actions/clientActions";
import { RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckedFalse, CheckedTrue } from "@/components/checkedTrue";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";

const tabTypeClientPec = [
  { value: "initiale", label: "Consultation Initiale" },
  { value: "suivi", label: "Consultation Suivi" },
  { value: "autre", label: "Consultation Autre" },
];

const tabTypeMoleculeArv = [
  { value: "ABC 3TC DTG", label: "ABC 3TC DTG" },
  { value: "TDF 3TC DTG", label: "TDF 3TC DTG" },
  { value: "autre", label: "Autre" },
];

type Option = {
  value: string;
  label: string;
};

export default function ModifPecVihPage({
  params,
}: {
  params: Promise<{ modifpecVihId: string }>;
}) {
  const { modifpecVihId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [selectedPecVih, setSelectedPecVih] = useState<PecVih>();
  const [dateVisite, setDateVisite] = useState<Date>();
  const [prescripteur, setPrescripteur] = useState<string>();
  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
  const [onePrescripteur, setOnePrescripteur] = useState<User>();
  const [client, setClient] = useState<Client | null>(null);
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
        const perm = permissions.find((p: { table: string; }) => p.table === TableName.PEC_VIH);
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
        const onePecVih = await getOnePecVih(modifpecVihId);
        setSelectedPecVih(onePecVih as PecVih);

        let allPrestataire: User[] = [];

        if (onePecVih?.pecVihIdClient) {
          const cliniqueClient = await getOneClient(onePecVih.pecVihIdClient);
          setClient(cliniqueClient);

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
  }, [modifpecVihId]);

  useEffect(() => {
    const fetchData = async () => {
      if (selectedPecVih) {
        const result = await getAllVisiteByIdClient(
          selectedPecVih.pecVihIdClient
        );
        const visiteDate = result.find(
          (r: { id: string; }) => r.id === selectedPecVih.pecVihIdVisite
        );

        const nomPrescripteur = await getOneUser(selectedPecVih.pecVihIdUser);
        const nomP = nomPrescripteur?.name;
        setPrescripteur(nomP);

        setVisites(
          result.filter((r: { id: string; }) => r.id === selectedPecVih.pecVihIdVisite)
        );
        setDateVisite(visiteDate?.dateVisite);
        setSelectedClientId(selectedPecVih.pecVihIdClient);
      }
    };
    fetchData();
  }, [selectedPecVih, setSelectedClientId]);

  const form = useForm<PecVih>();

  const onSubmit: SubmitHandler<PecVih> = async (data) => {
    const formattedData = {
      ...data,
      pecVihIdUser: form.getValues("pecVihIdUser"),
      pecVihIdClient: form.getValues("pecVihIdClient"),
      pecVihIdVisite: form.getValues("pecVihIdVisite"),
      pecVihTypeclient: form.getValues("pecVihTypeclient"),
      pecVihMoleculeArv: form.getValues("pecVihMoleculeArv"),
      pecDateRdvSuivi: new Date(data.pecDateRdvSuivi),
      pecVihUpdatedAt: new Date(),
      pecVihIdClinique: client?.idClinique || "",
    };

    try {
      if (selectedPecVih) {
        await updatePecVih(selectedPecVih.id, formattedData);
        const onePecVih = await getOnePecVih(modifpecVihId);
        if (onePecVih) {
          setSelectedPecVih(onePecVih as PecVih);
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

  const renameMoleculeArv = (val: string, tab: Option[]) => {
    const newVal = tab.find((t) => t.value === val);
    return newVal?.label;
  };

  const formatDate = (date: Date | string) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("fr-FR");
  };

  const handleUpdatePecVih = async () => {
    if (!permission?.canUpdate && onePrescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de modifier une PEC VIH. Contactez un administrateur."
      );
      return router.back();
    }
    if (selectedPecVih) {
      form.setValue("pecVihIdVisite", selectedPecVih.pecVihIdVisite);
      form.setValue("pecVihIdUser", selectedPecVih.pecVihIdUser);
      form.setValue("pecVihIdClient", selectedPecVih.pecVihIdClient);
      form.setValue("pecVihTypeclient", selectedPecVih.pecVihTypeclient);
      form.setValue("pecVihCounselling", selectedPecVih.pecVihCounselling);
      form.setValue("pecVihMoleculeArv", selectedPecVih.pecVihMoleculeArv);
      form.setValue("pecVihAesArv", selectedPecVih.pecVihAesArv);
      form.setValue("pecVihCotrimo", selectedPecVih.pecVihCotrimo);
      form.setValue("pecVihSpdp", selectedPecVih.pecVihSpdp);
      form.setValue("pecVihIoPaludisme", selectedPecVih.pecVihIoPaludisme);
      form.setValue("pecVihIoTuberculose", selectedPecVih.pecVihIoTuberculose);
      form.setValue("pecVihIoAutre", selectedPecVih.pecVihIoAutre);
      form.setValue(
        "pecVihSoutienPsychoSocial",
        selectedPecVih.pecVihSoutienPsychoSocial
      );
      form.setValue("pecDateRdvSuivi", selectedPecVih.pecDateRdvSuivi);
      setIsVisible(true);
    }
  };

  return (
    <div className="flex flex-col w-full justify-center max-w-4xl mx-auto px-4 py-2 border rounded-md">
      {selectedPecVih && (
        <ConstanteClient idVisite={selectedPecVih.pecVihIdVisite} />
      )}
      {isVisible ? (
        <>
          <h2 className="text-2xl text-gray-600 font-black text-center">
            Formulaire de modification de Prise en Charge VIH
          </h2>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-2 max-w-4xl rounded-sm mx-auto px-4 py-2 bg-white shadow-md"
            >
              <FormField
                control={form.control}
                name="pecVihIdVisite"
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
                name="pecVihTypeclient"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">
                      Type de consultation
                    </FormLabel>
                    <Select
                      required
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionnez le type de consultation" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tabTypeClientPec.map((option, index) => (
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
                  name="pecVihCounselling"
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
                          Counselling
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pecVihMoleculeArv"
                  render={({ field }) => (
                    <FormItem>
                      <div className="text-xl font-bold flex justify-between items-center">
                        <FormLabel className="font-medium">
                          Type de Molécule ARV
                        </FormLabel>
                        <RefreshCw
                          onClick={() => {
                            form.setValue("pecVihMoleculeArv", "");
                          }}
                          className="hover:text-blue-600 transition-all duration-200 hover:bg-slate-300 rounded-full p-1 active:scale-125 cursor-pointer"
                        />
                      </div>
                      <Select
                        required
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sélectionnez la Molécule ARV" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tabTypeMoleculeArv.map((option, index) => (
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

                <FormField
                  control={form.control}
                  name="pecVihAesArv"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">ARV / AES</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pecVihCotrimo"
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
                          Prophylaxie au Cotrimoxazole
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pecVihSpdp"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">SPDP</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="pt-4">
                  <h3 className="font-medium mb-2">
                    Infections opportunistes:
                  </h3>

                  <FormField
                    control={form.control}
                    name="pecVihIoPaludisme"
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
                            Paludisme
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pecVihIoTuberculose"
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
                            Tuberculose
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pecVihIoAutre"
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
                            Autre infection opportuniste
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="pecVihSoutienPsychoSocial"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2 pt-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">
                          Soutien psychosocial
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="pecDateRdvSuivi"
                render={({ field }) => (
                  <FormItem className="flex flex-row justify-center items-center">
                    <FormLabel className="font-normal flex-1">
                      Date de RDV
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="flex-1"
                        type="date"
                        required
                        value={
                          field.value
                            ? new Date(field.value).toISOString().split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          field.onChange(new Date(e.target.value))
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pecVihIdClient"
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
                  name="pecVihIdUser"
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
                  name="pecVihIdUser"
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
              <div className="flex justify-content">
                <Button type="submit" className="mt-4 mx-auto">
                  {form.formState.isSubmitting ? "En cours..." : "Appliquer"}
                </Button>
              </div>
            </form>
          </Form>
        </>
      ) : (
        <div className="flex flex-col gap-2 max-w-md mx-auto">
          {!selectedPecVih ? (
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-52" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>{selectedPecVih && <span>Date de visite : </span>}</div>
              <div>
                {dateVisite && new Date(dateVisite).toLocaleDateString("fr-FR")}
              </div>

              <div>
                {selectedPecVih && <span>Type de consultation : </span>}
              </div>
              <div>
                {selectedPecVih && (
                  <span>
                    {renameTypeClient(
                      selectedPecVih.pecVihTypeclient,
                      tabTypeClientPec
                    )}
                  </span>
                )}
              </div>

              <div>{selectedPecVih && <span>Counselling : </span>}</div>
              <div>
                {selectedPecVih && (
                  <span>
                    {selectedPecVih.pecVihCounselling ? (
                      <CheckedTrue />
                    ) : (
                      <CheckedFalse />
                    )}
                  </span>
                )}
              </div>

              <div>{selectedPecVih && <span>Molécule ARV : </span>}</div>
              <div>
                {selectedPecVih && (
                  <span>
                    {renameMoleculeArv(
                      selectedPecVih.pecVihMoleculeArv,
                      tabTypeMoleculeArv
                    )}
                  </span>
                )}
              </div>

              <div>{selectedPecVih && <span>ARV / AES : </span>}</div>
              <div>
                {selectedPecVih && (
                  <span>
                    {selectedPecVih.pecVihAesArv ? (
                      <CheckedTrue />
                    ) : (
                      <CheckedFalse />
                    )}
                  </span>
                )}
              </div>

              <div>
                {selectedPecVih && <span>Prophylaxie Cotrimoxazole : </span>}
              </div>
              <div>
                {selectedPecVih && (
                  <span>
                    {selectedPecVih.pecVihCotrimo ? (
                      <CheckedTrue />
                    ) : (
                      <CheckedFalse />
                    )}
                  </span>
                )}
              </div>

              <div>{selectedPecVih && <span>SPDP : </span>}</div>
              <div>
                {selectedPecVih && (
                  <span>
                    {selectedPecVih.pecVihSpdp ? (
                      <CheckedTrue />
                    ) : (
                      <CheckedFalse />
                    )}
                  </span>
                )}
              </div>

              <div>{selectedPecVih && <span>IO Paludisme : </span>}</div>
              <div>
                {selectedPecVih && (
                  <span>
                    {selectedPecVih.pecVihIoPaludisme ? (
                      <CheckedTrue />
                    ) : (
                      <CheckedFalse />
                    )}
                  </span>
                )}
              </div>

              <div>{selectedPecVih && <span>IO Tuberculose : </span>}</div>
              <div>
                {selectedPecVih && (
                  <span>
                    {selectedPecVih.pecVihIoTuberculose ? (
                      <CheckedTrue />
                    ) : (
                      <CheckedFalse />
                    )}
                  </span>
                )}
              </div>

              <div>{selectedPecVih && <span>IO Autre : </span>}</div>
              <div>
                {selectedPecVih && (
                  <span>
                    {selectedPecVih.pecVihIoAutre ? (
                      <CheckedTrue />
                    ) : (
                      <CheckedFalse />
                    )}
                  </span>
                )}
              </div>

              <div>
                {selectedPecVih && <span>Soutien psychosocial : </span>}
              </div>
              <div>
                {selectedPecVih && (
                  <span>
                    {selectedPecVih.pecVihSoutienPsychoSocial ? (
                      <CheckedTrue />
                    ) : (
                      <CheckedFalse />
                    )}
                  </span>
                )}
              </div>

              <div>{selectedPecVih && <span>Date RDV suivi : </span>}</div>
              <div>
                {selectedPecVih && (
                  <span>{formatDate(selectedPecVih.pecDateRdvSuivi)}</span>
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
                <Button onClick={handleUpdatePecVih}>Modifier</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
