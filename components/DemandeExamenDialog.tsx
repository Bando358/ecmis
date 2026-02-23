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
import { DemandeExamen, TarifExamen, Examen, TypeExamen } from "@prisma/client";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const typeExamenLabels: Record<TypeExamen, string> = {
  MEDECIN: "Médecine",
  GYNECOLOGIE: "Gynécologie",
  OBSTETRIQUE: "Obstétrique",
  VIH: "VIH",
  IST: "IST",
};

const typeExamenColors: Record<TypeExamen, string> = {
  MEDECIN: "bg-green-100 text-green-800 border-green-200",
  GYNECOLOGIE: "bg-purple-100 text-purple-800 border-purple-200",
  OBSTETRIQUE: "bg-pink-100 text-pink-800 border-pink-200",
  VIH: "bg-red-100 text-red-800 border-red-200",
  IST: "bg-orange-100 text-orange-800 border-orange-200",
};

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
  allExamens: Examen[];
}

export default function DemandeExamenModal({
  open,
  setOpen,
  setDemandeExamens,
  refreshDemandes,
  idClient,
  idVisite,
  examensDisponibles,
  allExamens,
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
      idTarifExamen: "",
    },
  });

  const getTypeForTarif = (tarif: TarifExamen): TypeExamen | undefined => {
    const examen = allExamens.find((e) => e.id === tarif.idExamen);
    return examen?.typeExamen;
  };

  const ajouterExamens = () => {
    if (selectedOptions.length === 0) {
      toast.error("Veuillez sélectionner au moins un examen.");
      return;
    }
    const nouveaux: TarifExamen[] = Array.isArray(selectedOptions)
      ? selectedOptions
      : [selectedOptions];
    setExamens(() => [...nouveaux]);
    setSelectedOptions([]);
  };

  const onSubmit: SubmitHandler<DemandeExamenFormValues> = async (data) => {
    const now = new Date();
    const newDemande: DemandeExamen = {
      id: crypto.randomUUID(),
      idVisite: data.idVisite,
      idClient: data.idClient,
      idClinique: examens[0]?.idClinique ?? "",
      idTarifExamen: examens[0]?.id ?? "",
      updatedAt: now,
      createdAt: now,
      idUser: data.idUser,
    };
    setDemandeExamens((prevDemandes) => [...prevDemandes, newDemande]);
    refreshDemandes();
    setExamens([]);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle demande d&apos;examen</DialogTitle>
        </DialogHeader>
        <div className="flex flow-row gap-3">
          <MultiSelectDemandeExamen
            tarifExamens={examensDisponibles}
            selectedOptions={selectedOptions}
            setSelectedOptions={setSelectedOptions}
            allExamens={allExamens}
          />
          <Button onClick={ajouterExamens} size="sm">
            Ajouter
          </Button>
        </div>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            {examens.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Examen</TableHead>
                    <TableHead className="w-28">Spécialité</TableHead>
                    <TableHead className="w-28">Prix</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {examens.map((examen) => {
                    const type = getTypeForTarif(examen);
                    return (
                      <TableRow key={examen?.id ?? Math.random()}>
                        <TableCell className="font-medium">
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
                        <TableCell>
                          {type && (
                            <Badge
                              variant="secondary"
                              className={`text-[11px] ${typeExamenColors[type]}`}
                            >
                              {typeExamenLabels[type]}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {examen?.prixExamen ?? 0} CFA
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

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
              <Button
                variant="outline"
                type="button"
                onClick={() => setOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={examens.length === 0}>
                Valider
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
