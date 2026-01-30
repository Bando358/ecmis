/**
 * Export centralisé des composants UI personnalisés
 *
 * @example
 * ```tsx
 * import {
 *   LoadingSpinner,
 *   EmptyState,
 *   StatusBadge,
 *   DateRangePicker,
 * } from "@/components/ui";
 * ```
 */

// Loading states
export {
  LoadingSpinner,
  LoadingPage,
  LoadingOverlay,
  TableSkeleton,
  CardSkeleton,
  DashboardSkeleton,
} from "./loading";

// Empty states
export {
  EmptyState,
  NoSearchResults,
  NoClients,
  NoProducts,
  NoDocuments,
  NoAppointments,
  ErrorState,
} from "./empty-state";

// Status badges
export {
  StatusBadge,
  PaymentStatusBadge,
  StockStatusBadge,
  UserStatusBadge,
  AppointmentStatusBadge,
  BooleanBadge,
  getStockStatus,
  type StatusType,
} from "./status-badge";

// Stat cards
export {
  StatCard,
  StatCardGrid,
  StatInline,
} from "./stat-card";

// Form fields
export {
  TextField,
  PasswordField,
  NumberField,
  TextareaField,
  SelectField,
  DateField,
  CheckboxField,
  RadioField,
  FormSection,
  FormRow,
} from "./form-fields";

// Date range picker
export {
  DateRangePicker,
  PeriodSelect,
  useDateRange,
} from "./date-range-picker";

// File upload
export {
  FileUpload,
  SingleFileUpload,
} from "./file-upload";

// Copy to clipboard
export {
  CopyButton,
  CopyableField,
  CopyableCode,
  ClickToCopy,
} from "./copy-button";

// User avatar
export {
  UserAvatar,
  AvatarGroup,
  AvatarWithName,
  type AvatarSize,
} from "./user-avatar";

// Search input
export {
  SearchInput,
} from "./search-input";

// Pagination
export {
  PaginationControls,
} from "./pagination-controls";

// Confirm dialog
export {
  ConfirmDialog,
  ConfirmDialogProvider,
  useConfirm,
  type ConfirmVariant,
  type ConfirmDialogOptions,
} from "./confirm-dialog";
