// src/routes/ahsRoutes.js
const express = require('express');
const router = express.Router();
const { requireLogin } = require('../../middleware/auth');

module.exports = function(pool) {

  // GET /api/ahs — ambil semua AHS user
  router.get('/', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    try {
      const [rows] = await pool.query('SELECT * FROM ahs WHERE user_id = ?', [userId]);
      res.json(rows);
    } catch (err) {
      console.error('Get AHS error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/ahs/suggestions — autocomplete
  router.get('/suggestions', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    try {
      const [names] = await pool.query('SELECT DISTINCT ahs FROM ahs WHERE user_id = ? ORDER BY ahs', [userId]);
      const [units] = await pool.query('SELECT DISTINCT satuan FROM ahs WHERE user_id = ? ORDER BY satuan', [userId]);
      res.json({
        names: names.map(n => n.ahs),
        units: units.map(u => u.satuan),
      });
    } catch (err) {
      console.error('AHS suggestions error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/ahs/search?q= — cari AHS
  router.get('/search', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    const q = `%${req.query.q || ''}%`;
    try {
      const [rows] = await pool.query(
        'SELECT * FROM ahs WHERE user_id = ? AND (kelompok LIKE ? OR ahs LIKE ?)',
        [userId, q, q]
      );
      res.json(rows);
    } catch (err) {
      console.error('Search AHS error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/ahs/sort?col=&dir= — sort AHS
  router.get('/sort', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    const { col, dir } = req.query;
    const validColumns = ['kelompok', 'kode_ahs', 'ahs', 'satuan', 'created_at'];
    if (!validColumns.includes(col)) {
      return res.status(400).json({ error: 'Kolom tidak valid' });
    }
    const direction = dir === 'asc' ? 'ASC' : 'DESC';
    try {
      const [rows] = await pool.query(
        `SELECT * FROM ahs WHERE user_id = ? ORDER BY \`${col}\` ${direction}`,
        [userId]
      );
      res.json(rows);
    } catch (err) {
      console.error('Sort AHS error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/ahs/:id — get AHS by id
  router.get('/:id', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    try {
      const [rows] = await pool.query(
        'SELECT * FROM ahs WHERE id = ? AND user_id = ?',
        [req.params.id, userId]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'AHS tidak ditemukan' });
      res.json(rows[0]);
    } catch (err) {
      console.error('Get AHS by id error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/ahs — tambah AHS baru
  router.post('/', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    const { kelompok, kode_ahs, ahs, satuan, lokasi, sumber_data } = req.body;
    if (!kelompok || !kode_ahs || !ahs || !satuan) {
      return res.status(400).json({ error: 'Field kelompok, kode_ahs, ahs, dan satuan wajib diisi' });
    }
    try {
      const [result] = await pool.query(
        'INSERT INTO ahs (kelompok, kode_ahs, ahs, satuan, user_id, lokasi, sumber_data) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [kelompok, kode_ahs, ahs, satuan, userId, lokasi || null, sumber_data || null]
      );
      res.json({ success: true, id: result.insertId });
    } catch (err) {
      console.error('Add AHS error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/ahs/:id — update AHS
  router.put('/:id', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    const { kelompok, kode_ahs, ahs, satuan, lokasi, sumber_data } = req.body;
    try {
      await pool.query(
        'UPDATE ahs SET kelompok = ?, kode_ahs = ?, ahs = ?, satuan = ?, lokasi = ?, sumber_data = ? WHERE id = ? AND user_id = ?',
        [kelompok, kode_ahs, ahs, satuan, lokasi || null, sumber_data || null, req.params.id, userId]
      );
      res.json({ success: true });
    } catch (err) {
      console.error('Update AHS error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/ahs — hapus semua AHS user
  router.delete('/', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    try {
      await pool.query('DELETE FROM ahs WHERE user_id = ?', [userId]);
      res.json({ success: true });
    } catch (err) {
      console.error('Delete all AHS error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/ahs/:id — hapus satu AHS
  router.delete('/:id', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    try {
      await pool.query('DELETE FROM ahs WHERE id = ? AND user_id = ?', [req.params.id, userId]);
      res.json({ success: true });
    } catch (err) {
      console.error('Delete AHS error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
