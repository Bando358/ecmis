import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TableName } from "@prisma/client";
import GestionRdv from "@/components/rendez-vous-dashboard";

export default async function GestionRdvPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") {
    const perm = await prisma.permission.findFirst({
      where: { userId: session.user.id, table: TableName.GESTION_RDV },
      select: { canRead: true },
    });
    if (!perm?.canRead) redirect("/dashboard");
  }

  return <GestionRdv />;
}
