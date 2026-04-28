const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------------------
// Middleware
// -------------------------------
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// -------------------------------
// MongoDB Connection (SAFE)
// -------------------------------
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is missing in environment variables");
  process.exit(1); // stop app if no DB
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// -------------------------------
// Schema & Model
// -------------------------------
const applicationSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  name: { type: String, required: true },
  contact: { type: String, required: true },
  loanType: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, default: 'Pending' },
  staff: { type: String, default: null },
  date: String
});

const Application = mongoose.model('Application', applicationSchema);

// -------------------------------
// Helper: Auto ID
// -------------------------------
async function getNextId() {
  const lastApp = await Application.findOne().sort({ id: -1 });
  return lastApp ? lastApp.id + 1 : 1;
}

// -------------------------------
// Token system
// -------------------------------
const validTokens = new Map();

function generateToken() {
  return 'token_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
}

// -------------------------------
// AUTH ROUTES
// -------------------------------
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (email === 'admin@gmail.com' && password === '1234') {
    const token = generateToken();
    const user = { email, role: 'owner' };
    validTokens.set(token, user);
    return res.json({ token, user });
  }

  res.status(401).json({ message: 'Invalid credentials' });
});

app.get('/api/me', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing token' });
  }

  const token = authHeader.split(' ')[1];
  const user = validTokens.get(token);

  if (!user) {
    return res.status(401).json({ message: 'Invalid token' });
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
// APPLICATION ROUTES
// -------------------------------

// CREATE
app.post('/submit', async (req, res) => {
  try {
    const { name, contact, loanType, amount, status } = req.body;

    if (!name || !contact || !loanType || !amount) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const newId = await getNextId();

    const newApp = new Application({
      id: newId,
      name,
      contact,
      loanType,
      amount: Number(amount),
      status: status || 'Pending',
      staff: null,
      date: new Date().toLocaleDateString('en-IN')
    });

    await newApp.save();

    res.json({ success: true, id: newId });

  } catch (err) {
    console.error("❌ CREATE ERROR:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

// READ
app.get('/api/applications', async (req, res) => {
  try {
    const apps = await Application.find().sort({ id: 1 });
    res.json(apps);
  } catch (err) {
    console.error("❌ FETCH ERROR:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE STATUS
app.patch('/api/applications/:id/status', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    const result = await Application.updateOne({ id }, { status });

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.json({ success: true });

  } catch (err) {
    console.error("❌ STATUS ERROR:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE STAFF
app.patch('/api/applications/:id/staff', async (req, res) => {
  try {
    const id = Number(req.params.id);
    let { staff } = req.body;

    if (staff === 'none') staff = null;

    const result = await Application.updateOne({ id }, { staff });

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.json({ success: true });

  } catch (err) {
    console.error("❌ STAFF ERROR:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

// -------------------------------
// HEALTH CHECK (VERY IMPORTANT)
// -------------------------------
app.get('/', (req, res) => {
  res.send('✅ Ekarz Backend Running');
});

// -------------------------------
// START SERVER
// -------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});