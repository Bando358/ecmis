import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import {
  getAvailableIndicators,
  getAvailableDimensions,
  getOrgUnitTree,
  listSavedAnalyses,
} from "@/lib/actions/analyticsActions";
import { getAnalyticsConfig } from "@/lib/analytics/config";
import { AnalyserClient } from "@/components/analytics/AnalyserClient";

export default async function AnalyserPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const userId = (session.user as { id: string }).id;
  const isAdmin = (session.user as { role?: string }).role === "ADMIN";

  // Charger les donnees initiales en parallele
  const [orgUnitTree, indicatorGroups, dimensions, savedAnalyses, analyticsSettings] =
    await Promise.all([
      getOrgUnitTree(userId, isAdmin),
      getAvailableIndicators(),
      getAvailableDimensions(),
      listSavedAnalyses(userId),
      getAnalyticsConfig(),
    ]);

  return (
    <div className="p-2 md:p-4">
      <AnalyserClient
        orgUnitTree={orgUnitTree}
        indicatorGroups={indicatorGroups}
        dimensions={dimensions}
        savedAnalyses={savedAnalyses}
        userId={userId}
        isAdmin={isAdmin}
        analyticsSettings={analyticsSettings}
      />
    </div>
  );
}
