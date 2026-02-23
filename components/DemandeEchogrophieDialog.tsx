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
import {
  DemandeEchographie,
  TarifEchographie,
  Echographie,
  TypeEchographie,
} from "@prisma/client";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import MultiSelectDemandeEchographie from "./multiSelectDemandeEchographie";

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
  observations: string;
  idUser: string;
  idClient: string;
  idVisite: string;
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
  allEchographies: Echographie[];
}

export default function DemandeEchographieModal({
  open,
  setOpen,
  setDemandeEchographies,
  refreshDemandes,
  idClient,
  idVisite,
  examensDisponibles,
  allEchographies,
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
      idTarifEchographie: "",
    },
  });

  const getTypeForTarif = (tarif: TarifEchographie): TypeEchographie | undefined => {
    const echographie = allEchographies.find((e) => e.id === tarif.idEchographie);
    return echographie?.typeEchographie;
  };

  const ajouterExamens = () => {
    if (selectedOptions.length === 0) {
      toast.error("Veuillez sélectionner au moins une échographie.");
      return;
    }
    const nouveaux: TarifEchographie[] = Array.isArray(selectedOptions)
      ? selectedOptions
      : [selectedOptions];
    setEchographies(() => [...nouveaux]);
    setSelectedOptions([]);
  };

  const onSubmit: SubmitHandler<DemandeEchographieFormValues> = async (
    data
  ) => {
    const now = new Date();
    const newDemande: DemandeEchographie = {
      id: crypto.randomUUID(),
      idVisite: data.idVisite,
      idClient: data.idClient,
      idClinique: echographies[0]?.idClinique ?? "",
      idTarifEchographie: echographies[0]?.id ?? "",
      serviceEchographie: "OBSTETRIQUE",
      updatedAt: now,
      createdAt: now,
      idUser: data.idUser,
    };
    setDemandeEchographies((prevDemandes) => [...prevDemandes, newDemande]);
    refreshDemandes();
    setEchographies([]);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle demande d&apos;échographie</DialogTitle>
        </DialogHeader>
        <div className="flex flow-row gap-3">
          <MultiSelectDemandeEchographie
            tarifEchographies={examensDisponibles}
            selectedOptions={selectedOptions}
            setSelectedOptions={setSelectedOptions}
            allEchographies={allEchographies}
          />
          <Button onClick={ajouterExamens} size="sm">
            Ajouter
          </Button>
        </div>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            {echographies.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Échographie</TableHead>
                    <TableHead className="w-28">Spécialité</TableHead>
                    <TableHead className="w-28">Prix</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {echographies.map((echo) => {
                    const type = getTypeForTarif(echo);
                    return (
                      <TableRow key={echo?.id ?? Math.random()}>
                        <TableCell className="font-medium">
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
                        <TableCell className="tabular-nums">
                          {echo?.prixEchographie ?? 0} CFA
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
              <Button type="submit" disabled={echographies.length === 0}>
                Valider
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
