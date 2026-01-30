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

// app/api/backup/route.ts
// import { backupDatabase } from "@/lib/actions/sauvegardActions";

// export async function GET() {
//   return await backupDatabase();
// }
// app/api/backup/route.ts
import { neonBackup } from "@/lib/actions/neonBackup";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { NextResponse } from "next/server";

export const maxDuration = 300; // 5 minutes max (Vercel limite)

export async function GET() {
  // 🔒 Vérification de l'authentification et du rôle admin
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json(
      { success: false, message: "Non authentifié" },
      { status: 401 }
    );
  }

  // Vérifier le rôle admin (adapter selon votre structure de session)
  const userRole = (session.user as { role?: string }).role;
  if (userRole !== "ADMIN") {
    return NextResponse.json(
      { success: false, message: "Accès non autorisé - Admin requis" },
      { status: 403 }
    );
  }

  return await neonBackup();
}
