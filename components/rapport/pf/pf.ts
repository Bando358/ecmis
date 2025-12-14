import { ClientData } from "@/components/rapportPfActions";

export const filterClients = (
  clientData: ClientData[],
  // propriete: string,
  indicateur: string,
  minAge: number,
  maxAge: number,
  statut: string
): number => {
  const filteredClients = clientData.filter((client) => {
    // Vérifier les conditions de filtrage
    const ageInRange = client.age >= minAge && client.age <= maxAge;
    const matchesIndicateur = client.courtDuree === indicateur;
    const matchesStatut = client.statut === statut;

    return ageInRange && matchesIndicateur && matchesStatut;
  });
  const result = filteredClients.length;

  return result;
};

export const countClientPf = (
  clientData: ClientData[],
  minAge: number,
  maxAge: number,
  propriete: string,
  indicateur: string,
  statut: string
): number => {
  // Vérification initiale des données
  if (!Array.isArray(clientData) || clientData.length === 0) {
    console.warn("La liste des clients est vide ou invalide.");
    return 0;
  }

  // Comptage des clients répondant aux critères
  const count = clientData.reduce((acc, client) => {
    // Vérification de l'âge
    const ageCondition = client.age >= minAge && client.age <= maxAge;

    // Vérification de la propriété et de sa valeur
    const proprieteCondition =
      typeof client[propriete as keyof ClientData] === "string" &&
      (client[propriete as keyof ClientData] as string)
        ?.trim()
        .toLowerCase() === indicateur.trim().toLowerCase();

    // Vérification du statut
    const statutCondition =
      typeof client.statut === "string" &&
      client.statut.trim().toLowerCase() === statut.trim().toLowerCase();

    // Augmenter le compteur si toutes les conditions sont satisfaites
    return ageCondition && proprieteCondition && statutCondition
      ? acc + 1
      : acc;
  }, 0);

  // console.log(`Nombre de clients correspondant : ${count}`);
  return count;
};
export const countClientPfInsertionAndControl = (
  clientData: ClientData[],
  minAge: number,
  maxAge: number,
  propriete: string,
  // indicateur: string,
  statut: string
): number => {
  // Vérification initiale des données
  if (!Array.isArray(clientData) || clientData.length === 0) {
    console.warn("La liste des clients est vide ou invalide.");
    return 0;
  }

  // Comptage des clients répondant aux critères
  const count = clientData.reduce((acc, client) => {
    // Vérification de l'âge
    const ageCondition = client.age >= minAge && client.age <= maxAge;

    // Vérification de la propriété et de sa valeur
    const proprieteValue = client[propriete as keyof ClientData];
    const proprieteCondition =
      typeof proprieteValue === "string" &&
      ["insertion", "controle"].includes(proprieteValue.trim().toLowerCase());

    // Vérification du statut
    const statutCondition =
      typeof client.statut === "string" &&
      client.statut.trim().toLowerCase() === statut.trim().toLowerCase();

    // Augmenter le compteur si toutes les conditions sont satisfaites
    return ageCondition && proprieteCondition && statutCondition
      ? acc + 1
      : acc;
  }, 0);

  // console.log(`Nombre de clients correspondant : ${count}`);
  return count;
};

export const countClientPfRetrait = (
  clientData: ClientData[],
  minAge: number,
  maxAge: number,
  propriete: string,
  indicateur: boolean,
  statut: string
): number => {
  // Vérification initiale des données
  if (!Array.isArray(clientData) || clientData.length === 0) {
    console.warn("La liste des clients est vide ou invalide.");
    return 0;
  }

  // Comptage des clients répondant aux critères
  const count = clientData.reduce((acc, client) => {
    // Vérification de l'âge
    const ageCondition = client.age >= minAge && client.age <= maxAge;

    // Vérification de la propriété et de sa valeur
    const proprieteCondition =
      client[propriete as keyof ClientData] === indicateur;

    // Vérification du statut
    const statutCondition =
      typeof client.statut === "string" &&
      client.statut.trim().toLowerCase() === statut.trim().toLowerCase();

    return ageCondition && proprieteCondition && statutCondition
      ? acc + 1
      : acc;
  }, 0);

  return count;
};

// Fonction pour tous les rapport sauf PF

export const countClient = (
  clientData: ClientData[],
  minAge: number,
  maxAge: number,
  propriete: string,
  proprieteVal: string
  // indicateur: string,
  // statut: string
): number => {
  // Vérification initiale des données
  if (!Array.isArray(clientData) || clientData.length === 0) {
    console.warn("La liste des clients est vide ou invalide.");
    return 0;
  }

  // Comptage des clients répondant aux critères
  const count = clientData.reduce((acc, client) => {
    // Vérification de l'âge
    const ageCondition = client.age >= minAge && client.age <= maxAge;

    // Vérification de la propriété et de sa valeur
    const proprieteCondition =
      typeof client[propriete as keyof ClientData] === "string" &&
      (client[propriete as keyof ClientData] as string)
        ?.trim()
        .toLowerCase() === proprieteVal.trim().toLowerCase();

    // Vérification du statut

    // Augmenter le compteur si toutes les conditions sont satisfaites
    return ageCondition && proprieteCondition ? acc + 1 : acc;
  }, 0);

  // console.log(`Nombre de clients correspondant : ${count}`);
  return count;
};

// Compter les valeur boolean

export const countBoolean = (
  clientData: ClientData[],
  minAge: number,
  maxAge: number,
  propriete: string,
  proprieteVal: boolean
): number => {
  // Vérification initiale des données
  if (!Array.isArray(clientData) || clientData.length === 0) {
    console.warn("La liste des clients est vide ou invalide.");
    return 0;
  }
  console.log("clientData :", clientData);

  // Comptage des clients répondant aux critères
  const count = clientData.reduce((acc, client) => {
    // Vérification de l'âge
    const ageCondition = client.age >= minAge && client.age <= maxAge;

    // Vérification de la propriété et de sa valeur
    const proprieteCondition =
      client[propriete as keyof ClientData] === proprieteVal;

    return ageCondition && proprieteCondition ? acc + 1 : acc;
  }, 0);

  return count;
};

// CountVat

export const countClientVat = (
  clientData: ClientData[],
  minAge: number,
  maxAge: number,
  propriete: string
  // proprieteVal: string
  // indicateur: string,
  // statut: string
): number => {
  // Vérification initiale des données
  if (!Array.isArray(clientData) || clientData.length === 0) {
    console.warn("La liste des clients est vide ou invalide.");
    return 0;
  }

  // Comptage des clients répondant aux critères
  const count = clientData.reduce((acc, client) => {
    // Vérification de l'âge
    const ageCondition = client.age >= minAge && client.age <= maxAge;

    // Vérification de la propriété et de sa valeur
    const proprieteCondition =
      typeof client[propriete as keyof ClientData] !== null &&
      (client[propriete as keyof ClientData] as string)?.trim();

    // Vérification du statut

    // Augmenter le compteur si toutes les conditions sont satisfaites
    return ageCondition && proprieteCondition ? acc + 1 : acc;
  }, 0);

  // console.log(`Nombre de clients correspondant : ${count}`);
  return count;
};
