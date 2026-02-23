"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  FileText,
  Plus,
  Pencil,
  Trash2,
  Download,
  Loader2,
} from "lucide-react";
import { AuditAction, JournalPharmacy } from "@prisma/client";
import { fetchJournalEntries, fetchFacturesForExport } from "@/lib/actions/journalPharmacyActions";
import ExcelJS from "exceljs";

const ENTITY_TYPES = [
  { value: "FactureProduit", label: "Vente produit" },
  { value: "FacturePrestation", label: "Facturation prestation" },
  { value: "FactureExamen", label: "Facturation examen" },
  { value: "FactureEchographie", label: "Facturation echographie" },
  { value: "BatchFacturation", label: "Facturation batch" },
  { value: "TarifProduit", label: "Tarif/Stock produit" },
  { value: "Produit", label: "Produit" },
  { value: "Inventaire", label: "Inventaire" },
  { value: "DetailInventaire", label: "Detail inventaire" },
  { value: "AnomalieInventaire", label: "Anomalie inventaire" },
  { value: "CommandeFournisseur", label: "Commande fournisseur" },
  { value: "DetailCommande", label: "Detail commande" },
];

const ACTION_COLORS: Record<AuditAction, string> = {
  CREATION: "bg-green-100 text-green-800",
  MODIFICATION: "bg-blue-100 text-blue-800",
  SUPPRESSION: "bg-red-100 text-red-800",
};

const ACTION_ICONS: Record<AuditAction, React.ReactNode> = {
  CREATION: <Plus className="h-3 w-3" />,
  MODIFICATION: <Pencil className="h-3 w-3" />,
  SUPPRESSION: <Trash2 className="h-3 w-3" />,
};

interface JournalPharmacyClientProps {
  initialLogs: JournalPharmacy[];
  initialTotal: number;
  initialPage: number;
  initialTotalPages: number;
  tabClinique: { id: string; nomClinique: string }[];
  stats: {
    totalLogs: number;
    todayLogs: number;
    actionCounts: { action: AuditAction; _count: number }[];
  };
}

export default function JournalPharmacyClient({
  initialLogs,
  initialTotal,
  initialPage,
  initialTotalPages,
  tabClinique,
  stats,
}: JournalPharmacyClientProps) {
  const [logs, setLogs] = useState(initialLogs);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [loading, setLoading] = useState(false);

  // Filtres
  const [selectedClinique, setSelectedClinique] = useState("all");
  const [selectedEntite, setSelectedEntite] = useState("all");
  const [selectedAction, setSelectedAction] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  // Dialog
  const [selectedLog, setSelectedLog] = useState<JournalPharmacy | null>(null);
  const [exporting, setExporting] = useState(false);

  // ===== Export Excel 8 feuilles =====
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const data = await fetchFacturesForExport({
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo + "T23:59:59") : undefined,
        idClinique: selectedClinique !== "all" ? selectedClinique : undefined,
      });

      const wb = new ExcelJS.Workbook();

      const fmtDate = (d: Date | string) =>
        new Date(d).toLocaleString("fr-FR", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        });

      const styleHeader = (ws: ExcelJS.Worksheet, color: string) => {
        const row = ws.getRow(1);
        row.font = { bold: true, color: { argb: "FFFFFFFF" } };
        row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
        row.alignment = { horizontal: "center" };
      };

      const addTotal = (ws: ExcelJS.Worksheet, count: number) => {
        if (count > 0) {
          const r = ws.addRow([]);
          r.getCell(1).value = `Total : ${count} entrée(s)`;
          r.getCell(1).font = { bold: true };
        }
      };

      // --- Produits facturés ---
      const wsProd = wb.addWorksheet("Produits facturés");
      wsProd.columns = [
        { header: "N°", key: "num", width: 6 },
        { header: "Date", key: "date", width: 18 },
        { header: "Utilisateur", key: "user", width: 20 },
        { header: "Client", key: "client", width: 25 },
        { header: "Produit", key: "produit", width: 30 },
        { header: "Quantité", key: "quantite", width: 10 },
        { header: "Montant", key: "montant", width: 14 },
      ];
      styleHeader(wsProd, "FF2563EB");
      data.produits.forEach((p, i) => {
        wsProd.addRow({ num: i + 1, date: fmtDate(p.date), user: p.user, client: p.client, produit: p.nomProduit, quantite: p.quantite, montant: p.montant });
      });
      addTotal(wsProd, data.produits.length);

      // --- Prestations facturées ---
      const wsPrest = wb.addWorksheet("Prestations facturées");
      wsPrest.columns = [
        { header: "N°", key: "num", width: 6 },
        { header: "Date", key: "date", width: 18 },
        { header: "Utilisateur", key: "user", width: 20 },
        { header: "Client", key: "client", width: 25 },
        { header: "Prestation", key: "prestation", width: 30 },
        { header: "Prix", key: "prix", width: 14 },
      ];
      styleHeader(wsPrest, "FF2563EB");
      data.prestations.forEach((p, i) => {
        wsPrest.addRow({ num: i + 1, date: fmtDate(p.date), user: p.user, client: p.client, prestation: p.libellePrestation, prix: p.prix });
      });
      addTotal(wsPrest, data.prestations.length);

      // --- Examens facturés ---
      const wsExam = wb.addWorksheet("Examens facturés");
      wsExam.columns = [
        { header: "N°", key: "num", width: 6 },
        { header: "Date", key: "date", width: 18 },
        { header: "Utilisateur", key: "user", width: 20 },
        { header: "Client", key: "client", width: 25 },
        { header: "Examen", key: "examen", width: 30 },
        { header: "Prix", key: "prix", width: 14 },
        { header: "Remise", key: "remise", width: 10 },
      ];
      styleHeader(wsExam, "FF2563EB");
      data.examens.forEach((e, i) => {
        wsExam.addRow({ num: i + 1, date: fmtDate(e.date), user: e.user, client: e.client, examen: e.libelleExamen, prix: e.prix, remise: e.remise });
      });
      addTotal(wsExam, data.examens.length);

      // --- Echographies facturées ---
      const wsEcho = wb.addWorksheet("Echographies facturées");
      wsEcho.columns = [
        { header: "N°", key: "num", width: 6 },
        { header: "Date", key: "date", width: 18 },
        { header: "Utilisateur", key: "user", width: 20 },
        { header: "Client", key: "client", width: 25 },
        { header: "Echographie", key: "echographie", width: 30 },
        { header: "Prix", key: "prix", width: 14 },
        { header: "Remise", key: "remise", width: 10 },
      ];
      styleHeader(wsEcho, "FF2563EB");
      data.echographies.forEach((e, i) => {
        wsEcho.addRow({ num: i + 1, date: fmtDate(e.date), user: e.user, client: e.client, echographie: e.libelleEchographie, prix: e.prix, remise: e.remise });
      });
      addTotal(wsEcho, data.echographies.length);

      // --- 4 feuilles supprimées (depuis le journal d'audit) ---
      const suppTypes = [
        { name: "Produits supprimés", entite: "FactureProduit", label: "Produit", fields: ["nomProduit", "quantite", "montantProduit"] },
        { name: "Prestations supprimées", entite: "FacturePrestation", label: "Prestation", fields: ["libellePrestation", "prixPrestation"] },
        { name: "Examens supprimés", entite: "FactureExamen", label: "Examen", fields: ["libelleExamen", "prixExamen", "remiseExamen"] },
        { name: "Echographies supprimées", entite: "FactureEchographie", label: "Echographie", fields: ["libelleEchographie", "prixEchographie", "remiseEchographie"] },
      ];

      for (const st of suppTypes) {
        const filtered = data.suppressions.filter((s) => s.entite === st.entite);
        const ws = wb.addWorksheet(st.name);
        ws.columns = [
          { header: "N°", key: "num", width: 6 },
          { header: "Date suppression", key: "date", width: 18 },
          { header: "Utilisateur", key: "user", width: 20 },
          { header: "Description", key: "description", width: 40 },
          { header: st.label, key: "item", width: 30 },
          { header: "Détails", key: "details", width: 30 },
        ];
        styleHeader(ws, "FFDC2626");
        filtered.forEach((s, i) => {
          const d = s.data;
          ws.addRow({
            num: i + 1,
            date: fmtDate(s.date),
            user: s.user,
            description: s.description,
            item: d ? String(d[st.fields[0]] ?? "") : "",
            details: d ? st.fields.slice(1).map((f) => `${f}: ${d[f] ?? ""}`).join(", ") : "",
          });
        });
        addTotal(ws, filtered.length);
      }

      // Téléchargement
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `journal-facturation-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erreur export Excel:", error);
    } finally {
      setExporting(false);
    }
  };

  const fetchLogs = async (pageNum: number) => {
    setLoading(true);
    try {
      const result = await fetchJournalEntries({
        page: pageNum,
        pageSize: 50,
        idClinique: selectedClinique !== "all" ? selectedClinique : undefined,
        entite: selectedEntite !== "all" ? selectedEntite : undefined,
        action: selectedAction !== "all" ? (selectedAction as AuditAction) : undefined,
        search: search || undefined,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo + "T23:59:59") : undefined,
      });
      setLogs(result.logs);
      setTotal(result.total);
      setPage(result.page);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error("Erreur chargement journal:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => fetchLogs(1);
  const handlePrevPage = () => page > 1 && fetchLogs(page - 1);
  const handleNextPage = () => page < totalPages && fetchLogs(page + 1);

  const getActionCount = (action: AuditAction) =>
    stats.actionCounts.find((a) => a.action === action)?._count || 0;

  const formatDate = (date: Date) =>
    new Date(date).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-4">
      {/* Cartes résumé */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLogs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aujourd&apos;hui</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayLogs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Creations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{getActionCount("CREATION")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Modifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{getActionCount("MODIFICATION")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Suppressions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{getActionCount("SUPPRESSION")}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="Date debut"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="Date fin"
            />
            <Select value={selectedClinique} onValueChange={setSelectedClinique}>
              <SelectTrigger>
                <SelectValue placeholder="Clinique" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les cliniques</SelectItem>
                {tabClinique.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nomClinique}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedEntite} onValueChange={setSelectedEntite}>
              <SelectTrigger>
                <SelectValue placeholder="Entite" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les entites</SelectItem>
                {ENTITY_TYPES.map((e) => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les actions</SelectItem>
                <SelectItem value="CREATION">Creation</SelectItem>
                <SelectItem value="MODIFICATION">Modification</SelectItem>
                <SelectItem value="SUPPRESSION">Suppression</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleExportExcel}
              disabled={exporting}
              variant="outline"
              className="gap-1 whitespace-nowrap"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tableau */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Heure</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entite</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Aucune entree trouvee
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLog(log)}>
                    <TableCell className="text-sm whitespace-nowrap">{formatDate(log.createdAt)}</TableCell>
                    <TableCell className="text-sm font-medium">{log.userName}</TableCell>
                    <TableCell>
                      <Badge className={`${ACTION_COLORS[log.action]} gap-1`}>
                        {ACTION_ICONS[log.action]}
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {ENTITY_TYPES.find((e) => e.value === log.entite)?.label || log.entite}
                    </TableCell>
                    <TableCell className="text-sm max-w-[300px] truncate">{log.description}</TableCell>
                    <TableCell>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-muted-foreground">
                {total} entrees - Page {page}/{totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={page <= 1 || loading}>
                  <ChevronLeft className="h-4 w-4" />
                  Precedent
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextPage} disabled={page >= totalPages || loading}>
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog detail */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail du journal</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Date</div>
                <div>{formatDate(selectedLog.createdAt)}</div>
                <div className="text-muted-foreground">Utilisateur</div>
                <div className="font-medium">{selectedLog.userName}</div>
                <div className="text-muted-foreground">Action</div>
                <div>
                  <Badge className={ACTION_COLORS[selectedLog.action]}>
                    {selectedLog.action}
                  </Badge>
                </div>
                <div className="text-muted-foreground">Entite</div>
                <div>{ENTITY_TYPES.find((e) => e.value === selectedLog.entite)?.label || selectedLog.entite}</div>
                <div className="text-muted-foreground">Description</div>
                <div>{selectedLog.description}</div>
              </div>

              {selectedLog.anciennesDonnees && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Anciennes donnees</h4>
                  <pre className="text-xs bg-red-50 p-3 rounded-md overflow-auto max-h-40">
                    {JSON.stringify(selectedLog.anciennesDonnees, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.nouvellesDonnees && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Nouvelles donnees</h4>
                  <pre className="text-xs bg-green-50 p-3 rounded-md overflow-auto max-h-40">
                    {JSON.stringify(selectedLog.nouvellesDonnees, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
