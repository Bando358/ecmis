"use client";

import { useEffect, useState } from "react";
import { Check, Filter, FilterX, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  Permission,
  Prestation,
  TableName,
  TarifPrestation,
} from "@prisma/client";
import { getAllPrestation } from "@/lib/actions/prestationActions";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import {
  createTarifPrestation,
  deleteTarifPrestation,
  getAllTarifPrestation,
  updateTarifPrestation,
} from "@/lib/actions/tarifPrestationActions";
import { useSession } from "next-auth/react";
// import { TarifPrestationDialog } from "./TarifPrestationDialog";
import TarifPrestationDialog from "@/components/TarifPrestationDialog";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { SpinnerBar } from "@/components/ui/spinner-bar";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";

export default function TarificationPrestation() {
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [tarifPrestations, setTarifPrestations] = useState<TarifPrestation[]>(
    []
  );
  const [cliniques, setCliniques] = useState<Clinique[]>([]);
  const [selectedCliniques, setSelectedCliniques] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
  const [permission, setPermission] = useState<Permission | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  const router = useRouter();
  const { data: session } = useSession();
  const idUser = session?.user.id as string;

  const filteredTarifPrestations = selectedCliniques.length
    ? tarifPrestations.filter((tarif) =>
        selectedCliniques.includes(tarif.idClinique)
      )
    : tarifPrestations;

  useEffect(() => {
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!session?.user) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(session.user.id);
        const perm = permissions.find(
          (p: { table: string; }) => p.table === TableName.TARIF_PRESTATION
        );

        if (perm?.canRead || session.user.role === "ADMIN") {
          setHasAccess(true);
          setPermission(perm || null);
        } else {
          alert("Vous n'avez pas la permission d'accéder à cette page.");
          router.back();
        }
      } catch (error) {
        console.error(
          "Erreur lors de la vérification des permissions :",
          error
        );
      } finally {
        setIsCheckingPermissions(false);
      }
    };

    fetchPermissions();
  }, [session?.user, router]);

  useEffect(() => {
    const fetchData = async () => {
      const prestation = await getAllPrestation();
      setPrestations(prestation);
      const allTarifPrestation = await getAllTarifPrestation();
      setTarifPrestations(allTarifPrestation);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const clinique = await getAllClinique();
      setCliniques(clinique);
    };
    fetchData();
  }, []);

  if (isCheckingPermissions) {
    return (
      <div className="flex justify-center gap-2 items-center h-64">
        <p className="text-gray-500">Vérification des permissions</p>
        <SpinnerBar />
      </div>
    );
  }

  if (!hasAccess) return null;

  const namePrestations = (idPrestation: string) => {
    if (prestations.length > 0) {
      const prestation = prestations.find((p) => p.id === idPrestation);
      return prestation ? prestation.nomPrestation : "Prestation introuvable";
    }
  };

  const nomCliniques = (idClinique: string) => {
    if (cliniques.length > 0) {
      const clinique = cliniques.find((p) => p.id === idClinique);
      return clinique ? clinique.nomClinique : "Clinique introuvable";
    }
  };

  const handleCreate = async (data: TarifPrestation) => {
    if (!permission?.canCreate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de fixer un tarif de prestation. Contactez un administrateur."
      );
      return;
    }
    const formattedData = {
      ...data,
      idUser,
      nomPrestation: namePrestations(data.idPrestation) ?? "",
      montantPrestation: parseInt(data.montantPrestation as unknown as string),
    };
    await createTarifPrestation(formattedData);
    const updatedTarif = await getAllTarifPrestation();
    setTarifPrestations(updatedTarif);
  };

  const handleUpdate = async (data: TarifPrestation) => {
    if (!permission?.canUpdate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de mettre à jour un tarif de prestation. Contactez un administrateur."
      );
      return;
    }
    const formattedData = {
      ...data,
      idUser,
      nomPrestation: namePrestations(data.idPrestation) ?? "",
      montantPrestation: parseInt(data.montantPrestation as unknown as string),
    };
    await updateTarifPrestation(data.id, formattedData);
    const updatedTarif = await getAllTarifPrestation();
    setTarifPrestations(updatedTarif);
  };

  const handleDelete = async (id: string) => {
    if (!permission?.canDelete && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de supprimer un tarif de prestation. Contactez un administrateur."
      );
      return;
    }
    try {
      await deleteTarifPrestation(id);
      setTarifPrestations(tarifPrestations.filter((tarif) => tarif.id !== id));
      toast.success("Le tarif a été supprimé avec succès! 🎉");
    } catch (error) {
      toast.error("Erreur lors de la suppression du tarif");
      console.error(error);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto p-4 rounded-md">
      <h1 className="text-2xl font-bold text-center">Tarification</h1>
      <div className="flex justify-end">
        <TarifPrestationDialog
          prestations={prestations}
          cliniques={cliniques}
          onSubmit={handleCreate}
        >
          <Button variant="outline">Ajouter un tarif</Button>
        </TarifPrestationDialog>
      </div>

      <Table className="border  bg-gray-50 opacity-90 p-6 rounded-sm">
        <TableHeader>
          <TableRow>
            <TableCell>Prestations</TableCell>
            <TableCell>Tarifs</TableCell>
            <TableCell
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="cursor-pointer flex flex-row items-center"
            >
              Cliniques
              <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <PopoverTrigger asChild>
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
          {filteredTarifPrestations.map((prestation) => (
            <TableRow key={prestation.id}>
              <TableCell>{prestation.nomPrestation}</TableCell>
              <TableCell>{prestation.montantPrestation} cfa</TableCell>
              <TableCell>{nomCliniques(prestation.idClinique)}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <TarifPrestationDialog
                    prestations={prestations}
                    cliniques={cliniques}
                    isUpdating
                    initialData={prestation}
                    onSubmit={handleUpdate}
                  >
                    <Pencil
                      className="text-xl m-1 duration-300 hover:scale-150 active:scale-125 text-blue-600 cursor-pointer"
                      size={16}
                    />
                  </TarifPrestationDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Trash2 className="text-xl m-1 duration-300 hover:scale-150 active:scale-125 text-red-600 cursor-pointer" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Tarif Prestation !! Êtes vous absolument sûr?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. si vous cliquez sur
                          continuer le Tarif Prestation sera definitivement
                          supprimer de la base de données
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600"
                          onClick={() => handleDelete(prestation.id)}
                        >
                          Continue
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
