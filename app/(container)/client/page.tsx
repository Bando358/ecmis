// /liste clients/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

import { Eye, FilePenLine, Trash2, Funnel, FunnelX, UserPlus, Users } from "lucide-react";

import { Client, Clinique, Permission, TableName, User } from "@prisma/client";
import { deleteClient, getAllClient } from "@/lib/actions/clientActions";
import { getAllClinique } from "@/lib/actions/cliniqueActions";

import { useClientContext } from "@/components/ClientContext";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { SearchInput, highlightSearchText } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import { getOneUser } from "@/lib/actions/authActions";
import { toast } from "sonner";

// ================= Utils =================

const calculateAge = (dateNaissance: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - dateNaissance.getFullYear();
  const monthDifference = today.getMonth() - dateNaissance.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < dateNaissance.getDate())
  ) {
    age--;
  }
  return age;
};

// ================= Skeleton Row =================

const SKELETON_WIDTHS = ["w-8", "w-24", "w-20", "w-12", "w-16", "w-20", "w-16", "w-14", "w-20"];

const TableRowSkeleton = () => (
  <TableRow>
    {SKELETON_WIDTHS.map((w, i) => (
      <TableCell key={i}>
        <Skeleton className={`h-5 ${w}`} />
      </TableCell>
    ))}
  </TableRow>
);

// ================= Cache sur window =================
// Persiste entre les navigations ET le HMR en dev
const CACHE_KEY = "__ecmis_client_cache";

type ClientCache = { clients: Client[]; cliniques: Clinique[] };

function getCache(): ClientCache | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any)[CACHE_KEY] ?? null;
}

function setCache(clients: Client[], cliniques: Clinique[]) {
  if (typeof window === "undefined") return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any)[CACHE_KEY] = { clients, cliniques };
}

// ================= Main Component =================

export default function Clients() {
  const cache = getCache();

  const [search, setSearch] = useState("");
  const [selectedAntennes, setSelectedAntennes] = useState<string[]>([]);
  const [spinner, setSpinner] = useState(false);
  const [clients, setClients] = useState<Client[]>(cache?.clients ?? []);
  const [utilisateur, setUtilisateur] = useState<User | null>(null);
  const [cliniques, setCliniques] = useState<Clinique[]>(cache?.cliniques ?? []);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [isLoading, setIsLoading] = useState(!cache);
  const [permission, setPermission] = useState<Permission | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);

  const router = useRouter();
  const { setSelectedClientId } = useClientContext();
  const { data: session } = useSession();
  const idUser = session?.user?.id || "";

  const nomCliniques = useCallback(
    (idClinique: string) => {
      const clinique = cliniques.find((p) => idClinique.includes(p.id));
      return clinique ? clinique.nomClinique : "";
    },
    [cliniques]
  );

  useEffect(() => {
    const fetUser = async () => {
      const user = await getOneUser(idUser);
      setUtilisateur(user);
    };
    fetUser();
  }, [idUser]);

  // Charger les permissions une seule fois
  useEffect(() => {
    if (!utilisateur || permission !== null) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(utilisateur.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.CLIENT
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
  }, [utilisateur, permission]);

  // Fetch data quand l'utilisateur est disponible.
  // Si le cache (window) existe, les donnees s'affichent instantanement
  // et le re-fetch se fait en arriere-plan (pas de skeleton).
  useEffect(() => {
    if (!utilisateur) return;

    let cancelled = false;

    const fetchData = async () => {
      // Skeleton seulement si aucun cache
      if (!getCache()) setIsLoading(true);

      try {
        const [cliniqueRes, clientRes] = await Promise.all([
          getAllClinique(),
          getAllClient(),
        ]);

        if (cancelled) return;

        setCliniques(cliniqueRes);

        const filtered = utilisateur.role !== "ADMIN"
          ? clientRes.filter((c: { idClinique: string }) =>
              utilisateur.idCliniques.includes(c.idClinique)
            )
          : clientRes;

        setClients(filtered);
        setCache(filtered, cliniqueRes);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();

    return () => { cancelled = true; };
  }, [utilisateur]);

  // Filtered data
  const filteredData = useMemo(() => {
    const searchLower = search.toLowerCase();

    return clients.filter((row) => {
      const matchesSearch = Object.values(row).some(
        (value) =>
          value != null && value.toString().toLowerCase().includes(searchLower)
      );

      const antenneName = nomCliniques(row.idClinique)?.toLowerCase();
      const matchesAntenne =
        selectedAntennes.length === 0 ||
        selectedAntennes.some(
          (antenne) => antenneName === antenne.toLowerCase()
        );

      return matchesSearch && matchesAntenne;
    });
  }, [clients, search, selectedAntennes, nomCliniques]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  const currentRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, currentPage, rowsPerPage]);

  // Handlers
  const handleDelete = async (id: string) => {
    if (!permission?.canDelete && utilisateur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de supprimer un client. Contactez un administrateur."
      );
      return;
    } else {
      await deleteClient(id);
      setClients((prev) => prev.filter((client) => client.id !== id));
      toast.error("Client supprimé avec succès");
    }
  };

  const handleUpdatedClient = (id: string) => {
    if (!permission?.canUpdate && utilisateur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de mettre à jour un client. Contactez un administrateur."
      );
      return;
    } else {
      router.push(`/formulaire-client/${id}`);
    }
  };

  const handleNewClient = () => {
    if (!permission?.canCreate && utilisateur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de créer un client. Contactez un administrateur."
      );
      return;
    } else {
      setSpinner(true);
      router.push("/formulaire-client");
    }
  };

  const toggleAntenne = (antenne: string) => {
    setSelectedAntennes((prev) =>
      prev.includes(antenne)
        ? prev.filter((a) => a !== antenne)
        : [...prev, antenne]
    );
  };

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedAntennes, rowsPerPage]);

  return (
    <div className="max-w-350 mx-auto p-2 sm:p-4 md:p-6">
      <AnimatePresence mode="wait">
        <motion.div
          key="clients-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            {/* ===== Card Header ===== */}
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Clients</CardTitle>
                <Badge variant="secondary" className="ml-2">
                  {filteredData.length} / {clients.length}
                </Badge>
              </div>
              <CardDescription>
                Gestion des dossiers clients
              </CardDescription>

              {/* Barre de recherche + filtre + bouton nouveau */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Rechercher un client..."
                  autoFocus
                  containerClassName="flex-1"
                />

                {/* Filtre antenne */}
                <Popover
                  open={openCombobox}
                  onOpenChange={setOpenCombobox}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      {selectedAntennes.length > 0 ? (
                        <FunnelX className="h-4 w-4 text-red-600" />
                      ) : (
                        <Funnel className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">
                        {selectedAntennes.length > 0
                          ? `${selectedAntennes.length} antenne(s)`
                          : "Antenne"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-50 p-0">
                    <Command>
                      <CommandInput placeholder="Rechercher une antenne..." />
                      <CommandEmpty>
                        Aucune antenne trouvée
                      </CommandEmpty>
                      <CommandGroup>
                        {cliniques.map((antenne) => (
                          <CommandItem
                            key={antenne.id}
                            onSelect={() =>
                              toggleAntenne(antenne.nomClinique)
                            }
                          >
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedAntennes.includes(
                                  antenne.nomClinique
                                )}
                                readOnly
                                className="mr-2 h-4 w-4"
                              />
                              {antenne.nomClinique}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>

                <Button
                  onClick={handleNewClient}
                  disabled={spinner}
                  size="sm"
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Nouveau Client</span>
                </Button>
              </div>
            </CardHeader>

            {/* ===== Card Content (Table) ===== */}
            <CardContent className="px-2 sm:px-6">
              <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-250 w-full text-left">
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
                        Ouvrir
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
                        Nom
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm font-medium text-muted-foreground max-w-25 p-2 whitespace-nowrap">
                        Prénom
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
                        Age
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
                        Code
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
                        Antenne
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
                        Tel 1
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
                        Code VIH
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRowSkeleton key={i} />
                      ))
                    ) : currentRows.length > 0 ? (
                      currentRows.map((row, index) => (
                        <TableRow
                          key={row.id}
                          className={`transition-colors hover:bg-muted/50 ${
                            index % 2 === 1 ? "bg-muted/20" : ""
                          }`}
                        >
                          <TableCell className="text-xs sm:text-sm">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                  <Link
                                    href={`/fiches/${row.id}`}
                                    prefetch={false}
                                    onClick={() => setSelectedClientId(row.id)}
                                  >
                                    <Eye className="h-4 w-4 text-blue-600" />
                                  </Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ouvrir le dossier</TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="capitalize text-xs sm:text-sm font-medium">
                            {highlightSearchText(row.nom, search)}
                          </TableCell>
                          <TableCell className="p-1 sm:p-2 text-xs sm:text-sm">
                            <div className="max-w-25 wrap-break-word whitespace-normal">
                              {highlightSearchText(row.prenom, search)}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {calculateAge(row.dateNaissance)}
                          </TableCell>
                          <TableCell className="uppercase text-xs sm:text-sm font-mono">
                            {highlightSearchText(row.code, search)}
                          </TableCell>
                          <TableCell className="uppercase text-xs sm:text-sm">
                            {nomCliniques(row.idClinique)}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {highlightSearchText(row.tel_1, search)}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {row.codeVih &&
                              highlightSearchText(row.codeVih, search)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleUpdatedClient(row.id)}
                                  >
                                    <FilePenLine className="h-4 w-4 text-amber-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Modifier</TooltipContent>
                              </Tooltip>

                              <AlertDialog>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Trash2 className="h-4 w-4 text-red-600" />
                                      </Button>
                                    </AlertDialogTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent>Supprimer</TooltipContent>
                                </Tooltip>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Êtes-vous absolument sûr ?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Cette action est irréversible. Le client{" "}
                                      <span className="font-bold">
                                        {row.nom} {row.prenom}
                                      </span>{" "}
                                      sera définitivement supprimé.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Annuler
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-red-600"
                                      onClick={() => handleDelete(row.id)}
                                    >
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9}>
                          {search.trim() ? (
                            <EmptyState
                              variant="search"
                              title="Aucun résultat"
                              description={`Aucun client trouvé pour "${search}"`}
                              actionLabel="Effacer la recherche"
                              onAction={() => setSearch("")}
                            />
                          ) : (
                            <EmptyState
                              variant="clients"
                              title="Aucun client"
                              description="Commencez par ajouter votre premier client."
                              actionLabel="Nouveau client"
                              onAction={handleNewClient}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>

            {/* ===== Card Footer (Pagination) ===== */}
            {!isLoading && currentRows.length > 0 && (
              <CardFooter className="flex flex-col items-center gap-2 border-t pt-4">
                <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-2 sm:gap-4">
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    Affichage de {currentRows.length} client(s) sur{" "}
                    {filteredData.length} au total
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                      Lignes par page:
                    </span>
                    <Select
                      value={rowsPerPage.toString()}
                      onValueChange={(value) => setRowsPerPage(Number(value))}
                    >
                      <SelectTrigger className="w-16 sm:w-20 h-8 text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="8">8</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Pagination>
                  <PaginationContent className="flex-wrap gap-1">
                    <PaginationItem>
                      <PaginationPrevious
                        className={`${
                          currentPage === 1
                            ? "text-muted-foreground/40 cursor-not-allowed"
                            : "cursor-pointer"
                        } text-xs sm:text-sm px-2 sm:px-3`}
                        onClick={() =>
                          currentPage > 1 && setCurrentPage(currentPage - 1)
                        }
                      />
                    </PaginationItem>

                    {currentPage > 2 && (
                      <>
                        <PaginationItem>
                          <PaginationLink
                            onClick={() => setCurrentPage(1)}
                            className="cursor-pointer text-xs sm:text-sm px-2 sm:px-3"
                          >
                            1
                          </PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationEllipsis className="text-xs sm:text-sm" />
                        </PaginationItem>
                      </>
                    )}

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (page) =>
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                      )
                      .map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={page === currentPage}
                            className="cursor-pointer text-xs sm:text-sm px-2 sm:px-3"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}

                    {currentPage < totalPages - 1 && (
                      <>
                        <PaginationItem>
                          <PaginationEllipsis className="text-xs sm:text-sm" />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink
                            onClick={() => setCurrentPage(totalPages)}
                            className="cursor-pointer text-xs sm:text-sm px-2 sm:px-3"
                          >
                            {totalPages}
                          </PaginationLink>
                        </PaginationItem>
                      </>
                    )}

                    <PaginationItem>
                      <PaginationNext
                        className={`${
                          currentPage === totalPages
                            ? "text-muted-foreground/40 cursor-not-allowed"
                            : "cursor-pointer"
                        } text-xs sm:text-sm px-2 sm:px-3`}
                        onClick={() =>
                          currentPage < totalPages &&
                          setCurrentPage(currentPage + 1)
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </CardFooter>
            )}
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
