// src/routes/subprojectRoutes.js
const express = require('express');
const router = express.Router();
const { requireLogin } = require('../../middleware/auth');

module.exports = function(pool) {

  // GET /api/subprojects — ambil semua subproyek user
  router.get('/', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    try {
      const [rows] = await pool.query(
        'SELECT * FROM subprojects WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      res.json(rows);
    } catch (err) {
      console.error('Get subprojects error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/subprojects/bq-grouped — BQ dikelompokkan per subproyek
  router.get('/bq-grouped', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    try {
      const [rows] = await pool.query(
        `SELECT 
          s.id as subproject_id,
          s.name as subproject_name,
          b.id,
          b.volume,
          b.satuan,
          b.total_price,
          a.kode_ahs,
          a.ahs
        FROM subprojects s
        LEFT JOIN bq b ON b.subproject_id = s.id AND b.user_id = s.user_id
        LEFT JOIN ahs a ON b.ahs_id = a.id
        WHERE s.user_id = ?
        ORDER BY s.created_at DESC, b.created_at ASC`,
        [userId]
      );
      res.json(rows);
    } catch (err) {
      console.error('Get BQ by subproject error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/subprojects — tambah subproyek baru
  router.post('/', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama subproyek wajib diisi' });
    try {
      const [result] = await pool.query(
        'INSERT INTO subprojects (name, user_id) VALUES (?, ?)',
        [name, userId]
      );
      res.json({ success: true, id: result.insertId, message: 'Subproyek berhasil ditambahkan' });
    } catch (err) {
      console.error('Add subproject error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // PUT /api/subprojects/:id — update subproyek
  router.put('/:id', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama subproyek wajib diisi' });
    try {
      await pool.query(
        'UPDATE subprojects SET name = ? WHERE id = ? AND user_id = ?',
        [name, req.params.id, userId]
      );
      res.json({ success: true, message: 'Subproyek berhasil diperbarui' });
    } catch (err) {
      console.error('Update subproject error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // DELETE /api/subprojects/:id — hapus subproyek (dengan transaction)
  router.delete('/:id', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      // Hapus referensi BQ ke subproject ini
      await connection.query(
        'UPDATE bq SET subproject_id = NULL WHERE subproject_id = ? AND user_id = ?',
        [req.params.id, userId]
      );
      // Hapus subproject
      await connection.query(
        'DELETE FROM subprojects WHERE id = ? AND user_id = ?',
        [req.params.id, userId]
      );
      await connection.commit();
      res.json({ success: true, message: 'Subproyek berhasil dihapus' });
    } catch (err) {
      await connection.rollback();
      console.error('Delete subproject error:', err);
      res.status(500).json({ success: false, error: err.message });
    } finally {
      connection.release();
    }
  });

  return router;
};
