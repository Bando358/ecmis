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
  ScanLine,
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
import {
  Visite,
  Client,
  Clinique,
  TarifEchographie,
  DemandeEchographie,
  Echographie,
  TableName,
  TypeEchographie,
} from "@prisma/client";
import { SafeUser } from "@/types/prisma";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import {
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
  getAllDemandeEchographiesByIdVisite,
} from "@/lib/actions/demandeEchographieActions";
import DemandeEchographieModal from "@/components/DemandeEchogrophieDialog";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import {
  createRecapVisite,
  removeFormulaireFromRecap,
} from "@/lib/actions/recapActions";
import Retour from "@/components/retour";

const typeEchographieLabels: Record<TypeEchographie, string> = {
  OBST: "Obstétrique",
  GYN: "Gynécologie",
  INF: "Infertilité",
  MDG: "Médecine Gén.",
  CAR: "Cardiologie",
};

const typeEchographieColors: Record<TypeEchographie, string> = {
  OBST: "bg-pink-100 text-pink-800 border-pink-200",
  GYN: "bg-purple-100 text-purple-800 border-purple-200",
  INF: "bg-blue-100 text-blue-800 border-blue-200",
  MDG: "bg-green-100 text-green-800 border-green-200",
  CAR: "bg-red-100 text-red-800 border-red-200",
};


export default function PageDemandeEchographie({
  params,
  hideRetour = false,
}: {
  params: Promise<{ demandeEchoId: string }>;
  hideRetour?: boolean;
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
  const [prescripteur, setPrescripteur] = useState<SafeUser>();
  const [prescripteurs, setPrescripteurs] = useState<SafeUser | null>(null);
  const [tabPrescripteurs, setTabPrescripteurs] = useState<SafeUser[]>([]);

  const [selectedVisite, setSelectedVisite] = useState<string>("");
  const [selectedPrescripteur, setSelectedPrescripteur] = useState<string>("");
  const [client, setClient] = useState<Client | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const { data: session } = useSession();
  const router = useRouter();
  const { canCreate, canDelete } = usePermissionContext();
  const idUser = session?.user.id as string;

  // Chargement initial optimisé : requêtes en parallèle
  useEffect(() => {
    if (!idUser || !demandeEchoId) return;

    const fetchAllData = async () => {
      try {
        // Wave 1: toutes les requêtes indépendantes en parallèle
        const [user, clientData, visitesData, echographiesData, clinique] =
          await Promise.all([
            getOneUser(idUser),
            getOneClient(demandeEchoId),
            getAllVisiteByIdClient(demandeEchoId),
            getAllEchographies(),
            getAllClinique(),
          ]);

        setPrescripteur(user!);

        if (!clientData) return;
        setClient(clientData as Client);
        setVisites(visitesData as Visite[]);
        setTabEchographies(echographiesData as Echographie[]);
        setTabClinique(clinique as Clinique[]);

        // Wave 2: requêtes dépendantes du client en parallèle
        const [tarifEcho, prescripteursData] = await Promise.all([
          getAllTarifEchographieByClinique(clientData.cliniqueId),
          getAllUserIncludedIdClinique(clientData.cliniqueId),
        ]);
        setTabTarifEchographies(tarifEcho as TarifEchographie[]);
        setTabPrescripteurs([...prescripteursData]);
      } catch (error) {
        console.error("Erreur lors du chargement des données :", error);
      }
    };
    fetchAllData();
  }, [idUser, demandeEchoId]);

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
      const demandesData = await getAllDemandeEchographiesByIdVisite(
        selectedVisite
      );
      setDemandes(demandesData as DemandeEchographie[]);
    }
  };

  const getPrixEchographie = (idTarifEchographie: string) => {
    return (
      tabTarifEchographies.find((e) => e.id === idTarifEchographie)
        ?.prixEchographie || 0
    );
  };

  const handleDeleteDemande = (demandeId: string) => {
    setDemandeEchographies((prev) =>
      prev.filter((demande) => demande.id !== demandeId)
    );
  };

  const handleDeleteDemandeInBD = async (demandeId: string) => {
    if (!canDelete(TableName.DEMANDE_ECHOGRAPHIE)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_DELETE);
      return;
    }
    try {
      await deleteDemandeEchographie(demandeId);
      const remaining = demandes.filter((d) => d.id !== demandeId);
      setDemandes(remaining);
      if (!remaining.some((d) => d.idVisite === selectedVisite)) {
        await removeFormulaireFromRecap(
          selectedVisite,
          "23 Fiche Demande échographie"
        );
      }
      toast.success("Demande supprimée avec succès");
    } catch (error) {
      console.error("Erreur lors de la suppression :", error);
      toast.error("Erreur lors de la suppression de la demande");
    }
  };

  const handleDemandeEchographie = async () => {
    if (!canCreate(TableName.DEMANDE_ECHOGRAPHIE)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }
    if (demandeEchographies.length === 0) {
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
        for (const demande of demandeEchographies) {
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
            serviceEchographie: "OBSTETRIQUE",
            idTarifEchographie: demande.idTarifEchographie,
          } as DemandeEchographie;
          await createDemandeEchographie(newDemande);
        }
      } else {
        toast.error("Le prescripteur n'est pas défini.");
        return;
      }

      await createRecapVisite({
        idVisite: selectedVisite,
        idClient: demandeEchoId,
        prescripteurs: [],
        formulaires: ["23 Fiche Demande échographie"],
      });

      setDemandeEchographies([]);
      const newDemandes = await getAllDemandeEchographiesByIdVisite(
        selectedVisite
      );
      setDemandes(newDemandes as DemandeEchographie[]);
      toast.success("Toutes les demandes ont été soumises avec succès");
    } catch (error) {
      console.error("Erreur lors de la soumission :", error);
      toast.error("Une ou plusieurs demandes n'ont pas pu être soumises.");
    } finally {
      setIsPending(false);
    }
  };

  const getEchographieInfo = (demande: DemandeEchographie) => {
    const tarif = tabTarifEchographies.find(
      (t) => t.id === demande.idTarifEchographie
    );
    return tabEchographies.find((e) => e.id === tarif?.idEchographie);
  };

  const getNomEchographie = (demande: DemandeEchographie) => {
    return getEchographieInfo(demande)?.nomEchographie || "Inconnu";
  };

  const getTypeEchographie = (demande: DemandeEchographie): TypeEchographie | undefined => {
    return getEchographieInfo(demande)?.typeEchographie;
  };

  const nomClinique = (idClinique: string) => {
    return (
      tabClinique.find((c) => c.id === idClinique)?.nomClinique ||
      "Clinique inconnue"
    );
  };

  const getUserNameById = (idUser: string) => {
    return tabPrescripteurs.find((u) => u.id === idUser)?.name || prescripteur?.name || "Inconnu";
  };

  // Totaux
  const totalBrouillon = useMemo(
    () =>
      demandeEchographies.reduce(
        (total, d) => total + getPrixEchographie(d.idTarifEchographie),
        0
      ),
    [demandeEchographies, tabTarifEchographies]
  );

  const demandesFiltrees = useMemo(
    () => demandes.filter((d) => d.idVisite === selectedVisite),
    [demandes, selectedVisite]
  );

  const totalSaved = useMemo(
    () =>
      demandesFiltrees.reduce(
        (total, d) => total + getPrixEchographie(d.idTarifEchographie),
        0
      ),
    [demandesFiltrees, tabTarifEchographies]
  );

  const contentRef = useRef<HTMLDivElement>(null);
  const reactToPrintFn = useReactToPrint({ contentRef });

  // Exclure les échographies déjà ajoutées (brouillon + enregistrées)
  const echographiesDisponiblesFiltrees = useMemo(() => {
    const usedTarifIds = new Set([
      ...demandeEchographies.map((d) => d.idTarifEchographie),
      ...demandesFiltrees.map((d) => d.idTarifEchographie),
    ]);
    return tabTarifEchographies.filter((t) => !usedTarifIds.has(t.id));
  }, [tabTarifEchographies, demandeEchographies, demandesFiltrees]);

  const hasDraft = demandeEchographies.length > 0;
  const hasSaved = demandesFiltrees.length > 0;

  return (
    <div className="w-full relative">
      {!hideRetour && <Retour />}
      <div className="px-4 sm:px-6 pb-8 space-y-5">
        {/* ===== HEADER ===== */}
        <Card className="overflow-hidden border-purple-200 shadow-md shadow-purple-100/40">
          <div className="bg-linear-to-r from-purple-900 to-purple-700 px-5 py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <ScanLine className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight">
                    Demandes d&apos;échographies
                  </h1>
                  <p className="text-sm text-purple-100">
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
                        {new Date(visite.dateVisite).toLocaleDateString("fr-FR")}
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
              <Plus className="h-3.5 w-3.5" /> Échographie
            </Button>
          </div>
        </Card>

        {/* ===== SUMMARY STAT ===== */}
        {hasDraft && (
          <div className="flex items-center gap-3 rounded-lg border border-purple-200/60 bg-purple-50/30 p-3 max-w-xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-purple-100">
              <ScanLine className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Brouillon</p>
              <p className="text-sm font-bold text-purple-900">
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
          <Card className="border-purple-200/60 shadow-sm shadow-purple-100/30">
            <CardHeader className="pb-3 bg-purple-50/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Brouillon</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {demandeEchographies.length} demande(s)
                  </Badge>
                  <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs font-bold">
                    <CircleDollarSign className="h-3 w-3 mr-1" />
                    {totalBrouillon.toLocaleString("fr-FR")} CFA
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <TableHeader className="bg-purple-50/60">
                  <TableRow>
                    <TableHead className="text-purple-900">Échographie</TableHead>
                    <TableHead className="text-purple-900 w-28">Spécialité</TableHead>
                    <TableHead className="text-right text-purple-900 w-28">Prix</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demandeEchographies.map((demande) => {
                    const echoType = getTypeEchographie(demande);
                    return (
                      <TableRow
                        key={demande.id}
                        className="group hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="font-medium">
                          {getNomEchographie(demande)}
                        </TableCell>
                        <TableCell>
                          {echoType && (
                            <Badge
                              variant="secondary"
                              className={`text-[11px] ${typeEchographieColors[echoType]}`}
                            >
                              {typeEchographieLabels[echoType]}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {getPrixEchographie(demande.idTarifEchographie).toLocaleString("fr-FR")} CFA
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
            <CardFooter className="border-t border-purple-200/60 bg-purple-50/30 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4 text-purple-700" />
                <span className="text-sm font-semibold">Total :</span>
                <span className="text-lg font-bold text-purple-800 tabular-nums">
                  {totalBrouillon.toLocaleString("fr-FR")} CFA
                </span>
              </div>
              <Button
                onClick={handleDemandeEchographie}
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
            <Card className="overflow-hidden border-purple-200/60 shadow-sm shadow-purple-100/30">
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
                    <TableRow className="bg-purple-50/60">
                      <TableHead className="text-purple-900">Échographie</TableHead>
                      <TableHead className="text-purple-900 w-28">Spécialité</TableHead>
                      <TableHead className="text-right text-purple-900 w-28">Prix</TableHead>
                      <TableHead className="w-12 print:hidden"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {demandesFiltrees.map((demande) => {
                      const echoType = getTypeEchographie(demande);
                      return (
                        <TableRow
                          key={demande.id}
                          className="group hover:bg-muted/30 transition-colors"
                        >
                          <TableCell className="font-medium">
                            {getNomEchographie(demande)}
                          </TableCell>
                          <TableCell>
                            {echoType && (
                              <Badge
                                variant="secondary"
                                className={`text-[11px] ${typeEchographieColors[echoType]}`}
                              >
                                {typeEchographieLabels[echoType]}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {getPrixEchographie(demande.idTarifEchographie).toLocaleString("fr-FR")} CFA
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
                                    Cette action est irréversible. L&apos;échographie
                                    sera définitivement supprimée.
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
                    <TableRow className="bg-purple-50/50 border-t-2 border-purple-300/40">
                      <TableCell
                        colSpan={2}
                        className="text-right text-sm font-bold"
                      >
                        Total :
                      </TableCell>
                      <TableCell className="text-right text-base font-bold text-purple-800 tabular-nums">
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
                    <span className="text-muted-foreground">Prescripteur :</span>
                    <span className="font-medium">
                      {demandesFiltrees.length > 0
                        ? getUserNameById(demandesFiltrees[0]?.idUser as string)
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
          <Card className="border-dashed border-2 border-purple-200/70">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-50 mb-4">
                <FileWarning className="h-8 w-8 text-purple-400" />
              </div>
              <p className="text-base font-semibold text-muted-foreground">
                Aucune demande pour cette visite
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
                Utilisez le bouton ci-dessus pour ajouter une échographie
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
              onClick={() => router.push(`/fiches/${demandeEchoId}`)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au dossier
            </Button>
          </div>
        )}

        {/* ===== MODAL ===== */}
        {selectedVisite && (
          <DemandeEchographieModal
            open={modalOpen}
            setOpen={setModalOpen}
            refreshDemandes={refreshDemandes}
            idClient={demandeEchoId}
            idVisite={selectedVisite}
            examensDisponibles={echographiesDisponiblesFiltrees}
            setDemandeEchographies={setDemandeEchographies}
            allEchographies={tabEchographies}
          />
        )}
      </div>
    </div>
  );
}
