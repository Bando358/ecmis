"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import ClientVihUploadPage from "@/components/clientVihUpload";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import { TableName } from "@prisma/client";
import VisitePecVihUpload from "@/components/PecVihUpload";
import { SpinnerBar } from "@/components/ui/spinner-bar";

export default function ToggleSystemPecVih() {
  const [showA, setShowA] = useState(true);
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
          (p: { table: string }) => p.table === TableName.IMPORT_CLIENT_VIH
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
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">Vérification des permissions</p>
        <SpinnerBar />
      </div>
    );
  }

  if (!hasAccess) return null;

  return (
    <div className="p-6 border rounded-lg">
      {/* Bouton toggle */}
      <div className="flex justify-center mb-4">
        <Button variant="outline" onClick={() => setShowA(!showA)}>
          {showA ? "Créer les visites B" : "Créer les Clients PVVIH A"}
        </Button>
      </div>

      {/* Zone avec animation */}
      <AnimatePresence mode="wait">
        {showA ? (
          <motion.div
            key="A"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
          >
            <VisitePecVihUpload />
          </motion.div>
        ) : (
          <motion.div
            key="B"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
          >
            <ClientVihUploadPage />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
