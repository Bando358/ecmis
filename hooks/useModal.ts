"use client";

import { useState, useCallback, useMemo } from "react";

/**
 * État d'une modale
 */
interface ModalState<T = unknown> {
  isOpen: boolean;
  data: T | null;
}

/**
 * Retour du hook useModal
 */
interface UseModalReturn<T = unknown> {
  isOpen: boolean;
  data: T | null;
  open: (data?: T) => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Hook pour gérer l'état d'une modale
 *
 * @example
 * ```tsx
 * // Modale simple
 * const modal = useModal();
 *
 * <Button onClick={() => modal.open()}>Ouvrir</Button>
 * <Dialog open={modal.isOpen} onOpenChange={modal.close}>
 *   ...
 * </Dialog>
 *
 * // Modale avec données
 * const editModal = useModal<Client>();
 *
 * <Button onClick={() => editModal.open(client)}>Modifier</Button>
 * <Dialog open={editModal.isOpen} onOpenChange={editModal.close}>
 *   {editModal.data && (
 *     <EditClientForm client={editModal.data} />
 *   )}
 * </Dialog>
 * ```
 */
export function useModal<T = unknown>(
  initialState: boolean = false
): UseModalReturn<T> {
  const [state, setState] = useState<ModalState<T>>({
    isOpen: initialState,
    data: null,
  });

  const open = useCallback((data?: T) => {
    setState({
      isOpen: true,
      data: data ?? null,
    });
  }, []);

  const close = useCallback(() => {
    setState({
      isOpen: false,
      data: null,
    });
  }, []);

  const toggle = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: !prev.isOpen,
    }));
  }, []);

  return {
    isOpen: state.isOpen,
    data: state.data,
    open,
    close,
    toggle,
  };
}

/**
 * Hook pour gérer plusieurs modales
 *
 * @example
 * ```tsx
 * type ModalTypes = "create" | "edit" | "delete";
 *
 * const modals = useModals<ModalTypes, Client>();
 *
 * // Ouvrir une modale spécifique
 * modals.open("edit", selectedClient);
 *
 * // Vérifier si une modale est ouverte
 * modals.isOpen("edit")
 *
 * // Obtenir les données
 * modals.getData("edit")
 * ```
 */
export function useModals<K extends string, T = unknown>() {
  const [states, setStates] = useState<Record<K, ModalState<T>>>(
    {} as Record<K, ModalState<T>>
  );

  const open = useCallback((key: K, data?: T) => {
    setStates((prev) => ({
      ...prev,
      [key]: {
        isOpen: true,
        data: data ?? null,
      },
    }));
  }, []);

  const close = useCallback((key: K) => {
    setStates((prev) => ({
      ...prev,
      [key]: {
        isOpen: false,
        data: null,
      },
    }));
  }, []);

  const closeAll = useCallback(() => {
    setStates((prev) => {
      const newStates = { ...prev };
      for (const key in newStates) {
        newStates[key] = { isOpen: false, data: null };
      }
      return newStates;
    });
  }, []);

  const isOpen = useCallback(
    (key: K): boolean => {
      return states[key]?.isOpen ?? false;
    },
    [states]
  );

  const getData = useCallback(
    (key: K): T | null => {
      return states[key]?.data ?? null;
    },
    [states]
  );

  const toggle = useCallback((key: K) => {
    setStates((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        isOpen: !prev[key]?.isOpen,
      },
    }));
  }, []);

  return {
    open,
    close,
    closeAll,
    isOpen,
    getData,
    toggle,
    states,
  };
}

/**
 * Hook pour une modale de confirmation typée
 *
 * @example
 * ```tsx
 * const deleteConfirm = useConfirmModal<{ id: string; name: string }>();
 *
 * const handleDelete = async () => {
 *   if (deleteConfirm.data) {
 *     await deleteClient(deleteConfirm.data.id);
 *     deleteConfirm.close();
 *   }
 * };
 *
 * <Button onClick={() => deleteConfirm.open({ id: client.id, name: client.nom })}>
 *   Supprimer
 * </Button>
 *
 * <AlertDialog open={deleteConfirm.isOpen} onOpenChange={deleteConfirm.close}>
 *   <AlertDialogContent>
 *     <AlertDialogHeader>
 *       <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
 *       <AlertDialogDescription>
 *         Voulez-vous vraiment supprimer {deleteConfirm.data?.name} ?
 *       </AlertDialogDescription>
 *     </AlertDialogHeader>
 *     <AlertDialogFooter>
 *       <AlertDialogCancel>Annuler</AlertDialogCancel>
 *       <AlertDialogAction onClick={handleDelete}>
 *         Supprimer
 *       </AlertDialogAction>
 *     </AlertDialogFooter>
 *   </AlertDialogContent>
 * </AlertDialog>
 * ```
 */
export function useConfirmModal<T = unknown>() {
  const [state, setState] = useState<ModalState<T> & { onConfirm?: () => void | Promise<void> }>({
    isOpen: false,
    data: null,
    onConfirm: undefined,
  });

  const open = useCallback((data: T, onConfirm?: () => void | Promise<void>) => {
    setState({
      isOpen: true,
      data,
      onConfirm,
    });
  }, []);

  const close = useCallback(() => {
    setState({
      isOpen: false,
      data: null,
      onConfirm: undefined,
    });
  }, []);

  const confirm = useCallback(async () => {
    if (state.onConfirm) {
      await state.onConfirm();
    }
    close();
  }, [state.onConfirm, close]);

  return {
    isOpen: state.isOpen,
    data: state.data,
    open,
    close,
    confirm,
  };
}

/**
 * Hook pour une modale avec étapes (wizard)
 *
 * @example
 * ```tsx
 * const wizard = useWizardModal(["info", "details", "confirm"]);
 *
 * <Dialog open={wizard.isOpen} onOpenChange={wizard.close}>
 *   {wizard.currentStep === "info" && <InfoStep />}
 *   {wizard.currentStep === "details" && <DetailsStep />}
 *   {wizard.currentStep === "confirm" && <ConfirmStep />}
 *
 *   <DialogFooter>
 *     {wizard.canGoBack && (
 *       <Button variant="outline" onClick={wizard.back}>
 *         Précédent
 *       </Button>
 *     )}
 *     {wizard.canGoNext ? (
 *       <Button onClick={wizard.next}>Suivant</Button>
 *     ) : (
 *       <Button onClick={handleSubmit}>Terminer</Button>
 *     )}
 *   </DialogFooter>
 * </Dialog>
 * ```
 */
export function useWizardModal<T extends string>(steps: readonly T[]) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentStep = steps[currentIndex];
  const canGoBack = currentIndex > 0;
  const canGoNext = currentIndex < steps.length - 1;
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === steps.length - 1;
  const progress = ((currentIndex + 1) / steps.length) * 100;

  const open = useCallback((startStep?: T) => {
    if (startStep) {
      const index = steps.indexOf(startStep);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    } else {
      setCurrentIndex(0);
    }
    setIsOpen(true);
  }, [steps]);

  const close = useCallback(() => {
    setIsOpen(false);
    setCurrentIndex(0);
  }, []);

  const next = useCallback(() => {
    if (canGoNext) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [canGoNext]);

  const back = useCallback(() => {
    if (canGoBack) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [canGoBack]);

  const goTo = useCallback((step: T) => {
    const index = steps.indexOf(step);
    if (index !== -1) {
      setCurrentIndex(index);
    }
  }, [steps]);

  const reset = useCallback(() => {
    setCurrentIndex(0);
  }, []);

  return {
    isOpen,
    currentStep,
    currentIndex,
    steps,
    canGoBack,
    canGoNext,
    isFirstStep,
    isLastStep,
    progress,
    open,
    close,
    next,
    back,
    goTo,
    reset,
  };
}
