"use client";

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
import { Badge } from "@/components/ui/badge";
import { NotebookPen, Trash2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import {
  deleteTraitementIva,
  getAllTraitementIvaByIdClient,
  getGynecoPositifSansTraitement,
} from "@/lib/actions/traitementIvaActions";

type TraitementRow = {
  id: string;
  dateTraitement: Date;
  typeTraitement: string;
  observations: string | null;
  idGynecologie: string | null;
  User: { name: string | null } | null;
};

const TYPE_LABEL: Record<string, string> = {
  chryotherapie: "Chryothérapie",
  thermocoagulation: "Thermocoagulation",
};

export function Table17({ id }: { id: string }) {
  const [rows, setRows] = useState<TraitementRow[]>([]);
  const [enAttente, setEnAttente] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [list, pending] = await Promise.all([
        getAllTraitementIvaByIdClient(id),
        getGynecoPositifSansTraitement(id),
      ]);
      setRows(list as TraitementRow[]);
      setEnAttente(pending.length);
      setLoading(false);
    };
    fetch();
  }, [id]);

  const handleDelete = async (trId: string) => {
    await deleteTraitementIva(trId);
    setRows((prev) => prev.filter((r) => r.id !== trId));
  };

  if (loading) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        Chargement...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 px-4">
        <Link
          href={`/fiche-traitement-iva/${id}`}
          prefetch={false}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          <NotebookPen className="h-4 w-4" />
          Nouveau traitement IVA
        </Link>
        {enAttente > 0 && (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-200 gap-1"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            {enAttente} IVA positif en attente
          </Badge>
        )}
      </div>

      <Table className="max-w-150 mx-4">
        <TableCaption>
          {rows.length === 0
            ? "Aucun traitement IVA enregistré"
            : "Historique des traitements IVA"}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Date traitement</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Prestataire</TableHead>
            <TableHead>Observations</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="font-medium whitespace-nowrap">
                {new Date(d.dateTraitement).toLocaleDateString("fr-FR")}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs">
                  {TYPE_LABEL[d.typeTraitement] ?? d.typeTraitement}
                </Badge>
              </TableCell>
              <TableCell>{d.User?.name ?? "-"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {d.observations ?? "-"}
              </TableCell>
              <TableCell>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Trash2 className="text-xl m-1 duration-300 hover:scale-150 active:scale-125 text-red-600 cursor-pointer" />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer ce traitement ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible. La visite associée sera
                        également supprimée.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600"
                        onClick={() => handleDelete(d.id)}
                      >
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
