// ===== cond_a/app.js =====
{
const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const userRoutes = require('./routes/userRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to database
connectDB();

// Routes
app.use('/api', userRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
}

// ===== cond_a/db.js =====
{
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/userdb', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
}

// ===== cond_a/user.js =====
{
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't return password by default in queries
  },
  age: {
    type: Number,
    min: [0, 'Age cannot be negative'],
    max: [150, 'Age cannot exceed 150']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Automatically manages createdAt and updatedAt
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive data when converting to JSON
userSchema.set('toJSON', {
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
}

// ===== cond_a/userRoutes.js =====
{
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
}

// ===== cond_a/userService.js =====
{
const User = require('../models/User');

class UserService {
  // Create a new user
  async createUser(userData) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      const user = new User(userData);
      const savedUser = await user.save();
      return savedUser;
    } catch (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  // Get all users with optional filtering and pagination
  async getAllUsers(filters = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const query = {};
      
      // Apply filters
      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }
      if (filters.minAge) {
        query.age = { $gte: filters.minAge };
      }
      if (filters.maxAge) {
        query.age = { ...query.age, $lte: filters.maxAge };
      }
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const users = await User.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit);

      const total = await User.countDocuments(query);

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Error fetching users: ${error.message}`);
    }
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw new Error(`Error fetching user: ${error.message}`);
    }
  }

  // Get user by email
  async getUserByEmail(email) {
    try {
      const user = await User.findOne({ email }).select('+password');
      return user;
    } catch (error) {
      throw new Error(`Error fetching user: ${error.message}`);
    }
  }

  // Update user
  async updateUser(userId, updateData) {
    try {
      // Remove fields that shouldn't be updated directly
      delete updateData._id;
      delete updateData.createdAt;
      delete updateData.email; // Prevent email changes for simplicity

      const user = await User.findByIdAndUpdate(
        userId,
        { ...updateData, updatedAt: Date.now() },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  }

  // Update user password
  async updatePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId).select('+password');
      
      if (!user) {
        throw new Error('User not found');
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        throw new Error('Current password is incorrect');
      }

      user.password = newPassword;
      await user.save();
      
      return { message: 'Password updated successfully' };
    } catch (error) {
      throw new Error(`Error updating password: ${error.message}`);
    }
  }

  // Delete user
  async deleteUser(userId) {
    try {
      const user = await User.findByIdAndDelete(userId);
      if (!user) {
        throw new Error('User not found');
      }
      return { message: 'User deleted successfully', deletedUser: user };
    } catch (error) {
      throw new Error(`Error deleting user: ${error.message}`);
    }
  }

  // Soft delete (deactivate) user
  async deactivateUser(userId) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { isActive: false, updatedAt: Date.now() },
        { new: true }
      );
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return user;
    } catch (error) {
      throw new Error(`Error deactivating user: ${error.message}`);
    }
  }

  // Activate user
  async activateUser(userId) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { isActive: true, updatedAt: Date.now() },
        { new: true }
      );
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return user;
    } catch (error) {
      throw new Error(`Error activating user: ${error.message}`);
    }
  }
}

module.exports = new UserService();
}
