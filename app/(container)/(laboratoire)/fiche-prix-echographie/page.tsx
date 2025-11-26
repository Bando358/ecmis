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
  Echographie,
  Permission,
  TableName,
  TarifEchographie,
} from "@/lib/generated/prisma";

import { getAllClinique } from "@/lib/actions/cliniqueActions";

import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { getAllEchographies } from "@/lib/actions/echographieActions";
import {
  createTarifEchographie,
  deleteTarifEchographie,
  getAllTarifEchographie,
  updateTarifEchographie,
} from "@/lib/actions/tarifEchographieActions";
import { useRouter } from "next/navigation";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";

export default function TarificationEchographie() {
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [echographies, setEchographies] = useState<Echographie[]>([]);
  const [tarifEchographies, setTarifEchographies] = useState<
    TarifEchographie[]
  >([]);
  const [cliniques, setCliniques] = useState<Clinique[]>([]);
  const [selectedCliniques, setSelectedCliniques] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [permission, setPermission] = useState<Permission | null>(null);

  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const router = useRouter();

  const filteredTarifEchographies = selectedCliniques.length
    ? tarifEchographies.filter((tarif) =>
        selectedCliniques.includes(tarif.idClinique)
      )
    : tarifEchographies;

  useEffect(() => {
    const fetchData = async () => {
      const echographies = await getAllEchographies();
      setEchographies(echographies);
      const allTarifEchographie = await getAllTarifEchographie();
      setTarifEchographies(allTarifEchographie);
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
          (p) => p.table === TableName.TARIF_ECHOGRAPHIE
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
  }, [session?.user, router]);

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

  const nameEchographies = (idEchographie: string) => {
    if (echographies.length > 0) {
      const echographie = echographies.find(
        (exam) => exam.id === idEchographie
      );
      return echographie
        ? echographie.nomEchographie
        : "échographie introuvable"; // Valeur par défaut si non trouvé
    }
  };
  const nomCliniques = (idClinique: string) => {
    if (cliniques.length > 0) {
      const clinique = cliniques.find((p) => p.id === idClinique);
      return clinique ? clinique.nomClinique : "Clinique introuvable"; // Valeur par défaut si non trouvé
    }
  };

  const form = useForm<TarifEchographie>();

  useEffect(() => {
    form.setValue("idUser", idUser);
  }, [idUser, form]);

  const onSubmit = async (data: TarifEchographie) => {
    const formattedData = {
      ...data,
      idUser,
      nomEchographie: nameEchographies(form.watch("idEchographie")) ?? "", // Always a string
      prixEchographie: parseInt(data.prixEchographie as unknown as string),
    };
    console.log(formattedData);
    try {
      if (isUpdating) {
        await updateTarifEchographie(data.id, formattedData); // Appel de la fonction de mise à jour avec l'ID de la prestation
        toast.success("Tarif Prestation mise à jour avec succès! 🎉");
        setIsUpdating(false);
        form.reset();
      } else {
        await createTarifEchographie(formattedData); // Appel de la fonction de création si on est en mode ajout
        toast.success("Prix ajouter avec succès! 🎉");

        handleHiddenForm();
        // setIsVisible(false);
      }

      const updatedTarif = await getAllTarifEchographie();
      setTarifEchographies(updatedTarif);
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
        "Vous n'avez pas la permission de supprimer un tarif echographie. Contactez un administrateur."
      );
      return router.back();
    } else {
      try {
        await deleteTarifEchographie(id);
        setTarifEchographies(
          tarifEchographies.filter((tarif) => tarif.id !== id)
        );
        toast.success("Le tarif a été Supprimé avec succès! 🎉");
      } catch (error) {
        toast.error("Erreur lors de la suppression du tarif");
        console.error(error);
      }
    }
  };
  const handleUpdateEchographie = async (id: string) => {
    if (!permission?.canDelete && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de modifier un tarif echographie. Contactez un administrateur."
      );
    } else {
      const tarifEchographieToUpdate = tarifEchographies.find(
        (tarif) => tarif.id === id
      );
      if (tarifEchographieToUpdate) {
        setIsUpdating(true); // Activer le mode modification
        form.setValue("id", tarifEchographieToUpdate.id); // Assurez-vous que "id" est correctement défini ici
        form.setValue("idEchographie", tarifEchographieToUpdate.idEchographie);
        form.setValue("idClinique", tarifEchographieToUpdate.idClinique);
        form.setValue(
          "prixEchographie",
          tarifEchographieToUpdate.prixEchographie
        );
        setIsVisible(true);
      }
    }
  };

  const handleHiddenForm = () => {
    if (!permission?.canUpdate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de modifier un tarif echographie. Contactez un administrateur."
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
    <div className="space-y-4 max-w-[900px] mx-auto relative flex flex-col justify-center p-4">
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
            className="space-y-4 max-w-[500px] mx-auto p-4 top-10 bg-gray-50 opacity-90 rounded-sm"
          >
            <FormField
              control={form.control}
              name="idEchographie"
              rules={{
                required: "L'échographie est obligatoire",
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
                            "w-[400px] justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? echographies.find(
                                (echo) => echo.id === field.value
                              )?.nomEchographie
                            : "Select Examen"}
                          <ChevronsUpDown className="opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search examen..."
                          className="h-9"
                        />
                        <CommandList>
                          <CommandEmpty>No echographie found.</CommandEmpty>
                          <CommandGroup>
                            {echographies.map((echographie) => (
                              <CommandItem
                                value={echographie.id}
                                key={echographie.id}
                                onSelect={() => {
                                  form.setValue(
                                    "idEchographie",
                                    echographie.id
                                  );
                                  setOpen(false);
                                }}
                              >
                                {echographie.nomEchographie}
                                <Check
                                  className={cn(
                                    "ml-auto",
                                    echographie.id === field.value
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
              name="prixEchographie"
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
              name="nomEchographie"
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
        Liste des Echographies Tarifés
      </h2>

      <Table className="border  bg-gray-50 opacity-90 rounded-sm p-6">
        <TableHeader>
          <TableRow>
            <TableCell>Echographies</TableCell>
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
                <PopoverContent className="w-[300px] p-4">
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
          {filteredTarifEchographies.map((echographie) => (
            <TableRow key={echographie.id}>
              <TableCell>
                {nameEchographies(echographie.idEchographie)}
              </TableCell>
              <TableCell>{echographie.prixEchographie} cfa</TableCell>
              <TableCell>{nomCliniques(echographie.idClinique)}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    // variant="primary"
                    size="icon"
                    onClick={() => handleUpdateEchographie(echographie.id)}
                  >
                    <Pencil size={16} />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(echographie.id)}
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
