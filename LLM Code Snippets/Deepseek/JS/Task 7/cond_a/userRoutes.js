const express = require('express');
const router = express.Router();
const userService = require('../services/userService');

// Create user
router.post('/users', async (req, res) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { page, limit, sortBy, sortOrder, ...filters } = req.query;
    const result = await userService.getAllUsers(filters, {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    });
    
    res.status(200).json({
      success: true,
      data: result.users,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get user by ID
router.get('/users/:id', async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    res.status(200).json({
      success: true,
      data: user,
      message: 'User updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Update password
router.put('/users/:id/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await userService.updatePassword(
      req.params.id,
      currentPassword,
      newPassword
    );
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Delete user (hard delete)
router.delete('/users/:id', async (req, res) => {
  try {
    const result = await userService.deleteUser(req.params.id);
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

// Soft delete (deactivate user)
router.patch('/users/:id/deactivate', async (req, res) => {
  try {
    const user = await userService.deactivateUser(req.params.id);
    res.status(200).json({
      success: true,
      data: user,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

// Activate user
router.patch('/users/:id/activate', async (req, res) => {
  try {
    const user = await userService.activateUser(req.params.id);
    res.status(200).json({
      success: true,
      data: user,
      message: 'User activated successfully'
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;