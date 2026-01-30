"use client";

// import MultiSelectExamen from "./multiSelectExamen";
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

import {
  Clinique,
  Echographie,
  TarifEchographie,
  DemandeEchographie,
} from "@prisma/client";
import { useState, useEffect, useMemo } from "react";
import { Form, FormField } from "./ui/form";
import { Input } from "./ui/input";
import MultiSelectEchographie from "./multiSelectEchographie";

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
  // Données pré-chargées
  tabClinique: Clinique[];
  allEchographies: Echographie[];
  tarifEchographies: TarifEchographie[];
  demandesEchographies: DemandeEchographie[];
  excludedEchographieIds?: string[]; // IDs des échographies déjà ajoutées à exclure
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
  // Données pré-chargées
  tabClinique,
  allEchographies,
  tarifEchographies,
  demandesEchographies,
  excludedEchographieIds = [], // IDs des échographies déjà ajoutées
}: EchographiesModalProps) {
  const [selectedOptions, setSelectedOptions] = useState<DemandeEchographie[]>(
    []
  );

  // Filtrer les échographies déjà ajoutées des options disponibles
  const availableEchographies = useMemo(
    () => demandesEchographies.filter((d) => !excludedEchographieIds.includes(d.id)),
    [demandesEchographies, excludedEchographieIds]
  );

  // Réinitialiser les options quand le modal se ferme
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
    // Associer chaque prix à l'examen correspondant
    const echographiesAvecPrix = selectedOptions.map((exam, index) => ({
      ...exam,
      prixEchographie: data.prixEchographie[index] || 0,
    }));

    // setExamensSelectionnes(examensAvecPrix);
    // setFactureProduit((prev) => [...prev, factureProduit]);

    setEchographiesSelectionnees((prev) => [...prev, ...echographiesAvecPrix]);

    setSelectedOptions([]);
    refreshExamens();
    // setOpen(false);
  };

  const getNomEchographie = (demande: DemandeEchographie) => {
    const tarif = tarifEchographies.find(
      (t) => t.id === demande.idTarifEchographie
    );
    return (
      allEchographies.find((e) => e.id === tarif?.idEchographie)
        ?.nomEchographie || "Inconnu"
    );
  };

  useEffect(() => {
    // Mettre à jour les prix initiaux dès que selectedOptions change
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter Examen</DialogTitle>
        </DialogHeader>
        <div className="flex flow-row gap-3">
          <MultiSelectEchographie
            idClinique={tabClinique[0]?.id ?? ""}
            demandes={availableEchographies}
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
                    <TableCell>{getNomEchographie(demande)}</TableCell>
                    <TableCell className="flex flex-row items-center ">
                      <FormField
                        control={form.control}
                        name={`prixEchographie.${index}`}
                        render={({ field }) => (
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value))
                            }
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
