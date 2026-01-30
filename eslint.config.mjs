import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  // Ignorer les dossiers non pertinents
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/lib/generated/**",
      "**/prisma/**",
    ],
  },

  // Utiliser la configuration existante de .eslintrc.js via FlatCompat
  ...compat.extends("next/core-web-vitals"),
  ...compat.extends("plugin:@typescript-eslint/recommended"),

  // Règles personnalisées
  {
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/exhaustive-deps": "warn",
      "@next/next/no-img-element": "off",
      // Désactiver l'erreur des apostrophes/guillemets dans JSX (texte français)
      "react/no-unescaped-entities": "off",
    },
  },
];
