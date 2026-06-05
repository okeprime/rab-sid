// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();

module.exports = function(pool) {

  // POST /api/auth/login
  router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
    }
    try {
      const [rows] = await pool.query(
        'SELECT * FROM users WHERE username = ? AND password = ?',
        [username, password]
      );
      if (rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Username atau password salah' });
      }
      const user = rows[0];
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.isAdmin = (user.username === 'admin');
      res.json({ success: true, message: 'Login berhasil', userId: user.id, isAdmin: req.session.isAdmin });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, message: 'Error saat login' });
    }
  });

  // POST /api/auth/register
  router.post('/register', async (req, res) => {
    const { username, password, hint } = req.body;
    if (!username || !password || !hint) {
      return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
    }
    try {
      const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: 'Username sudah digunakan' });
      }
      const [result] = await pool.query(
        'INSERT INTO users (username, password, hint) VALUES (?, ?, ?)',
        [username, password, hint]
      );
      res.json({ success: true, message: 'Registrasi berhasil', userId: result.insertId });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ success: false, message: 'Error saat registrasi' });
    }
  });

  // POST /api/auth/reset
  router.post('/reset', async (req, res) => {
    const { username, hint, newPassword } = req.body;
    if (!username || !hint || !newPassword) {
      return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
    }
    try {
      const [rows] = await pool.query(
        'SELECT * FROM users WHERE username = ? AND hint = ?',
        [username, hint]
      );
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Username atau hint tidak valid' });
      }
      await pool.query('UPDATE users SET password = ? WHERE id = ?', [newPassword, rows[0].id]);
      res.json({ success: true, message: 'Password berhasil direset' });
    } catch (err) {
      console.error('Reset error:', err);
      res.status(500).json({ success: false, message: 'Error saat reset password' });
    }
  });

  // POST /api/auth/logout
  router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ success: false, message: 'Error saat logout' });
      res.clearCookie('connect.sid');
      res.json({ success: true, message: 'Logout berhasil' });
    });
  });

  // GET /api/auth/me
  router.get('/me', (req, res) => {
    // Bypass login: selalu kembalikan status login sebagai admin
    req.session.userId = 1;
    req.session.isAdmin = true;
    res.json({
      loggedIn: true,
      userId: 1,
      username: 'admin',
      isAdmin: true,
    });
  });

  // GET /api/auth/check-admin
  router.get('/check-admin', (req, res) => {
    res.json({ isAdmin: true });
  });

  // GET /api/auth/users  (admin only)
  router.get('/users', async (req, res) => {
    // Bypass auth: always allow
    try {
      const [rows] = await pool.query(
        'SELECT id, username, password, hint FROM users ORDER BY username'
      );
      res.json(rows);
    } catch (err) {
      console.error('Get users error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/auth/users/:id  (admin only)
  router.delete('/users/:id', async (req, res) => {
    if (!req.session.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    try {
      await pool.query('DELETE FROM users WHERE id = ? AND username != "admin"', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      console.error('Delete user error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
