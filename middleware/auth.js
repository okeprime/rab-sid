// middleware/auth.js
// Middleware untuk memastikan user sudah login sebelum akses halaman/API

function requireLogin(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  // Jika request adalah API, kembalikan JSON error
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Unauthorized - Silakan login terlebih dahulu' });
  }
  // Jika request adalah halaman HTML, redirect ke login
  return res.redirect('/login.html');
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden - Hanya admin yang bisa akses' });
}

module.exports = { requireLogin, requireAdmin };
