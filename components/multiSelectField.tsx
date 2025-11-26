import React, { useState } from "react";
import Select, { MultiValue } from "react-select";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

// Définir le type des options
type Option = {
  value: string;
  label: string;
};

type MultiSelectFieldProps = {
  options: Option[]; // Les options pour ce champ
  name: string; // Nom du champ (pour react-hook-form)
  placeholder?: string; // Placeholder optionnel
  defaultValue?: string[]; // Valeurs par défaut
  onChange?: (values: string[]) => void; // Callback pour synchronisation
};

export const MultiSelectField: React.FC<MultiSelectFieldProps> = ({
  options,
  name,
  placeholder = "Sélectionnez des options",
  defaultValue = [],
  onChange,
}) => {
  const [selectedOptions, setSelectedOptions] = useState<MultiValue<Option>>(
    options.filter((opt) => defaultValue.includes(opt.value)) // Pré-sélection des options
  );

  const handleSelectChange = (selected: MultiValue<Option>) => {
    setSelectedOptions(selected);
    const values = selected.map((opt) => opt.value);
    if (onChange) onChange(values); // Appelle le callback fourni
  };

  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{name}</FormLabel>
          <Select
            isMulti
            options={options}
            value={selectedOptions}
            onChange={handleSelectChange}
            placeholder={placeholder}
          />
          <FormControl>
            <Input
              {...field}
              value={selectedOptions.map((opt) => opt.value).join(", ")} // Stocke les valeurs concaténées
              readOnly
              className="hidden"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
