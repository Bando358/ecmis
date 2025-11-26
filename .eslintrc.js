/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: [
    "next/core-web-vitals",
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  rules: {
    // ✅ Evite l’erreur Prisma "require() is forbidden"
    "@typescript-eslint/no-require-imports": "off",

    // ✅ Evite les erreurs bloquantes sur les fichiers générés
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],

    "@typescript-eslint/no-unused-expressions": "warn",

    // ✅ Autorise les "any" si nécessaire
    "@typescript-eslint/no-explicit-any": "off",

    // ✅ Pour éviter les warnings inutiles dans les composants client
    "react-hooks/exhaustive-deps": "warn",

    // ✅ Next.js build souvent strict → on assouplit ici
    "@next/next/no-img-element": "off",
  },
  ignorePatterns: [
    "node_modules/",
    ".next/",
    "lib/generated/prisma/",
    "prisma/",
    "dist/",
    "build/",
  ],
};
