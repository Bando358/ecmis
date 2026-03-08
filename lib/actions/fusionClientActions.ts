"use server";

import prisma from "@/lib/prisma";
import { TableName } from "@prisma/client";
import { requirePermission } from "@/lib/auth/withPermission";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClientDoublon = {
  id: string;
  nom: string;
  prenom: string;
  dateNaissance: Date;
  sexe: string;
  tel_1: string;
  tel_2: string;
  code: string;
  codeVih: string | null;
  profession: string | null;
  quartier: string | null;
  etatMatrimonial: string | null;
  statusClient: string;
  sourceInfo: string;
  dateEnregistrement: Date;
  idClinique: string;
  cliniqueId: string;
  clinique: { nomClinique: string };
  _count: {
    Visite: number;
  };
};

export type DoublonGroup = {
  key: string;
  clients: ClientDoublon[];
  matchType: "exact" | "similaire";
  matchFields: string[];
};

export type ConflictField = {
  field: string;
  label: string;
  valueA: string;
  valueB: string;
};

export type FusionHistorique = {
  id: string;
  clientPrincipalId: string;
  clientFusionneId: string;
  clientFusionneNom: string;
  clientFusionneCode: string;
  dateFusion: Date;
  utilisateurNom: string;
  relationsTransferees: number;
};

// ─── Détection des doublons ──────────────────────────────────────────────────

export async function detecterDoublons(
  cliniqueIds: string[]
): Promise<DoublonGroup[]> {
  await requirePermission(TableName.FUSION_CLIENT, "canRead");

  // Récupérer tous les clients des cliniques sélectionnées
  const clients = await prisma.client.findMany({
    where: { cliniqueId: { in: cliniqueIds } },
    select: {
      id: true,
      nom: true,
      prenom: true,
      dateNaissance: true,
      sexe: true,
      tel_1: true,
      tel_2: true,
      code: true,
      codeVih: true,
      profession: true,
      quartier: true,
      etatMatrimonial: true,
      statusClient: true,
      sourceInfo: true,
      dateEnregistrement: true,
      idClinique: true,
      cliniqueId: true,
      clinique: { select: { nomClinique: true } },
      _count: { select: { Visite: true } },
    },
    orderBy: { nom: "asc" },
  });

  const groups: Map<string, DoublonGroup> = new Map();

  // Phase 1: Correspondance exacte nom + prénom + date de naissance
  const exactMap = new Map<string, ClientDoublon[]>();
  for (const c of clients) {
    const key = `${normalize(c.nom)}|${normalize(c.prenom)}|${c.dateNaissance.toISOString().split("T")[0]}`;
    if (!exactMap.has(key)) exactMap.set(key, []);
    exactMap.get(key)!.push(c as ClientDoublon);
  }

  for (const [key, group] of exactMap) {
    if (group.length >= 2) {
      groups.set(key, {
        key,
        clients: group,
        matchType: "exact",
        matchFields: ["nom", "prenom", "dateNaissance"],
      });
    }
  }

  // Phase 2: Correspondance nom + prénom similaire (Levenshtein)
  for (let i = 0; i < clients.length; i++) {
    for (let j = i + 1; j < clients.length; j++) {
      const a = clients[i];
      const b = clients[j];

      // Ne pas doublonner ce qui est déjà trouvé en exact
      const exactKeyA = `${normalize(a.nom)}|${normalize(a.prenom)}|${a.dateNaissance.toISOString().split("T")[0]}`;
      const exactKeyB = `${normalize(b.nom)}|${normalize(b.prenom)}|${b.dateNaissance.toISOString().split("T")[0]}`;
      if (exactKeyA === exactKeyB) continue;

      const matchFields: string[] = [];

      // Similarité sur nom+prénom
      const simNom = similarity(normalize(a.nom), normalize(b.nom));
      const simPrenom = similarity(normalize(a.prenom), normalize(b.prenom));
      if (simNom >= 0.8 && simPrenom >= 0.8) {
        matchFields.push("nom", "prenom");
      }

      // Même date de naissance
      if (
        a.dateNaissance.toISOString().split("T")[0] ===
        b.dateNaissance.toISOString().split("T")[0]
      ) {
        matchFields.push("dateNaissance");
      }

      // Même téléphone
      if (a.tel_1 && b.tel_1 && a.tel_1 === b.tel_1) {
        matchFields.push("tel_1");
      }

      // Considérer comme doublon si 2+ critères matchent
      if (matchFields.length >= 2) {
        const key = [a.id, b.id].sort().join("|");
        if (!groups.has(key)) {
          groups.set(key, {
            key,
            clients: [a as ClientDoublon, b as ClientDoublon],
            matchType: "similaire",
            matchFields: [...new Set(matchFields)],
          });
        }
      }
    }
  }

  return Array.from(groups.values());
}

// ─── Comparer deux clients ───────────────────────────────────────────────────

export async function comparerClients(
  clientAId: string,
  clientBId: string
): Promise<{ clientA: ClientDoublon; clientB: ClientDoublon; conflicts: ConflictField[] }> {
  await requirePermission(TableName.FUSION_CLIENT, "canRead");

  const selectFields = {
    id: true,
    nom: true,
    prenom: true,
    dateNaissance: true,
    sexe: true,
    tel_1: true,
    tel_2: true,
    code: true,
    codeVih: true,
    profession: true,
    quartier: true,
    etatMatrimonial: true,
    statusClient: true,
    sourceInfo: true,
    dateEnregistrement: true,
    idClinique: true,
    cliniqueId: true,
    clinique: { select: { nomClinique: true } },
    _count: { select: { Visite: true } },
  };

  const [clientA, clientB] = await Promise.all([
    prisma.client.findUniqueOrThrow({ where: { id: clientAId }, select: selectFields }),
    prisma.client.findUniqueOrThrow({ where: { id: clientBId }, select: selectFields }),
  ]);

  const conflictChecks: { field: string; label: string }[] = [
    { field: "tel_1", label: "Téléphone 1" },
    { field: "tel_2", label: "Téléphone 2" },
    { field: "profession", label: "Profession" },
    { field: "quartier", label: "Quartier" },
    { field: "etatMatrimonial", label: "État matrimonial" },
    { field: "sexe", label: "Sexe" },
    { field: "sourceInfo", label: "Source info" },
    { field: "statusClient", label: "Statut" },
    { field: "codeVih", label: "Code VIH" },
  ];

  const conflicts: ConflictField[] = [];
  for (const check of conflictChecks) {
    const vA = (clientA as Record<string, unknown>)[check.field];
    const vB = (clientB as Record<string, unknown>)[check.field];
    if (vA !== vB && (vA || vB)) {
      conflicts.push({
        field: check.field,
        label: check.label,
        valueA: String(vA ?? ""),
        valueB: String(vB ?? ""),
      });
    }
  }

  return {
    clientA: clientA as ClientDoublon,
    clientB: clientB as ClientDoublon,
    conflicts,
  };
}

// ─── Compter les relations d'un client ───────────────────────────────────────

export async function compterRelationsClient(clientId: string): Promise<number> {
  await requirePermission(TableName.FUSION_CLIENT, "canRead");

  const counts = await Promise.all([
    prisma.visite.count({ where: { idClient: clientId } }),
    prisma.recapVisite.count({ where: { idClient: clientId } }),
    prisma.constante.count({ where: { idClient: clientId } }),
    prisma.planning.count({ where: { idClient: clientId } }),
    prisma.gynecologie.count({ where: { idClient: clientId } }),
    prisma.ist.count({ where: { istIdClient: clientId } }),
    prisma.infertilite.count({ where: { infertIdClient: clientId } }),
    prisma.vbg.count({ where: { vbgIdClient: clientId } }),
    prisma.medecine.count({ where: { mdgIdClient: clientId } }),
    prisma.grossesse.count({ where: { grossesseIdClient: clientId } }),
    prisma.obstetrique.count({ where: { obstIdClient: clientId } }),
    prisma.accouchement.count({ where: { accouchementIdClient: clientId } }),
    prisma.cpon.count({ where: { cponIdClient: clientId } }),
    prisma.testGrossesse.count({ where: { testIdClient: clientId } }),
    prisma.saa.count({ where: { saaIdClient: clientId } }),
    prisma.depistageVih.count({ where: { depistageVihIdClient: clientId } }),
    prisma.pecVih.count({ where: { pecVihIdClient: clientId } }),
    prisma.examenPvVih.count({ where: { examenPvVihIdClient: clientId } }),
    prisma.reference.count({ where: { idClient: clientId } }),
    prisma.contreReference.count({ where: { idClient: clientId } }),
    prisma.ordonnance.count({ where: { ordonnanceIdClient: clientId } }),
    prisma.demandeExamen.count({ where: { idClient: clientId } }),
    prisma.factureExamen.count({ where: { idClient: clientId } }),
    prisma.resultatExamen.count({ where: { idClient: clientId } }),
    prisma.demandeEchographie.count({ where: { idClient: clientId } }),
    prisma.factureEchographie.count({ where: { idClient: clientId } }),
    prisma.resultatEchographie.count({ where: { idClient: clientId } }),
    prisma.facturePrestation.count({ where: { idClient: clientId } }),
    prisma.factureProduit.count({ where: { idClient: clientId } }),
    prisma.bilan.count({ where: { bilanIdClient: clientId } }),
    prisma.couverture.count({ where: { couvertIdClient: clientId } }),
  ]);

  return counts.reduce((sum, c) => sum + c, 0);
}

// ─── Fusionner deux clients ──────────────────────────────────────────────────

export async function fusionnerClients(
  clientPrincipalId: string,
  clientSecondaireId: string,
  conflictResolutions: Record<string, string>
): Promise<{ success: boolean; relationsTransferees: number }> {
  const { userId } = await requirePermission(TableName.FUSION_CLIENT, "canCreate");

  // Vérifier que les deux clients existent
  const [principal, secondaire, user] = await Promise.all([
    prisma.client.findUniqueOrThrow({ where: { id: clientPrincipalId } }),
    prisma.client.findUniqueOrThrow({ where: { id: clientSecondaireId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ]);

  if (principal.id === secondaire.id) {
    throw new Error("Impossible de fusionner un client avec lui-même.");
  }

  // Exécuter dans une transaction atomique
  const result = await prisma.$transaction(async (tx) => {
    let relationsTransferees = 0;

    // 1. Transférer toutes les relations du secondaire vers le principal
    // --- Relations avec idClient ---
    const visites = await tx.visite.updateMany({ where: { idClient: clientSecondaireId }, data: { idClient: clientPrincipalId } });
    relationsTransferees += visites.count;

    const recaps = await tx.recapVisite.updateMany({ where: { idClient: clientSecondaireId }, data: { idClient: clientPrincipalId } });
    relationsTransferees += recaps.count;

    const constantes = await tx.constante.updateMany({ where: { idClient: clientSecondaireId }, data: { idClient: clientPrincipalId } });
    relationsTransferees += constantes.count;

    const plannings = await tx.planning.updateMany({ where: { idClient: clientSecondaireId }, data: { idClient: clientPrincipalId } });
    relationsTransferees += plannings.count;

    const gyneco = await tx.gynecologie.updateMany({ where: { idClient: clientSecondaireId }, data: { idClient: clientPrincipalId } });
    relationsTransferees += gyneco.count;

    const references = await tx.reference.updateMany({ where: { idClient: clientSecondaireId }, data: { idClient: clientPrincipalId } });
    relationsTransferees += references.count;

    const contreRefs = await tx.contreReference.updateMany({ where: { idClient: clientSecondaireId }, data: { idClient: clientPrincipalId } });
    relationsTransferees += contreRefs.count;

    const demandesExamen = await tx.demandeExamen.updateMany({ where: { idClient: clientSecondaireId }, data: { idClient: clientPrincipalId } });
    relationsTransferees += demandesExamen.count;

    const facturesExamen = await tx.factureExamen.updateMany({ where: { idClient: clientSecondaireId }, data: { idClient: clientPrincipalId } });
    relationsTransferees += facturesExamen.count;

    const resultatsExamen = await tx.resultatExamen.updateMany({ where: { idClient: clientSecondaireId }, data: { idClient: clientPrincipalId } });
    relationsTransferees += resultatsExamen.count;

    const demandesEcho = await tx.demandeEchographie.updateMany({ where: { idClient: clientSecondaireId }, data: { idClient: clientPrincipalId } });
    relationsTransferees += demandesEcho.count;

    const facturesEcho = await tx.factureEchographie.updateMany({ where: { idClient: clientSecondaireId }, data: { idClient: clientPrincipalId } });
    relationsTransferees += facturesEcho.count;

    const resultatsEcho = await tx.resultatEchographie.updateMany({ where: { idClient: clientSecondaireId }, data: { idClient: clientPrincipalId } });
    relationsTransferees += resultatsEcho.count;

    const facturesPrestation = await tx.facturePrestation.updateMany({ where: { idClient: clientSecondaireId }, data: { idClient: clientPrincipalId } });
    relationsTransferees += facturesPrestation.count;

    const facturesProduit = await tx.factureProduit.updateMany({ where: { idClient: clientSecondaireId }, data: { idClient: clientPrincipalId } });
    relationsTransferees += facturesProduit.count;

    // --- Relations avec préfixes spécifiques ---
    const ist = await tx.ist.updateMany({ where: { istIdClient: clientSecondaireId }, data: { istIdClient: clientPrincipalId } });
    relationsTransferees += ist.count;

    const infert = await tx.infertilite.updateMany({ where: { infertIdClient: clientSecondaireId }, data: { infertIdClient: clientPrincipalId } });
    relationsTransferees += infert.count;

    const vbg = await tx.vbg.updateMany({ where: { vbgIdClient: clientSecondaireId }, data: { vbgIdClient: clientPrincipalId } });
    relationsTransferees += vbg.count;

    const mdg = await tx.medecine.updateMany({ where: { mdgIdClient: clientSecondaireId }, data: { mdgIdClient: clientPrincipalId } });
    relationsTransferees += mdg.count;

    const grossesse = await tx.grossesse.updateMany({ where: { grossesseIdClient: clientSecondaireId }, data: { grossesseIdClient: clientPrincipalId } });
    relationsTransferees += grossesse.count;

    const obstetrique = await tx.obstetrique.updateMany({ where: { obstIdClient: clientSecondaireId }, data: { obstIdClient: clientPrincipalId } });
    relationsTransferees += obstetrique.count;

    const accouchement = await tx.accouchement.updateMany({ where: { accouchementIdClient: clientSecondaireId }, data: { accouchementIdClient: clientPrincipalId } });
    relationsTransferees += accouchement.count;

    const cpon = await tx.cpon.updateMany({ where: { cponIdClient: clientSecondaireId }, data: { cponIdClient: clientPrincipalId } });
    relationsTransferees += cpon.count;

    const testGrossesse = await tx.testGrossesse.updateMany({ where: { testIdClient: clientSecondaireId }, data: { testIdClient: clientPrincipalId } });
    relationsTransferees += testGrossesse.count;

    const saa = await tx.saa.updateMany({ where: { saaIdClient: clientSecondaireId }, data: { saaIdClient: clientPrincipalId } });
    relationsTransferees += saa.count;

    const depistage = await tx.depistageVih.updateMany({ where: { depistageVihIdClient: clientSecondaireId }, data: { depistageVihIdClient: clientPrincipalId } });
    relationsTransferees += depistage.count;

    const pecVih = await tx.pecVih.updateMany({ where: { pecVihIdClient: clientSecondaireId }, data: { pecVihIdClient: clientPrincipalId } });
    relationsTransferees += pecVih.count;

    const examenPv = await tx.examenPvVih.updateMany({ where: { examenPvVihIdClient: clientSecondaireId }, data: { examenPvVihIdClient: clientPrincipalId } });
    relationsTransferees += examenPv.count;

    const ordonnance = await tx.ordonnance.updateMany({ where: { ordonnanceIdClient: clientSecondaireId }, data: { ordonnanceIdClient: clientPrincipalId } });
    relationsTransferees += ordonnance.count;

    const bilan = await tx.bilan.updateMany({ where: { bilanIdClient: clientSecondaireId }, data: { bilanIdClient: clientPrincipalId } });
    relationsTransferees += bilan.count;

    const couverture = await tx.couverture.updateMany({ where: { couvertIdClient: clientSecondaireId }, data: { couvertIdClient: clientPrincipalId } });
    relationsTransferees += couverture.count;

    // 2. Appliquer les résolutions de conflits au client principal
    if (Object.keys(conflictResolutions).length > 0) {
      await tx.client.update({
        where: { id: clientPrincipalId },
        data: conflictResolutions,
      });
    }

    // 3. Enregistrer l'historique de fusion
    await tx.fusionClient.create({
      data: {
        clientPrincipalId,
        clientFusionneId: clientSecondaireId,
        clientFusionneNom: `${secondaire.nom} ${secondaire.prenom}`,
        clientFusionneCode: secondaire.code,
        utilisateurId: userId,
        utilisateurNom: user?.name ?? "Inconnu",
        relationsTransferees,
        champsFusionnes: conflictResolutions,
      },
    });

    // 4. Supprimer le client secondaire
    await tx.client.delete({ where: { id: clientSecondaireId } });

    return { relationsTransferees };
  }, {
    timeout: 30000, // 30s pour la transaction
  });

  return { success: true, relationsTransferees: result.relationsTransferees };
}

// ─── Historique des fusions ──────────────────────────────────────────────────

export async function getHistoriqueFusions(
  page = 1,
  limit = 20
): Promise<{ fusions: FusionHistorique[]; total: number }> {
  await requirePermission(TableName.FUSION_CLIENT, "canRead");

  const [fusions, total] = await Promise.all([
    prisma.fusionClient.findMany({
      orderBy: { dateFusion: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.fusionClient.count(),
  ]);

  return { fusions, total };
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[m][n];
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}
