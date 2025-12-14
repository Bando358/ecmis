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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "./ui/input";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { SubmitHandler, useForm } from "react-hook-form";
import MultiSelectResultatExamen from "./multiSelectResultatExamen";
import { Examen, FactureExamen, ResultatExamen } from "@prisma/client";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type ResultatExamenFormValues = {
  valeurResultat: string;
  resultatExamen: string;
  nomExamen: string;
  observations: string;
};

interface ResultatExamenModalProps {
  open: boolean;
  idClient: string;
  idVisite: string;
  setOpen: (open: boolean) => void;
  setResultatExamens: React.Dispatch<React.SetStateAction<ResultatExamen[]>>;
  // refreshResultatExamens: () => void;
  tabExamens: Examen[];
  factureExamens: FactureExamen[];
  resultatExamens: ResultatExamen[];
}
const tabValeurResultat = [
  { id: "Positif", label: "Positif" },
  { id: "Negatif", label: "Negatif" },
  { id: "A+", label: "A+" }, //rhésus : A+, A-,B+ B-, AB+, AB-, O+, O-,
  { id: "A-", label: "A-" }, //rhésus : A+, A-,B+ B-, AB+, AB-, O+, O-,
  { id: "B+", label: "B+" }, //rhésus : A+, A-,B+ B-, AB+, AB-, O+, O-,
  { id: "B-", label: "B-" }, //rhésus : A+, A-,B+ B-, AB+, AB-, O+, O-,
  { id: "AB+", label: "AB+" }, //rhésus : A+, A-,B+ B-, AB+, AB-, O+, O-,
  { id: "AB-", label: "AB-" }, //rhésus : A+, A-,B+ B-, AB+, AB-, O+, O-,
  { id: "O+", label: "O+" }, //rhésus : A+, A-,B+ B-, AB+, AB-, O+, O-,
  { id: "O-", label: "O-" }, //rhésus : A+, A-,B+ B-, AB+, AB-, O+, O-,
];

export default function ResultatExamenModal({
  open,
  setOpen,
  setResultatExamens,
  // refreshResultatExamens,
  tabExamens,
  idClient,
  idVisite,
  factureExamens,
  resultatExamens,
}: ResultatExamenModalProps) {
  const [tabFactureExamens, setTabFactureExamens] = useState<FactureExamen[]>(
    []
  );
  const [selectedOptions, setSelectedOptions] = useState<FactureExamen[]>([]);
  const { data: session } = useSession();
  const idUser = session?.user.id as string;

  const form = useForm<ResultatExamenFormValues>({
    defaultValues: {
      observations: "",
      valeurResultat: "",
      resultatExamen: "",
      nomExamen: "",
    },
  });

  // fonction pour récupérer l'unité de mesure d'un examen à partir de son nom
  const getUniteMesureByName = (name: string) => {
    const examen = tabExamens.find((examen) => examen.nomExamen === name);
    return examen?.uniteMesureExamen === "definir";
  };

  const ajouterExamens = () => {
    if (selectedOptions.length === 0) {
      toast.error("Veuillez sélectionner un examen.");
      return;
    }
    // on garde seulement le premier examen sélectionné
    setTabFactureExamens([selectedOptions[0]]);
    setSelectedOptions([]);
  };

  const onSubmit: SubmitHandler<ResultatExamenFormValues> = async (data) => {
    if (tabFactureExamens.length === 0) {
      toast.error("Aucun examen sélectionné");
      return;
    }
    // bloquer la soumission si valeurResultat existe et n'est pas un nombre
    if (
      getUniteMesureByName(tabFactureExamens[0].libelleExamen) === false &&
      isNaN(Number(data.valeurResultat))
    ) {
      toast.error("Veuillez entrer une valeur numérique valide.");
      return;
    }

    const now = new Date();
    const nouveauxResultats = {
      id: crypto.randomUUID(),
      idVisite,
      idClient,
      idClinique: tabFactureExamens[0].idClinique,
      idUser,
      nomExamen: tabFactureExamens[0].libelleExamen,
      observations: data.observations,
      resultatExamen: data.resultatExamen,
      valeurResultat: Number(data.valeurResultat),
      updatedAt: now,
      createdAt: now,
      idFactureExamen: tabFactureExamens[0].id,
      // Ajoutez d'autres champs si nécessaire selon votre modèle
    };

    setResultatExamens((prev) => [...prev, nouveauxResultats]);
    // setFactureExamens((prev) =>
    //   prev.filter((r) => r.id !== tabFactureExamens[0].id)
    // );
    // refreshResultatExamens();
    setTabFactureExamens([]);
    form.reset();
    // setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{"Résultat d'examen"}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-3">
          <MultiSelectResultatExamen
            factureExamens={factureExamens.filter(
              (f) => !resultatExamens.some((r) => r.idFactureExamen === f.id)
            )}
            selectedOptions={selectedOptions}
            setSelectedOptions={setSelectedOptions}
            isLoading={false}
          />
          <Button onClick={ajouterExamens}>Ajouter</Button>
        </div>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>Examen</TableCell>
                  <TableCell>Valeur</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tabFactureExamens.map((examen) => (
                  <TableRow key={examen.id}>
                    <TableCell>{examen.libelleExamen}</TableCell>
                    <TableCell>
                      {!getUniteMesureByName(examen.libelleExamen) ? (
                        <FormField
                          control={form.control}
                          name="valeurResultat"
                          render={({ field }) => (
                            <Input
                              type="text"
                              placeholder="Valeur"
                              {...field}
                            />
                          )}
                        />
                      ) : (
                        <FormField
                          control={form.control}
                          name="resultatExamen"
                          render={({ field }) => (
                            <FormItem className="mx-6 mb-3 outline-red-500">
                              <FormLabel className="font-medium">
                                Selectionnez le type de PEC
                              </FormLabel>
                              <Select onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Traitement à sélectionner" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {tabValeurResultat.map((option) => (
                                    <SelectItem
                                      key={option.id}
                                      value={option.id ?? ""}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <Input placeholder="Observations" {...field} />
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={tabFactureExamens.length === 0}>
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
