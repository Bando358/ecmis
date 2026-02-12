"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import { TableName, User } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SpinnerCustom } from "@/components/ui/spinner";
import { getOneUser } from "@/lib/actions/authActions";

export default function Administrator() {
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [oneUser, setOneUser] = useState<User | null>(null);
  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const router = useRouter();

  useEffect(() => {
    const fetUser = async () => {
      const user = await getOneUser(idUser);
      setOneUser(user);
    };
    fetUser();
  }, [idUser]);

  useEffect(() => {
    if (!oneUser) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(oneUser.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.ADMINISTRATION
        );

        if (perm?.canRead || oneUser.role === "ADMIN") {
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
  }, [oneUser]);

  if (isCheckingPermissions) {
    return (
      <div className="flex gap-2 justify-center items-center h-64">
        <p className="text-gray-500">Vérification des permissions</p>
        <SpinnerCustom />
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
      label: "Sauvegarde de la base",
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
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TabAdmin.map((row, index) => (
                <li key={index} className="relative">
                  <Link
                    href={row.href}
                    prefetch={false}
                    className="group relative block p-2 bg-white rounded-2xl
          overflow-hidden
          transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
          hover:-translate-y-1.5
          hover:shadow-xl hover:shadow-blue-100/60
          hover:bg-linear-to-br hover:from-white hover:to-blue-50"
                  >
                    {/* Halo lumineux */}
                    <div
                      className="pointer-events-none absolute inset-0 opacity-0
            bg-linear-to-r from-blue-100/40 via-transparent to-blue-100/40
            group-hover:opacity-100
            transition-opacity duration-500"
                    />

                    {/* Bordure animée */}
                    <div
                      className="absolute bottom-0 left-6 right-6 h-0.5
            bg-linear-to-r from-transparent via-blue-500 to-transparent
            scale-x-0 group-hover:scale-x-100
            transition-transform duration-500 origin-center"
                    />

                    {/* Point animé */}
                    <div
                      className="absolute top-2 left-5 w-2.5 h-2.5 rounded-full bg-blue-500
            scale-0 group-hover:scale-100
            group-hover:animate-pulse
            transition-transform duration-300 delay-150"
                    />

                    {/* Contenu */}
                    <span
                      className="relative flex flex-col pl-6 text-gray-700
            transition-all duration-300
            group-hover:text-blue-700
            group-hover:translate-x-1"
                    >
                      <span className="font-medium group-hover:font-semibold">
                        {row.label}
                      </span>

                      <span
                        className="text-sm text-gray-400 mt-1
              transition-colors duration-300
              group-hover:text-blue-400"
                      >
                        {/* optionnel : description */}
                      </span>
                    </span>
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
