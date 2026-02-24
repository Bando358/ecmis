import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TableName } from "@prisma/client";
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
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") {
    const perm = await prisma.permission.findFirst({
      where: { userId: session.user.id, table: TableName.ANALYSE_VISUALISER },
      select: { canRead: true },
    });
    if (!perm?.canRead) redirect("/dashboard");
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
