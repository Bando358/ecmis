import { clientDataProps } from "@/components/rapportPfActions";
import { convertedType } from "@/components/tableRapport/tableRapportIst";

export const countClientBoolean = (
  clientData: clientDataProps[],
  minAge: number,
  maxAge: number,
  propriete: string,
  indicateur: boolean
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
      client[propriete as keyof clientDataProps] === indicateur;

    return ageCondition && proprieteCondition ? acc + 1 : acc;
  }, 0);

  return count;
};
// ✅ Version finale corrigée
export const countClientBooleanBySexe = (
  clientData: convertedType[], // ⚡ on utilise convertedType
  minAge: number,
  maxAge: number,
  propriete: string, // ⚡ propriété booléenne définie dans ton type
  indicateur: boolean,
  sexe: "Masculin" | "Féminin"
): number => {
  if (!Array.isArray(clientData) || clientData.length === 0) return 0;

  return clientData.reduce((acc, client) => {
    const ageCondition = client.age >= minAge && client.age <= maxAge;
    const sexeCondition = client.sexe === sexe;
    const proprieteCondition =
      client[propriete as keyof convertedType] === indicateur;

    return ageCondition && sexeCondition && proprieteCondition ? acc + 1 : acc;
  }, 0);
};

export const countClientString = (
  clientData: convertedType[],
  minAge: number,
  maxAge: number,
  propriete: string,
  indicateur: string
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
      client[propriete as keyof clientDataProps] === indicateur;

    return ageCondition && proprieteCondition ? acc + 1 : acc;
  }, 0);

  return count;
};
