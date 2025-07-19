const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: { type: String },
  phone: { type: String },
  profileImage: { type: String }
});

module.exports = mongoose.model('User', userSchema);
