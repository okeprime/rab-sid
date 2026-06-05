// middleware/auth.js
// Middleware untuk memastikan user sudah login sebelum akses halaman/API

function requireLogin(req, res, next) {
  // Bypass login: semua pengguna otomatis menggunakan akun utama (user_id = 1)
  if (!req.session) req.session = {};
  req.session.userId = 1;
  return next();
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden - Hanya admin yang bisa akses' });
}

module.exports = { requireLogin, requireAdmin };
