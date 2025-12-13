"use client";
import { use, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import {
  createContreReference,
  deleteContreReference,
  getAllContreReferenceByIdClient,
  updateContreReference,
} from "@/lib/actions/contreReferenceActions";
import {
  Client,
  ContreReference,
  Permission,
  Reference,
  TableName,
  User,
  Visite,
} from "@/lib/generated/prisma";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { getAllReferenceByIdClient } from "@/lib/actions/referenceActions";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";

const TabQualification = [
  { value: "Infirmier(e)", label: "Infirmier(e)" },
  { value: "Médecin", label: "Médecin" },
  { value: "Sage-femme", label: "Sage-femme" },
  { value: "Autre", label: "Autre" },
];

const TabIvaBilan = [
  { value: "LEEP", label: "LEEP" },
  { value: "Biopsie", label: "Biopsie" },
  { value: "Autre", label: "Autre" },
];

export default function ContreReferencePage({
  params,
}: {
  params: Promise<{ contreReferenceId: string }>;
}) {
  const { contreReferenceId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [idContreReference, setIdContreReference] = useState<string>();
  const [tabContreReference, setTabContreReference] = useState<
    ContreReference[]
  >([]);
  const [selectedContreReference, setSelectedContreReference] =
    useState<ContreReference | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [selectedVisite, setSelectedVisite] = useState<string>();
  const [allReference, setAllReference] = useState<Reference[]>([]);
  const [allPrestataire, setAllPrestataire] = useState<User[]>([]);
  const [prescripteur, setPrescripteur] = useState<User>();
  const [isPrestataire, setIsPrestataire] = useState<boolean>();
  const [showForm, setShowForm] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdated, setIsUpdated] = useState(false);
  const [permission, setPermission] = useState<Permission | null>(null);

  const { setSelectedClientId } = useClientContext();
  useEffect(() => {
    setSelectedClientId(contreReferenceId);
  }, [contreReferenceId, setSelectedClientId]);

  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const router = useRouter();

  useEffect(() => {
    const fetUser = async () => {
      const user = await getOneUser(idUser);
      setIsPrestataire(user?.prescripteur ? true : false);
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
          (p) => p.table === TableName.CONTRE_REFERENCE
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
      const result = await getAllVisiteByIdClient(contreReferenceId);
      const reference = await getAllReferenceByIdClient(contreReferenceId);
      const valVisite = result.filter((visite) =>
        reference.some((ref) => ref.refIdVisite === visite.id)
      );
      setVisites(valVisite as Visite[]);

      const valReference = reference.filter((ref) =>
        valVisite.some((visite) => visite.id === ref.refIdVisite)
      );
      setAllReference(valReference as Reference[]);

      const cliniqueClient = await getOneClient(contreReferenceId);
      setClient(cliniqueClient);
      let allPrestataire: User[] = [];
      if (cliniqueClient?.idClinique) {
        allPrestataire = await getAllUserIncludedIdClinique(
          cliniqueClient.idClinique
        );
      }
      setAllPrestataire(allPrestataire as User[]);

      const allContreRefByClient = await getAllContreReferenceByIdClient(
        contreReferenceId
      );
      setTabContreReference(allContreRefByClient as ContreReference[]);
    };
    fetchData();
  }, [contreReferenceId]);

  const form = useForm<ContreReference>({
    defaultValues: {
      consultation: true,
      dateReception: new Date(),
      numeroDossier: "",
      diagnosticPose: "",
      patientHospitalise: false,
      traitementRecu: "",
      traitementASuivre: "",
      ivaBilan: "",
      nomPrenomPrestataire: session?.user.name || "",
      telPrestataire: "",
      dateSortie: new Date(),
      qualification: "",
      refIdVisite: selectedVisite,
      idClient: contreReferenceId,
      idReference:
        allReference.find((ref) => ref.refIdVisite === selectedVisite)?.id ||
        "",
      idUser: isPrestataire === true ? idUser || "" : "",
      idClinique: client?.idClinique || "",
    },
  });

  const getContreReferenceByIdVisite = useCallback(
    (idVisite: string) => {
      setIsLoading(true);
      const contreRef = tabContreReference.find(
        (cr) => cr.refIdVisite === idVisite
      );
      if (contreRef) {
        setShowForm(false);
        setIdContreReference(contreRef.id);
        setSelectedContreReference(contreRef ?? null);
      } else {
        setShowForm(true);
        setSelectedContreReference(null);
        form.reset({
          consultation: true,
          dateReception: new Date(),
          numeroDossier: "",
          diagnosticPose: "",
          patientHospitalise: false,
          traitementRecu: "",
          traitementASuivre: "",
          ivaBilan: "",
          nomPrenomPrestataire:
            allPrestataire.find((p) => p.id === form.watch("idUser"))?.name ||
            "",
          telPrestataire: "",
          dateSortie: new Date(),
          qualification: "",
          refIdVisite: idVisite,
          idClient: contreReferenceId,
          idReference: "",
          idUser: isPrestataire === true ? idUser || "" : "",
        });
      }
      setIsLoading(false);
    },
    [
      tabContreReference,
      form,
      allPrestataire,
      isPrestataire,
      idUser,
      contreReferenceId,
    ]
  );

  useEffect(() => {
    form.setValue("idClient", contreReferenceId);
    form.setValue("nomPrenomPrestataire", session?.user.name || "");
  }, [contreReferenceId, session]);

  useEffect(() => {
    if (selectedVisite) {
      getContreReferenceByIdVisite(selectedVisite);
      form.setValue("refIdVisite", selectedVisite);
    }
  }, [selectedVisite, getContreReferenceByIdVisite, form]);

  const onSubmit: SubmitHandler<ContreReference> = async (data) => {
    if (!permission?.canCreate && prescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de créer une contre-référence. Contactez un administrateur."
      );
      return router.back();
    }
    const formattedData = {
      id: crypto.randomUUID(),
      consultation: data.consultation,
      dateReception: data.dateReception || new Date(),
      numeroDossier: data.numeroDossier || "",
      diagnosticPose: data.diagnosticPose || "",
      patientHospitalise: data.patientHospitalise || false,
      traitementRecu: data.traitementRecu || "",
      traitementASuivre: data.traitementASuivre || "",
      ivaBilan: data.ivaBilan || "",
      nomPrenomPrestataire:
        allPrestataire.find((p) => p.id === form.watch("idUser"))?.name || "",
      telPrestataire: data.telPrestataire,
      dateSortie: data.dateSortie || new Date(),
      qualification: data.qualification,
      refIdVisite: data.refIdVisite,
      idClient: data.idClient,
      idClinique: client?.idClinique || "",
      idReference:
        allReference.find((ref) => ref.refIdVisite === selectedVisite)?.id ||
        "",
      idUser: data.idUser,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      if (isUpdated && idContreReference) {
        const updatedList = await updateContreReference(
          idContreReference,
          formattedData
        );
        setSelectedContreReference(updatedList);
        setIsUpdated(false);
        setShowForm(false);
        toast.success("Contre-référence modifiée avec succès! 🎉");
        return;
      } else {
        await createContreReference(formattedData);
        console.log("formattedData : ", formattedData);
        toast.success("Contre-référence créée avec succès! 🎉");
        const updatedList = await getAllContreReferenceByIdClient(
          contreReferenceId
        );
        setTabContreReference(updatedList);
        getContreReferenceByIdVisite(selectedVisite || "");
      }
    } catch (error) {
      toast.error("La création de la contre-référence a échoué");
      console.error(
        "Erreur lors de la création de la contre-référence:",
        error
      );
    }
  };

  const handleUpdate = () => {
    if (!permission?.canUpdate && prescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de modifier cette contre-référence. Contactez un administrateur."
      );
      return router.back();
    }
    setShowForm(true);
    setSelectedContreReference(null);
    setIsUpdated(true);
    if (selectedContreReference) {
      form.reset({
        consultation: selectedContreReference.consultation ?? true,
        dateReception: selectedContreReference.dateReception ?? new Date(),
        numeroDossier: selectedContreReference.numeroDossier ?? "",
        diagnosticPose: selectedContreReference.diagnosticPose ?? "",
        patientHospitalise: selectedContreReference.patientHospitalise ?? false,
        traitementRecu: selectedContreReference.traitementRecu ?? "",
        traitementASuivre: selectedContreReference.traitementASuivre ?? "",
        ivaBilan: selectedContreReference.ivaBilan ?? "",
        nomPrenomPrestataire:
          selectedContreReference.nomPrenomPrestataire ?? "",
        telPrestataire: selectedContreReference.telPrestataire ?? "",
        dateSortie: selectedContreReference.dateSortie ?? new Date(),
        qualification: selectedContreReference.qualification ?? "",
        refIdVisite: selectedContreReference.refIdVisite ?? "",
        idClient: selectedContreReference.idClient ?? contreReferenceId,
        idReference: selectedContreReference.idReference ?? "",
        idUser:
          selectedContreReference.idUser ??
          (isPrestataire === true ? idUser || "" : ""),
      });
    }
  };

  const contentRef = useRef<HTMLTableElement>(null);
  const reactToPrintFn = useReactToPrint({ contentRef });

  const handleDeleteContreReference = async () => {
    if (!permission?.canDelete && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de supprimer cette contre-référence. Contactez un administrateur."
      );
      return router.back();
    }
    if (!idContreReference) return;
    const confirmDelete = window.confirm(
      "Êtes-vous sûr de vouloir supprimer cette contre-référence ? Cette action est irréversible."
    );
    if (confirmDelete) {
      try {
        await deleteContreReference(idContreReference);
        toast.success("Contre-référence supprimée avec succès! 🎉");
        const updatedList = await getAllContreReferenceByIdClient(
          contreReferenceId
        );
        setTabContreReference(updatedList);
      } catch (error) {
        toast.error("La suppression de la contre-référence a échoué");
        console.error(
          "Erreur lors de la suppression de la contre-référence:",
          error
        );
      }
    }
  };

  return (
    <div className="flex flex-col w-full justify-center max-w-[1000px] mx-auto px-4 py-2 border rounded-md">
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
          Aucune référence pour ce client
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
                  Formulaire de Contre-Référence
                </h2>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-2 max-w-[450px] rounded-sm mx-auto px-4 py-2 bg-white shadow-md"
                >
                  {/* Consultation hidden */}
                  <FormField
                    control={form.control}
                    name="consultation"
                    render={({ field }) => (
                      <FormItem className="hidden">
                        <FormControl>
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Informations de réception */}
                  <div className="my-2 px-4 py-2 shadow-md border rounded-md">
                    <Label className="flex justify-center text-lg font-bold text-gray-800 mb-4">
                      Informations de Réception
                    </Label>

                    <FormField
                      control={form.control}
                      name="dateReception"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Date de réception :</FormLabel>
                          <FormControl>
                            <Input
                              type="datetime-local"
                              {...field}
                              value={
                                field.value
                                  ? new Date(field.value)
                                      .toISOString()
                                      .slice(0, 16)
                                  : ""
                              }
                              onChange={(e) =>
                                field.onChange(new Date(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="numeroDossier"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Numéro de dossier :</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              placeholder="Numéro de dossier du patient"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Informations médicales */}
                  <div className="my-2 px-4 py-2 shadow-md border rounded-md">
                    <Label className="flex justify-center text-lg font-bold text-gray-800 mb-4">
                      Informations Médicales
                    </Label>

                    <FormField
                      control={form.control}
                      name="diagnosticPose"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Diagnostic posé :</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value ?? ""}
                              placeholder="Diagnostic final posé"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="patientHospitalise"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2 mt-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="font-normal">
                              Patient hospitalisé
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="traitementRecu"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Traitement reçu :</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value ?? ""}
                              placeholder="Traitement administré au patient"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="traitementASuivre"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Traitement à suivre :</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value ?? ""}
                              placeholder="Traitement prescrit pour la suite"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Bilan IVA */}
                  {allReference.find(
                    (ref) => ref.refIdVisite === selectedVisite
                  )?.motifReference === "Suspicion cancer col" && (
                    <div className="my-2 px-4 py-2 shadow-md border rounded-md">
                      <Label className="flex justify-center text-lg font-bold text-gray-800 mb-4">
                        Bilan IVA
                      </Label>

                      <FormField
                        control={form.control}
                        name="ivaBilan"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bilan réalisé :</FormLabel>
                            <Select
                              value={field.value ?? ""}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Sélectionner le bilan" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {TabIvaBilan.map((bilan) => (
                                  <SelectItem
                                    key={bilan.value}
                                    value={bilan.value ?? ""}
                                  >
                                    {bilan.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Informations du prestataire */}
                  <div className="my-2 px-4 py-2 shadow-md border rounded-md">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="nomPrenomPrestataire"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Nom et Prénom du prestataire traitant :
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="M/Mme/Mlle John Kalix"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="telPrestataire"
                        render={({ field }) => (
                          <FormItem className="mt-4">
                            <FormLabel>Téléphone du prestataire :</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Numéro de téléphone"
                                value={field.value ?? ""}
                                required
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="qualification"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Qualification :</FormLabel>
                            <Select
                              required
                              value={field.value || ""}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="IDE - SF - Médecin" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {TabQualification.map((qualification) => (
                                  <SelectItem
                                    key={qualification.value}
                                    value={qualification.value}
                                  >
                                    {qualification.label}
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
                        name="dateSortie"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date de sortie :</FormLabel>
                            <FormControl>
                              <Input
                                type="datetime-local"
                                {...field}
                                value={
                                  field.value
                                    ? new Date(field.value)
                                        .toISOString()
                                        .slice(0, 16)
                                    : ""
                                }
                                onChange={(e) =>
                                  field.onChange(new Date(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {isPrestataire === true ? (
                    <FormField
                      control={form.control}
                      name="idUser"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              value={idUser}
                              // className="hidden"
                              readOnly
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="idUser"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-medium">
                            Selectionnez le prestataire
                          </FormLabel>
                          <Select
                            required
                            value={field.value || ""}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Prestataire" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {allPrestataire.map((prestataire) => (
                                <SelectItem
                                  key={prestataire.id}
                                  value={prestataire.id}
                                >
                                  <span>{prestataire.name}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Champs cachés */}
                  <FormField
                    control={form.control}
                    name="idClient"
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
                    name="refIdVisite"
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
                        ? "Mettre à jour la contre-référence"
                        : "Soumettre la contre-référence"}
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
              <div className="flex flex-col gap-4 p-6 border rounded-md shadow-md bg-white my-4">
                {selectedContreReference !== null && (
                  <Table className="mx-auto max-w-md" ref={contentRef}>
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
                          />
                        </TableHead>
                      </TableRow>
                      <TableRow className=" font-bold">
                        <TableHead colSpan={2} className="pl-4 text-center">
                          Fiche de Contre-Référence
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      <TableRow className="">
                        <TableCell className="font-bold pl-4 whitespace-nowrap">
                          Structure {"d'accueil"} :
                        </TableCell>
                        <TableCell className="pr-2">
                          Date {"d'arrivée"} :{" "}
                          {selectedContreReference.dateReception
                            ? new Date(
                                selectedContreReference.dateReception
                              ).toLocaleDateString("fr-FR")
                            : ""}
                        </TableCell>
                      </TableRow>

                      <TableRow className="">
                        <TableCell className="font-bold pl-4 whitespace-nowrap">
                          Service {"d'accueil"} :
                        </TableCell>
                        <TableCell className="pr-2">
                          Numéro de dossier :{" "}
                          {selectedContreReference.numeroDossier ||
                            "_______________"}
                        </TableCell>
                      </TableRow>

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
                          {client?.sexe}
                        </TableCell>
                        <TableCell className="pr-2">
                          {client?.dateNaissance
                            ? new Date().getFullYear() -
                              new Date(client.dateNaissance).getFullYear() +
                              " ans"
                            : "Âge inconnu"}
                        </TableCell>
                      </TableRow>

                      <TableRow className="">
                        <TableCell className="font-bold pl-4 whitespace-nowrap">
                          Diagnostic posé :
                        </TableCell>
                        <TableCell className="pr-2">
                          {selectedContreReference.diagnosticPose || ""}
                        </TableCell>
                      </TableRow>

                      <TableRow className="">
                        <TableCell className="font-bold pl-4 whitespace-nowrap">
                          Patient hospitalisé :
                        </TableCell>
                        <TableCell className="pr-2">
                          {selectedContreReference.patientHospitalise
                            ? "Oui"
                            : "Non"}
                        </TableCell>
                      </TableRow>

                      <TableRow className="">
                        <TableCell className="font-bold pl-4 whitespace-nowrap">
                          Traitement reçu :
                        </TableCell>
                        <TableCell className="pr-2">
                          {selectedContreReference.traitementRecu || ""}
                        </TableCell>
                      </TableRow>

                      <TableRow className="">
                        <TableCell className="font-bold pl-4 whitespace-nowrap">
                          Traitement à suivre :
                        </TableCell>
                        <TableCell className="pr-2">
                          {selectedContreReference.traitementASuivre || ""}
                        </TableCell>
                      </TableRow>

                      {selectedContreReference.ivaBilan && (
                        <TableRow className="">
                          <TableCell className="font-bold pl-4 whitespace-nowrap">
                            Bilan IVA réalisé :
                          </TableCell>
                          <TableCell className="pr-2">
                            {selectedContreReference.ivaBilan}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>

                    <TableFooter className="bg-muted/50">
                      <TableRow>
                        <TableCell
                          // colSpan={2}
                          className="p-4  font-medium flex flex-row justify-between items-center"
                        >
                          <span>
                            {selectedContreReference.qualification} :{" "}
                            {selectedContreReference.nomPrenomPrestataire}
                          </span>{" "}
                          <span>
                            Tel: {selectedContreReference.telPrestataire}
                          </span>
                        </TableCell>
                        <TableCell className="pt-4">
                          {" "}
                          Date de sortie :{" "}
                          {selectedContreReference.dateSortie &&
                            new Date(
                              selectedContreReference.dateSortie
                            ).toLocaleDateString("fr-FR")}
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
                    Imprimer la Contre-Référence
                  </Button>
                  <Button onClick={handleUpdate} className="w-full sm:w-auto">
                    Modifier
                  </Button>
                  <Button
                    onClick={() => {
                      router.push(`/fiches/${contreReferenceId}`);
                    }}
                    className="w-full sm:w-auto"
                  >
                    Retour
                  </Button>
                  <Button
                    onClick={handleDeleteContreReference}
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
