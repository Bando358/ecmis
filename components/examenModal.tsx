"use client";

import MultiSelectExamen from "./multiSelectExamen";
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
} from "@/components/ui/table";

import { DemandeExamen, Examen, Clinique, TarifExamen } from "@prisma/client";
import { useState, useEffect, useMemo } from "react";
import { Form, FormField } from "./ui/form";
import { Input } from "./ui/input";

type DemandeExamenFormValues = {
  prixExamen: number;
  id: string;
  idVisite: string;
  idClient: string;
  idClinique: string;
  idTarifExamen: string;
  updatedAt: Date;
  createdAt: Date;
  idUser: string;
};

interface ExamensModalProps {
  idVisite: string;
  open: boolean;
  idClient: string;
  setOpen: (open: boolean) => void;
  setExamensSelectionnes: React.Dispatch<
    React.SetStateAction<DemandeExamenFormValues[]>
  >;
  refreshExamens: () => void;
  // Données pré-chargées
  tabClinique: Clinique[];
  allExamens: Examen[];
  tarifExamens: TarifExamen[];
  demandesExamens: DemandeExamen[];
  excludedExamenIds?: string[]; // IDs des examens déjà ajoutés à exclure
}

type FormValues = {
  prixExamens: number[];
};

export default function ExamensModal({
  idVisite,
  open,
  setOpen,
  refreshExamens,
  idClient,
  setExamensSelectionnes,
  // Données pré-chargées
  tabClinique,
  allExamens,
  tarifExamens,
  demandesExamens,
  excludedExamenIds = [], // IDs des examens déjà ajoutés
}: ExamensModalProps) {
  const [selectedOptions, setSelectedOptions] = useState<DemandeExamen[]>([]);

  // Filtrer les examens déjà ajoutés des options disponibles
  const availableExamens = useMemo(
    () => demandesExamens.filter((d) => !excludedExamenIds.includes(d.id)),
    [demandesExamens, excludedExamenIds]
  );

  // Réinitialiser les options quand le modal se ferme
  useEffect(() => {
    if (!open) {
      setSelectedOptions([]);
    }
  }, [open]);

  const form = useForm<FormValues>({
    defaultValues: {
      prixExamens: [],
    },
  });

  const onSubmit = (data: FormValues) => {
    // Associer chaque prix à l'examen correspondant
    const examensAvecPrix = selectedOptions.map((exam, index) => ({
      ...exam,
      prixExamen: data.prixExamens[index] || 0,
    }));

    // setExamensSelectionnes(examensAvecPrix);
    // setFactureProduit((prev) => [...prev, factureProduit]);

    setExamensSelectionnes((prev) => [...prev, ...examensAvecPrix]);

    setSelectedOptions([]);
    refreshExamens();
    // setOpen(false);
  };

  const getNomExamen = (demande: DemandeExamen) => {
    const tarif = tarifExamens.find((t) => t.id === demande.idTarifExamen);
    return (
      allExamens.find((e) => e.id === tarif?.idExamen)?.nomExamen || "Inconnu"
    );
  };

  useEffect(() => {
    // Mettre à jour les prix initiaux dès que selectedOptions change
    form.reset({
      prixExamens: selectedOptions.map(
        (demande) =>
          tarifExamens.find((t) => t.id === demande.idTarifExamen)
            ?.prixExamen || 0
      ),
    });
  }, [selectedOptions, tarifExamens, form]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter Examen</DialogTitle>
        </DialogHeader>
        <div className="flex flow-row gap-3">
          <MultiSelectExamen
            idClinique={tabClinique[0]?.id ?? ""}
            demandes={availableExamens}
            selectedOptions={selectedOptions}
            setSelectedOptions={setSelectedOptions}
          />
        </div>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>{"Nom de l'examen"}</TableCell>
                  <TableCell>Prix</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedOptions.map((demande, index) => (
                  <TableRow key={index}>
                    <TableCell>{getNomExamen(demande)}</TableCell>
                    <TableCell className="flex flex-row items-center ">
                      <FormField
                        control={form.control}
                        name={`prixExamens.${index}`}
                        render={({ field }) => (
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? 0}
                            onChange={(e) => {
                              // Utilise valueAsNumber qui retourne NaN pour les valeurs invalides
                              const value = e.target.valueAsNumber;
                              field.onChange(isNaN(value) ? 0 : value);
                            }}
                          />
                        )}
                      />
                      <div>CFA</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <DialogFooter>
              <Button type="submit" disabled={selectedOptions.length === 0}>
                Valider
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() => setOpen(false)}
              >
                Annuler
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
