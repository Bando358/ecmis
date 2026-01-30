/**
 * Export centralisé des hooks personnalisés
 */

// Debounce
export {
  useDebounce,
  useDebouncedCallback,
  useDebouncedSearch,
} from "./useDebounce";

// LocalStorage
export { useLocalStorage, useUserPreferences } from "./useLocalStorage";

// Permissions
export { usePermissions } from "./usePermissions";
export type { PermissionAction, PermissionMap, UsePermissionsReturn } from "./usePermissions";

// Async operations
export { useAsync, useAsyncActions, usePolling } from "./useAsync";
export type { AsyncStatus, AsyncState, UseAsyncReturn } from "./useAsync";

// Clipboard
export { useClipboard, useCopyToClipboard } from "./useClipboard";

// Media Query / Responsive
export {
  useMediaQuery,
  useBreakpoint,
  useBreakpointValue,
  usePrefersDarkMode,
  usePrefersReducedMotion,
  useOrientation,
  useResponsive,
  useWindowSize,
  useWindowSizeDebounced,
} from "./useMediaQuery";

// Modales
export {
  useModal,
  useModals,
  useConfirmModal,
  useWizardModal,
} from "./useModal";

// Formulaires améliorés
export {
  useFormEnhanced,
  useEditForm,
  useMultiStepForm,
} from "./useFormEnhanced";

// Inactivité
export { useInactivityGuard } from "./useInactivityGuard";

// Mobile detection
export { useIsMobile } from "./use-mobile";
