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

import {
  Visite,
  Client,
  User,
  Clinique,
  TarifEchographie,
  DemandeEchographie,
  Echographie,
  ServiceEchographie,
  Permission,
  TableName,
} from "@prisma/client";
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
import { getAllTarifEchographieByClinique } from "@/lib/actions/tarifEchographieActions";
import { getAllEchographies } from "@/lib/actions/echographieActions";
import {
  createDemandeEchographie,
  deleteDemandeEchographie,
  getAllDemandeEchographies,
  getAllDemandeEchographiesByIdVisite,
} from "@/lib/actions/demandeEchographieActions";
import DemandeEchographieModal from "@/components/DemandeEchogrophieDialog";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import { el } from "date-fns/locale";

export default function PageDemandeEchographie({
  params,
}: {
  params: Promise<{ demandeEchoId: string }>;
}) {
  const { demandeEchoId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [tabTarifEchographies, setTabTarifEchographies] = useState<
    TarifEchographie[]
  >([]);
  const [demandeEchographies, setDemandeEchographies] = useState<
    DemandeEchographie[]
  >([]);
  const [demandes, setDemandes] = useState<DemandeEchographie[]>([]);
  const [tabEchographies, setTabEchographies] = useState<Echographie[]>([]);
  const [tabClinique, setTabClinique] = useState<Clinique[]>([]);
  const [tabUser, setTabUser] = useState<User[]>([]);
  const [prescripteur, setPrescripteur] = useState<User>();
  const [prescripteurs, setPrescripteurs] = useState<User | null>(null);
  const [tabPrescripteurs, setTabPrescripteurs] = useState<User[]>([]);

  const [selectedVisite, setSelectedVisite] = useState<string>("");
  const [selectedPrescripteur, setSelectedPrescripteur] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>("");
  const [permission, setPermission] = useState<Permission | null>(null);
  const [client, setClient] = useState<Client | null>(null);
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
  }, [client, session?.user]);

  useEffect(() => {
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!session?.user) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(session.user.id);
        const perm = permissions.find(
          (p: { table: string; }) => p.table === TableName.DEMANDE_ECHOGRAPHIE
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
  }, [session?.user, router]);

  useEffect(() => {
    const fetchData = async () => {
      console.log("demandeEchoId:", demandeEchoId);
      try {
        const [clientData, visitesData, echographiesData, clinique] =
          await Promise.all([
            getOneClient(demandeEchoId),
            getAllVisiteByIdClient(demandeEchoId),
            getAllEchographies(),
            getAllClinique(),
          ]);

        if (!clientData) {
          console.warn("Aucun client trouvé pour l'ID :", demandeEchoId);
          return;
        } else {
          console.log("Client trouvé :", clientData);
        }
        setClient(clientData as Client);
        const tarifExam = await getAllTarifEchographieByClinique(
          clientData.cliniqueId
        );

        setVisites(visitesData as Visite[]);
        setTabTarifEchographies(tarifExam as TarifEchographie[]);
        setTabEchographies(echographiesData as Echographie[]);
        setTabClinique(clinique as Clinique[]);
      } catch (error) {
        console.error("Erreur lors du chargement des données :", error);
      }
    };

    fetchData();
  }, [demandeEchoId]);

  // Charger les demandes quand la visite sélectionnée change
  useEffect(() => {
    const fetchDemandes = async () => {
      try {
        if (!selectedVisite) {
          setDemandes([]);
          return;
        }
        const demandesData = await getAllDemandeEchographiesByIdVisite(
          selectedVisite
        );
        setDemandes(demandesData as DemandeEchographie[]);
      } catch (error) {
        console.error("Erreur lors du chargement des demandes :", error);
      }
    };

    fetchDemandes();
  }, [selectedVisite]);

  const refreshDemandes = async () => {
    if (selectedVisite) {
      const demandesData = await getAllDemandeEchographies();
      setDemandes(demandesData as DemandeEchographie[]);
    }
  };

  const getPrixEchographie = (idTarifEchographie: string) => {
    return (
      tabTarifEchographies.find((e) => e.id === idTarifEchographie)
        ?.prixEchographie || 0
    );
  };
  if (demandeEchographies.length > 0) {
    console.log("demandeEchographies : ", demandeEchographies);
  }

  // Handler for deleting une demande
  const handleDeleteDemande = async (demandeEchoId: string) => {
    // TODO: Replace with your actual delete logic, e.g. call an API
    setDemandeEchographies((prev) =>
      prev.filter((demande) => demande.id !== demandeEchoId)
    );
    // Optionally, refreshDemandes();
  };
  // Handler for deleting une demande
  const handleDeleteDemandeInBD = async (demandeEchoId: string) => {
    if (!permission?.canDelete && prescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de supprimer une demande. Contactez un administrateur."
      );
      return router.back();
    } else {
      if (confirm("Es-tu sûr de vouloir supprimer cette demande ?")) {
        // TODO: Replace with your actual delete logic, e.g. call an
        await deleteDemandeEchographie(demandeEchoId);
        setDemandes((prev) =>
          prev.filter((demande) => demande.id !== demandeEchoId)
        );
        // Optionally, refreshDemandes();
        toast.error("Demande supprimée avec succès ✅");
      }
    }
  };

  const handleDemandeEchographie = async () => {
    if (!permission?.canCreate && prescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de demander une Echographie. Contactez un administrateur."
      );
      return router.back();
    }

    if (demandeEchographies.length === 0) {
      toast.error("Aucune demande à soumettre.");
      return;
    }
    if (!selectedPrescripteur) {
      toast.warning("Aucun prescripteur sélectionné.");
      return;
    }

    setIsPending(true);

    try {
      if (prescripteurs) {
        for (const demande of demandeEchographies) {
          const newDemande = {
            id: demande.id,
            idUser: prescripteurs.prescripteur
              ? prescripteurs.id
              : selectedPrescripteur,
            idClient: demande.idClient,
            createdAt: demande.createdAt,
            updatedAt: demande.updatedAt,
            idClinique: demande.idClinique,
            idVisite: demande.idVisite,
            serviceEchographie: selectedService,
            idTarifEchographie: demande.idTarifEchographie,
          } as DemandeEchographie;
          await createDemandeEchographie(newDemande);
        }
      } else {
        toast.error("Le prescripteur n'est pas défini.");
        return;
      }

      // On vide la liste des demandes après soumission réussie
      setDemandeEchographies([]);
      const newDemandes = await getAllDemandeEchographiesByIdVisite(
        selectedVisite
      );
      setDemandes(newDemandes as DemandeEchographie[]);

      toast.success("Toutes les demandes ont été soumises avec succès ✅");
    } catch (error) {
      console.error("Erreur lors de la soumission :", error);
      toast.error("Une ou plusieurs demandes n'ont pas pu être soumises.");
    } finally {
      setIsPending(false);
    }
  };

  const getNomEchographie = (demande: DemandeEchographie) => {
    const tarif = tabTarifEchographies.find(
      (t) => t.id === demande.idTarifEchographie
    );
    return (
      tabEchographies.find((e) => e.id === tarif?.idEchographie)
        ?.nomEchographie || "Inconnu"
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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">{"Demandes d'echographies"}</h1>

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
            {selectedVisite && !prescripteur?.prescripteur && (
              <select
                value={selectedPrescripteur}
                onChange={(e) => setSelectedPrescripteur(e.target.value)}
                className="border rounded-md px-4 py-2 max-w-50"
              >
                <option value="">Sélectionner un prescripteur</option>
                {tabPrescripteurs.map((prescripteur) => (
                  <option key={prescripteur.id} value={prescripteur.id}>
                    {prescripteur.name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="border rounded-md px-4 py-2 max-w-50"
            >
              <option value="">Sélectionner un service</option>
              {Object.entries(ServiceEchographie).map(([key, value]) => (
                <option key={key} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={() => setModalOpen(true)} disabled={!selectedVisite}>
            <Plus className="mr-2" size={16} /> Nouvelle demande
          </Button>
        </div>

        <Separator className="my-4" />

        {selectedVisite && demandeEchographies.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Echographie</TableCell>
                <TableCell>Prix</TableCell>
                <TableCell className="max-w-37.5 text-center">
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {demandeEchographies.length > 0 ? (
                demandeEchographies.map((demande) => (
                  <TableRow key={demande.id}>
                    <TableCell>
                      {dateVisiteByidVisite(selectedVisite)}
                    </TableCell>
                    <TableCell>{getNomEchographie(demande)}</TableCell>
                    <TableCell>
                      {getPrixEchographie(demande.idTarifEchographie)} CFA
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
                  {demandeEchographies.reduce(
                    (total, demande) =>
                      total + getPrixEchographie(demande.idTarifEchographie),
                    0
                  )}{" "}
                  CFA
                </TableCell>
                <TableCell className="max-w-37.5 text-center">
                  <Button
                    disabled={isPending || selectedService === ""}
                    onClick={handleDemandeEchographie}
                  >
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
                    src="/logo/LOGO_AIBEF_IPPF.png"
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
                    <TableCell>{getNomEchographie(demande)}</TableCell>
                    <TableCell>
                      {getPrixEchographie(demande.idTarifEchographie)} CFA
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
                      total + getPrixEchographie(demande.idTarifEchographie),
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
              reactToPrintFn();
            }}
          >
            Imprimer la facture
          </Button>
          <Button onClick={() => router.push(`/fiches/${demandeEchoId}`)}>
            Retour
          </Button>
        </div>
      )}
      {selectedVisite && (
        <DemandeEchographieModal
          open={modalOpen}
          setOpen={setModalOpen}
          refreshDemandes={refreshDemandes}
          idClient={demandeEchoId}
          idVisite={selectedVisite}
          examensDisponibles={tabTarifEchographies}
          setDemandeEchographies={setDemandeEchographies}
        />
      )}
    </div>
  );
}
