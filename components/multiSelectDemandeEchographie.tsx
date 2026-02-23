"use client";

import {
  TarifEchographie,
  Echographie,
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
  tarifEchographies: TarifEchographie[];
  selectedOptions: TarifEchographie[];
  setSelectedOptions: React.Dispatch<React.SetStateAction<TarifEchographie[]>>;
  isLoading?: boolean;
  allEchographies: Echographie[];
}

type OptionType = TarifEchographie & {
  value: string;
  label: string;
};

const MultiSelectDemandeEchographie: React.FC<MultiSelectProps> = ({
  tarifEchographies,
  selectedOptions,
  setSelectedOptions,
  isLoading = false,
  allEchographies,
}) => {
  const handleChange = (selected: SingleValue<OptionType>) => {
    if (selected) {
      setSelectedOptions([selected]);
    } else {
      setSelectedOptions([]);
    }
  };

  const groupedOptions = useMemo(() => {
    const groups = new Map<string, OptionType[]>();

    for (const tarif of tarifEchographies) {
      const echographie = allEchographies.find(
        (e) => e.id === tarif.idEchographie
      );
      const type = echographie?.typeEchographie || "AUTRE";
      const label = typeEchographieLabels[type as TypeEchographie] || type;

      if (!groups.has(label)) {
        groups.set(label, []);
      }

      groups.get(label)!.push({
        value: tarif.id,
        label: `${tarif.nomEchographie} - ${tarif.prixEchographie} CFA`,
        ...tarif,
      });
    }

    const result: GroupBase<OptionType>[] = [];
    for (const [label, options] of groups) {
      result.push({ label, options });
    }

    return result;
  }, [tarifEchographies, allEchographies]);

  return (
    <Select<OptionType, false, GroupBase<OptionType>>
      isMulti={false}
      options={groupedOptions}
      getOptionLabel={(e) => e.nomEchographie}
      getOptionValue={(e) => e.id}
      value={
        selectedOptions[0]
          ? ({
              ...selectedOptions[0],
              value: selectedOptions[0].id,
              label: selectedOptions[0].nomEchographie,
            } as OptionType)
          : null
      }
      onChange={handleChange}
      className="w-full"
      placeholder="Rechercher une échographie..."
      noOptionsMessage={() => "Aucune échographie disponible"}
      isLoading={isLoading}
      loadingMessage={() => "Chargement des échographies..."}
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

export default MultiSelectDemandeEchographie;
