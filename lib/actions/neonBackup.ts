// lib/actions/neonBackup.ts
"use server";

import { Pool } from "pg";
import archiver from "archiver";

export async function neonBackup() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

  try {
    // 1. Récupérer toutes les données en une seule requête intelligente
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    let backupSQL = `-- Neon PostgreSQL Backup\n`;
    backupSQL += `-- Generated: ${new Date().toISOString()}\n`;
    backupSQL += `-- Tables: ${tables.rows.length}\n\n`;

    // 2. Backup par table avec des requêtes optimisées
    for (const { table_name } of tables.rows) {
      console.log(`Backing up: ${table_name}`);

      try {
        // Structure de la table
        const structure = await pool.query(
          `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' 
          AND table_name = $1
          ORDER BY ordinal_position
        `,
          [table_name]
        );

        backupSQL += `\n-- Table: ${table_name}\n`;
        backupSQL += `CREATE TABLE IF NOT EXISTS "${table_name}" (\n`;

        const columns = structure.rows
          .map((col) => {
            let def = `  "${col.column_name}" ${col.data_type}`;
            if (col.is_nullable === "NO") def += " NOT NULL";
            if (col.column_default) def += ` DEFAULT ${col.column_default}`;
            return def;
          })
          .join(",\n");

        backupSQL += columns + "\n);\n\n";

        // Données avec pagination
        let offset = 0;
        const limit = 100;
        let hasData = true;
        let rowCount = 0;

        while (hasData) {
          // Utiliser une nouvelle connexion pour chaque batch
          const batchPool = new Pool({
            connectionString: process.env.DATABASE_URL!,
          });

          try {
            const data = await batchPool.query(
              `SELECT * FROM "${table_name}" LIMIT $1 OFFSET $2`,
              [limit, offset]
            );

            if (data.rows.length === 0) {
              hasData = false;
            } else {
              for (const row of data.rows) {
                const keys = Object.keys(row);
                const values = Object.values(row).map((v) => {
                  if (v === null) return "NULL";
                  if (typeof v === "string")
                    return `'${v.replace(/'/g, "''")}'`;
                  if (v instanceof Date) return `'${v.toISOString()}'`;
                  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
                  return v;
                });

                backupSQL += `INSERT INTO "${table_name}" (${keys
                  .map((k) => `"${k}"`)
                  .join(", ")}) VALUES (${values.join(", ")});\n`;
                rowCount++;
              }

              offset += limit;
            }
          } finally {
            await batchPool.end();
          }

          // Pause stratégique pour Neon
          if (hasData) {
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        }

        backupSQL += `-- ${rowCount} rows inserted\n`;
      } catch (error) {
        console.error(`Error with table ${table_name}:`, error);
        backupSQL += `-- ERROR: Could not backup table ${table_name}\n`;
        continue;
      }
    }

    // 3. Créer le ZIP en mémoire (pas de filesystem)
    const chunks: Buffer[] = [];

    return new Promise<Response>((resolve, reject) => {
      const archive = archiver("zip", { zlib: { level: 9 } });

      archive.on("data", (chunk: Buffer) => chunks.push(chunk));
      archive.on("end", () => {
        const buffer = Buffer.concat(chunks);
        resolve(
          new Response(buffer, {
            headers: {
              "Content-Type": "application/zip",
              "Content-Disposition": `attachment; filename="neon-backup-${Date.now()}.zip"`,
            },
          })
        );
      });
      archive.on("error", reject);

      archive.append(backupSQL, { name: "database.sql" });
      archive.finalize();
    });
  } catch (error) {
    console.error("Backup failed:", error);
    return new Response(
      JSON.stringify({
        error:
          "Backup failed: " +
          (error instanceof Error ? error.message : "Unknown error"),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    await pool.end();
  }
}
