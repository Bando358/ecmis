"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Search,
  GitMerge,
  Eye,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  History,
  Loader2,
  RefreshCw,
  Users,
} from "lucide-react";

import { Clinique, TableName } from "@prisma/client";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import {
  detecterDoublons,
  comparerClients,
  fusionnerClients,
  compterRelationsClient,
  getHistoriqueFusions,
  type DoublonGroup,
  type ClientDoublon,
  type ConflictField,
  type FusionHistorique,
} from "@/lib/actions/fusionClientActions";
import { usePermissionContext } from "@/contexts/PermissionContext";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DoublonsPage() {
  const { data: session } = useSession();
  const { hasPermission, isLoading: permissionsLoading } =
    usePermissionContext();

  // State
  const [cliniques, setCliniques] = useState<Clinique[]>([]);
  const [selectedCliniques, setSelectedCliniques] = useState<string[]>([]);
  const [groups, setGroups] = useState<DoublonGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);

  // Compare dialog
  const [compareOpen, setCompareOpen] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [clientA, setClientA] = useState<ClientDoublon | null>(null);
  const [clientB, setClientB] = useState<ClientDoublon | null>(null);
  const [conflicts, setConflicts] = useState<ConflictField[]>([]);
  const [relCountA, setRelCountA] = useState(0);
  const [relCountB, setRelCountB] = useState(0);

  // Fusion dialog
  const [fusionOpen, setFusionOpen] = useState(false);
  const [fusionPrincipalId, setFusionPrincipalId] = useState<string>("");
  const [conflictResolutions, setConflictResolutions] = useState<
    Record<string, string>
  >({});
  const [fusing, setFusing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // History
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<FusionHistorique[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Expanded groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Load cliniques
  useEffect(() => {
    getAllClinique().then((data) => {
      setCliniques(data);
      setSelectedCliniques(data.map((c) => c.id));
    });
  }, []);

  // Permissions check
  const canRead = hasPermission(TableName.FUSION_CLIENT, "canRead");
  const canCreate = hasPermission(TableName.FUSION_CLIENT, "canCreate");

  // ─── Scan ────────────────────────────────────────────────────────────────

  const handleScan = useCallback(async () => {
    if (selectedCliniques.length === 0) {
      toast.error("Sélectionnez au moins une clinique.");
      return;
    }
    setLoading(true);
    setScanned(false);
    try {
      const result = await detecterDoublons(selectedCliniques);
      setGroups(result);
      setScanned(true);
      if (result.length === 0) {
        toast.success("Aucun doublon détecté.");
      } else {
        toast.info(`${result.length} groupe(s) de doublons détecté(s).`);
      }
    } catch (err) {
      toast.error(
        "Erreur lors de la détection : " +
          (err instanceof Error ? err.message : "Erreur inconnue"),
      );
    } finally {
      setLoading(false);
    }
  }, [selectedCliniques]);

  // ─── Compare ──────────────────────────────────────────────────────────────

  const handleCompare = useCallback(async (idA: string, idB: string) => {
    setComparing(true);
    setCompareOpen(true);
    try {
      const [comparison, countA, countB] = await Promise.all([
        comparerClients(idA, idB),
        compterRelationsClient(idA),
        compterRelationsClient(idB),
      ]);
      setClientA(comparison.clientA);
      setClientB(comparison.clientB);
      setConflicts(comparison.conflicts);
      setRelCountA(countA);
      setRelCountB(countB);
    } catch (err) {
      toast.error("Erreur lors de la comparaison.");
      setCompareOpen(false);
    } finally {
      setComparing(false);
    }
  }, []);

  // ─── Fusion flow ──────────────────────────────────────────────────────────

  const openFusionDialog = useCallback(() => {
    if (!clientA || !clientB) return;
    // Par défaut, le principal est celui avec le plus de relations
    setFusionPrincipalId(relCountA >= relCountB ? clientA.id : clientB.id);
    // Init conflict resolutions
    const resolutions: Record<string, string> = {};
    for (const c of conflicts) {
      // Par défaut garder la valeur du principal
      resolutions[c.field] = relCountA >= relCountB ? c.valueA : c.valueB;
    }
    setConflictResolutions(resolutions);
    setFusionOpen(true);
  }, [clientA, clientB, conflicts, relCountA, relCountB]);

  const handleFusion = useCallback(async () => {
    if (!clientA || !clientB) return;
    setFusing(true);
    try {
      const secondaireId =
        fusionPrincipalId === clientA.id ? clientB.id : clientA.id;
      const result = await fusionnerClients(
        fusionPrincipalId,
        secondaireId,
        conflictResolutions,
      );
      if (result.success) {
        toast.success(
          `Fusion terminee. ${result.relationsTransferees} relation(s) transferee(s).`,
        );
        // Remove the group from the list
        setGroups((prev) =>
          prev.filter(
            (g) =>
              !g.clients.some((c) => c.id === clientA.id) ||
              !g.clients.some((c) => c.id === clientB.id),
          ),
        );
        setFusionOpen(false);
        setCompareOpen(false);
        setConfirmOpen(false);
      }
    } catch (err) {
      toast.error(
        "Erreur lors de la fusion : " +
          (err instanceof Error ? err.message : "Erreur inconnue"),
      );
    } finally {
      setFusing(false);
    }
  }, [clientA, clientB, fusionPrincipalId, conflictResolutions]);

  // ─── History ──────────────────────────────────────────────────────────────

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryOpen(true);
    try {
      const data = await getHistoriqueFusions(1, 50);
      setHistory(data.fusions);
    } catch {
      toast.error("Erreur lors du chargement de l'historique.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // ─── Toggle group ─────────────────────────────────────────────────────────

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (permissionsLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-lg font-medium">Acces refuse</p>
          <p className="text-muted-foreground">
            Vous n&apos;avez pas la permission d&apos;acceder a cette page.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GitMerge className="h-6 w-6 text-primary" />
            Gestion des doublons
          </h1>
          <p className="text-muted-foreground mt-1">
            Detecter et fusionner les clients en double
          </p>
        </div>
        <Button variant="outline" onClick={loadHistory}>
          <History className="h-4 w-4 mr-2" />
          Historique
        </Button>
      </div>

      {/* Clinique filter + Scan */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Scanner les doublons</CardTitle>
          <CardDescription>
            Selectionnez les cliniques a scanner puis lancez la detection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select
              value={
                selectedCliniques.length === cliniques.length
                  ? "all"
                  : selectedCliniques.length === 1
                    ? selectedCliniques[0]
                    : "all"
              }
              onValueChange={(v) => {
                if (v === "all") {
                  setSelectedCliniques(cliniques.map((c) => c.id));
                } else {
                  setSelectedCliniques([v]);
                }
              }}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Cliniques" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  Toutes les cliniques ({cliniques.length})
                </SelectItem>
                {cliniques.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nomClinique}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleScan} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              {loading ? "Analyse en cours..." : "Scanner"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {scanned && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Resultats ({groups.length} groupe{groups.length > 1 ? "s" : ""})
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={handleScan}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Rafraichir
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Aucun doublon detecte</p>
              </div>
            ) : (
              <div className="space-y-3">
                {groups.map((group) => (
                  <GroupCard
                    key={group.key}
                    group={group}
                    expanded={expandedGroups.has(group.key)}
                    onToggle={() => toggleGroup(group.key)}
                    onCompare={handleCompare}
                    canCreate={canCreate}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Compare Dialog ─────────────────────────────────────────────── */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-3xl! max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Comparaison de clients
            </DialogTitle>
            <DialogDescription>
              Comparez les deux fiches cote a cote avant de fusionner
            </DialogDescription>
          </DialogHeader>

          {comparing ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : clientA && clientB ? (
            <div className="space-y-4">
              {/* Side-by-side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ClientCard
                  client={clientA}
                  relCount={relCountA}
                  label="Client A"
                />
                <ClientCard
                  client={clientB}
                  relCount={relCountB}
                  label="Client B"
                />
              </div>

              {/* Conflicts */}
              {conflicts.length > 0 && (
                <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                      <AlertTriangle className="h-4 w-4" />
                      {conflicts.length} conflit(s) detecte(s)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Champ</TableHead>
                          <TableHead>Client A</TableHead>
                          <TableHead>Client B</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {conflicts.map((c) => (
                          <TableRow key={c.field}>
                            <TableCell className="font-medium">
                              {c.label}
                            </TableCell>
                            <TableCell>
                              {c.valueA || (
                                <span className="text-muted-foreground italic">
                                  vide
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {c.valueB || (
                                <span className="text-muted-foreground italic">
                                  vide
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setCompareOpen(false)}>
                  Fermer
                </Button>
                {canCreate && (
                  <Button onClick={openFusionDialog}>
                    <GitMerge className="h-4 w-4 mr-2" />
                    Fusionner
                  </Button>
                )}
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ─── Fusion Dialog ──────────────────────────────────────────────── */}
      <Dialog open={fusionOpen} onOpenChange={setFusionOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitMerge className="h-5 w-5 text-primary" />
              Configuration de la fusion
            </DialogTitle>
            <DialogDescription>
              Choisissez le client principal et resolvez les conflits
            </DialogDescription>
          </DialogHeader>

          {clientA && clientB && (
            <div className="space-y-6">
              {/* Principal selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Client principal</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[clientA, clientB].map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => {
                        setFusionPrincipalId(client.id);
                        // Update conflict resolutions
                        const isA = client.id === clientA.id;
                        const newResolutions: Record<string, string> = {};
                        for (const c of conflicts) {
                          newResolutions[c.field] = isA ? c.valueA : c.valueB;
                        }
                        setConflictResolutions(newResolutions);
                      }}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        fusionPrincipalId === client.id
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-muted-foreground/30"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {fusionPrincipalId === client.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                        <span className="font-medium">
                          {client.nom} {client.prenom}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Code: {client.code} | {client.clinique.nomClinique}
                      </p>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Le client secondaire sera supprime apres le transfert de
                  toutes ses donnees vers le client principal.
                </p>
              </div>

              {/* Conflict resolution */}
              {conflicts.length > 0 && (
                <div className="space-y-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Resolution des conflits
                  </label>
                  {conflicts.map((c) => (
                    <div key={c.field} className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        {c.label}
                      </label>
                      <Select
                        value={conflictResolutions[c.field] ?? ""}
                        onValueChange={(v) =>
                          setConflictResolutions((prev) => ({
                            ...prev,
                            [c.field]: v,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {c.valueA && (
                            <SelectItem value={c.valueA}>
                              {c.valueA} (Client A)
                            </SelectItem>
                          )}
                          {c.valueB && c.valueB !== c.valueA && (
                            <SelectItem value={c.valueB}>
                              {c.valueB} (Client B)
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="font-medium">Principal :</span>{" "}
                      {fusionPrincipalId === clientA.id
                        ? `${clientA.nom} ${clientA.prenom}`
                        : `${clientB.nom} ${clientB.prenom}`}
                    </p>
                    <p className="flex items-center gap-1">
                      <span className="font-medium">Sera supprime :</span>{" "}
                      <span className="text-destructive">
                        {fusionPrincipalId === clientA.id
                          ? `${clientB.nom} ${clientB.prenom} (${clientB.code})`
                          : `${clientA.nom} ${clientA.prenom} (${clientA.code})`}
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              <DialogFooter>
                <Button variant="outline" onClick={() => setFusionOpen(false)}>
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setConfirmOpen(true)}
                  disabled={!fusionPrincipalId}
                >
                  <GitMerge className="h-4 w-4 mr-2" />
                  Fusionner
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Confirmation AlertDialog ───────────────────────────────────── */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmation de fusion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Etes-vous sur de vouloir fusionner ces clients ? Cette action est
              irreversible. Toutes les donnees du client secondaire seront
              transferees vers le client principal, puis le client secondaire
              sera definitivement supprime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={fusing}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFusion}
              disabled={fusing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {fusing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <GitMerge className="h-4 w-4 mr-2" />
              )}
              {fusing ? "Fusion en cours..." : "Confirmer la fusion"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── History Dialog ─────────────────────────────────────────────── */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historique des fusions
            </DialogTitle>
          </DialogHeader>

          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Aucune fusion enregistree.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client principal</TableHead>
                  <TableHead>Client fusionne</TableHead>
                  <TableHead>Relations</TableHead>
                  <TableHead>Par</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(h.dateFusion)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {h.clientPrincipalId.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {h.clientFusionneNom}{" "}
                      <span className="text-muted-foreground">
                        ({h.clientFusionneCode})
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {h.relationsTransferees}
                      </Badge>
                    </TableCell>
                    <TableCell>{h.utilisateurNom}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function GroupCard({
  group,
  expanded,
  onToggle,
  onCompare,
  canCreate,
}: {
  group: DoublonGroup;
  expanded: boolean;
  onToggle: () => void;
  onCompare: (idA: string, idB: string) => void;
  canCreate: boolean;
}) {
  const first = group.clients[0];
  const matchLabel =
    group.matchType === "exact" ? "Correspondance exacte" : "Similaire";

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <Badge
            variant={group.matchType === "exact" ? "destructive" : "secondary"}
          >
            {matchLabel}
          </Badge>
          <span className="font-medium">
            {first.nom} {first.prenom}
          </span>
          <span className="text-sm text-muted-foreground">
            ({group.clients.length} clients)
          </span>
          <div className="hidden sm:flex gap-1">
            {group.matchFields.map((f) => (
              <Badge key={f} variant="outline" className="text-xs">
                {f}
              </Badge>
            ))}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {expanded && (
        <div className="border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Prenom</TableHead>
                <TableHead className="hidden sm:table-cell">
                  Date naissance
                </TableHead>
                <TableHead className="hidden sm:table-cell">Tel</TableHead>
                <TableHead className="hidden md:table-cell">Clinique</TableHead>
                <TableHead className="hidden md:table-cell">Visites</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.clients.map((client, idx) => (
                <TableRow key={client.id}>
                  <TableCell className="font-mono text-xs">
                    {client.code}
                  </TableCell>
                  <TableCell className="font-medium">{client.nom}</TableCell>
                  <TableCell>{client.prenom}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {formatDate(client.dateNaissance)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {client.tel_1}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {client.clinique.nomClinique}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline">{client._count.Visite}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {idx > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onCompare(group.clients[0].id, client.id)
                        }
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Comparer
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function ClientCard({
  client,
  relCount,
  label,
}: {
  client: ClientDoublon;
  relCount: number;
  label: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{label}</span>
          <Badge variant="outline">{relCount} relation(s)</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Row label="Nom" value={client.nom} />
        <Row label="Prenom" value={client.prenom} />
        <Row label="Date naissance" value={formatDate(client.dateNaissance)} />
        <Row label="Code" value={client.code} />
        <Row label="Code VIH" value={client.codeVih ?? "-"} />
        <Row label="Tel 1" value={client.tel_1} />
        <Row label="Tel 2" value={client.tel_2 || "-"} />
        <Row label="Sexe" value={client.sexe} />
        <Row label="Profession" value={client.profession ?? "-"} />
        <Row label="Quartier" value={client.quartier ?? "-"} />
        <Row label="Etat matrimonial" value={client.etatMatrimonial ?? "-"} />
        <Row label="Statut" value={client.statusClient} />
        <Row label="Source" value={client.sourceInfo} />
        <Row label="Clinique" value={client.clinique.nomClinique} />
        <Row
          label="Enregistrement"
          value={formatDate(client.dateEnregistrement)}
        />
        <Row label="Visites" value={String(client._count.Visite)} />
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-dashed pb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
