// components/ActiviteDialog.tsx
"use client";
import React, { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activite, Clinique } from "@prisma/client";
import { SafeUser } from "@/types/prisma";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

interface ActiviteDialogProps {
  cliniques: Clinique[];
  users: SafeUser[];
  userId?: string;
  activites: Activite[];
  selectedCliniqueId: string;
  onCliniqueChange: (cliniqueId: string) => void;
  onActiviteCreated: (activite: Activite) => void;
  onActiviteUpdated: (activite: Activite) => void;
  onActiviteDeleted: (activiteId: string) => void;
  handleActivite: (data: Activite, isUpdating: boolean) => Promise<void>;
  handleDeleteActivite: (id: string) => Promise<void>;
  children?: React.ReactNode;
}

export function ActiviteDialog({
  cliniques,
  userId,
  activites,
  selectedCliniqueId,
  onCliniqueChange,
  onActiviteCreated,
  onActiviteUpdated,
  onActiviteDeleted,
  handleActivite,
  handleDeleteActivite,
  children,
}: ActiviteDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Activite>();

  const watchDateDebut = watch("dateDebut");

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  const onSubmit: SubmitHandler<Activite> = async (data) => {
    // Validation dateFin > dateDebut
    if (new Date(data.dateFin) <= new Date(data.dateDebut)) {
      toast.error("La date de fin doit être postérieure à la date de début.");
      return;
    }

    try {
      if (isUpdating && editingId) {
        data.id = editingId;
      }
      await handleActivite(data, isUpdating);

      if (isUpdating) {
        onActiviteUpdated(data);
        setIsUpdating(false);
        setEditingId(null);
      } else {
        onActiviteCreated(data);
      }

      reset();
      setShowForm(false);
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("La création/modification de l'activité a échoué !");
    }
  };

  const handleEdit = (activite: Activite) => {
    setIsUpdating(true);
    setEditingId(activite.id);
    setShowForm(true);

    setValue("libelle", activite.libelle);
    setValue("dateDebut", activite.dateDebut);
    setValue("dateFin", activite.dateFin);
    setValue("objectifClt", activite.objectifClt);
    setValue("objectifSrv", activite.objectifSrv);
    setValue("commentaire", activite.commentaire);
    setValue("idClinique", activite.idClinique);
    setValue("idUser", activite.idUser);
    setValue("createdAt", activite.createdAt);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await handleDeleteActivite(deleteId);
      onActiviteDeleted(deleteId);
      toast.success("Activité supprimée avec succès !");
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de la suppression.");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setIsUpdating(false);
    setEditingId(null);
    reset();
  };

  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (!open) {
      handleCancel();
    }
  };

  const getCliniqueNom = (idClinique: string) => {
    const clinique = cliniques.find((c) => c.id === idClinique);
    return clinique?.nomClinique || "Inconnue";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {children || (
            <Button className="flex items-center gap-2">
              <Plus size={16} />
              Gérer les Activités
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-3xl! max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestion des Activités</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Filtre par clinique */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">
                  Filtrer par clinique
                </label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={selectedCliniqueId}
                  onChange={(e) => onCliniqueChange(e.target.value)}
                >
                  {cliniques.map((clinique) => (
                    <option key={clinique.id} value={clinique.id}>
                      {clinique.nomClinique}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-5">
                <Button
                  onClick={() => {
                    setShowForm(true);
                    setIsUpdating(false);
                    setEditingId(null);
                    reset();
                  }}
                  className="flex items-center gap-2"
                >
                  <Plus size={16} />
                  Nouvelle Activité
                </Button>
              </div>
            </div>

            {/* Formulaire (affiché/masqué) */}
            {showForm && (
              <div className="p-4 border rounded-md bg-stone-50">
                <h3 className="text-lg font-semibold mb-4">
                  {isUpdating
                    ? "Modifier une Activité"
                    : "Créer une nouvelle Activité"}
                </h3>
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium">
                      Libellé de {"l'activité"}
                    </label>
                    <Input
                      {...register("libelle", {
                        required: "Libellé de l'activité est requis",
                      })}
                      placeholder="Libellé de l'activité"
                      className="mt-1"
                    />
                    {errors.libelle && (
                      <span className="text-red-500 text-sm">
                        {errors.libelle.message}
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
                    <label className="block text-sm font-medium">
                      Date de fin
                    </label>
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

                  <div>
                    <label className="block text-sm font-medium">
                      Objectif Clients
                    </label>
                    <Input
                      type="number"
                      {...register("objectifClt", {
                        valueAsNumber: true,
                        min: {
                          value: 0,
                          message: "L'objectif doit être positif",
                        },
                      })}
                      placeholder="Objectif clients (optionnel)"
                      className="mt-1"
                    />
                    {errors.objectifClt && (
                      <span className="text-red-500 text-sm">
                        {errors.objectifClt.message}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium">
                      Objectif Services
                    </label>
                    <Input
                      type="number"
                      {...register("objectifSrv", {
                        valueAsNumber: true,
                        min: {
                          value: 0,
                          message: "L'objectif doit être positif",
                        },
                      })}
                      placeholder="Objectif services (optionnel)"
                      className="mt-1"
                    />
                    {errors.objectifSrv && (
                      <span className="text-red-500 text-sm">
                        {errors.objectifSrv.message}
                      </span>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium">
                      Commentaire
                    </label>
                    <textarea
                      {...register("commentaire")}
                      placeholder="Commentaire (optionnel)"
                      className="w-full p-2 border rounded-md mt-1"
                      rows={3}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium">
                      Clinique
                    </label>
                    <select
                      {...register("idClinique", {
                        required: "Clinique est requise",
                      })}
                      className="w-full p-2 border rounded-md"
                      defaultValue={selectedCliniqueId || ""}
                    >
                      <option value="" disabled>
                        Sélectionner une clinique
                      </option>
                      {cliniques.map((clinique) => (
                        <option key={clinique.id} value={clinique.id}>
                          {clinique.nomClinique}
                        </option>
                      ))}
                    </select>
                    {errors.idClinique && (
                      <span className="text-red-500 text-sm">
                        {errors.idClinique.message}
                      </span>
                    )}
                  </div>

                  <input
                    type="hidden"
                    {...register("idUser")}
                    value={userId || ""}
                  />

                  <div className="md:col-span-2 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      className="flex-1"
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      {isUpdating
                        ? isSubmitting
                          ? "Modification..."
                          : "Modifier l'Activité"
                        : isSubmitting
                          ? "Création..."
                          : "Créer l'Activité"}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Liste des activités existantes */}
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow className="bg-stone-50">
                    <TableHead>Libellé</TableHead>
                    <TableHead className="text-center">Période</TableHead>
                    <TableHead className="text-center">Obj. Clients</TableHead>
                    <TableHead className="text-center">Obj. Services</TableHead>
                    <TableHead>Clinique</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activites.length > 0 ? (
                    activites.map((activite) => (
                      <TableRow
                        key={activite.id}
                        className={`hover:bg-gray-50 ${
                          editingId === activite.id ? "bg-blue-50" : ""
                        }`}
                      >
                        <TableCell className="font-medium">
                          {activite.libelle}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {formatDate(activite.dateDebut)} -{" "}
                          {formatDate(activite.dateFin)}
                        </TableCell>
                        <TableCell className="text-center">
                          {activite.objectifClt ?? "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {activite.objectifSrv ?? "-"}
                        </TableCell>
                        <TableCell>
                          {getCliniqueNom(activite.idClinique)}
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
                                    onClick={() => handleEdit(activite)}
                                    aria-label="Modifier l'activité"
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
                                    onClick={() => setDeleteId(activite.id)}
                                    aria-label="Supprimer l'activité"
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
                        className="text-center py-6 text-gray-500"
                      >
                        Aucune activité pour cette clinique
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette activité ? Cette action
              est irréversible. Les lieux et visites rattachés empêcheront la
              suppression.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
