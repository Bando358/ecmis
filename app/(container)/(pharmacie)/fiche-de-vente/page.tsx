"use client";

import React, { useRef } from "react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { fetchVentesData } from "@/lib/actions/venteActions";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// ====================== TYPES ======================
import type {
  FactureExamenType,
  FactureProduitType,
  FacturePrestationType,
  FactureEchographieType,
} from "@/lib/actions/venteActions";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import { Spinner } from "@/components/ui/spinner";
import { useSession } from "next-auth/react";
import { SubmitHandler, useForm } from "react-hook-form";
import {
  Examen,
  Prestation,
  Produit,
  TarifExamen,
  TarifPrestation,
  TarifProduit,
} from "@prisma/client";
import { getAllExamen } from "@/lib/actions/examenActions";
import { getAllProduits } from "@/lib/actions/produitActions";
import { getAllPrestation } from "@/lib/actions/prestationActions";
import { getAllTarifExamen } from "@/lib/actions/tarifExamenActions";
import { getAllTarifProduits } from "@/lib/actions/tarifProduitActions";
import { getAllTarifPrestation } from "@/lib/actions/tarifPrestationActions";
import { SpinnerBar } from "@/components/ui/spinner-bar";
import { Button } from "@/components/ui/button";
import { useReactToPrint } from "react-to-print";

// ====================== INTERFACES ======================
interface CliniqueOption {
  value: string;
  label: string;
}

// react-select importé seulement côté client
const Select = dynamic(() => import("react-select"), { ssr: false });

const FormValuesSchema = z.object({
  dateDebut: z.string().nonempty("Date de début requise"),
  dateFin: z.string().nonempty("Date de fin requise"),
  idCliniques: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
      })
    )
    .min(1, "Sélectionnez au moins une clinique"),
});

type FormValuesType = z.infer<typeof FormValuesSchema>;

// ====================== COMPOSANT ======================
export default function VentesPage() {
  const [facturesExamens, setFacturesExamens] = useState<FactureExamenType[]>(
    []
  );
  const [facturesProduits, setFacturesProduits] = useState<
    FactureProduitType[]
  >([]);
  const [facturesPrestations, setFacturesPrestations] = useState<
    FacturePrestationType[]
  >([]);
  const [facturesEchographies, setFacturesEchographies] = useState<
    FactureEchographieType[]
  >([]);
  const [spinner, setSpinner] = useState(false);

  const [selectedClinique, setSelectedClinique] = useState<string[]>([]);
  const [allExamens, setAllExamens] = useState<Examen[]>([]);
  const [allProduits, setAllProduits] = useState<Produit[]>([]);
  const [allPrestations, setAllPrestations] = useState<Prestation[]>([]);
  const [allTarifExamens, setAllTarifExamens] = useState<TarifExamen[]>([]);
  const [allTarifProduits, setAllTarifProduits] = useState<TarifProduit[]>([]);
  const [allTarifPrestations, setAllTarifPrestations] = useState<
    TarifPrestation[]
  >([]);

  const [cliniques, setCliniques] = useState<CliniqueOption[]>([]);
  const { data: session } = useSession();

  const {
    watch,
    setValue,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValuesType>({
    resolver: zodResolver(FormValuesSchema),
    defaultValues: {
      idCliniques: [],
    },
  });

  // Charger les cliniques, examens, produits, prestations
  useEffect(() => {
    const loadData = async () => {
      const allCliniques = await getAllClinique();
      setCliniques(
        allCliniques.map((clinique: { id: string; nomClinique: string }) => ({
          value: clinique.id,
          label: clinique.nomClinique,
        }))
      );

      const [exams, produits, prestations] = await Promise.all([
        getAllExamen(),
        getAllProduits(),
        getAllPrestation(),
      ]);
      setAllExamens(exams);
      setAllProduits(produits);
      setAllPrestations(prestations);
    };

    loadData();
  }, []);

  // Charger les tarifs
  useEffect(() => {
    const loadData = async () => {
      const [tarifsExam, tarifsProd, tarifsPrest] = await Promise.all([
        getAllTarifExamen(),
        getAllTarifProduits(),
        getAllTarifPrestation(),
      ]);
      setAllTarifExamens(tarifsExam);
      setAllTarifProduits(tarifsProd);
      setAllTarifPrestations(tarifsPrest);
    };

    loadData();
  }, []);

  const onSubmit: SubmitHandler<FormValuesType> = async (data) => {
    const { idCliniques, dateDebut, dateFin } = data;
    const selectedIds = idCliniques.map((cl) => cl.value);
    setSelectedClinique(selectedIds);
    setSpinner(true);

    try {
      const {
        facturesExamens,
        facturesProduits,
        facturesPrestations,
        facturesEchographies,
      } = await fetchVentesData(
        selectedIds,
        new Date(dateDebut),
        new Date(dateFin)
      );

      setFacturesExamens(facturesExamens);
      setFacturesProduits(facturesProduits);
      setFacturesPrestations(facturesPrestations);
      setFacturesEchographies(facturesEchographies);
      console.log("Factures Examens:", facturesExamens);
      console.log("Factures Produits:", facturesProduits);
      console.log("Factures Prestations:", facturesPrestations);
      console.log("Factures Echographies:", facturesEchographies);
    } catch (err) {
      console.error("Erreur lors du chargement des ventes:", err);
    }
    setSpinner(false);
  };

  // ================== Fonctions Examens ==================
  const countExamenPrixTotalByLibelle = (libelle: string) =>
    facturesExamens
      .filter((facture) => facture.examLibelle === libelle)
      .reduce((total, facture) => total + facture.examPrixTotal, 0);

  const countExamenOccurrences = (libelle: string) =>
    facturesExamens.filter((facture) => facture.examLibelle === libelle).length;

  const countExamenPrixUnitaireByLibelle = (libelle: string) => {
    const examen = allExamens.find((ex) => ex.nomExamen === libelle);
    if (!examen) return 0;
    const tarifExamen = allTarifExamens.filter(
      (tarif) => tarif.idExamen === examen.id
    );
    const tarifClinique = tarifExamen.find(
      (t) => t.idClinique === selectedClinique[0]
    );
    return tarifClinique ? tarifClinique.prixExamen : 0;
  };

  // ================== Fonctions Prestations ==================
  const countPrestationPrixTotalByLibelle = (libelle: string) =>
    facturesPrestations
      .filter((facture) => facture.prestLibelle === libelle)
      .reduce((total, facture) => total + facture.prestPrixTotal, 0);

  const countPrestationsOccurrences = (libelle: string) =>
    facturesPrestations.filter((facture) => facture.prestLibelle === libelle)
      .length;

  const countPrestationPrixUnitaireByLibelle = (libelle: string) => {
    const prestation = allPrestations.find(
      (pr) => pr.nomPrestation === libelle
    );
    if (!prestation) return 0;
    const tarif = allTarifPrestations.filter(
      (t) => t.idPrestation === prestation.id
    );
    const tarifClinique = tarif.find(
      (t) => t.idClinique === selectedClinique[0]
    );
    return tarifClinique ? tarifClinique.montantPrestation : 0;
  };

  // ================== Fonctions Produits ==================
  const countProduitPrixTotalByLibelle = (libelle: string) => {
    const produit = allProduits.find((p) => p.nomProduit === libelle);
    if (!produit) return 0;
    // Récupérer tous les tarifs liés à ce produit
    const tarifs = allTarifProduits.filter((t) => t.idProduit === produit.id);
    if (tarifs.length === 0) return 0;
    // Vérifier si l'id tarif d'une facture correspond à l'un des tarifs du produit
    const facture = facturesProduits.filter((f) =>
      tarifs.some((t) => t.id === f.prodIdTarifProduit)
    );

    return facture.reduce((total, f) => total + f.prodMontantTotal, 0);
  };

  const countProduitsOccurrences = (libelle: string) => {
    const produit = allProduits.find((p) => p.nomProduit === libelle);
    if (!produit) return 0;

    // Récupérer tous les tarifs liés à ce produit
    const tarifs = allTarifProduits.filter((t) => t.idProduit === produit.id);
    if (tarifs.length === 0) return 0;

    // Vérifier si l'id tarif d'une facture correspond à l'un des tarifs du produit
    const facture = facturesProduits.filter((f) =>
      tarifs.some((t) => t.id === f.prodIdTarifProduit)
    );

    return facture.reduce((total, f) => total + (f.prodQuantite || 0), 0);
  };

  const countProduitPrixUnitaireByLibelle = (libelle: string) => {
    const produit = allProduits.find((p) => p.nomProduit === libelle);
    if (!produit) return 0;
    const allTarifsByProduit = allTarifProduits.filter(
      (t) => t.idProduit === produit.id
    );
    const tarifClinique = allTarifsByProduit.find(
      (t) => t.idClinique === selectedClinique[0]
    );
    return tarifClinique ? tarifClinique.prixUnitaire : 0;
  };

  const stockProduitByLibelle = (libelle: string) => {
    const produit = allProduits.find((p) => p.nomProduit === libelle);
    if (!produit) return 0;
    const allTarifsByProduit = allTarifProduits.filter(
      (t) => t.idProduit === produit.id
    );
    const tarifClinique = allTarifsByProduit.find(
      (t) => t.idClinique === selectedClinique[0]
    );
    return tarifClinique ? tarifClinique.quantiteStock : 0;
  };

  // ================== Name clinique by idclinique ==================
  const getCliniqueNameById = (id: string) => {
    const clinique = cliniques.find((cl) => cl.value === id);
    return clinique ? clinique.label : "Inconnu";
  };
  const getAllCliniqueNameById = (tab: string[]) => {
    return tab.map((id) => getCliniqueNameById(id)).join(", ");
  };

  // ================== Impression ==================
  const contentRef = useRef<HTMLDivElement>(null);
  const reactToPrintFn = useReactToPrint({ contentRef });

  // ================== Groupage des Examens ==================
  const groupedExamens = Object.values(
    facturesExamens.reduce(
      (acc, examen) => {
        // Pour les examens sous-traités, on ignore complètement la remise
        const isSousTraite = examen.examSoustraitanceExamen;

        // Clé de groupage : libellé + sous-traitance uniquement
        const key = `${examen.examLibelle}-${isSousTraite}`;

        if (!acc[key]) {
          acc[key] = {
            libelle: examen.examLibelle,
            remise: isSousTraite ? 0 : examen.examRemise, // Remise forcée à 0 pour les sous-traités
            soustraitance: isSousTraite,
            prixUnitaire: examen.examPrixTotal,
            quantite: 1,
            montant: examen.examPrixTotal,
          };
        } else {
          acc[key].quantite += 1;
          acc[key].montant += examen.examPrixTotal;
          // Pour les sous-traités, on garde la remise à 0
          // Pour les non sous-traités, on garde la remise originale du premier élément
        }
        return acc;
      },
      {} as Record<
        string,
        {
          libelle: string;
          remise: number;
          soustraitance: boolean;
          prixUnitaire: number;
          quantite: number;
          montant: number;
        }
      >
    )
  ).sort((a, b) => {
    // 1. Trier par libellé (ordre alphabétique)
    const cmpLibelle = a.libelle.localeCompare(b.libelle);
    if (cmpLibelle !== 0) return cmpLibelle;

    // 2. Si même libellé, trier par sous-traitance (non sous-traité d'abord)
    if (a.soustraitance !== b.soustraitance) {
      return a.soustraitance ? 1 : -1;
    }

    // 3. Si même sous-traitance, trier par remise croissante
    return a.remise - b.remise;
  });

  // Fonction pour formater l'affichage du libellé de l'examen
  const formatExamenLibelle = (examen: {
    libelle: string;
    remise: number;
    soustraitance: boolean;
  }) => {
    let libelleFormate = examen.libelle;

    // Ajouter le pourcentage de remise si > 0 et NON sous-traité
    if (examen.remise > 0 && !examen.soustraitance) {
      libelleFormate += ` ${examen.remise}%`;
    }

    // Ajouter "ST" si sous-traité
    if (examen.soustraitance) {
      libelleFormate += " ST";
    }

    return libelleFormate;
  };

  // ================== Groupage des Echographies ==================
  const groupedEchographies = Object.values(
    facturesEchographies.reduce(
      (acc, echographie) => {
        const key = `${echographie.echoLibelle}-${echographie.echoRemise}`;
        if (!acc[key]) {
          acc[key] = {
            libelle: echographie.echoLibelle,
            remise: echographie.echoRemise,
            prixUnitaire: echographie.echoPrixTotal,
            quantite: 1,
            montant: echographie.echoPrixTotal,
          };
        } else {
          acc[key].quantite += 1;
          acc[key].montant += echographie.echoPrixTotal;
        }
        return acc;
      },
      {} as Record<
        string,
        {
          libelle: string;
          remise: number;
          prixUnitaire: number;
          quantite: number;
          montant: number;
        }
      >
    )
  ).sort((a, b) => {
    // 1. Trier par libellé (ordre alphabétique)
    const cmpLibelle = a.libelle.localeCompare(b.libelle);
    if (cmpLibelle !== 0) return cmpLibelle;

    // 2. Si même libellé, trier par remise croissante
    return a.remise - b.remise;
  });

  return (
    <div className="p-4 space-y-8">
      {/* ================= FORMULAIRE ================= */}
      <h2 className="text-lg font-bold text-center">Vente journalière</h2>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto p-4 -mt-4 border rounded-md max-w-125"
      >
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label>Date début :</label>
              <input
                type="date"
                {...register("dateDebut")}
                className="w-full border px-3 py-2 rounded-md"
              />
              {errors.dateDebut && (
                <span className="text-red-500 text-sm">
                  {errors.dateDebut.message}
                </span>
              )}
            </div>

            <div className="flex-1">
              <label>Date fin :</label>
              <input
                type="date"
                {...register("dateFin")}
                className="w-full border px-3 py-2 rounded-md"
              />
              {errors.dateFin && (
                <span className="text-red-500 text-sm">
                  {errors.dateFin.message}
                </span>
              )}
            </div>
          </div>

          <div>
            <label>Cliniques :</label>
            <Select
              isMulti
              options={cliniques}
              classNamePrefix="select"
              placeholder="Sélectionner une ou plusieurs cliniques"
              value={watch("idCliniques")}
              onChange={(selectedOptions) => {
                setValue(
                  "idCliniques",
                  Array.isArray(selectedOptions) ? selectedOptions : []
                );
              }}
            />
            {errors.idCliniques && (
              <span className="text-red-500 text-sm">
                {errors.idCliniques.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex justify-center gap-2"
          >
            <Spinner
              show={spinner}
              size={"small"}
              className="text-white dark:text-slate-400"
            />
            <div>Générer</div>
          </button>
        </div>
      </form>

      {spinner && <SpinnerBar />}
      {/* ================= TABLEAUX ================= */}
      {selectedClinique.length > 0 && !spinner && (
        <>
          <div className="flex flex-col p-6" ref={contentRef}>
            <h2 className="text-lg font-bold text-center">
              Fiche de vente journalière du{" "}
              {new Date(watch("dateDebut")).toLocaleDateString("fr-FR")}
            </h2>
            {/* ================= TABLEAU PRODUITS ================= */}
            <div>
              <h2 className="text-lg font-bold mb-2">Factures Produits</h2>
              <table className="min-w-full border border-gray-300">
                <thead className="bg-gray-300">
                  <tr>
                    <th className="border px-2 py-1">Libellé</th>
                    <th className="border px-2 py-1">
                      Prix Unitaire{" "}
                      {selectedClinique.length > 1 &&
                        getCliniqueNameById(selectedClinique[0])}
                    </th>
                    <th className="border px-2 py-1">Quantité</th>
                    <th className="border px-2 py-1">Montant</th>
                    <th className="border px-2 py-1">Stock Final</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(
                    allProduits.reduce((acc, produit) => {
                      if (!acc[produit.typeProduit]) {
                        acc[produit.typeProduit] = [];
                      }
                      acc[produit.typeProduit].push(produit);
                      return acc;
                    }, {} as Record<string, typeof allProduits>)
                  ).map(([type, produits]) => (
                    <React.Fragment key={type}>
                      {/* Ligne du type */}
                      <tr className="bg-gray-200 opacity-95">
                        <td colSpan={5} className="font-semibold px-2 py-1">
                          {type === "CONTRACEPTIF" && "Contraceptifs"}
                          {type === "MEDICAMENTS" && "Médicaments"}
                          {type === "CONSOMMABLES" && "Consommables"}
                        </td>
                      </tr>

                      {/* Lignes des produits */}
                      {produits.map((produit) => (
                        <tr
                          key={produit.id}
                          className="hover:bg-green-800 opacity-95"
                        >
                          <td className="border px-2 py-1">
                            {produit.nomProduit}
                          </td>
                          <td className="border px-2 py-1">
                            {countProduitPrixUnitaireByLibelle(
                              produit.nomProduit
                            )}
                          </td>
                          <td className="border px-2 py-1">
                            {countProduitsOccurrences(produit.nomProduit)}
                          </td>
                          <td className="border px-2 py-1">
                            {countProduitPrixTotalByLibelle(produit.nomProduit)}
                          </td>
                          <td className="border px-2 py-1">
                            {stockProduitByLibelle(produit.nomProduit)}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className="border px-2 py-1" colSpan={2}>
                      Total
                    </td>

                    <td className="border px-2 py-1">
                      {facturesProduits.reduce(
                        (total, f) => total + (f.prodQuantite || 0),
                        0
                      )}{" "}
                      produits
                    </td>
                    <td className="border px-2 py-1">
                      {facturesProduits.reduce(
                        (total, f) => total + f.prodMontantTotal,
                        0
                      )}{" "}
                      Cfa
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ================= TABLEAU PRESTATIONS ================= */}
            <div>
              <h2 className="text-lg font-bold mb-2">Factures Prestations</h2>
              <table className="min-w-full border border-gray-300">
                <thead className="bg-gray-300 opacity-95">
                  <tr>
                    <th className="border px-2 py-1">Libellé</th>
                    <th className="border px-2 py-1">
                      Prix Unitaire{" "}
                      {selectedClinique.length > 1 &&
                        getCliniqueNameById(selectedClinique[0])}
                    </th>
                    <th className="border px-2 py-1">Quantité</th>
                    <th className="border px-2 py-1">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {allPrestations.length > 0 ? (
                    allPrestations.map((prestation) => (
                      <tr
                        key={prestation.id}
                        className="hover:bg-green-800 opacity-95"
                      >
                        <td className="border px-2 py-1">
                          {prestation.nomPrestation}
                        </td>
                        <td className="border px-2 py-1">
                          {countPrestationPrixUnitaireByLibelle(
                            prestation.nomPrestation
                          )}
                        </td>
                        <td className="border px-2 py-1">
                          {countPrestationsOccurrences(
                            prestation.nomPrestation
                          )}
                        </td>
                        <td className="border px-2 py-1">
                          {countPrestationPrixTotalByLibelle(
                            prestation.nomPrestation
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center py-2">
                        Chargement...
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className="border px-2 py-1" colSpan={2}>
                      Total
                    </td>

                    <td className="border px-2 py-1">
                      {facturesPrestations.length} prestations
                    </td>
                    <td className="border px-2 py-1">
                      {facturesPrestations.reduce(
                        (total, f) => total + f.prestPrixTotal,
                        0
                      )}{" "}
                      Cfa
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ================= TABLEAU EXAMENS ================= */}
            <div>
              <h2 className="text-lg font-bold mb-2">Factures Examens</h2>
              <table className="min-w-full border border-gray-300">
                <thead className="bg-gray-300">
                  <tr>
                    <th className="border px-2 py-1">Libellé</th>
                    <th className="border px-2 py-1">
                      Prix Unitaire{" "}
                      {selectedClinique.length > 1 &&
                        getCliniqueNameById(selectedClinique[0])}
                    </th>
                    <th className="border px-2 py-1">Quantité</th>
                    <th className="border px-2 py-1">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedExamens.map((examen, idx) => (
                    <tr key={idx}>
                      <td className="border px-2 py-1">
                        {formatExamenLibelle(examen)}
                      </td>
                      <td className="border px-2 py-1">
                        {examen.prixUnitaire}
                      </td>
                      <td className="border px-2 py-1">{examen.quantite}</td>
                      <td className="border px-2 py-1">{examen.montant}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className="border px-2 py-1" colSpan={2}>
                      Total
                    </td>

                    <td className="border px-2 py-1">
                      {facturesExamens.length} examens
                    </td>
                    <td className="border px-2 py-1">
                      {facturesExamens.reduce(
                        (total, f) => total + f.examPrixTotal,
                        0
                      )}{" "}
                      Cfa
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {/* ================= TABLEAU Echographies ================= */}
            <div>
              <h2 className="text-lg font-bold mb-2">Factures Echographies</h2>
              <table className="min-w-full border border-gray-300">
                <thead className="bg-gray-300">
                  <tr>
                    <th className="border px-2 py-1">Libellé</th>
                    <th className="border px-2 py-1">
                      Prix Unitaire{" "}
                      {selectedClinique.length > 1 &&
                        getCliniqueNameById(selectedClinique[0])}
                    </th>
                    <th className="border px-2 py-1">Quantité</th>
                    <th className="border px-2 py-1">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedEchographies.map((echographie, idx) => (
                    <tr key={idx}>
                      <td className="border px-2 py-1">
                        {echographie.remise > 0
                          ? `${echographie.libelle} (${echographie.remise}%)`
                          : echographie.libelle}
                      </td>
                      <td className="border px-2 py-1">
                        {echographie.prixUnitaire}
                      </td>
                      <td className="border px-2 py-1">
                        {echographie.quantite}
                      </td>
                      <td className="border px-2 py-1">
                        {echographie.montant}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className="border px-2 py-1" colSpan={2}>
                      Total
                    </td>

                    <td className="border px-2 py-1">
                      {facturesEchographies.length} échographies
                    </td>
                    <td className="border px-2 py-1">
                      {facturesEchographies.reduce(
                        (total, f) => total + f.echoPrixTotal,
                        0
                      )}{" "}
                      Cfa
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <table className="max-w-md mt-4 " style={{ float: "right" }}>
              <tbody>
                <tr>
                  <td className=" font-bold px-2 py-1">Caissière Vendeuse :</td>
                  <td className=" font-bold px-2 py-1">{session?.user.name}</td>
                </tr>
                <tr>
                  <td className=" font-bold px-2 py-1">Clinique :</td>
                  <td className=" font-bold px-2 py-1">
                    {getAllCliniqueNameById(selectedClinique)}
                  </td>
                </tr>
                <tr>
                  <td className=" font-bold px-2 py-1">Période :</td>
                  <td className=" font-bold px-2 py-1">
                    {watch("dateDebut") === watch("dateFin") ? (
                      <span>
                        {new Date(watch("dateDebut")).toLocaleDateString(
                          "fr-FR"
                        )}
                      </span>
                    ) : (
                      <span>
                        {new Date(watch("dateDebut")).toLocaleDateString(
                          "fr-FR"
                        )}{" "}
                        -{" "}
                        {new Date(watch("dateFin")).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className=" font-bold px-2 py-1">Recette :</td>
                  <td className=" font-bold px-2 py-1">
                    {facturesProduits.reduce(
                      (total, f) => total + f.prodMontantTotal,
                      0
                    ) +
                      facturesPrestations.reduce(
                        (total, f) => total + f.prestPrixTotal,
                        0
                      ) +
                      facturesExamens.reduce(
                        (total, f) => total + f.examPrixTotal,
                        0
                      ) +
                      facturesEchographies.reduce(
                        (total, f) => total + f.echoPrixTotal,
                        0
                      )}{" "}
                    Cfa
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {selectedClinique && (
            <div className="flex justify-center -mt-4 gap-4">
              <Button
                onClick={() => {
                  reactToPrintFn();
                }}
              >
                Imprimer la facture
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
