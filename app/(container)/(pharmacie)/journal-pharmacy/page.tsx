import { getAllClinique } from "@/lib/actions/cliniqueActions";
import {
  fetchJournalEntries,
  fetchJournalStats,
} from "@/lib/actions/journalPharmacyActions";
import JournalPharmacyClient from "@/components/JournalPharmacyClient";

export default async function JournalPharmacyPage() {
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
