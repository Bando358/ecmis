"use client";
// import {
//   deleteMedecine,
//   getAllMedecineByIdClient,
//   getAllVisiteByIdClient,
// } from "@/lib/actions/authActions";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import {
  getAllMedecineByIdClient,
  deleteMedecine,
} from "@/lib/actions/mdgActions";
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
import { useClientContext } from "@/components/ClientContext";
import { Medecine, Visite } from "@prisma/client";

export function Table16({ id }: { id: string }) {
  const [dataVisite, setDataVisite] = useState<Visite[]>([]);
  const [dataMedecine, setDataMedecine] = useState<Medecine[]>([]);
  const { setSelectedClientId } = useClientContext();

  useEffect(() => {
    const fetchData = async () => {
      const tabMedecine = await getAllMedecineByIdClient(id);
      const tab = [...tabMedecine.reverse()];
      setDataMedecine(tab);
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
      await deleteMedecine(id);
      setDataMedecine(dataMedecine.filter((d) => d.id !== id));
    }
  };

  return (
    <Table className="max-w-150 mx-4">
      <TableCaption>
        {dataMedecine.length === 0
          ? "Aucune donnée de test de Médécine Générale"
          : "Liste des consultations de Médécine Générale du client"}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-25">Editer</TableHead>
          <TableHead>Date Visite</TableHead>
          <TableHead>Femme Enceinte</TableHead>
          <TableHead>Motif de Consultation</TableHead>
          {/* <TableHead>Examen Physique</TableHead> */}
          <TableHead>Client Traité?</TableHead>
          {/* <TableHead>Soins Infirmier</TableHead> */}
          {/* <TableHead>Suspiçion Palu</TableHead> */}
          <TableHead>Diagnostic</TableHead>
          {/* <TableHead>Type Affection</TableHead> */}
          {/* <TableHead>Traitement</TableHead> */}
          {/* <TableHead>Mis en Obvervation</TableHead> */}
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {dataMedecine.map((d) => (
          <TableRow key={d.id}>
            <TableCell className=" flex">
              <Link
                href={`/fiche-mdg/${d.mdgIdClient}/${d.id}`}
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
              {fetchDate(dataVisite, d.mdgIdVisite)}
            </TableCell>
            <TableCell>
              {d.mdgEtatFemme && d.mdgEtatFemme === "oui" ? (
                <>
                  <span className="text-green-600">✔️</span> Oui
                </>
              ) : (
                <>
                  <span className="text-red-600">❌ </span>Non
                </>
              )}
            </TableCell>
            <TableCell>{d.mdgMotifConsultation}</TableCell>
            <TableCell>
              {d.mdgExamenPhysique ? (
                <>
                  <span className="text-green-600">✔️</span> Oui
                </>
              ) : (
                <>
                  <span className="text-red-600">❌ </span>Non
                </>
              )}
            </TableCell>
            <TableCell>
              <div>
                <ul>
                  {d.mdgDiagnostic.map((d, index) => (
                    <li key={index}>{d}</li>
                  ))}
                </ul>
                {d.mdgAutreDiagnostic !== null && d.mdgAutreDiagnostic}
              </div>
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
