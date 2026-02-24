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
import { Clinique, TableName } from "@prisma/client";
import { toast } from "sonner";
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
import { Pencil, ArrowLeft, Plus, X, Building2 } from "lucide-react";
import { TableSkeleton } from "@/components/ui/loading";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";

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
  const [idClinique, setIdClinique] = useState<string>("");
  const [positions, setPositions] = useState<number>(-1);

  const router = useRouter();
  const { canRead, isLoading } = usePermissionContext();

  useEffect(() => {
    const fetchData = async () => {
      const [result, resultClinique] = await Promise.all([
        getAllRegion(),
        getAllClinique(),
      ]);
      setRegions(result as RegionData[]);
      setCliniques(resultClinique as Clinique[]);
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

  if (isLoading) return <TableSkeleton rows={5} columns={5} />;
  if (!canRead(TableName.CLINIQUE)) {
    toast.error(ERROR_MESSAGES.PERMISSION_DENIED_READ);
    router.back();
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

  const onSubmit: SubmitHandler<Clinique> = async (data) => {
    try {
      if (isUpdating) {
        const CliniqueData = {
          id: idClinique,
          nomClinique: data.nomClinique,
          numClinique: data.numClinique,
          codeClinique: data.codeClinique,
          idRegion: data.idRegion,
          idDistrict: data.idDistrict ?? null,
        };

        await updateClinique(idClinique, CliniqueData);
        toast.success("Clinique modifiée avec succès !");
        setIsUpdating(false);

        const oneClinique = await getOneClinique(idClinique);
        if (oneClinique) {
          const updatedClinique = [...cliniques];
          updatedClinique.splice(positions, 1, oneClinique);
          setCliniques(updatedClinique);
        }
        reset();
      } else {
        await createClinique(data);
        toast.success("Clinique créée avec succès !");
        const allCliniques = await getAllClinique();
        setCliniques(allCliniques as Clinique[]);
      }

      reset();
      setIsVisible(false);
    } catch (error) {
      toast.error("L'opération a échoué !");
      console.error(error);
    }
  };

  const handleUpdateClinique = async (id: string, position: number) => {
    setPositions(position);
    const cliniqueToUpdate = cliniques.find((clinique) => clinique.id === id);
    setIdClinique(id);

    if (cliniqueToUpdate) {
      setIsUpdating(true);
      setValue("nomClinique", cliniqueToUpdate.nomClinique);
      setValue("numClinique", cliniqueToUpdate.numClinique);
      setValue("codeClinique", cliniqueToUpdate.codeClinique);
      setValue("idRegion", cliniqueToUpdate.idRegion);
      setIsVisible(true);
    }
  };

  const nameRegion = (idRegion: string) => {
    const region = regions.find((p) => p.id === idRegion);
    return region ? region.nomRegion : "—";
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/administrator")}
            className="rounded-xl hover:bg-blue-50"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-blue-50 to-blue-100">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                Gestion des cliniques
              </h1>
              <p className="text-sm text-muted-foreground">
                {cliniques.length} clinique{cliniques.length > 1 ? "s" : ""}{" "}
                enregistrée{cliniques.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
        <Button
          onClick={handleHiddenForm}
          className={
            isVisible
              ? "bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-none"
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200"
          }
        >
          {isVisible ? (
            <>
              <X className="h-4 w-4 mr-2" /> Fermer
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" /> Nouvelle clinique
            </>
          )}
        </Button>
      </div>

      {/* Formulaire */}
      {isVisible && (
        <Card className="border-blue-200/50 shadow-lg shadow-blue-50 overflow-hidden">
          <CardHeader className="bg-linear-to-br from-blue-50 to-white pb-4">
            <CardTitle className="text-base font-semibold text-blue-900">
              {isUpdating ? "Modifier la clinique" : "Nouvelle clinique"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Nom de la clinique
                  </label>
                  <Input
                    {...register("nomClinique", {
                      required: "Le nom est requis",
                    })}
                    placeholder="Ex: Clinique DALOA"
                    className="h-10 border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                  />
                  {errors.nomClinique && (
                    <span className="text-red-500 text-xs">
                      {errors.nomClinique.message}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Numéro
                  </label>
                  <Input
                    {...register("numClinique", {
                      required: "Le numéro est requis",
                    })}
                    placeholder="Ex: 01"
                    className="h-10 border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                  />
                  {errors.numClinique && (
                    <span className="text-red-500 text-xs">
                      {errors.numClinique.message}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Type de clinique
                  </label>
                  <select
                    {...register("codeClinique", {
                      required: "Le type est requis",
                    })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-md text-sm bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Sélectionner un type
                    </option>
                    <option value="CA">Centre AIBEF</option>
                    <option value="CF">Centre Franchisé</option>
                  </select>
                  {errors.codeClinique && (
                    <span className="text-red-500 text-xs">
                      {errors.codeClinique.message}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Région
                  </label>
                  <select
                    {...register("idRegion", {
                      required: "La région est requise",
                    })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-md text-sm bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Sélectionner une région
                    </option>
                    {regions.map((region) => (
                      <option key={region.id} value={region.id}>
                        {region.nomRegion}
                      </option>
                    ))}
                  </select>
                  {errors.idRegion && (
                    <span className="text-red-500 text-xs">
                      {errors.idRegion.message}
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
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 px-6"
                >
                  {isSubmitting
                    ? "Enregistrement..."
                    : isUpdating
                      ? "Modifier"
                      : "Créer la clinique"}
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
                  Nom
                </TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">
                  Numéro
                </TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">
                  Type
                </TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">
                  Région
                </TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider w-20 text-center">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cliniques.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Building2 className="h-8 w-8 text-gray-300" />
                      <p className="text-sm">Aucune clinique enregistrée</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                cliniques.map((clinique, index) => (
                  <TableRow
                    key={clinique.id}
                    className="group hover:bg-blue-50/30 transition-colors"
                  >
                    <TableCell className="font-medium text-gray-800">
                      {clinique.nomClinique}
                    </TableCell>
                    <TableCell className="text-gray-600 font-mono text-sm">
                      {clinique.numClinique}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          clinique.codeClinique === "CA"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }
                      >
                        {clinique.codeClinique === "CA"
                          ? "Centre AIBEF"
                          : "Centre Franchisé"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {nameRegion(clinique.idRegion)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleUpdateClinique(clinique.id, index)}
                        className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-100 hover:text-blue-700"
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
