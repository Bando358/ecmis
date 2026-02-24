"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Check,
  Filter,
  FilterX,
  Pencil,
  Trash2,
  Plus,
  X,
  Search,
  ArrowLeft,
  DollarSign,
  Stethoscope,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  CommandGroup,
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
  TableHead,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Clinique,
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
import TarifPrestationDialog from "@/components/TarifPrestationDialog";
import { useRouter } from "next/navigation";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { TableSkeleton } from "@/components/ui/loading";

export default function TarificationPrestation() {
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [tarifPrestations, setTarifPrestations] = useState<TarifPrestation[]>([]);
  const [cliniques, setCliniques] = useState<Clinique[]>([]);
  const [selectedCliniques, setSelectedCliniques] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const router = useRouter();
  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const { canRead, canCreate: canCreatePerm, canUpdate: canUpdatePerm, canDelete: canDeletePerm, isLoading: isLoadingPermissions } = usePermissionContext();

  const filteredTarifPrestations = useMemo(() => {
    return tarifPrestations.filter((tarif) => {
      const matchClinique =
        selectedCliniques.length === 0 ||
        selectedCliniques.includes(tarif.idClinique);
      const matchSearch =
        !searchTerm ||
        tarif.nomPrestation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nomCliniques(tarif.idClinique)
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());
      return matchClinique && matchSearch;
    });
  }, [tarifPrestations, selectedCliniques, searchTerm, cliniques]);

  useEffect(() => {
    const fetchData = async () => {
      const [prestationData, tarifData, cliniqueData] = await Promise.all([
        getAllPrestation(),
        getAllTarifPrestation(),
        getAllClinique(),
      ]);
      setPrestations(prestationData);
      setTarifPrestations(tarifData);
      setCliniques(cliniqueData);
    };
    fetchData();
  }, []);

  if (isLoadingPermissions) return <TableSkeleton rows={5} columns={5} />;
  if (!canRead(TableName.TARIF_PRESTATION)) { toast.error(ERROR_MESSAGES.PERMISSION_DENIED_READ); router.back(); return null; }

  function nomCliniques(idClinique: string) {
    return (
      cliniques.find((c) => c.id === idClinique)?.nomClinique ||
      "Clinique introuvable"
    );
  }

  const namePrestations = (idPrestation: string) => {
    return (
      prestations.find((p) => p.id === idPrestation)?.nomPrestation ||
      "Prestation introuvable"
    );
  };

  const handleCreate = async (data: TarifPrestation) => {
    if (!canCreatePerm(TableName.TARIF_PRESTATION)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
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
    if (!canUpdatePerm(TableName.TARIF_PRESTATION)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_UPDATE);
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
    if (!canDeletePerm(TableName.TARIF_PRESTATION)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_DELETE);
      return;
    }
    try {
      await deleteTarifPrestation(id);
      setTarifPrestations(tarifPrestations.filter((t) => t.id !== id));
      toast.success("Tarif supprimé avec succès !");
    } catch (error) {
      toast.error("Erreur lors de la suppression du tarif");
      console.error(error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/administrator")}
            className="rounded-xl hover:bg-indigo-50"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100">
              <DollarSign className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Tarifs des prestations</h1>
              <p className="text-sm text-muted-foreground">
                {tarifPrestations.length} tarif{tarifPrestations.length > 1 ? "s" : ""} enregistré{tarifPrestations.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
        <TarifPrestationDialog
          prestations={prestations}
          cliniques={cliniques}
          existingTarifs={tarifPrestations}
          onSubmit={handleCreate}
        >
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau tarif
          </Button>
        </TarifPrestationDialog>
      </div>

      {/* Recherche + Table */}
      <Card className="shadow-sm overflow-hidden">
        {/* Barre de recherche + filtre */}
        <div className="p-4 border-b bg-gray-50/50 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par prestation ou clinique..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 h-9 bg-white border-gray-200"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
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
                    "border-indigo-300 bg-indigo-50 text-indigo-700"
                )}
              >
                {selectedCliniques.length > 0 ? (
                  <>
                    <FilterX className="h-3.5 w-3.5" />
                    {selectedCliniques.length} clinique{selectedCliniques.length > 1 ? "s" : ""}
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
                            setSelectedCliniques(selectedCliniques.filter((id) => id !== clinique.id));
                          } else {
                            setSelectedCliniques([...selectedCliniques, clinique.id]);
                          }
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCliniques.includes(clinique.id) ? "opacity-100" : "opacity-0"
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

        {/* Tableau */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                <TableHead className="w-14 text-center font-semibold text-gray-600 text-xs uppercase tracking-wider">N°</TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Prestation</TableHead>
                <TableHead className="w-36 text-right font-semibold text-gray-600 text-xs uppercase tracking-wider">Tarif</TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Clinique</TableHead>
                <TableHead className="w-24 text-center font-semibold text-gray-600 text-xs uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTarifPrestations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Stethoscope className="h-8 w-8 text-gray-300" />
                      <p className="text-sm">
                        {searchTerm || selectedCliniques.length > 0
                          ? "Aucun tarif ne correspond aux filtres"
                          : "Aucun tarif enregistré"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTarifPrestations.map((tarif, index) => (
                  <TableRow key={tarif.id} className="group hover:bg-indigo-50/30 transition-colors">
                    <TableCell className="text-center text-gray-400 font-mono text-sm">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-gray-800 text-sm">
                      {tarif.nomPrestation}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 font-mono tabular-nums">
                        {tarif.montantPrestation.toLocaleString("fr-FR")} CFA
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {nomCliniques(tarif.idClinique)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <TarifPrestationDialog
                          prestations={prestations}
                          cliniques={cliniques}
                          existingTarifs={tarifPrestations}
                          isUpdating
                          initialData={tarif}
                          onSubmit={handleUpdate}
                        >
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-lg hover:bg-indigo-100 hover:text-indigo-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TarifPrestationDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-lg hover:bg-red-100 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible. Le tarif de{" "}
                                <span className="font-semibold">{tarif.nomPrestation}</span>{" "}
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
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredTarifPrestations.length > 0 && (
          <div className="px-4 py-3 border-t bg-gray-50/30 text-sm text-gray-500 text-right">
            {filteredTarifPrestations.length} résultat{filteredTarifPrestations.length > 1 ? "s" : ""}
            {(searchTerm || selectedCliniques.length > 0) && ` sur ${tarifPrestations.length}`}
          </div>
        )}
      </Card>
    </div>
  );
}
