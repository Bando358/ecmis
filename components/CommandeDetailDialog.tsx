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
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { useState } from "react";
import {
  Produit,
  TarifProduit,
  CommandeFournisseur,
  Clinique,
  DetailCommande,
  User,
} from "@prisma/client";

type CommandeFournisseurWithRelations = CommandeFournisseur & {
  Clinique?: Clinique | null;
  detailCommande: (DetailCommande & {
    User?: User | null;
    tarifProduit?:
      | (TarifProduit & {
          produit?: Produit | null;
        })
      | null;
  })[];
};

interface CommandeDetailDialogProps {
  commande: CommandeFournisseurWithRelations | null;
  produits: Produit[];
  tarifProduits: TarifProduit[];
  isOpen: boolean;
  onClose: () => void;
}

export function CommandeDetailDialog({
  commande,
  produits,
  tarifProduits,
  isOpen,
  onClose,
}: CommandeDetailDialogProps) {
  const [isExporting, setIsExporting] = useState(false);

  if (!commande) return null;

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
        const logoWidth = 126;
        const logoHeight = 15;
        const pageWidth = doc.internal.pageSize.width;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(logo, "PNG", logoX, 10, logoWidth, logoHeight);
      } catch (error) {
        console.warn("Impossible de charger le logo:", error);
      }

      // En-tête
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text("BON DE COMMANDE FOURNISSEUR", 105, 37, { align: "center" });

      // Informations générales
      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);

      const dateCommande = format(
        new Date(commande.dateCommande),
        "dd/MM/yyyy à HH:mm",
        { locale: fr }
      );
      doc.text(
        `Clinique: ${commande.Clinique?.nomClinique || "Non spécifiée"}`,
        14,
        48
      );
      doc.text(`Date: ${dateCommande}`, 14, 55);
      doc.text(`N° Commande: ${commande.id.substring(0, 8)}...`, 14, 62);

      const stats = getCommandeStats(commande);
      doc.text(`Produits référencés: ${stats.totalProduits}`, 14, 69);
      doc.text(`Quantité initiale: ${stats.totalInitiale}`, 14, 76);
      doc.text(`Quantité commandée: ${stats.totalCommandee}`, 14, 83);
      doc.text(
        `Différence: ${`Nouvelle Qté: ${
          stats.totalCommandee + stats.totalInitiale
        }`}`,
        14,
        90
      );

      // Tableau des produits
      const tableData = commande.detailCommande.map((detail, index) => ({
        index: index + 1,
        produit:
          produits.find((p) => p.id === detail.tarifProduit?.idProduit)
            ?.nomProduit || "Produit inconnu",
        initiale: detail.quantiteInitiale,
        commandee: detail.quantiteCommandee,
        "Nouvelle Qté": detail.quantiteCommandee + detail.quantiteInitiale,
        responsable: detail.User?.name || "Non spécifié",
        date: format(new Date(detail.createdAt), "dd/MM/yyyy", { locale: fr }),
      }));

      autoTable(doc, {
        head: [
          [
            "N°",
            "Produit",
            "Initiale",
            "Commandée",
            "Nouvelle Qté",
            "Responsable",
            "Date",
          ],
        ],
        body: tableData.map((d) => [
          d.index.toString(),
          d.produit,
          d.initiale.toString(),
          d.commandee.toString(),
          d["Nouvelle Qté"].toString(),
          d.responsable,
          d.date,
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
          1: { cellWidth: 45 },
          2: { cellWidth: 20 },
          3: { cellWidth: 20 },
          4: { cellWidth: 20 },
          5: { cellWidth: 30 },
          6: { cellWidth: 25 },
        },
        didDrawPage: (data) => {
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

      const filename = `Commande_Fournisseur_Details_${
        commande.Clinique?.nomClinique?.replace(/\s+/g, "_") || "Commande"
      }_${format(new Date(commande.dateCommande), "yyyy-MM-dd", {
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

  const getCommandeStats = (commande: CommandeFournisseurWithRelations) => {
    const totalProduits = commande.detailCommande.length;
    const totalInitiale = commande.detailCommande.reduce(
      (sum, d) => sum + d.quantiteInitiale,
      0
    );
    const totalCommandee = commande.detailCommande.reduce(
      (sum, d) => sum + d.quantiteCommandee,
      0
    );
    const difference = totalCommandee - totalInitiale;

    return { totalProduits, totalInitiale, totalCommandee, difference };
  };

  const stats = getCommandeStats(commande);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl! max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détails de la commande fournisseur</DialogTitle>
          <DialogDescription>
            {format(new Date(commande.dateCommande), "dd MMMM yyyy 'à' HH:mm", {
              locale: fr,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations générales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Clinique
              </h4>
              <p className="font-medium">{commande.Clinique?.nomClinique}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                N° Commande
              </h4>
              <p className="font-medium text-sm">
                {commande.id.substring(0, 8)}...
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Statistiques
              </h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{stats.totalProduits} produits</Badge>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {stats.totalInitiale} initiale(s)
                </Badge>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  {stats.totalCommandee} commandé(s)
                </Badge>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Nouvelle Qté
              </h4>
              <p
              //   className={`text-lg font-bold ${
              //     stats.difference > 0 ? "text-green-600" : "text-red-600"
              //   }`
              // }
              >
                {/* {stats.difference > 0
                  ? `+${stats.difference}`
                  : stats.difference}{" "}
                unités */}
                {"Total: " + (stats.totalCommandee + stats.totalInitiale)}{" "}
                unités
              </p>
            </div>
          </div>

          <Separator />

          {/* Liste des produits */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Produits commandés</h4>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">
                      Quantité initiale
                    </TableHead>
                    <TableHead className="text-right">
                      Quantité commandée
                    </TableHead>
                    <TableHead className="text-right">Nouvelle Qté</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Date saisie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commande.detailCommande.map((detail) => {
                    const produitNom =
                      produits.find(
                        (p) => p.id === detail.tarifProduit?.idProduit
                      )?.nomProduit || "Produit inconnu";
                    const nouvelleQte =
                      detail.quantiteCommandee + detail.quantiteInitiale;

                    return (
                      <TableRow key={detail.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{produitNom}</p>
                            {detail.tarifProduit?.produit?.description && (
                              <p className="text-xs text-muted-foreground">
                                {detail.tarifProduit.produit.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {detail.quantiteInitiale}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium">
                            {detail.quantiteCommandee}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                          // className={`font-medium ${
                          //   difference > 0 ? "text-green-600" : "text-red-600"
                          // }`}
                          >
                            {nouvelleQte}
                          </span>
                        </TableCell>
                        <TableCell>
                          {detail.User?.name || "Non spécifié"}
                        </TableCell>
                        <TableCell>
                          {format(new Date(detail.createdAt), "dd/MM/yyyy", {
                            locale: fr,
                          })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Résumé */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="text-sm font-semibold mb-3">
              Résumé de la commande
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total produits:</p>
                <p className="text-lg font-semibold">{stats.totalProduits}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Quantité totale initiale:
                </p>
                <p className="text-lg font-semibold">
                  {stats.totalInitiale} unités
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Quantité totale commandée:
                </p>
                <p className="text-lg font-semibold">
                  {stats.totalCommandee} unités
                </p>
              </div>
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
              {isExporting ? "Génération..." : "Exporter PDF"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
