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
import { Lieu, Activite, TableName, Clinique } from "@prisma/client";
import { SafeUser } from "@/types/prisma";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Pencil,
  Plus,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowLeft,
  CalendarCheck,
  MapPinned,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { ActiviteDialog } from "@/components/ActiviteDialog";
import Select from "react-select";
import { TableSkeleton, TableRowSkeleton } from "@/components/ui/loading";

export default function ActivitePage() {
  const [activites, setActivites] = useState<Activite[]>([]);
  const [lieux, setLieux] = useState<Lieu[]>([]);
  const [cliniques, setCliniques] = useState<Clinique[]>([]);
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [activitesForDialog, setActivitesForDialog] = useState<Activite[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [idLieu, setIdLieu] = useState<string>("");
  const [oneUser, setOneUser] = useState<SafeUser | null>(null);
  const [selectedCliniqueId, setSelectedCliniqueId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [deleteLieuId, setDeleteLieuId] = useState<string | null>(null);
  const [isDeletingLieu, setIsDeletingLieu] = useState(false);

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

  useEffect(() => {
    if (!idUser) return;
    const fetchUser = async () => {
      const user = await getOneUser(idUser);
      if (user) setOneUser(user);
    };
    fetchUser();
  }, [idUser]);

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

        // Non-admin : ne voit que ses cliniques
        const visibleCliniques =
          oneUser.role !== "ADMIN"
            ? (resultCliniques as Clinique[]).filter((c) =>
                oneUser.idCliniques.includes(c.id),
              )
            : (resultCliniques as Clinique[]);
        setCliniques(visibleCliniques);
        setUsers(resultUsers as SafeUser[]);

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

        // Filtrer les lieux : ne garder que ceux liés aux activités visibles
        if (oneUser.role !== "ADMIN") {
          const visibleActiviteIds = new Set(
            (resultActivites as Activite[])
              .filter((a) => oneUser.idCliniques.includes(a.idClinique))
              .map((a) => a.id),
          );
          setLieux(
            (resultLieux as Lieu[]).filter((l) => visibleActiviteIds.has(l.idActivite)),
          );
        } else {
          setLieux(resultLieux as Lieu[]);
        }

        if (visibleCliniques.length > 0) {
          const firstCliniqueId = visibleCliniques[0].id;
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

  const filteredLieux = useMemo(() => {
    let filtered = lieux;

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

    if (filterActiviteId) {
      filtered = filtered.filter(
        (lieu) => lieu.idActivite === filterActiviteId
      );
    }

    return filtered;
  }, [lieux, searchTerm, filterActiviteId, activites, cliniques]);

  const paginatedLieux = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLieux.slice(start, start + itemsPerPage);
  }, [filteredLieux, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredLieux.length / itemsPerPage);

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
        toast.success("Activité modifiée avec succès !");
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

      const refreshed = await getAllActiviteByTabIdClinique([data.idClinique]);
      setActivitesForDialog(refreshed as Activite[]);

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
        toast.success("Lieu modifié avec succès !");
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

  const activiteFilterOptions = [
    { value: "", label: "Toutes les activités" },
    ...activites.map((a) => ({
      value: a.id,
      label: `${a.libelle} (${getCliniqueNameByActivite(a.id)})`,
    })),
  ];

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  if (isLoadingPermissions) return <TableSkeleton rows={6} columns={6} />;
  if (!canRead(TableName.ACTIVITE)) { toast.error(ERROR_MESSAGES.PERMISSION_DENIED_READ); router.back(); return null; }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/administrator")}
            className="rounded-xl hover:bg-cyan-50"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-50 to-cyan-100">
              <CalendarCheck className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Activités & Lieux</h1>
              <p className="text-sm text-muted-foreground">
                {lieux.length} lieu{lieux.length > 1 ? "x" : ""} enregistré{lieux.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
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
            <Button className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-md shadow-cyan-200">
              <CalendarCheck className="h-4 w-4 mr-2" />
              Gérer les activités
            </Button>
          </ActiviteDialog>

          <Button
            onClick={() => {
              if (isVisible) handleCancelForm();
              else setIsVisible(true);
            }}
            className={isVisible
              ? "bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-none"
              : "bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-200"
            }
          >
            {isVisible ? (
              <><X className="h-4 w-4 mr-2" /> Fermer</>
            ) : (
              <><Plus className="h-4 w-4 mr-2" /> Nouveau lieu</>
            )}
          </Button>
        </div>
      </div>

      {/* Formulaire Lieu */}
      {isVisible && (
        <Card className="border-cyan-200/50 shadow-lg shadow-cyan-50 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-cyan-50 to-white pb-4">
            <CardTitle className="text-base font-semibold text-cyan-900">
              {isUpdating ? "Modifier le lieu" : "Nouveau lieu"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Nom du lieu</label>
                  <Input
                    {...register("lieu", { required: "Nom du lieu est requis" })}
                    placeholder="Nom du lieu"
                    className="h-10 border-gray-200 focus:border-cyan-400 focus:ring-cyan-400"
                  />
                  {errors.lieu && (
                    <span className="text-red-500 text-xs">{errors.lieu.message}</span>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Localité</label>
                  <Input
                    {...register("localite", { required: "Localité est requise" })}
                    placeholder="Localité"
                    className="h-10 border-gray-200 focus:border-cyan-400 focus:ring-cyan-400"
                  />
                  {errors.localite && (
                    <span className="text-red-500 text-xs">{errors.localite.message}</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Activité</label>
                <select
                  {...register("idActivite", { required: "Activité est requise" })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-md text-sm bg-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none"
                  defaultValue=""
                >
                  <option value="" disabled>Sélectionner une activité</option>
                  {activites.map((activite) => (
                    <option key={activite.id} value={activite.id}>
                      {getCliniqueNameByActivite(activite.id)} - {activite.libelle}{" "}
                      ({formatDate(activite.dateDebut)} - {formatDate(activite.dateFin)})
                    </option>
                  ))}
                </select>
                {errors.idActivite && (
                  <span className="text-red-500 text-xs">{errors.idActivite.message}</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Date de début</label>
                  <Input
                    type="datetime-local"
                    {...register("dateDebut", { required: "Date de début est requise" })}
                    className="h-10 border-gray-200 focus:border-cyan-400 focus:ring-cyan-400"
                  />
                  {errors.dateDebut && (
                    <span className="text-red-500 text-xs">{errors.dateDebut.message}</span>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Date de fin</label>
                  <Input
                    type="datetime-local"
                    {...register("dateFin", {
                      required: "Date de fin est requise",
                      validate: (value) => {
                        if (watchDateDebut && new Date(value) <= new Date(watchDateDebut)) {
                          return "La date de fin doit être postérieure à la date de début";
                        }
                        return true;
                      },
                    })}
                    className="h-10 border-gray-200 focus:border-cyan-400 focus:ring-cyan-400"
                  />
                  {errors.dateFin && (
                    <span className="text-red-500 text-xs">{errors.dateFin.message}</span>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={handleCancelForm} className="text-gray-600">
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-md shadow-cyan-200 px-6"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Enregistrement..."
                    : isUpdating ? "Modifier le lieu" : "Créer le lieu"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Recherche + Table */}
      <Card className="shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50/50 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par lieu, localité, activité, clinique..."
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
          <div className="w-full sm:w-64">
            <Select
              options={activiteFilterOptions}
              value={activiteFilterOptions.find((opt) => opt.value === filterActiviteId)}
              onChange={(option) => setFilterActiviteId(option?.value || "")}
              className="basic-single"
              classNamePrefix="select"
              placeholder="Filtrer par activité"
            />
          </div>
          <div className="w-full sm:w-44">
            <Select
              options={itemsPerPageOptions}
              value={itemsPerPageOptions.find((opt) => opt.value === itemsPerPage)}
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

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                <TableHead className="w-14 text-center font-semibold text-gray-600 text-xs uppercase tracking-wider">N°</TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Lieu</TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Localité</TableHead>
                <TableHead className="text-center font-semibold text-gray-600 text-xs uppercase tracking-wider">Période</TableHead>
                <TableHead className="text-center font-semibold text-gray-600 text-xs uppercase tracking-wider">Activité</TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Antenne</TableHead>
                <TableHead className="w-24 text-center font-semibold text-gray-600 text-xs uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRowSkeleton key={index} columns={7} />
                ))
              ) : paginatedLieux.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <MapPinned className="h-8 w-8 text-gray-300" />
                      <p className="text-sm">
                        {searchTerm || filterActiviteId
                          ? "Aucun lieu ne correspond aux filtres"
                          : "Aucun lieu enregistré"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLieux.map((lieu, index) => (
                  <TableRow key={lieu.id} className="group hover:bg-cyan-50/30 transition-colors">
                    <TableCell className="text-center text-gray-400 font-mono text-sm">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-gray-800">{lieu.lieu}</TableCell>
                    <TableCell className="text-sm text-gray-600">{lieu.localite}</TableCell>
                    <TableCell className="text-center text-sm text-gray-500">
                      {formatDate(lieu.dateDebut)} - {formatDate(lieu.dateFin)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-cyan-50 text-cyan-700 border-cyan-200">
                        {getActiviteName(lieu.idActivite)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {getCliniqueNameByActivite(lieu.idActivite)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-cyan-100 hover:text-cyan-700"
                          onClick={() => handleUpdateLieu(lieu.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-red-100 hover:text-red-700"
                          onClick={() => setDeleteLieuId(lieu.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t bg-gray-50/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-sm text-gray-500">
              {(currentPage - 1) * itemsPerPage + 1} à{" "}
              {Math.min(currentPage * itemsPerPage, filteredLieux.length)} sur{" "}
              {filteredLieux.length}
            </div>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={goToFirstPage} disabled={currentPage === 1} className="h-8 w-8 p-0">
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToPreviousPage} disabled={currentPage === 1} className="h-8 w-8 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn("h-8 w-8 p-0", currentPage === pageNum && "bg-cyan-600 hover:bg-cyan-700")}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button variant="outline" size="sm" onClick={goToNextPage} disabled={currentPage === totalPages} className="h-8 w-8 p-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToLastPage} disabled={currentPage === totalPages} className="h-8 w-8 p-0">
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-sm text-gray-500">
              Page {currentPage} sur {totalPages}
            </div>
          </div>
        )}

        {filteredLieux.length > 0 && totalPages <= 1 && (
          <div className="px-4 py-3 border-t bg-gray-50/30 text-sm text-gray-500 text-right">
            {filteredLieux.length} résultat{filteredLieux.length > 1 ? "s" : ""}
            {(searchTerm || filterActiviteId) && ` sur ${lieux.length}`}
          </div>
        )}
      </Card>

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
