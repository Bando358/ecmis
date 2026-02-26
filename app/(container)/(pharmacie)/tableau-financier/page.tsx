import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TableName } from "@prisma/client";
import TableauFinancierServer from "@/components/TableauFinancierServer";

export default async function TableauFinancierPage({
  searchParams,
}: {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    clinique?: string;
  }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") {
    const perm = await prisma.permission.findFirst({
      where: { userId: session.user.id, table: TableName.TABLEAU_FINANCIER },
      select: { canRead: true },
    });
    if (!perm?.canRead) redirect("/dashboard");
  }

  const params = await searchParams;
  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
          Tableau Financier
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Vue d&apos;ensemble des recettes et dépenses par période
        </p>
      </div>
      <TableauFinancierServer searchParams={params} />
    </div>
  );
}
