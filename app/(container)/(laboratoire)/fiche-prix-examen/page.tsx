"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Check,
  ChevronsUpDown,
  Pencil,
  Trash2,
  Plus,
  X,
  Search,
  FlaskConical,
  Filter,
  FilterX,
  CircleDollarSign,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";

import {
  Clinique,
  Examen,
  TableName,
  TarifExamen,
  TypeExamen,
} from "@prisma/client";
import {
  createTarifExamen,
  updateTarifExamen,
  deleteTarifExamen,
  getAllTarifExamen,
} from "@/lib/actions/tarifExamenActions";
import { getAllExamen } from "@/lib/actions/examenActions";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";

const typeExamenLabels: Record<TypeExamen, string> = {
  MEDECIN: "Médecine Gén.",
  GYNECOLOGIE: "Gynécologie",
  OBSTETRIQUE: "Obstétrique",
  VIH: "VIH",
  IST: "IST",
};

const typeExamenColors: Record<TypeExamen, string> = {
  MEDECIN: "bg-green-100 text-green-800 border-green-200",
  GYNECOLOGIE: "bg-purple-100 text-purple-800 border-purple-200",
  OBSTETRIQUE: "bg-pink-100 text-pink-800 border-pink-200",
  VIH: "bg-red-100 text-red-800 border-red-200",
  IST: "bg-orange-100 text-orange-800 border-orange-200",
};

export default function TarificationExamen() {
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [examens, setExamens] = useState<Examen[]>([]);
  const [tarifExamens, setTarifExamens] = useState<TarifExamen[]>([]);
  const [cliniques, setCliniques] = useState<Clinique[]>([]);
  const [selectedCliniques, setSelectedCliniques] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const router = useRouter();
  const {
    canCreate,
    canUpdate,
    canDelete,
    canRead,
    isLoading: isLoadingPermissions,
  } = usePermissionContext();

  // Filtrage combine (recherche + clinique)
  const filteredTarifExamens = useMemo(() => {
    return tarifExamens.filter((tarif) => {
      const matchClinique =
        selectedCliniques.length === 0 ||
        selectedCliniques.includes(tarif.idClinique);
      const matchSearch =
        !searchTerm ||
        tarif.nomExamen.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nomCliniques(tarif.idClinique)
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());
      return matchClinique && matchSearch;
    });
  }, [tarifExamens, selectedCliniques, searchTerm, cliniques]);

  useEffect(() => {
    const fetchData = async () => {
      const [examenData, tarifData, cliniqueData] = await Promise.all([
        getAllExamen(),
        getAllTarifExamen(),
        getAllClinique(),
      ]);
      setExamens(examenData);
      setTarifExamens(tarifData);
      setCliniques(cliniqueData);
    };
    fetchData();
  }, []);

  const nameExamens = (idExamen: string) => {
    return (
      examens.find((e) => e.id === idExamen)?.nomExamen ||
      "Examen introuvable"
    );
  };

  const getTypeForTarif = (tarif: TarifExamen): TypeExamen | undefined => {
    return examens.find((e) => e.id === tarif.idExamen)?.typeExamen;
  };

  function nomCliniques(idClinique: string) {
    return (
      cliniques.find((c) => c.id === idClinique)?.nomClinique ||
      "Clinique introuvable"
    );
  }

  const form = useForm<TarifExamen>();

  // Examens disponibles pour la clinique selectionnee (exclure les doublons)
  const selectedClinique = form.watch("idClinique");
  const availableExamens = useMemo(() => {
    if (!selectedClinique) return examens;
    const existingExamenIds = new Set(
      tarifExamens
        .filter((t) => t.idClinique === selectedClinique)
        .map((t) => t.idExamen)
    );
    // En mode modification, ne pas exclure l'examen en cours d'edition
    if (isUpdating) {
      const editingTarif = tarifExamens.find(
        (t) => t.id === form.getValues("id")
      );
      if (editingTarif) existingExamenIds.delete(editingTarif.idExamen);
    }
    return examens.filter((e) => !existingExamenIds.has(e.id));
  }, [examens, tarifExamens, selectedClinique, isUpdating]);

  useEffect(() => {
    form.setValue("idUser", idUser);
  }, [idUser, form]);

  const onSubmit = async (data: TarifExamen) => {
    const formattedData = {
      ...data,
      idUser,
      nomExamen: nameExamens(form.watch("idExamen")) ?? "",
      prixExamen: parseInt(data.prixExamen as unknown as string),
    };
    try {
      if (isUpdating) {
        await updateTarifExamen(data.id, formattedData);
        toast.success("Tarif mis à jour avec succès !");
        setIsUpdating(false);
      } else {
        await createTarifExamen(formattedData);
        toast.success("Tarif ajouté avec succès !");
      }
      const updatedTarif = await getAllTarifExamen();
      setTarifExamens(updatedTarif);
      form.reset();
      setIsVisible(false);
    } catch (error) {
      toast.error("La tarification a échoué !");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete(TableName.TARIF_EXAMEN)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_DELETE);
      return;
    }
    try {
      await deleteTarifExamen(id);
      setTarifExamens(tarifExamens.filter((t) => t.id !== id));
      toast.success("Tarif supprimé avec succès !");
    } catch (error) {
      toast.error("Erreur lors de la suppression du tarif");
      console.error(error);
    }
  };

  const handleUpdateExamen = (id: string) => {
    if (!canUpdate(TableName.TARIF_EXAMEN)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_UPDATE);
      return;
    }
    const tarif = tarifExamens.find((t) => t.id === id);
    if (tarif) {
      setIsUpdating(true);
      form.setValue("id", tarif.id);
      form.setValue("idExamen", tarif.idExamen);
      form.setValue("idClinique", tarif.idClinique);
      form.setValue("prixExamen", tarif.prixExamen);
      setIsVisible(true);
    }
  };

  const handleCancelForm = () => {
    form.reset();
    setIsUpdating(false);
    setIsVisible(false);
  };

  const handleOpenForm = () => {
    if (!canCreate(TableName.TARIF_EXAMEN)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }
    form.reset();
    setIsUpdating(false);
    setIsVisible(true);
  };

  if (isLoadingPermissions)
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  if (!canRead(TableName.TARIF_EXAMEN)) {
    toast.error(ERROR_MESSAGES.PERMISSION_DENIED_READ);
    router.back();
    return null;
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto p-4">
      {/* ===== EN-TETE ===== */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <CircleDollarSign className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Tarification des examens
            </h1>
            <p className="text-sm text-gray-500">
              {tarifExamens.length} tarif
              {tarifExamens.length > 1 ? "s" : ""} enregistré
              {tarifExamens.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {!isVisible && (
          <Button onClick={handleOpenForm} className="gap-2">
            <Plus size={16} />
            Nouveau tarif
          </Button>
        )}
      </div>

      {/* ===== FORMULAIRE ===== */}
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Card className="border-blue-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {isUpdating ? "Modifier le tarif" : "Nouveau tarif"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* 1. Clinique (d'abord) */}
                      <FormField
                        control={form.control}
                        name="idClinique"
                        rules={{ required: "La clinique est obligatoire" }}
                        render={({ field, fieldState }) => (
                          <FormItem>
                            <FormLabel className="font-medium">
                              Clinique
                            </FormLabel>
                            <Select
                              required
                              onValueChange={(val) => {
                                field.onChange(val);
                                // Reinitialiser l'examen si deja tarifie pour cette clinique
                                const currentExamen =
                                  form.getValues("idExamen");
                                if (currentExamen) {
                                  const willBeExcluded = tarifExamens.some(
                                    (t) =>
                                      t.idClinique === val &&
                                      t.idExamen === currentExamen
                                  );
                                  if (willBeExcluded)
                                    form.setValue("idExamen", "");
                                }
                              }}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {cliniques.map((clinique) => (
                                  <SelectItem
                                    key={clinique.id}
                                    value={clinique.id}
                                  >
                                    {clinique.nomClinique}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {fieldState.error && (
                              <FormMessage>
                                {fieldState.error.message}
                              </FormMessage>
                            )}
                          </FormItem>
                        )}
                      />

                      {/* 2. Examen (combobox, desactive sans clinique) */}
                      <FormField
                        control={form.control}
                        name="idExamen"
                        rules={{ required: "L'examen est obligatoire" }}
                        render={({ field, fieldState }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="font-medium">
                              Examen
                            </FormLabel>
                            <Popover open={open} onOpenChange={setOpen}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    disabled={!selectedClinique}
                                    className={cn(
                                      "w-full justify-between",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {!selectedClinique
                                      ? "Choisir une clinique d'abord"
                                      : field.value
                                        ? examens.find(
                                            (e) => e.id === field.value
                                          )?.nomExamen
                                        : "Sélectionner..."}
                                    <ChevronsUpDown className="opacity-50 h-4 w-4 ml-2" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 p-0">
                                <Command>
                                  <CommandInput
                                    placeholder="Rechercher..."
                                    className="h-9"
                                  />
                                  <CommandList>
                                    <CommandEmpty>
                                      Aucun examen disponible.
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {availableExamens.map((examen) => (
                                        <CommandItem
                                          value={examen.nomExamen}
                                          key={examen.id}
                                          onSelect={() => {
                                            form.setValue(
                                              "idExamen",
                                              examen.id
                                            );
                                            setOpen(false);
                                          }}
                                        >
                                          <div className="flex items-center gap-2 flex-1">
                                            <Badge
                                              variant="outline"
                                              className={`text-[10px] px-1.5 py-0 ${typeExamenColors[examen.typeExamen]}`}
                                            >
                                              {examen.typeExamen}
                                            </Badge>
                                            <span className="text-sm">
                                              {examen.nomExamen}
                                            </span>
                                          </div>
                                          <Check
                                            className={cn(
                                              "ml-auto h-4 w-4",
                                              examen.id === field.value
                                                ? "opacity-100"
                                                : "opacity-0"
                                            )}
                                          />
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                            {fieldState.error && (
                              <FormMessage>
                                {fieldState.error.message}
                              </FormMessage>
                            )}
                          </FormItem>
                        )}
                      />

                      {/* 3. Prix */}
                      <FormField
                        control={form.control}
                        name="prixExamen"
                        rules={{ required: "Le tarif est obligatoire" }}
                        render={({ field, fieldState }) => (
                          <FormItem>
                            <FormLabel className="font-medium">
                              Prix (CFA)
                            </FormLabel>
                            <FormControl>
                              <Input
                                required
                                type="number"
                                placeholder="Ex: 5000"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            {fieldState.error && (
                              <FormMessage>
                                {fieldState.error.message}
                              </FormMessage>
                            )}
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Hidden fields */}
                    <FormField
                      control={form.control}
                      name="idUser"
                      render={({ field }) => (
                        <FormItem className="hidden">
                          <FormControl>
                            <Input {...field} value={idUser} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="nomExamen"
                      render={({ field }) => (
                        <FormItem className="hidden">
                          <FormControl>
                            <Input
                              value={field.value ?? ""}
                              onChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelForm}
                      >
                        <X size={16} className="mr-1" />
                        Annuler
                      </Button>
                      <Button
                        type="submit"
                        disabled={form.formState.isSubmitting}
                      >
                        {form.formState.isSubmitting
                          ? "En cours..."
                          : isUpdating
                            ? "Mettre à jour"
                            : "Enregistrer"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== RECHERCHE + FILTRE CLINIQUE ===== */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher par nom ou clinique..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchTerm("")}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-1.5 h-9",
                selectedCliniques.length > 0 &&
                  "border-blue-300 bg-blue-50 text-blue-700"
              )}
            >
              {selectedCliniques.length > 0 ? (
                <>
                  <FilterX className="h-3.5 w-3.5" />
                  {selectedCliniques.length} clinique
                  {selectedCliniques.length > 1 ? "s" : ""}
                </>
              ) : (
                <>
                  <Filter className="h-3.5 w-3.5" />
                  Filtrer par clinique
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0">
            <Command>
              <CommandInput placeholder="Rechercher une clinique..." />
              <CommandList>
                <CommandEmpty>Aucune clinique trouvée.</CommandEmpty>
                <CommandGroup>
                  {selectedCliniques.length > 0 && (
                    <CommandItem
                      onSelect={() => setSelectedCliniques([])}
                      className="text-red-500 text-xs"
                    >
                      <X className="mr-2 h-3 w-3" />
                      Effacer les filtres
                    </CommandItem>
                  )}
                  {cliniques.map((clinique) => (
                    <CommandItem
                      key={clinique.id}
                      value={clinique.nomClinique}
                      onSelect={() => {
                        if (selectedCliniques.includes(clinique.id)) {
                          setSelectedCliniques(
                            selectedCliniques.filter(
                              (id) => id !== clinique.id
                            )
                          );
                        } else {
                          setSelectedCliniques([
                            ...selectedCliniques,
                            clinique.id,
                          ]);
                        }
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedCliniques.includes(clinique.id)
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {clinique.nomClinique}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* ===== TABLEAU ===== */}
      <Card className="shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="w-12 text-center font-semibold">
                N°
              </TableHead>
              <TableHead className="font-semibold">Examen</TableHead>
              <TableHead className="w-28 font-semibold">Spécialité</TableHead>
              <TableHead className="w-32 text-right font-semibold">
                Tarif
              </TableHead>
              <TableHead className="font-semibold">Clinique</TableHead>
              <TableHead className="w-24 text-center font-semibold">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTarifExamens.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-12 text-gray-400"
                >
                  <FlaskConical className="mx-auto h-10 w-10 mb-2 opacity-30" />
                  {searchTerm || selectedCliniques.length > 0
                    ? "Aucun tarif ne correspond aux filtres."
                    : "Aucun tarif enregistré."}
                </TableCell>
              </TableRow>
            ) : (
              filteredTarifExamens.map((tarif, index) => {
                const examenType = getTypeForTarif(tarif);
                return (
                  <TableRow
                    key={tarif.id}
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    <TableCell className="text-center text-gray-400 text-sm">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {tarif.nomExamen}
                    </TableCell>
                    <TableCell>
                      {examenType && (
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-semibold ${typeExamenColors[examenType]}`}
                        >
                          {typeExamenLabels[examenType]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-sm">
                      {tarif.prixExamen.toLocaleString("fr-FR")} CFA
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {nomCliniques(tarif.idClinique)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleUpdateExamen(tarif.id)}
                        >
                          <Pencil size={14} />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Confirmer la suppression
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible. Le tarif de{" "}
                                <span className="font-semibold">
                                  {tarif.nomExamen}
                                </span>{" "}
                                sera définitivement supprimé.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => handleDelete(tarif.id)}
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {filteredTarifExamens.length > 0 && (
          <div className="px-4 py-2 border-t bg-gray-50/50 text-xs text-gray-400 text-right">
            {filteredTarifExamens.length} résultat
            {filteredTarifExamens.length > 1 ? "s" : ""}
            {(searchTerm || selectedCliniques.length > 0) &&
              ` sur ${tarifExamens.length}`}
          </div>
        )}
      </Card>
    </div>
  );
}
