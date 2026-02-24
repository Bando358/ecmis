"use client";

import { useState, useEffect, use, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Plus,
  Trash2,
  FlaskConical,
  Printer,
  ArrowLeft,
  CalendarDays,
  Building2,
  User2,
  ClipboardCheck,
  ShoppingCart,
  CircleDollarSign,
  FileWarning,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { getOneClient } from "@/lib/actions/clientActions";
import { getAllTarifExamenByClinique } from "@/lib/actions/tarifExamenActions";
import {
  createDemandeExamen,
  deleteDemandeExamen,
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
  TableName,
  TypeExamen,
} from "@prisma/client";
import { getAllExamen } from "@/lib/actions/examenActions";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import { useReactToPrint } from "react-to-print";
import { useRouter } from "next/navigation";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import {
  createRecapVisite,
  removeFormulaireFromRecap,
} from "@/lib/actions/recapActions";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import Retour from "@/components/retour";

const typeExamenLabels: Record<TypeExamen, string> = {
  MEDECIN: "Médecine",
  GYNECOLOGIE: "Gynécologie",
  OBSTETRIQUE: "Obstétrique",
  VIH: "VIH",
  IST: "IST",
};

const typeExamenColors: Record<TypeExamen, string> = {
  MEDECIN: "bg-green-100 text-green-800 border-green-200",
  GYNECOLOGIE: "bg-purple-100 text-purple-800 border-purple-200",
  OBSTETRIQUE: "bg-pink-100 text-pink-800 border-pink-200",
  VIH: "bg-red-100 text-red-800 border-red-200",
  IST: "bg-orange-100 text-orange-800 border-orange-200",
};

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
  const [prescripteur, setPrescripteur] = useState<User>();
  const [prescripteurs, setPrescripteurs] = useState<User | null>(null);
  const [tabPrescripteurs, setTabPrescripteurs] = useState<User[]>([]);

  const [selectedVisite, setSelectedVisite] = useState<string>("");
  const [selectedPrescripteur, setSelectedPrescripteur] = useState<string>("");
  const [client, setClient] = useState<Client | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const { data: session } = useSession();
  const router = useRouter();
  const idUser = session?.user.id as string;

  const { canCreate, canDelete } = usePermissionContext();

  // Chargement initial optimisé : requêtes en parallèle
  useEffect(() => {
    if (!idUser || !demandeId) return;

    const fetchAllData = async () => {
      try {
        // Wave 1: toutes les requêtes indépendantes en parallèle
        const [user, clientData, visitesData, examensData, clinique] =
          await Promise.all([
            getOneUser(idUser),
            getOneClient(demandeId),
            getAllVisiteByIdClient(demandeId),
            getAllExamen(),
            getAllClinique(),
          ]);

        setPrescripteur(user!);

        if (!clientData) return;
        setClient(clientData as Client);
        setVisites(visitesData as Visite[]);
        setTabExamens(examensData as Examen[]);
        setTabClinique(clinique as Clinique[]);

        // Wave 2: requêtes dépendantes du client en parallèle
        const [tarifExam, prescripteursData] = await Promise.all([
          getAllTarifExamenByClinique(clientData.cliniqueId),
          getAllUserIncludedIdClinique(clientData.cliniqueId),
        ]);
        setTabTarifExamens(tarifExam as TarifExamen[]);
        setTabPrescripteurs([...prescripteursData]);
      } catch (error) {
        console.error("Erreur lors du chargement des données :", error);
      }
    };
    fetchAllData();
  }, [idUser, demandeId]);

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
      const demandesData = await getAllDemandeExamensByIdVisite(selectedVisite);
      setDemandes(demandesData as DemandeExamen[]);
    }
  };

  const getPrixExamen = (idTarifExamen: string) => {
    return (
      tabTarifExamens.find((e) => e.id === idTarifExamen)?.prixExamen || 0
    );
  };

  const handleDeleteDemande = (demandeId: string) => {
    setDemandeExamens((prev) =>
      prev.filter((demande) => demande.id !== demandeId)
    );
  };

  const handleDeleteDemandeInBD = async (demandeId: string) => {
    if (!canDelete(TableName.DEMANDE_EXAMEN)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_DELETE);
      return;
    }
    try {
      await deleteDemandeExamen(demandeId);
      const remaining = demandes.filter((d) => d.id !== demandeId);
      setDemandes(remaining);
      if (!remaining.some((d) => d.idVisite === selectedVisite)) {
        await removeFormulaireFromRecap(
          selectedVisite,
          "21 Fiche Demande examen"
        );
      }
      toast.success("Demande supprimée avec succès");
    } catch (error) {
      console.error("Erreur lors de la suppression :", error);
      toast.error("Erreur lors de la suppression de la demande");
    }
  };

  const handleDemandeExamen = async () => {
    if (!canCreate(TableName.DEMANDE_EXAMEN)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }
    if (demandeExamens.length === 0) {
      toast.error("Aucune demande à soumettre.");
      return;
    }
    if (!selectedPrescripteur && !prescripteur?.prescripteur) {
      toast.warning("Veuillez sélectionner un prescripteur.");
      return;
    }

    setIsPending(true);
    try {
      if (prescripteurs || prescripteur?.prescripteur) {
        for (const demande of demandeExamens) {
          const newDemande = {
            id: demande.id,
            idUser: prescripteur?.prescripteur
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

      await createRecapVisite({
        idVisite: selectedVisite,
        idClient: demandeId,
        prescripteurs: [],
        formulaires: ["21 Fiche Demande examen"],
      });

      setDemandeExamens([]);
      const newDemandes = await getAllDemandeExamensByIdVisite(selectedVisite);
      setDemandes(newDemandes as DemandeExamen[]);
      toast.success("Toutes les demandes ont été soumises avec succès");
    } catch (error) {
      console.error("Erreur lors de la soumission :", error);
      toast.error("Une ou plusieurs demandes n'ont pas pu être soumises.");
    } finally {
      setIsPending(false);
    }
  };

  const getExamenInfo = (demande: DemandeExamen) => {
    const tarif = tabTarifExamens.find((t) => t.id === demande.idTarifExamen);
    return tabExamens.find((e) => e.id === tarif?.idExamen);
  };

  const getNomExamen = (demande: DemandeExamen) => {
    return getExamenInfo(demande)?.nomExamen || "Inconnu";
  };

  const getTypeExamen = (
    demande: DemandeExamen
  ): TypeExamen | undefined => {
    return getExamenInfo(demande)?.typeExamen;
  };

  const nomClinique = (idClinique: string) => {
    return (
      tabClinique.find((c) => c.id === idClinique)?.nomClinique ||
      "Clinique inconnue"
    );
  };

  const getUserNameById = (idUser: string) => {
    return (
      tabPrescripteurs.find((u) => u.id === idUser)?.name ||
      prescripteur?.name ||
      "Inconnu"
    );
  };

  // Totaux
  const totalBrouillon = useMemo(
    () =>
      demandeExamens.reduce(
        (total, d) => total + getPrixExamen(d.idTarifExamen),
        0
      ),
    [demandeExamens, tabTarifExamens]
  );

  const demandesFiltrees = useMemo(
    () => demandes.filter((d) => d.idVisite === selectedVisite),
    [demandes, selectedVisite]
  );

  const totalSaved = useMemo(
    () =>
      demandesFiltrees.reduce(
        (total, d) => total + getPrixExamen(d.idTarifExamen),
        0
      ),
    [demandesFiltrees, tabTarifExamens]
  );

  const contentRef = useRef<HTMLDivElement>(null);
  const reactToPrintFn = useReactToPrint({ contentRef });

  // Exclure les examens déjà ajoutés (brouillon + enregistrés)
  const examensDisponiblesFiltres = useMemo(() => {
    const usedTarifIds = new Set([
      ...demandeExamens.map((d) => d.idTarifExamen),
      ...demandesFiltrees.map((d) => d.idTarifExamen),
    ]);
    return tabTarifExamens.filter((t) => !usedTarifIds.has(t.id));
  }, [tabTarifExamens, demandeExamens, demandesFiltrees]);

  const hasDraft = demandeExamens.length > 0;
  const hasSaved = demandesFiltrees.length > 0;

  return (
    <div className="w-full relative">
      <Retour />
      <div className="px-4 sm:px-6 pb-8 space-y-5">
        {/* ===== HEADER ===== */}
        <Card className="overflow-hidden border-amber-200 shadow-md shadow-amber-100/40">
          <div className="bg-linear-to-r from-amber-900 to-amber-700 px-5 py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <FlaskConical className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight">
                    Demandes d&apos;examens
                  </h1>
                  <p className="text-sm text-amber-100">
                    {client?.nom?.toUpperCase()} {client?.prenom} &mdash;{" "}
                    {nomClinique(client?.cliniqueId as string)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  <CalendarDays className="h-3 w-3 mr-1" />
                  {visites.length} visite(s)
                </Badge>
                {client?.code && (
                  <Badge
                    variant="outline"
                    className="border-white/30 text-white text-xs font-mono"
                  >
                    {client.code}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Formulaire selects */}
          <CardContent className="pt-4 pb-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Visite
                </label>
                <Select
                  value={selectedVisite}
                  onValueChange={setSelectedVisite}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    {visites.map((visite) => (
                      <SelectItem key={visite.id} value={visite.id}>
                        {new Date(visite.dateVisite).toLocaleDateString(
                          "fr-FR"
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedVisite && !prescripteur?.prescripteur && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Prescripteur
                  </label>
                  <Select
                    value={selectedPrescripteur}
                    onValueChange={(val) => {
                      setSelectedPrescripteur(val);
                      const user = tabPrescripteurs.find((u) => u.id === val);
                      setPrescripteurs(user || null);
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tabPrescripteurs.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>

          <Separator />

          {/* Toolbar */}
          <div className="px-5 py-3 flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground mr-1">
              Ajouter :
            </span>
            <Button
              size="sm"
              variant={selectedVisite ? "default" : "outline"}
              onClick={() => setModalOpen(true)}
              disabled={!selectedVisite}
              className="h-8 text-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Examen
            </Button>
          </div>
        </Card>

        {/* ===== SUMMARY STAT ===== */}
        {hasDraft && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-200/60 bg-amber-50/30 p-3 max-w-xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-100">
              <FlaskConical className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Brouillon</p>
              <p className="text-sm font-bold text-amber-900">
                {totalBrouillon.toLocaleString("fr-FR")}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  CFA
                </span>
              </p>
            </div>
          </div>
        )}

        {/* ===== BROUILLON ===== */}
        {hasDraft && selectedVisite && (
          <Card className="border-amber-200/60 shadow-sm shadow-amber-100/30">
            <CardHeader className="pb-3 bg-amber-50/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Brouillon</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {demandeExamens.length} demande(s)
                  </Badge>
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs font-bold">
                    <CircleDollarSign className="h-3 w-3 mr-1" />
                    {totalBrouillon.toLocaleString("fr-FR")} CFA
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <TableHeader className="bg-amber-50/60">
                  <TableRow>
                    <TableHead className="text-amber-900">Examen</TableHead>
                    <TableHead className="text-amber-900 w-28">
                      Spécialité
                    </TableHead>
                    <TableHead className="text-right text-amber-900 w-28">
                      Prix
                    </TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demandeExamens.map((demande) => {
                    const examType = getTypeExamen(demande);
                    return (
                      <TableRow
                        key={demande.id}
                        className="group hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="font-medium">
                          {getNomExamen(demande)}
                        </TableCell>
                        <TableCell>
                          {examType && (
                            <Badge
                              variant="secondary"
                              className={`text-[11px] ${typeExamenColors[examType]}`}
                            >
                              {typeExamenLabels[examType]}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {getPrixExamen(
                            demande.idTarifExamen
                          ).toLocaleString("fr-FR")}{" "}
                          CFA
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteDemande(demande.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="border-t border-amber-200/60 bg-amber-50/30 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4 text-amber-700" />
                <span className="text-sm font-semibold">Total :</span>
                <span className="text-lg font-bold text-amber-800 tabular-nums">
                  {totalBrouillon.toLocaleString("fr-FR")} CFA
                </span>
              </div>
              <Button
                onClick={handleDemandeExamen}
                disabled={
                  isPending ||
                  (!selectedPrescripteur && !prescripteur?.prescripteur)
                }
                className="gap-1.5"
              >
                <ClipboardCheck className="h-4 w-4" />
                {isPending ? "Soumission..." : "Soumettre"}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* ===== DEMANDES ENREGISTREES ===== */}
        {hasSaved && (
          <div className="w-full" ref={contentRef}>
            <Card className="overflow-hidden border-amber-200/60 shadow-sm shadow-amber-100/30">
              <CardHeader className="pb-2 print:hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-emerald-600" />
                    <CardTitle className="text-base">
                      Demandes enregistrées
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {demandesFiltrees.length} demande(s)
                    </Badge>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold">
                      {totalSaved.toLocaleString("fr-FR")} CFA
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-0">
                      <TableCell colSpan={4} className="text-center py-4">
                        <Image
                          src="/LOGO_AIBEF_IPPF.png"
                          alt="Logo"
                          width={400}
                          height={10}
                          style={{ margin: "auto" }}
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-amber-50/60">
                      <TableHead className="text-amber-900">Examen</TableHead>
                      <TableHead className="text-amber-900 w-28">
                        Spécialité
                      </TableHead>
                      <TableHead className="text-right text-amber-900 w-28">
                        Prix
                      </TableHead>
                      <TableHead className="w-12 print:hidden"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {demandesFiltrees.map((demande) => {
                      const examType = getTypeExamen(demande);
                      return (
                        <TableRow
                          key={demande.id}
                          className="group hover:bg-muted/30 transition-colors"
                        >
                          <TableCell className="font-medium">
                            {getNomExamen(demande)}
                          </TableCell>
                          <TableCell>
                            {examType && (
                              <Badge
                                variant="secondary"
                                className={`text-[11px] ${typeExamenColors[examType]}`}
                              >
                                {typeExamenLabels[examType]}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {getPrixExamen(
                              demande.idTarifExamen
                            ).toLocaleString("fr-FR")}{" "}
                            CFA
                          </TableCell>
                          <TableCell className="print:hidden">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Confirmer la suppression
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Cette action est irréversible.
                                    L&apos;examen sera définitivement supprimé.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700"
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
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-amber-50/50 border-t-2 border-amber-300/40">
                      <TableCell
                        colSpan={2}
                        className="text-right text-sm font-bold"
                      >
                        Total :
                      </TableCell>
                      <TableCell className="text-right text-base font-bold text-amber-800 tabular-nums">
                        {totalSaved.toLocaleString("fr-FR")} CFA
                      </TableCell>
                      <TableCell className="print:hidden"></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>

              {/* Receipt footer */}
              <CardFooter className="flex flex-col gap-3 border-t pt-4 pb-5">
                <Separator className="print:hidden" />
                <div className="w-full grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Clinique :</span>
                    <span className="font-medium">
                      {nomClinique(client?.cliniqueId as string)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">
                      Prescripteur :
                    </span>
                    <span className="font-medium">
                      {demandesFiltrees.length > 0
                        ? getUserNameById(
                            demandesFiltrees[0]?.idUser as string
                          )
                        : "Inconnu"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Date :</span>
                    <span className="font-medium">
                      {new Date().toLocaleDateString("fr-FR", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* ===== EMPTY STATE ===== */}
        {selectedVisite && !hasDraft && !hasSaved && (
          <Card className="border-dashed border-2 border-amber-200/70">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 mb-4">
                <FileWarning className="h-8 w-8 text-amber-400" />
              </div>
              <p className="text-base font-semibold text-muted-foreground">
                Aucune demande pour cette visite
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
                Utilisez le bouton ci-dessus pour ajouter un examen
              </p>
            </CardContent>
          </Card>
        )}

        {/* ===== ACTION BUTTONS ===== */}
        {selectedVisite && hasSaved && (
          <div className="flex justify-center gap-3 print:hidden">
            <Button
              variant="outline"
              size="lg"
              onClick={() => reactToPrintFn()}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => router.push(`/fiches/${demandeId}`)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au dossier
            </Button>
          </div>
        )}

        {/* ===== MODAL ===== */}
        {selectedVisite && (
          <DemandeExamenModal
            open={modalOpen}
            setOpen={setModalOpen}
            refreshDemandes={refreshDemandes}
            idClient={demandeId}
            idVisite={selectedVisite}
            examensDisponibles={examensDisponiblesFiltres}
            setDemandeExamens={setDemandeExamens}
            allExamens={tabExamens}
          />
        )}
      </div>
    </div>
  );
}
