// src/routes/materialRoutes.js
const express = require('express');
const router = express.Router();
const { requireLogin } = require('../../middleware/auth');

module.exports = function(pool) {

  // GET /api/materials — ambil semua material user
  router.get('/', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    try {
      const [rows] = await pool.query('SELECT * FROM materials WHERE user_id = ?', [userId]);
      res.json(rows);
    } catch (err) {
      console.error('Get materials error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/materials/suggestions — autocomplete
  router.get('/suggestions', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    try {
      const [names] = await pool.query('SELECT DISTINCT name FROM materials WHERE user_id = ? ORDER BY name', [userId]);
      const [units] = await pool.query('SELECT DISTINCT unit FROM materials WHERE user_id = ? ORDER BY unit', [userId]);
      const [lokasi] = await pool.query('SELECT DISTINCT lokasi FROM materials WHERE user_id = ? AND lokasi IS NOT NULL ORDER BY lokasi', [userId]);
      const [sumber] = await pool.query('SELECT DISTINCT sumber_data FROM materials WHERE user_id = ? AND sumber_data IS NOT NULL ORDER BY sumber_data', [userId]);
      res.json({
        names: names.map(n => n.name),
        units: units.map(u => u.unit),
        lokasi: lokasi.map(l => l.lokasi),
        sumber_data: sumber.map(s => s.sumber_data),
      });
    } catch (err) {
      console.error('Suggestions error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/materials/search?q= — cari material
  router.get('/search', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    const q = `%${req.query.q || ''}%`;
    try {
      const [rows] = await pool.query(
        'SELECT * FROM materials WHERE user_id = ? AND (kode LIKE ? OR name LIKE ? OR category LIKE ? OR lokasi LIKE ? OR sumber_data LIKE ?)',
        [userId, q, q, q, q, q]
      );
      res.json(rows);
    } catch (err) {
      console.error('Search materials error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/materials/sort?col=&dir= — sort material
  router.get('/sort', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    const { col, dir } = req.query;
    const validColumns = ['kode', 'name', 'unit', 'price', 'category', 'lokasi', 'sumber_data', 'created_at'];
    if (!validColumns.includes(col)) {
      return res.status(400).json({ error: 'Kolom tidak valid' });
    }
    const direction = dir === 'asc' ? 'ASC' : 'DESC';
    try {
      const [rows] = await pool.query(
        `SELECT * FROM materials WHERE user_id = ? ORDER BY \`${col}\` ${direction}`,
        [userId]
      );
      res.json(rows);
    } catch (err) {
      console.error('Sort materials error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/materials/:id — get material by id
  router.get('/:id', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    try {
      const [rows] = await pool.query(
        'SELECT * FROM materials WHERE id = ? AND user_id = ?',
        [req.params.id, userId]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Material tidak ditemukan' });
      res.json(rows[0]);
    } catch (err) {
      console.error('Get material by id error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/materials — tambah material baru
  router.post('/', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    const { kode, name, unit, price, category, lokasi, sumber_data } = req.body;
    if (!name || !unit) {
      return res.status(400).json({ error: 'Name dan unit wajib diisi' });
    }
    try {
      const [result] = await pool.query(
        'INSERT INTO materials (kode, name, unit, price, category, lokasi, sumber_data, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [kode || null, name, unit, price || 0, category || null, lokasi || null, sumber_data || null, userId]
      );
      res.json({ success: true, id: result.insertId });
    } catch (err) {
      console.error('Add material error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/materials/:id — update material
  router.put('/:id', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    const { kode, name, unit, price, category, lokasi, sumber_data } = req.body;
    try {
      await pool.query(
        'UPDATE materials SET kode = ?, name = ?, unit = ?, price = ?, category = ?, lokasi = ?, sumber_data = ? WHERE id = ? AND user_id = ?',
        [kode || null, name, unit, price || 0, category || null, lokasi || null, sumber_data || null, req.params.id, userId]
      );
      res.json({ success: true });
    } catch (err) {
      console.error('Update material error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/materials — hapus semua material user
  router.delete('/', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    try {
      await pool.query('DELETE FROM materials WHERE user_id = ?', [userId]);
      res.json({ success: true });
    } catch (err) {
      console.error('Delete all materials error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/materials/:id — hapus satu material
  router.delete('/:id', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    try {
      await pool.query('DELETE FROM materials WHERE id = ? AND user_id = ?', [req.params.id, userId]);
      res.json({ success: true });
    } catch (err) {
      console.error('Delete material error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
