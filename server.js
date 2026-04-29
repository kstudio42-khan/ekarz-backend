const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// -------------------------------
// Simple in-memory token storage
// -------------------------------
const validTokens = new Map(); // token -> user object

function generateToken() {
    return 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
}

// Helper to read/write applications.json
const dataPath = path.join(__dirname, 'applications.json');

function readApplications() {
    if (!fs.existsSync(dataPath)) return [];
    const raw = fs.readFileSync(dataPath);
    return JSON.parse(raw);
}

function writeApplications(apps) {
    fs.writeFileSync(dataPath, JSON.stringify(apps, null, 2));
}

// -------------------------------
// EXISTING ROUTES
// -------------------------------

// POST /submit – save application
app.post('/submit', (req, res) => {
    const { name, contact, loanType, amount, status } = req.body;
    
    let apps = readApplications();
    const newId = apps.length > 0 ? Math.max(...apps.map(a => a.id)) + 1 : 1;
    const newApp = {
        id: newId,
        name,
        contact,
        loanType,
        amount,
        status: status || 'Pending',
        date: new Date().toLocaleDateString('en-IN')
    };
    apps.push(newApp);
    writeApplications(apps);
    
    res.json({ success: true, id: newId });
});

// GET /api/applications
app.get('/api/applications', (req, res) => {
    const apps = readApplications();
    res.json(apps);
});

// -------------------------------
// LOGIN ROUTE (FIXED)
// -------------------------------
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    const users = [
        { email: 'admin@gmail.com', password: '1234', role: 'owner' },
        { email: 'staff1@gmail.com', password: '1111', role: 'staff' },
        { email: 'staff2@gmail.com', password: '2222', role: 'staff' }
    ];

    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        const token = generateToken();
        validTokens.set(token, user);
        res.json({ token, user });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
}); // ✅ YEHI MISSING THA

// GET /api/me
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

// POST /api/logout
app.post('/api/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        validTokens.delete(token);
    }
    res.json({ success: true });
});

// -------------------------------
// PATCH ROUTES
// -------------------------------

app.patch('/api/applications/:id/status', (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    
    let apps = readApplications();
    const appIndex = apps.findIndex(a => a.id === id);
    
    if (appIndex === -1) {
        return res.status(404).json({ message: 'Application not found' });
    }
    
    apps[appIndex].status = status;
    writeApplications(apps);
    res.json({ success: true });
});

app.patch('/api/applications/:id/staff', (req, res) => {
    const id = parseInt(req.params.id);
    const { staff } = req.body;
    
    let apps = readApplications();
    const appIndex = apps.findIndex(a => a.id === id);
    
    if (appIndex === -1) {
        return res.status(404).json({ message: 'Application not found' });
    }
    
    apps[appIndex].staff = staff === 'none' ? null : staff;
    writeApplications(apps);
    res.json({ success: true });
});

// -------------------------------
// START SERVER
// -------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});