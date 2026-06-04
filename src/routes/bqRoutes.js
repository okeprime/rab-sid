// src/routes/bqRoutes.js
const express = require('express');
const router = express.Router();
const { requireLogin } = require('../../middleware/auth');

module.exports = function(pool) {

  // GET /api/bq/ahs-with-pricing — AHS dengan harga satuan
  router.get('/ahs-with-pricing', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    try {
      const [rows] = await pool.query(
        `SELECT 
          a.id,
          a.kode_ahs,
          a.ahs,
          a.satuan,
          COALESCE(MAX(p.total_after_tax_profit), SUM(m.price * p.koefisien)) as total_price
        FROM ahs a
        INNER JOIN pricing p ON p.ahs_id = a.id
        INNER JOIN materials m ON m.id = p.material_id
        WHERE a.user_id = ?
        GROUP BY a.id, a.kode_ahs, a.ahs, a.satuan
        ORDER BY a.kode_ahs`,
        [userId]
      );
      res.json(rows);
    } catch (err) {
      console.error('Get AHS with pricing error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/bq — ambil semua BQ items user
  router.get('/', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    try {
      const [rows] = await pool.query(
        `SELECT 
          b.*,
          a.kode_ahs,
          a.ahs,
          (SELECT COALESCE(MAX(p.total_after_tax_profit), SUM(m.price * p.koefisien)) * b.volume
           FROM pricing p
           LEFT JOIN materials m ON m.id = p.material_id 
           WHERE p.ahs_id = b.ahs_id) as total_price
        FROM bq b
        INNER JOIN ahs a ON a.id = b.ahs_id
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC`,
        [userId]
      );
      res.json(rows);
    } catch (err) {
      console.error('Get BQ items error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/bq — simpan BQ item baru
  router.post('/', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    const { ahsId, volume, satuan, total_price, subproject_id, shape, dimensions } = req.body;
    if (!ahsId || !volume || !satuan) {
      return res.status(400).json({ error: 'ahsId, volume, dan satuan wajib diisi' });
    }
    try {
      const [result] = await pool.query(
        'INSERT INTO bq (user_id, ahs_id, volume, satuan, total_price, subproject_id, shape, dimensions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, ahsId, volume, satuan, total_price || 0, subproject_id || null, shape || null, dimensions ? JSON.stringify(dimensions) : null]
      );
      res.json({ success: true, id: result.insertId });
    } catch (err) {
      console.error('Save BQ item error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/bq/:id — update BQ item
  router.put('/:id', requireLogin, async (req, res) => {
    const { volume, satuan } = req.body;
    if (!volume || !satuan) {
      return res.status(400).json({ error: 'volume dan satuan wajib diisi' });
    }
    try {
      await pool.query(
        `UPDATE bq
         SET volume = ?,
             satuan = ?,
             total_price = (SELECT COALESCE(MAX(p.total_after_tax_profit), SUM(m.price * p.koefisien)) * ?
                            FROM pricing p
                            LEFT JOIN materials m ON m.id = p.material_id
                            WHERE p.ahs_id = bq.ahs_id)
         WHERE id = ?`,
        [volume, satuan, volume, req.params.id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error('Update BQ item error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/bq/:id — hapus BQ item
  router.delete('/:id', requireLogin, async (req, res) => {
    try {
      await pool.query('DELETE FROM bq WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      console.error('Delete BQ item error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
