"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import { TableName } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SpinnerCustom } from "@/components/ui/spinner";

export default function Administrator() {
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session?.user) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(session.user.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.ADMINISTRATION
        );

        if (perm?.canRead || session.user.role === "ADMIN") {
          setHasAccess(true);
        } else {
          alert("Vous n'avez pas la permission d'accéder à cette page.");
          router.back();
        }
      } catch (error) {
        console.error(
          "Erreur lors de la vérification des permissions :",
          error
        );
      } finally {
        setIsCheckingPermissions(false);
      }
    };

    fetchPermissions();
  }, [session?.user, router]);

  if (isCheckingPermissions) {
    return (
      <div className="flex gap-2 justify-center items-center h-64">
        <p className="text-gray-500">Vérification des permissions</p>
        <SpinnerCustom className="text-2xl text-gray-300" />
      </div>
    );
  }

  if (!hasAccess) return null;

  const TabAdmin = [
    { label: "Création d'une région", href: `/fiche-region/` },
    {
      label: "Création d'une clinique",
      href: `/fiche-clinique/`,
    },
    { label: "Création de compte", href: `/fiche-compte/` },
    // {
    //   label: "Création d'un fournisseur produit",
    //   href: `/fiche-fournisseur/`,
    // },
    { label: "Création d'un post", href: `/fiche-post/` },
    {
      label: "Création des permissions",
      href: `/fiche-permissions/`,
    },
    {
      label: "Création d'une activité",
      href: `/fiche-activites/`,
    },
    {
      label: "Page Sauvegarde",
      href: `/sauvegarde`,
    },
  ];

  return (
    <div>
      <h2 className="text-center text-xl font-bold uppercase text-gray-600">
        Administration
      </h2>

      <div className="max-w-225 mx-auto relative flex flex-col justify-center p-4 rounded-md">
        <Card>
          <CardContent>
            <ul className="space-y-4 grid grid-cols-3 gap-4">
              {TabAdmin.map((row, index) => (
                <li key={index}>
                  <Link
                    href={row.href}
                    className="group hover:font-semibold hover:bg-slate-50"
                  >
                    {row.label}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
