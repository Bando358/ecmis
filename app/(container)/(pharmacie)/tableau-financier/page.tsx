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
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Tableau Financier</h1>
      <TableauFinancierServer searchParams={params} />
    </div>
  );
}
