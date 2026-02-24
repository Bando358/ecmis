"use server";

import { Post, TableName } from "@prisma/client";
import prisma from "../prisma";
import { requirePermission } from "@/lib/auth/withPermission";

// ************* Post **************
export const getAllPosts = async () => {
  const allPosts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
  });
  return allPosts;
};
export const getAllPost = async () => {
  const allPosts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
  });
  return allPosts;
};
// Création d'un post
export async function createPost(data: Post) {
  await requirePermission(TableName.POST, "canCreate");
  return await prisma.post.create({
    data,
  });
}

// Récupération de une seul post
export const getOnePost = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const onePost = await prisma.post.findUnique({
    where: { id },
  });

  return onePost;
};
// Récupération de une seul post par idClient
export const getOnePostIdClient = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const onePost = await prisma.post.findFirst({
    where: { userId: id },
  });

  return onePost;
};

//Mise à jour de la post
export async function updatePost(id: string, data: Post) {
  await requirePermission(TableName.POST, "canUpdate");
  return await prisma.post.update({
    where: { id },
    data,
  });
}

// Suppression d'un post
export async function deletePost(id: string) {
  await requirePermission(TableName.POST, "canDelete");
  return await prisma.post.delete({
    where: { id },
  });
}
