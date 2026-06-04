// src/routes/calculatorRoutes.js
// Routes untuk kalkulator material dan upah (data BQ + pricing)
const express = require('express');
const router = express.Router();
const { requireLogin } = require('../../middleware/auth');

module.exports = function(pool) {

  // GET /api/calculator/material-summary — ringkasan kalkulator material
  router.get('/material-summary', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    try {
      const [rows] = await pool.query(
        `SELECT 
          a.kelompok,
          a.ahs as deskripsi,
          a.satuan,
          m.price as hrg_satuan,
          p.koefisien as volume
        FROM ahs a
        JOIN pricing p ON a.id = p.ahs_id
        JOIN materials m ON p.material_id = m.id
        WHERE p.koefisien IS NOT NULL
        AND LOWER(m.category) != 'upah'
        AND a.user_id = ?
        ORDER BY a.kelompok, a.kode_ahs`,
        [userId]
      );
      res.json(rows);
    } catch (err) {
      console.error('Material summary error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/calculator/wage-summary — ringkasan kalkulator upah
  router.get('/wage-summary', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    try {
      const [rows] = await pool.query(
        `SELECT 
          a.kelompok,
          a.ahs as deskripsi,
          a.satuan,
          m.price as hrg_satuan,
          p.koefisien as volume
        FROM ahs a
        JOIN pricing p ON a.id = p.ahs_id
        JOIN materials m ON p.material_id = m.id
        WHERE p.koefisien IS NOT NULL
        AND LOWER(m.category) = 'upah'
        AND a.user_id = ?
        ORDER BY a.kelompok, a.kode_ahs`,
        [userId]
      );
      res.json(rows);
    } catch (err) {
      console.error('Wage summary error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
