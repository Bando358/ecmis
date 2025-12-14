"use client";
// import {
//   deleteSaa,
//   getAllSaaByIdClient,
//   getAllVisiteByIdClient,
// } from "@/lib/actions/authActions";
import { deleteSaa, getAllSaaByIdClient } from "@/lib/actions/saaActions";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
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
import { Saa, Visite } from "@prisma/client";

export function Table10({ id }: { id: string }) {
  const [dataVisite, setDataVisite] = useState<Visite[]>([]);
  const [dataSaa, setDataSaa] = useState<Saa[]>([]);
  const { setSelectedClientId } = useClientContext();

  useEffect(() => {
    const fetchData = async () => {
      const tabSaa = await getAllSaaByIdClient(id);
      const tab = [...tabSaa.reverse()];
      setDataSaa(tab);
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
      await deleteSaa(id);
      setDataSaa(dataSaa.filter((d) => d.id !== id));
    }
  };

  return (
    <Table className="max-w-150 mx-4">
      <TableCaption>
        {dataSaa.length === 0
          ? "Aucune donnée de test de SAA"
          : "Liste des consultations de SAA du client"}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-25">Editer</TableHead>
          <TableHead>Date Visite</TableHead>
          <TableHead>Type Avortement</TableHead>
          <TableHead>{"Mode d'évacuation"}</TableHead>
          <TableHead>Complication</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {dataSaa.map((d) => (
          <TableRow key={d.id}>
            <TableCell className=" flex">
              <Link
                // target="_blank"
                href={`/fiche-saa/${d.saaIdClient}/${d.id}`}
                className="block -pr-1"
              >
                <NotebookPen
                  onClick={() => setSelectedClientId(d.id)}
                  className="text-xl m-1 duration-300 hover:scale-150 text-blue-600 cursor-pointer"
                />
              </Link>
            </TableCell>
            <TableCell className="font-medium">
              {fetchDate(dataVisite, d.saaIdVisite)}
            </TableCell>
            <TableCell>{d.saaTypeAvortement}</TableCell>
            <TableCell>{d.saaTypePec}</TableCell>
            <TableCell>{d.saaTraitementComplication}</TableCell>
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
