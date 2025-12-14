"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "./ui/input";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { SubmitHandler, useForm } from "react-hook-form";
import MultiSelectDemandeExamen from "./multiSelectDemandeExamen";
import { DemandeExamen, TarifExamen } from "@prisma/client";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";

// Define the form values type to match the form fields
type DemandeExamenFormValues = {
  observations: string;
  idUser: string;
  idClient: string;
  idVisite: string;
  idTarifExamen: string;
};

interface DemandeExamenModalProps {
  open: boolean;
  idClient: string;
  idVisite: string;
  setOpen: (open: boolean) => void;
  setDemandeExamens: React.Dispatch<React.SetStateAction<DemandeExamen[]>>;
  refreshDemandes: () => void;
  examensDisponibles: TarifExamen[];
}

export default function DemandeExamenModal({
  open,
  setOpen,
  setDemandeExamens,
  refreshDemandes,
  idClient,
  idVisite,
  examensDisponibles,
}: DemandeExamenModalProps) {
  const [examens, setExamens] = useState<TarifExamen[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<TarifExamen[]>([]);
  const { data: session } = useSession();
  const idUser = session?.user.id as string;

  const form = useForm<DemandeExamenFormValues>({
    defaultValues: {
      observations: "",
      idUser: idUser,
      idClient: idClient,
      idVisite: idVisite,
      idTarifExamen: "", // Ajouté pour permettre l'utilisation dans FormField
    },
  });

  const ajouterExamens = () => {
    if (selectedOptions.length === 0) {
      toast.error("Veuillez sélectionner au moins un examen.");
      return;
    }

    const nouveauxExamens: TarifExamen[] = Array.isArray(selectedOptions)
      ? selectedOptions
      : [selectedOptions];

    setExamens(() => [...nouveauxExamens]);
    setSelectedOptions([]);
  };

  const onSubmit: SubmitHandler<DemandeExamenFormValues> = async (data) => {
    // const qte =
    const now = new Date();
    const newDemande: DemandeExamen = {
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2),
      idVisite: data.idVisite,
      idClient: data.idClient,
      idClinique: examens[0]?.idClinique ?? "", // Remplir selon votre logique/mettez la bonne valeur ici
      idTarifExamen: examens[0]?.id ?? "",
      updatedAt: now,
      createdAt: now,
      idUser: data.idUser,
      // Ajoutez d'autres champs si nécessaire selon votre modèle
    };
    setDemandeExamens((prevDemandes) => [...prevDemandes, newDemande]);
    refreshDemandes();
    setExamens([]);
    form.reset();
    // setOpenPrestation(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{"Nouvelle demande d'examen"}</DialogTitle>
        </DialogHeader>
        <div className="flex flow-row gap-3">
          <MultiSelectDemandeExamen
            tarifExamens={examensDisponibles}
            selectedOptions={selectedOptions}
            setSelectedOptions={setSelectedOptions}
          />
          <Button onClick={ajouterExamens}>Ajouter</Button>
        </div>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>Examen</TableCell>
                  <TableCell>Prix</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {examens.map((examen) => (
                  <TableRow key={examen?.id ?? Math.random()}>
                    <TableCell>
                      {examen?.nomExamen ?? ""}
                      <FormField
                        key={(examen?.id ?? "") + "-formfield"}
                        control={form.control}
                        name="idTarifExamen"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                {...field}
                                value={examen.id ?? ""}
                                onChange={() => field.onChange(examen.id)}
                                className="hidden"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </TableCell>
                    <TableCell>{examen?.prixExamen ?? 0} CFA</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <FormField
              control={form.control}
              name="idUser"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      value={form.watch("idUser") ?? ""}
                      className="hidden"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={examens.length === 0}>
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
