// public/js/rincian_ahs_renderer.js
// Rincian AHS page — fetch() API version | Zero-Bug Reactive Calculation

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format angka ke Rupiah tanpa simbol, e.g. 1234567 → "1.234.567"
 */
function formatRupiah(value) {
  const num = parseFloat(value) || 0;
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

/**
 * Parse teks Rupiah kembali ke angka float.
 * Menangani format "Rp 1.234.567" dan "1.234.567" → 1234567
 */
function parseRupiah(text) {
  if (!text) return 0;
  // Hapus "Rp" dan spasi, lalu ganti titik ribuan → kosong, koma desimal → titik
  const cleaned = String(text).replace(/Rp\s?/gi, '').replace(/\./g, '').replace(/,/g, '.');
  return parseFloat(cleaned) || 0;
}

/**
 * Parse angka dari input (bisa pakai koma atau titik sebagai desimal)
 */
function parseNum(value) {
  if (value === null || value === undefined || value === '') return 0;
  return parseFloat(String(value).replace(',', '.')) || 0;
}

async function api(url, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const res = await fetch(url, { headers, ...options });
  if (res.status === 401) { window.location.href = '/login.html'; return null; }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────────────────
let selectedMaterialId = null;
let selectedAhsId = null;
let importInProgress = false;

// Menyimpan raw totals agar tidak perlu parse dari DOM string
let _rawTotals = { bahan: 0, upah: 0, alat: 0 };

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initializeMaterialTable();
  resetToDefaults();

  document.getElementById('profit-select')?.addEventListener('change', () => calculateTotals());
  document.getElementById('ppn-select')?.addEventListener('change', () => calculateTotals());
});

// ─────────────────────────────────────────────────────────────────────────────
// CORE REACTIVE CALCULATION
// calculateTotals() adalah fungsi tunggal yang mengatur semua hitungan.
// Dipanggil setiap kali: koefisien berubah, row ditambah/hapus, dropdown berubah.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loop seluruh baris tabel → hitung subtotal per kategori →
 * update progress bar → hitung Profit + PPN → render Total Akhir
 */
function calculateTotals() {
  const rows = document.querySelectorAll('#materialDetails tr');

  // Reset akumulator
  let totals = { bahan: 0, upah: 0, alat: 0 };

  rows.forEach((row) => {
    // Baca harga satuan dari dataset (ANGKA, bukan string Rupiah)
    const price = parseNum(row.dataset.materialPrice || 0);
    // Baca koefisien dari input field
    const inputEl = row.querySelector('input');
    const koefisien = parseNum(inputEl ? inputEl.value : 0);
    const lineTotal = price * koefisien;

    // Update cell total per-baris secara akurat
    const totalCell = row.cells[8];
    if (totalCell) totalCell.textContent = `Rp ${formatRupiah(lineTotal)}`;

    // Kategorisasi berdasarkan kolom pertama
    const category = (row.cells[0]?.textContent || '').toLowerCase().trim();
    if (category.includes('upah') || category.includes('tenaga')) {
      totals.upah += lineTotal;
    } else if (category.includes('alat') || category.includes('equipment')) {
      totals.alat += lineTotal;
    } else {
      // Default: Bahan/Material
      totals.bahan += lineTotal;
    }
  });

  // Simpan ke state agar tidak perlu parse DOM nantinya
  _rawTotals = totals;

  const grandBase = totals.bahan + totals.upah + totals.alat;

  // ── Update Progress Bar ──
  const chartEl = document.getElementById('cost-chart');
  if (chartEl) chartEl.style.display = rows.length > 0 ? 'block' : 'none';

  ['bahan', 'upah', 'alat'].forEach((type) => {
    const val = totals[type];
    const pct = grandBase > 0 ? ((val / grandBase) * 100).toFixed(1) : '0.0';

    const bar = document.getElementById(`${type}-bar`);
    const valEl = document.getElementById(`${type}-value`);

    if (bar) {
      bar.style.width = pct + '%';
      const pctEl = bar.querySelector('.percentage');
      if (pctEl) pctEl.textContent = pct + '%';
    }
    if (valEl) valEl.textContent = formatRupiah(val);
  });

  // Update total bar (selalu 100%)
  const totalBar = document.getElementById('total-bar');
  if (totalBar) {
    totalBar.style.width = '100%';
    const pctEl = totalBar.querySelector('.percentage');
    if (pctEl) pctEl.textContent = '100%';
  }
  const totalValueEl = document.getElementById('total-value');
  if (totalValueEl) totalValueEl.textContent = formatRupiah(grandBase);

  // ── Kalkulasi Profit & PPN ──
  const profitPct = parseNum(document.getElementById('profit-select')?.value || 0);
  const ppnPct = parseNum(document.getElementById('ppn-select')?.value || 0);

  const profitAmount = grandBase * (profitPct / 100);
  const baseAfterProfit = grandBase + profitAmount;
  const ppnAmount = baseAfterProfit * (ppnPct / 100);
  const grandTotal = baseAfterProfit + ppnAmount;

  const profitEl = document.getElementById('profit-value');
  const ppnEl = document.getElementById('ppn-value');
  const grandEl = document.getElementById('grand-total-value');
  if (profitEl) profitEl.textContent = formatRupiah(profitAmount);
  if (ppnEl) ppnEl.textContent = formatRupiah(ppnAmount);
  if (grandEl) grandEl.textContent = formatRupiah(grandTotal);
}

// ─────────────────────────────────────────────────────────────────────────────
// RESET
// ─────────────────────────────────────────────────────────────────────────────
function resetToDefaults() {
  document.getElementById('profit-select') && (document.getElementById('profit-select').value = '0');
  document.getElementById('ppn-select') && (document.getElementById('ppn-select').value = '0');
  _rawTotals = { bahan: 0, upah: 0, alat: 0 };
  calculateTotals();
}

// ─────────────────────────────────────────────────────────────────────────────
// AHS MODAL
// ─────────────────────────────────────────────────────────────────────────────
function openAhsModal() {
  const modal = document.getElementById('searchAhsModal');
  if (modal) { modal.style.display = 'block'; loadAhs(); }
}
function closeSearchAhsModal() {
  const modal = document.getElementById('searchAhsModal');
  if (modal) modal.style.display = 'none';
}

async function loadAhs() {
  const data = await api('/api/ahs');
  if (!data) return;
  renderAhsSearchResults(data, '');
}

function renderAhsSearchResults(ahsList, searchTerm) {
  const q = searchTerm.toLowerCase();
  const filtered = q
    ? ahsList.filter(a => a.kelompok.toLowerCase().includes(q) || a.ahs.toLowerCase().includes(q))
    : ahsList;
  const tableBody = document.getElementById('ahsSearchResults');
  if (!tableBody) return;
  tableBody.innerHTML = '';
  tableBody._allAhs = ahsList;
  filtered.forEach((item) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.kelompok}</td>
      <td>${item.kode_ahs}</td>
      <td>${item.ahs}</td>
      <td>${item.satuan}</td>
      <td><button class="action-btn" onclick="selectAhs(${item.id})" style="background-color:var(--success)">Pilih</button></td>
    `;
    tableBody.appendChild(row);
  });
}

async function searchAhs() {
  const searchInput = document.getElementById('searchAhsInput')?.value.trim().toLowerCase() || '';
  const tableBody = document.getElementById('ahsSearchResults');
  if (tableBody?._allAhs) {
    renderAhsSearchResults(tableBody._allAhs, searchInput);
  } else {
    const data = await api(`/api/ahs/search?q=${encodeURIComponent(searchInput)}`);
    if (data) renderAhsSearchResults(data, '');
  }
}

async function selectAhs(id) {
  selectedAhsId = id;
  resetToDefaults();
  closeSearchAhsModal();

  // Kosongkan tabel dulu
  const tableBody = document.getElementById('materialDetails');
  if (tableBody) tableBody.innerHTML = '';

  // Load info AHS
  const ahs = await api(`/api/ahs/${id}`);
  if (ahs) {
    document.getElementById('kelompok-pekerjaan').value = ahs.kelompok || '';
    document.getElementById('satuan').value = ahs.satuan || '';
    document.getElementById('analisa-nama').value = ahs.ahs || '';
  }

  // Load tax-profit yang tersimpan di DB
  const taxData = await api(`/api/pricing/tax-profit?ahs_id=${id}`);
  if (taxData?.success && taxData.data?.length > 0) {
    const d = taxData.data[0];
    const profitSelect = document.getElementById('profit-select');
    const ppnSelect = document.getElementById('ppn-select');
    if (profitSelect && d.profit_percentage != null) profitSelect.value = String(d.profit_percentage);
    if (ppnSelect && d.ppn_percentage != null) ppnSelect.value = String(d.ppn_percentage);
  }

  // Load pricing (komponen AHS)
  await loadPricing(id);
}

// ─────────────────────────────────────────────────────────────────────────────
// LOAD & RENDER PRICING (Komponen AHS)
// ─────────────────────────────────────────────────────────────────────────────
async function loadPricing(ahsId) {
  const data = await api(`/api/pricing?ahs_id=${ahsId}`);
  if (data) displayPricingData(data);
}

function displayPricingData(pricingData) {
  const tableBody = document.getElementById('materialDetails');
  if (!tableBody) return;

  tableBody.innerHTML = '';

  pricingData.forEach((item) => {
    const price = parseNum(item.price || 0);
    const koefisien = parseNum(item.koefisien || 0);
    const total = price * koefisien;

    const row = document.createElement('tr');
    // Simpan data numerik di dataset, BUKAN string terformat, agar calculateTotals() tidak salah parse
    row.dataset.pricingId = item.id;
    row.dataset.materialId = item.material_id;
    row.dataset.materialPrice = price; // angka murni

    row.innerHTML = `
      <td>${item.category || 'Bahan'}</td>
      <td>${item.kode || '-'}</td>
      <td>${item.name}</td>
      <td>${item.unit}</td>
      <td><input type="text" inputmode="decimal" value="${koefisien}" style="width:90px;padding:6px;border:1px solid #ddd;border-radius:4px;"></td>
      <td>Rp ${formatRupiah(price)}</td>
      <td>${item.lokasi || '-'}</td>
      <td>${item.sumber_data || '-'}</td>
      <td>Rp ${formatRupiah(total)}</td>
    `;

    // ── Event Listener Koefisien ──
    // Gunakan KEDUA 'input' (real-time) dan 'change' (commit) untuk pengalaman terbaik
    const inputEl = row.querySelector('input');
    if (inputEl) {
      // Real-time: update visual saja (cepat)
      inputEl.addEventListener('input', () => calculateTotals());
      // On blur/change: simpan ke DB
      inputEl.addEventListener('change', () => updateKoefisien(inputEl));
    }

    tableBody.appendChild(row);
  });

  // Tampilkan chart
  const chartEl = document.getElementById('cost-chart');
  if (chartEl) chartEl.style.display = pricingData.length > 0 ? 'block' : 'none';

  // Hitung ulang semua total setelah data dimuat
  calculateTotals();
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE KOEFISIEN (Simpan ke DB)
// ─────────────────────────────────────────────────────────────────────────────
async function updateKoefisien(inputEl) {
  const row = inputEl.closest('tr');
  if (!row) return;
  const pricingId = row.dataset.pricingId;
  if (!pricingId) return; // Row baru yang belum tersimpan ke DB, skip

  const newKoefisien = parseNum(inputEl.value);
  // Validasi: tidak boleh negatif
  if (newKoefisien < 0) { alert('Koefisien tidak boleh negatif'); inputEl.value = 0; calculateTotals(); return; }

  await api(`/api/pricing/${pricingId}`, {
    method: 'PUT',
    body: JSON.stringify({ koefisien: newKoefisien, ahs_id: selectedAhsId }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMPAN TOTAL AKHIR (Profit + PPN ke DB)
// ─────────────────────────────────────────────────────────────────────────────
async function saveTotalAfterTaxProfit() {
  if (!selectedAhsId) { alert('Pilih AHS terlebih dahulu'); return; }

  const grandTotalText = document.getElementById('grand-total-value')?.textContent || '0';
  const profitSelect = document.getElementById('profit-select');
  const ppnSelect = document.getElementById('ppn-select');
  if (!profitSelect || !ppnSelect) return;

  // Gunakan parseRupiah karena textContent berformat "1.234.567"
  const grandTotal = parseRupiah(grandTotalText);
  const profitPct = parseNum(profitSelect.value);
  const ppnPct = parseNum(ppnSelect.value);

  const result = await api('/api/pricing/tax-profit', {
    method: 'PUT',
    body: JSON.stringify({
      ahs_id: selectedAhsId,
      ppn_percentage: ppnPct,
      profit_percentage: profitPct,
      total_after_tax_profit: grandTotal,
    }),
  });
  if (result?.success) alert('Total berhasil disimpan!');
  else alert('Gagal menyimpan: ' + (result?.error || 'Unknown error'));
}

// ─────────────────────────────────────────────────────────────────────────────
// TAMBAH MATERIAL / UPAH / ALAT
// ─────────────────────────────────────────────────────────────────────────────
function addBahanUpah() {
  if (!selectedAhsId) { alert('Pilih AHS terlebih dahulu'); return; }
  const modal = document.getElementById('searchMaterialModal');
  if (modal) { modal.style.display = 'block'; loadMaterialsForPricing(); }
}
function closeSearchMaterialModal() {
  const modal = document.getElementById('searchMaterialModal');
  if (modal) modal.style.display = 'none';
}

async function loadMaterialsForPricing() {
  const data = await api('/api/materials');
  if (!data) return;
  renderMaterialSearch(data, '');
}

function renderMaterialSearch(materials, searchTerm) {
  const q = searchTerm.toLowerCase();
  const filtered = q
    ? materials.filter(m => m.name.toLowerCase().includes(q) || (m.category || '').toLowerCase().includes(q))
    : materials;
  const tableBody = document.getElementById('materialSearchResults');
  if (!tableBody) return;
  tableBody.innerHTML = '';
  tableBody._allMaterials = materials;
  filtered.forEach((material) => {
    const row = document.createElement('tr');
    // Encode nama untuk onclick
    const safeName = (material.name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const safeLokasi = (material.lokasi || '').replace(/'/g, "\\'");
    const safeSumber = (material.sumber_data || '').replace(/'/g, "\\'");
    const safeKategori = (material.category || 'Bahan').replace(/'/g, "\\'");
    row.innerHTML = `
      <td>${material.kode || '-'}</td>
      <td>${material.name}</td>
      <td>${material.unit}</td>
      <td>Rp ${formatRupiah(material.price)}</td>
      <td>${material.category || '-'}</td>
      <td>${material.lokasi || '-'}</td>
      <td>${material.sumber_data || '-'}</td>
      <td><button class="action-btn" onclick="selectMaterial(${material.id},'${material.kode || ''}','${safeName}',${parseNum(material.price)},'${material.unit}','${safeLokasi}','${safeSumber}','${safeKategori}')" style="background-color:var(--success)">Pilih</button></td>
    `;
    tableBody.appendChild(row);
  });
}

async function searchMaterial() {
  const q = document.getElementById('searchMaterialInput')?.value.trim() || '';
  const tableBody = document.getElementById('materialSearchResults');
  if (tableBody?._allMaterials) {
    renderMaterialSearch(tableBody._allMaterials, q);
  } else {
    const data = await api(`/api/materials?q=${encodeURIComponent(q)}`);
    if (data) renderMaterialSearch(data, '');
  }
}

async function selectMaterial(id, kode, name, price, unit, lokasi, sumber_data, category) {
  selectedMaterialId = id;
  const koefisien = 1;
  const normalizedPrice = parseNum(price);
  const total = normalizedPrice * koefisien;

  const tableBody = document.getElementById('materialDetails');
  if (!tableBody) return;

  const row = document.createElement('tr');
  row.dataset.materialId = id;
  row.dataset.materialPrice = normalizedPrice; // angka murni

  row.innerHTML = `
    <td>${category || 'Bahan'}</td>
    <td>${kode || '-'}</td>
    <td>${name}</td>
    <td>${unit}</td>
    <td><input type="text" inputmode="decimal" value="${koefisien}" style="width:90px;padding:6px;border:1px solid #ddd;border-radius:4px;"></td>
    <td>Rp ${formatRupiah(normalizedPrice)}</td>
    <td>${lokasi || '-'}</td>
    <td>${sumber_data || '-'}</td>
    <td>Rp ${formatRupiah(total)}</td>
  `;

  // Pasang event listener (sama seperti displayPricingData)
  const inputEl = row.querySelector('input');
  if (inputEl) {
    inputEl.addEventListener('input', () => calculateTotals());
    inputEl.addEventListener('change', () => updateKoefisien(inputEl));
  }

  tableBody.appendChild(row);
  closeSearchMaterialModal();

  // Update chart secara real-time
  const chartEl = document.getElementById('cost-chart');
  if (chartEl) chartEl.style.display = 'block';

  // Simpan ke DB, lalu reload agar row mendapat pricingId dari DB
  const result = await api('/api/pricing', {
    method: 'POST',
    body: JSON.stringify({ ahs_id: selectedAhsId, material_id: id, quantity: koefisien, koefisien }),
  });
  if (result?.error) { alert('Error simpan ke DB: ' + result.error); }

  // Reload dari DB agar pricingId terisi benar
  await loadPricing(selectedAhsId);
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLE ROW SELECTION
// ─────────────────────────────────────────────────────────────────────────────
function initializeMaterialTable() {
  const materialTable = document.getElementById('materialDetails');
  if (!materialTable) return;
  materialTable.addEventListener('click', (e) => {
    const row = e.target.closest('tr');
    if (!row || e.target.tagName === 'INPUT') return; // Jangan deselect saat klik input
    document.querySelectorAll('#materialDetails tr').forEach(r => r.classList.remove('selected'));
    row.classList.add('selected');
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HAPUS MATERIAL (Satu baris)
// ─────────────────────────────────────────────────────────────────────────────
async function deleteMaterial() {
  const selectedRow = document.querySelector('#materialDetails tr.selected');
  if (!selectedRow) { alert('Silakan pilih bahan/upah yang akan dihapus'); return; }
  const pricingId = selectedRow.dataset.pricingId;

  selectedRow.remove();
  calculateTotals(); // Hitung ulang setelah hapus

  if (pricingId) {
    const result = await api(`/api/pricing/${pricingId}`, { method: 'DELETE' });
    if (result?.error) alert('Gagal menghapus dari DB: ' + result.error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EDIT KOEFISIEN (Fokus ke input field)
// ─────────────────────────────────────────────────────────────────────────────
function editKoefisien() {
  const selectedRow = document.querySelector('#materialDetails tr.selected');
  if (!selectedRow) { alert('Silakan pilih bahan/upah yang akan diedit'); return; }
  selectedRow.querySelector('input')?.focus();
}

// ─────────────────────────────────────────────────────────────────────────────
// HAPUS SEMUA PRICING
// ─────────────────────────────────────────────────────────────────────────────
async function deleteAllPricing() {
  if (!selectedAhsId) { alert('Silakan pilih AHS terlebih dahulu'); return; }
  if (!confirm('Anda yakin ingin menghapus semua komponen AHS ini?')) return;

  await api(`/api/pricing/all?ahs_id=${selectedAhsId}`, { method: 'DELETE' });

  const tableBody = document.getElementById('materialDetails');
  if (tableBody) tableBody.innerHTML = '';

  const chartEl = document.getElementById('cost-chart');
  if (chartEl) chartEl.style.display = 'none';

  calculateTotals();
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT EXCEL
// ─────────────────────────────────────────────────────────────────────────────
function exportToExcel() {
  if (!selectedAhsId) { alert('Pilih AHS terlebih dahulu'); return; }
  window.open(`/api/export/ahs-rincian?ahs_id=${selectedAhsId}`, '_blank');
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPORT EXCEL (Modal)
// ─────────────────────────────────────────────────────────────────────────────
function openImportModal() {
  const modal = document.getElementById('importExcelModal');
  if (modal) {
    modal.style.display = 'block';
    document.getElementById('importProgress').style.display = 'none';
    document.getElementById('importResults').style.display = 'none';
  }
}
function closeImportModal() {
  if (importInProgress && !confirm('Import sedang berlangsung. Batalkan?')) return;
  const modal = document.getElementById('importExcelModal');
  if (modal) modal.style.display = 'none';
  importInProgress = false;
}
async function startImport() {
  if (importInProgress) return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xls';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importInProgress = true;
    const progressBar = document.getElementById('importProgressBar');
    const importProgress = document.getElementById('importProgress');
    const importResults = document.getElementById('importResults');
    if (importProgress) importProgress.style.display = 'block';
    if (progressBar) progressBar.style.width = '30%';

    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/export/import-ahs', { method: 'POST', body: formData });
    const result = await res.json();

    if (progressBar) progressBar.style.width = '100%';
    if (importResults) importResults.style.display = 'block';
    const summary = document.getElementById('importSummary');
    if (summary) summary.innerHTML = `<p>${result.message || (result.error ? 'Error: ' + result.error : 'Import selesai')}</p>`;
    importInProgress = false;

    // Refresh tabel jika ada AHS yang dipilih
    if (selectedAhsId) await loadPricing(selectedAhsId);
  };
  input.click();
}

// ─────────────────────────────────────────────────────────────────────────────
// MISC
// ─────────────────────────────────────────────────────────────────────────────
function logout() {
  fetch('/api/auth/logout', { method: 'POST' }).finally(() => { window.location.href = '/login.html'; });
}
function goBack() { window.location.href = 'index.html'; }

// Styling row yang dipilih
const styleEl = document.createElement('style');
styleEl.textContent = `
  #materialDetails tr.selected { background-color: #e0e7ff !important; }
  #materialDetails tr:hover { cursor: pointer; }
  #materialDetails input:focus { outline: 2px solid var(--primary, #1a4f7c); border-radius: 4px; }
`;
document.head.appendChild(styleEl);
