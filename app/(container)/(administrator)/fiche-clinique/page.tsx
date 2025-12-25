"use client";
import React from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createClinique,
  getAllClinique,
  getOneClinique,
  updateClinique,
} from "@/lib/actions/cliniqueActions";
import { getAllRegion } from "@/lib/actions/regionActions";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clinique, TableName, User } from "@prisma/client";
import { toast } from "sonner";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Eye, EyeClosed, Pencil, ArrowBigLeftDash } from "lucide-react";
import { useSession } from "next-auth/react";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import { SpinnerCustom } from "@/components/ui/spinner";
import { getOneUser } from "@/lib/actions/authActions";

interface RegionData {
  id: string;
  nomRegion: string;
  codeRegion: string;
}

export default function CreateCliniqueForm() {
  const [regions, setRegions] = useState<RegionData[]>([]);
  const [cliniques, setCliniques] = useState<Clinique[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [oneUser, setOneUser] = useState<User | null>(null);
  const [idClinique, setIdClinique] = useState<string>("");
  const [positions, setPositions] = useState<number>(-1);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

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
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!oneUser) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(oneUser.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.CLINIQUE
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

  useEffect(() => {
    const fetchData = async () => {
      const result = await getAllRegion();
      setRegions(result as RegionData[]); // Assurez-vous que result est bien de type ClientData[]
      const resultClinique = await getAllClinique();
      setCliniques(resultClinique as Clinique[]); // Assurez-vous que result est bien de type ClientData[]
    };
    fetchData();
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Clinique>();

  if (isCheckingPermissions) {
    return (
      <div className="flex justify-center gap-2 items-center h-64">
        <p className="text-gray-500">Vérification des permissions</p>
        <SpinnerCustom />
      </div>
    );
  }

  if (!hasAccess) return null;

  const handleHiddenForm = () => {
    if (!isVisible) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const onSubmit: SubmitHandler<Clinique> = async (data) => {
    try {
      if (isUpdating) {
        const CliniqueData = {
          id: idClinique,
          nomClinique: data.nomClinique,
          numClinique: data.numClinique,
          codeClinique: data.codeClinique,
          idRegion: data.idRegion,
        };

        await updateClinique(idClinique, CliniqueData);
        toast.info("Clinique modifié avec succès 🎉 !");
        setIsUpdating(false);

        const oneClinique = await getOneClinique(idClinique);
        if (oneClinique) {
          const updatedClinique = [...cliniques]; // Copie du tableau pour éviter la mutation
          updatedClinique.splice(positions, 1, oneClinique); // Remplace l'élément
          setCliniques(updatedClinique); // Met à jour l'état
        }
        reset();
      } else {
        await createClinique(data);
        toast.success("Clinique créée avec succès! 🎉 ");
        const allCliniques = await getAllClinique(); // Récupérer les nouvelles données
        setCliniques(allCliniques as Clinique[]); // Mettre à jour l'état
        handleHiddenForm();
      }

      reset(); // Réinitialisation du formulaire après soumission
      setIsVisible(false);
    } catch (error) {
      toast.error("La création/modification de la clinique a échoué !");
      console.error(error);
    }
  };

  const handleUpdateRegion = async (id: string, position: number) => {
    setPositions(position);
    const cliniqueToUpdate = cliniques.find((clinique) => clinique.id === id);

    setIdClinique(id);

    if (cliniqueToUpdate) {
      setIsUpdating(true); // Activer le mode modification

      setValue("nomClinique", cliniqueToUpdate.nomClinique);
      setValue("numClinique", cliniqueToUpdate.numClinique);
      setValue("codeClinique", cliniqueToUpdate.codeClinique);
      setValue("idRegion", cliniqueToUpdate.idRegion);

      setIsVisible(true);
    }
  };

  const nameRegion = (idRegion: string) => {
    if (regions.length > 0) {
      const region = regions.find((p) => p.id === idRegion);
      return region ? region.nomRegion : "Région introuvable"; // Valeur par défaut si non trouvé
    }
  };

  return (
    <div className="space-y-4 relative max-w-225 mx-auto p-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <ArrowBigLeftDash
              className="absolute top-2 text-blue-600"
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
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={"ghost"}
              onClick={handleHiddenForm}
              className="absolute right-2 -top-1"
            >
              {isVisible ? (
                <Eye className="text-blue-600" />
              ) : (
                <EyeClosed className="text-red-600" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Ouvrir le formulaire</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {isVisible && (
        <>
          <h2 className="text-center text-xl font-bold uppercase">
            {isUpdating
              ? "Formulaire de modification d'une Clinique"
              : "Formulaire de création d'une Clinique"}
          </h2>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="p-4 border rounded-md bg-stone-50"
          >
            <div>
              <label className="block text-sm font-medium">
                Nom de la Clinique
              </label>
              <Input
                {...register("nomClinique", {
                  required: "Nom de la Clinique est requis",
                })}
                placeholder="Nom de la Clinique"
                className="mt-1"
                name="nomClinique"
              />
              {errors.nomClinique && (
                <span className="text-red-500 text-sm">
                  {errors.nomClinique.message}
                </span>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium">Type clinique</label>
              <select
                {...register("codeClinique", {
                  required: "Région est requise",
                })}
                className="w-full p-2 border rounded-md"
                name="codeClinique"
                defaultValue=""
              >
                <>
                  <option value="" disabled className="text-gray-200">
                    Select
                  </option>
                  <option value="CA">Centre AIBEF</option>
                  <option value="CF">Centre Franchisé</option>
                </>
              </select>
              {errors.codeClinique && (
                <span className="text-red-500 text-sm">
                  {errors.codeClinique.message}
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium">
                Numéro de la Clinique
              </label>
              <Input
                {...register("numClinique", {
                  required: "Numéro de la Clinique est requis",
                })}
                placeholder="Numéro de la Clinique"
                className="mt-1"
                name="numClinique"
              />
              {errors.numClinique && (
                <span className="text-red-500 text-sm">
                  {errors.numClinique.message}
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium">Région</label>
              <select
                {...register("idRegion", { required: "Région est requise" })}
                className="w-full p-2 border rounded-md"
                name="idRegion"
                defaultValue=""
              >
                <option value="" disabled className="text-gray-200">
                  Select
                </option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.nomRegion}
                  </option>
                ))}
              </select>
              {errors.idRegion && (
                <span className="text-red-500 text-sm">
                  {errors.idRegion.message}
                </span>
              )}
            </div>

            <Button type="submit" className="mt-4">
              {isUpdating && isSubmitting
                ? "Modification en cours ..."
                : isUpdating
                ? "Modifier la Clinique"
                : isSubmitting
                ? "Création en cours ..."
                : "Créer la Clinique"}
            </Button>
          </form>
        </>
      )}

      <div className="flex-1">
        <h2 className="text-center text-xl font-bold uppercase">
          Liste des Cliniques
        </h2>
        <Table className="border  bg-white rounded-md overflow-hidden">
          <TableHeader>
            <TableRow>
              <TableCell>Nom Clinique</TableCell>
              <TableCell>Numéro Clinique</TableCell>
              <TableCell>Code Clinique</TableCell>
              <TableCell>Région</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cliniques.map((clinique, index) => (
              <TableRow key={index}>
                <TableCell>{clinique.nomClinique}</TableCell>
                <TableCell>{clinique.numClinique}</TableCell>
                <TableCell>{clinique.codeClinique}</TableCell>
                <TableCell>{nameRegion(clinique.idRegion)}</TableCell>

                <TableCell>
                  <div className="flex gap-2">
                    <Pencil
                      className="text-xl m-1 duration-300 hover:scale-150 active:scale-125 text-blue-600 cursor-pointer"
                      size={16}
                      onClick={() => handleUpdateRegion(clinique.id, index)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
