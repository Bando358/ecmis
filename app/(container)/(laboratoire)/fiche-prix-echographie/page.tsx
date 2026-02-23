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
  ScanLine,
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
  Echographie,
  Permission,
  TableName,
  TarifEchographie,
  TypeEchographie,
} from "@prisma/client";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import { useSession } from "next-auth/react";
import { getAllEchographies } from "@/lib/actions/echographieActions";
import {
  createTarifEchographie,
  deleteTarifEchographie,
  getAllTarifEchographie,
  updateTarifEchographie,
} from "@/lib/actions/tarifEchographieActions";
import { useRouter } from "next/navigation";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";

const typeEchographieLabels: Record<TypeEchographie, string> = {
  OBST: "Obstétrique",
  GYN: "Gynécologie",
  INF: "Infertilité",
  MDG: "Médecine Gén.",
  CAR: "Cardiologie",
};

const typeEchographieColors: Record<TypeEchographie, string> = {
  OBST: "bg-pink-100 text-pink-800 border-pink-200",
  GYN: "bg-purple-100 text-purple-800 border-purple-200",
  INF: "bg-blue-100 text-blue-800 border-blue-200",
  MDG: "bg-green-100 text-green-800 border-green-200",
  CAR: "bg-red-100 text-red-800 border-red-200",
};

export default function TarificationEchographie() {
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [echographies, setEchographies] = useState<Echographie[]>([]);
  const [tarifEchographies, setTarifEchographies] = useState<TarifEchographie[]>([]);
  const [cliniques, setCliniques] = useState<Clinique[]>([]);
  const [selectedCliniques, setSelectedCliniques] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [permission, setPermission] = useState<Permission | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const router = useRouter();

  // Filtrage combiné (recherche + clinique)
  const filteredTarifEchographies = useMemo(() => {
    return tarifEchographies.filter((tarif) => {
      const matchClinique =
        selectedCliniques.length === 0 ||
        selectedCliniques.includes(tarif.idClinique);
      const matchSearch =
        !searchTerm ||
        tarif.nomEchographie.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nomCliniques(tarif.idClinique)
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());
      return matchClinique && matchSearch;
    });
  }, [tarifEchographies, selectedCliniques, searchTerm, cliniques]);

  useEffect(() => {
    const fetchData = async () => {
      const [echoData, tarifData, cliniqueData] = await Promise.all([
        getAllEchographies(),
        getAllTarifEchographie(),
        getAllClinique(),
      ]);
      setEchographies(echoData);
      setTarifEchographies(tarifData);
      setCliniques(cliniqueData);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(session.user.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.TARIF_ECHOGRAPHIE
        );
        setPermission(perm || null);
      } catch (error) {
        console.error("Erreur lors de la vérification des permissions :", error);
      }
    };
    fetchPermissions();
  }, [session?.user, router]);

  const nameEchographies = (idEchographie: string) => {
    return (
      echographies.find((e) => e.id === idEchographie)?.nomEchographie ||
      "Échographie introuvable"
    );
  };

  const getTypeForTarif = (tarif: TarifEchographie): TypeEchographie | undefined => {
    return echographies.find((e) => e.id === tarif.idEchographie)?.typeEchographie;
  };

  function nomCliniques(idClinique: string) {
    return (
      cliniques.find((c) => c.id === idClinique)?.nomClinique ||
      "Clinique introuvable"
    );
  }

  const form = useForm<TarifEchographie>();

  // Échographies disponibles pour la clinique sélectionnée (exclure les doublons)
  const selectedClinique = form.watch("idClinique");
  const availableEchographies = useMemo(() => {
    if (!selectedClinique) return echographies;
    const existingEchoIds = new Set(
      tarifEchographies
        .filter((t) => t.idClinique === selectedClinique)
        .map((t) => t.idEchographie)
    );
    // En mode modification, ne pas exclure l'échographie en cours d'édition
    if (isUpdating) {
      const editingTarif = tarifEchographies.find((t) => t.id === form.getValues("id"));
      if (editingTarif) existingEchoIds.delete(editingTarif.idEchographie);
    }
    return echographies.filter((e) => !existingEchoIds.has(e.id));
  }, [echographies, tarifEchographies, selectedClinique, isUpdating]);

  useEffect(() => {
    form.setValue("idUser", idUser);
  }, [idUser, form]);

  const onSubmit = async (data: TarifEchographie) => {
    const formattedData = {
      ...data,
      idUser,
      nomEchographie: nameEchographies(form.watch("idEchographie")) ?? "",
      prixEchographie: parseInt(data.prixEchographie as unknown as string),
    };
    try {
      if (isUpdating) {
        await updateTarifEchographie(data.id, formattedData);
        toast.success("Tarif mis à jour avec succès !");
        setIsUpdating(false);
      } else {
        await createTarifEchographie(formattedData);
        toast.success("Tarif ajouté avec succès !");
      }
      const updatedTarif = await getAllTarifEchographie();
      setTarifEchographies(updatedTarif);
      form.reset();
      setIsVisible(false);
    } catch (error) {
      toast.error("La tarification a échoué !");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!permission?.canDelete && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de supprimer un tarif. Contactez un administrateur."
      );
      return router.back();
    }
    try {
      await deleteTarifEchographie(id);
      setTarifEchographies(tarifEchographies.filter((t) => t.id !== id));
      toast.success("Tarif supprimé avec succès !");
    } catch (error) {
      toast.error("Erreur lors de la suppression du tarif");
      console.error(error);
    }
  };

  const handleUpdateEchographie = (id: string) => {
    if (!permission?.canUpdate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de modifier un tarif. Contactez un administrateur."
      );
      return;
    }
    const tarif = tarifEchographies.find((t) => t.id === id);
    if (tarif) {
      setIsUpdating(true);
      form.setValue("id", tarif.id);
      form.setValue("idEchographie", tarif.idEchographie);
      form.setValue("idClinique", tarif.idClinique);
      form.setValue("prixEchographie", tarif.prixEchographie);
      setIsVisible(true);
    }
  };

  const handleCancelForm = () => {
    form.reset();
    setIsUpdating(false);
    setIsVisible(false);
  };

  const handleOpenForm = () => {
    if (!permission?.canCreate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission d'ajouter un tarif. Contactez un administrateur."
      );
      return;
    }
    form.reset();
    setIsUpdating(false);
    setIsVisible(true);
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto p-4">
      {/* ===== EN-TETE ===== */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <CircleDollarSign className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Tarification des échographies
            </h1>
            <p className="text-sm text-gray-500">
              {tarifEchographies.length} tarif
              {tarifEchographies.length > 1 ? "s" : ""} enregistré
              {tarifEchographies.length > 1 ? "s" : ""}
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
            <Card className="border-purple-200 shadow-sm">
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
                                // Réinitialiser l'échographie si elle n'est plus dispo
                                const currentEcho = form.getValues("idEchographie");
                                if (currentEcho) {
                                  const willBeExcluded = tarifEchographies.some(
                                    (t) => t.idClinique === val && t.idEchographie === currentEcho
                                  );
                                  if (willBeExcluded) form.setValue("idEchographie", "");
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

                      {/* 2. Échographie (combobox, désactivé sans clinique) */}
                      <FormField
                        control={form.control}
                        name="idEchographie"
                        rules={{ required: "L'échographie est obligatoire" }}
                        render={({ field, fieldState }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="font-medium">
                              Échographie
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
                                        ? echographies.find(
                                            (e) => e.id === field.value
                                          )?.nomEchographie
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
                                      Aucune échographie disponible.
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {availableEchographies.map((echo) => (
                                        <CommandItem
                                          value={echo.nomEchographie}
                                          key={echo.id}
                                          onSelect={() => {
                                            form.setValue(
                                              "idEchographie",
                                              echo.id
                                            );
                                            setOpen(false);
                                          }}
                                        >
                                          <div className="flex items-center gap-2 flex-1">
                                            <Badge
                                              variant="outline"
                                              className={`text-[10px] px-1.5 py-0 ${typeEchographieColors[echo.typeEchographie]}`}
                                            >
                                              {echo.typeEchographie}
                                            </Badge>
                                            <span className="text-sm">
                                              {echo.nomEchographie}
                                            </span>
                                          </div>
                                          <Check
                                            className={cn(
                                              "ml-auto h-4 w-4",
                                              echo.id === field.value
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
                        name="prixEchographie"
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
                                placeholder="Ex: 15000"
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
                      name="nomEchographie"
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
                  "border-purple-300 bg-purple-50 text-purple-700"
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
              <TableHead className="font-semibold">Échographie</TableHead>
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
            {filteredTarifEchographies.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-12 text-gray-400"
                >
                  <ScanLine className="mx-auto h-10 w-10 mb-2 opacity-30" />
                  {searchTerm || selectedCliniques.length > 0
                    ? "Aucun tarif ne correspond aux filtres."
                    : "Aucun tarif enregistré."}
                </TableCell>
              </TableRow>
            ) : (
              filteredTarifEchographies.map((tarif, index) => {
                const echoType = getTypeForTarif(tarif);
                return (
                  <TableRow
                    key={tarif.id}
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    <TableCell className="text-center text-gray-400 text-sm">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {tarif.nomEchographie}
                    </TableCell>
                    <TableCell>
                      {echoType && (
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-semibold ${typeEchographieColors[echoType]}`}
                        >
                          {typeEchographieLabels[echoType]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-sm">
                      {tarif.prixEchographie.toLocaleString("fr-FR")} CFA
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
                          onClick={() => handleUpdateEchographie(tarif.id)}
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
                                  {tarif.nomEchographie}
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
        {filteredTarifEchographies.length > 0 && (
          <div className="px-4 py-2 border-t bg-gray-50/50 text-xs text-gray-400 text-right">
            {filteredTarifEchographies.length} résultat
            {filteredTarifEchographies.length > 1 ? "s" : ""}
            {(searchTerm || selectedCliniques.length > 0) &&
              ` sur ${tarifEchographies.length}`}
          </div>
        )}
      </Card>
    </div>
  );
}
