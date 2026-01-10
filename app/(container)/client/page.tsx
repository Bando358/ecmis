// /liste clients/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

import { FolderOpen, FilePenLine, Trash2, Funnel, FunnelX } from "lucide-react";

import { Client, Clinique, Permission, TableName, User } from "@prisma/client";
import { deleteClient, getAllClient } from "@/lib/actions/clientActions";
import { getAllClinique } from "@/lib/actions/cliniqueActions";

import { useClientContext } from "@/components/ClientContext";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

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

const highlightText = (text: string, search: string): React.ReactNode => {
  if (!search.trim() || !text) return text;

  const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedSearch})`, "gi");

  return (
    <>
      {text.split(regex).map((part, index) =>
        regex.test(part) ? (
          <mark key={index} style={{ backgroundColor: "yellow" }}>
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

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

const TableRowSkeleton = () => (
  <TableRow className="animate-pulse max-w-225">
    {Array.from({ length: 8 }).map((_, i) => (
      <TableCell key={i}>
        <Skeleton className="h-6 w-20" />
      </TableCell>
    ))}
  </TableRow>
);

// ================= Main Component =================

export default function Clients() {
  const [search, setSearch] = useState("");
  const [selectedAntennes, setSelectedAntennes] = useState<string[]>([]);
  const [spinner, setSpinner] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [utilisateur, setUtilisateur] = useState<User | null>(null);
  const [cliniques, setCliniques] = useState<Clinique[]>([]);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<Permission | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

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

  // Fetch data - une seule fois au chargement initial
  useEffect(() => {
    const fetchData = async () => {
      if (!utilisateur || dataLoaded) return;

      setIsLoading(true);
      try {
        const [cliniqueRes, clientRes] = await Promise.all([
          getAllClinique(),
          getAllClient(),
        ]);

        setCliniques(cliniqueRes);

        if (utilisateur.role !== "ADMIN") {
          setClients(
            clientRes.filter((c: { idClinique: string }) =>
              utilisateur?.idCliniques.includes(c.idClinique)
            )
          );
        } else {
          setClients(clientRes);
        }

        setDataLoaded(true);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [utilisateur, dataLoaded]);

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
    <div className="space-y-4 max-w-350 mx-auto p-2 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between w-full items-stretch sm:items-center gap-3 sm:gap-4">
        <input
          type="text"
          placeholder="Recherche..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-stone-100 opacity-85 font-bold text-blue-900 outline-slate-500 w-full sm:w-4/12 sm:focus:w-8/12 duration-300 rounded-sm border-2 border-slate-400 text-base sm:text-xl py-2 sm:py-1 px-2"
          autoFocus
        />
        <Button
          onClick={handleNewClient}
          disabled={spinner}
          className="flex flex-row items-center justify-center w-full sm:w-auto text-sm sm:text-base py-2"
        >
          <Spinner
            show={spinner}
            size="small"
            className="text-white dark:text-slate-400"
          />
          <span>Nouveau Client</span>
        </Button>
      </div>

      {/* Table */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentPage}-${search}-${selectedAntennes.join(",")}`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="no-scrollbar">
            <CardContent className="no-scrollbar p-2 sm:p-4 md:p-6">
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <Table className="min-w-250 w-full text-left mt-2 sm:mt-5">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">
                          Ouvrir
                        </TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">
                          Nom
                        </TableHead>
                        <TableHead className="text-xs sm:text-sm max-w-25 p-2 break-normal whitespace-nowrap">
                          Prénom
                        </TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">
                          Age
                        </TableHead>
                        {/* <TableHead>Sexe</TableHead> */}
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">
                          Code
                        </TableHead>
                        <TableHead className="text-xs sm:text-sm">
                          <div className="flex items-center">
                            Antenne
                            <Popover
                              open={openCombobox}
                              onOpenChange={setOpenCombobox}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 sm:h-6 sm:w-6"
                                >
                                  {selectedAntennes.length > 0 ? (
                                    <FunnelX className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                                  ) : (
                                    <Funnel className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                                  )}
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
                          </div>
                        </TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">
                          Tel 1
                        </TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">
                          Code VIH
                        </TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody
                      className={`max-w-200 ${
                        isLoading ? "animate-pulse no-scrollbar max-w-200" : ""
                      }`}
                    >
                      {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <TableRowSkeleton key={i} />
                        ))
                      ) : currentRows.length > 0 ? (
                        <AnimatePresence mode="wait">
                          {currentRows.map((row) => (
                            <motion.tr
                              key={row.id}
                              initial={{ opacity: 0, y: 30 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -30 }}
                              transition={{ duration: 0.3 }}
                            >
                              <TableCell className="text-xs sm:text-sm">
                                <Link
                                  // target="_blank"
                                  href={`/fiches/${row.id}`}
                                  className="block -pr-1"
                                >
                                  <FolderOpen
                                    onClick={() => setSelectedClientId(row.id)}
                                    className="text-base sm:text-xl m-0.5 sm:m-1 duration-300 hover:scale-150 text-blue-600 cursor-pointer"
                                  />
                                </Link>
                              </TableCell>
                              <TableCell className="capitalize text-xs sm:text-sm">
                                {highlightText(row.nom, search)}
                              </TableCell>
                              <TableCell className="p-1 sm:p-2 text-xs sm:text-sm">
                                <div className="max-w-25 wrap-break-word whitespace-normal">
                                  {highlightText(row.prenom, search)}
                                </div>
                              </TableCell>

                              <TableCell className="text-xs sm:text-sm">
                                {calculateAge(row.dateNaissance)}
                              </TableCell>
                              {/* <TableCell>
                              {row.sexe === "Féminin"
                                ? highlightText("F", search)
                                : highlightText("M", search)}
                            </TableCell> */}
                              <TableCell className="uppercase text-xs sm:text-sm">
                                {highlightText(row.code, search)}
                              </TableCell>
                              <TableCell className="uppercase text-xs sm:text-sm">
                                {nomCliniques(row.idClinique)}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                {highlightText(row.tel_1, search)}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                {row.codeVih &&
                                  highlightText(row.codeVih, search)}
                              </TableCell>
                              <TableCell className="flex">
                                <FilePenLine
                                  onClick={() => handleUpdatedClient(row.id)}
                                  className="text-base sm:text-xl m-0.5 sm:m-1 duration-300 hover:scale-150 text-blue-600 cursor-pointer"
                                />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Trash2 className="text-base sm:text-xl m-0.5 sm:m-1 duration-300 hover:scale-150 active:scale-125 text-red-600 cursor-pointer" />
                                  </AlertDialogTrigger>
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
                              </TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={10}
                            className="text-center text-xs sm:text-sm py-6 sm:py-8"
                          >
                            <span>Aucun client trouvé</span>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Pagination */}
              <div className="flex flex-col items-center mt-3 sm:mt-4 gap-2">
                <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-2 sm:gap-4">
                  <div className="text-xs sm:text-sm text-gray-600">
                    Affichage de {currentRows.length} client(s) sur{" "}
                    {filteredData.length} au total
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
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
                            ? "text-gray-400 cursor-not-allowed"
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
                            ? "text-gray-400 cursor-not-allowed"
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
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
