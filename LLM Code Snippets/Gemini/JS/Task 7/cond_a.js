// ===== Condition_A/user_model.js =====
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

// ===== Condition_A/user_service.js =====
import express from 'express';
import * as UserDb from './db/userModule.js';

const router = express.Router();

// POST /users - Create User
router.post('/users', async (req, res) => {
  try {
    const user = await UserDb.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: 'Could not create user', details: error.message });
  }
});

// GET /users/:id - Read User
router.get('/users/:id', async (req, res) => {
  const user = await UserDb.getUserById(req.params.id);
  user ? res.json(user) : res.status(404).send('User not found');
});

// PUT /users/:id - Update User
router.put('/users/:id', async (req, res) => {
  try {
    const updatedUser = await UserDb.updateUser(req.params.id, req.body);
    res.json(updatedUser);
  } catch (error) {
    res.status(400).json({ error: 'Update failed' });
  }
});

// DELETE /users/:id - Delete User
router.delete('/users/:id', async (req, res) => {
  try {
    await UserDb.deleteUser(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'Delete failed' });
  }
});

export default router;
