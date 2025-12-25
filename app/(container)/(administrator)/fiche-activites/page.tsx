// app/activite/page.tsx
"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createLieu,
  getAllLieu,
  getOneLieu,
  updateLieu,
} from "@/lib/actions/lieuActions";
import {
  createActivite,
  getAllActivite,
  getAllActiviteByTabIdClinique,
  updateActivite,
} from "@/lib/actions/activiteActions";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import { getAllUser, getOneUser } from "@/lib/actions/authActions";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lieu, Activite, TableName, Clinique, User } from "@prisma/client";
// import { Lieu } from "@prisma/client";
import { toast } from "sonner";
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
import { Eye, EyeClosed, Pencil, ArrowBigLeftDash, Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import { ActiviteDialog } from "@/components/ActiviteDialog";
import { SpinnerCustom } from "@/components/ui/spinner";

// Composant Skeleton pour les lignes du tableau
const TableRowSkeleton = () => {
  return (
    <TableRow>
      <TableCell>
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
      </TableCell>
      <TableCell>
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
      </TableCell>
      <TableCell className="text-center">
        <div className="h-4 bg-gray-200 rounded animate-pulse mx-auto"></div>
      </TableCell>
      <TableCell className="text-center">
        <div className="h-4 bg-gray-200 rounded animate-pulse mx-auto"></div>
      </TableCell>
      <TableCell>
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </TableCell>
    </TableRow>
  );
};

// Interface pour grouper les lieux par activité
interface GroupedLieu {
  activiteId: string;
  activiteName: string;
  lieux: Lieu[];
}

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
  const [positions, setPositions] = useState<number>(-1);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [selectedCliniqueId, setSelectedCliniqueId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [groupedLieux, setGroupedLieux] = useState<GroupedLieu[]>([]);

  const router = useRouter();
  const { data: session } = useSession();
  const idUser = session?.user.id as string;

  // === Charger l'utilisateur admin connecté ===
  useEffect(() => {
    const fetUser = async () => {
      const user = await getOneUser(idUser);
      setOneUser(user);
    };
    fetUser();
  }, [idUser]);

  useEffect(() => {
    if (!oneUser) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(oneUser.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.LIEU
        );

        if (perm?.canRead || oneUser.role === "ADMIN") {
          setHasAccess(true);
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
  }, [oneUser]);

  // Grouper les lieux par activité
  useEffect(() => {
    if (lieux.length > 0 && activites.length > 0) {
      const grouped: GroupedLieu[] = [];

      // Créer un Map pour regrouper les lieux par activité
      const lieuxByActivite = new Map<string, Lieu[]>();

      lieux.forEach((lieu) => {
        if (!lieuxByActivite.has(lieu.idActivite)) {
          lieuxByActivite.set(lieu.idActivite, []);
        }
        lieuxByActivite.get(lieu.idActivite)?.push(lieu);
      });

      // Créer le tableau groupé
      lieuxByActivite.forEach((lieuxArray, activiteId) => {
        const activite = activites.find((a) => a.id === activiteId);

        if (activite) {
          grouped.push({
            activiteId,
            activiteName: activite.libelle,
            lieux: lieuxArray,
          });
        }
      });

      setGroupedLieux(grouped);
    }
  }, [lieux, activites]);

  // Chargement des données - une seule fois
  useEffect(() => {
    const fetchData = async () => {
      // Éviter de recharger les données si elles sont déjà chargées
      if (dataLoaded) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const user = await getOneUser(session?.user?.id || "");

      try {
        // Charger les cliniques seulement si nécessaire
        if (cliniques.length === 0) {
          const resultCliniques = await getAllClinique();
          setCliniques(resultCliniques as Clinique[]);
        }

        // Charger les users seulement si nécessaire
        if (users.length === 0) {
          const resultUsers = await getAllUser();
          setUsers(resultUsers as User[]);
        }

        // Configurer les activités pour le dialog
        if (cliniques.length > 0 || (await getAllClinique()).length > 0) {
          const availableCliniques =
            cliniques.length > 0 ? cliniques : await getAllClinique();
          const firstCliniqueId = availableCliniques[0].id;
          setSelectedCliniqueId(firstCliniqueId);
          const resultActivites = await getAllActiviteByTabIdClinique([
            firstCliniqueId,
          ]);
          setActivitesForDialog(resultActivites as Activite[]);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données :", error);
        toast.error("Erreur lors du chargement des données");
      }

      const idClinique = user?.idCliniques;

      if (idClinique) {
        try {
          // Charger les activités seulement si nécessaire
          if (activites.length === 0) {
            const resultActivites = await getAllActivite();
            if (user?.role !== "ADMIN") {
              setActivites(
                resultActivites.filter((activite: { idClinique: any }) =>
                  Array.isArray(idClinique)
                    ? idClinique.includes(activite.idClinique)
                    : idClinique === activite.idClinique
                ) as Activite[]
              );
            } else {
              setActivites(resultActivites as Activite[]);
            }
          }
        } catch (error) {
          console.error("Erreur lors du chargement des activités:", error);
          toast.error("Erreur lors du chargement des activités");
        }
      } else {
        console.warn("idClinique non disponible");
        toast.warning("Clinique non définie - activités non chargées");
      }

      try {
        // Charger les lieux seulement si nécessaire
        if (lieux.length === 0) {
          const resultLieux = await getAllLieu();
          setLieux(resultLieux as Lieu[]);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des lieux:", error);
        toast.error("Erreur lors du chargement des lieux");
      } finally {
        setIsLoading(false);
        setDataLoaded(true);
      }
    };

    if (session?.user && hasAccess && !dataLoaded) {
      fetchData();
    }
  }, [
    session?.user,
    hasAccess,
    dataLoaded,
    activites.length,
    cliniques.length,
    users.length,
    lieux.length,
  ]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Lieu>();

  // Fonction handleActivite qui sera passée au dialog
  const handleActivite = async (data: Activite, isUpdating: boolean) => {
    try {
      if (isUpdating) {
        const activiteData = {
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
        };
        await updateActivite(data.id, activiteData);
        toast.info("Activité modifiée avec succès 🎉 !");

        const resultActivites = await getAllActiviteByTabIdClinique([
          data.idClinique,
        ]);
        setActivitesForDialog(resultActivites as Activite[]);
      } else {
        const activiteData = {
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
        };
        await createActivite(activiteData);
        toast.success("Activité créée avec succès! 🎉 ");
        const resultActivites = await getAllActiviteByTabIdClinique([
          data.idClinique,
        ]);
        setActivitesForDialog(resultActivites as Activite[]);
      }
    } catch (error) {
      console.error("Erreur détaillée:", error);
      throw error;
    }
  };

  const handleActiviteCreated = (activite: Activite) => {
    // Mettre à jour les données locales si nécessaire
    console.log("Activité créée:", activite);
  };

  const handleActiviteUpdated = (activite: Activite) => {
    // Mettre à jour les données locales si nécessaire
    console.log("Activité modifiée:", activite);
  };

  if (isCheckingPermissions) {
    return (
      <div className="flex justify-center gap-2 items-center h-64">
        <p className="text-gray-500">Vérification des permissions</p>
        <SpinnerCustom className="text-2xl text-gray-200" />
      </div>
    );
  }

  if (!hasAccess) return null;

  const handleHiddenForm = () => {
    setIsVisible(!isVisible);
  };

  const onSubmit: SubmitHandler<Lieu> = async (data) => {
    try {
      if (isUpdating) {
        const lieuData = {
          id: idLieu,
          lieu: data.lieu,
          localite: data.localite,
          idActivite: data.idActivite,
          createdAt: data.createdAt,
          dateDebut: data.dateDebut,
          dateFin: data.dateFin,
        };

        await updateLieu(idLieu, lieuData);
        toast.info("Lieu modifié avec succès 🎉 !");
        setIsUpdating(false);

        const oneLieu = await getOneLieu(idLieu);
        if (oneLieu) {
          const updatedLieux = [...lieux];
          updatedLieux.splice(positions, 1, oneLieu);
          setLieux(updatedLieux);
        }
        reset();
      } else {
        // CORRECTION : Supprimer createdAt de la création car il semble causer des problèmes
        const lieuData = {
          id: crypto.randomUUID(),
          lieu: data.lieu,
          localite: data.localite,
          idActivite: watch("idActivite"),
          createdAt: new Date(),
          dateDebut: new Date(data.dateDebut),
          dateFin: new Date(data.dateFin),
        };

        await createLieu(lieuData);
        toast.success("Lieu créé avec succès! 🎉 ");
        const allLieux = await getAllLieu();
        setLieux(allLieux as Lieu[]);
        handleHiddenForm();
      }

      reset();
      setIsVisible(false);
    } catch (error) {
      toast.error("La création/modification du lieu a échoué !");
      console.error("Erreur détaillée:", error);
    }
  };

  const handleUpdateLieu = async (id: string, position: number) => {
    setPositions(position);
    const lieuToUpdate = lieux.find((lieu) => lieu.id === id);

    setIdLieu(id);

    if (lieuToUpdate) {
      setIsUpdating(true);

      setValue("lieu", lieuToUpdate.lieu);
      setValue("localite", lieuToUpdate.localite);
      setValue("idActivite", lieuToUpdate.idActivite);
      setValue("dateDebut", lieuToUpdate.dateDebut);
      setValue("dateFin", lieuToUpdate.dateFin);

      setIsVisible(true);
    }
  };

  const nameCliniqueActivite = (idActivite: string) => {
    const activite = activites.find((p) => p.id === idActivite);
    const clinique = cliniques.find(
      (c) => c.id === (activite ? activite.idClinique : "")
    );
    if (clinique) {
      return clinique ? clinique.nomClinique : "introuvable";
    }
    return "Chargement...";
  };

  const nameActivite = (idActivite: string) => {
    if (activites.length > 0) {
      const activite = activites.find((p) => p.id === idActivite);
      return activite ? activite.libelle : "Activité introuvable";
    }
    return "Chargement...";
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  return (
    <div className="space-y-4 relative max-w-7xl mx-auto p-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <ArrowBigLeftDash
              className="absolute top-2 text-blue-600 cursor-pointer"
              onClick={() => {
                router.push("/administrator");
              }}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>Retour sur page administration</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Bouton pour ouvrir le dialog des activités */}
      <div className="absolute right-2 -top-1 flex gap-2">
        <ActiviteDialog
          cliniques={cliniques}
          userId={session?.user.id}
          users={users}
          activites={activitesForDialog}
          selectedCliniqueId={selectedCliniqueId}
          onActiviteCreated={handleActiviteCreated}
          onActiviteUpdated={handleActiviteUpdated}
          handleActivite={handleActivite}
        >
          <Button className="flex items-center gap-2">
            <Plus size={16} />
            Gérer les Activités
          </Button>
        </ActiviteDialog>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={"ghost"} onClick={handleHiddenForm}>
                {isVisible ? (
                  <Eye className="text-blue-600" />
                ) : (
                  <EyeClosed className="text-red-600" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ouvrir le formulaire des lieux</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Le reste du code pour le formulaire des lieux reste inchangé */}
      {isVisible && (
        <>
          <h2 className="text-center text-xl font-bold uppercase">
            {isUpdating
              ? "Formulaire de modification d'un Lieu"
              : "Formulaire de création d'un Lieu"}
          </h2>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="p-4 border rounded-md max-w-150 mx-auto bg-stone-50 grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium">Nom du lieu</label>
              <Input
                {...register("lieu", {
                  required: "Nom du lieu est requis",
                })}
                placeholder="Nom du lieu"
                className="mt-1"
                name="lieu"
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
                name="localite"
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
                name="idActivite"
                defaultValue=""
              >
                <option value="" disabled className="text-gray-200">
                  Sélectionner une activité
                </option>
                {activites.map((activite) => (
                  <option key={activite.id} value={activite.id}>
                    {nameCliniqueActivite(activite.id)} -{activite.libelle}{" "}
                    {activite.dateDebut && activite.dateFin ? (
                      <>
                        {formatDate(activite.dateDebut)} -{" "}
                        {formatDate(activite.dateFin)}
                      </>
                    ) : (
                      <>Aucune période définie</>
                    )}
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
              <label className="block text-sm font-medium">Date de début</label>
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
                })}
                className="mt-1"
              />
              {errors.dateFin && (
                <span className="text-red-500 text-sm">
                  {errors.dateFin.message}
                </span>
              )}
            </div>

            <div className="md:col-span-2">
              <Button type="submit" className="mt-4 w-full">
                {isUpdating && isSubmitting
                  ? "Modification en cours ..."
                  : isUpdating
                  ? "Modifier le Lieu"
                  : isSubmitting
                  ? "Création en cours ..."
                  : "Créer le Lieu"}
              </Button>
            </div>
          </form>
        </>
      )}

      <div className="flex-1">
        <h2 className="text-center text-xl font-bold uppercase">
          Liste des Lieux
        </h2>
        <div className="border rounded-md mt-3">
          <Table className="bg-white p-4 rounded-md overflow-hidden">
            <TableHeader>
              <TableRow>
                <TableHead>Lieu</TableHead>
                <TableHead>Localité</TableHead>
                <TableHead className="text-center">Période</TableHead>
                <TableHead className="text-center">Activité</TableHead>
                <TableHead>Antennes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Affichage du skeleton pendant le chargement
                <>
                  {Array.from({ length: 2 }).map((_, index) => (
                    <TableRowSkeleton key={index} />
                  ))}
                </>
              ) : groupedLieux.length > 0 ? (
                // Affichage des données groupées par activité avec fusion de la colonne Activité
                groupedLieux.map((group) =>
                  group.lieux.map((lieu, lieuIndex) => (
                    <TableRow key={lieu.id}>
                      <TableCell className="font-medium">{lieu.lieu}</TableCell>
                      <TableCell>{lieu.localite}</TableCell>
                      <TableCell className="text-center">
                        {lieu.dateDebut && lieu.dateFin ? (
                          <span>
                            {formatDate(lieu.dateDebut)} -{" "}
                            {formatDate(lieu.dateFin)}
                          </span>
                        ) : (
                          <span>Aucune période définie</span>
                        )}
                      </TableCell>

                      {/* Colonne Activité fusionnée - seulement sur la première ligne de chaque groupe */}
                      {lieuIndex === 0 ? (
                        <TableCell
                          rowSpan={group.lieux.length}
                          className="text-center align-middle"
                        >
                          {group.activiteName}
                        </TableCell>
                      ) : null}

                      <TableCell>
                        {nameCliniqueActivite(lieu.idActivite)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Pencil
                            className="text-xl m-1 duration-300 hover:scale-150 active:scale-125 text-blue-600 cursor-pointer"
                            size={16}
                            onClick={() => {
                              // Trouver l'index global du lieu dans le tableau lieux
                              const globalIndex = lieux.findIndex(
                                (l) => l.id === lieu.id
                              );
                              handleUpdateLieu(lieu.id, globalIndex);
                            }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )
              ) : lieux.length > 0 ? (
                // Fallback si le groupement n'a pas fonctionné - affichage normal
                lieux.map((lieu, index) => (
                  <TableRow key={lieu.id}>
                    <TableCell className="font-medium">{lieu.lieu}</TableCell>
                    <TableCell>{lieu.localite}</TableCell>
                    <TableCell className="text-center">
                      {lieu.dateDebut && lieu.dateFin ? (
                        <span>
                          {formatDate(lieu.dateDebut)} -{" "}
                          {formatDate(lieu.dateFin)}
                        </span>
                      ) : (
                        <span>Aucune période définie</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {nameActivite(lieu.idActivite)}
                    </TableCell>
                    <TableCell>
                      {nameCliniqueActivite(lieu.idActivite)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Pencil
                          className="text-xl m-1 duration-300 hover:scale-150 active:scale-125 text-blue-600 cursor-pointer"
                          size={16}
                          onClick={() => handleUpdateLieu(lieu.id, index)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                // Message quand il n'y a pas de données
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    Aucun lieu trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
