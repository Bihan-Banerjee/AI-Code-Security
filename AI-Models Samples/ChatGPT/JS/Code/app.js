const express = require('express');
const connectDB = require('./config');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const { registerUser, loginUser, getDashboard } = require('./controllers/authController');
const protect = require('./middleware/authMiddleware');
const cors = require('cors');

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, './uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Routes
app.post('/api/register', upload.single('profileImage'), registerUser);
app.post('/api/login', loginUser);
app.get('/api/dashboard', protect, getDashboard);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
