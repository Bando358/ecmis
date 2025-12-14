"use client";
// import {
//   deleteInfertilite,
//   getAllInfertiliteByIdClient,
//   getAllVisiteByIdClient,
// } from "@/lib/actions/authActions";
import { useEffect, useState } from "react";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import {
  getAllInfertiliteByIdClient,
  deleteInfertilite,
} from "@/lib/actions/infertiliteActions";
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
import { Infertilite, Visite } from "@prisma/client";

export function Table12({ id }: { id: string }) {
  const [dataVisite, setDataVisite] = useState<Visite[]>([]);
  const [dataInfertilite, setDataInfertilite] = useState<Infertilite[]>([]);
  const { setSelectedClientId } = useClientContext();

  useEffect(() => {
    const fetchData = async () => {
      const tabInfertilite = await getAllInfertiliteByIdClient(id);
      const tab = [...tabInfertilite.reverse()];
      console.log("tab Infertilité : ", tab);
      setDataInfertilite(tab);
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
      await deleteInfertilite(id);
      setDataInfertilite(dataInfertilite.filter((d) => d.id !== id));
    }
  };

  return (
    <Table className="max-w-150 mx-4">
      <TableCaption>
        {dataInfertilite.length === 0
          ? "Aucune donnée de test d'Infertilité"
          : "Liste des consultations d'Infertilité du client"}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-25">Editer</TableHead>
          <TableHead>Date Visite</TableHead>
          <TableHead>Consultations</TableHead>
          <TableHead>Counselling</TableHead>
          <TableHead>Investigations</TableHead>
          <TableHead>Type de Traitement</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {dataInfertilite.map((d) => (
          <TableRow key={d.id}>
            <TableCell className=" flex">
              <Link
                // target="_blank"
                href={`/fiche-infertilite/${d.infertIdClient}/${d.id}`}
                className="block -pr-1"
              >
                <NotebookPen
                  onClick={() => setSelectedClientId(d.id)}
                  className="text-xl m-1 duration-300 hover:scale-150 text-blue-600 cursor-pointer"
                />
              </Link>
            </TableCell>
            <TableCell className="font-medium">
              {fetchDate(dataVisite, d.infertIdVisite)}
            </TableCell>
            <TableCell>
              {d.infertConsultation ? (
                <>
                  <span className="text-green-600">✔️ </span>Oui
                </>
              ) : (
                <>
                  <span className="text-red-600">❌ </span>Non
                </>
              )}
            </TableCell>
            <TableCell>
              {d.infertCounselling ? (
                <>
                  <span className="text-green-600">✔️ </span>Oui
                </>
              ) : (
                <>
                  <span className="text-red-600">❌ </span>Non
                </>
              )}
            </TableCell>
            <TableCell>
              {d.infertExamenPhysique ? (
                <>
                  <span className="text-green-600">✔️</span> Oui
                </>
              ) : (
                <>
                  <span className="text-red-600">❌ </span>Non
                </>
              )}
            </TableCell>

            <TableCell>{d.infertTraitement}</TableCell>
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
