// MultiSelectEchographie.tsx
import {
  DemandeEchographie,
  Echographie,
  TarifEchographie,
  TypeEchographie,
} from "@prisma/client";
import React, { useMemo } from "react";
import Select, { SingleValue, GroupBase } from "react-select";

const typeEchographieLabels: Record<TypeEchographie, string> = {
  OBST: "Obstétrique",
  GYN: "Gynécologie",
  INF: "Infertilité",
  MDG: "Médecine Générale",
  CAR: "Cardiologie",
};

interface MultiSelectProps {
  idClinique: string;
  demandes: DemandeEchographie[];
  selectedOptions: DemandeEchographie[];
  setSelectedOptions: React.Dispatch<
    React.SetStateAction<DemandeEchographie[]>
  >;
  allEchographies: Echographie[];
  tarifEchographies: TarifEchographie[];
}

type OptionType = DemandeEchographie & {
  value: string;
  label: string;
};

const MultiSelectEchographie: React.FC<MultiSelectProps> = ({
  demandes,
  selectedOptions,
  setSelectedOptions,
  allEchographies,
  tarifEchographies,
}) => {
  const getEchographieForDemande = (demande: DemandeEchographie) => {
    const tarif = tarifEchographies.find(
      (t) => t.id === demande.idTarifEchographie
    );
    return allEchographies.find((e) => e.id === tarif?.idEchographie);
  };

  const getNameEchographie = (id: string) => {
    const demand = demandes.find((e) => e.id === id);
    if (!demand) return "";
    const echographie = getEchographieForDemande(demand);
    return echographie?.nomEchographie || "";
  };

  // Grouper les options par typeEchographie
  const groupedOptions = useMemo(() => {
    const groups = new Map<string, OptionType[]>();

    for (const demande of demandes) {
      const echographie = getEchographieForDemande(demande);
      const type = echographie?.typeEchographie || "AUTRE";
      const label = typeEchographieLabels[type as TypeEchographie] || type;

      if (!groups.has(label)) {
        groups.set(label, []);
      }

      groups.get(label)!.push({
        value: demande.id,
        label: echographie?.nomEchographie || "Inconnu",
        ...demande,
      });
    }

    const result: GroupBase<OptionType>[] = [];
    for (const [label, options] of groups) {
      result.push({ label, options });
    }

    return result;
  }, [demandes, allEchographies, tarifEchographies]);

  const handleChange = (selected: SingleValue<OptionType>) => {
    if (selected) {
      setSelectedOptions([selected]);
    } else {
      setSelectedOptions([]);
    }
  };

  return (
    <Select<OptionType, false, GroupBase<OptionType>>
      isMulti={false}
      options={groupedOptions}
      getOptionLabel={(e) => getNameEchographie(e.id) || e.label}
      getOptionValue={(e) => e.id}
      value={selectedOptions[0] ? { ...selectedOptions[0], value: selectedOptions[0].id, label: getNameEchographie(selectedOptions[0].id) } as OptionType : null}
      onChange={handleChange}
      className="w-full"
      placeholder="Rechercher une échographie..."
      noOptionsMessage={() => "Aucune échographie disponible"}
      formatGroupLabel={(group) => (
        <div className="flex items-center gap-2 py-1">
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            {group.label}
          </span>
          <span className="text-[10px] bg-gray-200 text-gray-600 rounded-full px-1.5">
            {group.options.length}
          </span>
        </div>
      )}
    />
  );
};

export default MultiSelectEchographie;
