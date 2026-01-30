"use client";

import { useState, useCallback, useTransition, useMemo } from "react";
import {
  useForm as useReactHookForm,
  UseFormProps,
  FieldValues,
  UseFormReturn,
  SubmitHandler,
  SubmitErrorHandler,
  Path,
  Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ZodSchema, ZodError } from "zod";
import { toast } from "sonner";

// Types pour l'API response (inline pour éviter dépendance circulaire)
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

function isApiSuccess<T>(response: ApiResponse<T>): response is ApiResponse<T> & { data: T } {
  return response.success && response.data !== undefined;
}

function isApiError(response: ApiResponse): boolean {
  return !response.success && response.error !== undefined;
}

// ============================================
// TYPES
// ============================================

interface UseFormEnhancedOptions<TFormValues extends FieldValues, TResponse = unknown> {
  /** Schéma Zod pour la validation */
  schema?: ZodSchema<TFormValues>;
  /** Valeurs par défaut */
  defaultValues?: UseFormProps<TFormValues>["defaultValues"];
  /** Action à exécuter lors de la soumission */
  onSubmit?: (data: TFormValues) => Promise<ApiResponse<TResponse> | TResponse | void>;
  /** Callback en cas de succès */
  onSuccess?: (data: TResponse | undefined, formData: TFormValues) => void;
  /** Callback en cas d'erreur */
  onError?: (error: unknown) => void;
  /** Message de succès (toast) */
  successMessage?: string;
  /** Message d'erreur (toast) */
  errorMessage?: string;
  /** Réinitialiser le formulaire après succès */
  resetOnSuccess?: boolean;
  /** Mode de validation */
  mode?: UseFormProps<TFormValues>["mode"];
}

interface UseFormEnhancedReturn<TFormValues extends FieldValues, TResponse = unknown>
  extends UseFormReturn<TFormValues> {
  /** Soumettre le formulaire */
  handleSubmit: (
    onValid?: SubmitHandler<TFormValues>,
    onInvalid?: SubmitErrorHandler<TFormValues>
  ) => (e?: React.BaseSyntheticEvent) => Promise<void>;
  /** En cours de soumission */
  isSubmitting: boolean;
  /** Soumission réussie */
  isSuccess: boolean;
  /** Erreur de soumission */
  submitError: string | null;
  /** Données retournées après succès */
  submitData: TResponse | null;
  /** Réinitialiser l'état de soumission */
  resetSubmitState: () => void;
  /** Transition React pour la soumission */
  isPending: boolean;
  /** Le formulaire a été modifié */
  isDirty: boolean;
}

// ============================================
// HOOK PRINCIPAL
// ============================================

/**
 * Hook de formulaire amélioré avec validation Zod et gestion d'état
 *
 * @example
 * ```tsx
 * const form = useFormEnhanced({
 *   schema: clientSchema,
 *   defaultValues: {
 *     nom: "",
 *     prenom: "",
 *   },
 *   onSubmit: async (data) => {
 *     return await createClient(data);
 *   },
 *   onSuccess: () => {
 *     router.push("/clients");
 *   },
 *   successMessage: "Client créé avec succès",
 *   resetOnSuccess: true,
 * });
 *
 * <Form {...form}>
 *   <form onSubmit={form.handleSubmit()}>
 *     <TextField control={form.control} name="nom" label="Nom" />
 *     <TextField control={form.control} name="prenom" label="Prénom" />
 *     <Button type="submit" disabled={form.isSubmitting}>
 *       {form.isSubmitting ? "Enregistrement..." : "Enregistrer"}
 *     </Button>
 *   </form>
 * </Form>
 * ```
 */
export function useFormEnhanced<TFormValues extends FieldValues, TResponse = unknown>({
  schema,
  defaultValues,
  onSubmit,
  onSuccess,
  onError,
  successMessage,
  errorMessage = "Une erreur est survenue",
  resetOnSuccess = false,
  mode = "onBlur",
}: UseFormEnhancedOptions<TFormValues, TResponse>): UseFormEnhancedReturn<
  TFormValues,
  TResponse
> {
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitData, setSubmitData] = useState<TResponse | null>(null);

  // Form React Hook Form avec resolver Zod optionnel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useReactHookForm<TFormValues>({
    defaultValues,
    resolver: schema
      ? (zodResolver(schema as any) as Resolver<TFormValues>)
      : undefined,
    mode,
  });

  // Réinitialiser l'état de soumission
  const resetSubmitState = useCallback(() => {
    setIsSuccess(false);
    setSubmitError(null);
    setSubmitData(null);
  }, []);

  // Handler de soumission amélioré
  const handleSubmit = useCallback(
    (
      onValid?: SubmitHandler<TFormValues>,
      onInvalid?: SubmitErrorHandler<TFormValues>
    ) => {
      return form.handleSubmit(
        async (data) => {
          // Réinitialiser l'état
          resetSubmitState();
          setIsSubmitting(true);

          try {
            // Exécuter le handler custom d'abord si fourni
            if (onValid) {
              await onValid(data);
            }

            // Puis exécuter onSubmit si fourni
            if (onSubmit) {
              startTransition(async () => {
                try {
                  const result = await onSubmit(data);

                  // Gérer différents types de réponses
                  if (result && typeof result === "object" && "success" in result) {
                    // C'est une ApiResponse
                    const apiResult = result as ApiResponse<TResponse>;

                    if (isApiSuccess(apiResult)) {
                      setIsSuccess(true);
                      setSubmitData(apiResult.data ?? null);

                      if (successMessage) {
                        toast.success(successMessage);
                      }

                      if (resetOnSuccess) {
                        form.reset();
                      }

                      onSuccess?.(apiResult.data, data);
                    } else if (isApiError(apiResult)) {
                      throw new Error(apiResult.error?.message || "Une erreur est survenue");
                    }
                  } else {
                    // Réponse simple
                    setIsSuccess(true);
                    setSubmitData((result as TResponse) ?? null);

                    if (successMessage) {
                      toast.success(successMessage);
                    }

                    if (resetOnSuccess) {
                      form.reset();
                    }

                    onSuccess?.(result as TResponse | undefined, data);
                  }
                } catch (error) {
                  const message =
                    error instanceof Error ? error.message : errorMessage;
                  setSubmitError(message);
                  toast.error(message);
                  onError?.(error);
                  console.error("Form submission error:", error);
                }
              });
            } else {
              setIsSuccess(true);
              if (successMessage) {
                toast.success(successMessage);
              }
              onSuccess?.(undefined, data);
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : errorMessage;
            setSubmitError(message);
            toast.error(message);
            onError?.(error);
            console.error("Form submission error:", error);
          } finally {
            setIsSubmitting(false);
          }
        },
        (errors) => {
          // Gérer les erreurs de validation
          console.warn("Form validation errors:", errors);
          onInvalid?.(errors);
        }
      );
    },
    [
      form,
      onSubmit,
      onSuccess,
      onError,
      successMessage,
      errorMessage,
      resetOnSuccess,
      resetSubmitState,
    ]
  );

  return {
    ...form,
    handleSubmit,
    isSubmitting: isSubmitting || isPending,
    isSuccess,
    submitError,
    submitData,
    resetSubmitState,
    isPending,
    isDirty: form.formState.isDirty,
  };
}

// ============================================
// HOOK POUR FORMULAIRE D'ÉDITION
// ============================================

interface UseEditFormOptions<TFormValues extends FieldValues, TResponse = unknown>
  extends UseFormEnhancedOptions<TFormValues, TResponse> {
  /** Données existantes à éditer */
  initialData?: Partial<TFormValues>;
  /** ID de l'entité à éditer */
  entityId?: string;
}

/**
 * Hook spécialisé pour les formulaires d'édition
 *
 * @example
 * ```tsx
 * const form = useEditForm({
 *   schema: clientSchema,
 *   initialData: client,
 *   entityId: client.id,
 *   onSubmit: async (data) => {
 *     return await updateClient(client.id, data);
 *   },
 *   successMessage: "Client mis à jour",
 * });
 * ```
 */
export function useEditForm<TFormValues extends FieldValues, TResponse = unknown>({
  initialData,
  entityId,
  defaultValues,
  ...options
}: UseEditFormOptions<TFormValues, TResponse>) {
  const mergedDefaults = useMemo(
    () => ({
      ...defaultValues,
      ...initialData,
    }),
    [defaultValues, initialData]
  );

  const form = useFormEnhanced<TFormValues, TResponse>({
    ...options,
    defaultValues: mergedDefaults as UseFormProps<TFormValues>["defaultValues"],
  });

  // Détecter si les données ont changé
  const hasChanges = form.isDirty;

  return {
    ...form,
    entityId,
    hasChanges,
  };
}

// ============================================
// HOOK POUR FORMULAIRES MULTI-ÉTAPES
// ============================================

interface UseMultiStepFormOptions<TFormValues extends FieldValues> {
  /** Schémas par étape */
  stepSchemas?: Record<number, ZodSchema<Partial<TFormValues>>>;
  /** Valeurs par défaut */
  defaultValues?: UseFormProps<TFormValues>["defaultValues"];
  /** Nombre total d'étapes */
  totalSteps: number;
}

/**
 * Hook pour formulaires multi-étapes
 *
 * @example
 * ```tsx
 * const form = useMultiStepForm({
 *   totalSteps: 3,
 *   stepSchemas: {
 *     0: step1Schema,
 *     1: step2Schema,
 *     2: step3Schema,
 *   },
 *   defaultValues: {
 *     nom: "",
 *     email: "",
 *     adresse: "",
 *   },
 * });
 *
 * // Navigation
 * <Button onClick={form.nextStep} disabled={!form.canGoNext}>
 *   Suivant
 * </Button>
 * <Button onClick={form.prevStep} disabled={!form.canGoBack}>
 *   Précédent
 * </Button>
 *
 * // Progress
 * <Progress value={form.progress} />
 * ```
 */
export function useMultiStepForm<TFormValues extends FieldValues>({
  stepSchemas,
  defaultValues,
  totalSteps,
}: UseMultiStepFormOptions<TFormValues>) {
  const [currentStep, setCurrentStep] = useState(0);

  const form = useReactHookForm<TFormValues>({
    defaultValues,
    mode: "onBlur",
  });

  // Valider l'étape actuelle
  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    if (!stepSchemas?.[currentStep]) return true;

    try {
      const schema = stepSchemas[currentStep];
      const values = form.getValues();
      await schema.parseAsync(values);
      return true;
    } catch (error) {
      if (error instanceof ZodError) {
        // Mettre à jour les erreurs du formulaire
        error.issues.forEach((issue) => {
          const path = issue.path.join(".") as Path<TFormValues>;
          form.setError(path, {
            type: "manual",
            message: issue.message,
          });
        });
      }
      return false;
    }
  }, [currentStep, stepSchemas, form]);

  // Navigation
  const nextStep = useCallback(async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
      return true;
    }
    return false;
  }, [currentStep, totalSteps, validateCurrentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 0 && step < totalSteps) {
        setCurrentStep(step);
      }
    },
    [totalSteps]
  );

  const reset = useCallback(() => {
    setCurrentStep(0);
    form.reset();
  }, [form]);

  return {
    ...form,
    currentStep,
    totalSteps,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === totalSteps - 1,
    canGoNext: currentStep < totalSteps - 1,
    canGoBack: currentStep > 0,
    progress: ((currentStep + 1) / totalSteps) * 100,
    nextStep,
    prevStep,
    goToStep,
    reset,
    validateCurrentStep,
  };
}
