"use server";
// lib/actions/sauvegardActions.ts

import { Client } from "pg";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import archiver from "archiver";
import { requirePermission } from "@/lib/auth/withPermission";
import { TableName } from "@prisma/client";

const BACKUP_DIR = os.tmpdir();

// Liste blanche des préfixes SQL autorisés lors de la restauration
const ALLOWED_SQL_PREFIXES = [
  "INSERT INTO",
  "SET ",
  "CREATE TABLE IF NOT EXISTS",
];

function isSqlStatementAllowed(sql: string): boolean {
  const trimmed = sql.trim().toUpperCase();
  return ALLOWED_SQL_PREFIXES.some((prefix) =>
    trimmed.startsWith(prefix.toUpperCase())
  );
}

export async function backupDatabase() {
  await requirePermission(TableName.ADMINISTRATION, "canRead");
  const fileName = `backup-${Date.now()}.zip`;
  const filePath = path.join(BACKUP_DIR, fileName);

  const client = new Client({
    connectionString: process.env.DATABASE_URL!,
  });

  try {
    await client.connect();

    // Obtenir la liste des tables
    const tablesResult = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name
    `);

    // Créer un fichier zip
    const output = fs.createWriteStream(filePath);
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Compression maximale
    });

    return new Promise<Response>((resolve, reject) => {
      output.on("close", function () {
        console.log(`Archive créée: ${archive.pointer()} bytes totaux`);

        const buffer = fs.readFileSync(filePath);

        // Nettoyer le fichier temporaire
        fs.unlinkSync(filePath);

        resolve(
          new Response(buffer, {
            headers: {
              "Content-Type": "application/zip",
              "Content-Disposition": `attachment; filename="${fileName}"`,
            },
          })
        );
      });

      archive.on("error", function (err) {
        reject(err);
      });

      archive.pipe(output);

      let backupContent = "";

      backupContent += `-- PostgreSQL database backup\n`;
      backupContent += `-- Generated: ${new Date().toISOString()}\n`;
      backupContent += `-- Total tables: ${tablesResult.rows.length}\n\n`;
      backupContent += `SET session_replication_role = 'replica';\n\n`;

      // Fonction pour traiter chaque table
      const processTables = async () => {
        for (const table of tablesResult.rows) {
          const schemaName = table.table_schema;
          const tableName = table.table_name;
          const fullTableName =
            schemaName && schemaName !== "public"
              ? `"${schemaName}"."${tableName}"`
              : `"${tableName}"`;

          try {
            const dataResult = await client.query(
              `SELECT * FROM ${fullTableName}`
            );

            backupContent += `\n-- Table: ${fullTableName}\n`;
            backupContent += `-- Records: ${dataResult.rows.length}\n`;

            if (dataResult.rows.length > 0) {
              for (const row of dataResult.rows) {
                const columns = Object.keys(row)
                  .map((col) => `"${col}"`)
                  .join(", ");

                const values = Object.values(row)
                  .map((val) => {
                    if (val === null) return "NULL";
                    if (typeof val === "string")
                      return `'${val.replace(/'/g, "''")}'`;
                    if (val instanceof Date) return `'${val.toISOString()}'`;
                    if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
                    return val;
                  })
                  .join(", ");

                backupContent += `INSERT INTO ${fullTableName} (${columns}) VALUES (${values});\n`;
              }
            } else {
              backupContent += `-- Aucune donnée dans cette table\n`;
            }

            backupContent += `\n`;
          } catch (error) {
            console.error(`Error backing up table ${fullTableName}:`, error);
            backupContent += `-- ERREUR lors de la sauvegarde de cette table\n\n`;
            continue;
          }
        }

        backupContent += `SET session_replication_role = 'origin';\n`;

        // Ajouter le fichier SQL à l'archive
        archive.append(backupContent, { name: "database_backup.sql" });

        // Ajouter un fichier README avec les métadonnées
        const readmeContent = `
Backup Database
===============

Date: ${new Date().toISOString()}
Tables: ${tablesResult.rows.length}
Format: PostgreSQL SQL

Instructions:
1. Dézipper ce fichier
2. Exécuter le fichier database_backup.sql dans votre base de données PostgreSQL

Tables sauvegardées:
${tablesResult.rows
  .map((t) => `- ${t.table_schema}.${t.table_name}`)
  .join("\n")}
        `.trim();

        archive.append(readmeContent, { name: "README.txt" });

        // Finaliser l'archive
        archive.finalize();
      };

      processTables().catch(reject);
    });
  } catch (error) {
    console.error("Backup error:", error);
    return new Response(
      JSON.stringify({
        error: "Erreur lors de la sauvegarde de la base de données",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } finally {
    await client.end();
  }
}

const MAX_RESTORE_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
const ALLOWED_MODES = ["safe", "merge", "overwrite"] as const;

export async function restoreDatabase(formData: FormData) {
  await requirePermission(TableName.ADMINISTRATION, "canCreate");

  const file = formData.get("backupFile") as File;
  const mode = formData.get("mode") as string;

  if (!file) {
    return { success: false, error: "Aucun fichier sélectionné" };
  }

  // Validation du fichier
  if (!file.name.endsWith(".sql") && !file.name.endsWith(".zip")) {
    return { success: false, error: "Type de fichier non autorisé. Seuls les fichiers .sql et .zip sont acceptés." };
  }
  if (file.size > MAX_RESTORE_FILE_SIZE) {
    return { success: false, error: "Fichier trop volumineux (max 100 MB)." };
  }

  // Validation du mode
  if (!ALLOWED_MODES.includes(mode as typeof ALLOWED_MODES[number])) {
    return { success: false, error: "Mode de restauration invalide." };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL!,
  });

  // Utiliser un nom de fichier aléatoire
  const tempFileName = `restore-${crypto.randomUUID()}.sql`;
  const tempPath = path.join(BACKUP_DIR, tempFileName);

  try {
    const data = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(tempPath, data);

    const content = fs.readFileSync(tempPath, "utf-8");

    await client.connect();

    const statements = content
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    let inserted = 0;
    let skipped = 0;

    for (let i = 0; i < statements.length; i++) {
      let sql = statements[i] + ";";

      // Seules les instructions autorisées sont exécutées
      if (!isSqlStatementAllowed(sql)) {
        skipped++;
        continue;
      }

      if (sql.toUpperCase().startsWith("INSERT INTO")) {
        if (mode === "safe") {
          sql = sql.replace(/;$/, " ON CONFLICT DO NOTHING;");
        }
      }

      try {
        await client.query(sql);
        if (sql.toUpperCase().startsWith("INSERT INTO")) {
          inserted++;
        }
      } catch (error) {
        console.error("Erreur SQL restauration:", error);
      }
    }

    return {
      success: true,
      inserted,
      skipped,
    };
  } catch (error) {
    console.error("Restore error:", error);
    return {
      success: false,
      error: "Erreur lors de la restauration de la base de données",
    };
  } finally {
    await client.end();
    // Nettoyage du fichier temporaire (toujours)
    try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
  }
}
