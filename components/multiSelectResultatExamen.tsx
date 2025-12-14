"use client";

import { FactureExamen } from "@prisma/client";
import React from "react";
import Select from "react-select";
import { SingleValue } from "react-select";

interface MultiSelectProps {
  factureExamens: FactureExamen[];
  selectedOptions: FactureExamen[];
  setSelectedOptions: React.Dispatch<React.SetStateAction<FactureExamen[]>>;
  isLoading?: boolean;
}

const MultiSelectResultatExamen: React.FC<MultiSelectProps> = ({
  factureExamens,
  selectedOptions,
  setSelectedOptions,
  isLoading = false,
}) => {
  // Mode single select : accepte SingleValue
  const handleChange = (selected: SingleValue<FactureExamen>) => {
    if (selected) {
      setSelectedOptions([selected]);
    } else {
      setSelectedOptions([]);
    }
  };

  const options = factureExamens.map((facture) => ({
    value: facture.id,
    label: `${facture.libelleExamen} - ${facture.prixExamen} CFA`,
    ...facture,
  }));

  return (
    <Select
      isMulti={false}
      options={isLoading ? [] : options} // vide quand ça charge
      getOptionLabel={(e) => e.libelleExamen}
      getOptionValue={(e) => e.id}
      value={selectedOptions[0] ?? null}
      onChange={handleChange}
      className="w-full"
      placeholder="Sélectionner un examen..."
      isLoading={isLoading}
    />
  );
};

export default MultiSelectResultatExamen;
