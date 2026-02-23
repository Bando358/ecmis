"use client";
import {
  deleteConstante,
  getAllContanteByIdClient,
} from "@/lib/actions/constanteActions";
import { removeFormulaireFromRecap } from "@/lib/actions/recapActions";
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
import { Constante } from "@prisma/client";
import { toast } from "sonner";

export function Table01({ id }: { id: string }) {
  const [data, setData] = useState<Constante[]>([]);
  const { setSelectedClientId } = useClientContext();

  useEffect(() => {
    const fetchData = async () => {
      const tab = await getAllContanteByIdClient(id);
      setData(tab);
    };
    fetchData();
  }, [id]);

  const handleDelete = async (constanteId: string) => {
    try {
      const record = data.find((d) => d.id === constanteId);
      await deleteConstante(constanteId);
      const remaining = data.filter((d) => d.id !== constanteId);
      setData(remaining);
      if (record && !remaining.some((d) => d.idVisite === record.idVisite)) {
        await removeFormulaireFromRecap(record.idVisite, "02 Fiche des constantes");
      }
      toast.success("Constante supprimée avec succès");
    } catch {
      toast.error("Erreur lors de la suppression de la constante");
    }
  };

  return (
    <Table className="max-w-150 mx-4">
      <TableCaption>
        {data.length === 0
          ? "Aucune constante"
          : "Liste des constantes du client"}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-25">Ouvrir</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Poids</TableHead>
          <TableHead>Taille</TableHead>
          <TableHead>IMC</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((d) => (
          <TableRow key={d.id}>
            <TableCell className=" flex">
              <Link
                href={`/constante/${d.idClient}/${d.id}`}
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
              {new Date(d.createdAt).toLocaleDateString("fr-FR")}
            </TableCell>
            <TableCell>{d.poids} kg</TableCell>
            <TableCell>{d.taille ? `${d.taille} cm` : "—"}</TableCell>
            <TableCell>
              {d.etatImc || "—"}
            </TableCell>
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
                      Cette action est irréversible. Si vous cliquez sur
                      continuer, la constante sera définitivement supprimée.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600"
                      onClick={() => handleDelete(d.id)}
                    >
                      Continuer
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
