"use server";

import { Post } from "@prisma/client";
import prisma from "../prisma";

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
  return await prisma.post.update({
    where: { id },
    data,
  });
}

// Suppression d'un post
export async function deletePost(id: string) {
  return await prisma.post.delete({
    where: { id },
  });
}
