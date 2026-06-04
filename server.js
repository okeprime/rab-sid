// server.js — Express entry point (pengganti main.js Electron)
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./src/database/init');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'https://rab-sid.bbsdlp.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ],
  credentials: true, // penting agar session/cookie dikirim
}));

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Halaman Statis ────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// Redirect root ke login
app.get('/', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/index.html');
  }
  res.redirect('/login.html');
});

// ─── Inisialisasi Database & Mount Routes ──────────────────────────────────────
initDatabase()
  .then((pool) => {
    // Setup session store pakai MySQL (agar session persistent)
    const sessionStore = new MySQLStore({}, pool);

    app.use(session({
      secret: process.env.SESSION_SECRET || 'rahasia_default_ganti_ini',
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: {
        secure: false, // Set ke true jika pakai HTTPS di production
        maxAge: 24 * 60 * 60 * 1000, // 24 jam
      },
    }));

    // Import semua routes
    const authRoutes = require('./src/routes/authRoutes')(pool);
    const materialRoutes = require('./src/routes/materialRoutes')(pool);
    const ahsRoutes = require('./src/routes/ahsRoutes')(pool);
    const pricingRoutes = require('./src/routes/pricingRoutes')(pool);
    const projectRoutes = require('./src/routes/projectRoutes')(pool);
    const bqRoutes = require('./src/routes/bqRoutes')(pool);
    const subprojectRoutes = require('./src/routes/subprojectRoutes')(pool);
    const exportRoutes = require('./src/routes/exportRoutes')(pool);
    const calculatorRoutes = require('./src/routes/calculatorRoutes')(pool);

    // Mount routes
    app.use('/api/auth', authRoutes);
    app.use('/api/materials', materialRoutes);
    app.use('/api/ahs', ahsRoutes);
    app.use('/api/pricing', pricingRoutes);
    app.use('/api/project', projectRoutes);
    app.use('/api/bq', bqRoutes);
    app.use('/api/subprojects', subprojectRoutes);
    app.use('/api/export', exportRoutes);
    app.use('/api/calculator', calculatorRoutes);

    // ─── Error Handler ─────────────────────────────────────────────────────────
    app.use((err, req, res, next) => {
      console.error('Server error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });

    // ─── Start Server ──────────────────────────────────────────────────────────
    app.listen(PORT, () => {
      console.log(`\n✅ Server RAB-SID berjalan di: http://localhost:${PORT}`);
      console.log(`   Login dengan: admin / admin`);
      console.log(`   Tekan Ctrl+C untuk menghentikan server\n`);
    });
  })
  .catch((err) => {
    console.error('❌ Gagal menginisialisasi database:', err.message);
    console.error('   Pastikan MySQL sudah berjalan dan konfigurasi .env sudah benar');
    process.exit(1);
  });
