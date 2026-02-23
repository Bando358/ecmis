"use client";

import { useForm } from "react-hook-form";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";

import {
  Clinique,
  Echographie,
  TarifEchographie,
  DemandeEchographie,
  TypeEchographie,
} from "@prisma/client";
import { useState, useEffect, useMemo } from "react";
import { Form, FormField } from "./ui/form";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import MultiSelectEchographie from "./multiSelectEchographie";

const typeEchographieLabels: Record<TypeEchographie, string> = {
  OBST: "Obstétrique",
  GYN: "Gynécologie",
  INF: "Infertilité",
  MDG: "Médecine Gén.",
  CAR: "Cardiologie",
};

const typeEchographieColors: Record<TypeEchographie, string> = {
  OBST: "bg-pink-100 text-pink-800 border-pink-200",
  GYN: "bg-purple-100 text-purple-800 border-purple-200",
  INF: "bg-blue-100 text-blue-800 border-blue-200",
  MDG: "bg-green-100 text-green-800 border-green-200",
  CAR: "bg-red-100 text-red-800 border-red-200",
};

type DemandeEchographieFormValues = {
  prixEchographie: number;
  id: string;
  idVisite: string;
  idClient: string;
  idClinique: string;
  idTarifEchographie: string;
  updatedAt: Date;
  createdAt: Date;
  idUser: string;
};

interface EchographiesModalProps {
  idVisite: string;
  open: boolean;
  idClient: string;
  setOpen: (open: boolean) => void;
  setEchographiesSelectionnees: React.Dispatch<
    React.SetStateAction<DemandeEchographieFormValues[]>
  >;
  refreshExamens: () => void;
  tabClinique: Clinique[];
  allEchographies: Echographie[];
  tarifEchographies: TarifEchographie[];
  demandesEchographies: DemandeEchographie[];
  excludedEchographieIds?: string[];
}

type FormValues = {
  prixEchographie: number[];
};

export default function EchographiesModal({
  idVisite,
  open,
  setOpen,
  refreshExamens,
  idClient,
  setEchographiesSelectionnees,
  tabClinique,
  allEchographies,
  tarifEchographies,
  demandesEchographies,
  excludedEchographieIds = [],
}: EchographiesModalProps) {
  const [selectedOptions, setSelectedOptions] = useState<DemandeEchographie[]>(
    []
  );

  const availableEchographies = useMemo(
    () => demandesEchographies.filter((d) => !excludedEchographieIds.includes(d.id)),
    [demandesEchographies, excludedEchographieIds]
  );

  useEffect(() => {
    if (!open) {
      setSelectedOptions([]);
    }
  }, [open]);

  const form = useForm<FormValues>({
    defaultValues: {
      prixEchographie: [],
    },
  });

  const onSubmit = (data: FormValues) => {
    const echographiesAvecPrix = selectedOptions.map((exam, index) => ({
      ...exam,
      prixEchographie: data.prixEchographie[index] || 0,
    }));

    setEchographiesSelectionnees((prev) => [...prev, ...echographiesAvecPrix]);

    setSelectedOptions([]);
    refreshExamens();
  };

  const getEchographieInfo = (demande: DemandeEchographie) => {
    const tarif = tarifEchographies.find(
      (t) => t.id === demande.idTarifEchographie
    );
    const echographie = allEchographies.find((e) => e.id === tarif?.idEchographie);
    return echographie;
  };

  const getNomEchographie = (demande: DemandeEchographie) => {
    return getEchographieInfo(demande)?.nomEchographie || "Inconnu";
  };

  const getTypeEchographie = (demande: DemandeEchographie) => {
    return getEchographieInfo(demande)?.typeEchographie;
  };

  useEffect(() => {
    form.reset({
      prixEchographie: selectedOptions.map(
        (demande) =>
          tarifEchographies.find((t) => t.id === demande.idTarifEchographie)
            ?.prixEchographie || 0
      ),
    });
  }, [selectedOptions, tarifEchographies, form]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter une échographie</DialogTitle>
        </DialogHeader>
        <div className="flex flow-row gap-3">
          <MultiSelectEchographie
            idClinique={tabClinique[0]?.id ?? ""}
            demandes={availableEchographies}
            selectedOptions={selectedOptions}
            setSelectedOptions={setSelectedOptions}
            allEchographies={allEchographies}
            tarifEchographies={tarifEchographies}
          />
        </div>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            {selectedOptions.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Échographie</TableHead>
                    <TableHead className="w-28">Spécialité</TableHead>
                    <TableHead className="w-36">Prix</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedOptions.map((demande, index) => {
                    const type = getTypeEchographie(demande);
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {getNomEchographie(demande)}
                        </TableCell>
                        <TableCell>
                          {type && (
                            <Badge
                              variant="secondary"
                              className={`text-[11px] ${typeEchographieColors[type]}`}
                            >
                              {typeEchographieLabels[type]}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <FormField
                              control={form.control}
                              name={`prixEchographie.${index}`}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  className="h-8"
                                  {...field}
                                  value={field.value ?? ""}
                                  onChange={(e) =>
                                    field.onChange(parseFloat(e.target.value))
                                  }
                                />
                              )}
                            />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">CFA</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={selectedOptions.length === 0}>
                Valider
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
