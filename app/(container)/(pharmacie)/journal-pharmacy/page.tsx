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
    const [cliniques, journalData, stats] = await Promise.all([
      getAllClinique(),
      fetchJournalEntries({ page: 1, pageSize: 50 }),
      fetchJournalStats(),
    ]);

    return (
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold">Journal des actions - Pharmacie</h1>
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
      <div className="p-4">
        <h1 className="text-2xl font-bold">Journal des actions - Pharmacie</h1>
        <p className="text-red-500 mt-4">
          Erreur lors du chargement du journal.
        </p>
      </div>
    );
  }
}
