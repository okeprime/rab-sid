// public/js/material_upah_renderer.js
// Material & Upah page — mengganti ipcRenderer dengan fetch() API

let currentMaterialId = null;
let sortOrder = { kode:'asc', name:'asc', unit:'asc', price:'asc', category:'asc', lokasi:'asc', sumber_data:'asc', created_at:'asc' };

// ── Helper API ─────────────────────────────────────────────────────────────────
async function api(url, options = {}) {
  url = 'https://rab-sid.up.railway.app' + url;
  const res = await fetch(url, {
    credentials: 'include', headers: {'Content-Type':'application/json'}, ...options });
  if (res.status === 401) { return null; }
  return res.json();
}

// ── Render tabel ───────────────────────────────────────────────────────────────
function renderMaterialTable(materials) {
  const tableBody = document.getElementById('materialTableBody');
  tableBody.innerHTML = '';
  materials.forEach((material) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${material.kode || '-'}</td>
      <td>${material.name}</td>
      <td>${material.unit}</td>
      <td>Rp ${(material.price || 0).toLocaleString()}</td>
      <td>${material.category || '-'}</td>
      <td>${material.lokasi || '-'}</td>
      <td>${material.sumber_data || '-'}</td>
      <td>${new Date(material.created_at).toLocaleDateString()}</td>
      <td>
        <button class="action-btn edit" onclick="editMaterial(${material.id})">Edit</button>
        <button class="action-btn delete" onclick="deleteMaterial(${material.id})">Hapus</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
  document.getElementById('materialCount').textContent = materials.length;
}

// ── Load data ──────────────────────────────────────────────────────────────────
async function loadMaterials() {
  const data = await api('/api/materials');
  if (data) renderMaterialTable(data);
}

async function loadSuggestions() {
  const data = await api('/api/materials/suggestions');
  if (!data) return;
  const fill = (id, items) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = items.map(v => `<option value="${v}">`).join('');
  };
  fill('materialNamesList', data.names || []);
  fill('materialUnitsList', data.units || []);
  fill('materialLokasiList', data.lokasi || []);
  fill('materialSumberDataList', data.sumber_data || []);
}

// ── Sort ───────────────────────────────────────────────────────────────────────
async function sortTable(column) {
  const direction = sortOrder[column] === 'asc' ? 'desc' : 'asc';
  sortOrder[column] = direction;
  const data = await api(`/api/materials/sort?col=${column}&dir=${direction}`);
  if (data) renderMaterialTable(data);
}

// ── Search ─────────────────────────────────────────────────────────────────────
function initializeSearchInput() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput && !searchInput.hasAttribute('data-has-handler')) {
    searchInput.addEventListener('input', async (e) => {
      const q = e.target.value.trim();
      const data = q === '' ? await api('/api/materials') : await api(`/api/materials/search?q=${encodeURIComponent(q)}`);
      if (data) renderMaterialTable(data);
    });
    searchInput.setAttribute('data-has-handler', 'true');
  }
}

// ── Tambah material ────────────────────────────────────────────────────────────
function addNewMaterial() {
  ['newKode','newName','newUnit','newPrice','newLokasi','newSumberData'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const cat = document.getElementById('newCategory'); if (cat) cat.value = 'Material';
  const modal = document.getElementById('addMaterialModal');
  if (modal) { modal.style.display = 'block'; document.getElementById('newKode')?.focus(); }
}

function closeAddModal() { const m = document.getElementById('addMaterialModal'); if (m) m.style.display = 'none'; }
function closeEditModal() { const m = document.getElementById('editMaterialModal'); if (m) m.style.display = 'none'; }

async function saveMaterial() {
  const kode = document.getElementById('newKode').value.trim();
  const name = document.getElementById('newName').value.trim();
  const unit = document.getElementById('newUnit').value.trim();
  const price = document.getElementById('newPrice').value;
  const category = document.getElementById('newCategory').value;
  const lokasi = document.getElementById('newLokasi').value.trim();
  const sumber_data = document.getElementById('newSumberData').value.trim();

  if (!name || !unit || !price) { alert('Nama, Satuan, dan Harga harus diisi!'); return; }

  const result = await api('/api/materials', {
    method: 'POST',
    body: JSON.stringify({ kode, name, unit, price: parseFloat(price), category, lokasi, sumber_data }),
  });
  if (result?.error) { alert('Error: ' + result.error); return; }
  closeAddModal();
  loadMaterials();
  loadSuggestions();
}

// ── Edit material ──────────────────────────────────────────────────────────────
async function editMaterial(id) {
  currentMaterialId = id;
  const material = await api(`/api/materials/${id}`);
  if (!material) return;
  document.getElementById('editKode').value = material.kode || '';
  document.getElementById('editName').value = material.name;
  document.getElementById('editUnit').value = material.unit;
  document.getElementById('editPrice').value = material.price;
  document.getElementById('editCategory').value = material.category || '';
  document.getElementById('editLokasi').value = material.lokasi || '';
  document.getElementById('editSumberData').value = material.sumber_data || '';
  document.getElementById('editMaterialModal').style.display = 'block';
}

async function updateMaterial() {
  const kode = document.getElementById('editKode').value.trim();
  const name = document.getElementById('editName').value.trim();
  const unit = document.getElementById('editUnit').value.trim();
  const price = document.getElementById('editPrice').value;
  const category = document.getElementById('editCategory').value;
  const lokasi = document.getElementById('editLokasi').value.trim();
  const sumber_data = document.getElementById('editSumberData').value.trim();

  if (!name || !unit || !price) { alert('Nama, Satuan, dan Harga harus diisi!'); return; }

  const result = await api(`/api/materials/${currentMaterialId}`, {
    method: 'PUT',
    body: JSON.stringify({ kode, name, unit, price: parseFloat(price), category, lokasi, sumber_data }),
  });
  if (result?.error) { alert('Error: ' + result.error); return; }
  closeEditModal();
  loadMaterials();
  loadSuggestions();
  alert('Material berhasil diperbarui');
}

// ── Hapus ──────────────────────────────────────────────────────────────────────
async function deleteMaterial(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus item ini?')) return;
  const result = await api(`/api/materials/${id}`, { method: 'DELETE' });
  if (result?.error) { alert('Error: ' + result.error); return; }
  loadMaterials();
}

async function deleteAllMaterials() {
  if (!confirm('PERHATIAN: Semua data material akan dihapus. Anda yakin?')) return;
  const result = await api('/api/materials', { method: 'DELETE' });
  if (result?.error) { alert('Error: ' + result.error); return; }
  alert('Semua material berhasil dihapus');
  loadMaterials();
}

// ── Export / Import ────────────────────────────────────────────────────────────
function exportData() {
  window.open(`https://rab-sid.up.railway.app/api/export/materials`, '_blank');
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xls';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`https://rab-sid.up.railway.app/api/export/import-materials`, { method: 'POST', body: formData });
    const result = await res.json();
    alert(result.message || (result.error ? 'Error: ' + result.error : 'Import selesai'));
    loadMaterials();
  };
  input.click();
}

// ── Logout ─────────────────────────────────────────────────────────────────────
function logout() {
  fetch(`https://rab-sid.up.railway.app/api/auth/logout`, { method: 'POST' }).finally(() => {});
}

function goBack() {
  window.location.href = 'index.html';
}

// ── Modal close on outside click ───────────────────────────────────────────────
window.onclick = function(event) {
  const addModal = document.getElementById('addMaterialModal');
  const editModal = document.getElementById('editMaterialModal');
  if (event.target === addModal) closeAddModal();
  if (event.target === editModal) closeEditModal();
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.tagName.toLowerCase() !== 'textarea') e.preventDefault();
});

// ── Init ───────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadMaterials();
  loadSuggestions();
  initializeSearchInput();
});
