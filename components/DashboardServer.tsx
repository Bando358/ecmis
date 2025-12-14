// components/DashboardServer.tsx
"use server";
import { getAllUserIncludedIdClinique } from "@/lib/actions/authActions";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import { fetchDashboardData } from "@/lib/actions/dashboardActions";
import DashboardClient from "./DashboardClient";

interface DashboardServerProps {
  searchParams?: {
    startDate?: string;
    endDate?: string;
    period?: string;
    clinique?: string;
    prescripteur?: string;
  };
}

export default async function DashboardServer({
  searchParams,
}: DashboardServerProps) {
  try {
    // 🔹 Récupération des données des cliniques
    const cliniqueRaw = await getAllClinique();
    const cliniqueMapped = cliniqueRaw.map(
      (c: { id: string; nomClinique: string }) => ({
        id: c.id,
        name: c.nomClinique,
      })
    );

    // 🔹 Récupération des prescripteurs
    const allIds = cliniqueMapped.map((c: { id: string }) => c.id);
    const prescripteurCliniqueList = await Promise.all(
      allIds.map((id: string) => getAllUserIncludedIdClinique(id))
    );

    const prescripteurs = prescripteurCliniqueList
      .flat()
      .map(
        (
          p: {
            id: string;
            name: string;
            username: string;
            email: string;
            idCliniques: string[];
          },
          idx: number
        ) => ({
          id: p.id,
          name: p.name ?? p.username ?? p.email ?? `Prescripteur ${idx + 1}`,
          cliniqueId: p.idCliniques?.[0] ?? allIds[idx] ?? "",
        })
      );

    // 🔹 Calcul des dates par défaut
    const period = searchParams?.period || "mensuel";

    const calculateStartDate = (period: string) => {
      const now = new Date();
      switch (period) {
        case "bimestriel":
          return new Date(now.getFullYear(), now.getMonth() - 1, 1);
        case "trimestriel":
          return new Date(now.getFullYear(), now.getMonth() - 2, 1);
        case "semestriel":
          return new Date(now.getFullYear(), now.getMonth() - 5, 1);
        case "annuel":
          return new Date(now.getFullYear(), 0, 1);
        default: // mensuel
          return new Date(now.getFullYear(), now.getMonth(), 1);
      }
    };

    const formatDate = (date: Date) => date.toISOString().split("T")[0];

    const defaultStartDate =
      searchParams?.startDate || formatDate(calculateStartDate(period));
    const defaultEndDate = searchParams?.endDate || formatDate(new Date());

    // 🔹 Récupération des IDs de clinique pour le dashboard
    const selectedCliniqueId = searchParams?.clinique || "all";
    const clinicIds =
      selectedCliniqueId === "all"
        ? cliniqueMapped.map((c: { id: string }) => c.id)
        : [selectedCliniqueId];

    // 🔹 Récupération des données du dashboard
    const dashboardData = await fetchDashboardData(
      clinicIds,
      new Date(defaultStartDate),
      new Date(defaultEndDate)
    );

    return (
      <DashboardClient
        // Données des filtres
        tabClinique={cliniqueMapped}
        tabPrescripteur={prescripteurs}
        // Données du dashboard
        dashboardData={dashboardData}
        // Paramètres par défaut
        defaultStartDate={defaultStartDate}
        defaultEndDate={defaultEndDate}
        defaultPeriod={period}
        defaultCliniqueId={selectedCliniqueId}
        defaultPrescripteurId={searchParams?.prescripteur || "all"}
      />
    );
  } catch (error) {
    console.error("Erreur dans DashboardServer:", error);

    // Retourner un état d'erreur
    return (
      <DashboardClient
        tabClinique={[]}
        tabPrescripteur={[]}
        dashboardData={{}}
        defaultStartDate={new Date().toISOString().split("T")[0]}
        defaultEndDate={new Date().toISOString().split("T")[0]}
        defaultPeriod="mensuel"
        defaultCliniqueId="all"
        defaultPrescripteurId="all"
      />
    );
  }
}
