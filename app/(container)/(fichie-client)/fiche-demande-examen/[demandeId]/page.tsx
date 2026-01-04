"use client";

import { useState, useEffect, use, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableFooter,
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
import { Plus, Trash2 } from "lucide-react";
// import { useSession } from "next-auth/react";
import { Separator } from "@/components/ui/separator";

import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { getOneClient } from "@/lib/actions/clientActions";
import { getAllTarifExamenByClinique } from "@/lib/actions/tarifExamenActions";
import {
  createDemandeExamen,
  deleteDemandeExamen,
  getAllDemandeExamens,
  getAllDemandeExamensByIdVisite,
} from "@/lib/actions/demandeExamenActions";
import DemandeExamenModal from "@/components/DemandeExamenDialog";

import {
  Visite,
  TarifExamen,
  DemandeExamen,
  Examen,
  Client,
  User,
  Clinique,
  Permission,
  TableName,
} from "@prisma/client";
import { getAllExamen } from "@/lib/actions/examenActions";
import { toast } from "sonner";
import Image from "next/image";
import { useSession } from "next-auth/react";
import {
  getAllUser,
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import { useReactToPrint } from "react-to-print";
import { useRouter } from "next/navigation";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import Retour from "@/components/retour";

export default function PageDemandeExamen({
  params,
}: {
  params: Promise<{ demandeId: string }>;
}) {
  const { demandeId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [tabTarifExamens, setTabTarifExamens] = useState<TarifExamen[]>([]);
  const [demandeExamens, setDemandeExamens] = useState<DemandeExamen[]>([]);
  const [demandes, setDemandes] = useState<DemandeExamen[]>([]);
  const [tabExamens, setTabExamens] = useState<Examen[]>([]);
  const [tabClinique, setTabClinique] = useState<Clinique[]>([]);
  const [tabUser, setTabUser] = useState<User[]>([]);
  const [prescripteur, setPrescripteur] = useState<User | null>(null);
  const [tabPrescripteurs, setTabPrescripteurs] = useState<User[]>([]);

  const [selectedVisite, setSelectedVisite] = useState<string>("");
  const [selectedPrescripteur, setSelectedPrescripteur] = useState<string>("");
  const [client, setClient] = useState<Client | null>(null);
  const [permission, setPermission] = useState<Permission | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const { data: session } = useSession();
  const router = useRouter();
  const idUser = session?.user.id as string;

  useEffect(() => {
    const fetUser = async () => {
      const user = await getOneUser(idUser);
      // setIsPrescripteur(user?.prescripteur ? true : false);
      setPrescripteur(user!);
    };
    fetUser();
  }, [idUser]);

  useEffect(() => {
    if (prescripteur && client) {
      const fetchPrescripteurs = async () => {
        const allUser = await getAllUser();
        setTabUser(allUser as User[]);
        const prescripteursData = await getAllUserIncludedIdClinique(
          client.cliniqueId
        );

        setTabPrescripteurs([...prescripteursData]);
      };

      fetchPrescripteurs();
    }
  }, [prescripteur, client]);

  useEffect(() => {
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!prescripteur) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(prescripteur.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.DEMANDE_EXAMEN
        );
        setPermission(perm || null);
      } catch (error) {
        console.error(
          "Erreur lors de la vérification des permissions :",
          error
        );
      }
    };

    fetchPermissions();
  }, [prescripteur, router]);

  useEffect(() => {
    const fetchData = async () => {
      console.log("demandeId:", demandeId);
      try {
        const [clientData, visitesData, examensData, clinique] =
          await Promise.all([
            getOneClient(demandeId),
            getAllVisiteByIdClient(demandeId),
            getAllExamen(),
            getAllClinique(),
          ]);

        if (!clientData) {
          console.warn("Aucun client trouvé pour l'ID :", demandeId);
          return;
        } else {
          console.log("Client trouvé :", clientData);
        }
        setClient(clientData as Client);
        const tarifExam = await getAllTarifExamenByClinique(
          clientData.cliniqueId
        );

        setVisites(visitesData as Visite[]);
        setTabTarifExamens(tarifExam as TarifExamen[]);
        setTabExamens(examensData as Examen[]);
        setTabClinique(clinique as Clinique[]);
      } catch (error) {
        console.error("Erreur lors du chargement des données :", error);
      }
    };

    fetchData();
  }, [demandeId]);

  // Charger les demandes quand la visite sélectionnée change
  useEffect(() => {
    const fetchDemandes = async () => {
      try {
        if (!selectedVisite) {
          setDemandes([]);
          return;
        }
        const demandesData = await getAllDemandeExamensByIdVisite(
          selectedVisite
        );
        setDemandes(demandesData as DemandeExamen[]);
      } catch (error) {
        console.error("Erreur lors du chargement des demandes :", error);
      }
    };

    fetchDemandes();
  }, [selectedVisite]);

  const refreshDemandes = async () => {
    if (selectedVisite) {
      const demandesData = await getAllDemandeExamens();
      setDemandes(demandesData as DemandeExamen[]);
    }
  };

  const getPrixExamen = (idTarifExamen: string) => {
    return tabTarifExamens.find((e) => e.id === idTarifExamen)?.prixExamen || 0;
  };
  if (demandeExamens.length > 0) {
    console.log("demandeExamens : ", demandeExamens);
  }

  // Handler for deleting a demande
  const handleDeleteDemande = async (demandeId: string) => {
    // TODO: Replace with your actual delete logic, e.g. call an API
    setDemandeExamens((prev) =>
      prev.filter((demande) => demande.id !== demandeId)
    );
    // Optionally, refreshDemandes();
  };
  // Handler for deleting a demande
  const handleDeleteDemandeInBD = async (demandeId: string) => {
    if (!permission?.canDelete && prescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de supprimer une demande d'examen. Contactez un administrateur."
      );
      return router.back();
    } else {
      if (confirm("Es-tu sûr de vouloir supprimer cette demande ?")) {
        // TODO: Replace with your actual delete logic, e.g. call an
        await deleteDemandeExamen(demandeId);
        setDemandes((prev) =>
          prev.filter((demande) => demande.id !== demandeId)
        );
        // Optionally, refreshDemandes();
        toast.error("Demande supprimée avec succès ✅");
      }
    }
  };

  const handleDemandeExamen = async () => {
    if (!permission?.canCreate && prescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de créer une demande d'examen. Contactez un administrateur."
      );
      return router.back();
    }
    if (demandeExamens.length === 0) {
      toast.error("Aucune demande à soumettre.");
      return;
    }
    if (!selectedPrescripteur) {
      toast.warning("Aucun prescripteur sélectionné.");
      return;
    }

    setIsPending(true);

    try {
      if (prescripteur) {
        for (const demande of demandeExamens) {
          const newDemande = {
            id: demande.id,
            idUser: prescripteur.prescripteur
              ? prescripteur.id
              : selectedPrescripteur,
            idClient: demande.idClient,
            createdAt: demande.createdAt,
            updatedAt: demande.updatedAt,
            idClinique: demande.idClinique,
            idVisite: demande.idVisite,
            idTarifExamen: demande.idTarifExamen,
          } as DemandeExamen;
          await createDemandeExamen(newDemande);
        }
      } else {
        toast.error("Le prescripteur n'est pas défini.");
        return;
      }

      // On vide la liste des demandes après soumission réussie
      setDemandeExamens([]);
      const newDemandes = await getAllDemandeExamensByIdVisite(selectedVisite);
      setDemandes(
        newDemandes.filter(
          (d: { idVisite: string }) => d.idVisite === selectedVisite
        )
      );

      toast.success("Toutes les demandes ont été soumises avec succès ✅");
    } catch (error) {
      console.error("Erreur lors de la soumission :", error);
      toast.error("Une ou plusieurs demandes n'ont pas pu être soumises.");
    } finally {
      setIsPending(false);
    }
  };

  const getNomExamen = (demande: DemandeExamen) => {
    const tarif = tabTarifExamens.find((t) => t.id === demande.idTarifExamen);
    return (
      tabExamens.find((e) => e.id === tarif?.idExamen)?.nomExamen || "Inconnu"
    );
  };

  const dateVisiteByidVisite = (idVisite: string) => {
    return (
      visites
        .find((v) => v.id === idVisite)
        ?.dateVisite.toLocaleDateString("fr-FR") || "Date introuvable"
    );
  };

  const getAllCliniqueNameById = (idClinique: string) => {
    return (
      tabClinique.find((clinique) => clinique.id === idClinique)?.nomClinique ||
      "Clinique inconnue"
    );
  };

  const getUserNameById = (idUser: string) => {
    return tabUser.find((user) => user.id === idUser)?.name || "Inconnu";
  };

  // ================== Impression ==================
  const contentRef = useRef<HTMLDivElement>(null);
  const reactToPrintFn = useReactToPrint({ contentRef });

  return (
    <div className="w-full relative">
      <Retour />
      <div className="px-6 pb-6">
        <h1 className="text-2xl font-bold mb-6">{"Demandes d'examens"}</h1>

        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex flex-justify-start items-center gap-2">
              <select
                value={selectedVisite}
                onChange={(e) => setSelectedVisite(e.target.value)}
                className="border rounded-md px-4 py-2"
              >
                <option value="">Sélectionner une visite</option>
                {visites.map((visite) => (
                  <option key={visite.id} value={visite.id}>
                    {new Date(visite.dateVisite).toLocaleDateString("fr-FR")}
                  </option>
                ))}
              </select>
              {selectedVisite && prescripteur && !prescripteur.prescripteur && (
                <select
                  value={selectedPrescripteur}
                  onChange={(e) => setSelectedPrescripteur(e.target.value)}
                  className="border rounded-md px-4 py-2 max-w-50"
                >
                  <option value="">Sélectionner un prescripteur</option>
                  {tabPrescripteurs.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <Button
              onClick={() => setModalOpen(true)}
              disabled={!selectedVisite}
            >
              <Plus className="mr-2" size={16} /> Nouvelle demande
            </Button>
          </div>

          <Separator className="my-4" />

          {selectedVisite && demandeExamens.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Examen</TableCell>
                  <TableCell>Prix</TableCell>
                  <TableCell className="max-w-37.5 text-center">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demandeExamens.length > 0 ? (
                  demandeExamens.map((demande) => (
                    <TableRow key={demande.id}>
                      <TableCell>
                        {dateVisiteByidVisite(selectedVisite)}
                      </TableCell>
                      <TableCell>{getNomExamen(demande)}</TableCell>
                      <TableCell>
                        {getPrixExamen(demande.idTarifExamen)} CFA
                      </TableCell>
                      <TableCell className="max-w-37.5 text-center">
                        <Button
                          className="mx-auto"
                          variant="destructive"
                          onClick={() => handleDeleteDemande(demande.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">
                      Aucune demande pour cette visite
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="text-right py-4 font-bold">
                    Total :
                  </TableCell>
                  <TableCell>
                    {demandeExamens.reduce(
                      (total, demande) =>
                        total + getPrixExamen(demande.idTarifExamen),
                      0
                    )}{" "}
                    CFA
                  </TableCell>
                  <TableCell className="max-w-37.5 text-center">
                    <Button disabled={isPending} onClick={handleDemandeExamen}>
                      Soumettre
                    </Button>
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </div>
        <Separator className="my-4" />

        {demandes.filter((d) => d.idVisite === selectedVisite).length > 0 && (
          <div className="p-4 flex flex-col" ref={contentRef}>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100 opacity-95">
                  <TableCell colSpan={4} className="text-center px-auto">
                    <Image
                      src="/LOGO_AIBEF_IPPF.png"
                      alt="Logo"
                      width={400}
                      height={10}
                      // layout="responsive"
                      style={{ margin: "auto" }}
                    />
                  </TableCell>
                </TableRow>
                <TableRow className="font-bold">
                  <TableCell>Date</TableCell>
                  <TableCell>Examen</TableCell>
                  <TableCell>Prix</TableCell>
                  <TableCell className="max-w-37.5 text-center">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demandes.length > 0 ? (
                  demandes.map((demande) => (
                    <TableRow key={demande.id}>
                      <TableCell>
                        {dateVisiteByidVisite(demande.idVisite)}
                      </TableCell>
                      <TableCell>{getNomExamen(demande)}</TableCell>
                      <TableCell>
                        {getPrixExamen(demande.idTarifExamen)} CFA
                      </TableCell>
                      <TableCell className="max-w-37.5 text-center">
                        {/* <Button
                          className="mx-auto"
                          variant="destructive"
                          onClick={() => handleDeleteDemandeInBD(demande.id)}
                        >
                          <Trash2 size={16} />
                        </Button> */}
                        <AlertDialog>
                          {/* 📌 Ton bouton destructif déclenche le dialog */}
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              🗑
                            </Button>
                          </AlertDialogTrigger>

                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Es-tu sûr ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible. {"L'examen"} sera
                                définitivement supprimé.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              {/* 📌 Action de confirmation qui supprime réellement */}
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                                onClick={() =>
                                  handleDeleteDemandeInBD(demande.id)
                                }
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">
                      Aucune demande pour cette visite
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="text-right py-4 font-bold">
                    Total :
                  </TableCell>
                  <TableCell>
                    {demandes.reduce(
                      (total, demande) =>
                        total + getPrixExamen(demande.idTarifExamen),
                      0
                    )}{" "}
                    CFA
                  </TableCell>
                  <TableCell className="max-w-37.5 text-center">
                    {/* <Button disabled={isPending} onClick={handleDemandeExamen}>
                  Soumettre
                </Button> */}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
            <table className="max-w-md mt-4 " style={{ float: "left" }}>
              <tbody>
                <tr>
                  <td className=" font-bold px-2 py-1">Prescripteur :</td>
                  <td className=" font-bold px-2 py-1">
                    {demandes.length > 0
                      ? getUserNameById(demandes[0]?.idUser as string)
                      : "Inconnu"}
                  </td>
                </tr>
                <tr>
                  <td className=" font-bold px-2 py-1">Clinique :</td>
                  <td className=" font-bold px-2 py-1">
                    {getAllCliniqueNameById(client?.cliniqueId as string)}
                  </td>
                </tr>
                <tr>
                  <td className=" font-bold px-2 py-1">Date :</td>
                  <td className=" font-bold px-2 py-1">
                    {new Date().toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {demandes.filter((d) => d.idVisite === selectedVisite).length > 0 && (
          <div className="flex justify-center my-4 gap-4">
            <Button
              onClick={() => {
                // setIsHidden(true);
                reactToPrintFn();
              }}
            >
              Imprimer la facture
            </Button>
            <Button onClick={() => router.push(`/fiches/${demandeId}`)}>
              Retour
            </Button>
          </div>
        )}
        {selectedVisite && (
          <DemandeExamenModal
            open={modalOpen}
            setOpen={setModalOpen}
            refreshDemandes={refreshDemandes}
            idClient={demandeId}
            idVisite={selectedVisite}
            examensDisponibles={tabTarifExamens}
            setDemandeExamens={setDemandeExamens}
          />
        )}
      </div>
    </div>
  );
}
