"use client";

import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import {
  deleteGyneco,
  getAllGynecoByIdClient,
} from "@/lib/actions/gynecoActions";
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
import { Gynecologie, Visite } from "@prisma/client";

export function Table03({ id }: { id: string }) {
  const [dataVisite, setDataVisite] = useState<Visite[]>([]);
  const [dataPf, setDataPf] = useState<Gynecologie[]>([]);
  const { setSelectedClientId } = useClientContext();

  useEffect(() => {
    const fetchData = async () => {
      const tabPf = await getAllGynecoByIdClient(id);
      const tab = [...tabPf.reverse()];
      setDataPf(tab);
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
    await deleteGyneco(id);
    setDataPf(dataPf.filter((d) => d.id !== id));
  };

  return (
    <Table className="max-w-150 mx-4">
      <TableCaption>
        {dataPf.length === 0
          ? "Aucune donnée Gynécologique"
          : "Liste des consultations Gynécologique du client"}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-25">Editer</TableHead>
          <TableHead>Date Visite</TableHead>
          <TableHead>Gynéco</TableHead>
          <TableHead>IVA</TableHead>
          <TableHead>Résultat IVA</TableHead>
          <TableHead>Dépistage cancer sein</TableHead>
          <TableHead>Résultat cancer sein</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {dataPf.map((d) => (
          <TableRow key={d.id}>
            <TableCell className=" flex">
              <Link
                // target="_blank"
                href={`/fiche-gyneco/${d.idClient}/${d.id}`}
                className="block -pr-1"
              >
                <NotebookPen
                  onClick={() => setSelectedClientId(d.id)}
                  className="text-xl m-1 duration-300 hover:scale-150 text-blue-600 cursor-pointer"
                />
              </Link>
            </TableCell>
            <TableCell className="font-medium">
              {fetchDate(dataVisite, d.idVisite)}
            </TableCell>
            <TableCell>{d.consultation && "Oui"}</TableCell>
            <TableCell>
              {d.resultatIva == "negatif" || d.resultatIva == "positif" ? (
                <span>Oui</span>
              ) : (
                "Non"
              )}
            </TableCell>
            <TableCell>
              {d.resultatIva == "negatif" || d.resultatIva == "positif" ? (
                <span>{d.resultatIva.toUpperCase()}</span>
              ) : (
                ""
              )}
            </TableCell>
            <TableCell>
              {d.counselingCancerSein == true ||
              d.counselingCancerSein == false ? (
                <span>Oui</span>
              ) : (
                "Non"
              )}
            </TableCell>
            <TableCell>
              {d.counselingCancerSein == true ||
              d.counselingCancerSein == false ? (
                <span>{d.counselingCancerSein ? "Positif" : "Négatif"}</span>
              ) : (
                ""
              )}
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
