"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import {
  createReference,
  deleteReference,
  getAllReferenceByIdClient,
  updateReference,
} from "@/lib/actions/referenceActions";
import { Reference, TableName } from "@prisma/client";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useReactToPrint } from "react-to-print";
import { Square, Loader2 } from "lucide-react";
import { createRecapVisite, removeFormulaireFromRecap } from "@/lib/actions/recapActions";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import type { SharedFormProps } from "./types";

const TabMotifReference = [
  { value: "TB", label: "TB" },
  { value: "Palu grave", label: "Palu grave" },
  { value: "Accouchement", label: "Accouchement" },
  { value: "Suspicion cancer col", label: "Suspicion cancer col" },
  { value: "Suspicion cancer sein", label: "Suspicion cancer sein" },
  { value: "Autre", label: "Autre" },
];

const TabStructureReference = [
  { value: "HG", label: "HG" },
  { value: "CHR", label: "CHR" },
  { value: "CHU", label: "CHU" },
  { value: "CAT", label: "CAT" },
  { value: "Maternité", label: "Maternité" },
  { value: "Centre social", label: "Centre social" },
];

const TabQualification = [
  { value: "Infirmier(e)", label: "Infirmier(e)" },
  { value: "Médecin", label: "Médecin" },
  { value: "Sage-femme", label: "Sage-femme" },
  { value: "Autre", label: "Autre" },
];

export default function ReferenceForm({
  clientId,
  visites,
  allPrescripteur,
  isPrescripteur,
  client,
  idUser,
}: SharedFormProps) {
  const [idReference, setIdReference] = useState<string>();
  const [tabReference, setTabReference] = useState<Reference[]>([]);
  const [selectedReference, setSelectedReference] = useState<Reference | null>(
    null
  );
  const [selectedVisite, setSelectedVisite] = useState<string>();
  const [showForm, setShowForm] = useState(true);
  const [isUpdated, setIsUpdated] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const router = useRouter();

  const { canCreate, canUpdate, canDelete } = usePermissionContext();

  // Chargement initial : référence data (form-specific)
  useEffect(() => {
    if (!clientId) return;

    const fetchReferenceData = async () => {
      try {
        setIsLoadingData(true);
        const allRefByClient = await getAllReferenceByIdClient(clientId);
        setTabReference(allRefByClient as Reference[]);
      } catch (error) {
        console.error("Erreur lors du chargement des références:", error);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchReferenceData();
  }, [clientId]);

  const form = useForm<Reference>({
    defaultValues: {
      consultation: true,
      motifReference: "",
      autreMotif: "",
      structureReference: "",
      service: "",
      soinsRecu: "",
      ivaGestite: 0,
      ivaParite: 0,
      ivaLesionLargeDuCol: false,
      ivaAutre: false,
      ivaLesionSuspectDuCol: false,
      ivaRealisee: false,
      ivaResultat: false,
      observations: "",
      nomPrenomReferant: "",
      telReferant: "",
      qualification: "",
      refIdVisite: "",
      idClient: clientId,
      idUser: isPrescripteur === true ? idUser || "" : "",
      examenClinique: "",
      antecedentMedicaux: "",
      allergies: "",
      diagnosticPropose: "",
      depuisQuand: null,
      dateReference: new Date(),
    },
  });

  const motifReference = useWatch({ control: form.control, name: "motifReference" });
  const showIvaFields = motifReference === "Suspicion cancer col";
  const showAutreMotif = motifReference === "Autre";

  const getReferenceByIdVisite = useCallback(
    (idVisite: string) => {
      const ref = tabReference.find((r) => r.refIdVisite === idVisite);
      if (ref) {
        setShowForm(false);
        setIdReference(ref.id);
        setSelectedReference(ref);
      } else {
        setShowForm(true);
        setSelectedReference(null);
        form.reset({
          consultation: true,
          motifReference: "",
          autreMotif: "",
          structureReference: "",
          service: "",
          soinsRecu: "",
          ivaGestite: 0,
          ivaParite: 0,
          ivaLesionLargeDuCol: false,
          ivaAutre: false,
          ivaLesionSuspectDuCol: false,
          ivaRealisee: false,
          ivaResultat: false,
          observations: "",
          nomPrenomReferant: "",
          telReferant: "",
          qualification: "",
          refIdVisite: idVisite,
          dateReference: new Date(),
          depuisQuand: null,
          idClinique: client?.idClinique || "",
        });
      }
    },
    [tabReference, form, client]
  );

  useEffect(() => {
    form.setValue("idClient", clientId);
  }, [clientId, form]);

  // Quand selectedVisite change, on recupere la reference associee
  useEffect(() => {
    if (selectedVisite) {
      getReferenceByIdVisite(selectedVisite);
      form.setValue("refIdVisite", selectedVisite);
    }
  }, [selectedVisite, getReferenceByIdVisite, form]);

  const onSubmit: SubmitHandler<Reference> = async (data) => {
    if (!canCreate(TableName.REFERENCE)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }
    const formattedData = {
      id: crypto.randomUUID(),
      consultation: data.consultation,
      motifReference: data.motifReference,
      autreMotif: data.autreMotif || "",
      structureReference: data.structureReference,
      service: data.service || "",
      soinsRecu: data.soinsRecu || "",
      ivaGestite: data.ivaGestite || 0,
      ivaParite: data.ivaParite || 0,
      ivaLesionLargeDuCol: data.ivaLesionLargeDuCol || false,
      ivaAutre: data.ivaAutre || false,
      ivaLesionSuspectDuCol: data.ivaLesionSuspectDuCol || false,
      ivaRealisee: data.ivaRealisee || false,
      ivaResultat: data.ivaResultat || false,
      observations: data.observations || "",
      nomPrenomReferant:
        allPrescripteur.find((p) => p.id === data.idUser)?.name || "",
      telReferant: data.telReferant,
      qualification: data.qualification,
      refIdVisite: data.refIdVisite,
      idClient: data.idClient,
      idUser: data.idUser,
      dateReference: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      examenClinique: data.examenClinique || "",
      antecedentMedicaux: data.antecedentMedicaux || "",
      allergies: data.allergies || "",
      diagnosticPropose: data.diagnosticPropose || "",
      depuisQuand: data.depuisQuand || null,
      idClinique: client?.idClinique || "",
    };

    try {
      if (isUpdated && idReference) {
        const updatedList = await updateReference(idReference, formattedData);
        setSelectedReference(updatedList);
        setIsUpdated(false);
        setShowForm(false);
        toast.success("Référence modifiée avec succès!");
        return;
      } else {
        await createReference(formattedData);
        await createRecapVisite({
          idVisite: formattedData.refIdVisite,
          idClient: clientId,
          prescripteurs: [],
          formulaires: ["19 Fiche Référence"],
        });
        toast.success("Référence créée avec succès!");
        const updatedList = await getAllReferenceByIdClient(clientId);
        setTabReference(updatedList);
        getReferenceByIdVisite(selectedVisite || "");
      }
    } catch (error) {
      toast.error("La création de la référence a échoué");
      console.error("Erreur lors de la création de la référence:", error);
    }
  };

  // ================== Fonction de modification ==================
  const handleUpdate = () => {
    if (!canUpdate(TableName.REFERENCE)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_UPDATE);
      return;
    }
    if (selectedReference) {
      form.reset({
        consultation: selectedReference.consultation ?? true,
        motifReference: selectedReference.motifReference ?? "",
        autreMotif: selectedReference.autreMotif ?? "",
        structureReference: selectedReference.structureReference ?? "",
        service: selectedReference.service ?? "",
        soinsRecu: selectedReference.soinsRecu ?? "",
        ivaGestite: selectedReference.ivaGestite ?? 0,
        ivaParite: selectedReference.ivaParite ?? 0,
        ivaLesionLargeDuCol: selectedReference.ivaLesionLargeDuCol ?? false,
        ivaAutre: selectedReference.ivaAutre ?? false,
        ivaLesionSuspectDuCol: selectedReference.ivaLesionSuspectDuCol ?? false,
        ivaRealisee: selectedReference.ivaRealisee ?? false,
        ivaResultat: selectedReference.ivaResultat ?? false,
        observations: selectedReference.observations ?? "",
        depuisQuand: selectedReference.depuisQuand ?? null,
        examenClinique: selectedReference.examenClinique ?? "",
        antecedentMedicaux: selectedReference.antecedentMedicaux ?? "",
        allergies: selectedReference.allergies ?? "",
        diagnosticPropose: selectedReference.diagnosticPropose ?? "",
        nomPrenomReferant: selectedReference.nomPrenomReferant ?? "",
        telReferant: selectedReference.telReferant ?? "",
        qualification: selectedReference.qualification ?? "",
        refIdVisite: selectedReference.refIdVisite ?? "",
        idClient: selectedReference.idClient ?? clientId,
        idUser:
          selectedReference.idUser ??
          (isPrescripteur === true ? idUser || "" : ""),
        dateReference: selectedReference.dateReference ?? new Date(),
        idClinique: selectedReference?.idClinique || "",
      });
    }
    setShowForm(true);
    setSelectedReference(null);
    setIsUpdated(true);
  };

  // ================== Impression en paysage ==================
  const contentRef = useRef<HTMLDivElement>(null);
  const reactToPrintFn = useReactToPrint({ contentRef });

  const handleDeleteReference = async () => {
    if (!canDelete(TableName.REFERENCE)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_DELETE);
      return;
    }
    if (!idReference) return;
    const confirmDelete = window.confirm(
      "Êtes-vous sûr de vouloir supprimer cette référence ? Cette action est irréversible."
    );
    if (!confirmDelete) return;

    try {
      await deleteReference(idReference);
      toast.success("Référence supprimée avec succès!");
      const updatedList = await getAllReferenceByIdClient(clientId);
      setTabReference(updatedList);
      if (selectedVisite && !updatedList.some((r: Reference) => r.refIdVisite === selectedVisite)) {
        await removeFormulaireFromRecap(selectedVisite, "19 Fiche Référence");
      }
    } catch (error) {
      toast.error("La suppression de la référence a échoué");
      console.error("Erreur lors de la suppression de la référence:", error);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex flex-col justify-center items-center max-w-4xl mx-auto px-4 py-12 border border-blue-200/60 rounded-md">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-2 text-sm text-muted-foreground">Chargement des références...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center max-w-4xl mx-auto px-4 py-2 border border-blue-200/60 rounded-md">
      <div className="flex flex-justify-start items-center gap-2 pt-2">
        <div className="flex flex-col space-y-2  items-center gap-2 mx-auto">
          <Select value={selectedVisite} onValueChange={setSelectedVisite}>
            <SelectTrigger
              id="visite"
              className="border rounded-lg px-4 py-2"
            >
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
                <h2 className="text-2xl text-blue-900 font-black text-center">
                  Formulaire de Référence
                </h2>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-2 max-w-6xl rounded-sm mx-auto px-4 py-2 bg-white shadow-md shadow-blue-100/30 border border-blue-200/50"
                >
                  {/* Sélection de la visite */}
                  <div className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md hidden">
                    <FormField
                      control={form.control}
                      name="refIdVisite"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-medium">
                            Selectionnez la visite
                          </FormLabel>
                          <Select
                            required
                            value={selectedVisite}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Visite à sélectionner" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {visites.map((visite) => (
                                <SelectItem key={visite.id} value={visite.id}>
                                  {new Date(
                                    visite.dateVisite
                                  ).toLocaleDateString("fr-FR")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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

                  {/* Motif de référence */}
                  <div className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md ">
                    <FormField
                      control={form.control}
                      name="motifReference"
                      render={({ field }) => (
                        <FormItem className="pb-4">
                          <FormLabel className="text-xl font-bold">
                            Motif de référence :
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value || ""}
                              className="grid grid-cols-2 gap-4 mt-2"
                              required
                            >
                              {TabMotifReference.map((option) => (
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

                    {/* Champ Autre Motif animé */}
                    <AnimatePresence>
                      {showAutreMotif && (
                        <motion.div
                          key="autreMotif"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <FormField
                            control={form.control}
                            name="autreMotif"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  {"Précisez l'autre motif :"}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    value={field.value ?? ""}
                                    placeholder="Autre motif de référence"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Structure de référence */}
                  <div className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md ">
                    <FormField
                      control={form.control}
                      name="structureReference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-medium">
                            Structure de référence
                          </FormLabel>
                          <Select
                            required
                            value={field.value || ""}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Structure à sélectionner" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TabStructureReference.map((structure) => (
                                <SelectItem
                                  key={structure.value}
                                  value={structure.value}
                                >
                                  {structure.label}
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
                      name="service"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Service spécifique :</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              placeholder="Service de référence"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Informations médicales */}
                  <AnimatePresence>
                    {showIvaFields === false && (
                      <motion.div
                        key="ivaFields"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.4 }}
                        className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md bg-blue-50"
                      >
                        <div className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md ">
                          <Label className="flex justify-center text-lg font-bold text-gray-800 mb-4">
                            Informations Médicales
                          </Label>

                          <FormField
                            control={form.control}
                            name="examenClinique"
                            render={({ field }) => (
                              <FormItem className="mt-4">
                                <FormLabel>Examen clinique :</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    value={field.value ?? ""}
                                    placeholder="Résultats de l'examen clinique"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="antecedentMedicaux"
                            render={({ field }) => (
                              <FormItem className="mt-4">
                                <FormLabel>Antécédents médicaux :</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    value={field.value ?? ""}
                                    placeholder="Antécédents médicaux du patient"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="allergies"
                            render={({ field }) => (
                              <FormItem className="mt-4">
                                <FormLabel>Allergies :</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    value={field.value ?? ""}
                                    placeholder="Allergies connues du patient"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="diagnosticPropose"
                            render={({ field }) => (
                              <FormItem className="mt-4">
                                <FormLabel>Diagnostic proposé :</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    value={field.value ?? ""}
                                    placeholder="Diagnostic suspecté ou proposé"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Soins reçus et durée */}
                        <div className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md ">
                          <Label className="flex justify-center text-lg font-bold text-gray-800 mb-4">
                            Soins Déjà Reçus
                          </Label>

                          <FormField
                            control={form.control}
                            name="soinsRecu"
                            render={({ field }) => (
                              <FormItem className="mt-4">
                                <FormLabel>Soins reçus :</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    value={field.value ?? ""}
                                    placeholder="Soins déjà reçus par le patient"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="depuisQuand"
                            render={({ field }) => (
                              <FormItem className="mt-4">
                                <FormLabel>Depuis quand :</FormLabel>
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

                        {/* Section IVA animée */}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {showIvaFields && (
                      <motion.div
                        key="ivaFields"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.4 }}
                        className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md bg-blue-50"
                      >
                        <Label className="flex justify-center text-lg font-bold text-blue-800">
                          Informations IVA
                        </Label>

                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <FormField
                            control={form.control}
                            name="ivaGestite"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Gestité :</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    value={field.value ?? 0}
                                    onChange={(e) =>
                                      field.onChange(
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="ivaParite"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Parité :</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    value={field.value ?? 0}
                                    onChange={(e) =>
                                      field.onChange(
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <Separator className="my-4" />

                        <Label className="font-medium">Résultats IVA :</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <FormField
                            control={form.control}
                            name="ivaLesionLargeDuCol"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value || false}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="font-normal">
                                    Lésion large du col
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="ivaLesionSuspectDuCol"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value || false}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="font-normal">
                                    Lésion suspecte du col
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="ivaAutre"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value || false}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="font-normal">
                                    Autre lésion
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="ivaRealisee"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value || false}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="font-normal">
                                    IVA réalisée
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="ivaResultat"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value || false}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="font-normal">
                                    Résultat positif
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Observations */}
                  <div className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md ">
                    <FormField
                      control={form.control}
                      name="observations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {showIvaFields
                              ? "Constation clinique : "
                              : "Observations :"}{" "}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value ?? ""}
                              placeholder="Observations supplémentaires"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Informations du référent */}
                  <div className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md ">
                    <div className="grid grid-cols-2 gap-4">
                      {isPrescripteur === true ? (
                        <FormField
                          control={form.control}
                          name="idUser"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={idUser}
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

                      <FormField
                        control={form.control}
                        name="telReferant"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Téléphone du référent :</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Numéro de téléphone"
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
                                <SelectTrigger className="w-45">
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

                      {/* Champ date de référence */}
                      <FormField
                        control={form.control}
                        name="dateReference"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date de référence :</FormLabel>
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

                  {/* Champs cachés */}
                  <FormField
                    control={form.control}
                    name="idClient"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} className="hidden" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-4 print:hidden">
                    <Button type="submit" className="mt-4 flex-1" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting
                        ? "En cours..."
                        : isUpdated
                        ? "Mettre à jour la référence"
                        : "Soumettre la référence"}
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
              <div
                className="flex flex-col gap-4 p-6 border border-blue-200/50 rounded-md shadow-md shadow-blue-100/30 bg-white my-4"
                ref={contentRef}
              >
                {selectedReference !== null && (
                  <Table className="mx-1">
                    <TableHeader>
                      <TableRow className="">
                        <TableHead
                          colSpan={2}
                          className="border-r pr-4 text-center"
                        >
                          <Image
                            src="/LOGO_AIBEF_IPPF.png"
                            alt="Logo"
                            width={400}
                            height={10}
                            style={{ margin: "auto" }}
                            className="mx-auto"
                          />
                        </TableHead>
                        <TableHead colSpan={2} className="pl-4 text-center">
                          <Image
                            src="/LOGO_AIBEF_IPPF.png"
                            alt="Logo"
                            width={400}
                            height={10}
                            style={{ margin: "auto" }}
                            className="mx-auto"
                          />
                        </TableHead>
                      </TableRow>
                      <TableRow className=" font-bold">
                        <TableHead
                          colSpan={2}
                          className="border-r pr-4 text-center"
                        >
                          Fiche de Référence
                        </TableHead>
                        <TableHead colSpan={2} className="pl-4 text-center">
                          Fiche de contre Référence
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      <TableRow className="">
                        <TableCell className="font-bold pr-2 whitespace-nowrap">
                          Structure de référence :
                        </TableCell>
                        <TableCell className="border-r pr-4">
                          {selectedReference.structureReference}
                        </TableCell>
                        <TableCell className="font-bold pl-4 whitespace-nowrap">
                          Structure {"d'accueil"} :
                        </TableCell>
                        <TableCell className="pr-2">
                          Date {"d'arrivée"} :_______________
                        </TableCell>
                      </TableRow>

                      <TableRow className="">
                        <TableCell className="font-bold pr-2 whitespace-nowrap">
                          Dans le Service :
                        </TableCell>
                        <TableCell className="border-r pr-4">
                          {selectedReference.service}
                        </TableCell>
                        <TableCell className="font-bold pl-4 whitespace-nowrap">
                          Service {"d'accueil"} :
                        </TableCell>
                        <TableCell className="pr-2">
                          {"_____________________"}
                        </TableCell>
                      </TableRow>

                      <TableRow className="">
                        <TableCell className="font-bold pr-2 whitespace-nowrap">
                          Nom et Prénom du patient :
                        </TableCell>
                        <TableCell className="border-r pr-4">
                          {client?.nom} {client?.prenom}
                        </TableCell>
                        <TableCell className="font-bold pl-4 whitespace-nowrap">
                          Nom et Prénom du patient :
                        </TableCell>
                        <TableCell className="pr-2">
                          {client?.nom} {client?.prenom}
                        </TableCell>
                      </TableRow>

                      <TableRow className="">
                        <TableCell className="font-bold pr-2 whitespace-nowrap">
                          {client?.sexe}
                        </TableCell>
                        <TableCell className="border-r pr-4">
                          {client?.dateNaissance
                            ? new Date().getFullYear() -
                              new Date(client.dateNaissance).getFullYear() +
                              " ans"
                            : "Âge inconnu"}
                        </TableCell>
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
                        <TableCell className="font-bold pr-2 whitespace-nowrap">
                          Motif de référence :
                        </TableCell>
                        <TableCell className="border-r pr-4">
                          {selectedReference.motifReference}
                        </TableCell>
                        <TableCell className="font-bold pl-4 whitespace-nowrap">
                          Numéro de dossier :
                        </TableCell>
                        <TableCell className="pr-2">
                          {"_____________________"}
                        </TableCell>
                      </TableRow>

                      {/* Section IVA conditionnelle */}
                      {selectedReference.motifReference ===
                      "Suspicion cancer col" ? (
                        <>
                          <TableRow className="">
                            <TableCell className="font-bold pr-2 whitespace-nowrap">
                              Gestité : {selectedReference.ivaGestite}
                            </TableCell>
                            <TableCell className="border-r pr-4">
                              Parité : {selectedReference.ivaParite}
                            </TableCell>
                            <TableCell className="font-bold pl-4 whitespace-nowrap ">
                              Bilan réalisé :
                            </TableCell>
                            <TableCell className="pr-2 flex justify-between">
                              LEEP <Square /> Biopsie <Square /> Autre{" "}
                              <Square />
                            </TableCell>
                          </TableRow>
                          <TableRow className="">
                            <TableCell className="font-bold pr-2 whitespace-nowrap">
                              IVA réalisée :{" "}
                              {selectedReference.ivaRealisee ? "Oui" : "Non"}
                            </TableCell>
                            <TableCell className="border-r pr-4">
                              Résultat :{" "}
                              {selectedReference.ivaRealisee === true
                                ? selectedReference.ivaResultat
                                  ? "Positif"
                                  : "Négatif"
                                : "Non réalisé"}
                            </TableCell>
                            <TableCell className="font-bold pl-4 whitespace-nowrap">
                              Diagnostique retenu :{"___________________"}
                            </TableCell>
                            <TableCell className="pr-2">
                              {"________________________"}
                            </TableCell>
                          </TableRow>
                          <TableRow className="">
                            <TableCell className="font-bold pr-2 whitespace-nowrap">
                              Constation clinique :
                            </TableCell>
                            <TableCell className="border-r pr-4">
                              {selectedReference.observations}
                            </TableCell>
                            <TableCell className="font-bold pl-4 whitespace-nowrap">
                              Traitement proposé : {"____________________"}
                            </TableCell>
                            <TableCell className="pr-2">
                              {"________________________"}
                            </TableCell>
                          </TableRow>
                        </>
                      ) : (
                        <>
                          <TableRow className="">
                            <TableCell className="font-bold pr-2 whitespace-nowrap">
                              Examen clinique :
                            </TableCell>
                            <TableCell className="border-r pr-4">
                              {selectedReference.examenClinique}
                            </TableCell>
                            <TableCell className="font-bold pl-4 whitespace-nowrap">
                              Diagnostic posé :
                            </TableCell>
                            <TableCell className="pr-2">
                              {"________________________"}
                            </TableCell>
                          </TableRow>

                          <TableRow className="border-none">
                            <TableCell className="font-bold pr-2 whitespace-nowrap">
                              Antécédents Médicaux :
                            </TableCell>
                            <TableCell className="border-r pr-4">
                              {selectedReference.antecedentMedicaux}
                            </TableCell>
                            <TableCell className="font-bold pl-4 whitespace-nowrap">
                              Patient hospitalisé :
                            </TableCell>
                            <TableCell className="pr-2">
                              <span className="flex items-center gap-2">
                                Oui <Square /> Non <Square />
                              </span>
                            </TableCell>
                          </TableRow>

                          <TableRow className="">
                            <TableCell className="font-bold pr-2 whitespace-nowrap">
                              Allergies :
                            </TableCell>
                            <TableCell className="border-r pr-4">
                              {selectedReference.allergies}
                            </TableCell>
                            <TableCell className="font-bold pl-4 whitespace-nowrap">
                              Traitement réçu :{"________________________"}
                            </TableCell>
                            <TableCell className="pr-2">
                              {"_____________________________"}
                            </TableCell>
                          </TableRow>
                          <TableRow className="">
                            <TableCell className="font-bold pr-2 whitespace-nowrap">
                              Diagnostic Proposé :
                            </TableCell>
                            <TableCell className="border-r pr-4">
                              {selectedReference.diagnosticPropose}
                            </TableCell>
                            <TableCell className="font-bold pl-4 whitespace-nowrap">
                              Date de la contre-référence :
                            </TableCell>
                            <TableCell className="pr-2">
                              {/* À remplir avec les données de contre-référence */}
                            </TableCell>
                          </TableRow>

                          <TableRow className="">
                            <TableCell className="font-bold pr-2 whitespace-nowrap">
                              Soins reçus :
                            </TableCell>
                            <TableCell className="border-r pr-4">
                              {selectedReference.soinsRecu}
                            </TableCell>
                            <TableCell className="font-bold pl-4 whitespace-nowrap"></TableCell>
                            <TableCell className="pr-2">
                              {/* À remplir avec les données de contre-référence */}
                            </TableCell>
                          </TableRow>
                        </>
                      )}

                      {selectedReference.depuisQuand !== undefined && (
                        <TableRow className="">
                          <TableCell className="font-bold pr-2 whitespace-nowrap">
                            Patient sous traitement depuis :
                          </TableCell>
                          <TableCell className="border-r pr-4">
                            {selectedReference.depuisQuand &&
                              new Date(
                                selectedReference.depuisQuand
                              ).toLocaleDateString("fr-FR")}
                          </TableCell>
                          <TableCell className="font-bold pl-4 whitespace-nowrap"></TableCell>
                          <TableCell className="pr-2">
                            {/* À remplir avec les données de contre-référence */}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>

                    <TableFooter className="bg-muted/50">
                      <TableRow>
                        <TableCell
                          colSpan={2}
                          className="text-center pt-4 border-r font-medium"
                        >
                          {selectedReference.qualification} :{" "}
                          {selectedReference.nomPrenomReferant}
                        </TableCell>
                        <TableCell
                          colSpan={2}
                          className="pt-4 text-center font-medium"
                        >
                          Médecin responsable : _______________________
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={2} className="text-center pt-4  ">
                          Signature et cachet : _______________________{" "}
                          {"   "} Le :{" "}
                          {selectedReference.dateReference
                            ? new Date(
                                selectedReference.dateReference
                              ).toLocaleString("fr-FR")
                            : "Date inconnue"}
                        </TableCell>
                        <TableCell colSpan={2} className="pt-4 text-center">
                          Signature et cachet : ______________________ Le :
                          _____________________
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
                    Imprimer la Référence
                  </Button>
                  <Button onClick={handleUpdate} className="w-full sm:w-auto">
                    Modifier
                  </Button>
                  <Button
                    onClick={() => {
                      router.push(`/fiches/${clientId}`);
                    }}
                    className="w-full sm:w-auto"
                  >
                    Retour
                  </Button>
                  <Button
                    onClick={handleDeleteReference}
                    className="w-full sm:w-auto"
                    variant="destructive"
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  );
}
