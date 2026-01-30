"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";

export interface SearchInputProps {
  /** Valeur contrôlée (optionnel) */
  value?: string;
  /** Callback quand la valeur change (immédiat) */
  onChange?: (value: string) => void;
  /** Callback quand la valeur debouncée change */
  onSearch?: (value: string) => void;
  /** Délai de debounce en ms (default: 300) */
  debounceDelay?: number;
  /** Placeholder */
  placeholder?: string;
  /** Afficher l'indicateur de chargement */
  isLoading?: boolean;
  /** Désactiver l'input */
  disabled?: boolean;
  /** Autofocus */
  autoFocus?: boolean;
  /** Classe CSS additionnelle */
  className?: string;
  /** Classe CSS pour le conteneur */
  containerClassName?: string;
}

/**
 * Composant de recherche avec debounce intégré
 *
 * @example
 * ```tsx
 * // Usage simple avec callback debouncé
 * <SearchInput
 *   onSearch={(query) => fetchResults(query)}
 *   placeholder="Rechercher un client..."
 * />
 *
 * // Usage contrôlé
 * <SearchInput
 *   value={search}
 *   onChange={setSearch}
 *   onSearch={handleSearch}
 *   isLoading={isSearching}
 * />
 * ```
 */
export function SearchInput({
  value: controlledValue,
  onChange,
  onSearch,
  debounceDelay = 300,
  placeholder = "Rechercher...",
  isLoading = false,
  disabled = false,
  autoFocus = false,
  className,
  containerClassName,
}: SearchInputProps) {
  // État interne si non contrôlé
  const [internalValue, setInternalValue] = useState("");
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  // Debounce de la valeur
  const debouncedValue = useDebounce(value, debounceDelay);

  // Indicateur de recherche en cours (valeur différente de la valeur debouncée)
  const isSearching = value !== debouncedValue;

  // Gérer le changement de valeur
  const handleChange = useCallback(
    (newValue: string) => {
      if (!isControlled) {
        setInternalValue(newValue);
      }
      onChange?.(newValue);
    },
    [isControlled, onChange]
  );

  // Appeler onSearch quand la valeur debouncée change
  useEffect(() => {
    onSearch?.(debouncedValue);
  }, [debouncedValue, onSearch]);

  // Effacer la recherche
  const handleClear = useCallback(() => {
    handleChange("");
  }, [handleChange]);

  return (
    <div className={cn("relative", containerClassName)}>
      {/* Icône de recherche ou loader */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {isLoading || isSearching ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
      </div>

      {/* Input */}
      <Input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={cn("pl-9 pr-9", className)}
      />

      {/* Bouton clear */}
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={handleClear}
          disabled={disabled}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Effacer la recherche</span>
        </Button>
      )}
    </div>
  );
}

/**
 * Fonction utilitaire pour surligner le texte correspondant à la recherche
 */
export function highlightSearchText(
  text: string | null | undefined,
  search: string
): React.ReactNode {
  if (!text) return text;
  if (!search.trim()) return text;

  const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedSearch})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark
            key={index}
            className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}
