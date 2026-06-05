// public/js/daftar_ahs_renderer.js
// Daftar AHS page — mengganti ipcRenderer dengan fetch() API

let sortOrderAHS = { kelompok:'asc', kode_ahs:'asc', ahs:'asc', satuan:'asc', created_at:'asc' };

async function api(url, options = {}) {
  url = 'https://rab-sid.up.railway.app' + url;
  const res = await fetch(url, {
    credentials: 'include', headers: {'Content-Type':'application/json'}, ...options });
  if (res.status === 401) { return null; }
  return res.json();
}

function renderAHSTable(ahsList) {
  const tableBody = document.getElementById('ahsTableBody');
  if (!tableBody) return;
  tableBody.innerHTML = '';
  ahsList.forEach((ahs) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${ahs.kelompok}</td>
      <td>${ahs.kode_ahs}</td>
      <td>${ahs.ahs}</td>
      <td>${ahs.satuan}</td>
      <td>${new Date(ahs.created_at).toLocaleDateString()}</td>
      <td>
        <button class="action-btn edit" onclick="editAHS(${ahs.id})">Edit</button>
        <button class="action-btn delete" onclick="deleteAHS(${ahs.id})">Hapus</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
  const count = document.getElementById('ahsCount');
  if (count) count.textContent = ahsList.length;
}

async function loadAHS() {
  const data = await api('/api/ahs');
  if (data) renderAHSTable(data);
}

async function loadAHSSuggestions() {
  const data = await api('/api/ahs/suggestions');
  if (!data) return;
  const namesList = document.getElementById('ahsNamesList');
  const unitsList = document.getElementById('ahsUnitsList');
  if (namesList) namesList.innerHTML = data.names.map(n => `<option value="${n}">`).join('');
  if (unitsList) unitsList.innerHTML = data.units.map(u => `<option value="${u}">`).join('');
}

async function sortAHSTable(column) {
  const direction = sortOrderAHS[column] === 'asc' ? 'desc' : 'asc';
  sortOrderAHS[column] = direction;
  const data = await api(`/api/ahs/sort?col=${column}&dir=${direction}`);
  if (data) renderAHSTable(data);
}

function initSearchAHS() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput && !searchInput.hasAttribute('data-has-handler')) {
    searchInput.addEventListener('input', async (e) => {
      const q = e.target.value.trim();
      const data = q === '' ? await api('/api/ahs') : await api(`/api/ahs/search?q=${encodeURIComponent(q)}`);
      if (data) renderAHSTable(data);
    });
    searchInput.setAttribute('data-has-handler', 'true');
  }
}

// Modal functions
function addNewAhs() {
  ['newKelompok','newKodeAhs','newAhs','newSatuan'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const modal = document.getElementById('addAhsModal');
  if (modal) { modal.style.display = 'block'; document.getElementById('newKelompok')?.focus(); }
}
function closeAhsModal() { const m = document.getElementById('addAhsModal'); if (m) m.style.display = 'none'; }
function closeEditAhsModal() { const m = document.getElementById('editAhsModal'); if (m) m.style.display = 'none'; }

function toggleManualInput(type) {
  const select = document.getElementById(`${type}Kelompok`);
  const manualInput = document.getElementById(`${type}ManualInput`);
  if (select && manualInput) {
    if (select.value === 'manual') {
      manualInput.style.display = 'block';
      document.getElementById(`${type}KelompokManual`)?.focus();
    } else {
      manualInput.style.display = 'none';
      const manualEl = document.getElementById(`${type}KelompokManual`);
      if (manualEl) manualEl.value = '';
    }
  }
}

async function saveAhs() {
  let kelompok = document.getElementById('newKelompok').value;
  if (kelompok === 'manual') kelompok = document.getElementById('newKelompokManual').value;
  kelompok = kelompok.trim();

  const kode_ahs = document.getElementById('newKodeAhs').value.trim();
  const ahs = document.getElementById('newAhs').value.trim();
  const satuan = document.getElementById('newSatuan').value.trim();
  if (!kelompok || !kode_ahs || !ahs || !satuan) { alert('Semua field wajib diisi!'); return; }

  const result = await api('/api/ahs', { method:'POST', body: JSON.stringify({ kelompok, kode_ahs, ahs, satuan }) });
  if (result?.error) { alert('Error: ' + result.error); return; }
  closeAhsModal();
  loadAHS();
  loadAHSSuggestions();
}

let currentAHSId = null;
async function editAHS(id) {
  currentAHSId = id;
  const data = await api(`/api/ahs/${id}`);
  if (!data) return;
  document.getElementById('editKelompok').value = data.kelompok;
  document.getElementById('editKodeAhs').value = data.kode_ahs;
  document.getElementById('editAhs').value = data.ahs;
  document.getElementById('editSatuan').value = data.satuan;
  document.getElementById('editAhsModal').style.display = 'block';
}

async function updateAhs() {
  let kelompok = document.getElementById('editKelompok').value;
  if (kelompok === 'manual') kelompok = document.getElementById('editKelompokManual').value;
  kelompok = kelompok.trim();

  const kode_ahs = document.getElementById('editKodeAhs').value.trim();
  const ahs = document.getElementById('editAhs').value.trim();
  const satuan = document.getElementById('editSatuan').value.trim();
  if (!kelompok || !kode_ahs || !ahs || !satuan) { alert('Semua field wajib diisi!'); return; }

  const result = await api(`/api/ahs/${currentAHSId}`, { method:'PUT', body: JSON.stringify({ kelompok, kode_ahs, ahs, satuan }) });
  if (result?.error) { alert('Error: ' + result.error); return; }
  closeEditAhsModal();
  loadAHS();
}

async function deleteAHS(id) {
  if (!confirm('Hapus AHS ini?')) return;
  const result = await api(`/api/ahs/${id}`, { method:'DELETE' });
  if (result?.error) { alert('Error: ' + result.error); return; }
  loadAHS();
}

async function deleteAllAhs() {
  if (!confirm('Hapus semua AHS? Data rincian AHS juga akan dihapus.')) return;
  const result = await api('/api/ahs', { method:'DELETE' });
  if (result?.error) { alert('Error: ' + result.error); return; }
  alert('Semua AHS berhasil dihapus');
  loadAHS();
}

function exportData() { window.open(`https://rab-sid.up.railway.app/api/export/ahs`, '_blank'); }

function importData() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.xlsx,.xls';
  input.onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const formData = new FormData(); formData.append('file', file);
    const res = await fetch(`https://rab-sid.up.railway.app/api/export/import-ahs`, { method:'POST', body: formData });
    const result = await res.json();
    alert(result.message || (result.error ? 'Error: ' + result.error : 'Import selesai'));
    loadAHS();
  };
  input.click();
}

function logout() {
  fetch(`https://rab-sid.up.railway.app/api/auth/logout`, { method: 'POST' }).finally(() => {});
}

function goBack() {
  window.location.href = 'index.html';
}

window.onclick = function(event) {
  const addModal = document.getElementById('addAhsModal');
  const editModal = document.getElementById('editAhsModal');
  if (event.target === addModal) closeAhsModal();
  if (event.target === editModal) closeEditAhsModal();
};

document.addEventListener('DOMContentLoaded', () => {
  loadAHS();
  loadAHSSuggestions();
  initSearchAHS();
});

// === GLOBAL SCOPE EXPORTS ===
window.addNewAhs = addNewAhs;
window.closeAhsModal = closeAhsModal;
window.closeEditAhsModal = closeEditAhsModal;
window.saveAhs = saveAhs;
window.editAHS = editAHS;
window.updateAhs = updateAhs;
window.deleteAHS = deleteAHS;
window.deleteAllAhs = deleteAllAhs;
window.exportData = exportData;
window.importData = importData;
window.logout = logout;
window.goBack = goBack;
window.toggleManualInput = toggleManualInput;
window.sortTable = sortAHSTable;
