// ===== Condition_A/db.js =====
{
// db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10, // connection pooling
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection failed');
    process.exit(1); // exit on failure
  }
};

module.exports = connectDB;
}

// ===== Condition_A/user_model.js =====
{
// user.model.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // never return password by default
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
}

// ===== Condition_A/user_service.js =====
{
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
}
