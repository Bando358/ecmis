"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import { logAction } from "./journalPharmacyActions";

const AUTHORIZED_EMAIL = "bando358@gmail.com";

/**
 * Vérifie que l'utilisateur est ADMIN et a l'email autorisé.
 */
async function requirePurgeAccess() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session?.user?.email) {
    throw new Error("Non authentifié.");
  }

  if (session.user.role !== "ADMIN" || session.user.email !== AUTHORIZED_EMAIL) {
    throw new Error("Accès refusé. Vous n'êtes pas autorisé à effectuer cette action.");
  }

  return { userId: session.user.id, email: session.user.email };
}

/**
 * Récupère le nombre de clients d'une clinique.
 */
export async function countClientsByClinique(cliniqueId: string): Promise<number> {
  await requirePurgeAccess();

  if (!cliniqueId || typeof cliniqueId !== "string") {
    throw new Error("ID de clinique invalide.");
  }

  return prisma.client.count({
    where: { cliniqueId },
  });
}

/**
 * Récupère toutes les cliniques (id + nom).
 */
export async function getCliniquesForPurge() {
  await requirePurgeAccess();

  return prisma.clinique.findMany({
    select: { id: true, nomClinique: true, codeClinique: true },
    orderBy: { nomClinique: "asc" },
  });
}

/**
 * Purge tous les clients d'une clinique et toutes leurs dépendances.
 *
 * 14 modèles ont une FK Restrict vers Client (pas de cascade).
 * Ils doivent être supprimés manuellement AVANT Client.deleteMany.
 *
 * Ordre de suppression (séquentiel dans la transaction) :
 *
 * Vague 1 — Feuilles profondes (bloquent d'autres modèles non-cascade) :
 *   ContreReference → bloque Reference (FK idReference Restrict)
 *   ResultatExamen  → bloque DemandeExamen→FactureExamen (FK idFactureExamen Restrict)
 *   ResultatEchographie → bloque DemandeEchographie→FactureEchographie
 *
 * Vague 2 — Modèles parents dont les enfants Restrict sont partis :
 *   Reference, DemandeExamen (cascade FactureExamen→CommissionExamen),
 *   DemandeEchographie (cascade FactureEchographie→CommissionEchographie)
 *
 * Vague 3 — Autres modèles Restrict (feuilles simples) :
 *   RecapVisite, Ordonnance, FacturePrestation, FactureProduit,
 *   Infertilite, Vbg, Medecine, Grossesse (cascade Obstetrique/Accouchement/Saa/Cpon)
 *
 * Final — Client.deleteMany → cascade auto : Visite, Constante, Planning,
 *   Gynecologie, Ist, Obstetrique, Accouchement, Cpon, TestGrossesse, Saa,
 *   DepistageVih, PecVih, ExamenPvVih, FactureExamen, FactureEchographie,
 *   Couverture, Bilan, etc.
 */
export async function purgeClientsByClinique(cliniqueId: string) {
  const { userId } = await requirePurgeAccess();

  if (!cliniqueId || typeof cliniqueId !== "string") {
    throw new Error("ID de clinique invalide.");
  }

  // Vérifier que la clinique existe
  const clinique = await prisma.clinique.findUnique({
    where: { id: cliniqueId },
    select: { id: true, nomClinique: true, codeClinique: true },
  });

  if (!clinique) {
    throw new Error("Clinique introuvable.");
  }

  const clients = await prisma.client.findMany({
    where: { cliniqueId },
    select: { id: true, nom: true, prenom: true, code: true },
  });

  if (clients.length === 0) {
    return { count: 0, message: "Aucun client trouvé pour cette clinique." };
  }

  const clientIds = clients.map((c) => c.id);

  // Transaction interactive avec timeout étendu (60s pour gros volumes)
  await prisma.$transaction(async (tx) => {
    // --- Vague 1 : feuilles profondes qui bloquent d'autres non-cascade ---
    await tx.contreReference.deleteMany({
      where: { idClient: { in: clientIds } },
    });
    await tx.resultatExamen.deleteMany({
      where: { idClient: { in: clientIds } },
    });
    await tx.resultatEchographie.deleteMany({
      where: { idClient: { in: clientIds } },
    });

    // --- Vague 2 : parents dont les enfants Restrict sont partis ---
    await tx.reference.deleteMany({
      where: { idClient: { in: clientIds } },
    });
    await tx.demandeExamen.deleteMany({
      where: { idClient: { in: clientIds } },
    });
    await tx.demandeEchographie.deleteMany({
      where: { idClient: { in: clientIds } },
    });

    // --- Vague 3 : autres modèles Restrict (feuilles simples) ---
    await tx.recapVisite.deleteMany({
      where: { idClient: { in: clientIds } },
    });
    await tx.ordonnance.deleteMany({
      where: { ordonnanceIdClient: { in: clientIds } },
    });
    await tx.facturePrestation.deleteMany({
      where: { idClient: { in: clientIds } },
    });
    await tx.factureProduit.deleteMany({
      where: { idClient: { in: clientIds } },
    });
    await tx.infertilite.deleteMany({
      where: { infertIdClient: { in: clientIds } },
    });
    await tx.vbg.deleteMany({
      where: { vbgIdClient: { in: clientIds } },
    });
    await tx.medecine.deleteMany({
      where: { mdgIdClient: { in: clientIds } },
    });
    await tx.grossesse.deleteMany({
      where: { grossesseIdClient: { in: clientIds } },
    });

    // --- Final : cascade auto sur tous les modèles restants ---
    await tx.client.deleteMany({
      where: { cliniqueId },
    });
  }, { timeout: 60000 });

  await logAction({
    idUser: userId,
    action: "SUPPRESSION",
    entite: "PurgeClients",
    entiteId: cliniqueId,
    idClinique: cliniqueId,
    description: `Purge de ${clients.length} client(s) de la clinique ${clinique?.nomClinique ?? cliniqueId} (${clinique?.codeClinique ?? ""})`,
  });

  return {
    count: clients.length,
    message: `${clients.length} client(s) supprimé(s) avec succès.`,
  };
}
