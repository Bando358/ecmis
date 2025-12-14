"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ChevronsUpDown,
  Eye,
  EyeClosed,
  Filter,
  FilterX,
  Pencil,
  Trash2,
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
  FormDescription,
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
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Clinique,
  Examen,
  Permission,
  TableName,
  TarifExamen,
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
import { Input } from "@/components/ui/input";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";

export default function TarificationExamen() {
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [examens, setExamens] = useState<Examen[]>([]);
  const [tarifExamens, setTarifExamens] = useState<TarifExamen[]>([]);
  const [cliniques, setCliniques] = useState<Clinique[]>([]);
  const [selectedCliniques, setSelectedCliniques] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [permission, setPermission] = useState<Permission | null>(null);

  const { data: session } = useSession();
  const idUser = session?.user.id as string;

  const filteredTarifExamens = selectedCliniques.length
    ? tarifExamens.filter((tarif) =>
        selectedCliniques.includes(tarif.idClinique)
      )
    : tarifExamens;

  useEffect(() => {
    const fetchData = async () => {
      const examens = await getAllExamen();
      setExamens(examens);
      const allTarifExamen = await getAllTarifExamen();
      setTarifExamens(allTarifExamen);
    };
    fetchData();
  }, []);

  useEffect(() => {
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!session?.user) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(session.user.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.TARIF_EXAMEN
        );
        setPermission(perm || null);

        // if (perm?.canRead || session.user.role === "ADMIN") {
        // } else {
        //   alert("Vous n'avez pas la permission d'accéder à cette page.");
        //   router.back();
        // }
      } catch (error) {
        console.error(
          "Erreur lors de la vérification des permissions :",
          error
        );
      }
    };

    fetchPermissions();
  }, [session?.user]);

  useEffect(() => {
    const fetchData = async () => {
      const clinique = await getAllClinique();
      // setCliniques(
      //   clinique.filter((c) => tabIdClinique && tabIdClinique.includes(c.id))
      // );
      setCliniques(clinique);
    };
    fetchData();
  }, []);

  const nameExamens = (idExamen: string) => {
    if (examens.length > 0) {
      const examen = examens.find((exam) => exam.id === idExamen);
      return examen ? examen.nomExamen : "examen introuvable"; // Valeur par défaut si non trouvé
    }
  };
  const nomCliniques = (idClinique: string) => {
    if (cliniques.length > 0) {
      const clinique = cliniques.find((p) => p.id === idClinique);
      return clinique ? clinique.nomClinique : "Clinique introuvable"; // Valeur par défaut si non trouvé
    }
  };

  const form = useForm<TarifExamen>();

  useEffect(() => {
    form.setValue("idUser", idUser);
  }, [idUser, form]);

  const onSubmit = async (data: TarifExamen) => {
    const formattedData = {
      ...data,
      idUser,
      nomExamen: nameExamens(form.watch("idExamen")) ?? "", // Always a string
      prixExamen: parseInt(data.prixExamen as unknown as string),
    };
    console.log(formattedData);
    try {
      if (isUpdating) {
        await updateTarifExamen(data.id, formattedData); // Appel de la fonction de mise à jour avec l'ID de la prestation
        toast.success("Tarif Prestation mise à jour avec succès! 🎉");
        setIsUpdating(false);
        form.reset();
      } else {
        await createTarifExamen(formattedData); // Appel de la fonction de création si on est en mode ajout
        toast.success("Prix ajouter avec succès! 🎉");

        handleHiddenForm();
        // setIsVisible(false);
      }

      const updatedTarif = await getAllTarifExamen();
      setTarifExamens(updatedTarif);
      form.reset(); // Réinitialisation du formulaire après soumission
      setIsVisible(false);
    } catch (error) {
      toast.error("La tarification a échoué !");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!permission?.canDelete && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de supprimer un tarif examen. Contactez un administrateur."
      );
    } else {
      try {
        await deleteTarifExamen(id);
        setTarifExamens(tarifExamens.filter((tarif) => tarif.id !== id));
        toast.success("Le tarif a été Supprimé avec succès! 🎉");
      } catch (error) {
        toast.error("Erreur lors de la suppression du tarif");
        console.error(error);
      }
    }
  };
  const handleUpdateExamen = async (id: string) => {
    if (!permission?.canUpdate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de modifier un tarif examen. Contactez un administrateur."
      );
    } else {
      const tarifExamenToUpdate = tarifExamens.find((tarif) => tarif.id === id);
      if (tarifExamenToUpdate) {
        setIsUpdating(true); // Activer le mode modification
        form.setValue("id", tarifExamenToUpdate.id); // Assurez-vous que "id" est correctement défini ici
        form.setValue("idExamen", tarifExamenToUpdate.idExamen);
        form.setValue("idClinique", tarifExamenToUpdate.idClinique);
        form.setValue("prixExamen", tarifExamenToUpdate.prixExamen);
        setIsVisible(true);
      }
    }
  };

  const handleHiddenForm = () => {
    if (!permission?.canCreate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de créer un tarif echographie. Contactez un administrateur."
      );
    } else {
      if (!isVisible) {
        setIsVisible(true);
        // rafraichirPage();
      } else {
        setIsVisible(false);
      }
    }
  };

  return (
    <div className="space-y-4 max-w-225 mx-auto relative flex flex-col justify-center p-4">
      <Button
        variant={"ghost"}
        onClick={handleHiddenForm}
        className="absolute top-2"
      >
        {isVisible ? (
          <Eye className="text-blue-600" />
        ) : (
          <EyeClosed className="text-red-600" />
        )}
      </Button>
      {isVisible && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 max-w-125 mx-auto p-4 top-10 bg-gray-50 opacity-90 rounded-sm"
          >
            <FormField
              control={form.control}
              name="idExamen"
              rules={{
                required: "L'examen est obligatoire",
              }}
              render={({ field, fieldState }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Examen</FormLabel>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-100 justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? examens.find(
                                (examen) => examen.id === field.value
                              )?.nomExamen
                            : "Select Examen"}
                          <ChevronsUpDown className="opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-100 p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search examen..."
                          className="h-9"
                        />
                        <CommandList>
                          <CommandEmpty>No examen found.</CommandEmpty>
                          <CommandGroup>
                            {examens.map((examen) => (
                              <CommandItem
                                value={examen.id}
                                key={examen.id}
                                onSelect={() => {
                                  form.setValue("idExamen", examen.id);
                                  setOpen(false);
                                }}
                              >
                                {examen.nomExamen}
                                <Check
                                  className={cn(
                                    "ml-auto",
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
                  <FormDescription>
                    This is the examen that will be used in the dashboard.
                  </FormDescription>
                  <FormMessage />
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="idClinique"
              rules={{
                required: "La clinique est obligatoire2",
              }}
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Selectionnez la clinique</FormLabel>
                  <Select
                    required
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Clinique à sélectionner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cliniques.map((clinique, index) => (
                        <SelectItem key={index} value={clinique.id}>
                          {clinique.nomClinique}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="prixExamen"
              rules={{
                required: "Le tarif est obligatoire",
              }}
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Tarif Prestation</FormLabel>
                  <FormControl>
                    <Input
                      required
                      type="number"
                      value={field.value ?? 0}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="idUser"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} value={idUser} className="hidden" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nomExamen"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      className="hidden"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit">
              {isUpdating ? "Mettre à jour" : "Ajouter"}
            </Button>
          </form>
        </Form>
      )}
      <h2 className="text-2xl font-bold text-center">
        Liste des Examens Tarifés
      </h2>

      <Table className="border  bg-gray-50 opacity-90 rounded-sm p-6">
        <TableHeader>
          <TableRow>
            <TableCell>Examens</TableCell>
            <TableCell>Tarifs</TableCell>
            <TableCell
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="cursor-pointer flex flex-row items-center"
            >
              Cliniques
              <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <PopoverTrigger asChild>
                  {/* <Button variant="ghost" className="ml-2">
                    Filtrer
                  </Button> */}
                  <span>
                    {selectedCliniques.length > 0 ? (
                      <FilterX
                        size={14}
                        onClick={() => setSelectedCliniques([])}
                        className="text-red-500"
                      />
                    ) : (
                      <Filter size={14} className="text-blue-500 rotate-180" />
                    )}
                  </span>
                </PopoverTrigger>
                <PopoverContent className="w-75 p-4">
                  <Command>
                    <CommandInput placeholder="Rechercher une clinique..." />
                    <CommandList>
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
                              "mr-2",
                              selectedCliniques.includes(clinique.id)
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {clinique.nomClinique}
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </TableCell>

            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTarifExamens.map((examen) => (
            <TableRow key={examen.id}>
              <TableCell>{nameExamens(examen.idExamen)}</TableCell>
              <TableCell>{examen.prixExamen} cfa</TableCell>
              <TableCell>{nomCliniques(examen.idClinique)}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    // variant="primary"
                    size="icon"
                    onClick={() => handleUpdateExamen(examen.id)}
                  >
                    <Pencil size={16} />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(examen.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
