"use client";
// components/DashboardClient.tsx
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DashboardChart from "./DashboardChart";

interface DashboardClientProps {
  // Données des filtres
  tabClinique: { id: string; name: string }[];
  tabPrescripteur: { id: string; name: string; cliniqueId: string }[];

  // Données du dashboard
  dashboardData: Record<string, unknown>;

  // Paramètres par défaut
  defaultStartDate: string;
  defaultEndDate: string;
  defaultCliniqueId: string;
  defaultPrescripteurId: string;
}

export default function DashboardClient({
  tabClinique,
  tabPrescripteur,
  dashboardData,
  defaultStartDate,
  defaultEndDate,
  defaultCliniqueId,
  defaultPrescripteurId,
}: DashboardClientProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // États locaux
  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const [endDate, setEndDate] = useState<string>(defaultEndDate);
  const [selectedClinique, setSelectedClinique] = useState<{
    id: string;
    name: string;
  }>(() => {
    if (defaultCliniqueId === "all") {
      return { id: "all", name: "Toutes les cliniques" };
    }
    const clinique = tabClinique.find((c) => c.id === defaultCliniqueId);
    return clinique || { id: "all", name: "Toutes les cliniques" };
  });
  const [selectedPrescripteur, setSelectedPrescripteur] = useState<{
    id: string;
    name: string;
  }>(() => {
    if (defaultPrescripteurId === "all") {
      return { id: "all", name: "Tous les prescripteurs" };
    }
    const prescripteur = tabPrescripteur.find(
      (p) => p.id === defaultPrescripteurId
    );
    return prescripteur || { id: "all", name: "Tous les prescripteurs" };
  });

  // 🔹 Mise à jour des URL search params (avec debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams();

      params.set("startDate", startDate);
      params.set("endDate", endDate);

      if (selectedClinique.id !== "all") {
        params.set("clinique", selectedClinique.id);
      }

      if (selectedPrescripteur.id !== "all") {
        params.set("prescripteur", selectedPrescripteur.id);
      }

      // Mettre à jour l'URL sans recharger la page
      const newUrl = `${pathname}?${params.toString()}`;
      router.replace(newUrl, { scroll: false });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [
    startDate,
    endDate,
    selectedClinique.id,
    selectedPrescripteur.id,
    pathname,
    router,
  ]);

  // 🔹 Gestionnaire pour la sélection de clinique (mémorisé)
  const handleCliniqueChange = useCallback(
    (value: string) => {
      if (value === "all") {
        setSelectedClinique({ id: "all", name: "Toutes les cliniques" });
      } else {
        const clinique = tabClinique.find((c) => c.id === value);
        if (clinique) {
          setSelectedClinique(clinique);
        }
      }
      // Réinitialiser le prescripteur quand on change de clinique
      setSelectedPrescripteur({ id: "all", name: "Tous les prescripteurs" });
    },
    [tabClinique]
  );

  // 🔹 Gestionnaire pour la sélection de prescripteur (mémorisé)
  const handlePrescripteurChange = useCallback(
    (value: string) => {
      if (value === "all") {
        setSelectedPrescripteur({ id: "all", name: "Tous les prescripteurs" });
      } else {
        const prescripteur = tabPrescripteur.find((p) => p.id === value);
        if (prescripteur) {
          setSelectedPrescripteur(prescripteur);
        }
      }
    },
    [tabPrescripteur]
  );

  // 🔹 Filtrer les prescripteurs selon la clinique sélectionnée (mémorisé)
  const filteredPrescripteurs = useMemo(
    () =>
      selectedClinique.id === "all"
        ? tabPrescripteur
        : tabPrescripteur.filter((p) => p.cliniqueId === selectedClinique.id),
    [selectedClinique.id, tabPrescripteur]
  );

  // 🔹 Redirection si non authentifié
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <div className="flex flex-wrap items-center justify-start gap-2  sm:gap-3 px-2 sm:px-4 mx-4 sm:mx-4 py-2 sm:py-3 bg-white shadow-md rounded-2xl opacity-90">
        <div className="flex flex-col w-full sm:w-auto">
          <label className="font-semibold mb-1 text-xs sm:text-sm">
            Date de début
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded-md p-2 w-full text-xs sm:text-sm"
          />
        </div>

        <div className="flex flex-col w-full sm:w-auto">
          <label className="font-semibold mb-1 text-xs sm:text-sm">
            Date de fin
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded-md p-2 w-full text-xs sm:text-sm"
          />
        </div>

        <div className="flex flex-col w-full sm:w-auto">
          <label className="font-semibold mb-1 text-xs sm:text-sm">
            Clinique
          </label>
          <Select
            value={selectedClinique.id}
            onValueChange={handleCliniqueChange}
          >
            <SelectTrigger className="w-full sm:w-50 text-xs sm:text-sm">
              <SelectValue placeholder="Sélectionner une clinique">
                {selectedClinique.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les cliniques</SelectItem>
              {tabClinique.map((clinique) => (
                <SelectItem key={clinique.id} value={clinique.id}>
                  {clinique.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col w-full sm:w-auto">
          <label className="font-semibold mb-1 text-xs sm:text-sm">
            Prescripteur
          </label>
          <Select
            value={selectedPrescripteur.id}
            onValueChange={handlePrescripteurChange}
          >
            <SelectTrigger className="w-full sm:w-55 text-xs sm:text-sm">
              <SelectValue placeholder="Sélectionner un prescripteur">
                {selectedPrescripteur.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les prescripteurs</SelectItem>
              {filteredPrescripteurs.map((prescripteur) => (
                <SelectItem key={prescripteur.id} value={prescripteur.id}>
                  {prescripteur.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="px-4 -py-2">
        <DashboardChart
          clinicIds={
            selectedClinique.id === "all"
              ? tabClinique.map((c) => c.id)
              : [selectedClinique.id]
          }
          startDate={startDate}
          endDate={endDate}
          initialData={dashboardData}
        />

        <div className="mt-4 p-3 sm:p-4 bg-white rounded-lg shadow">
          <h3 className="font-semibold mb-2 text-sm sm:text-base">
            Paramètres sélectionnés :
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs sm:text-sm">
            <p>
              🗓️ <strong>Période :</strong> {startDate} → {endDate}
            </p>
            <p>
              📍 <strong>Clinique :</strong> {selectedClinique.name}
            </p>
            <p>
              👨‍⚕️ <strong>Prescripteur :</strong> {selectedPrescripteur.name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
