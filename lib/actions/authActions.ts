"use server";

import { User } from "@prisma/client";
import prisma from "../prisma";
import * as bcrypt from "bcrypt";

type RegisterInput = {
  name: string;
  email: string;
  username: string;
  password: string;
};

// ************* Create User **************
export async function createUser(user: User) {
  // Hacher le mot de passe avant de le stocker
  const hashedPassword = await bcrypt.hash(user.password, 10);
  user.password = hashedPassword;
  return await prisma.user.create({
    data: user,
  });
}

export async function registerUser(user: RegisterInput) {
  const { password, email, ...rest } = user;

  try {
    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Lire et parser les emails admin depuis le .env
    const adminEmails =
      process.env.ADMIN_EMAIL?.split(";").map((e) => e.trim().toLowerCase()) ??
      [];

    // Vérifier si l'email correspond à un admin
    const role = adminEmails.includes(email.toLowerCase()) ? "ADMIN" : "USER";

    // Créer l'utilisateur
    const newUser = await prisma.user.create({
      data: {
        ...rest,
        email,
        password: hashedPassword,
        image: null,
        role, // assigné dynamiquement ici
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: false,
        banned: false,
        banReason: null,
        banExpires: null,
      },
    });

    return newUser;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}
export async function registerAdmin(user: RegisterInput) {
  const { password, email, ...rest } = user;

  try {
    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Lire et parser les emails admin depuis le .env
    const adminEmails =
      process.env.ADMIN_EMAIL?.split(";").map((e) => e.trim().toLowerCase()) ??
      [];

    // Vérifier si l'email correspond à un admin
    const role = adminEmails.includes(email.toLowerCase()) && "ADMIN";

    // Créer l'utilisateur
    if (!role) {
      throw new Error("Seuls les emails admin peuvent créer un compte admin.");
      return null;
    } else {
      const newUser = await prisma.user.create({
        data: {
          ...rest,
          email,
          password: hashedPassword,
          image: null,
          role, // assigné dynamiquement ici
          createdAt: new Date(),
          updatedAt: new Date(),
          emailVerified: false,
          banned: false,
          banReason: null,
          banExpires: null,
        },
      });

      return newUser;
    }
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

// Récupération de un seul User
export const getOneUser = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneUser = await prisma.user.findUnique({
    where: { id },
  });

  return oneUser;
};

// Suppression d'un User
export async function deleteUser(id: string) {
  return await prisma.user.delete({
    where: { id },
  });
}

//Mise à jour de la User et le mot de passe doit être haché
export async function updateUser(id: string, data: User) {
  const { password, ...rest } = data;

  // Hacher le mot de passe s'il a été modifié
  const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

  return await prisma.user.update({
    where: { id },
    data: {
      ...rest,
      ...(hashedPassword && { password: hashedPassword }),
    },
  });
}

// ************* User **************
export const getAllUser = async () => {
  const allUser = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });
  return allUser;
};
// ************* Récupérer tous les prescripteurs dont idClinique contient idClinique  **************
export const getAllUserIncludedIdClinique = async (idClinique: string) => {
  const allUser = await prisma.user.findMany({
    where: {
      idCliniques: {
        has: idClinique, // Vérifie que le tableau contient idClinique
      },
      prescripteur: true, // seulement les prescripteurs
    },
    orderBy: { createdAt: "desc" },
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
        hasSome: idCliniques, // Vérifie que le tableau contient au moins un idClinique
      },
      prescripteur: true, // seulement les prescripteurs
    },
    orderBy: { createdAt: "desc" },
  });

  return allUser;
};
// ************* Récupérer tous les prescripteurs dont idClinique contient idClinique  **************
export const getAllUserTabIdClinique = async (idCliniques: string[]) => {
  const allUser = await prisma.user.findMany({
    where: {
      idCliniques: {
        hasSome: idCliniques, // Vérifie que le tableau contient au moins un idClinique
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return allUser;
};

// ************* Creer une fonction pour mettre banned à true s'il est false ou null ou false s'il est true **************
export async function toggleBanUser(id: string) {
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
  });
}
// *************  Récupérer un user à partir de son username **************
export const getUserByUsername = async (username: string) => {
  const user = await prisma.user.findUnique({
    where: { username },
  });

  return user;
};
