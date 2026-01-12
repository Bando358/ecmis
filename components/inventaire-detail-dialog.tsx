// components/inventaire-detail-dialog.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, X } from "lucide-react";
import { InventaireWithRelations } from "@/types/prisma";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { useState } from "react";
import { Produit, TarifProduit } from "@prisma/client";

interface InventaireDetailDialogProps {
  inventaire: InventaireWithRelations | null;
  produits: Produit[];
  tarifProduits: TarifProduit[];
  isOpen: boolean;
  onClose: () => void;
}

export function InventaireDetailDialog({
  inventaire,
  produits,
  tarifProduits,
  isOpen,
  onClose,
}: InventaireDetailDialogProps) {
  const [isExporting, setIsExporting] = useState(false);

  if (!inventaire) return null;

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      toast.info("Génération du PDF en cours...");

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Ajouter le logo
      try {
        const logo = new Image();
        logo.src = "/LOGO_AIBEF_IPPF.png";
        await new Promise((resolve, reject) => {
          logo.onload = resolve;
          logo.onerror = reject;
        });
        // 60% de la largeur de la page (210mm) = 126mm
        const logoWidth = 126;
        const logoHeight = 15;
        const pageWidth = doc.internal.pageSize.width;
        const logoX = (pageWidth - logoWidth) / 2; // Centrer le logo
        doc.addImage(logo, "PNG", logoX, 10, logoWidth, logoHeight);
      } catch (error) {
        console.warn("Impossible de charger le logo:", error);
      }

      // En-tête
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text("RAPPORT D'INVENTAIRE", 105, 37, { align: "center" });

      // Informations générales
      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);

      const dateInventaire = format(
        new Date(inventaire.dateInventaire),
        "dd/MM/yyyy à HH:mm",
        { locale: fr }
      );
      doc.text(
        `Clinique: ${inventaire.Clinique?.nomClinique || "Non spécifiée"}`,
        14,
        48
      );
      doc.text(`Date: ${dateInventaire}`, 14, 55);
      doc.text(
        `Réalisé par: ${inventaire.User?.name || "Utilisateur inconnu"}`,
        14,
        62
      );

      doc.text(`Produits inventoriés: ${stats.totalProduits}`, 14, 69);
      doc.text(`Produits conformes: ${stats.produitsValides}`, 14, 76);
      doc.text(`Anomalies détectées: ${stats.totalAnomalies}`, 14, 83);
      doc.text(`Écart total: ${stats.totalEcart} unités`, 14, 90);

      // Tableau des produits
      const tableData = inventaire.detailInventaire.map((detail, index) => ({
        index: index + 1,
        produit:
          produits.find((p) => p.id === detail.tarifProduit?.idProduit)
            ?.nomProduit || "Produit inconnu",
        theorique: detail.quantiteTheorique,
        reel: detail.quantiteReelle,
        ecart: detail.ecart,
        anomalies:
          detail.AnomalieInventaire && detail.AnomalieInventaire.length > 0
            ? detail.AnomalieInventaire.map(
                (a) => a.description || "Sans description"
              ).join(", ")
            : "-",
      }));

      autoTable(doc, {
        head: [["N°", "Produit", "Théorique", "Réel", "Écart", "Anomalies"]],
        body: tableData.map((d) => [
          d.index.toString(),
          d.produit,
          d.theorique.toString(),
          d.reel.toString(),
          d.ecart > 0 ? `+${d.ecart}` : d.ecart.toString(),
          d.anomalies,
        ]),
        startY: 98,
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: "bold",
        },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 50 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 35 },
        },
        didDrawPage: (data) => {
          // Pied de page
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(10);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `Page ${data.pageNumber} sur ${pageCount}`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: "center" }
          );
          doc.text(
            `Généré le ${format(new Date(), "dd/MM/yyyy à HH:mm", {
              locale: fr,
            })}`,
            14,
            doc.internal.pageSize.height - 10
          );
        },
      });

      // Nom du fichier
      const filename = `Inventaire_${
        inventaire.Clinique?.nomClinique?.replace(/\s+/g, "_") || "Inventaire"
      }_${format(new Date(inventaire.dateInventaire), "yyyy-MM-dd", {
        locale: fr,
      })}.pdf`;

      doc.save(filename);
      toast.success("PDF téléchargé avec succès!");
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const stats = {
    totalProduits: inventaire.detailInventaire.length,
    produitsValides: inventaire.detailInventaire.filter((d) => d.ecart === 0)
      .length,
    totalAnomalies: inventaire.detailInventaire.reduce(
      (sum, d) => sum + (d.AnomalieInventaire?.length || 0),
      0
    ),
    totalEcart: inventaire.detailInventaire.reduce(
      (sum, d) => sum + Math.abs(d.ecart),
      0
    ),
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* <DialogContent className="max-w-8xl max-h-[90vh] overflow-y-auto"> */}
      <DialogContent className="w-full max-w-4xl! max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détails de l'inventaire</DialogTitle>
          <DialogDescription>
            {format(
              new Date(inventaire.dateInventaire),
              "dd MMMM yyyy 'à' HH:mm",
              { locale: fr }
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations générales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Clinique
              </h4>
              <p className="font-medium">{inventaire.Clinique?.nomClinique}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Réalisé par
              </h4>
              <p className="font-medium">
                {inventaire.User?.name || "Utilisateur inconnu"}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Statistiques
              </h4>
              <div className="flex gap-4">
                <Badge variant="outline">{stats.totalProduits} produits</Badge>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  {stats.produitsValides} conforme(s)
                </Badge>
                {stats.totalAnomalies > 0 && (
                  <Badge variant="outline" className="bg-red-50 text-red-700">
                    {stats.totalAnomalies} anomalie(s)
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Écart total
              </h4>
              <p
                className={`text-lg font-bold ${
                  stats.totalEcart > 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                {stats.totalEcart > 0
                  ? `+${stats.totalEcart}`
                  : stats.totalEcart}{" "}
                unités
              </p>
            </div>
          </div>

          <Separator />

          {/* Liste des produits */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Produits inventoriés</h4>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">
                      Quantité théorique
                    </TableHead>
                    <TableHead className="text-right">
                      Quantité réelle
                    </TableHead>
                    <TableHead className="text-right">Écart</TableHead>
                    <TableHead className="text-right">Anomalies</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventaire.detailInventaire.map((detail, index) => (
                    <TableRow key={detail.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {produits.find(
                              (p) => p.id === detail.tarifProduit?.idProduit
                            )?.nomProduit || "Produit inconnu"}
                          </p>
                          {detail.AnomalieInventaire &&
                            detail.AnomalieInventaire.length > 0 && (
                              <p className="text-xs text-red-600 mt-1">
                                {detail.AnomalieInventaire.length} anomalie(s)
                                détectée(s)
                              </p>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {detail.quantiteTheorique}
                      </TableCell>
                      <TableCell className="text-right">
                        {detail.quantiteReelle}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-medium ${
                            detail.ecart > 0 ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {detail.ecart > 0 ? `+${detail.ecart}` : detail.ecart}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {detail.AnomalieInventaire &&
                        detail.AnomalieInventaire.length > 0 ? (
                          <div className="text-left">
                            {detail.AnomalieInventaire.map((anomalie, idx) => (
                              <p
                                key={anomalie.id}
                                className="text-xs text-red-600"
                              >
                                {anomalie.description ||
                                  "Anomalie sans description"}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" />
              Fermer
            </Button>
            <Button onClick={handleExportPDF} disabled={isExporting}>
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "Génération..." : "Exporter"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
