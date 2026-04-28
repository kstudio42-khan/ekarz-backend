const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
// No more fs or path needed

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// -------------------------------
// MongoDB Connection
// -------------------------------
const MONGODB_URI = 'mongodb+srv://admin:1AodJfMfp8PfnbWx@cluster0.y7v58xm.mongodb.net/?appName=Cluster0'; // ⬅️ REPLACE WITH YOUR ACTUAL URI

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// -------------------------------
// Mongoose Schema & Model
// -------------------------------
const applicationSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  name: String,
  contact: String,
  loanType: String,
  amount: Number,
  status: { type: String, default: 'Pending' },
  staff: { type: String, default: null },
  date: String
});

const Application = mongoose.model('Application', applicationSchema);

// Helper: get next auto-increment id
async function getNextId() {
  const lastApp = await Application.findOne().sort({ id: -1 });
  return lastApp ? lastApp.id + 1 : 1;
}

// -------------------------------
// Simple in‑memory token storage (unchanged)
// -------------------------------
const validTokens = new Map();

function generateToken() {
  return 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
}

// -------------------------------
// AUTH ROUTES (unchanged)
// -------------------------------
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'admin@gmail.com' && password === '1234') {
    const token = generateToken();
    const user = { email: 'admin@gmail.com', role: 'owner' };
    validTokens.set(token, user);
    res.json({ token, user });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

app.get('/api/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid token' });
  }
  const token = authHeader.split(' ')[1];
  const user = validTokens.get(token);
  if (!user) {
    return res.status(401).json({ message: 'Token expired or invalid' });
  }
  res.json(user);
});

app.post('/api/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    validTokens.delete(token);
  }
  res.json({ success: true });
});

// -------------------------------
// APPLICATION ROUTES (MongoDB version)
// -------------------------------

// POST /submit – create new application
app.post('/submit', async (req, res) => {
  try {
    const { name, contact, loanType, amount, status } = req.body;
    const newId = await getNextId();
    const newApp = new Application({
      id: newId,
      name,
      contact,
      loanType,
      amount: parseFloat(amount),
      status: status || 'Pending',
      staff: null,
      date: new Date().toLocaleDateString('en-IN')
    });
    await newApp.save();
    res.json({ success: true, id: newId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/applications – return all applications
app.get('/api/applications', async (req, res) => {
  try {
    const apps = await Application.find().sort({ id: 1 });
    res.json(apps);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/applications/:id/status
app.patch('/api/applications/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const result = await Application.updateOne({ id }, { status });
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/applications/:id/staff
app.patch('/api/applications/:id/staff', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    let { staff } = req.body;
    if (staff === 'none') staff = null;
    const result = await Application.updateOne({ id }, { staff });
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// -------------------------------
// Start server
// -------------------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});