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
  TableHead,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pencil, ArrowLeft, Plus, X, MapPin } from "lucide-react";
import { TableSkeleton } from "@/components/ui/loading";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";

export default function CreateRegionForm() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [idRegion, setIdRegion] = useState<string>("");
  const [positions, setPositions] = useState<number>(-1);
  const route = useRouter();
  const { canRead, isLoading } = usePermissionContext();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Region>();

  useEffect(() => {
    const fetchData = async () => {
      const allRegions = await getAllRegion();
      setRegions(allRegions);
    };
    fetchData();
  }, []);

  if (isLoading) return <TableSkeleton rows={5} columns={3} />;
  if (!canRead(TableName.REGION)) {
    toast.error(ERROR_MESSAGES.PERMISSION_DENIED_READ);
    route.back();
    return null;
  }

  const handleHiddenForm = () => {
    if (isVisible) {
      setIsVisible(false);
      setIsUpdating(false);
      reset();
    } else {
      setIsVisible(true);
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
        toast.success("Région modifiée avec succès !");
        setIsUpdating(false);

        const oneRegion = await getOneRegion(idRegion);
        if (oneRegion) {
          const updatedRegions = [...regions];
          updatedRegions.splice(positions, 1, oneRegion);
          setRegions(updatedRegions);
        }
        reset();
      } else {
        await createRegion(data);
        toast.success("Région créée avec succès !");
        const allRegions = await getAllRegion();
        setRegions(allRegions);
      }

      reset();
      setIsVisible(false);
    } catch (error) {
      toast.error("L'opération a échoué !");
      console.error(error);
    }
  };

  const handleUpdateRegion = async (id: string, position: number) => {
    setPositions(position);
    const regionToUpdate = regions.find((region) => region.id === id);
    setIdRegion(id);

    if (regionToUpdate) {
      setIsUpdating(true);
      setValue("nomRegion", regionToUpdate.nomRegion);
      setValue("codeRegion", regionToUpdate.codeRegion);
      setIsVisible(true);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => route.push("/administrator")}
            className="rounded-xl hover:bg-emerald-50"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-emerald-50 to-emerald-100">
              <MapPin className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                Gestion des régions
              </h1>
              <p className="text-sm text-muted-foreground">
                {regions.length} région{regions.length > 1 ? "s" : ""}{" "}
                enregistrée{regions.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
        <Button
          onClick={handleHiddenForm}
          className={
            isVisible
              ? "bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-none"
              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200"
          }
        >
          {isVisible ? (
            <>
              <X className="h-4 w-4 mr-2" /> Fermer
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" /> Nouvelle région
            </>
          )}
        </Button>
      </div>

      {/* Formulaire */}
      {isVisible && (
        <Card className="border-emerald-200/50 shadow-lg shadow-emerald-50 overflow-hidden">
          <CardHeader className="bg-linear-to-r from-emerald-50 to-white pb-4">
            <CardTitle className="text-base font-semibold text-emerald-900">
              {isUpdating ? "Modifier la région" : "Nouvelle région"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Nom de la région
                  </label>
                  <Input
                    {...register("nomRegion", {
                      required: "Le nom est requis",
                    })}
                    placeholder="Ex: Haut Sassandra"
                    className="h-10 border-gray-200 focus:border-emerald-400 focus:ring-emerald-400"
                  />
                  {errors.nomRegion && (
                    <span className="text-red-500 text-xs">
                      {errors.nomRegion.message}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Code de la région
                  </label>
                  <Input
                    {...register("codeRegion", {
                      required: "Le code est requis",
                    })}
                    placeholder="Ex: DA"
                    className="h-10 border-gray-200 focus:border-emerald-400 focus:ring-emerald-400"
                  />
                  {errors.codeRegion && (
                    <span className="text-red-500 text-xs">
                      {errors.codeRegion.message}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleHiddenForm}
                  className="text-gray-600"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 px-6"
                >
                  {isSubmitting
                    ? "Enregistrement..."
                    : isUpdating
                      ? "Modifier"
                      : "Créer la région"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">
                  Nom de la région
                </TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">
                  Code
                </TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider w-20 text-center">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <MapPin className="h-8 w-8 text-gray-300" />
                      <p className="text-sm">Aucune région enregistrée</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                regions.map((region, index) => (
                  <TableRow
                    key={region.id}
                    className="group hover:bg-emerald-50/30 transition-colors"
                  >
                    <TableCell className="font-medium text-gray-800">
                      {region.nomRegion}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="bg-gray-100 text-gray-700 font-mono text-xs"
                      >
                        {region.codeRegion}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleUpdateRegion(region.id, index)}
                        className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-100 hover:text-emerald-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
