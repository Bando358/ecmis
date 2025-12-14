"use client";
import { use, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import {
  createOrdonnance,
  deleteOrdonnance,
  getAllOrdonnanceByIdClient,
  updateOrdonnance,
} from "@/lib/actions/ordonnanceActions";
import {
  Client,
  Ordonnance,
  Permission,
  TableName,
  User,
  Visite,
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
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
import { Textarea } from "@/components/ui/textarea";
import ConstanteClient from "@/components/constanteClient";
import { Separator } from "@/components/ui/separator";
import { useClientContext } from "@/components/ClientContext";
import { useSession } from "next-auth/react";
import { getOneClient } from "@/lib/actions/clientActions";
import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import { AnimatePresence, motion } from "framer-motion";
import { Spinner } from "@/components/ui/spinner";
import Image from "next/image";
import { useReactToPrint } from "react-to-print";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";

export default function OrdonnancePage({
  params,
}: {
  params: Promise<{ ordonnanceId: string }>;
}) {
  const { ordonnanceId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [idOrdonnance, setIdOrdonnance] = useState<string>();
  const [tabOrdonnance, setTabOrdonnance] = useState<Ordonnance[]>([]);
  const [selectedOrdonnance, setSelectedOrdonnance] =
    useState<Ordonnance | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [selectedVisite, setSelectedVisite] = useState<string>();
  const [prescripteur, setPrescripteur] = useState<User>();
  const [allPrestataire, setAllPrestataire] = useState<User[]>([]);
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();
  const [showForm, setShowForm] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdated, setIsUpdated] = useState(false);
  const [medicaments, setMedicaments] = useState<string[]>([""]);
  const [permission, setPermission] = useState<Permission | null>(null);
  const [isPermissionUpdated, setIsPermissionUpdated] = useState(false);

  const { setSelectedClientId } = useClientContext();
  useEffect(() => {
    setSelectedClientId(ordonnanceId);
  }, [ordonnanceId, setSelectedClientId]);

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
        const perm = permissions.find((p: { table: string; }) => p.table === TableName.ORDONNANCE);
        setPermission(perm || null);
        setIsPermissionUpdated(perm?.canUpdate || false);
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
      const result = await getAllVisiteByIdClient(ordonnanceId);
      setVisites(result as Visite[]);

      const cliniqueClient = await getOneClient(ordonnanceId);
      setClient(cliniqueClient);
      let allPrestataire: User[] = [];
      if (cliniqueClient?.idClinique) {
        allPrestataire = await getAllUserIncludedIdClinique(
          cliniqueClient.idClinique
        );
      }
      setAllPrestataire(allPrestataire as User[]);

      const allOrdonnanceByClient = await getAllOrdonnanceByIdClient(
        ordonnanceId
      );
      setTabOrdonnance(allOrdonnanceByClient as Ordonnance[]);
    };
    fetchData();
  }, [ordonnanceId]);

  const form = useForm<Ordonnance>({
    defaultValues: {
      ordonnanceMedicaments: [""],
      ordonnanceIdVisite: selectedVisite,
      ordonnanceIdClient: ordonnanceId,
      ordonnanceIdUser: isPrescripteur === true ? idUser || "" : "",
    },
  });

  const getOrdonnanceByIdVisite = useCallback(
    (idVisite: string) => {
      setIsLoading(true);
      const ordonnance = tabOrdonnance.find(
        (ord) => ord.ordonnanceIdVisite === idVisite
      );
      if (ordonnance) {
        setShowForm(false);
        setIdOrdonnance(ordonnance.id);
        setSelectedOrdonnance(ordonnance ?? null);
        setMedicaments(ordonnance.ordonnanceMedicaments || [""]);
      } else {
        setShowForm(true);
        setSelectedOrdonnance(null);
        setMedicaments([""]);
        form.reset({
          ordonnanceMedicaments: [""],
          ordonnanceIdVisite: idVisite,
          ordonnanceIdClient: ordonnanceId,
          ordonnanceIdUser: isPrescripteur === true ? idUser || "" : "",
        });
      }
      setIsLoading(false);
    },
    [tabOrdonnance, form, isPrescripteur, idUser, ordonnanceId]
  );

  useEffect(() => {
    form.setValue("ordonnanceIdClient", ordonnanceId);
  }, [ordonnanceId, form]);

  useEffect(() => {
    if (selectedVisite) {
      getOrdonnanceByIdVisite(selectedVisite);
      form.setValue("ordonnanceIdVisite", selectedVisite);
    }
  }, [selectedVisite, getOrdonnanceByIdVisite, form]);

  const addMedicament = () => {
    setMedicaments([...medicaments, ""]);
  };

  const removeMedicament = (index: number) => {
    if (medicaments.length > 1) {
      const newMedicaments = medicaments.filter((_, i) => i !== index);
      setMedicaments(newMedicaments);
    }
  };

  const updateMedicament = (index: number, value: string) => {
    const newMedicaments = [...medicaments];
    newMedicaments[index] = value;
    setMedicaments(newMedicaments);
  };

  const onSubmit: SubmitHandler<Ordonnance> = async (data) => {
    if (!permission?.canCreate && prescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de créer une ordonnance. Contactez un administrateur."
      );
      return router.back();
    }
    const formattedData = {
      id: crypto.randomUUID(),
      ordonnanceMedicaments: medicaments.filter((med) => med.trim() !== ""),
      ordonnanceIdVisite: data.ordonnanceIdVisite,
      ordonnanceIdClient: data.ordonnanceIdClient,
      ordonnanceIdUser: data.ordonnanceIdUser,
      ordonnanceCreatedAt: new Date(),
      ordonnanceUpdatedAt: new Date(),
      ordonnanceIdClinique: client?.idClinique || "",
    };

    try {
      if (isUpdated && idOrdonnance) {
        const updatedList = await updateOrdonnance(idOrdonnance, formattedData);
        setSelectedOrdonnance(updatedList);
        setIsUpdated(false);
        setShowForm(false);
        toast.success("Ordonnance modifiée avec succès! 🎉");
        return;
      } else {
        await createOrdonnance(formattedData);
        console.log("formattedData : ", formattedData);
        toast.success("Ordonnance créée avec succès! 🎉");
        const updatedList = await getAllOrdonnanceByIdClient(ordonnanceId);
        setTabOrdonnance(updatedList);
        getOrdonnanceByIdVisite(selectedVisite || "");
      }
    } catch (error) {
      toast.error("La création de l'ordonnance a échoué");
      console.error("Erreur lors de la création de l'ordonnance:", error);
    }
  };

  const handleUpdate = () => {
    if (!isPermissionUpdated && prescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de modifier cette ordonnance. Contactez un administrateur."
      );
      return;
      // return router.back();
    }
    setShowForm(true);
    setSelectedOrdonnance(null);
    setIsUpdated(true);
    if (selectedOrdonnance) {
      setMedicaments(selectedOrdonnance.ordonnanceMedicaments || [""]);
      form.reset({
        ordonnanceMedicaments: selectedOrdonnance.ordonnanceMedicaments || [""],
        ordonnanceIdVisite: selectedOrdonnance.ordonnanceIdVisite || "",
        ordonnanceIdClient:
          selectedOrdonnance.ordonnanceIdClient || ordonnanceId,
        ordonnanceIdUser:
          selectedOrdonnance.ordonnanceIdUser ||
          (isPrescripteur === true ? idUser || "" : ""),
      });
    }
  };

  const contentRef = useRef<HTMLTableElement>(null);
  const reactToPrintFn = useReactToPrint({ contentRef });

  const handleDeleteOrdonnance = async () => {
    if (!permission?.canDelete && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de supprimer cette ordonnance. Contactez un administrateur."
      );
      return;
      // return router.back();
    }
    if (!idOrdonnance) return;
    const confirmDelete = window.confirm(
      "Êtes-vous sûr de vouloir supprimer cette ordonnance ? Cette action est irréversible."
    );
    if (confirmDelete) {
      try {
        await deleteOrdonnance(idOrdonnance);
        toast.success("Ordonnance supprimée avec succès! 🎉");
        const updatedList = await getAllOrdonnanceByIdClient(ordonnanceId);
        setTabOrdonnance(updatedList);
      } catch (error) {
        toast.error("La suppression de l'ordonnance a échoué");
        console.error("Erreur lors de la suppression de l'ordonnance:", error);
      }
    }
  };

  return (
    <div className="flex flex-col w-full justify-center max-w-250 mx-auto px-4 py-2 border rounded-md">
      <div className="flex flex-justify-start items-center gap-2 pt-2">
        <div className="flex flex-col space-y-2 items-center gap-2 mx-auto">
          <Select value={selectedVisite} onValueChange={setSelectedVisite}>
            <SelectTrigger id="visite" className="border rounded-lg px-4 py-2">
              <SelectValue placeholder="-- Choisir une visite --" />
            </SelectTrigger>
            <SelectContent className="transition-all duration-200 ease-in-out">
              {visites.map((visite) => (
                <SelectItem
                  key={visite.id}
                  value={visite.id}
                  className="cursor-pointer hover:bg-blue-100 transition-colors duration-200"
                >
                  {new Date(visite.dateVisite).toLocaleDateString("fr-FR")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {visites.length < 1 && (
        <span className="text-center font-light italic">
          Aucune visite pour ce client
        </span>
      )}
      {isLoading && <Spinner />}
      <AnimatePresence mode="wait">
        {selectedVisite &&
          (showForm ? (
            <motion.div
              key="formulaire"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <Separator className="my-4" />
              <ConstanteClient idVisite={selectedVisite} />

              <div className="flex justify-center items-center mb-4">
                <h2 className="text-2xl text-gray-600 font-black text-center">
                  {"Formulaire d'Ordonnance"}
                </h2>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-2 max-w-112.5 rounded-sm mx-auto px-4 py-2 bg-white shadow-md"
                >
                  {/* Liste des médicaments */}
                  <div className="my-2 px-4 py-2 shadow-md border rounded-md">
                    <Label className="flex justify-center text-lg font-bold text-gray-800 mb-4">
                      Liste des Médicaments
                    </Label>

                    <div className="space-y-3">
                      {medicaments.map((medicament, index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <FormField
                            control={form.control}
                            name={`ordonnanceMedicaments.${index}`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    value={medicament}
                                    onChange={(e) => {
                                      updateMedicament(index, e.target.value);
                                      field.onChange(e);
                                    }}
                                    placeholder={`Médicament ${
                                      index + 1
                                    } - Posologie et durée`}
                                    className="min-h-20"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {medicaments.length > 1 && (
                            <Button
                              type="button"
                              onClick={() => removeMedicament(index)}
                              variant="destructive"
                              size="sm"
                              className="mt-2"
                            >
                              ×
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    <Button
                      type="button"
                      onClick={addMedicament}
                      variant="outline"
                      className="w-full mt-3"
                    >
                      + Ajouter un médicament
                    </Button>
                  </div>

                  {/* Informations du prescripteur */}
                  <div className="my-2 px-4 py-2 shadow-md border rounded-md">
                    <Label className="flex justify-center text-lg font-bold text-gray-800 mb-4">
                      Informations du Prescripteur
                    </Label>

                    <div className="grid grid-cols-1 gap-4">
                      {isPrescripteur === true ? (
                        <FormField
                          control={form.control}
                          name="ordonnanceIdUser"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={idUser}
                                  className="hidden"
                                  readOnly
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      ) : (
                        <FormField
                          control={form.control}
                          name="ordonnanceIdUser"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-medium">
                                Selectionnez le prescripteur
                              </FormLabel>
                              <Select
                                required
                                value={field.value || ""}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Prescripteur" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {allPrestataire.map((prescripteur) => (
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
                    </div>
                  </div>

                  {/* Champs cachés */}
                  <FormField
                    control={form.control}
                    name="ordonnanceIdClient"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            className="hidden"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ordonnanceIdVisite"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            className="hidden"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-4 print:hidden">
                    <Button type="submit" className="mt-4 flex-1">
                      {form.formState.isSubmitting
                        ? "En cours..."
                        : isUpdated
                        ? "Mettre à jour l'ordonnance"
                        : "Soumettre l'ordonnance"}
                    </Button>
                  </div>
                </form>
              </Form>
            </motion.div>
          ) : (
            <motion.div
              key="no-selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex flex-col gap-4 p-6 border rounded-md shadow-md bg-white my-4 mx-auto">
                {selectedOrdonnance !== null && (
                  <Table className="max-w-md p-6 m-4" ref={contentRef}>
                    <TableHeader>
                      <TableRow className="">
                        <TableHead colSpan={2} className="pl-4 text-center">
                          <Image
                            src="/logo/LOGO_AIBEF_IPPF.png"
                            alt="Logo"
                            width={400}
                            height={10}
                            style={{ margin: "auto" }}
                            className="mx-auto"
                            priority
                          />
                        </TableHead>
                      </TableRow>
                      <TableRow className=" font-bold">
                        <TableHead colSpan={2} className="pl-4 text-center">
                          Ordonnance Médicale
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      <TableRow className="">
                        <TableCell className="font-bold pl-4 whitespace-nowrap">
                          Nom et Prénom du patient :
                        </TableCell>
                        <TableCell className="pr-2">
                          {client?.nom} {client?.prenom}
                        </TableCell>
                      </TableRow>

                      <TableRow className="">
                        <TableCell className="font-bold pl-4 whitespace-nowrap">
                          Sexe :
                        </TableCell>
                        <TableCell className="pr-2">{client?.sexe}</TableCell>
                      </TableRow>

                      <TableRow className="">
                        <TableCell className="font-bold pl-4 whitespace-nowrap">
                          Âge :
                        </TableCell>
                        <TableCell className="pr-2">
                          {client?.dateNaissance
                            ? new Date().getFullYear() -
                              new Date(client.dateNaissance).getFullYear() +
                              " ans"
                            : "Âge inconnu"}
                        </TableCell>
                      </TableRow>

                      {/* Liste des médicaments */}
                      {selectedOrdonnance.ordonnanceMedicaments.map(
                        (medicament, index) => (
                          <TableRow key={index} className="">
                            <TableCell colSpan={2} className="pl-8 pr-2">
                              <div className="flex items-start gap-2">
                                <span className="font-bold">{index + 1}.</span>
                                <span className="whitespace-pre-wrap">
                                  {medicament}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>

                    <TableFooter className="bg-muted/50">
                      <TableRow>
                        <TableCell className="p-4 font-medium">
                          <div className="flex flex-col">
                            <span>
                              Prescripteur:{" "}
                              {
                                allPrestataire.find(
                                  (p) =>
                                    p.id === selectedOrdonnance.ordonnanceIdUser
                                )?.name
                              }
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Date:{" "}
                              {new Date(
                                selectedOrdonnance.ordonnanceCreatedAt
                              ).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="p-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-bold">Signature</span>
                            <div className="h-12 w-32 border-b border-gray-400"></div>
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                )}
                {/* Bouton d'impression */}
                <div className="flex justify-center gap-3 mt-6 print:hidden">
                  <Button
                    onClick={() => {
                      reactToPrintFn();
                    }}
                    className="w-full sm:w-auto"
                  >
                    {"Imprimer l'Ordonnance"}
                  </Button>
                  <Button onClick={handleUpdate} className="w-full sm:w-auto">
                    Modifier
                  </Button>
                  <Button
                    onClick={() => {
                      router.push(`/fiches/${ordonnanceId}`);
                    }}
                    className="w-full sm:w-auto"
                  >
                    Retour
                  </Button>
                  <Button
                    onClick={handleDeleteOrdonnance}
                    className="w-full sm:w-auto"
                    variant="destructive"
                  >
                    🗑️
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  );
}
