import {
  IndicatorDefinition,
  IndicatorCategory,
  DataSource,
  FetchedData,
  ComputedDataPoint,
} from "../types";
import { DataSettings } from "../settings-types";
import { countRecords, sumField } from "./helpers";

// Mapping service type value → IndicatorCategory existante
const SERVICE_TO_CATEGORY: Record<string, IndicatorCategory> = {
  planning: "planification_familiale",
  gynecologie: "gynecologie",
  obstetrique: "obstetrique",
  accouchement: "accouchement",
  ist: "ist",
  depistageVih: "depistage_vih",
  pecVih: "pec_vih",
  medecine: "medecine",
  vbg: "vbg",
  infertilite: "infertilite",
  saa: "saa",
  cpon: "cpon",
};

// Champs numeriques pour lesquels on fait une somme au lieu d'un comptage
const SUM_FIELDS = new Set([
  "accouchementEnfantVivant",
  "accouchementEnfantMortNeFrais",
  "accouchementEnfantMortNeMacere",
  "accouchementNbPoidsEfantVivant",
]);

/**
 * Genere des indicateurs dynamiques a partir de la configuration des types de service.
 * Chaque propriete configuree pour un type de service produit un indicateur.
 *
 * Convention des cles :
 * - Cle composee "champ_valeur" (ex: courtDuree_noristera) : compte les enregistrements
 *   ou record[champ] === valeur
 * - Cle simple pour champ numerique (ex: accouchementEnfantVivant) : somme du champ
 * - Cle simple sinon (ex: consultation, motifVisite) : compte les valeurs truthy
 */
export function generateDynamicIndicators(
  dataSettings: DataSettings
): IndicatorDefinition[] {
  const indicators: IndicatorDefinition[] = [];

  for (const st of dataSettings.serviceTypes) {
    if (st.enabled === false) continue;

    const source = st.value as DataSource;
    const category =
      SERVICE_TO_CATEGORY[st.value] ?? ("general" as IndicatorCategory);

    // Indicateur Total du service : somme des comptages de chaque propriete switchee
    const totalProperties = st.properties.filter((p) => p.includedInTotal === true);
    if (totalProperties.length > 0) {
      const totalId = `DYN_${st.value}_TOTAL`;
      const totalName = st.totalLabel || `Total ${st.label}`;

      // Construire une fonction compute par propriete incluse
      const propComputers = totalProperties.map((prop) => {
        const isCompound = prop.key.includes("_");
        const isSum = SUM_FIELDS.has(prop.key);
        if (isCompound) {
          const underscoreIdx = prop.key.indexOf("_");
          const field = prop.key.substring(0, underscoreIdx);
          const value = prop.key.substring(underscoreIdx + 1);
          return (data: FetchedData) =>
            countRecords(data[source], (r) => r[field] === value);
        }
        if (isSum) {
          return (data: FetchedData) => sumField(data[source], prop.key);
        }
        return (data: FetchedData) =>
          countRecords(data[source], (r) => !!r[prop.key]);
      });

      indicators.push({
        id: totalId,
        name: totalName,
        shortName: totalName,
        description: `Somme des ${totalProperties.length} propriete(s) incluses pour ${st.label}`,
        category,
        dataSources: [source],
        aggregation: "sum",
        compute: (data: FetchedData) =>
          propComputers.flatMap((fn) => fn(data)),
        valueType: "integer",
      });
    }

    for (const prop of st.properties) {
      const id = `DYN_${st.value}_${prop.key}`;
      const isCompound = prop.key.includes("_");
      const isSum = SUM_FIELDS.has(prop.key);

      let compute: (data: FetchedData) => ComputedDataPoint[];
      let aggregation: "count" | "sum" = "count";
      const valueType: "integer" | "decimal" | "percentage" | "currency" =
        "integer";

      if (isCompound) {
        // Cle composee : champ_valeur (ex: courtDuree_noristera)
        const underscoreIdx = prop.key.indexOf("_");
        const field = prop.key.substring(0, underscoreIdx);
        const value = prop.key.substring(underscoreIdx + 1);
        compute = (data: FetchedData) =>
          countRecords(data[source], (r) => r[field] === value);
      } else if (isSum) {
        // Champ numerique : somme
        compute = (data: FetchedData) => sumField(data[source], prop.key);
        aggregation = "sum";
      } else {
        // Champ simple : compte les valeurs truthy (boolean true ou string non-vide)
        compute = (data: FetchedData) =>
          countRecords(data[source], (r) => !!r[prop.key]);
      }

      indicators.push({
        id,
        name: `${st.label} - ${prop.label}`,
        shortName: prop.label,
        description: `${prop.label} (${st.label})`,
        category,
        dataSources: [source],
        aggregation,
        compute,
        valueType,
      });
    }
  }

  return indicators;
}
