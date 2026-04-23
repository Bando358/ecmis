"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Select from "react-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import {
  Building2,
  Loader2,
  Search,
  Table2,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { TableName, Clinique } from "@prisma/client";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import { getOneUser } from "@/lib/actions/authActions";
import {
  getGrilleTarifaire,
  GrilleTarifaireResult,
  GrilleTarifaireRow,
  TarifType,
} from "@/lib/actions/grilleTarifaireActions";
import ExcelJS from "exceljs";

type TypeOption = { value: TarifType; label: string };
type CliniqueOption = { value: string; label: string };

const TARIF_TYPE_OPTIONS: TypeOption[] = [
  { value: "produit", label: "Produit" },
  { value: "prestation", label: "Prestation" },
  { value: "examen", label: "Examen laboratoire" },
  { value: "echographie", label: "Échographie" },
];

export default function GrilleTarifaire() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { canRead, isLoading: isLoadingPermissions } = usePermissionContext();

  const [cliniques, setCliniques] = useState<Clinique[]>([]);
  const [selectedCliniques, setSelectedCliniques] = useState<CliniqueOption[]>(
    [],
  );
  const [selectedTypes, setSelectedTypes] = useState<TypeOption[]>([]);
  const [results, setResults] = useState<GrilleTarifaireResult[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const isAdmin = session?.user?.role === "ADMIN";
  const userId = session?.user?.id;

  const cliniqueOptions: CliniqueOption[] = useMemo(
    () =>
      cliniques.map((c) => ({
        value: c.id,
        label: c.nomClinique,
      })),
    [cliniques],
  );

  // Charger les cliniques accessibles à l'utilisateur
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      const [allCliniques, user] = await Promise.all([
        getAllClinique(),
        getOneUser(userId),
      ]);
      const filtered: Clinique[] = isAdmin
        ? allCliniques
        : allCliniques.filter((c: { id: string }) =>
            user?.idCliniques?.some((userClin: string) =>
              userClin.includes(c.id),
            ),
          );
      setCliniques(filtered);

      if (!isAdmin && filtered.length > 0) {
        setSelectedCliniques(
          filtered.map((c) => ({ value: c.id, label: c.nomClinique })),
        );
      }
    };
    fetchData();
  }, [userId, isAdmin]);

  const selectedCliniqueIds = useMemo(
    () => selectedCliniques.map((c) => c.value),
    [selectedCliniques],
  );

  const selectedCliniquesOrdered = useMemo(
    () =>
      cliniques
        .filter((c) => selectedCliniqueIds.includes(c.id))
        .sort((a, b) => a.nomClinique.localeCompare(b.nomClinique)),
    [cliniques, selectedCliniqueIds],
  );

  const filterRows = (rows: GrilleTarifaireRow[]) => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.itemLabel.toLowerCase().includes(q) ||
        (r.itemSublabel ?? "").toLowerCase().includes(q),
    );
  };

  const handleGenerate = async () => {
    if (selectedTypes.length === 0) {
      toast.error("Sélectionnez au moins un type de tarif");
      return;
    }
    if (selectedCliniqueIds.length === 0) {
      toast.error("Sélectionnez au moins une clinique");
      return;
    }
    setLoading(true);
    try {
      const data = await Promise.all(
        selectedTypes.map((t) =>
          getGrilleTarifaire(t.value, selectedCliniqueIds),
        ),
      );
      setResults(data);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du chargement de la grille tarifaire");
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (results.length === 0 || selectedCliniquesOrdered.length === 0) return;
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();

      results.forEach((res) => {
        const typeLabel =
          TARIF_TYPE_OPTIONS.find((t) => t.value === res.type)?.label ||
          res.type;
        const worksheet = workbook.addWorksheet(typeLabel.slice(0, 28));
        const headers = [
          typeLabel,
          "Catégorie",
          ...selectedCliniquesOrdered.map((c) => c.nomClinique),
        ];
        worksheet.addRow(headers);
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
        headerRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF2E75B6" },
        };
        headerRow.alignment = { horizontal: "center", vertical: "middle" };

        const rows = filterRows(res.rows);
        rows.forEach((row) => {
          const cells = [
            row.itemLabel,
            row.itemSublabel || "",
            ...selectedCliniquesOrdered.map((c) =>
              row.prix[c.id] != null ? row.prix[c.id] : "",
            ),
          ];
          worksheet.addRow(cells);
        });

        worksheet.columns.forEach((col, i) => {
          col.width = i < 2 ? 30 : 18;
        });

        worksheet.eachRow((row, rowIdx) => {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
            if (rowIdx > 1) {
              cell.alignment = { horizontal: "center", vertical: "middle" };
            }
          });
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Grille_Tarifaire_${new Date().toLocaleDateString(
        "fr-FR",
      )}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'export Excel");
    } finally {
      setExporting(false);
    }
  };

  if (isLoadingPermissions) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!canRead(TableName.TARIF_PRODUIT)) {
    toast.error(ERROR_MESSAGES.PERMISSION_DENIED_READ);
    router.back();
    return null;
  }

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-40">
        <Spinner show size="large" />
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 sm:p-6 w-full max-w-7xl mx-auto gap-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Table2 className="h-6 w-6 text-blue-600" />
          Grille Tarifaire
        </h1>
        <p className="text-sm text-muted-foreground">
          Visualisez et comparez les prix à travers vos cliniques.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paramètres</CardTitle>
          <CardDescription>
            Choisissez un ou plusieurs types de tarif et les cliniques à comparer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Type de tarif */}
          <div>
            <label className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              Type de tarif <span className="text-red-500">*</span>
            </label>
            <Select
              isMulti
              options={TARIF_TYPE_OPTIONS}
              classNamePrefix="select"
              placeholder="Sélectionner un ou plusieurs types de tarif"
              noOptionsMessage={() => "Aucun type disponible"}
              value={selectedTypes}
              onChange={(selected) =>
                setSelectedTypes(selected ? [...selected] : [])
              }
            />
          </div>

          {/* Cliniques */}
          {isAdmin || cliniques.length > 1 ? (
            <div>
              <label className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                Cliniques <span className="text-red-500">*</span>
              </label>
              <Select
                isMulti
                options={cliniqueOptions}
                classNamePrefix="select"
                placeholder="Sélectionner une ou plusieurs cliniques"
                noOptionsMessage={() => "Aucune clinique disponible"}
                value={selectedCliniques}
                onChange={(selected) =>
                  setSelectedCliniques(selected ? [...selected] : [])
                }
              />
            </div>
          ) : cliniques.length === 1 ? (
            <div>
              <label className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                Clinique
              </label>
              <Badge
                variant="secondary"
                className="text-sm font-medium px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
              >
                <Building2 className="h-3.5 w-3.5" />
                {cliniques[0].nomClinique}
              </Badge>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Génération...
                </>
              ) : (
                "Générer la grille"
              )}
            </Button>
            <Button
              onClick={handleExportExcel}
              disabled={
                exporting ||
                results.length === 0 ||
                selectedCliniquesOrdered.length === 0
              }
              className="bg-green-700 hover:bg-green-800 text-white"
              type="button"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {exporting ? "Export..." : "Exporter Excel"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recherche */}
      {results.length > 0 && (
        <div className="relative w-full sm:max-w-xs">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      )}

      {/* Tableaux par type */}
      {results.map((res) => {
        const typeLabel =
          TARIF_TYPE_OPTIONS.find((t) => t.value === res.type)?.label ||
          res.type;
        const filteredRows = filterRows(res.rows);
        return (
          <Card key={res.type}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {typeLabel} — {filteredRows.length} ligne(s)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader className="bg-slate-100 sticky top-0">
                    <TableRow>
                      <TableHead className="min-w-[200px]">
                        {typeLabel}
                      </TableHead>
                      <TableHead className="min-w-[140px]">Catégorie</TableHead>
                      {selectedCliniquesOrdered.map((c) => (
                        <TableHead
                          key={c.id}
                          className="text-center min-w-[120px]"
                        >
                          {c.nomClinique}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={2 + selectedCliniquesOrdered.length}
                          className="text-center text-muted-foreground py-6"
                        >
                          Aucun résultat
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRows.map((row) => (
                        <TableRow key={row.itemId}>
                          <TableCell className="font-medium">
                            {row.itemLabel}
                          </TableCell>
                          <TableCell>
                            {row.itemSublabel ? (
                              <Badge
                                variant="secondary"
                                className="text-xs font-normal"
                              >
                                {row.itemSublabel}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          {selectedCliniquesOrdered.map((c) => {
                            const prix = row.prix[c.id];
                            return (
                              <TableCell
                                key={c.id}
                                className="text-center tabular-nums"
                              >
                                {prix != null ? (
                                  prix.toLocaleString("fr-FR")
                                ) : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
