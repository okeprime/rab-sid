// src/routes/projectRoutes.js
const express = require('express');
const router = express.Router();
const { requireLogin } = require('../../middleware/auth');

module.exports = function(pool) {

  // GET /api/project — ambil proyek terbaru user
  router.get('/', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    try {
      const [rows] = await pool.query(
        'SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        [userId]
      );
      res.json(rows[0] || null);
    } catch (err) {
      console.error('Get project error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/project — simpan/update proyek
  router.post('/', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    const { name, location, funding } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Nama proyek wajib diisi' });
    try {
      // Cek apakah sudah ada proyek
      const [existing] = await pool.query(
        'SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        [userId]
      );
      let project;
      if (existing.length > 0) {
        await pool.query(
          'UPDATE projects SET name = ?, location = ?, funding = ? WHERE id = ? AND user_id = ?',
          [name, location || null, funding || null, existing[0].id, userId]
        );
        const [updated] = await pool.query('SELECT * FROM projects WHERE id = ?', [existing[0].id]);
        project = updated[0];
        res.json({ success: true, message: 'Data proyek berhasil diperbarui', project });
      } else {
        const [result] = await pool.query(
          'INSERT INTO projects (name, location, funding, user_id) VALUES (?, ?, ?, ?)',
          [name, location || null, funding || null, userId]
        );
        const [newProject] = await pool.query('SELECT * FROM projects WHERE id = ?', [result.insertId]);
        project = newProject[0];
        res.json({ success: true, message: 'Data proyek berhasil disimpan', project });
      }
    } catch (err) {
      console.error('Save project error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
