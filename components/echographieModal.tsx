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
import { useState, useEffect } from "react";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import { getOneClient } from "@/lib/actions/clientActions";
import { Form, FormField } from "./ui/form";
import { Input } from "./ui/input";
import MultiSelectEchographie from "./multiSelectEchographie";
import { getAllEchographies } from "@/lib/actions/echographieActions";
import { getAllDemandeEchographiesByIdVisite } from "@/lib/actions/demandeEchographieActions";
import { getAllTarifEchographieByClinique } from "@/lib/actions/tarifEchographieActions";

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

interface ExamensModalProps {
  idVisite: string;
  open: boolean;
  idClient: string;
  setOpen: (open: boolean) => void;
  setEchographiesSelectionnees: React.Dispatch<
    React.SetStateAction<DemandeEchographieFormValues[]>
  >;
  refreshExamens: () => void;
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
}: ExamensModalProps) {
  const [allEchographies, setAllEchographies] = useState<Echographie[]>([]);
  const [tabTarifEchographies, setTabTarifEchographies] = useState<
    TarifEchographie[]
  >([]);
  const [tabClinique, setTabClinique] = useState<Clinique[]>([]);
  const [selectedDemandes, setSelectedDemandes] = useState<
    DemandeEchographie[]
  >([]);
  const [selectedOptions, setSelectedOptions] = useState<DemandeEchographie[]>(
    []
  );

  useEffect(() => {
    if (open === false) {
      // setTabTarifExamens([]);
      setSelectedOptions([]);
    }
  }, [open]);

  useEffect(() => {
    const fetchData = async () => {
      const cliniques = await getAllClinique();
      setTabClinique(cliniques);
      const echographies = await getAllEchographies();
      setAllEchographies(echographies);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchDemandes = async () => {
      if (!idClient) return;
      const client = await getOneClient(idClient);
      try {
        const demandes = await getAllDemandeEchographiesByIdVisite(idVisite);
        const demandesClient = demandes.filter(
          (d: { idClient: string; idClinique: string }) =>
            d.idClient === idClient && d.idClinique === client?.idClinique
        );
        setSelectedDemandes(demandesClient);
        if (client?.idClinique) {
          const tarifs = await getAllTarifEchographieByClinique(
            client.idClinique
          );
          setTabTarifEchographies(tarifs);
        } else {
          setTabTarifEchographies([]);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des demandes :", error);
      }
    };
    fetchDemandes();
  }, [idClient, idVisite]);

  useEffect(() => {
    if (!open) {
      // Modal fermée => vider les options
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
    const tarif = tabTarifEchographies.find(
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
          tabTarifEchographies.find((t) => t.id === demande.idTarifEchographie)
            ?.prixEchographie || 0
      ),
    });
  }, [selectedOptions, tabTarifEchographies, form]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter Examen</DialogTitle>
        </DialogHeader>
        <div className="flex flow-row gap-3">
          <MultiSelectEchographie
            idClinique={tabClinique[0]?.id ?? ""}
            demandes={selectedDemandes}
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
