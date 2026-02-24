"use server";

import { User, TableName } from "@prisma/client";
import prisma from "../prisma";
import * as bcrypt from "bcrypt";
import { requirePermission } from "@/lib/auth/withPermission";
import { authLogger } from "@/lib/logger";
import { validateServerData } from "@/lib/validations";
import { UserCreateSchema } from "@/lib/validations";
import { logAction } from "./journalPharmacyActions";

type RegisterInput = {
  name: string;
  email: string;
  username: string;
  password: string;
};

// ************* Create User **************
export async function createUser(user: User) {
  await requirePermission(TableName.USER, "canCreate");
  validateServerData(UserCreateSchema, user);
  const { password, role, banned, banReason, banExpires, ...safeFields } = user;
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await prisma.user.create({
    data: {
      ...safeFields,
      password: hashedPassword,
      role: "USER",
      banned: false,
    },
    omit: { password: true },
  });
  await logAction({
    idUser: newUser.id,
    action: "CREATION",
    entite: "User",
    entiteId: newUser.id,
    description: `Création utilisateur: ${newUser.name} (${newUser.email})`,
  });
  return newUser;
}

export async function registerUser(user: RegisterInput) {
  await requirePermission(TableName.USER, "canCreate");
  const { password, email, ...rest } = user;

  // Validation serveur basique
  if (!password || password.length < 8) {
    throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
  }
  if (!email || !email.includes("@")) {
    throw new Error("Email invalide.");
  }
  if (!rest.username || rest.username.length < 3) {
    throw new Error("Le nom d'utilisateur doit contenir au moins 3 caractères.");
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        ...rest,
        email,
        password: hashedPassword,
        image: null,
        role: "USER",
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: false,
        banned: false,
        banReason: null,
        banExpires: null,
      },
      omit: { password: true },
    });

    return newUser;
  } catch (error) {
    console.error("Error creating user:", error);
    throw new Error("Impossible de créer le compte. Vérifiez vos informations.");
  }
}
export async function registerAdmin(user: RegisterInput) {
  const { password, email, ...rest } = user;

  // Délai constant pour empêcher le timing attack (énumération d'emails)
  // Que l'email soit valide ou non, la réponse prend le même temps
  const minDelay = new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));

  try {
    const adminEmails =
      process.env.ADMIN_EMAIL?.split(";").map((e) => e.trim().toLowerCase()) ?? [];

    const isAdmin = adminEmails.includes(email.toLowerCase());

    if (!isAdmin) {
      authLogger.warn("Tentative de création admin avec email non autorisé", {
        data: { email: email.replace(/(.{2}).+(@.+)/, "$1***$2") }, // masquer l'email dans les logs
      });
      // Attendre le délai avant de répondre (anti-timing)
      await minDelay;
      // Message générique — ne pas révéler si l'email est dans la liste ou non
      throw new Error("Impossible de créer le compte. Vérifiez vos informations.");
    }

    // Vérifier si un admin avec cet email existe déjà
    const existing = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });

    if (existing) {
      await minDelay;
      throw new Error("Impossible de créer le compte. Vérifiez vos informations.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        ...rest,
        email,
        password: hashedPassword,
        image: null,
        role: "ADMIN",
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: false,
        banned: false,
        banReason: null,
        banExpires: null,
      },
      omit: { password: true },
    });

    authLogger.info("Compte admin créé", {
      userId: newUser.id,
      data: { email: email.replace(/(.{2}).+(@.+)/, "$1***$2") },
    });

    await minDelay;
    return newUser;
  } catch (error) {
    await minDelay;
    throw error;
  }
}

// Récupération de un seul User (sans mot de passe)
export const getOneUser = async (id: string | null) => {
  if (!id) {
    return null;
  }
  const oneUser = await prisma.user.findUnique({
    where: { id },
    omit: { password: true },
  });

  return oneUser;
};

// Suppression d'un User
export async function deleteUser(id: string) {
  await requirePermission(TableName.USER, "canDelete");
  return await prisma.user.delete({
    where: { id },
  });
}

//Mise à jour de la User et le mot de passe doit être haché
export async function updateUser(id: string, data: User) {
  await requirePermission(TableName.USER, "canUpdate");
  const { password, ...rest } = data;

  // Hacher le mot de passe s'il a été modifié
  const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...rest,
      ...(hashedPassword && { password: hashedPassword }),
    },
    omit: { password: true },
  });
  await logAction({
    idUser: id,
    action: "MODIFICATION",
    entite: "User",
    entiteId: id,
    description: `Modification utilisateur: ${updated.name} (${updated.email})`,
    nouvellesDonnees: { ...rest, passwordChanged: !!password } as unknown as Record<string, unknown>,
  });
  return updated;
}

// ************* User **************
export const getAllUser = async () => {
  await requirePermission(TableName.USER, "canRead");
  const allUser = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    omit: { password: true },
  });
  return allUser;
};
// ************* Récupérer tous les prescripteurs dont idClinique contient idClinique  **************
export const getAllUserIncludedIdClinique = async (idClinique: string) => {
  const allUser = await prisma.user.findMany({
    where: {
      idCliniques: {
        has: idClinique,
      },
      prescripteur: true,
    },
    orderBy: { createdAt: "desc" },
    omit: { password: true },
  });

  return allUser;
};
// ************* Récupérer tous les prescripteurs dont idClinique contient idClinique  **************
export const getAllUserIncludedTabIdClinique = async (
  idCliniques: string[]
) => {
  const allUser = await prisma.user.findMany({
    where: {
      idCliniques: {
        hasSome: idCliniques,
      },
      prescripteur: true,
    },
    orderBy: { createdAt: "desc" },
    omit: { password: true },
  });

  return allUser;
};
// ************* Récupérer tous les prescripteurs dont idClinique contient idClinique  **************
export const getAllUserTabIdClinique = async (idCliniques: string[]) => {
  const allUser = await prisma.user.findMany({
    where: {
      idCliniques: {
        hasSome: idCliniques,
      },
    },
    orderBy: { createdAt: "desc" },
    omit: { password: true },
  });

  return allUser;
};

// ************* Creer une fonction pour mettre banned à true s'il est false ou null ou false s'il est true **************
export async function toggleBanUser(id: string) {
  await requirePermission(TableName.USER, "canUpdate");
  const user = await prisma.user.findUnique({
    where: { id },
  });
  if (!user) {
    throw new Error("User not found");
  }
  return await prisma.user.update({
    where: { id },
    data: {
      banned: !user.banned,
    },
    omit: { password: true },
  });
}
// *************  Récupérer un user à partir de son username **************
export const getUserByUsername = async (username: string) => {
  const user = await prisma.user.findUnique({
    where: { username },
    omit: { password: true },
  });

  return user;
};
