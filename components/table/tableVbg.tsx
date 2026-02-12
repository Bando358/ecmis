"use client";
import { useEffect, useState } from "react";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { NotebookPen, Trash2 } from "lucide-react";
import Link from "next/link";
import { useClientContext } from "../ClientContext";
import { Vbg, Visite } from "@prisma/client";
import { deleteVbg, getAllVbgByIdClient } from "@/lib/actions/vbgActions";

const TabTypeVbg = [
  { value: "viol", label: "Viol" },
  { value: "agressionsSexuelles", label: "Agressions Sexuelles" },
  { value: "agressionsPhysiques", label: "Agressions Physiques" },
  { value: "mariageForce", label: "Mariage Forcé" },
  { value: "deniRessources", label: "Dénis de Ressources" },
  { value: "maltraitancePsychologique", label: "Maltraitance Psychologique" },
];
type Option = {
  value: string;
  label: string;
};
const tabPec: Option[] = [
  { value: "pec", label: "PEC" },
  { value: "refere", label: "Référé" },
];

export function Table15({ id }: { id: string }) {
  const [dataVisite, setDataVisite] = useState<Visite[]>([]);
  const [dataVbg, setDataVbg] = useState<Vbg[]>([]);
  const { setSelectedClientId } = useClientContext();

  useEffect(() => {
    const fetchData = async () => {
      const tabVbg = await getAllVbgByIdClient(id);
      const tab = [...tabVbg.reverse()];
      console.log("tab VBG : ", tab);
      setDataVbg(tab);
      const tabVisite = await getAllVisiteByIdClient(id);
      setDataVisite(tabVisite);
    };
    fetchData();
  }, [id]);

  const fetchDate = (visite: Visite[], id: string) => {
    const dateVisite = visite.find((v) => v.id === id);
    if (dateVisite) {
      return dateVisite.dateVisite.toLocaleDateString("fr-FR");
    }

    return "Aucune date";
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Êtes-vous sûr de vouloir supprimer la grossesse ce client ?"
    );
    if (confirmed) {
      await deleteVbg(id);
      setDataVbg(dataVbg.filter((d) => d.id !== id));
    }
  };

  const renameValue = (
    value: string,
    tab: { value: string; label: string }[]
  ) => {
    const found = tab.find((item) => item.value === value);
    return found ? found.label : value;
  };

  return (
    <Table className="max-w-150 mx-4">
      <TableCaption>
        {dataVbg.length === 0
          ? "Aucune donnée de test de VBG"
          : "Liste des consultations de VBG du client"}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-25">Editer</TableHead>
          <TableHead>Date Visite</TableHead>
          <TableHead>Consultations</TableHead>
          <TableHead>Type de VBG</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {dataVbg.map((d) => (
          <TableRow key={d.id}>
            <TableCell className=" flex">
              <Link
                href={`/fiche-vbg/${d.vbgIdClient}/${d.id}`}
                prefetch={false}
                className="block -pr-1"
              >
                <NotebookPen
                  onClick={() => setSelectedClientId(d.id)}
                  className="text-xl m-1 duration-300 hover:scale-150 text-blue-600 cursor-pointer"
                />
              </Link>
            </TableCell>
            <TableCell className="font-medium">
              {fetchDate(dataVisite, d.vbgIdVisite)}
            </TableCell>
            <TableCell>
              {d.vbgConsultation && d.vbgConsultation === "pec" ? (
                <>
                  <span className="text-green-600">
                    ✔️{renameValue(d.vbgConsultation, tabPec)}{" "}
                  </span>
                  Oui
                </>
              ) : (
                <>
                  <span className="text-red-600">❌ </span>Non
                </>
              )}
            </TableCell>

            <TableCell>{renameValue(d.vbgType, TabTypeVbg)}</TableCell>
            <TableCell className="flex">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Trash2 className="text-xl m-1 duration-300 hover:scale-150 active:scale-125 text-red-600 cursor-pointer" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Êtes vous absolument sûr?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. si vous cliquez sur
                      continuer la visite du client sera definitivement
                      supprimer
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600   "
                      onClick={() => handleDelete(d.id)}
                    >
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
