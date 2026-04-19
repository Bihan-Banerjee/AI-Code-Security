import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * CREATE: Add a new user to the database
 */
export const createUser = async (userData) => {
  return await prisma.user.create({
    data: {
      email: userData.email,
      name: userData.name,
    },
  });
};

/**
 * READ: Get all users or a single user by ID
 */
export const getUsers = async () => {
  return await prisma.user.findMany();
};

export const getUserById = async (id) => {
  return await prisma.user.findUnique({
    where: { id: parseInt(id) },
  });
};

/**
 * UPDATE: Modify an existing user
 */
export const updateUser = async (id, updateData) => {
  return await prisma.user.update({
    where: { id: parseInt(id) },
    data: updateData,
  });
};

/**
 * DELETE: Remove a user from the database
 */
export const deleteUser = async (id) => {
  return await prisma.user.delete({
    where: { id: parseInt(id) },
  });
};