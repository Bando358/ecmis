import { getAllClinique } from "@/lib/actions/cliniqueActions";
import { fetchFinancialDashboardData } from "@/lib/actions/financialDashboardActions";
import TableauFinancierClient from "./TableauFinancierClient";

interface TableauFinancierServerProps {
  searchParams?: {
    startDate?: string;
    endDate?: string;
    clinique?: string;
  };
}

export default async function TableauFinancierServer({
  searchParams,
}: TableauFinancierServerProps) {
  try {
    const cliniqueRaw = await getAllClinique();
    const cliniqueMapped = cliniqueRaw.map(
      (c: { id: string; nomClinique: string }) => ({
        id: c.id,
        name: c.nomClinique,
      })
    );

    // Dates par defaut : premier jour du mois en cours -> aujourd'hui
    const now = new Date();
    const formatDate = (date: Date) => date.toISOString().split("T")[0];

    const defaultStartDate = formatDate(
      new Date(now.getFullYear(), now.getMonth(), 1)
    );
    const defaultEndDate = formatDate(now);

    const startDate = searchParams?.startDate || defaultStartDate;
    const endDate = searchParams?.endDate || defaultEndDate;

    const selectedCliniqueId = searchParams?.clinique || "all";
    const clinicIds =
      selectedCliniqueId === "all"
        ? cliniqueMapped.map((c: { id: string }) => c.id)
        : [selectedCliniqueId];

    const currentFrom = new Date(startDate);
    const currentTo = new Date(endDate + "T23:59:59");

    // Taux de croissance uniquement si la periode > 14 jours
    const durationDays = Math.round(
      (currentTo.getTime() - currentFrom.getTime()) / (1000 * 60 * 60 * 24)
    );

    let previousFrom: Date | null = null;
    let previousTo: Date | null = null;

    if (durationDays > 14) {
      const startDay = currentFrom.getDate();
      const startMonth = currentFrom.getMonth();
      const startYear = currentFrom.getFullYear();
      const endDay = currentTo.getDate();
      const endMonth = currentTo.getMonth();
      const endYear = currentTo.getFullYear();

      // Nombre de mois entre debut et fin
      const monthSpan = (endYear - startYear) * 12 + (endMonth - startMonth);
      const offset = monthSpan + 1;

      previousFrom = new Date(startYear, startMonth - offset, startDay);

      // Si la fin tombe sur le dernier jour du mois, ajuster
      const lastDayOfEndMonth = new Date(endYear, endMonth + 1, 0).getDate();
      const isEndOfMonth = endDay === lastDayOfEndMonth;

      if (isEndOfMonth) {
        const prevEndMonth = endMonth - offset;
        const lastDayPrevMonth = new Date(endYear, prevEndMonth + 1, 0).getDate();
        previousTo = new Date(endYear, prevEndMonth, lastDayPrevMonth, 23, 59, 59);
      } else {
        previousTo = new Date(endYear, endMonth - offset, endDay, 23, 59, 59);
      }
    }

    const dashboardData = await fetchFinancialDashboardData(
      clinicIds,
      currentFrom,
      currentTo,
      previousFrom,
      previousTo
    );

    return (
      <TableauFinancierClient
        tabClinique={cliniqueMapped}
        dashboardData={dashboardData}
        defaultStartDate={startDate}
        defaultEndDate={endDate}
        defaultCliniqueId={selectedCliniqueId}
      />
    );
  } catch (error) {
    console.error("Erreur TableauFinancierServer:", error);
    return (
      <div className="p-4 text-red-500">
        Erreur lors du chargement du tableau financier.
      </div>
    );
  }
}
