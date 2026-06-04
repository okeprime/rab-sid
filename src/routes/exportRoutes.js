// src/routes/exportRoutes.js
// Export data ke Excel (download via browser) & Import dari Excel (upload via browser)
const express = require('express');
const router = express.Router();
const multer = require('multer');
const ExcelJS = require('exceljs');
const { requireLogin } = require('../../middleware/auth');

// Simpan file upload di memory (tidak perlu simpan ke disk)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

module.exports = function(pool) {

  // GET /api/export/materials — download materials sebagai Excel
  router.get('/materials', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    try {
      const [materials] = await pool.query(
        'SELECT kode, name, unit, price, category, lokasi, sumber_data FROM materials WHERE user_id = ? ORDER BY category, name',
        [userId]
      );

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Materials');

      const headerRow = worksheet.addRow(['KODE', 'NAMA', 'SATUAN', 'HARGA', 'KATEGORI', 'LOKASI', 'SUMBER DATA']);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        cell.alignment = { horizontal: 'center' };
      });

      for (const material of materials) {
        worksheet.addRow([
          material.kode || '',
          material.name,
          material.unit,
          material.price,
          material.category || '',
          material.lokasi || '',
          material.sumber_data || '',
        ]);
      }

      worksheet.columns.forEach((col, idx) => { col.width = idx === 1 ? 30 : 18; });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="materials_export_${Date.now()}.xlsx"`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error('Export materials error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/export/ahs — download AHS sebagai Excel
  router.get('/ahs', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    try {
      const [ahs] = await pool.query(
        'SELECT kelompok, kode_ahs, ahs, satuan FROM ahs WHERE user_id = ? ORDER BY kelompok, kode_ahs',
        [userId]
      );

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('AHS');

      const headerRow = worksheet.addRow(['KELOMPOK', 'KODE AHS', 'URAIAN AHS', 'SATUAN']);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        cell.alignment = { horizontal: 'center' };
      });

      for (const item of ahs) {
        worksheet.addRow([item.kelompok, item.kode_ahs, item.ahs, item.satuan]);
      }

      worksheet.columns = [{ width: 25 }, { width: 20 }, { width: 50 }, { width: 15 }];

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="ahs_export_${Date.now()}.xlsx"`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error('Export AHS error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/export/ahs-rincian?ahs_id= — download rincian komponen satu AHS sebagai Excel
  router.get('/ahs-rincian', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    const { ahs_id } = req.query;
    if (!ahs_id) return res.status(400).json({ error: 'ahs_id diperlukan' });
    try {
      const [ahsInfo] = await pool.query('SELECT ahs, kode_ahs, satuan FROM ahs WHERE id = ? AND user_id = ?', [ahs_id, userId]);
      if (ahsInfo.length === 0) return res.status(404).json({ error: 'AHS tidak ditemukan' });

      const [rows] = await pool.query(
        `SELECT m.category, m.kode, m.name, m.unit, p.koefisien, m.price,
                (p.koefisien * m.price) as total, m.lokasi, m.sumber_data
         FROM pricing p
         JOIN materials m ON p.material_id = m.id
         WHERE p.ahs_id = ? AND p.user_id = ?`,
        [ahs_id, userId]
      );

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Rincian AHS');

      worksheet.addRow([`Rincian AHS: ${ahsInfo[0].ahs}`]).font = { bold: true, size: 14 };
      worksheet.addRow([`Kode: ${ahsInfo[0].kode_ahs} | Satuan: ${ahsInfo[0].satuan}`]);
      worksheet.addRow([]);

      const headerRow = worksheet.addRow(['KATEGORI', 'KODE', 'DESKRIPSI', 'SATUAN', 'KOEFISIEN', 'HRG SATUAN', 'TOTAL', 'LOKASI', 'SUMBER DATA']);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        cell.alignment = { horizontal: 'center' };
      });

      let grandTotal = 0;
      for (const item of rows) {
        const row = worksheet.addRow([
          item.category || 'Bahan', item.kode || '-', item.name, item.unit,
          parseFloat(item.koefisien || 0), parseFloat(item.price || 0), parseFloat(item.total || 0),
          item.lokasi || '-', item.sumber_data || '-'
        ]);
        row.getCell(6).numFmt = '"Rp"#,##0.00';
        row.getCell(7).numFmt = '"Rp"#,##0.00';
        grandTotal += parseFloat(item.total || 0);
      }

      worksheet.addRow([]);
      const totalRow = worksheet.addRow(['', '', '', '', '', 'TOTAL', grandTotal]);
      totalRow.getCell(6).font = { bold: true };
      totalRow.getCell(7).font = { bold: true };
      totalRow.getCell(7).numFmt = '"Rp"#,##0.00';

      worksheet.columns = [{ width: 12 }, { width: 12 }, { width: 35 }, { width: 10 }, { width: 12 }, { width: 18 }, { width: 18 }, { width: 15 }, { width: 15 }];

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Rincian_AHS_${ahsInfo[0].kode_ahs.replace(/\//g, '-')}_${Date.now()}.xlsx"`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error('Export AHS Rincian error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/export/kesimpulan — download Kesimpulan RAB (Informasi Proyek & BQ)
  router.get('/kesimpulan', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    try {
      // Ambil data proyek aktif
      const [projects] = await pool.query('SELECT name, location FROM projects WHERE user_id = ? LIMIT 1', [userId]);
      const projectName = projects.length > 0 ? projects[0].name : 'Proyek Tanpa Nama';
      const projectLocation = projects.length > 0 ? (projects[0].location || '') : '';

      // Query relasi BQ dan AHS
      const [rows] = await pool.query(
        `SELECT 
          a.kelompok, 
          a.kode_ahs, 
          a.ahs AS uraian, 
          a.satuan, 
          b.volume, 
          (b.total_price / b.volume) as harga_satuan,
          b.total_price
         FROM bq b
         JOIN ahs a ON b.ahs_id = a.id
         WHERE b.user_id = ?
         ORDER BY a.kelompok, a.kode_ahs`,
        [userId]
      );

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Kesimpulan RAB');

      // === HEADER PROYEK (Baris 1 - 11) ===

      // Baris 1: RENCANA ANGGARAN BIAYA
      worksheet.mergeCells('A1:G1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'RENCANA ANGGARAN BIAYA';
      titleCell.font = { name: 'Times New Roman', size: 24, bold: true, color: { argb: 'FF6AA84F' } }; // Warna hijau kehijauan
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Baris 2: Kosong / Garis batas
      worksheet.mergeCells('A2:G2');
      const lineCell = worksheet.getCell('A2');
      lineCell.border = { bottom: { style: 'thin' } };

      // Baris 3: Nama Proyek
      worksheet.mergeCells('A3:G3');
      const projectCell = worksheet.getCell('A3');
      projectCell.value = projectName;
      projectCell.font = { name: 'Times New Roman', size: 16, bold: true };
      projectCell.alignment = { horizontal: 'center', vertical: 'middle' };
      projectCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

      // Info Lokasi (Baris 5, 7, 9, 11)
      const locationLabels = [
        { row: 5, label: 'Provinsi' },
        { row: 7, label: 'Kabupaten / Kot' },
        { row: 9, label: 'Kecamatan' },
        { row: 11, label: 'Desa' }
      ];

      locationLabels.forEach(item => {
        // Label
        worksheet.getCell(`A${item.row}`).value = item.label;
        worksheet.getCell(`A${item.row}`).font = { name: 'Times New Roman', size: 12, bold: true };
        worksheet.getCell(`A${item.row}`).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        
        // Titik dua (:)
        worksheet.getCell(`B${item.row}`).value = ':';
        worksheet.getCell(`B${item.row}`).font = { name: 'Times New Roman', size: 12, bold: true };
        worksheet.getCell(`B${item.row}`).alignment = { horizontal: 'center' };
        
        // Data Lokasi
        worksheet.getCell(`C${item.row}`).value = projectLocation;
        worksheet.getCell(`C${item.row}`).font = { name: 'Times New Roman', size: 12, bold: true, underline: true };
      });

      // === TABEL DATA BQ ===

      // Baris 13: Header Tabel
      const headerRow = worksheet.getRow(13);
      headerRow.values = ['KELOMPOK', 'KODE AHS', 'URAIAN AHS', 'SATUAN', 'VOLUME', 'HARGA SATUAN', 'TOTAL HARGA'];
      headerRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });

      // Data BQ dimulai dari baris 14
      let currentRowIndex = 14;
      let grandTotal = 0;
      for (const item of rows) {
        const row = worksheet.getRow(currentRowIndex);
        row.values = [
          item.kelompok, 
          item.kode_ahs, 
          item.uraian, 
          item.satuan, 
          parseFloat(item.volume || 0), 
          parseFloat(item.harga_satuan || 0), 
          parseFloat(item.total_price || 0)
        ];
        
        row.eachCell((cell) => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        // Format Currency untuk kolom harga (F & G)
        row.getCell(6).numFmt = '"Rp"#,##0.00';
        row.getCell(7).numFmt = '"Rp"#,##0.00';
        grandTotal += parseFloat(item.total_price || 0);
        
        currentRowIndex++;
      }

      // Baris kosong
      currentRowIndex++;

      // Grand Total
      const totalRow = worksheet.getRow(currentRowIndex);
      totalRow.values = ['', '', '', '', '', 'GRAND TOTAL', grandTotal];
      totalRow.getCell(6).font = { bold: true };
      totalRow.getCell(7).font = { bold: true };
      totalRow.getCell(7).numFmt = '"Rp"#,##0.00';

      worksheet.columns = [
        { width: 25 }, { width: 15 }, { width: 45 }, { width: 10 }, { width: 15 }, { width: 20 }, { width: 20 }
      ];

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const safeProjectName = projectName.replace(/\s+/g, "_");
      const filename = `RAB_${safeProjectName}_Kesimpulan_${timestamp}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error('Export Kesimpulan error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/export/import-materials — upload Excel untuk import materials
  router.post('/import-materials', requireLogin, upload.single('file'), async (req, res) => {
    const userId = req.session.userId;
    if (!req.file) return res.status(400).json({ error: 'File Excel tidak ditemukan' });

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const worksheet = workbook.worksheets[0];

      let importedCount = 0;
      let skippedCount = 0;

      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        const name = row.getCell(2).value?.toString()?.trim();
        if (!name) { skippedCount++; continue; }

        try {
          await pool.query(
            'INSERT INTO materials (kode, name, unit, price, category, lokasi, sumber_data, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
              row.getCell(1).value?.toString() || null,
              name,
              row.getCell(3).value?.toString() || '-',
              parseFloat(row.getCell(4).value) || 0,
              row.getCell(5).value?.toString() || null,
              row.getCell(6).value?.toString() || null,
              row.getCell(7).value?.toString() || null,
              userId,
            ]
          );
          importedCount++;
        } catch (rowErr) {
          console.warn(`Row ${i} skip:`, rowErr.message);
          skippedCount++;
        }
      }

      res.json({
        success: true,
        message: `Berhasil import ${importedCount} material${skippedCount > 0 ? `, ${skippedCount} dilewati` : ''}`,
      });
    } catch (err) {
      console.error('Import materials error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/export/import-ahs — upload Excel untuk import AHS
  router.post('/import-ahs', requireLogin, upload.single('file'), async (req, res) => {
    const userId = req.session.userId;
    if (!req.file) return res.status(400).json({ error: 'File Excel tidak ditemukan' });

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const worksheet = workbook.worksheets[0];

      let importedCount = 0;
      let skippedCount = 0;

      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        const ahsName = row.getCell(3).value?.toString()?.trim();
        if (!ahsName) { skippedCount++; continue; }

        try {
          await pool.query(
            'INSERT INTO ahs (kelompok, kode_ahs, ahs, satuan, user_id) VALUES (?, ?, ?, ?, ?)',
            [
              row.getCell(1).value?.toString() || '-',
              row.getCell(2).value?.toString() || '-',
              ahsName,
              row.getCell(4).value?.toString() || '-',
              userId,
            ]
          );
          importedCount++;
        } catch (rowErr) {
          console.warn(`Row ${i} skip:`, rowErr.message);
          skippedCount++;
        }
      }

      res.json({
        success: true,
        message: `Berhasil import ${importedCount} AHS${skippedCount > 0 ? `, ${skippedCount} dilewati` : ''}`,
      });
    } catch (err) {
      console.error('Import AHS error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
