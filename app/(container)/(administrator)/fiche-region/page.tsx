"use client";
import { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  createRegion,
  getAllRegion,
  getOneRegion,
  updateRegion,
} from "@/lib/actions/regionActions";
import { Region, TableName } from "@prisma/client";
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
import { SpinnerBar } from "@/components/ui/spinner-bar";

export default function CreateRegionForm() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [idRegion, setIdRegion] = useState<string>("");
  const [positions, setPositions] = useState<number>(-1);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const route = useRouter();
  const { data: session } = useSession();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<Region>();

  useEffect(() => {
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!session?.user) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(session.user.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.REGION
        );

        if (perm?.canRead || session.user.role === "ADMIN") {
          setHasAccess(true);
        } else {
          alert("Vous n'avez pas la permission d'accéder à cette page.");
          route.back();
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
  }, [session?.user, route]);

  useEffect(() => {
    const fetchData = async () => {
      const allRegions = await getAllRegion();
      setRegions(allRegions);
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

  const handleHiddenForm = () => {
    if (!isVisible) {
      setIsVisible(true);
      // rafraichirPage();
    } else {
      setIsVisible(false);
    }
  };

  const onSubmit: SubmitHandler<Region> = async (data: Region) => {
    try {
      if (isUpdating) {
        const regionData = {
          id: idRegion,
          nomRegion: data.nomRegion,
          codeRegion: data.codeRegion,
        };

        await updateRegion(idRegion, regionData);
        toast.info("Région modifié avec succès 🎉 !");
        setIsUpdating(false);

        const oneRegion = await getOneRegion(idRegion);
        if (oneRegion) {
          const updatedRegions = [...regions]; // Copie du tableau pour éviter la mutation
          updatedRegions.splice(positions, 1, oneRegion); // Remplace l'élément
          setRegions(updatedRegions); // Met à jour l'état
        }
        reset();
      } else {
        await createRegion(data);
        toast.success("Région créer avec succès! 🎉 ");
        const allRegions = await getAllRegion();
        setRegions(allRegions);
        handleHiddenForm();
        // dataPrestataire();
      }

      reset(); // Réinitialisation du formulaire après soumission
      setIsVisible(false);
    } catch (error) {
      toast.error("L'incription du prestataire a échoué !");
      console.error(error);
    }
  };

  const handleUpdateRegion = async (id: string, position: number) => {
    setPositions(position);
    const regionToUpdate = regions.find((region) => region.id === id);

    setIdRegion(id);

    if (regionToUpdate) {
      setIsUpdating(true); // Activer le mode modification

      setValue("nomRegion", regionToUpdate.nomRegion);
      setValue("codeRegion", regionToUpdate.codeRegion);

      setIsVisible(true);
    }
  };

  return (
    <div className="space-y-4 relative max-w-3xl mx-auto p-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <ArrowBigLeftDash
              className="absolute top-2 text-blue-600"
              onClick={() => {
                route.push("/administrator");
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
                <Eye className="text-blue-600 font-extrabold text-3xl" />
              ) : (
                <EyeClosed className="text-red-600 font-extrabold text-3xl" />
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
              ? "Formulaire de modification d'une Région"
              : "Formulaire de création d'une Région"}
          </h2>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="p-4 border rounded-md bg-stone-50"
          >
            <div>
              <label className="block text-sm font-medium">
                Nom de la Région
              </label>
              <Input
                {...register("nomRegion", {
                  required: "Nom de la Région est requis",
                })}
                placeholder="Nom de la Région"
                className="mt-1"
                name="nomRegion"
              />
              {errors.nomRegion && (
                <span className="text-red-500 text-sm">
                  {errors.nomRegion.message}
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium">
                Code de la Région
              </label>
              <Input
                {...register("codeRegion", {
                  required: "Code de la Région est requis",
                })}
                placeholder="Code de la Région"
                className="mt-1"
                name="codeRegion"
              />
              {errors.codeRegion && (
                <span className="text-red-500 text-sm">
                  {errors.codeRegion.message}
                </span>
              )}
            </div>

            <Button type="submit" className="mt-4">
              {isUpdating ? "Modification la Région" : "Créer la Région"}
            </Button>
          </form>
        </>
      )}
      <div className="flex-1">
        <h2 className="text-center text-xl font-bold uppercase">
          Liste des Régions
        </h2>
        <Table className="border">
          <TableHeader>
            <TableRow>
              <TableCell>Nom Région</TableCell>
              <TableCell>Code Région</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {regions.map((region, index) => (
              <TableRow key={index}>
                <TableCell>{region.nomRegion}</TableCell>
                <TableCell>{region.codeRegion}</TableCell>

                <TableCell>
                  <div className="flex gap-2">
                    <Pencil
                      className="text-xl m-1 duration-300 hover:scale-150 active:scale-125 text-blue-600 cursor-pointer"
                      size={16}
                      onClick={() => handleUpdateRegion(region.id, index)}
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
