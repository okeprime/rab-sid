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

// ─── Halaman Statis (URL BERSIH TANPA .HTML) ───────────────────────────────────
// Opsi extensions: ['html'] ditambahkan agar Express otomatis membaca file HTML
app.use(express.static(path.join(__dirname, 'public'), {
    extensions: ['html']
}));

// Redirect root ke login (Arahkan ke URL bersih tanpa .html)
app.get('/', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/index'); 
  }
  res.redirect('/login');
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
        secure: true,       // wajib true agar SameSite=None bisa bekerja
        sameSite: 'none',   // wajib untuk cross-origin cookie (Railway ↔ Hostinger)
        maxAge: 24 * 60 * 60 * 1000, // 24 jam
      },
    }));

    // ─── AUTO-LOGIN (bypass login, semua user otomatis masuk sebagai admin) ──────
    // Ubah BYPASS_LOGIN=false di .env untuk mengaktifkan login kembali
    const BYPASS_LOGIN = process.env.BYPASS_LOGIN !== 'false';
    if (BYPASS_LOGIN) {
      app.use(async (req, res, next) => {
        if (!req.session.userId) {
          try {
            const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', ['admin']);
            if (rows.length > 0) {
              req.session.userId   = rows[0].id;
              req.session.username = rows[0].username;
              req.session.isAdmin  = true;
            }
          } catch (e) { /* abaikan error */ }
        }
        next();
      });
    }

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
