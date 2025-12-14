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
import { DemandeEchographie, TarifEchographie } from "@prisma/client";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import MultiSelectDemandeEchographie from "./multiSelectDemandeEchographie";

// Define the form values type to match the form fields
type DemandeEchographieFormValues = {
  observations: string;
  idUser: string;
  idClient: string;
  idVisite: string;
  // serviceEchographie: string;
  idTarifEchographie: string;
};

interface DemandeEchographieModalProps {
  open: boolean;
  idClient: string;
  idVisite: string;
  setOpen: (open: boolean) => void;
  setDemandeEchographies: React.Dispatch<
    React.SetStateAction<DemandeEchographie[]>
  >;
  refreshDemandes: () => void;
  examensDisponibles: TarifEchographie[];
}

export default function DemandeEchographieModal({
  open,
  setOpen,
  setDemandeEchographies,
  refreshDemandes,
  idClient,
  idVisite,
  examensDisponibles,
}: DemandeEchographieModalProps) {
  const [echographies, setEchographies] = useState<TarifEchographie[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<TarifEchographie[]>(
    []
  );
  const { data: session } = useSession();
  const idUser = session?.user.id as string;

  const form = useForm<DemandeEchographieFormValues>({
    defaultValues: {
      observations: "",
      idUser: idUser,
      idClient: idClient,
      idVisite: idVisite,
      // serviceEchographie: "", // Ajouté pour permettre l'utilisation dans FormField
      idTarifEchographie: "", // Ajouté pour permettre l'utilisation dans FormField
    },
  });

  const ajouterExamens = () => {
    if (selectedOptions.length === 0) {
      toast.error("Veuillez sélectionner au moins un examen.");
      return;
    }

    const nouveauxEchographies: TarifEchographie[] = Array.isArray(
      selectedOptions
    )
      ? selectedOptions
      : [selectedOptions];

    setEchographies(() => [...nouveauxEchographies]);
    setSelectedOptions([]);
  };

  const onSubmit: SubmitHandler<DemandeEchographieFormValues> = async (
    data
  ) => {
    // const qte =
    const now = new Date();
    const newDemande: DemandeEchographie = {
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2),
      idVisite: data.idVisite,
      idClient: data.idClient,
      idClinique: echographies[0]?.idClinique ?? "", // Remplir selon votre logique/mettez la bonne valeur ici
      idTarifEchographie: echographies[0]?.id ?? "",
      serviceEchographie: "OBSTETRIQUE", // Utilise une propriété existante
      updatedAt: now,
      createdAt: now,
      idUser: data.idUser,
      // Ajoutez d'autres champs si nécessaire selon votre modèle
    };
    setDemandeEchographies((prevDemandes) => [...prevDemandes, newDemande]);
    refreshDemandes();
    setEchographies([]);
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
          <MultiSelectDemandeEchographie
            tarifEchographies={examensDisponibles}
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
                {echographies.map((echo) => (
                  <TableRow key={echo?.id ?? Math.random()}>
                    <TableCell>
                      {echo?.nomEchographie ?? ""}
                      <FormField
                        key={(echo?.id ?? "") + "-formfield"}
                        control={form.control}
                        name="idTarifEchographie"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                {...field}
                                value={echo.id ?? ""}
                                onChange={() => field.onChange(echo.id)}
                                className="hidden"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </TableCell>
                    <TableCell>{echo?.prixEchographie ?? 0} CFA</TableCell>
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
              <Button type="submit" disabled={echographies.length === 0}>
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
