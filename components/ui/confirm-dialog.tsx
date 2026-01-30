"use client";

import { useState, useCallback, createContext, useContext, ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Trash2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConfirmVariant = "default" | "danger" | "warning" | "info";

export interface ConfirmDialogOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ConfirmDialogState extends ConfirmDialogOptions {
  isOpen: boolean;
  isLoading: boolean;
}

interface ConfirmDialogContextValue {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  confirmDelete: (itemName: string, onConfirm: () => void | Promise<void>) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

const variantStyles: Record<ConfirmVariant, { icon: typeof AlertTriangle; buttonClass: string }> = {
  default: {
    icon: Info,
    buttonClass: "bg-primary hover:bg-primary/90",
  },
  danger: {
    icon: Trash2,
    buttonClass: "bg-red-600 hover:bg-red-700 text-white",
  },
  warning: {
    icon: AlertTriangle,
    buttonClass: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  info: {
    icon: Info,
    buttonClass: "bg-blue-600 hover:bg-blue-700 text-white",
  },
};

/**
 * Provider pour le système de confirmation
 * Wrap votre app pour utiliser useConfirm()
 */
export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmDialogState>({
    isOpen: false,
    isLoading: false,
    title: "",
    description: "",
    variant: "default",
  });

  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setResolveRef(() => resolve);
      setState({
        isOpen: true,
        isLoading: false,
        ...options,
      });
    });
  }, []);

  const confirmDelete = useCallback(
    (itemName: string, onConfirm: () => void | Promise<void>): Promise<boolean> => {
      return confirm({
        title: "Confirmer la suppression",
        description: `Êtes-vous sûr de vouloir supprimer "${itemName}" ? Cette action est irréversible.`,
        confirmText: "Supprimer",
        cancelText: "Annuler",
        variant: "danger",
        onConfirm,
      });
    },
    [confirm]
  );

  const handleConfirm = async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      if (state.onConfirm) {
        await state.onConfirm();
      }
      resolveRef?.(true);
    } catch (error) {
      console.error("Erreur lors de la confirmation:", error);
      resolveRef?.(false);
    } finally {
      setState((prev) => ({ ...prev, isOpen: false, isLoading: false }));
    }
  };

  const handleCancel = () => {
    state.onCancel?.();
    resolveRef?.(false);
    setState((prev) => ({ ...prev, isOpen: false }));
  };

  const variant = state.variant || "default";
  const { icon: Icon, buttonClass } = variantStyles[variant];

  return (
    <ConfirmDialogContext.Provider value={{ confirm, confirmDelete }}>
      {children}

      <AlertDialog open={state.isOpen} onOpenChange={(open) => !open && handleCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  variant === "danger" && "bg-red-100",
                  variant === "warning" && "bg-amber-100",
                  variant === "info" && "bg-blue-100",
                  variant === "default" && "bg-gray-100"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    variant === "danger" && "text-red-600",
                    variant === "warning" && "text-amber-600",
                    variant === "info" && "text-blue-600",
                    variant === "default" && "text-gray-600"
                  )}
                />
              </div>
              <AlertDialogTitle>{state.title}</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="ml-13 pl-0.5">
              {state.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={state.isLoading} onClick={handleCancel}>
              {state.cancelText || "Annuler"}
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonClass}
              disabled={state.isLoading}
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
            >
              {state.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {state.confirmText || "Confirmer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmDialogContext.Provider>
  );
}

/**
 * Hook pour afficher des dialogues de confirmation
 *
 * @example
 * ```tsx
 * const { confirm, confirmDelete } = useConfirm();
 *
 * // Confirmation simple
 * const confirmed = await confirm({
 *   title: "Confirmer l'action",
 *   description: "Voulez-vous continuer ?",
 * });
 *
 * // Suppression avec loading automatique
 * await confirmDelete("Client Jean Dupont", async () => {
 *   await deleteClient(clientId);
 *   toast.success("Client supprimé");
 * });
 * ```
 */
export function useConfirm() {
  const context = useContext(ConfirmDialogContext);

  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmDialogProvider");
  }

  return context;
}

/**
 * Composant ConfirmDialog autonome (sans provider)
 * Pour les cas où vous n'avez pas besoin du provider global
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  variant = "default",
  isLoading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}) {
  const { icon: Icon, buttonClass } = variantStyles[variant];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                variant === "danger" && "bg-red-100",
                variant === "warning" && "bg-amber-100",
                variant === "info" && "bg-blue-100",
                variant === "default" && "bg-gray-100"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  variant === "danger" && "text-red-600",
                  variant === "warning" && "text-amber-600",
                  variant === "info" && "text-blue-600",
                  variant === "default" && "text-gray-600"
                )}
              />
            </div>
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="ml-13 pl-0.5">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading} onClick={onCancel}>
            {cancelText}
          </AlertDialogCancel>
          <Button
            className={buttonClass}
            disabled={isLoading}
            onClick={onConfirm}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
