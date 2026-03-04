import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TableName } from "@prisma/client";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import {
  fetchJournalEntries,
  fetchJournalStats,
} from "@/lib/actions/journalPharmacyActions";
import JournalPharmacyClient from "@/components/JournalPharmacyClient";
import { ClipboardList } from "lucide-react";

export default async function JournalPharmacyPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") {
    const perm = await prisma.permission.findFirst({
      where: { userId: session.user.id, table: TableName.JOURNAL_PHARMACIE },
      select: { canRead: true },
    });
    if (!perm?.canRead) redirect("/dashboard");
  }

  try {
    const [allCliniques, journalData, stats, user] = await Promise.all([
      getAllClinique(),
      fetchJournalEntries({ page: 1, pageSize: 50 }),
      fetchJournalStats(),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { idCliniques: true, role: true },
      }),
    ]);

    // Filtrer les cliniques selon le rôle
    const cliniques =
      session.user.role === "ADMIN"
        ? allCliniques
        : allCliniques.filter((c) =>
            user?.idCliniques?.includes(c.id)
          );

    return (
      <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
            Journal des Actions
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Historique complet des opérations pharmaceutiques
          </p>
        </div>
        <JournalPharmacyClient
          initialLogs={journalData.logs}
          initialTotal={journalData.total}
          initialPage={journalData.page}
          initialTotalPages={journalData.totalPages}
          tabClinique={cliniques}
          stats={stats}
        />
      </div>
    );
  } catch (error) {
    console.error("Erreur JournalPharmacyPage:", error);
    return (
      <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
            Journal des Actions
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Historique complet des opérations pharmaceutiques
          </p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <ClipboardList className="mx-auto h-12 w-12 text-red-400 mb-3" />
          <p className="text-red-700 font-medium">
            Erreur lors du chargement du journal.
          </p>
          <p className="text-xs text-red-500 mt-1">
            Veuillez rafraîchir la page ou réessayer plus tard.
          </p>
        </div>
      </div>
    );
  }
}
