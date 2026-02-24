"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createLieu,
  getAllLieu,
  getOneLieu,
  updateLieu,
  deleteLieu,
} from "@/lib/actions/lieuActions";
import {
  createActivite,
  getAllActivite,
  getAllActiviteByTabIdClinique,
  updateActivite,
  deleteActivite,
} from "@/lib/actions/activiteActions";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import { getAllUser, getOneUser } from "@/lib/actions/authActions";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Lieu, Activite, TableName, Clinique, User } from "@prisma/client";
import { toast } from "sonner";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pencil,
  ArrowBigLeftDash,
  Plus,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  EyeClosed,
  Loader2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { ActiviteDialog } from "@/components/ActiviteDialog";
import Select from "react-select";

const TableRowSkeleton = () => (
  <TableRow>
    {Array.from({ length: 6 }).map((_, i) => (
      <TableCell key={i}>
        <div className="h-4 bg-gray-200 rounded animate-pulse" />
      </TableCell>
    ))}
  </TableRow>
);

export default function ActivitePage() {
  const [activites, setActivites] = useState<Activite[]>([]);
  const [lieux, setLieux] = useState<Lieu[]>([]);
  const [cliniques, setCliniques] = useState<Clinique[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activitesForDialog, setActivitesForDialog] = useState<Activite[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [idLieu, setIdLieu] = useState<string>("");
  const [oneUser, setOneUser] = useState<User | null>(null);
  const [selectedCliniqueId, setSelectedCliniqueId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [deleteLieuId, setDeleteLieuId] = useState<string | null>(null);
  const [isDeletingLieu, setIsDeletingLieu] = useState(false);

  // Recherche, filtre, pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActiviteId, setFilterActiviteId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const router = useRouter();
  const { data: session } = useSession();
  const idUser = session?.user?.id;
  const { canRead, isLoading: isLoadingPermissions } = usePermissionContext();

  const itemsPerPageOptions = [
    { value: 5, label: "5 par page" },
    { value: 10, label: "10 par page" },
    { value: 20, label: "20 par page" },
    { value: 50, label: "50 par page" },
  ];

  // === Charger l'utilisateur connecté (pour filtrage des données) ===
  useEffect(() => {
    if (!idUser) return;
    const fetchUser = async () => {
      const user = await getOneUser(idUser);
      if (user) setOneUser(user);
    };
    fetchUser();
  }, [idUser]);

  // === Chargement des données en parallèle ===
  useEffect(() => {
    if (!oneUser) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [resultCliniques, resultUsers, resultActivites, resultLieux] =
          await Promise.all([
            getAllClinique(),
            getAllUser(),
            getAllActivite(),
            getAllLieu(),
          ]);

        setCliniques(resultCliniques as Clinique[]);
        setUsers(resultUsers as User[]);

        // Filtrer les activités selon le rôle
        if (oneUser.role !== "ADMIN") {
          const userCliniques = oneUser.idCliniques;
          setActivites(
            (resultActivites as Activite[]).filter((a) =>
              Array.isArray(userCliniques)
                ? userCliniques.includes(a.idClinique)
                : userCliniques === a.idClinique
            )
          );
        } else {
          setActivites(resultActivites as Activite[]);
        }

        setLieux(resultLieux as Lieu[]);

        // Configurer le dialog avec la première clinique
        if (resultCliniques.length > 0) {
          const firstCliniqueId = resultCliniques[0].id;
          setSelectedCliniqueId(firstCliniqueId);
          const dialogActivites = await getAllActiviteByTabIdClinique([
            firstCliniqueId,
          ]);
          setActivitesForDialog(dialogActivites as Activite[]);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        toast.error("Erreur lors du chargement des données");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [oneUser]);

  // === Filtrage des lieux ===
  const filteredLieux = useMemo(() => {
    let filtered = lieux;

    // Filtre par recherche texte
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((lieu) => {
        const activite = activites.find((a) => a.id === lieu.idActivite);
        const clinique = activite
          ? cliniques.find((c) => c.id === activite.idClinique)
          : null;
        return (
          lieu.lieu.toLowerCase().includes(search) ||
          lieu.localite.toLowerCase().includes(search) ||
          (activite?.libelle.toLowerCase().includes(search) ?? false) ||
          (clinique?.nomClinique.toLowerCase().includes(search) ?? false)
        );
      });
    }

    // Filtre par activité
    if (filterActiviteId) {
      filtered = filtered.filter(
        (lieu) => lieu.idActivite === filterActiviteId
      );
    }

    return filtered;
  }, [lieux, searchTerm, filterActiviteId, activites, cliniques]);

  // === Pagination ===
  const paginatedLieux = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLieux.slice(start, start + itemsPerPage);
  }, [filteredLieux, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredLieux.length / itemsPerPage);

  // Reset page quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterActiviteId]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Lieu>();

  const watchDateDebut = watch("dateDebut");

  // === Handlers ===
  const handleActivite = async (data: Activite, isUpdating: boolean) => {
    try {
      if (isUpdating) {
        await updateActivite(data.id, {
          id: data.id,
          libelle: data.libelle,
          dateDebut: data.dateDebut,
          dateFin: data.dateFin,
          objectifClt: data.objectifClt,
          objectifSrv: data.objectifSrv,
          commentaire: data.commentaire,
          idClinique: data.idClinique,
          idUser: data.idUser,
          createdAt: data.createdAt,
        });
        toast.info("Activité modifiée avec succès !");
      } else {
        await createActivite({
          id: crypto.randomUUID(),
          libelle: data.libelle,
          dateDebut: new Date(data.dateDebut),
          dateFin: new Date(data.dateFin),
          objectifClt:
            typeof data.objectifClt === "number"
              ? data.objectifClt
              : Number(data.objectifClt) || 0,
          objectifSrv:
            typeof data.objectifSrv === "number"
              ? data.objectifSrv
              : Number(data.objectifSrv) || 0,
          commentaire: data.commentaire ?? null,
          idClinique: data.idClinique,
          idUser: data.idUser,
          createdAt: new Date(),
        });
        toast.success("Activité créée avec succès !");
      }

      // Recharger les activités du dialog
      const refreshed = await getAllActiviteByTabIdClinique([
        data.idClinique,
      ]);
      setActivitesForDialog(refreshed as Activite[]);

      // Recharger toutes les activités pour la page
      const allRefreshed = await getAllActivite();
      if (oneUser?.role !== "ADMIN") {
        setActivites(
          (allRefreshed as Activite[]).filter((a) =>
            oneUser?.idCliniques.includes(a.idClinique)
          )
        );
      } else {
        setActivites(allRefreshed as Activite[]);
      }
    } catch (error) {
      console.error("Erreur:", error);
      throw error;
    }
  };

  const handleDeleteActivite = async (id: string) => {
    await deleteActivite(id);
    // Recharger
    const refreshed = await getAllActiviteByTabIdClinique([selectedCliniqueId]);
    setActivitesForDialog(refreshed as Activite[]);
    const allRefreshed = await getAllActivite();
    setActivites(allRefreshed as Activite[]);
  };

  const handleCliniqueChangeInDialog = async (cliniqueId: string) => {
    setSelectedCliniqueId(cliniqueId);
    const refreshed = await getAllActiviteByTabIdClinique([cliniqueId]);
    setActivitesForDialog(refreshed as Activite[]);
  };

  const onSubmit: SubmitHandler<Lieu> = async (data) => {
    // Validation dates
    if (new Date(data.dateFin) <= new Date(data.dateDebut)) {
      toast.error("La date de fin doit être postérieure à la date de début.");
      return;
    }

    try {
      if (isUpdating) {
        await updateLieu(idLieu, {
          id: idLieu,
          lieu: data.lieu,
          localite: data.localite,
          idActivite: data.idActivite,
          createdAt: data.createdAt,
          dateDebut: new Date(data.dateDebut),
          dateFin: new Date(data.dateFin),
        });
        toast.info("Lieu modifié avec succès !");
        setIsUpdating(false);
      } else {
        await createLieu({
          id: crypto.randomUUID(),
          lieu: data.lieu,
          localite: data.localite,
          idActivite: data.idActivite,
          createdAt: new Date(),
          dateDebut: new Date(data.dateDebut),
          dateFin: new Date(data.dateFin),
        });
        toast.success("Lieu créé avec succès !");
      }

      // Recharger les lieux
      const allLieux = await getAllLieu();
      setLieux(allLieux as Lieu[]);
      reset();
      setIsVisible(false);
    } catch (error) {
      toast.error("La création/modification du lieu a échoué !");
      console.error("Erreur:", error);
    }
  };

  const handleUpdateLieu = (id: string) => {
    const lieu = lieux.find((l) => l.id === id);
    if (!lieu) return;

    setIdLieu(id);
    setIsUpdating(true);
    setValue("lieu", lieu.lieu);
    setValue("localite", lieu.localite);
    setValue("idActivite", lieu.idActivite);
    setValue("dateDebut", lieu.dateDebut);
    setValue("dateFin", lieu.dateFin);
    setIsVisible(true);
  };

  const confirmDeleteLieu = async () => {
    if (!deleteLieuId) return;
    setIsDeletingLieu(true);
    try {
      await deleteLieu(deleteLieuId);
      setLieux((prev) => prev.filter((l) => l.id !== deleteLieuId));
      toast.success("Lieu supprimé avec succès !");
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de la suppression du lieu.");
    } finally {
      setIsDeletingLieu(false);
      setDeleteLieuId(null);
    }
  };

  const handleCancelForm = () => {
    setIsVisible(false);
    setIsUpdating(false);
    reset();
  };

  // === Helpers ===
  const getCliniqueNameByActivite = (idActivite: string) => {
    const activite = activites.find((a) => a.id === idActivite);
    if (!activite) return "Inconnue";
    const clinique = cliniques.find((c) => c.id === activite.idClinique);
    return clinique?.nomClinique || "Inconnue";
  };

  const getActiviteName = (idActivite: string) => {
    const activite = activites.find((a) => a.id === idActivite);
    return activite?.libelle || "Inconnue";
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  // Options pour le filtre activité
  const activiteFilterOptions = [
    { value: "", label: "Toutes les activités" },
    ...activites.map((a) => ({
      value: a.id,
      label: `${a.libelle} (${getCliniqueNameByActivite(a.id)})`,
    })),
  ];

  // === Pagination handlers ===
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  // === Rendu ===
  if (isLoadingPermissions) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!canRead(TableName.ACTIVITE)) { toast.error(ERROR_MESSAGES.PERMISSION_DENIED_READ); router.back(); return null; }

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/administrator")}
                className="h-8 w-8"
                aria-label="Retour sur page administration"
              >
                <ArrowBigLeftDash className="h-5 w-5 text-blue-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Retour sur page administration</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex gap-2">
          <ActiviteDialog
            cliniques={cliniques}
            userId={idUser}
            users={users}
            activites={activitesForDialog}
            selectedCliniqueId={selectedCliniqueId}
            onCliniqueChange={handleCliniqueChangeInDialog}
            onActiviteCreated={() => {}}
            onActiviteUpdated={() => {}}
            onActiviteDeleted={() => {}}
            handleActivite={handleActivite}
            handleDeleteActivite={handleDeleteActivite}
          >
            <Button className="flex items-center gap-2">
              <Plus size={16} />
              Gérer les Activités
            </Button>
          </ActiviteDialog>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (isVisible) handleCancelForm();
                    else setIsVisible(true);
                  }}
                  className="h-8 w-8"
                  aria-label={
                    isVisible
                      ? "Fermer le formulaire des lieux"
                      : "Ouvrir le formulaire des lieux"
                  }
                >
                  {isVisible ? (
                    <Eye className="h-5 w-5 text-blue-600" />
                  ) : (
                    <EyeClosed className="h-5 w-5 text-red-600" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {isVisible ? "Fermer le formulaire" : "Ouvrir le formulaire"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Formulaire Lieu */}
      {isVisible && (
        <div className="p-4 border rounded-md max-w-3xl mx-auto bg-stone-50">
          <h2 className="text-center text-xl font-bold uppercase mb-4">
            {isUpdating
              ? "Modifier un Lieu"
              : "Créer un Lieu"}
          </h2>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium">Nom du lieu</label>
              <Input
                {...register("lieu", { required: "Nom du lieu est requis" })}
                placeholder="Nom du lieu"
                className="mt-1"
              />
              {errors.lieu && (
                <span className="text-red-500 text-sm">
                  {errors.lieu.message}
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium">Localité</label>
              <Input
                {...register("localite", {
                  required: "Localité est requise",
                })}
                placeholder="Localité"
                className="mt-1"
              />
              {errors.localite && (
                <span className="text-red-500 text-sm">
                  {errors.localite.message}
                </span>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium">Activité</label>
              <select
                {...register("idActivite", {
                  required: "Activité est requise",
                })}
                className="w-full p-2 border rounded-md"
                defaultValue=""
              >
                <option value="" disabled>
                  Sélectionner une activité
                </option>
                {activites.map((activite) => (
                  <option key={activite.id} value={activite.id}>
                    {getCliniqueNameByActivite(activite.id)} -{" "}
                    {activite.libelle}{" "}
                    ({formatDate(activite.dateDebut)} -{" "}
                    {formatDate(activite.dateFin)})
                  </option>
                ))}
              </select>
              {errors.idActivite && (
                <span className="text-red-500 text-sm">
                  {errors.idActivite.message}
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium">
                Date de début
              </label>
              <Input
                type="datetime-local"
                {...register("dateDebut", {
                  required: "Date de début est requise",
                })}
                className="mt-1"
              />
              {errors.dateDebut && (
                <span className="text-red-500 text-sm">
                  {errors.dateDebut.message}
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium">Date de fin</label>
              <Input
                type="datetime-local"
                {...register("dateFin", {
                  required: "Date de fin est requise",
                  validate: (value) => {
                    if (
                      watchDateDebut &&
                      new Date(value) <= new Date(watchDateDebut)
                    ) {
                      return "La date de fin doit être postérieure à la date de début";
                    }
                    return true;
                  },
                })}
                className="mt-1"
              />
              {errors.dateFin && (
                <span className="text-red-500 text-sm">
                  {errors.dateFin.message}
                </span>
              )}
            </div>

            <div className="md:col-span-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelForm}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isUpdating
                  ? isSubmitting
                    ? "Modification en cours..."
                    : "Modifier le Lieu"
                  : isSubmitting
                  ? "Création en cours..."
                  : "Créer le Lieu"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Section Liste des Lieux */}
      <div className="flex-1">
        <h2 className="text-center text-xl font-bold uppercase mb-4">
          Liste des Lieux
        </h2>

        {/* Barre de recherche et filtres */}
        <div className="mb-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Rechercher par lieu, localité, activité, clinique..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="w-full md:w-64">
            <Select
              options={activiteFilterOptions}
              value={activiteFilterOptions.find(
                (opt) => opt.value === filterActiviteId
              )}
              onChange={(option) => setFilterActiviteId(option?.value || "")}
              className="basic-single"
              classNamePrefix="select"
              placeholder="Filtrer par activité"
            />
          </div>

          <div className="w-full md:w-44">
            <Select
              options={itemsPerPageOptions}
              value={itemsPerPageOptions.find(
                (opt) => opt.value === itemsPerPage
              )}
              onChange={(option) => {
                setItemsPerPage(option?.value || 10);
                setCurrentPage(1);
              }}
              className="basic-single"
              classNamePrefix="select"
              placeholder="Par page"
            />
          </div>
        </div>

        {/* Nombre de résultats */}
        <div className="text-sm text-gray-600 mb-2">
          {filteredLieux.length} lieu(x) trouvé(s)
          {searchTerm && (
            <span>
              {" "}
              pour &quot;{searchTerm}&quot;
            </span>
          )}
        </div>

        {/* Tableau */}
        <div className="border rounded-md bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-stone-50">
                  <TableHead className="font-semibold">Lieu</TableHead>
                  <TableHead className="font-semibold">Localité</TableHead>
                  <TableHead className="font-semibold text-center">
                    Période
                  </TableHead>
                  <TableHead className="font-semibold text-center">
                    Activité
                  </TableHead>
                  <TableHead className="font-semibold">Antenne</TableHead>
                  <TableHead className="font-semibold text-center">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <TableRowSkeleton key={index} />
                  ))
                ) : paginatedLieux.length > 0 ? (
                  paginatedLieux.map((lieu) => (
                    <TableRow key={lieu.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{lieu.lieu}</TableCell>
                      <TableCell>{lieu.localite}</TableCell>
                      <TableCell className="text-center text-sm">
                        {formatDate(lieu.dateDebut)} -{" "}
                        {formatDate(lieu.dateFin)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getActiviteName(lieu.idActivite)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getCliniqueNameByActivite(lieu.idActivite)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleUpdateLieu(lieu.id)}
                                  aria-label="Modifier le lieu"
                                >
                                  <Pencil className="h-4 w-4 text-blue-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Modifier</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setDeleteLieuId(lieu.id)}
                                  aria-label="Supprimer le lieu"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Supprimer</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-gray-500"
                    >
                      Aucun lieu trouvé
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
            <div className="text-sm text-gray-600">
              Affichage de {(currentPage - 1) * itemsPerPage + 1} à{" "}
              {Math.min(currentPage * itemsPerPage, filteredLieux.length)} sur{" "}
              {filteredLieux.length} lieux
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToFirstPage}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
                aria-label="Première page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
                aria-label="Page précédente"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={
                        currentPage === pageNum ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="h-8 w-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
                aria-label="Page suivante"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToLastPage}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
                aria-label="Dernière page"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-sm text-gray-600">
              Page {currentPage} sur {totalPages}
            </div>
          </div>
        )}
      </div>

      {/* Dialog de confirmation suppression lieu */}
      <AlertDialog
        open={!!deleteLieuId}
        onOpenChange={(open) => !open && setDeleteLieuId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce lieu ? Cette action est
              irréversible. Les visites rattachées empêcheront la suppression.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingLieu}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteLieu}
              disabled={isDeletingLieu}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletingLieu ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
