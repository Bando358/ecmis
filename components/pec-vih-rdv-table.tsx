// components/pec-vih-rdv-table.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ClientDataPecVih,
  fetchClientsPecVihRDV,
} from "./rapportGestionVisite";
import { DialogGestionVisite, ReprogrammationData } from "./ui/dialogRdv";
import {
  TypeVisite,
  TypeActionGestionVisite,
  GestionVisite,
} from "@prisma/client";
import {
  createGestionVisite,
  deleteGestionVisite,
  getAllGestionVisiteByTabIdVisite,
} from "@/lib/actions/gestionVisiteActions";
import { toast } from "sonner";
import { SpinnerCustom } from "./ui/spinner";
import { exportToExcelRdv } from "@/lib/utils";
interface ActiviteOption {
  value: string;
  label: string;
  idLieu?: string;
  idActivite: string;
  libelleActivite?: string;
  lieu?: string;
  dateDebutLieu?: Date;
  dateFinLieu?: Date;
}

interface PecVihRdvTableProps {
  cliniques: { value: string; label: string }[];
  clinicIds: string[];
  activites: ActiviteOption[];
  dateDebut: Date;
  dateFin: Date;
}

export function PecVihRdvTable({
  cliniques,
  clinicIds,
  activites,
  dateDebut,
  dateFin,
}: PecVihRdvTableProps) {
  const [data, setData] = useState<ClientDataPecVih[]>([]);
  const [allGestionVisite, setAllGestionVisite] = useState<GestionVisite[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [reprogrammation, setReprogrammation] =
    useState<ReprogrammationData | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    telephone: false,
    clinique: false,
    pecVihCotrimo: false,
    pecVihTypeclient: false,
  });

  if (reprogrammation) {
    console.log("reprogrammation : ", reprogrammation);
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const activiteIds = activites.map((act) => act.value);
      try {
        const clients = await fetchClientsPecVihRDV(
          cliniques,
          clinicIds,
          activiteIds,
          dateDebut,
          dateFin
        );
        setData(clients);

        const allIdVisite = clients
          .map((client) => client.idVisite)
          .filter((id): id is string => id !== undefined);

        const gestionVisites = await getAllGestionVisiteByTabIdVisite(
          allIdVisite
        );
        setAllGestionVisite(
          gestionVisites.filter(
            (gv: { typeVisite: string }) => gv.typeVisite === TypeVisite.PEC_VIH
          ) as GestionVisite[]
        );
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
      } finally {
        setLoading(false);
      }
    };

    if (clinicIds.length > 0) {
      loadData();
    }
  }, [cliniques, clinicIds, dateDebut, dateFin, activites]);

  const columns: ColumnDef<ClientDataPecVih>[] = [
    {
      accessorKey: "nom",
      header: "Nom",
      cell: ({ row }) => (
        <div className="capitalize">{row.getValue("nom")}</div>
      ),
    },
    {
      accessorKey: "prenom",
      header: "Prénom",
      cell: ({ row }) => (
        <div className="capitalize">{row.getValue("prenom")}</div>
      ),
    },
    {
      accessorKey: "age",
      header: "Âge",
    },
    {
      accessorKey: "telephone",
      header: "Téléphone",
    },
    {
      accessorKey: "clinique",
      header: "Clinique",
    },
    {
      accessorKey: "dateVisite",
      header: "Date Visite",
    },
    {
      accessorKey: "pecVihTypeclient",
      header: "Type Client",
    },
    {
      accessorKey: "pecVihMoleculeArv",
      header: "Molecule ARV",
    },
    {
      accessorKey: "pecVihCotrimo",
      header: "Cotrimo",
      cell: ({ row }) => (row.getValue("pecVihCotrimo") ? "Oui" : "Non"),
    },
    {
      accessorKey: "pecRdv",
      header: "RDV PEC VIH",
      cell: ({ row }) => {
        const dateValue = row.getValue("pecRdv");
        return dateValue
          ? new Date(dateValue as string).toLocaleDateString()
          : "N/A";
      },
    },
    {
      accessorKey: "visiteSup",
      header: "Visite Sup",
      cell: ({ row }) => {
        const dateValueRdv = row.getValue("pecRdv");
        const dateValue = row.getValue("visiteSup");
        return dateValue &&
          new Date(dateValue as string).toLocaleDateString() >
            new Date(dateValueRdv as string).toLocaleDateString()
          ? new Date(dateValue as string).toLocaleDateString()
          : "N/A";
      },
    },
  ];

  const handleGestionVisite = async (data: ReprogrammationData) => {
    setIsSubmitting(true);
    try {
      if (!data || !data.idVisite) {
        console.warn(
          "handleGestionVisite: idVisite manquant dans ReprogrammationData",
          data
        );
        return;
      }

      const actionValue = ((data as { action?: string }).action ??
        (Object.values(
          TypeActionGestionVisite
        )[0] as TypeActionGestionVisite)) as TypeActionGestionVisite;

      const payload = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        idVisite: data.idVisite,
        typeVisite:
          (data as { typeVisite?: TypeVisite }).typeVisite ??
          TypeVisite.PEC_VIH,
        action: actionValue,
        dateAction: (data as { dateAction?: Date }).dateAction ?? new Date(),
        commentaire: (data as { commentaire?: string }).commentaire ?? null,
        prochaineDate: (data as { prochaineDate?: Date }).prochaineDate ?? null,
        createdAt: new Date(),
      };

      const dataGestion = await createGestionVisite(payload);
      setAllGestionVisite((prev) => [...prev, dataGestion]);
      if (dataGestion) {
        toast.success("Gestion de visite créée avec succès 🎉");
        setReprogrammation(null);
      }
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des données de gestion de visite:",
        error
      );
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    try {
      if (
        confirm("Êtes-vous sûr de vouloir supprimer cette gestion de visite ?")
      ) {
        await deleteGestionVisite({ id });
        setAllGestionVisite((prev) =>
          prev.filter((gestion) => gestion.id !== id)
        );
        toast.success("Gestion de visite supprimée avec succès 🎉");
      }
    } catch (error) {
      console.error(
        "Erreur lors de la suppression de la gestion de visite:",
        error
      );
    }
  };

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <SpinnerCustom className=" text-gray-300 size-8" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filtrer par nom..."
          value={(table.getColumn("nom")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("nom")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <div className="flex ml-auto space-x-2">
          <Button
            variant="outline"
            className="ml-2"
            onClick={() => {
              // Prepare a copy of data where ISO-date strings are converted to Date
              // objects so exportToExcelRdv can treat them as dates (and apply
              // date formatting). This fixes ISO strings like 2026-01-10T00:00:00.000Z
              // being exported literally.
              const exportData = data.map((row) => {
                const copy: Record<string, unknown> = { ...row } as Record<
                  string,
                  unknown
                >;

                const maybeIsoToDate = (v: unknown) => {
                  if (typeof v === "string") {
                    // quick ISO date check (YYYY-MM-DDTHH:mm:ss)
                    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
                      const d = new Date(v);
                      if (!isNaN(d.getTime())) return d;
                    }
                    // also accept date-only strings like YYYY-MM-DD
                    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
                      const d = new Date(v + "T00:00:00");
                      if (!isNaN(d.getTime())) return d;
                    }
                  }
                  return v;
                };

                // Convert known date fields
                copy["pecRdv"] = maybeIsoToDate(row.pecRdv as unknown);
                copy["visiteSup"] = maybeIsoToDate(row.visiteSup as unknown);

                return copy as ClientDataPecVih;
              });

              exportToExcelRdv({
                data: exportData,
                columns: columns.map((col) => {
                  // On force le typage partiel ici pour ignorer les colonnes calculées
                  const accessorKey =
                    (col as { accessorKey?: string }).accessorKey ?? "";
                  const header =
                    typeof col.header === "string" ? col.header : "Colonne";

                  return { accessorKey, header };
                }),
                gestionVisites: allGestionVisite,
                fileName: "rendez_vous_pec_vih",
              });
            }}
          >
            Exporter Excel
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Colonnes
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
                <TableHead className="font-semibold pl-4">Actions</TableHead>
                <TableHead className="font-semibold pl-4">Validé</TableHead>
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="mx-auto">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-block">
                          <DialogGestionVisite
                            idVisite={row.original.idVisite}
                            nomClient={`${row.original.prenom} ${row.original.nom}`}
                            typeVisite={TypeVisite.PEC_VIH}
                            telephoneClient={row.original.telephone as string}
                            setReprogrammation={(d) => setReprogrammation(d)}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Gérer la visite</p>
                        <div className="rounded-md border bg-white opacity-95">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="font-semibold pl-4">
                                  Date
                                </TableHead>
                                <TableHead className="font-semibold pl-4">
                                  Actions
                                </TableHead>
                                <TableHead className="font-semibold pl-4">
                                  Reprogrammée
                                </TableHead>
                                <TableHead className="font-semibold pl-4 text-center">
                                  🗑️
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {allGestionVisite
                                .filter(
                                  (gestion) =>
                                    gestion.idVisite === row.original.idVisite
                                )
                                .map((gestion) => (
                                  <TableRow
                                    key={gestion.id}
                                    className="text-black"
                                  >
                                    <TableCell className="pl-4">
                                      {gestion.createdAt.toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="pl-4">
                                      {gestion.action}
                                    </TableCell>
                                    <TableCell className="pl-4">
                                      {gestion.prochaineDate?.toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="pl-4">
                                      <Button
                                        size="sm"
                                        variant={"ghost"}
                                        className="hover:bg-red-900"
                                        onClick={() => handleDelete(gestion.id)}
                                      >
                                        🗑️
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="mx-auto text-center">
                    {row.original.idVisite &&
                    row.original.idVisite === reprogrammation?.idVisite ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            onClick={() => handleGestionVisite(reprogrammation)}
                            size="sm"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? <SpinnerCustom /> : "✅"}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Validé la reprogrammation</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" disabled>
                            ❌
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>En attente de gestion</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 2}
                  className="h-24 text-center"
                >
                  Aucun rendez-vous trouvé.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Suivant
        </Button>
      </div>
    </div>
  );
}
