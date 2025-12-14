"use client";

import { TarifExamen } from "@prisma/client";
import React from "react";
import Select from "react-select";
import { SingleValue } from "react-select";

interface MultiSelectProps {
  tarifExamens: TarifExamen[];
  selectedOptions: TarifExamen[];
  setSelectedOptions: React.Dispatch<React.SetStateAction<TarifExamen[]>>;
  isLoading?: boolean;
}

const MultiSelectDemandeExamen: React.FC<MultiSelectProps> = ({
  tarifExamens,
  selectedOptions,
  setSelectedOptions,
  isLoading = false,
}) => {
  // Mode single select : accepte SingleValue
  const handleChange = (selected: SingleValue<TarifExamen>) => {
    if (selected) {
      setSelectedOptions([selected]);
    } else {
      setSelectedOptions([]);
    }
  };

  const options = tarifExamens.map((tarif) => ({
    value: tarif.id,
    label: `${tarif.nomExamen} - ${tarif.prixExamen} CFA`,
    ...tarif,
  }));

  return (
    <Select
      isMulti={false}
      options={options}
      getOptionLabel={(e) => e.nomExamen}
      getOptionValue={(e) => e.id}
      value={selectedOptions[0] ?? null}
      onChange={handleChange}
      className="w-full"
      placeholder="Sélectionner un examen..."
      isLoading={isLoading}
      loadingMessage={() => "Chargement des examens..."}
    />
  );
};

export default MultiSelectDemandeExamen;
