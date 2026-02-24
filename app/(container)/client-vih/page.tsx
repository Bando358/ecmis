"use client";

import { useEffect } from "react";
import ClientVihUploadPage from "@/components/clientVihUpload";
import VisitePecVihUpload from "@/components/PecVihUpload";
import { useRouter } from "next/navigation";
import { TableName } from "@prisma/client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpinnerCustom } from "@/components/ui/spinner";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { toast } from "sonner";

export default function ToggleSystemPecVih() {
  const { canRead, isLoading: isCheckingPermissions } = usePermissionContext();
  const router = useRouter();

  const hasAccess = canRead(TableName.IMPORT_CLIENT_VIH);

  useEffect(() => {
    if (!isCheckingPermissions && !hasAccess) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_READ);
      router.back();
    }
  }, [isCheckingPermissions, hasAccess, router]);

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
