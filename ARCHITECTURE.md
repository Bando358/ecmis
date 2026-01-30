# Architecture du Projet eCMIS

## Vue d'ensemble

**eCMIS** (Electronic Clinical Management Information System) est un système de gestion clinique développé avec Next.js 16, permettant la gestion complète des patients, consultations, examens, pharmacie et rapports.

## Stack Technique

| Technologie | Version | Usage |
|------------|---------|-------|
| Next.js | 16.0.10 | Framework React (App Router) |
| React | 19.1.0 | UI Library |
| TypeScript | 5.9.3 | Type Safety |
| Prisma | 6.14.0 | ORM |
| PostgreSQL | - | Base de données (Neon) |
| NextAuth | 4.24.11 | Authentification |
| Tailwind CSS | 4 | Styling |
| Shadcn/UI | - | Composants UI |

## Structure des Dossiers

```
ecmis/
├── app/                          # Next.js App Router
│   ├── (container)/              # Routes protégées avec layout
│   │   ├── dashboard/            # Tableau de bord
│   │   ├── client/               # Gestion des clients
│   │   ├── (administrator)/      # Pages admin
│   │   ├── (fichie-client)/      # Fiches cliniques
│   │   ├── (laboratoire)/        # Gestion labo
│   │   └── (pharmacie)/          # Gestion pharmacie
│   ├── api/                      # API Routes
│   │   ├── auth/[...nextauth]/   # NextAuth endpoints
│   │   ├── backup/               # Sauvegarde
│   │   └── restore/              # Restauration
│   ├── login/                    # Page de connexion
│   ├── register/                 # Inscription
│   └── layout.tsx                # Layout racine
│
├── components/                   # Composants React
│   ├── ui/                       # Composants Shadcn/UI
│   ├── table/                    # Tables spécialisées
│   ├── listings/                 # Listes de données
│   ├── tableRapport/             # Tables de rapports
│   ├── AuthGuard.tsx             # Protection par permissions
│   └── [autres composants]
│
├── lib/                          # Logique métier
│   ├── actions/                  # Server Actions
│   │   ├── authActions.ts
│   │   ├── clientActions.ts
│   │   ├── permissionActions.ts
│   │   └── [50+ autres actions]
│   ├── constants.ts              # Constantes centralisées
│   ├── logger.ts                 # Logger centralisé
│   ├── prisma.ts                 # Client Prisma
│   └── utils.ts                  # Utilitaires
│
├── hooks/                        # Hooks personnalisés
│   ├── usePermissions.ts         # Gestion des permissions
│   └── useInactivityGuard.ts     # Détection d'inactivité
│
├── prisma/
│   ├── schema.prisma             # Schéma de base de données
│   └── seed.ts                   # Données initiales
│
└── middleware.ts                 # Middleware (inactivité)
```

## Architecture des Données

### Modèles Principaux

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│    User     │──────│  Clinique   │──────│  Permission │
└─────────────┘      └─────────────┘      └─────────────┘
       │                    │
       │                    │
       ▼                    ▼
┌─────────────┐      ┌─────────────┐
│   Client    │──────│   Visite    │
└─────────────┘      └─────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌───────────┐   ┌───────────┐   ┌───────────┐
    │ Planning  │   │ Gyneco    │   │ Examen    │
    └───────────┘   └───────────┘   └───────────┘
                    (et 15+ autres fiches)
```

### Relations Clés

- **User ↔ Clinique** : Many-to-Many (via UserClinique)
- **Client → Clinique** : Many-to-One
- **Visite → Client** : Many-to-One
- **Fiches → Visite** : Many-to-One

## Flux d'Authentification

```
┌─────────┐    ┌──────────────┐    ┌─────────────┐
│  Login  │───▶│   NextAuth   │───▶│  JWT Token  │
└─────────┘    └──────────────┘    └─────────────┘
                     │
                     ▼
              ┌──────────────┐
              │    Prisma    │
              │  (User DB)   │
              └──────────────┘
```

### Sessions

- **Stratégie** : JWT
- **Durée** : 30 jours
- **Rafraîchissement** : 24h
- **Timeout inactivité** : 15 minutes

## Système de Permissions

### Structure

```typescript
Permission {
  userId: string
  table: TableName      // Enum avec 53 valeurs
  canCreate: boolean
  canRead: boolean
  canUpdate: boolean
  canDelete: boolean
}
```

### Utilisation Côté Frontend

```tsx
import { AuthGuard } from "@/components/AuthGuard";
import { TableName } from "@prisma/client";

// Protéger un bouton
<AuthGuard table={TableName.CLIENT} action="canCreate">
  <Button>Nouveau Client</Button>
</AuthGuard>

// Utiliser le hook
const { canCreate, canRead } = usePermissions();
if (canCreate(TableName.CLIENT)) {
  // Afficher le bouton
}
```

## Server Actions

Les Server Actions remplacent les API REST traditionnelles :

```typescript
// lib/actions/clientActions.ts
"use server";

export async function createClient(data: Client) {
  const client = await prisma.client.create({ data });
  revalidatePath("/clients");
  return client;
}
```

### Avantages

- Pas d'endpoints exposés
- Type-safe full-stack
- Cache invalidation automatique
- Validation serveur

## Pagination

```typescript
// Utilisation
const result = await getClientsPaginated(
  page,           // Numéro de page
  20,             // Éléments par page
  { search: "..." }  // Filtres
);

// Retour
{
  data: Client[],
  total: number,
  page: number,
  totalPages: number,
  hasNextPage: boolean,
  hasPreviousPage: boolean
}
```

## Logging

```typescript
import { logger, clientLogger } from "@/lib/logger";

// Usage basique
logger.info("Message", { userId: "123" });

// Avec module pré-défini
clientLogger.error("Échec création", error, { data: { ... } });

// Mesurer une opération
const done = logger.startOperation("fetchClients");
// ... opération ...
done(); // Log automatique avec durée
```

## Variables d'Environnement

```env
# Base de données
DATABASE_URL="postgresql://..."

# Authentification
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="[générer avec: openssl rand -base64 32]"

# Admin
ADMIN_EMAIL="admin@example.com"

# Logging (optionnel)
LOG_LEVEL="info"  # debug | info | warn | error
```

## Bonnes Pratiques

### 1. Types

- Utiliser les types Prisma (`Prisma.ClientWhereInput`)
- Éviter `any` - utiliser `unknown` + type guards
- Définir des interfaces pour les retours complexes

### 2. Erreurs

```typescript
import { ERROR_MESSAGES } from "@/lib/constants";
import { logger } from "@/lib/logger";

try {
  // ...
} catch (error) {
  logger.error("Description", error);
  throw new Error(ERROR_MESSAGES.DB_CONNECTION_ERROR);
}
```

### 3. Permissions

- Toujours vérifier côté serveur ET client
- Utiliser `AuthGuard` pour l'UI
- Les ADMIN ont toutes les permissions par défaut

### 4. Performance

- Utiliser la pagination pour les listes longues
- Éviter les N+1 queries (utiliser `include`)
- Utiliser `Promise.all` pour les requêtes parallèles

## Déploiement

### Prérequis

1. PostgreSQL (Neon recommandé)
2. Node.js 18+
3. Variables d'environnement configurées

### Commandes

```bash
# Installation
npm install

# Génération Prisma
npx prisma generate

# Migration (si nécessaire)
npx prisma migrate deploy

# Seed (données initiales)
npx prisma db seed

# Build
npm run build

# Start
npm start
```

## Composants UI Réutilisables

### SearchInput

Champ de recherche avec debounce intégré :

```tsx
import { SearchInput } from "@/components/ui/search-input";

<SearchInput
  onSearch={(query) => fetchResults(query)}
  placeholder="Rechercher un client..."
  debounceDelay={300}
/>
```

### EnhancedDataTable

Table avec pagination, recherche et tri :

```tsx
import { EnhancedDataTable } from "@/components/EnhancedDataTable";

<EnhancedDataTable
  columns={columns}
  data={clients}
  totalItems={totalClients}
  serverSidePagination
  currentPage={page}
  onPageChange={setPage}
  searchable
  paginated
/>
```

### PaginationControls

Contrôles de pagination autonomes :

```tsx
import { PaginationControls } from "@/components/ui/pagination-controls";

<PaginationControls
  currentPage={page}
  totalPages={10}
  totalItems={200}
  pageSize={20}
  onPageChange={setPage}
  onPageSizeChange={setPageSize}
/>
```

### Loading Components

```tsx
import { LoadingSpinner, LoadingPage, TableSkeleton } from "@/components/ui/loading";

// Spinner simple
<LoadingSpinner size="lg" text="Chargement..." />

// Page de chargement
<LoadingPage />

// Skeleton pour table
<TableSkeleton rows={5} columns={8} />
```

## Hooks Personnalisés

### useDebounce

```tsx
import { useDebounce, useDebouncedSearch } from "@/hooks";

// Débouncer une valeur
const debouncedValue = useDebounce(searchTerm, 300);

// Recherche complète avec état
const { searchTerm, debouncedSearchTerm, setSearchTerm, isSearching } = useDebouncedSearch(500);
```

### useLocalStorage

```tsx
import { useLocalStorage, useUserPreferences } from "@/hooks";

// Valeur persistée
const [theme, setTheme] = useLocalStorage("theme", "light");

// Préférences utilisateur pré-configurées
const { pageSize, setPageSize, sidebarCollapsed } = useUserPreferences();
```

### usePermissions

```tsx
import { usePermissions } from "@/hooks";
import { TableName } from "@prisma/client";

const { hasPermission, canCreate, canRead, canUpdate, canDelete } = usePermissions();

if (canCreate(TableName.CLIENT)) {
  // Afficher bouton création
}
```

## Validation avec Zod

Schémas centralisés dans `lib/schemas.ts` :

```tsx
import { loginSchema, clientSchema, validateData } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";

// Avec React Hook Form
const form = useForm({
  resolver: zodResolver(clientSchema),
});

// Validation manuelle
const result = validateData(clientSchema, formData);
if (!result.success) {
  console.error(result.errors);
}
```

## Nouveaux Composants UI (Phase 6)

### DateRangePicker

Sélecteur de plage de dates avec périodes prédéfinies :

```tsx
import { DateRangePicker, useDateRange } from "@/components/ui/date-range-picker";

// Avec hook
const { range, setFromPreset, setCustomRange } = useDateRange("thisMonth");

<DateRangePicker
  value={range}
  onChange={setCustomRange}
  showPresets
  minDate={new Date(2020, 0, 1)}
/>
```

### FileUpload

Upload de fichiers avec drag & drop et prévisualisations :

```tsx
import { FileUpload, SingleFileUpload } from "@/components/ui/file-upload";

// Multi-fichiers avec upload automatique
<FileUpload
  multiple
  maxFiles={5}
  accept="image/*,.pdf"
  maxSize={5 * 1024 * 1024}
  autoUpload
  onUpload={async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    return await res.json();
  }}
/>

// Fichier unique simple
<SingleFileUpload
  value={selectedFile}
  onChange={setSelectedFile}
  accept=".pdf,.doc"
/>
```

### StatusBadge

Badges de statut avec couleurs prédéfinies :

```tsx
import { StatusBadge, PaymentStatusBadge, StockStatusBadge } from "@/components/ui/status-badge";

<StatusBadge status="active" />
<PaymentStatusBadge status="paid" />
<StockStatusBadge status="low" />
```

### StatCard

Cartes de statistiques pour le dashboard :

```tsx
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";

<StatCardGrid>
  <StatCard
    title="Clients"
    value={250}
    change={12}
    icon={Users}
    trend="up"
  />
  <StatCard
    title="Revenus"
    value={15000}
    suffix=" FCFA"
    icon={DollarSign}
    trend="down"
    change={-5}
  />
</StatCardGrid>
```

### ConfirmDialog

Dialogues de confirmation réutilisables :

```tsx
import { useConfirm, confirmDelete } from "@/components/ui/confirm-dialog";

const { confirm, isConfirming } = useConfirm();

// Confirmation personnalisée
const handleArchive = async () => {
  const confirmed = await confirm({
    title: "Archiver ce client ?",
    description: "Le client sera déplacé vers les archives.",
    confirmText: "Archiver",
  });
  if (confirmed) {
    await archiveClient(id);
  }
};

// Confirmation de suppression (préconfigurée)
const handleDelete = async () => {
  const confirmed = await confirmDelete("ce client");
  if (confirmed) {
    await deleteClient(id);
  }
};
```

## Nouveaux Hooks (Phase 6)

### useModal

Gestion d'état des modales :

```tsx
import { useModal, useModals, useWizardModal } from "@/hooks";

// Modal simple
const modal = useModal<Client>();
<Button onClick={() => modal.open(client)}>Modifier</Button>
<Dialog open={modal.isOpen} onOpenChange={modal.close}>
  {modal.data && <EditForm client={modal.data} />}
</Dialog>

// Wizard multi-étapes
const wizard = useWizardModal(["info", "details", "confirm"]);
wizard.open();
wizard.next();
wizard.back();
```

### useFormEnhanced

Formulaire amélioré avec gestion d'état complète :

```tsx
import { useFormEnhanced, useEditForm, useMultiStepForm } from "@/hooks";

// Création
const form = useFormEnhanced({
  schema: clientSchema,
  defaultValues: { nom: "", prenom: "" },
  onSubmit: async (data) => createClient(data),
  successMessage: "Client créé",
  resetOnSuccess: true,
});

// Édition
const editForm = useEditForm({
  schema: clientSchema,
  initialData: client,
  entityId: client.id,
  onSubmit: async (data) => updateClient(client.id, data),
});

// Multi-étapes
const multiForm = useMultiStepForm({
  totalSteps: 3,
  stepSchemas: { 0: step1Schema, 1: step2Schema, 2: step3Schema },
});
```

### useAsync

Gestion d'opérations asynchrones :

```tsx
import { useAsync, usePolling } from "@/hooks";

// Requête unique
const { data, isLoading, error, execute } = useAsync(fetchClients);

// Polling automatique
const stats = usePolling(
  fetchStats,
  30000,  // Toutes les 30 secondes
  { enabled: true }
);
```

## API Client

Client HTTP centralisé avec gestion d'erreurs :

```tsx
import { api, isApiSuccess, isApiError, createSafeAction } from "@/lib/api-client";

// Requêtes HTTP
const result = await api.get<Client[]>("/api/clients");
if (isApiSuccess(result)) {
  console.log(result.data);
} else if (isApiError(result)) {
  console.error(result.error.message);
}

// Server Actions sécurisées
export const deleteClient = createSafeAction(
  async (id: string) => {
    await prisma.client.delete({ where: { id } });
    return { id };
  }
);

const result = await deleteClient("123");
```

## Formatters

Utilitaires de formatage centralisés :

```tsx
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  formatFileSize,
  formatFullName,
  formatPhone,
  formatBloodPressure,
  calculateAge,
} from "@/lib/formatters";

formatDate(new Date());              // "28 janv. 2026"
formatCurrency(15000);               // "15 000 FCFA"
formatFileSize(1024 * 1024);         // "1 Mo"
formatFullName("DUPONT", "Jean");    // "Jean DUPONT"
formatPhone("0123456789");           // "01 23 45 67 89"
formatBloodPressure(120, 80);        // "120/80 mmHg"
calculateAge(new Date(1990, 0, 1));  // 36
```

## Contributeurs

Pour contribuer au projet :

1. Créer une branche depuis `main`
2. Suivre les conventions de code existantes
3. Ajouter des types TypeScript stricts
4. Tester localement avant PR
5. Documenter les changements majeurs
