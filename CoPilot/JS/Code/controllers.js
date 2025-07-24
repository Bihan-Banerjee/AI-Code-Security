const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  const { username, password, bio, phone } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = new User({
    username,
    password: hashed,
    bio,
    phone,
    profileImage: req.file?.filename
  });
  await user.save();
  res.json({ msg: "User created" });
};
