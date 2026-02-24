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
  loadSavedAnalysis,
} from "@/lib/actions/analyticsActions";
import { getAnalyticsConfig } from "@/lib/analytics/config";
import { AnalyserClient } from "@/components/analytics/AnalyserClient";

export default async function SavedAnalysisPage({
  params,
}: {
  params: Promise<{ analysisId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") {
    const perm = await prisma.permission.findFirst({
      where: { userId: session.user.id, table: TableName.ANALYSE_VISUALISER },
      select: { canRead: true },
    });
    if (!perm?.canRead) redirect("/dashboard");
  }

  const { analysisId } = await params;
  const userId = (session.user as { id: string }).id;
  const isAdmin = (session.user as { role?: string }).role === "ADMIN";

  const [orgUnitTree, indicatorGroups, dimensions, savedAnalyses, loadedAnalysis, analyticsSettings] =
    await Promise.all([
      getOrgUnitTree(userId, isAdmin),
      getAvailableIndicators(),
      getAvailableDimensions(),
      listSavedAnalyses(userId),
      loadSavedAnalysis(analysisId),
      getAnalyticsConfig(),
    ]);

  if (!loadedAnalysis) {
    redirect("/analyser");
  }

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
        initialAnalysis={{
          id: loadedAnalysis.id,
          name: loadedAnalysis.name,
          config: loadedAnalysis.configuration,
        }}
      />
    </div>
  );
}
