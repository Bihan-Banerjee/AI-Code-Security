// services/userService.js
const User = require('../models/User');

// Create a new user
const createUser = async (userData) => {
  const user = new User(userData);
  return await user.save();
};

// Read user by ID
const getUserById = async (id) => {
  return await User.findById(id);
};

// Read all users
const getAllUsers = async () => {
  return await User.find();
};

// Update user by ID
const updateUser = async (id, updateData) => {
  return await User.findByIdAndUpdate(id, updateData, { new: true });
};

// Delete user by ID
const deleteUser = async (id) => {
  return await User.findByIdAndDelete(id);
};

module.exports = {
  createUser,
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser,
};
