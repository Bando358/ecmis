// // app/api/backup/route.ts
// import { exec } from "child_process";
// import { NextResponse } from "next/server";
// import path from "path";

// export async function GET() {
//   try {
//     // ✅ Définir les informations de connexion et le fichier de sortie
//     const database = "openemrs";
//     const user = "postgres";
//     const host = "localhost";
//     const port = 5432;
//     const outputPath = path.resolve("/tmp", `${database}_backup.sql`);

//     const dumpCommand = `pg_dump -h ${host} -p ${port} -U ${user} -F c -b -v -f "${outputPath}" ${database}`;

//     return new Promise((resolve) => {
//       exec(
//         dumpCommand,
//         { env: { ...process.env, PGPASSWORD: "motdepasse_postgres" } },
//         (error, stdout, stderr) => {
//           if (error) {
//             console.error("Erreur de sauvegarde:", stderr);
//             resolve(NextResponse.json({ success: false, message: stderr }));
//           } else {
//             console.log("Sauvegarde réussie:", stdout);
//             resolve(
//               NextResponse.json({
//                 success: true,
//                 message: "Sauvegarde terminée",
//                 file: outputPath,
//               })
//             );
//           }
//         }
//       );
//     });
//   } catch (error) {
//     console.error(error);
//     return NextResponse.json({
//       success: false,
//       message: "Erreur lors de l'exécution de la sauvegarde",
//     });
//   }
// }

import { NextResponse } from "next/server";
import { backupDatabase } from "@/lib/actions/sauvegardActions";

export async function GET() {
  return await backupDatabase();
}
