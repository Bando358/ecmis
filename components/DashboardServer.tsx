// components/DashboardServer.tsx
// Ce composant est un Server Component (par défaut dans App Router)
import { getAllUserIncludedTabIdClinique } from "@/lib/actions/authActions";
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

    // 🔹 Récupération des prescripteurs (optimisé: 1 seule requête au lieu de N)
    const allIds = cliniqueMapped.map((c: { id: string }) => c.id);
    const allPrescripteurs = await getAllUserIncludedTabIdClinique(allIds);

    const prescripteurs = allPrescripteurs.map(
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
        cliniqueId: p.idCliniques?.[0] ?? "",
      })
    );

    // 🔹 Calcul des dates par défaut - Premier jour du mois en cours par défaut
    const period = searchParams?.period || "mensuel";

    const calculateStartDate = (period: string) => {
      const now = new Date();
      switch (period) {
        case "quotidien":
          // Aujourd'hui
          return new Date(now.getFullYear(), now.getMonth(), now.getDate());
        case "hebdomadaire":
          // 7 jours en arrière
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          return weekAgo;
        case "mensuel":
          // Premier jour du mois courant
          return new Date(now.getFullYear(), now.getMonth(), 1);
        case "bimestriel":
          // 2 mois en arrière (premier jour)
          return new Date(now.getFullYear(), now.getMonth() - 1, 1);
        case "trimestriel":
          // 3 mois en arrière (premier jour)
          return new Date(now.getFullYear(), now.getMonth() - 2, 1);
        case "semestriel":
          // 6 mois en arrière (premier jour)
          return new Date(now.getFullYear(), now.getMonth() - 5, 1);
        case "annuel":
          // Premier jour de l'année
          return new Date(now.getFullYear(), 0, 1);
        default:
          // Par défaut: Premier jour du mois courant
          return new Date(now.getFullYear(), now.getMonth(), 1);
      }
    };

    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    // 🔹 Fonction de validation des dates
    const isValidDate = (dateStr: string): boolean => {
      const date = new Date(dateStr);
      return !isNaN(date.getTime());
    };

    // 🔹 Calcul des dates avec validation
    const rawStartDate = searchParams?.startDate;
    const rawEndDate = searchParams?.endDate;

    // Valider et utiliser les dates fournies ou les valeurs par défaut
    let defaultStartDate = formatDate(calculateStartDate(period));
    let defaultEndDate = formatDate(new Date());

    if (rawStartDate && isValidDate(rawStartDate)) {
      defaultStartDate = rawStartDate;
    }
    if (rawEndDate && isValidDate(rawEndDate)) {
      defaultEndDate = rawEndDate;
    }

    // S'assurer que startDate <= endDate
    if (new Date(defaultStartDate) > new Date(defaultEndDate)) {
      // Inverser si startDate > endDate
      [defaultStartDate, defaultEndDate] = [defaultEndDate, defaultStartDate];
    }

    // Limiter la plage à 2 ans maximum pour éviter les surcharges
    const maxDays = 730; // 2 ans
    const daysDiff = Math.ceil(
      (new Date(defaultEndDate).getTime() - new Date(defaultStartDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff > maxDays) {
      // Réduire startDate pour respecter la limite
      const limitedStart = new Date(defaultEndDate);
      limitedStart.setDate(limitedStart.getDate() - maxDays);
      defaultStartDate = formatDate(limitedStart);
    }

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
        defaultCliniqueId={selectedCliniqueId}
        defaultPrescripteurId={searchParams?.prescripteur || "all"}
      />
    );
  } catch (error) {
    console.error("Erreur dans DashboardServer:", error);

    // Déterminer le message d'erreur approprié
    const errorMsg = error instanceof Error
      ? `Erreur lors du chargement des données: ${error.message}`
      : "Une erreur inattendue s'est produite lors du chargement du dashboard. Veuillez réessayer.";

    // Retourner un état d'erreur avec message
    return (
      <DashboardClient
        tabClinique={[]}
        tabPrescripteur={[]}
        dashboardData={{}}
        defaultStartDate={new Date().toISOString().split("T")[0]}
        defaultEndDate={new Date().toISOString().split("T")[0]}
        defaultCliniqueId="all"
        defaultPrescripteurId="all"
        errorMessage={errorMsg}
      />
    );
  }
}
