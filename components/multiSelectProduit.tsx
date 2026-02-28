"use client";

import { TarifProduit, Produit } from "@prisma/client";
import React, { useMemo, useCallback } from "react";
import Select from "react-select";
import { SingleValue } from "react-select";

interface MultiSelectProps {
  produits: TarifProduit[];
  allProduits: Produit[];
  selectedOptions: TarifProduit[];
  setSelectedOptions: React.Dispatch<React.SetStateAction<TarifProduit[]>>;
  isLoading?: boolean;
}

// 🔥 OPTIMISATION : Créer un cache pour les noms de produits
const createProductNameCache = (produits: Produit[]) => {
  const cache = new Map<string, string>();
  produits.forEach((produit) => {
    cache.set(produit.id, produit.nomProduit);
  });
  return cache;
};

const MultiSelectProduit: React.FC<MultiSelectProps> = ({
  produits,
  allProduits,
  selectedOptions,
  setSelectedOptions,
  isLoading = false,
}) => {
  // 🔥 OPTIMISATION : Cache des noms de produits
  const productNameCache = useMemo(
    () => createProductNameCache(allProduits),
    [allProduits]
  );

  // 🔥 OPTIMISATION : Options mémorisées avec cache
  const options = useMemo(() => {
    if (!produits.length) return [];

    return produits.map((produit) => {
      const nomProduit =
        productNameCache.get(produit.idProduit) || "Produit inconnu";
      return {
        value: produit.id,
        label: nomProduit,
        stock: produit.quantiteStock ?? 0,
        data: produit,
      };
    });
  }, [produits, productNameCache]);

  type OptionType = {
    value: string;
    label: string;
    stock: number;
    data: TarifProduit;
  };

  const getStockColor = (stock: number) => {
    if (stock === 0) return "text-red-600 font-semibold";
    if (stock <= 10) return "text-amber-600 font-medium";
    return "text-green-600";
  };

  const formatOptionLabel = (option: OptionType) => (
    <div className="flex items-center justify-between w-full">
      <span>{option.label}</span>
      <span className={`text-xs ${getStockColor(option.stock)}`}>
        {option.stock}
      </span>
    </div>
  );

  // 🔥 OPTIMISATION : Gestionnaire de changement optimisé
  const handleChange = useCallback(
    (selected: SingleValue<OptionType>) => {
      if (selected) {
        setSelectedOptions([selected.data]);
      } else {
        setSelectedOptions([]);
      }
    },
    [setSelectedOptions]
  );

  // 🔥 OPTIMISATION : Valeur actuelle mémorisée
  const currentValue = useMemo((): OptionType | null => {
    if (selectedOptions.length === 0) return null;
    const selected = selectedOptions[0];
    const nomProduit =
      productNameCache.get(selected.idProduit) || "Produit inconnu";
    return {
      value: selected.id,
      label: nomProduit,
      stock: selected.quantiteStock ?? 0,
      data: selected,
    };
  }, [selectedOptions, productNameCache]);

  return (
    <Select<OptionType>
      options={options}
      value={currentValue}
      onChange={handleChange}
      formatOptionLabel={formatOptionLabel}
      className="w-full"
      classNamePrefix="react-select"
      isLoading={isLoading}
      loadingMessage={() => "Chargement des produits..."}
      noOptionsMessage={() => "Aucun produit disponible"}
      placeholder={isLoading ? "Chargement..." : "Sélectionner un produit..."}
      isClearable
      isSearchable
      filterOption={(option, inputValue) => {
        if (!inputValue) return true;
        return option.label.toLowerCase().includes(inputValue.toLowerCase());
      }}
    />
  );
};

// 🔥 OPTIMISATION : Comparaison profonde des props
const areEqual = (prevProps: MultiSelectProps, nextProps: MultiSelectProps) => {
  return (
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.selectedOptions === nextProps.selectedOptions &&
    prevProps.produits === nextProps.produits &&
    prevProps.allProduits === nextProps.allProduits
  );
};

export default React.memo(MultiSelectProduit, areEqual);
