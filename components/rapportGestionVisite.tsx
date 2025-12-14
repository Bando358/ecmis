"use server";
import prisma from "@/lib/prisma";
// Types pour les données de retour

const calculerAge = (dateNaissance: Date): number => {
  const diffTemps = Date.now() - new Date(dateNaissance).getTime();
  const ageDate = new Date(diffTemps);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

export type ClientDataPlanning = {
  // Visite
  idVisite: string;
  dateVisite: string;
  motifVisite: string;
  idActiviteVisite: string;
  idLieu: string;
  // Client
  obstIdClient: string;
  nom: string;
  prenom: string;
  age: number;
  code: string;
  sexe: string;
  telephone: string;
  clinique: string;

  // planification familiale
  statut: string;
  methodePrise: string | boolean;
  consultationPf: boolean;
  counsellingPf: boolean;
  courtDuree: string | null;
  implanon: string | null;
  retraitImplanon: boolean;
  jadelle: string | null;
  retraitJadelle: boolean;
  sterilet: string | null;
  retraitSterilet: boolean;
  rdvPf: Date | null;
  visiteSup: Date | null;

  // Nom prescripteur
  recapPrescripteur: string[];
  nomPrescripteur?: string;
  idPrescripteur?: string;
};

// Obstétrique
export type ClientDataObstetrique = {
  // Visite
  idVisite: string;
  dateVisite: string;
  motifVisite: string;
  idActiviteVisite: string;
  idLieu: string;
  // Client
  obstIdClient: string;
  nom: string;
  prenom: string;
  age: number;
  code: string;
  sexe: string;
  telephone: string;
  clinique: string;
  // Grossesse
  grossesseGestite: number;
  grossesseParite: number;
  grossesseAge: number;
  grossesseDdr: Date;
  termePrevu: Date;
  // Obstétrique
  obstTypeVisite: string;
  obstVat: string | null;
  obstSp: string | null;
  obstEtatNutritionnel: string;
  obstEtatGrossesse: string;
  obstRdv: Date | null;
  obstVisiteSup: Date | null;

  // Nom prescripteur
  recapPrescripteur: string[];
  nomPrescripteur?: string;
  idPrescripteur?: string;
};

// Pec VIH
export type ClientDataPecVih = {
  // Visite
  idVisite: string;
  dateVisite: string;
  motifVisite: string;
  idActiviteVisite: string;
  idLieu: string;
  // Client
  idClient: string;
  nom: string;
  prenom: string;
  age: number;
  code: string;
  sexe: string;
  telephone: string;
  clinique: string;

  // Pec VIH
  pecVihTypeclient: string;
  pecVihMoleculeArv: string;
  pecVihCotrimo: boolean;
  pecRdv: string | null;
  visiteSup: Date | null;

  // Nom prescripteur
  recapPrescripteur: string[];
  nomPrescripteur?: string;
  idPrescripteur?: string;
};

// Fonction pour les rendez-vous de planification familiale
export const fetchClientsPlanningRDV = async (
  cliniques: { value: string; label: string }[],
  clinicIds: string[],
  activiteIds: string[],
  dateDebut: Date,
  dateFin: Date
): Promise<ClientDataPlanning[]> => {
  if (!clinicIds || clinicIds.length === 0) {
    alert("Veuillez choisir au moins une clinique");
    return [];
  }

  // -------------------------------
  // ✅ PARSING activiteIds COMME DANS fetchClientsStatusProtege
  // -------------------------------
  const [tabIdactivite, tabIdLieu] = (
    Array.isArray(activiteIds) ? activiteIds : []
  ).reduce<[string[], string[]]>(
    ([left, right], str) => {
      if (typeof str !== "string") return [left, right];

      const parts = str.split(">");
      const l = parts[0]?.trim() ?? "";
      const r = parts[1]?.trim() ?? "";

      if (l) left.push(l);
      if (r) right.push(r);

      return [left, right];
    },
    [[], []]
  );

  // -------------------------------
  // ✅ REQUÊTE PRISMA INITIALE
  // -------------------------------
  const clients = await prisma.client.findMany({
    where: {
      idClinique: {
        in: clinicIds,
      },
      Planning: {
        some: {
          rdvPf: {
            not: null,
            gte: dateDebut,
            lte: dateFin,
          },
        },
      },
    },
    include: {
      Visite: true,
      Planning: true,
      RecapVisite: true,
    },
  });

  // -------------------------------
  // ✅ FILTRES ACTIVITÉ ET LIEU (corrigé)
  // -------------------------------
  let activiteClients: typeof clients = [];
  let activiteClientsLieu: typeof clients = [];

  // CORRECTION : Si activiteIds est vide, on prend les clients où idActivite est vide ou null
  if (!activiteIds || activiteIds.length === 0) {
    activiteClients = clients.filter((client: typeof clients[0]) =>
      client.Visite.some(
      (visite: typeof client.Visite[0]) => !visite.idActivite || visite.idActivite === ""
      )
    );
    activiteClientsLieu = activiteClients;
  } else {
    if (tabIdactivite.length > 0) {
      activiteClients = clients.filter((client: typeof clients[0]) =>
        client.Visite.some((v: typeof client.Visite[0]) => {
          const idAct: string = v.idActivite ?? "";
          return idAct !== "" && tabIdactivite.includes(idAct);
        })
      );
    } else {
      // Si tabIdactivite est vide mais activiteIds n'est pas vide, on prend ceux avec idActivite vide/null
      activiteClients = clients.filter((client: typeof clients[0]) =>
        client.Visite.some(
          (visite: typeof client.Visite[0]) => !visite.idActivite || visite.idActivite === ""
        )
      );
    }

    if (tabIdLieu.length > 0) {
      activiteClientsLieu = activiteClients.filter((client: typeof clients[0]) =>
        client.Visite.some((v: typeof client.Visite[0]) => {
          const idLieu: string = v.idLieu ?? "";
          return idLieu !== "" && tabIdLieu.includes(idLieu);
        })
      );
    } else {
      activiteClientsLieu = activiteClients;
    }
  }

  // -------------------------------
  // ✅ CONSTRUCTION DES CLIENTS Planning RDV
  // -------------------------------
  const clientsPlanningRDV: ClientDataPlanning[] = [];

  activiteClientsLieu.forEach((client: {
    id: string;
    nom: string;
    prenom: string;
    dateNaissance: Date;
    code: string;
    sexe: string;
    tel_1: string | null;
    idClinique: string;
    Visite: Array<{
      id: string;
      dateVisite: Date;
      motifVisite: string;
      idActivite: string | null;
      idLieu: string | null;
    }>;
    Planning?: Array<{
      idVisite: string;
      rdvPf: Date | null;
      statut: string | null;
      consultation: boolean | null;
      counsellingPf: boolean | null;
      courtDuree: string | null;
      implanon: string | null;
      retraitImplanon: boolean | null;
      jadelle: string | null;
      retraitJadelle: boolean | null;
      sterilet: string | null;
      retraitSterilet: boolean | null;
    }>;
    RecapVisite?: Array<{
      idVisite: string;
      prescripteurs: string[];
    }>;
  }) => {
    client.Visite.forEach((visite: {
      id: string;
      dateVisite: Date;
      motifVisite: string;
      idActivite: string | null;
      idLieu: string | null;
    }) => {
      const planning = client.Planning?.find(
        (p: {
          idVisite: string;
          rdvPf: Date | null;
        }) =>
          p.idVisite === visite.id &&
          p.rdvPf &&
          new Date(p.rdvPf) >= dateDebut &&
          new Date(p.rdvPf) <= dateFin
      );

      const recapVisite = client.RecapVisite?.find(
        (r: { idVisite: string }) => r.idVisite === visite.id
      );

      if (planning && planning.rdvPf) {
        clientsPlanningRDV.push({
          idVisite: visite.id,
          dateVisite: visite.dateVisite.toLocaleDateString(),
          motifVisite: visite.motifVisite,
          idActiviteVisite: visite.idActivite || "",
          idLieu: visite.idLieu || "",

          obstIdClient: client.id,
          nom: client.nom,
          prenom: client.prenom,
          age: calculerAge(client.dateNaissance),
          code: client.code,
          sexe: client.sexe,
          telephone: client.tel_1 || "",
          clinique: client.idClinique,

          statut: planning.statut || "",
          methodePrise:
            (planning.courtDuree && planning.courtDuree) ||
            (planning.implanon === "insertion" && "Implanon") ||
            (planning.jadelle === "insertion" && "Jadelle") ||
            (planning.sterilet === "insertion" && "Stérilet"),

          consultationPf: planning.consultation || false,
          counsellingPf: planning.counsellingPf || false,
          courtDuree: planning.courtDuree || null,
          implanon: planning.implanon || null,
          retraitImplanon: planning.retraitImplanon || false,
          jadelle: planning.jadelle || null,
          retraitJadelle: planning.retraitJadelle || false,
          sterilet: planning.sterilet || null,
          retraitSterilet: planning.retraitSterilet || false,
          rdvPf: planning.rdvPf || null,
          visiteSup: null,

          recapPrescripteur: recapVisite?.prescripteurs || [],
          nomPrescripteur: "",
          idPrescripteur: "",
        });
      }
    });
  });

  // -------------------------------
  // ✅ Renommer clinique => libellé
  // -------------------------------
  const rdvClientPlanning = clientsPlanningRDV.map((client) => {
    const clinic = cliniques.find((c) => c.value === client.clinique);
    return {
      ...client,
      clinique: clinic?.label || "Clinique non trouvée",
    };
  });

  // -------------------------------
  // ✅ RECHERCHE VISITE SUPÉRIEURE
  // -------------------------------
  for (let i = 0; i < rdvClientPlanning.length; i++) {
    const client = rdvClientPlanning[i];

    if (!client.rdvPf) {
      rdvClientPlanning[i].visiteSup = null;
      continue;
    }

    const rdvPfDate = new Date(client.rdvPf);
    rdvPfDate.setHours(0, 0, 0, 0);

    const planningSup = await prisma.planning.findFirst({
      where: {
        idClient: client.obstIdClient,
        rdvPf: { gt: rdvPfDate },
      },
      orderBy: { rdvPf: "asc" },
    });

    let newDate = null;
    if (planningSup?.idVisite) {
      newDate = await prisma.visite.findFirst({
        where: { id: planningSup.idVisite },
      });
    }

    rdvClientPlanning[i].visiteSup = newDate?.dateVisite || null;
  }

  return rdvClientPlanning;
};

// Fonction pour les rendez-vous obstétriques
export const fetchClientsObstetriqueRDV = async (
  cliniques: { value: string; label: string }[],
  clinicIds: string[],
  activiteIds: string[],
  dateDebut: Date,
  dateFin: Date
): Promise<ClientDataObstetrique[]> => {
  if (!clinicIds || clinicIds.length === 0) {
    alert("Veuillez choisir au moins une clinique");
    return [];
  }

  // -------------------------------------------------------------
  // ✅ PARSING activiteIds (exactement comme fetchClientsStatusProtege)
  // -------------------------------------------------------------
  const [tabIdactivite, tabIdLieu] = (
    Array.isArray(activiteIds) ? activiteIds : []
  ).reduce<[string[], string[]]>(
    ([left, right], str) => {
      if (typeof str !== "string") return [left, right];

      const parts = str.split(">");
      const l = parts[0]?.trim() ?? "";
      const r = parts[1]?.trim() ?? "";

      if (l) left.push(l);
      if (r) right.push(r);

      return [left, right];
    },
    [[], []]
  );

  // -------------------------------------------------------------
  // ✅ REQUÊTE PRISMA INITIALE : récupérer tous les clients
  // -------------------------------------------------------------
  const clients = await prisma.client.findMany({
    where: {
      idClinique: {
        in: clinicIds,
      },
      Obstetrique: {
        some: {
          obstRdv: {
            not: null,
            gte: dateDebut,
            lte: dateFin,
          },
        },
      },
    },
    include: {
      Visite: true,
      Grossesse: true,
      Obstetrique: true,
      RecapVisite: true,
    },
  });

  // -------------------------------------------------------------
  // ✅ FILTRES activiteIds (activité → puis lieu)
  // -------------------------------------------------------------
  let activiteClients: typeof clients = [];
  let activiteClientsLieu: typeof clients = [];

  if (Array.isArray(activiteIds) && activiteIds.length > 0) {
    // --- ACTIVITÉ ---
    if (tabIdactivite.length > 0) {
      activiteClients = clients.filter((client: typeof clients[0]) =>
        client.Visite.some((v: typeof client.Visite[0]) => {
          const idAct: string = v.idActivite ?? "";
          return idAct !== "" && tabIdactivite.includes(idAct);
        })
      );
    } else {
      activiteClients = clients.filter((client: typeof clients[0]) =>
        client.Visite.some((visite: typeof client.Visite[0]) => visite.idActivite !== "")
      );
    }

    // --- LIEU ---
    if (tabIdLieu.length > 0) {
      activiteClientsLieu = activiteClients.filter((client: typeof clients[0]) =>
        client.Visite.some((v: typeof client.Visite[0]) => {
          const idLieu: string = v.idLieu ?? "";
          return idLieu !== "" && tabIdLieu.includes(idLieu);
        })
      );
    } else {
      activiteClientsLieu = activiteClients;
    }
  } else {
    activiteClientsLieu = clients;
  }

  // -------------------------------------------------------------
  // ✅ CONSTRUCTION DES CLIENTS RDV OBSTETRIQUE
  // -------------------------------------------------------------
  const clientsObstetriqueRDV: ClientDataObstetrique[] = [];

  activiteClientsLieu.forEach((client: {
    id: string;
    nom: string;
    prenom: string;
    dateNaissance: Date;
    code: string;
    sexe: string;
    tel_1: string | null;
    idClinique: string;
    Visite: Array<{
      id: string;
      dateVisite: Date;
      motifVisite: string;
      idActivite: string | null;
      idLieu: string | null;
    }>;
    Obstetrique?: Array<{
      obstIdVisite: string;
      obstRdv: Date | null;
      obstTypeVisite: string | null;
      obstVat: string | null;
      obstSp: string | null;
      obstEtatNutritionnel: string | null;
      obstEtatGrossesse: string | null;
    }>;
    Grossesse?: Array<{
      grossesseIdVisite: string;
      grossesseGestite: number | null;
      grossesseParite: number | null;
      grossesseAge: number | null;
      grossesseDdr: Date | null;
      termePrevu: Date | null;
    }>;
    RecapVisite?: Array<{
      idVisite: string;
      prescripteurs: string[];
    }>;
  }) => {
    client.Visite.forEach((visite: {
      id: string;
      dateVisite: Date;
      motifVisite: string;
      idActivite: string | null;
      idLieu: string | null;
    }) => {
      const obstetrique = client.Obstetrique?.find(
        (o: {
          obstIdVisite: string;
          obstRdv: Date | null;
        }) =>
          o.obstIdVisite === visite.id &&
          o.obstRdv &&
          new Date(o.obstRdv) >= dateDebut &&
          new Date(o.obstRdv) <= dateFin
      );

      const grossesse = client.Grossesse?.find(
        (g: { grossesseIdVisite: string }) => g.grossesseIdVisite === visite.id
      );

      const recapVisite = client.RecapVisite?.find(
        (r: { idVisite: string }) => r.idVisite === visite.id
      );

      if (obstetrique && obstetrique.obstRdv) {
        clientsObstetriqueRDV.push({
          idVisite: visite.id,
          dateVisite: visite.dateVisite.toLocaleDateString(),
          motifVisite: visite.motifVisite,
          idActiviteVisite: visite.idActivite || "",
          idLieu: visite.idLieu || "",

          obstIdClient: client.id,
          nom: client.nom,
          prenom: client.prenom,
          age: calculerAge(client.dateNaissance),
          code: client.code,
          sexe: client.sexe,
          telephone: client.tel_1 || "",
          clinique: client.idClinique,

          grossesseGestite: grossesse?.grossesseGestite || 0,
          grossesseParite: grossesse?.grossesseParite || 0,
          grossesseAge: grossesse?.grossesseAge || 0,
          grossesseDdr: grossesse?.grossesseDdr || new Date(),
          termePrevu: grossesse?.termePrevu || new Date(),

          obstTypeVisite: obstetrique.obstTypeVisite || "",
          obstVat: obstetrique.obstVat || null,
          obstSp: obstetrique.obstSp || null,
          obstEtatNutritionnel: obstetrique.obstEtatNutritionnel || "",
          obstEtatGrossesse: obstetrique.obstEtatGrossesse || "",
          obstRdv: obstetrique.obstRdv,
          obstVisiteSup: null,

          recapPrescripteur: recapVisite?.prescripteurs || [],
          nomPrescripteur: "",
          idPrescripteur: "",
        });
      }
    });
  });

  // -------------------------------------------------------------
  // ✅ CHANGER l’ID de clinique par son label
  // -------------------------------------------------------------
  const rdvClientsObstetrique = clientsObstetriqueRDV.map((client) => {
    const clinic = cliniques.find((c) => c.value === client.clinique);
    return {
      ...client,
      clinique: clinic?.label || "Clinique non trouvée",
    };
  });

  // -------------------------------------------------------------
  // ✅ RECHERCHE DE LA VISITE SUPÉRIEURE (obstétrique)
  // -------------------------------------------------------------
  for (let i = 0; i < rdvClientsObstetrique.length; i++) {
    const client = rdvClientsObstetrique[i];

    if (!client.obstRdv) {
      client.obstVisiteSup = null;
      continue;
    }

    const obstRdvDate = new Date(client.obstRdv);
    obstRdvDate.setHours(0, 0, 0, 0);

    const obstSup = await prisma.obstetrique.findFirst({
      where: {
        obstIdClient: client.obstIdClient,
        obstRdv: { gt: obstRdvDate },
      },
      orderBy: { obstRdv: "asc" },
    });

    let newDate = null;
    if (obstSup?.obstIdVisite) {
      newDate = await prisma.visite.findFirst({
        where: { id: obstSup.obstIdVisite },
      });
    }

    rdvClientsObstetrique[i].obstVisiteSup = newDate?.dateVisite || null;
  }

  return rdvClientsObstetrique;
};

// Fonction pour les rendez-vous PEC VIH
// Note: Pour PEC VIH, on va créer un champ pecRdv fictif basé sur la logique métier
// Vous devrez adapter selon votre schéma réel
export const fetchClientsPecVihRDV = async (
  cliniques: { value: string; label: string }[],
  clinicIds: string[],
  activites: string[],
  dateDebut: Date,
  dateFin: Date
): Promise<ClientDataPecVih[]> => {
  if (!clinicIds || clinicIds.length === 0) {
    alert("Veuillez choisir au moins une clinique");
    return [];
  }

  // -------------------------------------------------------------
  // ✅ PARSING activites → tabIdactivite / tabIdLieu
  // -------------------------------------------------------------
  const [tabIdactivite, tabIdLieu] = (
    Array.isArray(activites) ? activites : []
  ).reduce<[string[], string[]]>(
    ([left, right], str) => {
      if (typeof str !== "string") return [left, right];

      const parts = str.split(">");
      const l = parts[0]?.trim() ?? "";
      const r = parts[1]?.trim() ?? "";

      if (l) left.push(l);
      if (r) right.push(r);

      return [left, right];
    },
    [[], []]
  );

  // -------------------------------------------------------------
  // ✅ REQUÊTE PRISMA INITIALE (clients concernés par rdv VIH)
  // -------------------------------------------------------------
  const clients = await prisma.client.findMany({
    where: {
      idClinique: { in: clinicIds },
      PecVih: {
        some: {
          pecDateRdvSuivi: {
            gte: dateDebut,
            lte: dateFin,
          },
        },
      },
    },
    include: {
      Visite: {
        where: {
          dateVisite: {
            gte: new Date(dateDebut.getTime() - 30 * 24 * 60 * 60 * 1000),
            lte: dateFin,
          },
        },
      },
      RecapVisite: true,
      PecVih: {
        where: {
          pecDateRdvSuivi: {
            gte: dateDebut,
            lte: dateFin,
          },
        },
      },
    },
  });

  // -------------------------------------------------------------
  // ✅ FILTRES ACTIVITÉ + LIEU EXACTEMENT COMME fetchClientsStatusProtege
  // -------------------------------------------------------------
  let activiteClients: typeof clients = [];
  let activiteClientsLieu: typeof clients = [];

  if (Array.isArray(activites) && activites.length > 0) {
    // ---- FILTRE ACTIVITÉ ----
    if (tabIdactivite.length > 0) {
      activiteClients = clients.filter((client: typeof clients[0]) =>
        client.Visite.some((v: typeof client.Visite[0]) => {
          const idAct: string = v.idActivite ?? "";
          return idAct !== "" && tabIdactivite.includes(idAct);
        })
      );
    } else {
      activiteClients = clients.filter((client: typeof clients[0]) =>
        client.Visite.some((visite: typeof client.Visite[0]) => visite.idActivite !== "")
      );
    }

    // ---- FILTRE LIEU ----
    if (tabIdLieu.length > 0) {
      activiteClientsLieu = activiteClients.filter((client: typeof clients[0]) =>
        client.Visite.some((v: typeof client.Visite[0]) => {
          const idLieu: string = v.idLieu ?? "";
          return idLieu !== "" && tabIdLieu.includes(idLieu);
        })
      );
    } else {
      activiteClientsLieu = activiteClients;
    }
  } else {
    activiteClientsLieu = clients;
  }

  // -------------------------------------------------------------
  // ✅ CONSTRUCTION DU TABLEAU DES RDV PEC VIH
  // -------------------------------------------------------------
  const clientsPecVihRDV: ClientDataPecVih[] = [];

  activiteClientsLieu.forEach((client: {
    id: string;
    nom: string;
    prenom: string;
    dateNaissance: Date;
    code: string;
    sexe: string;
    tel_1: string | null;
    idClinique: string;
    Visite: Array<{
      id: string;
      dateVisite: Date;
      motifVisite: string;
      idActivite: string | null;
      idLieu: string | null;
    }>;
    PecVih?: Array<{
      pecVihIdVisite: string;
      pecVihIdClient: string;
      pecDateRdvSuivi: Date | null;
      pecVihTypeclient: string | null;
      pecVihMoleculeArv: string | null;
      pecVihCotrimo: boolean | null;
    }>;
    RecapVisite?: Array<{
      idVisite: string;
      prescripteurs: string[];
    }>;
  }) => {
    client.Visite.forEach((visite: {
      id: string;
      dateVisite: Date;
      motifVisite: string;
      idActivite: string | null;
      idLieu: string | null;
    }) => {
      const pecVih = client.PecVih?.find((p: {
        pecVihIdVisite: string;
      }) => p.pecVihIdVisite === visite.id);
      const recapVisite = client.RecapVisite?.find(
        (r: { idVisite: string }) => r.idVisite === visite.id
      );

      if (pecVih) {
        let pecRdv: string | null = null;

        // ✅ Cas 1 : RDV basé sur pecDateRdvSuivi
        if (pecVih?.pecDateRdvSuivi) {
          const dateSuivi = new Date(pecVih.pecDateRdvSuivi);
          const prochainRdv = new Date(dateSuivi);
          prochainRdv.setMonth(prochainRdv.getMonth() + 3);
          prochainRdv.setHours(0, 0, 0, 0);

          if (prochainRdv >= dateDebut && prochainRdv <= dateFin) {
            pecRdv = prochainRdv.toISOString();
          }
        }

        // ✅ Cas 2 : RDV basé sur la date de visite
        if (!pecRdv) {
          const dateVisite = new Date(visite.dateVisite);
          const prochainRdv = new Date(dateVisite);
          prochainRdv.setMonth(prochainRdv.getMonth() + 3);
          prochainRdv.setHours(0, 0, 0, 0);

          if (prochainRdv >= dateDebut && prochainRdv <= dateFin) {
            pecRdv = prochainRdv.toISOString();
          }
        }

        // ✅ On ne garde que les RDV valides
        if (pecRdv) {
          clientsPecVihRDV.push({
            idVisite: visite.id,
            dateVisite: visite.dateVisite.toLocaleDateString(),
            motifVisite: visite.motifVisite,
            idActiviteVisite: visite.idActivite || "",
            idLieu: visite.idLieu || "",
            idClient: client.id,
            nom: client.nom,
            prenom: client.prenom,
            age: calculerAge(client.dateNaissance),
            code: client.code,
            sexe: client.sexe,
            telephone: client.tel_1 || "",
            clinique: client.idClinique,

            pecVihTypeclient: pecVih.pecVihTypeclient || "",
            pecVihMoleculeArv: pecVih.pecVihMoleculeArv || "",
            pecVihCotrimo: pecVih.pecVihCotrimo || false,
            pecRdv,
            visiteSup: null,

            recapPrescripteur: recapVisite?.prescripteurs || [],
            nomPrescripteur: "",
            idPrescripteur: "",
          });
        }
      }
    });
  });

  // -------------------------------------------------------------
  // ✅ Remplacer l’ID clinique par son libellé
  // -------------------------------------------------------------
  const rdvClientsPecVih = clientsPecVihRDV.map((client) => {
    const clinic = cliniques.find((c) => c.value === client.clinique);
    return {
      ...client,
      clinique: clinic?.label || "Clinique non trouvée",
    };
  });

  // -------------------------------------------------------------
  // ✅ RECHERCHE VISITE SUPÉRIEURE PEC VIH
  // -------------------------------------------------------------
  for (let i = 0; i < rdvClientsPecVih.length; i++) {
    const client = rdvClientsPecVih[i];

    if (!client.pecRdv) {
      client.visiteSup = null;
      continue;
    }

    const pecRdvDate = new Date(client.pecRdv);
    pecRdvDate.setHours(0, 0, 0, 0);

    const pecVihSup = await prisma.pecVih.findFirst({
      where: {
        pecVihIdClient: client.idClient,
        pecDateRdvSuivi: { gt: pecRdvDate },
      },
      orderBy: { pecDateRdvSuivi: "asc" },
    });

    let newDate = null;
    if (pecVihSup?.pecVihIdVisite) {
      newDate = await prisma.visite.findFirst({
        where: { id: pecVihSup.pecVihIdVisite },
      });
    }

    rdvClientsPecVih[i].visiteSup = newDate?.dateVisite || null;
  }

  return rdvClientsPecVih;
};
