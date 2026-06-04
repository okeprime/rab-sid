// src/routes/pricingRoutes.js
const express = require('express');
const router = express.Router();
const { requireLogin } = require('../../middleware/auth');

module.exports = function(pool) {

  // GET /api/pricing?ahs_id= — ambil pricing berdasarkan AHS
  router.get('/', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    const { ahs_id } = req.query;
    if (!ahs_id) return res.status(400).json({ error: 'ahs_id diperlukan' });
    try {
      const [rows] = await pool.query(
        `SELECT p.*, m.name, m.unit, m.price, m.category, m.lokasi, m.sumber_data,
                p.ppn_percentage, p.profit_percentage
         FROM pricing p
         JOIN materials m ON p.material_id = m.id
         WHERE p.ahs_id = ? AND p.user_id = ? AND m.user_id = ?`,
        [ahs_id, userId, userId]
      );
      res.json(rows);
    } catch (err) {
      console.error('Get pricing error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/pricing/tax-profit?ahs_id= — ambil data PPN & profit
  router.get('/tax-profit', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    const { ahs_id } = req.query;
    if (!ahs_id) return res.status(400).json({ error: 'ahs_id diperlukan' });
    try {
      const [rows] = await pool.query(
        'SELECT id, ppn_percentage, profit_percentage, total_after_tax_profit FROM pricing WHERE ahs_id = ? AND user_id = ?',
        [ahs_id, userId]
      );
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error('Get tax-profit error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/pricing — tambah pricing baru
  router.post('/', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    const { ahs_id, material_id, quantity, koefisien } = req.body;
    if (!ahs_id || !material_id) {
      return res.status(400).json({ error: 'ahs_id dan material_id wajib diisi' });
    }
    try {
      const [result] = await pool.query(
        'INSERT INTO pricing (ahs_id, material_id, quantity, koefisien, ppn_percentage, profit_percentage, user_id) VALUES (?, ?, ?, ?, 0, 0, ?)',
        [ahs_id, material_id, quantity || 0, koefisien || 0, userId]
      );
      res.json({ success: true, id: result.insertId });
    } catch (err) {
      console.error('Add pricing error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/pricing/tax-profit — update PPN & profit untuk satu AHS
  router.put('/tax-profit', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    const { ahs_id, ppn_percentage, profit_percentage, total_after_tax_profit } = req.body;
    try {
      await pool.query(
        'UPDATE pricing SET ppn_percentage = ?, profit_percentage = ?, total_after_tax_profit = ? WHERE ahs_id = ? AND user_id = ?',
        [ppn_percentage, profit_percentage, total_after_tax_profit, ahs_id, userId]
      );
      res.json({ success: true, ahs_id });
    } catch (err) {
      console.error('Update tax-profit error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // PUT /api/pricing/:id — update koefisien pricing
  router.put('/:id', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    const { koefisien, ahs_id } = req.body;
    try {
      await pool.query(
        'UPDATE pricing SET koefisien = ? WHERE id = ? AND user_id = ?',
        [koefisien, req.params.id, userId]
      );
      // Return updated list
      const [rows] = await pool.query(
        `SELECT p.*, m.name, m.unit, m.price, m.category, m.lokasi, m.sumber_data,
                p.ppn_percentage, p.profit_percentage
         FROM pricing p
         JOIN materials m ON p.material_id = m.id
         WHERE p.ahs_id = ? AND p.user_id = ? AND m.user_id = ?`,
        [ahs_id, userId, userId]
      );
      res.json({ success: true, updatedPricing: rows });
    } catch (err) {
      console.error('Update pricing error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/pricing/all?ahs_id= — hapus semua pricing untuk satu AHS
  router.delete('/all', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    const { ahs_id } = req.query;
    if (!ahs_id) return res.status(400).json({ error: 'ahs_id diperlukan' });
    try {
      await pool.query('DELETE FROM pricing WHERE ahs_id = ? AND user_id = ?', [ahs_id, userId]);
      res.json({ success: true });
    } catch (err) {
      console.error('Delete all pricing error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/pricing/:id — hapus satu pricing
  router.delete('/:id', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    try {
      // Ambil ahs_id dulu untuk return updated list
      const [existing] = await pool.query(
        'SELECT ahs_id FROM pricing WHERE id = ? AND user_id = ?',
        [req.params.id, userId]
      );
      if (existing.length === 0) return res.status(404).json({ error: 'Pricing tidak ditemukan' });
      const ahs_id = existing[0].ahs_id;

      await pool.query('DELETE FROM pricing WHERE id = ? AND user_id = ?', [req.params.id, userId]);

      const [rows] = await pool.query(
        `SELECT p.*, m.name, m.unit, m.price, m.category, m.lokasi, m.sumber_data,
                p.ppn_percentage, p.profit_percentage
         FROM pricing p
         JOIN materials m ON p.material_id = m.id
         WHERE p.ahs_id = ? AND p.user_id = ? AND m.user_id = ?`,
        [ahs_id, userId, userId]
      );
      res.json({ success: true, updatedPricing: rows });
    } catch (err) {
      console.error('Delete pricing error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
