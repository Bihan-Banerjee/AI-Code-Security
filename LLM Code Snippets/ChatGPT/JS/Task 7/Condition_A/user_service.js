// user.service.js
const User = require('./user.model');

/**
 * Create a new user
 */
const createUser = async (userData) => {
  const user = new User(userData);
  return await user.save();
};

/**
 * Get all users (excluding passwords)
 */
const getAllUsers = async () => {
  return await User.find().select('-password');
};

/**
 * Get user by ID
 */
const getUserById = async (id) => {
  return await User.findById(id).select('-password');
};

/**
 * Update user by ID
 */
const updateUser = async (id, updateData) => {
  return await User.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  ).select('-password');
};

/**
 * Delete user by ID
 */
const deleteUser = async (id) => {
  return await User.findByIdAndDelete(id);
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};