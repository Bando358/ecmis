"use client";

import { useState, useEffect } from "react";
import ClientVihUploadPage from "@/components/clientVihUpload";
import VisitePecVihUpload from "@/components/PecVihUpload";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import { TableName, User } from "@prisma/client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getOneUser } from "@/lib/actions/authActions";
import { SpinnerCustom } from "@/components/ui/spinner";

export default function ToggleSystemPecVih() {
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
  const [oneUser, setOneUser] = useState<User | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      if (!idUser) {
        setIsCheckingPermissions(false);
        return;
      }

      try {
        const user = await getOneUser(idUser);
        if (!user) {
          alert("Utilisateur introuvable.");
          router.back();
          setIsCheckingPermissions(false);
          return;
        }
        setOneUser(user);
      } catch (error) {
        console.error(
          "Erreur lors de la récupération de l'utilisateur :",
          error
        );
        setIsCheckingPermissions(false);
      }
    };
    fetchData();
  }, [idUser, router]);

  useEffect(() => {
    if (!oneUser) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(oneUser.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.IMPORT_CLIENT_VIH
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
  }, [oneUser, router]);

  if (isCheckingPermissions) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">Vérification des permissions</p>
        <SpinnerCustom className="mx-2" />
      </div>
    );
  }

  if (!hasAccess) return null;

  return (
    <div className="p-6 rounded-lg max-w-4xl mx-auto space-y-6 shadow-sm">
      {/* Tabs */}
      <Tabs defaultValue="visite">
        <TabsList>
          <TabsTrigger value="visite">Listing patient en soins</TabsTrigger>
          <TabsTrigger value="caractéristiques">
            Listing caractéristiques
          </TabsTrigger>
        </TabsList>
        <TabsContent value="visite">
          <Card>
            <CardHeader>
              <CardTitle>Patient en soins</CardTitle>
              <CardDescription>
                Veuillez importer la liste des patients VIH du mois
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <VisitePecVihUpload />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="caractéristiques">
          <Card>
            <CardHeader>
              <CardTitle>Listing caractéristiques</CardTitle>
              <CardDescription>
                Veuillez importer la liste des caractéristiques des patients VIH
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <ClientVihUploadPage />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
