"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { TarifProduit, Produit, Clinique, TableName } from "@prisma/client";
import { getAllTarifProduits } from "@/lib/actions/tarifProduitActions";
import { getAllProduits } from "@/lib/actions/produitActions";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import { getOneUser } from "@/lib/actions/authActions";
import {
  createVentesDirectesBatch,
  fetchVentesDirectes,
  deleteVenteDirecte,
} from "@/lib/actions/venteDirecteActions";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { SafeUser } from "@/types/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingCart,
  Trash2,
  ChevronsUpDown,
  Check,
  Package,
  Building2,
  Warehouse,
  Printer,
  Receipt,
  TrendingUp,
  Hash,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────

type CartItem = {
  idTarifProduit: string;
  nomProduit: string;
  prixUnitaire: number;
  quantite: number;
  stockDisponible: number;
  typeProduit: string;
};

type VenteDirecteRecord = {
  id: string;
  batchId: string;
  nomProduit: string;
  quantite: number;
  montantProduit: number;
  dateVente: Date;
  User: { name: string };
};

type BatchGroup = {
  batchId: string;
  dateVente: Date;
  vendeur: string;
  items: VenteDirecteRecord[];
  total: number;
};

// ─── Constantes ──────────────────────────────────────────────────────

const typeLabels: Record<string, { label: string; color: string }> = {
  CONTRACEPTIF: {
    label: "Contraceptif",
    color: "bg-pink-50 text-pink-700 border-pink-200",
  },
  MEDICAMENTS: {
    label: "Médicament",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  CONSOMMABLES: {
    label: "Consommable",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// ─── Composant ───────────────────────────────────────────────────────

export default function VenteDirectePage() {
  const [allTarifs, setAllTarifs] = useState<TarifProduit[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [cliniques, setCliniques] = useState<Clinique[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [ventesJour, setVentesJour] = useState<VenteDirecteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [user, setUser] = useState<SafeUser | null>(null);
  const [selectedClinique, setSelectedClinique] = useState<string>("");
  const [dateDebut, setDateDebut] = useState(todayStr());
  const [dateFin, setDateFin] = useState(todayStr());
  const [selectedBatch, setSelectedBatch] = useState<string>("");

  const { data: session, status } = useSession();
  const idUser = session?.user?.id ?? "";
  const { canCreate, canDelete, canRead, isLoading: isLoadingPermissions } =
    usePermissionContext();

  // ─── Effets ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!idUser) return;
    getOneUser(idUser).then((u) => setUser(u!));
  }, [idUser]);

  const cliniquesAccessibles = useMemo(() => {
    if (!user) return [];
    if (user.role === "ADMIN") return cliniques;
    return cliniques.filter((c) => user.idCliniques?.includes(c.id));
  }, [user, cliniques]);

  useEffect(() => {
    if (cliniquesAccessibles.length === 1 && !selectedClinique) {
      setSelectedClinique(cliniquesAccessibles[0].id);
    }
  }, [cliniquesAccessibles, selectedClinique]);

  useEffect(() => {
    if (status === "loading") return;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [tarifsData, produitsData, cliniquesData] = await Promise.all([
          getAllTarifProduits(),
          getAllProduits(),
          getAllClinique(),
        ]);
        setAllTarifs(tarifsData);
        setProduits(produitsData);
        setCliniques(cliniquesData);
      } catch {
        toast.error("Erreur lors du chargement des données");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [status]);

  useEffect(() => {
    if (!selectedClinique) {
      setVentesJour([]);
      return;
    }
    const from = new Date(dateDebut);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateFin);
    to.setHours(23, 59, 59, 999);
    fetchVentesDirectes([selectedClinique], from, to)
      .then((data) => setVentesJour(data as unknown as VenteDirecteRecord[]))
      .catch(() => setVentesJour([]));
  }, [selectedClinique, dateDebut, dateFin]);

  useEffect(() => {
    setCart([]);
  }, [selectedClinique]);

  // ─── Mémos ─────────────────────────────────────────────────────────

  const tarifs = useMemo(() => {
    if (!selectedClinique) return [];
    return allTarifs.filter((t) => t.idClinique === selectedClinique);
  }, [allTarifs, selectedClinique]);

  const produitsDisponibles = useMemo(() => {
    const cartIds = new Set(cart.map((c) => c.idTarifProduit));
    return tarifs
      .filter((t) => t.quantiteStock > 0 && !cartIds.has(t.id))
      .map((t) => {
        const produit = produits.find((p) => p.id === t.idProduit);
        return {
          ...t,
          nomProduit: produit?.nomProduit ?? "Produit inconnu",
          typeProduit: produit?.typeProduit ?? "",
        };
      })
      .sort((a, b) => a.nomProduit.localeCompare(b.nomProduit));
  }, [tarifs, produits, cart]);

  const totalPanier = useMemo(
    () => cart.reduce((sum, item) => sum + item.prixUnitaire * item.quantite, 0),
    [cart]
  );

  const batches = useMemo(() => {
    const map = new Map<string, BatchGroup>();
    for (const v of ventesJour) {
      const key = v.batchId || v.id;
      const existing = map.get(key);
      if (existing) {
        existing.items.push(v);
        existing.total += v.montantProduit;
      } else {
        map.set(key, {
          batchId: key,
          dateVente: v.dateVente,
          vendeur: v.User?.name ?? "-",
          items: [v],
          total: v.montantProduit,
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.dateVente).getTime() - new Date(a.dateVente).getTime()
    );
  }, [ventesJour]);

  const currentBatch = useMemo(
    () => batches.find((b) => b.batchId === selectedBatch) ?? null,
    [batches, selectedBatch]
  );

  const totalVentesJour = ventesJour.reduce((s, v) => s + v.montantProduit, 0);
  const totalQteVendues = ventesJour.reduce((s, v) => s + v.quantite, 0);

  // ─── Actions ───────────────────────────────────────────────────────

  const refreshData = useCallback(async () => {
    const from = new Date(dateDebut);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateFin);
    to.setHours(23, 59, 59, 999);
    const [tarifsData, ventesData] = await Promise.all([
      getAllTarifProduits(),
      fetchVentesDirectes([selectedClinique], from, to),
    ]);
    setAllTarifs(tarifsData);
    setVentesJour(ventesData as unknown as VenteDirecteRecord[]);
  }, [dateDebut, dateFin, selectedClinique]);

  const addToCart = (idTarifProduit: string) => {
    const tarif = tarifs.find((t) => t.id === idTarifProduit);
    const produit = produits.find((p) => p.id === tarif?.idProduit);
    if (!tarif || !produit) return;
    setCart((prev) => [
      ...prev,
      {
        idTarifProduit: tarif.id,
        nomProduit: produit.nomProduit,
        prixUnitaire: tarif.prixUnitaire,
        quantite: 1,
        stockDisponible: tarif.quantiteStock,
        typeProduit: produit.typeProduit,
      },
    ]);
    setOpenCombobox(false);
  };

  const updateQuantite = (idTarifProduit: string, quantite: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.idTarifProduit === idTarifProduit
          ? { ...item, quantite: Math.max(1, Math.min(quantite, item.stockDisponible)) }
          : item
      )
    );
  };

  const removeFromCart = (idTarifProduit: string) => {
    setCart((prev) => prev.filter((item) => item.idTarifProduit !== idTarifProduit));
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return toast.error("Le panier est vide");
    if (!selectedClinique || !idUser) return toast.error("Veuillez sélectionner une clinique");

    setIsSubmitting(true);
    try {
      const lignes = cart.map((item) => ({
        idTarifProduit: item.idTarifProduit,
        nomProduit: item.nomProduit,
        quantite: item.quantite,
        montantProduit: item.prixUnitaire * item.quantite,
        methode: false,
        idClinique: selectedClinique,
        idUser,
      }));

      await createVentesDirectesBatch(lignes);
      printRecu({
        items: cart.map((i) => ({
          nomProduit: i.nomProduit,
          quantite: i.quantite,
          prixUnitaire: i.prixUnitaire,
          sousTotal: i.prixUnitaire * i.quantite,
        })),
        total: totalPanier,
      });
      toast.success(
        `Vente enregistrée : ${cart.length} produit(s) — ${totalPanier.toLocaleString("fr-FR")} FCFA`
      );
      setCart([]);
      await refreshData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'enregistrement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVente = async (id: string) => {
    if (!confirm("Annuler cette vente ? Le stock sera restauré.")) return;
    try {
      await deleteVenteDirecte(id);
      toast.success("Vente annulée, stock restauré");
      await refreshData();
    } catch {
      toast.error("Erreur lors de l'annulation");
    }
  };

  // ─── Impression ────────────────────────────────────────────────────

  const printRecu = (opts: {
    items: { nomProduit: string; quantite: number; prixUnitaire: number; sousTotal: number }[];
    total: number;
    dateVente?: Date;
    vendeur?: string;
  }) => {
    const d = opts.dateVente ? new Date(opts.dateVente) : new Date();
    const dateStr = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const heureStr = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const clinique = cliniques.find((c) => c.id === selectedClinique);
    const cliniqueName = clinique?.nomClinique ?? "";
    const vendeur = opts.vendeur ?? user?.name ?? session?.user?.name ?? "-";

    const lignesHtml = opts.items
      .map(
        (item) => `
      <div style="margin: 4px 0;">
        <div class="bold">${item.nomProduit}</div>
        <div class="row">
          <span>${item.quantite} x ${item.prixUnitaire.toLocaleString("fr-FR")}</span>
          <span>${item.sousTotal.toLocaleString("fr-FR")} FCFA</span>
        </div>
      </div>`
      )
      .join("");

    const w = window.open("", "_blank", "width=350,height=600");
    if (!w) return;
    w.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Reçu de vente</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; width: 280px; margin: 0 auto; padding: 10px; font-size: 12px; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .line { border-top: 1px dashed #000; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; margin: 3px 0; }
  .header { margin-bottom: 10px; }
  .header h2 { font-size: 14px; margin-bottom: 2px; }
  .header img { width: 80%; max-width: 220px; height: auto; margin-bottom: 6px; }
  .footer { margin-top: 12px; font-size: 10px; }
  @media print {
    @page { margin: 0; size: 80mm auto; }
    body { width: 100%; padding: 5px; }
  }
</style></head>
<body>
  <div class="header center">
    <img src="/LOGO_AIBEF_IPPF.png" alt="Logo AIBEF IPPF" />
    <h2 class="bold">${cliniqueName}</h2>
    <p>REÇU DE VENTE</p>
  </div>
  <div class="line"></div>
  <div class="row"><span>Date:</span><span>${dateStr}</span></div>
  <div class="row"><span>Heure:</span><span>${heureStr}</span></div>
  <div class="row"><span>Vendeur:</span><span>${vendeur}</span></div>
  <div class="row"><span>Articles:</span><span>${opts.items.length} produit(s)</span></div>
  <div class="line"></div>
  <div class="row bold"><span>Désignation</span><span>Montant</span></div>
  <div class="line"></div>
  ${lignesHtml}
  <div class="line"></div>
  <div class="row bold" style="font-size: 14px; margin: 6px 0;">
    <span>TOTAL</span>
    <span>${opts.total.toLocaleString("fr-FR")} FCFA</span>
  </div>
  <div class="line"></div>
  <div class="footer center">
    <p>Merci pour votre achat !</p>
    <p>${cliniqueName}</p>
  </div>
</body></html>`);
    w.document.close();
    w.onload = () => {
      w.focus();
      w.print();
      w.onafterprint = () => w.close();
    };
  };

  // ─── États de chargement / permission ──────────────────────────────

  if (status === "loading" || isLoadingPermissions || isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!canRead(TableName.VENTE_DIRECTE)) {
    return (
      <div className="p-6 text-center text-red-500">
        Vous n&apos;avez pas la permission d&apos;accéder à cette page.
      </div>
    );
  }

  // ─── Rendu ─────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            Vente Directe
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Point de vente rapide sans enregistrement client
          </p>
        </div>

        {cliniquesAccessibles.length > 1 ? (
          <Select value={selectedClinique} onValueChange={setSelectedClinique}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Sélectionner une clinique" />
            </SelectTrigger>
            <SelectContent>
              {cliniquesAccessibles.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nomClinique}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : cliniquesAccessibles.length === 1 ? (
          <Badge variant="outline" className="text-sm px-3 py-1.5 gap-1.5 border-primary/30 text-primary">
            <Building2 className="h-3.5 w-3.5" />
            {cliniquesAccessibles[0].nomClinique}
          </Badge>
        ) : null}
      </div>

      {/* ── Pas de clinique sélectionnée ── */}
      {!selectedClinique ? (
        <Card className="border-dashed">
          <CardContent className="py-20">
            <div className="text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <Warehouse className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold mb-1">Sélectionnez une clinique</h2>
              <p className="text-muted-foreground text-sm">
                Choisissez une clinique pour commencer
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Stats rapides ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Chiffre du jour</p>
                    <p className="text-xl font-bold">{totalVentesJour.toLocaleString("fr-FR")} <span className="text-sm font-normal text-muted-foreground">FCFA</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Receipt className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Paniers validés</p>
                    <p className="text-xl font-bold">{batches.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    <Hash className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Produits vendus</p>
                    <p className="text-xl font-bold">{totalQteVendues}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Filtre période ── */}
          <div className="flex items-center gap-3 flex-wrap">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">Période :</span>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-muted-foreground">Du</label>
              <Input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-36 h-9"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-muted-foreground">Au</label>
              <Input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="w-36 h-9"
              />
            </div>
          </div>

          {/* ── Onglets ── */}
          <Tabs defaultValue="vente" className="space-y-4">
            <TabsList>
              <TabsTrigger value="vente" className="gap-1.5">
                <ShoppingCart className="h-4 w-4" />
                Nouvelle vente
              </TabsTrigger>
              <TabsTrigger value="historique" className="gap-1.5">
                <CalendarDays className="h-4 w-4" />
                Historique
              </TabsTrigger>
              <TabsTrigger value="reimpression" className="gap-1.5">
                <Printer className="h-4 w-4" />
                Réimprimer
              </TabsTrigger>
            </TabsList>

            {/* ════════════ ONGLET NOUVELLE VENTE ════════════ */}
            <TabsContent value="vente" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Colonne gauche : recherche + panier */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Recherche produit */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Ajouter un produit</CardTitle>
                      <CardDescription>Recherchez et ajoutez des produits au panier</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCombobox}
                            className="w-full justify-between h-11"
                            disabled={!canCreate(TableName.VENTE_DIRECTE)}
                          >
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <Package className="h-4 w-4" />
                              Rechercher un produit...
                            </span>
                            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Nom du produit..." />
                            <CommandList>
                              <CommandEmpty>Aucun produit trouvé.</CommandEmpty>
                              <CommandGroup>
                                {produitsDisponibles.map((p) => (
                                  <CommandItem
                                    key={p.id}
                                    value={p.nomProduit}
                                    onSelect={() => addToCart(p.id)}
                                  >
                                    <Package className="mr-2 h-4 w-4 text-muted-foreground" />
                                    <span className="flex-1">{p.nomProduit}</span>
                                    <Badge
                                      variant="outline"
                                      className={cn("ml-2 text-xs", typeLabels[p.typeProduit]?.color)}
                                    >
                                      {typeLabels[p.typeProduit]?.label ?? p.typeProduit}
                                    </Badge>
                                    <span className="ml-2 text-muted-foreground text-xs tabular-nums">
                                      Stock: {p.quantiteStock}
                                    </span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </CardContent>
                  </Card>

                  {/* Panier */}
                  <Card className={cn(cart.length === 0 && "border-dashed")}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        Panier
                        {cart.length > 0 && (
                          <Badge variant="secondary" className="ml-1">
                            {cart.length} article{cart.length > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className={cart.length > 0 ? "p-0" : undefined}>
                      {cart.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          Ajoutez des produits pour commencer
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Produit</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead className="text-right">PU</TableHead>
                              <TableHead className="w-24 text-center">Qté</TableHead>
                              <TableHead className="text-right">Sous-total</TableHead>
                              <TableHead className="w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cart.map((item) => (
                              <TableRow key={item.idTarifProduit}>
                                <TableCell className="font-medium">{item.nomProduit}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={cn("text-xs", typeLabels[item.typeProduit]?.color)}
                                  >
                                    {typeLabels[item.typeProduit]?.label ?? item.typeProduit}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {item.prixUnitaire.toLocaleString("fr-FR")}
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={item.stockDisponible}
                                    value={item.quantite}
                                    onChange={(e) =>
                                      updateQuantite(item.idTarifProduit, parseInt(e.target.value) || 1)
                                    }
                                    className="w-16 text-center mx-auto h-8"
                                  />
                                </TableCell>
                                <TableCell className="text-right font-semibold tabular-nums">
                                  {(item.prixUnitaire * item.quantite).toLocaleString("fr-FR")}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => removeFromCart(item.idTarifProduit)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                          <TableFooter>
                            <TableRow>
                              <TableCell colSpan={4} className="text-right font-bold">
                                TOTAL
                              </TableCell>
                              <TableCell className="text-right font-bold text-base tabular-nums">
                                {totalPanier.toLocaleString("fr-FR")} FCFA
                              </TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          </TableFooter>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Colonne droite : résumé + validation */}
                <div>
                  <Card className="sticky top-4">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Résumé de la vente</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Articles</span>
                          <span className="font-medium">{cart.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Quantité totale</span>
                          <span className="font-medium">{cart.reduce((s, i) => s + i.quantite, 0)}</span>
                        </div>
                      </div>
                      <div className="border-t pt-3">
                        <div className="flex justify-between items-baseline">
                          <span className="font-bold text-base">Total</span>
                          <span className="font-bold text-xl tabular-nums">
                            {totalPanier.toLocaleString("fr-FR")} <span className="text-sm font-normal">FCFA</span>
                          </span>
                        </div>
                      </div>
                      <Button
                        className="w-full mt-2"
                        size="lg"
                        onClick={handleSubmit}
                        disabled={isSubmitting || cart.length === 0 || !canCreate(TableName.VENTE_DIRECTE)}
                      >
                        {isSubmitting ? (
                          <Spinner />
                        ) : (
                          <>
                            <Check className="mr-2 h-5 w-5" />
                            Valider la vente
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* ════════════ ONGLET HISTORIQUE ════════════ */}
            <TabsContent value="historique">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Historique des ventes</CardTitle>
                  <CardDescription>Détail des ventes sur la période sélectionnée</CardDescription>
                </CardHeader>
                {ventesJour.length > 0 ? (
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date / Heure</TableHead>
                          <TableHead>Produit</TableHead>
                          <TableHead className="text-center">Qté</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                          <TableHead>Vendeur</TableHead>
                          {canDelete(TableName.VENTE_DIRECTE) && (
                            <TableHead className="w-10"></TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ventesJour.map((vente) => (
                          <TableRow key={vente.id}>
                            <TableCell className="text-muted-foreground text-sm tabular-nums">
                              {formatDate(vente.dateVente)}
                            </TableCell>
                            <TableCell className="font-medium">{vente.nomProduit}</TableCell>
                            <TableCell className="text-center tabular-nums">{vente.quantite}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {vente.montantProduit.toLocaleString("fr-FR")} FCFA
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {vente.User?.name ?? "-"}
                            </TableCell>
                            {canDelete(TableName.VENTE_DIRECTE) && (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleDeleteVente(vente.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={3} className="text-right font-bold">
                            Total
                          </TableCell>
                          <TableCell className="text-right font-bold tabular-nums">
                            {totalVentesJour.toLocaleString("fr-FR")} FCFA
                          </TableCell>
                          <TableCell colSpan={canDelete(TableName.VENTE_DIRECTE) ? 2 : 1}></TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </CardContent>
                ) : (
                  <CardContent>
                    <div className="text-center py-12 text-muted-foreground">
                      <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Aucune vente sur cette période.</p>
                    </div>
                  </CardContent>
                )}
              </Card>
            </TabsContent>

            {/* ════════════ ONGLET RÉIMPRESSION ════════════ */}
            <TabsContent value="reimpression">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <CardTitle className="text-base">Réimprimer un reçu</CardTitle>
                      <CardDescription>Sélectionnez un panier validé pour le réimprimer</CardDescription>
                    </div>
                    <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                      <SelectTrigger className="w-80">
                        <SelectValue placeholder="Choisir un panier..." />
                      </SelectTrigger>
                      <SelectContent>
                        {batches.map((b) => (
                          <SelectItem key={b.batchId} value={b.batchId}>
                            {formatDate(b.dateVente)} — {b.items.length} art. — {b.total.toLocaleString("fr-FR")} FCFA
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                {currentBatch ? (
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produit</TableHead>
                            <TableHead className="text-center">Qté</TableHead>
                            <TableHead className="text-right">PU</TableHead>
                            <TableHead className="text-right">Montant</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentBatch.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.nomProduit}</TableCell>
                              <TableCell className="text-center tabular-nums">{item.quantite}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {Math.round(item.montantProduit / item.quantite).toLocaleString("fr-FR")}
                              </TableCell>
                              <TableCell className="text-right tabular-nums font-semibold">
                                {item.montantProduit.toLocaleString("fr-FR")} FCFA
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableFooter>
                          <TableRow>
                            <TableCell colSpan={3} className="text-right font-bold">Total</TableCell>
                            <TableCell className="text-right font-bold tabular-nums">
                              {currentBatch.total.toLocaleString("fr-FR")} FCFA
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Vendeur : {currentBatch.vendeur}</span>
                      <span>{formatDate(currentBatch.dateVente)}</span>
                    </div>
                    <Button
                      className="w-full sm:w-auto"
                      onClick={() =>
                        printRecu({
                          items: currentBatch.items.map((i) => ({
                            nomProduit: i.nomProduit,
                            quantite: i.quantite,
                            prixUnitaire: Math.round(i.montantProduit / i.quantite),
                            sousTotal: i.montantProduit,
                          })),
                          total: currentBatch.total,
                          dateVente: currentBatch.dateVente,
                          vendeur: currentBatch.vendeur,
                        })
                      }
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Imprimer le reçu
                    </Button>
                  </CardContent>
                ) : (
                  <CardContent>
                    <div className="text-center py-12 text-muted-foreground">
                      <Printer className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">
                        {batches.length === 0
                          ? "Aucun panier validé sur cette période."
                          : "Sélectionnez un panier pour voir le détail."}
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
