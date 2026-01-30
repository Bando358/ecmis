# Points d'Amélioration - eCMIS AIBEF

> **Document généré le**: 21 janvier 2026
> **Version du projet**: 0.1.0
> **Stack technique**: Next.js 16, React 19, Prisma, PostgreSQL (Neon)

---

## Table des matières

1. [Problèmes Critiques (P0)](#-problèmes-critiques-p0)
2. [Problèmes Importants (P1)](#-problèmes-importants-p1)
3. [Améliorations Recommandées (P2)](#-améliorations-recommandées-p2)
4. [Optimisations (P3)](#-optimisations-p3)
5. [Checklist de Correction](#-checklist-de-correction)
6. [Ressources](#-ressources)

---

## 🔴 Problèmes Critiques (P0)

### 1. Fuite de credentials dans le fichier .env

**Fichier**: `.env`
**Gravité**: CRITIQUE

Le fichier `.env` contient des credentials de base de données en clair et est potentiellement commité dans Git.

```env
DATABASE_URL="postgresql://neondb_owner:npg_xxx@ep-cool-shadow-xxx.aws.neon.tech/neondb"
```

**Problèmes identifiés**:
- Mot de passe de base de données visible
- `NEXTAUTH_SECRET` manquant (requis pour la sécurité des sessions)
- Fichier potentiellement versionné

**Actions correctives**:
```bash
# 1. Ajouter .env au .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore

# 2. Supprimer du cache Git si déjà commité
git rm --cached .env

# 3. Régénérer les credentials sur Neon Dashboard

# 4. Générer un NEXTAUTH_SECRET
openssl rand -base64 32
```

**Configuration .env recommandée**:
```env
# Base de données
DATABASE_URL="postgresql://..."

# NextAuth (OBLIGATOIRE)
NEXTAUTH_SECRET="votre-secret-généré-ici"
NEXTAUTH_URL="https://votre-domaine.com"

# Emails administrateurs
ADMIN_EMAIL="email1@domain.com;email2@domain.com"

# Environnement
NODE_ENV="development"
```

---

### 2. Erreurs TypeScript et ESLint ignorées en production

**Fichier**: `next.config.ts` (lignes 12-18)
**Gravité**: CRITIQUE

```typescript
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,  // ❌ DANGEREUX
  },
  typescript: {
    ignoreBuildErrors: true,   // ❌ DANGEREUX
  },
};
```

**Risques**:
- Bugs silencieux en production
- Vulnérabilités de sécurité non détectées
- Erreurs de typage pouvant causer des crashes

**Actions correctives**:
```typescript
// next.config.ts - Configuration recommandée
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['app', 'components', 'lib', 'hooks'],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
```

**Étapes de correction**:
1. Activer les vérifications
2. Exécuter `npm run lint` et corriger les erreurs
3. Exécuter `npx tsc --noEmit` et corriger les erreurs de type
4. Mettre en place un hook pre-commit

---

### 3. Code mort dans le middleware

**Fichier**: `middleware.ts`
**Gravité**: ÉLEVÉE

Le fichier contient ~200 lignes de code commenté (3 anciennes versions du middleware).

**État actuel**:
- Lignes 1-214: Code commenté (anciennes versions)
- Lignes 215-317: Code actif

**Actions correctives**:
1. Supprimer tout le code commenté
2. Garder uniquement la version active
3. Documenter les changements via Git

---

### 4. Absence totale de tests

**Gravité**: CRITIQUE

Aucun fichier de test dans le projet. Pour un système médical, c'est inacceptable.

**Actions correctives**:

```bash
# Installation de Vitest (recommandé pour Next.js)
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

**Configuration** (`vitest.config.ts`):
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
  },
});
```

**Exemple de test** (`lib/actions/__tests__/clientActions.test.ts`):
```typescript
import { describe, it, expect, vi } from 'vitest';
import { checkCodeVih } from '../clientActions';

describe('checkCodeVih', () => {
  it('devrait retourner false pour une chaîne vide', async () => {
    const result = await checkCodeVih('');
    expect(result).toBe(false);
  });

  it('devrait retourner false pour une valeur non-string', async () => {
    const result = await checkCodeVih(null as any);
    expect(result).toBe(false);
  });
});
```

---

## 🟠 Problèmes Importants (P1)

### 5. Usage excessif du type `any`

**Fichiers concernés**:
- `lib/actions/clientActions.ts` (ligne 43)
- `lib/auth-options.ts` (lignes 99-100)

**Exemples problématiques**:
```typescript
// ❌ Mauvais
const where: any = {};
(session.user as any).username = token.username;

// ✅ Bon
interface ClientWhereInput {
  dateEnregistrement?: {
    gte?: Date;
    lte?: Date;
  };
}
const where: ClientWhereInput = {};
```

**Actions correctives**:
1. Créer des interfaces pour tous les types
2. Étendre correctement les types NextAuth dans `next-auth.d.ts`
3. Utiliser `unknown` au lieu de `any` quand le type est incertain

---

### 6. Absence de validation des entrées dans les Server Actions

**Fichier**: `lib/actions/clientActions.ts`

```typescript
// ❌ Actuel - Aucune validation
export async function createClient(data: Client) {
  const client = await prisma.client.create({ data });
  return client;
}

// ✅ Recommandé - Avec validation Zod
import { z } from 'zod';

const ClientSchema = z.object({
  nom: z.string().min(2).max(100),
  prenom: z.string().min(2).max(100),
  dateNaissance: z.date(),
  sexe: z.enum(['M', 'F']),
  tel_1: z.string().regex(/^\d{10}$/),
  // ... autres champs
});

export async function createClient(data: unknown) {
  const validatedData = ClientSchema.parse(data);
  const client = await prisma.client.create({ data: validatedData });
  revalidatePath("/clients");
  return client;
}
```

---

### 7. Gestion d'erreurs incohérente

**Problème**: Certaines fonctions ont un try/catch, d'autres non.

**Fichier**: `lib/actions/clientActions.ts`

```typescript
// ❌ Actuel - Pas de gestion d'erreur
export async function deleteClient(id: string) {
  return await prisma.client.delete({ where: { id } });
}

// ✅ Recommandé - Gestion d'erreur uniforme
export async function deleteClient(id: string) {
  try {
    const client = await prisma.client.delete({ where: { id } });
    revalidatePath("/clients");
    return { success: true, data: client };
  } catch (error) {
    console.error("Erreur suppression client:", error);
    return { success: false, error: "Impossible de supprimer le client" };
  }
}
```

**Pattern recommandé**:
```typescript
// lib/utils/actionResult.ts
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function handleActionError(error: unknown): ActionResult<never> {
  console.error(error);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return { success: false, error: getPrismaErrorMessage(error.code) };
  }
  return { success: false, error: "Une erreur inattendue s'est produite" };
}
```

---

### 8. Incohérences dans le schéma Prisma

**Fichier**: `prisma/schema.prisma`

**Problème 1**: Champs redondants sur `Client`
```prisma
model Client {
  idClinique        String      // ❌ Redondant
  cliniqueId        String      // ❌ Redondant
  clinique          Clinique @relation(fields: [cliniqueId], references: [id])
}
```

**Problème 2**: Password marqué unique (incorrect)
```prisma
model User {
  password      String @unique  // ❌ FAUX - Les mots de passe hashés peuvent être identiques
}
```

**Problème 3**: Absence de contraintes
```prisma
// ❌ Actuel
nom String

// ✅ Recommandé
nom String @db.VarChar(100)
```

**Migration corrective**:
```sql
-- Supprimer la contrainte unique sur password
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "user_password_key";

-- Supprimer le champ redondant
ALTER TABLE "Client" DROP COLUMN IF EXISTS "idClinique";
```

---

### 9. Import dupliqué

**Fichier**: `lib/prisma.ts` (lignes 2-3)

```typescript
// ❌ Actuel
// import { PrismaClient } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

// ✅ Corrigé
import { PrismaClient } from "@prisma/client";
```

---

## 🟡 Améliorations Recommandées (P2)

### 10. Architecture - Absence de couche service

**Problème**: Les Server Actions appellent directement Prisma.

**Architecture actuelle**:
```
Component → Server Action → Prisma
```

**Architecture recommandée**:
```
Component → Server Action → Service → Repository → Prisma
```

**Exemple d'implémentation**:

```typescript
// lib/services/clientService.ts
export class ClientService {
  async create(data: CreateClientDTO): Promise<Client> {
    // Logique métier
    const code = await this.generateClientCode(data.cliniqueId);
    return clientRepository.create({ ...data, code });
  }

  async findById(id: string): Promise<Client | null> {
    return clientRepository.findById(id);
  }

  private async generateClientCode(cliniqueId: string): Promise<string> {
    // Logique de génération de code
  }
}

// lib/repositories/clientRepository.ts
export const clientRepository = {
  create: (data: Prisma.ClientCreateInput) => prisma.client.create({ data }),
  findById: (id: string) => prisma.client.findUnique({ where: { id } }),
  // ...
};
```

---

### 11. Absence de pagination côté serveur

**Fichier**: `lib/actions/clientActions.ts`

```typescript
// ❌ Actuel - Charge TOUT en mémoire
export const getAllClient = async () => {
  return await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
  });
};

// ✅ Recommandé - Pagination
interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const getAllClient = async ({
  page = 1,
  limit = 20,
  search
}: PaginationParams = {}) => {
  const skip = (page - 1) * limit;

  const where = search ? {
    OR: [
      { nom: { contains: search, mode: 'insensitive' } },
      { prenom: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
    ],
  } : {};

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.count({ where }),
  ]);

  return {
    data: clients,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
```

---

### 12. Absence de logging structuré

**Installation**:
```bash
npm install pino pino-pretty
```

**Configuration** (`lib/logger.ts`):
```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
});

// Utilisation
logger.info({ userId, action: 'login' }, 'Utilisateur connecté');
logger.error({ error, clientId }, 'Erreur création client');
```

---

### 13. Absence de rate limiting

**Installation**:
```bash
npm install @upstash/ratelimit @upstash/redis
```

**Configuration** (`lib/ratelimit.ts`):
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requêtes par minute
  analytics: true,
});

// Middleware d'authentification
export async function loginRateLimit(ip: string) {
  const { success, limit, remaining } = await ratelimit.limit(ip);
  if (!success) {
    throw new Error('Trop de tentatives. Réessayez plus tard.');
  }
  return { limit, remaining };
}
```

---

### 14. Dépendance dupliquée

**Fichier**: `package.json`

```json
{
  "dependencies": {
    "prisma": "^6.14.0"  // ❌ Devrait être seulement en devDependencies
  },
  "devDependencies": {
    "prisma": "^6.14.0"  // ✅ Correct
  }
}
```

**Correction**:
```bash
npm uninstall prisma
npm install -D prisma
```

---

### 15. Composant data-table trop volumineux

**Fichier**: `components/data-table.tsx` (~500+ lignes)

**Recommandation**: Découper en sous-composants

```
components/
  data-table/
    index.tsx           # Export principal
    DataTable.tsx       # Composant principal
    DataTableHeader.tsx # En-tête avec filtres
    DataTableBody.tsx   # Corps du tableau
    DataTableRow.tsx    # Ligne draggable
    DataTablePagination.tsx
    DataTableColumnToggle.tsx
    hooks/
      useDataTable.ts
    types.ts
```

---

## 🟢 Optimisations (P3)

### 16. Documentation manquante

**Fichiers à créer**:
- `README.md` - Documentation principale
- `CONTRIBUTING.md` - Guide de contribution
- `docs/API.md` - Documentation API
- `docs/ARCHITECTURE.md` - Architecture du projet

**Template README.md**:
```markdown
# eCMIS AIBEF

Système de Gestion d'Informations Médicales pour les cliniques AIBEF.

## Prérequis

- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

## Installation

\`\`\`bash
git clone https://github.com/aibef/ecmis.git
cd ecmis
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
\`\`\`

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarre le serveur de développement |
| `npm run build` | Build de production |
| `npm run test` | Lance les tests |
| `npm run lint` | Vérifie le linting |

## Structure du projet

\`\`\`
ecmis/
├── app/              # Routes Next.js
├── components/       # Composants React
├── lib/
│   ├── actions/     # Server Actions
│   ├── services/    # Logique métier
│   └── utils/       # Utilitaires
├── prisma/          # Schéma et migrations
└── tests/           # Tests
\`\`\`
```

---

### 17. Internationalisation (i18n)

**Installation**:
```bash
npm install next-intl
```

**Configuration**:
```typescript
// messages/fr.json
{
  "errors": {
    "connectionFailed": "Problème de connexion à la base de données",
    "invalidCredentials": "Nom d'utilisateur ou mot de passe incorrect"
  },
  "common": {
    "save": "Enregistrer",
    "cancel": "Annuler"
  }
}
```

---

### 18. Optimisation des images

**Remplacer** `<img>` par `<Image>` de Next.js:

```typescript
// ❌ Actuel
<img src="/logo.png" alt="Logo" />

// ✅ Recommandé
import Image from 'next/image';
<Image src="/logo.png" alt="Logo" width={200} height={50} priority />
```

---

### 19. Durée de session trop longue

**Fichier**: `lib/auth-options.ts`

```typescript
// ❌ Actuel - 30 jours (risque de sécurité pour données médicales)
session: {
  maxAge: 30 * 24 * 60 * 60,
}

// ✅ Recommandé - 8 heures de travail
session: {
  maxAge: 8 * 60 * 60, // 8 heures
  updateAge: 60 * 60,  // Rafraîchir toutes les heures
}
```

---

### 20. Pre-commit hooks

**Installation**:
```bash
npm install -D husky lint-staged
npx husky init
```

**Configuration** (`.husky/pre-commit`):
```bash
#!/bin/sh
npx lint-staged
```

**Configuration** (`package.json`):
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.prisma": [
      "prisma format"
    ]
  }
}
```

---

## ✅ Checklist de Correction

### Priorité Critique (P0) - À faire immédiatement

- [ ] Régénérer les credentials de base de données
- [ ] Ajouter `.env` au `.gitignore`
- [ ] Ajouter `NEXTAUTH_SECRET` au `.env`
- [ ] Retirer `ignoreDuringBuilds` et `ignoreBuildErrors`
- [ ] Corriger toutes les erreurs TypeScript
- [ ] Corriger toutes les erreurs ESLint
- [ ] Nettoyer le code commenté dans `middleware.ts`

### Priorité Haute (P1) - Cette semaine

- [ ] Remplacer tous les `any` par des types appropriés
- [ ] Ajouter validation Zod dans toutes les Server Actions
- [ ] Uniformiser la gestion d'erreurs
- [ ] Corriger le schéma Prisma (password unique, champs redondants)
- [ ] Mettre en place les premiers tests unitaires

### Priorité Moyenne (P2) - Ce mois

- [ ] Implémenter la pagination côté serveur
- [ ] Configurer le logging structuré
- [ ] Ajouter le rate limiting sur l'authentification
- [ ] Créer la couche service
- [ ] Découper les composants volumineux
- [ ] Créer la documentation README

### Priorité Basse (P3) - Prochain sprint

- [ ] Configurer l'internationalisation
- [ ] Optimiser les images avec next/image
- [ ] Réduire la durée de session
- [ ] Configurer les pre-commit hooks
- [ ] Audit d'accessibilité
- [ ] Audit de performance Lighthouse

---

## 📚 Ressources

### Documentation officielle
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Zod Documentation](https://zod.dev)

### Sécurité
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security)

### Best Practices
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)

---

## Historique des révisions

| Date | Version | Auteur | Modifications |
|------|---------|--------|---------------|
| 21/01/2026 | 1.0 | Analyse automatique | Création initiale |

---

*Ce document doit être mis à jour régulièrement au fur et à mesure que les corrections sont apportées.*
