"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft,
  AlertTriangle,
  Trash2,
  Users,
  Loader2,
  Database,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingPage } from "@/components/ui/loading";
import {
  getCliniquesForPurge,
  countClientsByClinique,
  purgeClientsByClinique,
} from "@/lib/actions/purgeActions";

const AUTHORIZED_EMAIL = "bando358@gmail.com";

const DEPENDENCIES = [
  { table: "Visite", description: "Visites médicales", mode: "cascade" },
  { table: "Constante", description: "Constantes (poids, taille, TA...)", mode: "cascade" },
  { table: "Planning", description: "Planning familial", mode: "cascade" },
  { table: "Gynecologie", description: "Fiches gynécologiques", mode: "cascade" },
  { table: "Ist", description: "Fiches IST", mode: "cascade" },
  { table: "Infertilite", description: "Fiches infertilité", mode: "manuel" },
  { table: "Vbg", description: "Violences basées sur le genre", mode: "manuel" },
  { table: "Medecine", description: "Médecine générale", mode: "manuel" },
  { table: "Grossesse", description: "Grossesses (+ Obstétrique, Accouchement, Saa, Cpon)", mode: "manuel" },
  { table: "TestGrossesse", description: "Tests de grossesse", mode: "cascade" },
  { table: "DepistageVih", description: "Dépistage VIH", mode: "cascade" },
  { table: "PecVih", description: "Prise en charge VIH", mode: "cascade" },
  { table: "ExamenPvVih", description: "Examens PV VIH", mode: "cascade" },
  { table: "Reference", description: "Fiches de référence", mode: "manuel" },
  { table: "ContreReference", description: "Fiches de contre-référence", mode: "manuel" },
  { table: "Ordonnance", description: "Ordonnances", mode: "manuel" },
  { table: "DemandeExamen", description: "Demandes d'examen (+ Factures, Commissions)", mode: "manuel" },
  { table: "ResultatExamen", description: "Résultats d'examen", mode: "manuel" },
  { table: "DemandeEchographie", description: "Demandes d'échographie (+ Factures, Commissions)", mode: "manuel" },
  { table: "ResultatEchographie", description: "Résultats d'échographie", mode: "manuel" },
  { table: "FacturePrestation", description: "Factures de prestation", mode: "manuel" },
  { table: "FactureProduit", description: "Factures de produits", mode: "manuel" },
  { table: "FactureExamen", description: "Factures d'examen", mode: "cascade" },
  { table: "FactureEchographie", description: "Factures d'échographie", mode: "cascade" },
  { table: "RecapVisite", description: "Récapitulatifs de visite", mode: "manuel" },
  { table: "Couverture", description: "Couvertures santé", mode: "cascade" },
  { table: "Bilan", description: "Bilans", mode: "cascade" },
  { table: "CommissionExamen", description: "Commissions examen", mode: "cascade" },
  { table: "CommissionEchographie", description: "Commissions échographie", mode: "cascade" },
] as const;

interface CliniqueOption {
  id: string;
  nomClinique: string;
  codeClinique: string;
}

export default function PurgeClientsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [cliniques, setCliniques] = useState<CliniqueOption[]>([]);
  const [selectedCliniqueId, setSelectedCliniqueId] = useState<string>("");
  const [clientCount, setClientCount] = useState<number | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [isPurging, setIsPurging] = useState(false);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const [isLoadingCliniques, setIsLoadingCliniques] = useState(true);

  const selectedClinique = cliniques.find((c) => c.id === selectedCliniqueId);
  const confirmationTarget = selectedClinique?.nomClinique ?? "";
  const isConfirmValid =
    confirmText.trim().toLowerCase() === confirmationTarget.trim().toLowerCase();

  // Vérification accès
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.email || session.user.email !== AUTHORIZED_EMAIL) {
      router.replace("/dashboard");
    }
  }, [session, status, router]);

  // Charger les cliniques
  useEffect(() => {
    if (status !== "authenticated" || session?.user?.email !== AUTHORIZED_EMAIL)
      return;

    getCliniquesForPurge()
      .then(setCliniques)
      .catch(() => toast.error("Erreur lors du chargement des cliniques"))
      .finally(() => setIsLoadingCliniques(false));
  }, [status, session]);

  // Charger le nombre de clients quand on sélectionne une clinique
  useEffect(() => {
    if (!selectedCliniqueId) {
      setClientCount(null);
      return;
    }

    setIsLoadingCount(true);
    countClientsByClinique(selectedCliniqueId)
      .then(setClientCount)
      .catch(() => toast.error("Erreur lors du comptage des clients"))
      .finally(() => setIsLoadingCount(false));
  }, [selectedCliniqueId]);

  const handlePurge = async () => {
    if (!selectedCliniqueId || !isConfirmValid) return;

    setIsPurging(true);
    try {
      const result = await purgeClientsByClinique(selectedCliniqueId);
      toast.success(result.message);
      setSelectedCliniqueId("");
      setClientCount(null);
      setConfirmText("");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erreur lors de la purge des clients"
      );
    } finally {
      setIsPurging(false);
    }
  };

  if (status === "loading" || isLoadingCliniques) {
    return <LoadingPage />;
  }

  if (session?.user?.email !== AUTHORIZED_EMAIL) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Purge des clients
          </h1>
          <p className="text-sm text-muted-foreground">
            Supprimer tous les clients d&apos;une clinique et leurs dépendances
          </p>
        </div>
      </div>

      {/* Avertissement */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Action irréversible.</strong> Cette opération supprime
          définitivement tous les clients de la clinique sélectionnée ainsi que
          toutes leurs données associées (visites, fiches, constantes, factures,
          examens, ordonnances, etc.).
        </AlertDescription>
      </Alert>

      {/* Tableau des dépendances */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-orange-500" />
            Données supprimées par client
          </CardTitle>
          <CardDescription>
            Liste complète des tables liées à chaque client qui seront purgées.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-72 overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 bg-background w-45">Table</TableHead>
                  <TableHead className="sticky top-0 bg-background">Description</TableHead>
                  <TableHead className="sticky top-0 bg-background w-30 text-center">Suppression</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DEPENDENCIES.map((dep) => (
                  <TableRow key={dep.table}>
                    <TableCell className="font-mono text-xs">{dep.table}</TableCell>
                    <TableCell className="text-sm">{dep.description}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={dep.mode === "manuel" ? "destructive" : "secondary"}
                        className="text-[10px]"
                      >
                        {dep.mode === "manuel" ? "Directe" : "Cascade"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            <strong>Directe</strong> = supprimée explicitement avant le client.{" "}
            <strong>Cascade</strong> = supprimée automatiquement par la base de données.{" "}
            Total : {DEPENDENCIES.length} tables affectées.
          </p>
        </CardContent>
      </Card>

      {/* Sélection clinique */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Sélection de la clinique
          </CardTitle>
          <CardDescription>
            Choisissez la clinique dont vous souhaitez purger les clients de
            test.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sélection clinique */}
          <div className="space-y-2">
            <Label>Clinique</Label>
            <Select
              value={selectedCliniqueId}
              onValueChange={(val) => {
                setSelectedCliniqueId(val);
                setConfirmText("");
              }}
              disabled={isPurging}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Sélectionner une clinique" />
              </SelectTrigger>
              <SelectContent>
                {cliniques.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nomClinique} ({c.codeClinique})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nombre de clients */}
          {selectedCliniqueId && (
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                {isLoadingCount ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      Comptage en cours...
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-2xl font-bold">
                      {clientCount ?? 0}
                    </span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      client(s) dans{" "}
                      <strong>{selectedClinique?.nomClinique}</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Zone de confirmation */}
          {selectedCliniqueId && clientCount !== null && clientCount > 0 && (
            <div className="space-y-3">
              <Label>
                Pour confirmer, tapez le nom de la clinique :{" "}
                <strong className="text-destructive">
                  {confirmationTarget}
                </strong>
              </Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`Tapez "${confirmationTarget}" pour confirmer`}
                className="max-w-md"
                disabled={isPurging}
              />

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={!isConfirmValid || isPurging}
                    className="mt-2"
                  >
                    {isPurging ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Suppression en cours...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Purger {clientCount} client(s)
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Confirmer la purge définitive
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Vous êtes sur le point de supprimer définitivement{" "}
                      <strong>{clientCount} client(s)</strong> de la clinique{" "}
                      <strong>{selectedClinique?.nomClinique}</strong> ainsi que
                      toutes leurs données associées. Cette action est
                      irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handlePurge}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Confirmer la suppression
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {/* Aucun client */}
          {selectedCliniqueId &&
            clientCount !== null &&
            clientCount === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun client dans cette clinique. Rien à purger.
              </p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
