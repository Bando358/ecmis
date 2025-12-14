"use client";

import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import {
  deleteObstetrique,
  getAllObstetriqueByIdClient,
} from "@/lib/actions/obstetriqueActions";
import { useEffect, useState } from "react";
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
import { Obstetrique, Visite } from "@prisma/client";

const TabEtatGrossesse = [
  { value: "normal", label: "Normal" },
  { value: "risque", label: "A risque" },
];
const TabVat = [
  { value: "vat1", label: "VAT 1" },
  { value: "vat2", label: "VAT 2" },
  { value: "vat3", label: "VAT 3" },
  { value: "vat4", label: "VAT 4" },
  { value: "vat5", label: "VAT 5+" },
];
const TabSp = [
  { value: "sp1", label: "SP 1" },
  { value: "sp2", label: "SP 2" },
  { value: "sp3", label: "SP 3" },
  { value: "sp4", label: "SP 4" },
  { value: "sp5", label: "SP 5" },
  { value: "sp6", label: "SP 6+" },
];
const TabCpn = [
  { value: "cpn1", label: "CPN 1" },
  { value: "cpn2", label: "CPN 2" },
  { value: "cpn3", label: "CPN 3" },
  { value: "cpn4", label: "CPN 4" },
  { value: "cpn5", label: "CPN 5" },
  { value: "cpn6", label: "CPN 6+" },
];

export function Table07({ id }: { id: string }) {
  const [dataVisite, setDataVisite] = useState<Visite[]>([]);
  const [dataObstetrique, setDataObstetrique] = useState<Obstetrique[]>([]);
  const { setSelectedClientId } = useClientContext();

  useEffect(() => {
    const fetchData = async () => {
      const tabObstetrique = await getAllObstetriqueByIdClient(id);
      const tab = [...tabObstetrique.reverse()];
      setDataObstetrique(tab);
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
      "Êtes-vous sûr de vouloir supprimer ce client ?"
    );
    if (confirmed) {
      await deleteObstetrique(id);
      setDataObstetrique(dataObstetrique.filter((d) => d.id !== id));
    }
  };
  const renameVal = (
    value: string,
    tab: { value: string; label: string }[]
  ) => {
    const found = tab.find((item) => item.value === value);
    return found ? found.label : "Non spécifié";
  };

  return (
    <Table className="max-w-150 mx-4">
      <TableCaption>
        {dataObstetrique.length === 0
          ? "Aucune donnée Gynécologique"
          : "Liste des consultations Gynécologique du client"}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-25">Editer</TableHead>
          <TableHead>Date Visite</TableHead>
          <TableHead>CPN</TableHead>
          <TableHead>SP</TableHead>
          <TableHead>VAT</TableHead>
          <TableHead>Etat Grossesse</TableHead>
          <TableHead>Rendez-Vous</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {dataObstetrique.map((d) => (
          <TableRow key={d.id}>
            <TableCell className=" flex">
              <Link
                // target="_blank"
                href={`/fiche-obstetrique/${d.obstIdClient}/${d.id}`}
                className="block -pr-1"
              >
                <NotebookPen
                  onClick={() => setSelectedClientId(d.id)}
                  className="text-xl m-1 duration-300 hover:scale-150 text-blue-600 cursor-pointer"
                />
              </Link>
            </TableCell>
            <TableCell className="font-medium">
              {fetchDate(dataVisite, d.obstIdVisite)}
            </TableCell>
            <TableCell>
              {renameVal(d.obstTypeVisite, TabCpn) || "Non spécifié"}
            </TableCell>
            <TableCell>{d.obstSp ? renameVal(d.obstSp, TabSp) : ""}</TableCell>
            <TableCell>
              {d.obstVat ? renameVal(d.obstVat, TabVat) : ""}
            </TableCell>
            <TableCell>
              {renameVal(d.obstEtatGrossesse, TabEtatGrossesse) ||
                "Non spécifié"}
            </TableCell>
            <TableCell>
              {d.obstRdv && new Date(d.obstRdv).toLocaleDateString("fr-FR")}
            </TableCell>

            <TableCell className="flex">
              {/* <FilePenLine className="text-xl m-1 duration-300 hover:scale-150 text-blue-600 cursor-pointer" /> */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  {/* <Button variant="outline"> */}
                  <Trash2 className="text-xl m-1 duration-300 hover:scale-150 active:scale-125 text-red-600 cursor-pointer" />
                  {/* </Button> */}
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
