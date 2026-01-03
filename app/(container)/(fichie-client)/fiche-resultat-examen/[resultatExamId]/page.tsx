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
import { Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";

import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { getOneClient } from "@/lib/actions/clientActions";
import {
  Visite,
  Examen,
  FactureExamen,
  ResultatExamen,
  Client,
  Clinique,
  User,
  Permission,
  TableName,
} from "@prisma/client";
import { getAllExamen } from "@/lib/actions/examenActions";
import { toast } from "sonner";
import Image from "next/image";
import { getAllFactureExamenByIdVisite } from "@/lib/actions/factureExamenActions";
import ResultatExamenModal from "@/components/resultatExamenDialog";
import {
  createResultatExamen,
  deleteResultatExamen,
  getAllResultatExamensByIdVisite,
  getOneResultatExamen,
} from "@/lib/actions/resultatExamenActions";
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
import { getOneClinique } from "@/lib/actions/cliniqueActions";
import { getOneUser } from "@/lib/actions/authActions";
import { useReactToPrint } from "react-to-print";
import { useRouter } from "next/navigation";
import { SpinnerBar } from "@/components/ui/spinner-bar";
import { useSession } from "next-auth/react";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import Retour from "@/components/retour";

export default function PageResultatExamen({
  params,
}: {
  params: Promise<{ resultatExamId: string }>;
}) {
  const { resultatExamId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [resultatExamens, setResultatExamens] = useState<ResultatExamen[]>([]);
  const [tabResultatExamens, setTabResultatExamens] = useState<
    ResultatExamen[]
  >([]);
  const [factureExamens, setFactureExamens] = useState<FactureExamen[]>([]);
  const [tabExamens, setTabExamens] = useState<Examen[]>([]);
  const [client, setClient] = useState<Client>();
  const [clinique, setClinique] = useState<Clinique>();
  const [laborantin, setLaborantin] = useState<User | null>();

  const [selectedVisite, setSelectedVisite] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [permission, setPermission] = useState<Permission | null>(null);

  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!session?.user) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(session.user.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.RESULTAT_EXAMEN
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
      try {
        const [clientData, visitesData, examensData] = await Promise.all([
          getOneClient(resultatExamId),
          getAllVisiteByIdClient(resultatExamId),
          getAllExamen(),
        ]);

        if (!clientData) {
          console.warn("Aucun client trouvé pour l'ID :", resultatExamId);
          return;
        }
        setClient(clientData as Client);
        setVisites(visitesData as Visite[]);
        setTabExamens(examensData as Examen[]);
        const laborantin = await getOneUser(examensData[0].idUser);
        setLaborantin(laborantin);
      } catch (error) {
        console.error("Erreur lors du chargement des données :", error);
      }
    };

    fetchData();
  }, [resultatExamId]);

  useEffect(() => {
    const fetchResultats = async () => {
      setIsPending(true);
      if (!selectedVisite) return;
      try {
        const [facturesData, resultatsData, tabCliniqueData] =
          await Promise.all([
            getAllFactureExamenByIdVisite(selectedVisite),
            getAllResultatExamensByIdVisite(selectedVisite),
            getOneClinique(client?.cliniqueId as string),
          ]);
        setFactureExamens(facturesData as FactureExamen[]);
        setTabResultatExamens(resultatsData as ResultatExamen[]);
        setClinique(tabCliniqueData as Clinique);
      } catch (error) {
        console.error("Erreur lors du chargement :", error);
      }
      setIsPending(false);
    };

    fetchResultats();
  }, [selectedVisite, client?.cliniqueId]);

  useEffect(() => {
    if (resultatExamens.length === 0) return;
    if (tabResultatExamens.length === 0) return;
    // retirer de tabResultatExamens ceux qui sont déjà dans resultatExamens
    setResultatExamens((prev) =>
      prev.filter(
        (r) =>
          !tabResultatExamens.some(
            (rr) => rr.idFactureExamen === r.idFactureExamen
          )
      )
    );
  }, [tabResultatExamens]);

  // fonction pour récupérer l'unité de mesure d'un examen à partir de son nom
  const getUniteMesureById = (idFactureExamen: string) => {
    const libelleExamen = libelleFactureExamenById(idFactureExamen);
    const examen = tabExamens.find(
      (examen) => examen.nomExamen === libelleExamen
    );
    return examen?.uniteMesureExamen;
  };
  const getValeurUsuelleByIdFacture = (idFactureExamen: string) => {
    const sexe = client?.sexe;
    const libelleExamen = libelleFactureExamenById(idFactureExamen);
    const examen = tabExamens.find(
      (examen) => examen.nomExamen === libelleExamen
    );
    if (
      examen?.valeurUsuelleMaxF === 0 &&
      examen?.valeurUsuelleMinF === 0 &&
      examen?.valeurUsuelleMaxH === 0 &&
      examen?.valeurUsuelleMinH === 0
    ) {
      return null;
    }
    if (sexe === "Féminin") {
      return `${examen?.valeurUsuelleMinF} - ${examen?.valeurUsuelleMaxF}`;
    } else {
      return `${examen?.valeurUsuelleMinH} - ${examen?.valeurUsuelleMaxH}`;
    }
  };

  const refreshResultatExamens = async () => {
    if (selectedVisite) {
      const resultatsData = await getAllResultatExamensByIdVisite(
        selectedVisite
      );
      setResultatExamens(resultatsData as ResultatExamen[]);
    }
  };

  const handleDeleteResultatExamen = async (id: string) => {
    setResultatExamens((prev) => prev.filter((r) => r.id !== id));
    // TODO: appeler l’API de suppression si nécessaire
  };
  const handleDeleteResultatExamenInBD = async (id: string) => {
    if (!permission?.canDelete && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de supprimer un résultat d'examen. Contactez un administrateur."
      );
      return router.back();
    } else {
      try {
        const result = await deleteResultatExamen(id);
        setTabResultatExamens((prev) => prev.filter((r) => r.id !== result.id));
        toast.warning("Résultat supprimé avec succès");
      } catch (error) {
        console.error("Erreur lors de la suppression :", error);
        toast.error("Erreur lors de la suppression du résultat");
      }
    }
  };

  const dateVisiteByidVisite = (idVisite: string) => {
    return (
      visites
        .find((v) => v.id === idVisite)
        ?.dateVisite.toLocaleDateString("fr-FR") || "Date introuvable"
    );
  };
  // récupérer le libellé de la factureExamen à partir de son id
  const libelleFactureExamenById = (id: string) => {
    return (
      factureExamens.find((f) => f.id === id)?.libelleExamen || "Introuvable"
    );
  };

  const handlePushResultatExamenToBd = async () => {
    if (!permission?.canCreate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de créer un résultat d'examen. Contactez un administrateur."
      );
      return router.back();
    }
    setIsSubmitting(true);
    // Envoyer chaque résultat d'examen au serveur
    for (const resultat of resultatExamens) {
      const result = {
        id: resultat.id,
        resultatExamen: resultat.resultatExamen,
        observations: resultat.observations,
        valeurResultat: resultat.valeurResultat,
        updatedAt: resultat.updatedAt,
        createdAt: resultat.createdAt,
        idFactureExamen: resultat.idFactureExamen,
        idClinique: resultat.idClinique,
        idUser: resultat.idUser,
        idVisite: resultat.idVisite,
        idClient: resultat.idClient,
      };
      try {
        await createResultatExamen(result);
        const newResult = await getOneResultatExamen(resultat.id);
        setTabResultatExamens((prev) => [...prev, newResult as ResultatExamen]);
        // Retirer de la liste locale après ajout
        setResultatExamens((prev) => prev.filter((r) => r.id !== resultat.id));
        toast.success("Résultat d'examen ajouté avec succès");
      } catch (error) {
        console.error("Erreur lors de l'ajout du résultat d'examen :", error);
        toast.error("Erreur lors de l'ajout du résultat d'examen");
      }
    }
    setIsSubmitting(false);
  };

  const contentRef = useRef<HTMLDivElement>(null);
  const reactToPrintFn = useReactToPrint({ contentRef });

  return (
    <div className="w-full relative">
      <Retour />
      <div className="px-6">
        <h1 className="text-2xl font-bold mb-6">Résultats des examens</h1>

        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
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

            <Button
              onClick={() => setModalOpen(true)}
              disabled={!selectedVisite}
            >
              <Plus className="mr-2" size={16} /> Ajouter un résultat
            </Button>
          </div>

          <Separator className="my-4" />

          {selectedVisite && resultatExamens.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Examen</TableCell>
                  <TableCell>Valeur</TableCell>
                  <TableCell>Unité</TableCell>
                  <TableCell>Valeur Usuelle</TableCell>
                  <TableCell>Observations</TableCell>
                  <TableCell className="text-center">Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultatExamens.length > 0 ? (
                  resultatExamens.map((resultat) => (
                    <TableRow key={resultat.id}>
                      <TableCell>
                        {dateVisiteByidVisite(resultat.idVisite)}
                      </TableCell>
                      <TableCell>
                        {libelleFactureExamenById(resultat.idFactureExamen) ||
                          "-"}
                      </TableCell>
                      <TableCell>
                        {resultat.resultatExamen === ""
                          ? resultat.valeurResultat
                          : resultat.resultatExamen}
                      </TableCell>
                      <TableCell>
                        {getUniteMesureById(resultat.idFactureExamen)}
                      </TableCell>
                      <TableCell>
                        {getValeurUsuelleByIdFacture(resultat.idFactureExamen)}
                      </TableCell>
                      <TableCell>{resultat.observations || "-"}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleDeleteResultatExamen(resultat.id)
                          }
                        >
                          🗑
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      Aucun résultat pour cette visite
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5} className="text-right font-semibold">
                    Total:
                  </TableCell>
                  <TableCell>
                    <Button
                      onClick={handlePushResultatExamenToBd}
                      disabled={resultatExamens.length === 0 || isSubmitting}
                    >
                      {isSubmitting ? "Enregistrement..." : "Enregistrer"}
                    </Button>
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
          <Separator className="my-4" />
          {isPending ? (
            <SpinnerBar />
          ) : (
            <>
              <div className="w-full" ref={contentRef}>
                {selectedVisite && tabResultatExamens.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableCell colSpan={7} className="text-center px-auto">
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
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Examen</TableCell>
                        <TableCell>Valeur</TableCell>
                        <TableCell>Unité</TableCell>
                        <TableCell>Valeur Usuelle</TableCell>
                        <TableCell>Observations</TableCell>
                        <TableCell className="text-center">Actions</TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tabResultatExamens.length > 0 ? (
                        tabResultatExamens.map((resultat) => (
                          <TableRow key={resultat.id}>
                            <TableCell>
                              {dateVisiteByidVisite(resultat.idVisite)}
                            </TableCell>
                            <TableCell>
                              {libelleFactureExamenById(
                                resultat.idFactureExamen
                              ) || "-"}
                            </TableCell>
                            <TableCell>
                              {resultat.resultatExamen === ""
                                ? resultat.valeurResultat
                                : resultat.resultatExamen}
                            </TableCell>
                            <TableCell>
                              {getUniteMesureById(resultat.idFactureExamen)}
                            </TableCell>
                            <TableCell>
                              {getValeurUsuelleByIdFacture(
                                resultat.idFactureExamen
                              )}
                            </TableCell>
                            <TableCell>
                              {resultat.observations || "-"}
                            </TableCell>
                            <TableCell>
                              <AlertDialog>
                                {/* 📌 Ton bouton destructif déclenche le dialog */}
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    🗑
                                  </Button>
                                </AlertDialogTrigger>

                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Es-tu sûr ?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Cette action est irréversible. Le produit
                                      sera définitivement supprimé.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Annuler
                                    </AlertDialogCancel>
                                    {/* 📌 Action de confirmation qui supprime réellement */}
                                    <AlertDialogAction
                                      onClick={() =>
                                        handleDeleteResultatExamenInBD(
                                          resultat.id
                                        )
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
                          <TableCell colSpan={5} className="text-center py-4">
                            Aucun résultat pour cette visite
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-right font-semibold"
                        ></TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                )}
                {tabResultatExamens.length > 0 && (
                  <div>
                    <p className="pl-2">
                      Clinique:{" "}
                      {clinique?.nomClinique || "Clinique introuvable"}{" "}
                    </p>
                    <p className="pl-2">
                      Laborantin : {laborantin?.name || "Introuvable"}{" "}
                    </p>
                    <p className="pl-2">
                      Date :{" "}
                      {new Date().toLocaleDateString("fr-FR", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                      &nbsp;à&nbsp;{new Date().toLocaleTimeString("fr-FR")}
                    </p>
                    <p className="pl-2">
                      Résultat Client:{" "}
                      {client?.nom
                        ? client.nom
                            .split(" ")
                            .map(
                              (word) =>
                                word.charAt(0).toUpperCase() +
                                word.slice(1).toLowerCase()
                            )
                            .join(" ")
                        : ""}{" "}
                      {client?.prenom
                        ? client.prenom
                            .split(" ")
                            .map(
                              (word) =>
                                word.charAt(0).toUpperCase() +
                                word.slice(1).toLowerCase()
                            )
                            .join(" ")
                        : ""}{" "}
                    </p>
                  </div>
                )}
              </div>
              {selectedVisite && tabResultatExamens.length > 0 && (
                <div className="flex justify-center -mt-4 gap-4">
                  <Button
                    onClick={() => {
                      // setIsHidden(true);
                      reactToPrintFn();
                    }}
                  >
                    Imprimer la facture
                  </Button>
                  <Button
                    onClick={() => router.push(`/fiches/${resultatExamId}`)}
                  >
                    Retour
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {selectedVisite && (
          <ResultatExamenModal
            open={modalOpen}
            setOpen={setModalOpen}
            // refreshResultatExamens={refreshResultatExamens}
            tabExamens={tabExamens}
            idClient={resultatExamId}
            idVisite={selectedVisite}
            setResultatExamens={setResultatExamens}
            resultatExamens={resultatExamens}
            factureExamens={factureExamens}
          />
        )}
      </div>
    </div>
  );
}
