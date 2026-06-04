// public/js/bq_renderer.js
// BQ (Bill of Quantity) page — mengganti ipcRenderer dengan fetch() API

let selectedAHSId = null;
let selectedAHSData = null;
let editingItemId = null;
let selectedSubprojectId = null;

// ── Helper ────────────────────────────────────────────────────────────────────
async function api(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (res.status === 401) { window.location.href = '/login.html'; return null; }
  return res.json();
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadSubprojects();
});

// ── Subproject: Load & Render ─────────────────────────────────────────────────
async function loadSubprojects() {
  const [subprojects, bqItems] = await Promise.all([
    api('/api/subprojects'),
    api('/api/subprojects/bq-grouped'),
  ]);
  if (!subprojects) return;

  const container = document.querySelector('.container');
  if (!container) return;
  container.innerHTML = `
    <div class="button-container">
      <button class="btn btn-primary" onclick="openSubprojectModal()">
        <span>+</span> Tambah Subproyek
      </button>
    </div>
    <div id="subprojectsContainer"></div>
  `;

  const subprojectsContainer = document.getElementById('subprojectsContainer');

  // Group bq items by subproject_id
  const groupedItems = {};
  if (bqItems) {
    bqItems.forEach((item) => {
      if (item.subproject_id) {
        if (!groupedItems[item.subproject_id]) {
          groupedItems[item.subproject_id] = { name: item.subproject_name, items: [] };
        }
        if (item.id) groupedItems[item.subproject_id].items.push(item);
      }
    });
  }

  subprojects.forEach((subproject) => {
    const subprojectItems = groupedItems[subproject.id] || { items: [] };
    const section = document.createElement('div');
    section.className = 'subproject-section';
    const rowsHTML = subprojectItems.items.map(item => `
      <tr>
        <td>${item.kode_ahs || '-'}</td>
        <td>${item.ahs || '-'}</td>
        <td>${(item.volume || 0).toFixed(2)}</td>
        <td>${item.satuan || 'm³'}</td>
        <td>Rp ${item.total_price ? item.total_price.toLocaleString() : '-'}</td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-primary btn-small" onclick="editBQItem(${JSON.stringify(item).replace(/"/g, '&quot;')})">Edit</button>
            <button class="btn btn-danger btn-small" onclick="deleteBQItem(${item.id})">Hapus</button>
          </div>
        </td>
      </tr>
    `).join('');

    section.innerHTML = `
      <div class="subproject-header">
        <h2>${subproject.name}</h2>
        <div class="subproject-actions">
          <button class="btn btn-primary" onclick="openAHSModal(${subproject.id})">
            <span>+</span> Tambah AHS
          </button>
          <button class="btn btn-warning" onclick="editSubproject(${subproject.id}, '${subproject.name}')">Edit</button>
          <button class="btn btn-danger" onclick="deleteSubproject(${subproject.id})">Hapus</button>
        </div>
      </div>
      <table class="results-table">
        <thead>
          <tr>
            <th>Kode AHS</th><th>AHS</th><th>Volume</th><th>Satuan</th><th>Total Harga</th><th>Aksi</th>
          </tr>
        </thead>
        <tbody>${rowsHTML}</tbody>
      </table>
    `;
    subprojectsContainer.appendChild(section);
  });
}

// ── AHS Modal ─────────────────────────────────────────────────────────────────
async function openAHSModal(subprojectId) {
  selectedSubprojectId = subprojectId;
  const modal = document.getElementById('ahsModal');
  if (!modal) return;
  modal.style.display = 'block';
  setTimeout(() => modal.classList.add('active'), 10);

  const ahsItems = await api('/api/bq/ahs-with-pricing');
  const ahsList = document.getElementById('ahsList');
  if (!ahsList || !ahsItems) return;
  ahsList.innerHTML = '';
  ahsItems.forEach((ahs) => {
    const div = document.createElement('div');
    div.className = 'ahs-item';
    div.innerHTML = `
      <strong>${ahs.kode_ahs || '-'}</strong>
      <div>${ahs.ahs}</div>
      <div>Total: Rp ${(ahs.total_price || 0).toLocaleString()}</div>
    `;
    div.onclick = () => selectAHS(ahs);
    ahsList.appendChild(div);
  });
}

function closeAHSModal() {
  const modal = document.getElementById('ahsModal');
  if (!modal) return;
  modal.classList.remove('active');
  setTimeout(() => { modal.style.display = 'none'; }, 300);
}

function selectAHS(ahs) {
  selectedAHSId = ahs.id;
  selectedAHSData = ahs;
  closeAHSModal();

  const volumeModal = document.getElementById('volumeModal');
  if (!volumeModal) return;
  volumeModal.style.display = 'block';
  setTimeout(() => volumeModal.classList.add('active'), 10);
  document.getElementById('volumeInput').value = '';
  document.getElementById('satuanSelect').value = 'm3';
  const manualGroup = document.getElementById('manualSatuanGroup');
  if (manualGroup) manualGroup.style.display = 'none';
}

function closeVolumeModal() {
  const modal = document.getElementById('volumeModal');
  if (!modal) return;
  modal.classList.remove('active');
  setTimeout(() => { modal.style.display = 'none'; selectedAHSId = null; selectedAHSData = null; }, 300);
}

// ── Satuan change ─────────────────────────────────────────────────────────────
function handleSatuanChange() {
  const val = document.getElementById('satuanSelect')?.value;
  const manual = document.getElementById('manualSatuanGroup');
  if (manual) manual.style.display = val === 'manual' ? 'block' : 'none';
}

function handleEditSatuanChange() {
  const val = document.getElementById('editSatuanSelect')?.value;
  const manual = document.getElementById('editManualSatuanGroup');
  if (manual) manual.style.display = val === 'manual' ? 'block' : 'none';
}

// ── Save BQ Item ──────────────────────────────────────────────────────────────
async function saveVolumeAndSatuan() {
  if (!selectedAHSId || !selectedAHSData) { alert('Silakan pilih AHS terlebih dahulu'); return; }
  const rawVolume = document.getElementById('volumeInput')?.value || '';
  const volume = parseFloat(rawVolume.replace(',', '.'));
  if (!volume || isNaN(volume) || volume <= 0) { alert('Volume harus berupa angka lebih dari 0'); return; }

  let satuan = document.getElementById('satuanSelect')?.value;
  if (satuan === 'manual') {
    satuan = document.getElementById('manualSatuan')?.value.trim();
    if (!satuan) { alert('Silakan masukkan satuan manual'); return; }
  }

  const ahsPrice = parseFloat(selectedAHSData.total_price);
  if (isNaN(ahsPrice) || ahsPrice <= 0) { alert('AHS terpilih tidak memiliki data harga yang valid'); return; }

  const totalPrice = parseFloat((volume * ahsPrice).toFixed(2));
  const result = await api('/api/bq', {
    method: 'POST',
    body: JSON.stringify({ ahsId: selectedAHSId, subproject_id: selectedSubprojectId, volume, satuan, total_price: totalPrice }),
  });
  if (result?.error) { alert('Error: ' + result.error); return; }
  closeVolumeModal();
  loadSubprojects();
}

// ── Edit BQ Item ──────────────────────────────────────────────────────────────
function editBQItem(item) {
  editingItemId = item.id;
  document.getElementById('editVolume').value = item.volume;
  const editSelect = document.getElementById('editSatuanSelect');
  const editManual = document.getElementById('editManualSatuan');
  const editManualGroup = document.getElementById('editManualSatuanGroup');
  if (['m', 'm2', 'm3'].includes(item.satuan)) {
    editSelect.value = item.satuan;
    editManualGroup.style.display = 'none';
  } else {
    editSelect.value = 'manual';
    editManual.value = item.satuan;
    editManualGroup.style.display = 'block';
  }
  const editModal = document.getElementById('editModal');
  editModal.style.display = 'block';
  setTimeout(() => editModal.classList.add('active'), 10);
}

function closeEditModal() {
  const modal = document.getElementById('editModal');
  if (!modal) return;
  modal.classList.remove('active');
  setTimeout(() => { modal.style.display = 'none'; editingItemId = null; }, 300);
}

async function saveEditedData() {
  const rawVolume = document.getElementById('editVolume')?.value || '';
  const volume = parseFloat(rawVolume.replace(',', '.'));
  if (!volume || isNaN(volume) || volume <= 0) { alert('Volume harus berupa angka lebih dari 0'); return; }

  let satuan = document.getElementById('editSatuanSelect')?.value;
  if (satuan === 'manual') {
    satuan = document.getElementById('editManualSatuan')?.value.trim();
    if (!satuan) { alert('Silakan masukkan satuan manual'); return; }
  }
  const result = await api(`/api/bq/${editingItemId}`, {
    method: 'PUT',
    body: JSON.stringify({ volume, satuan }),
  });
  if (result?.error) { alert('Gagal menyimpan: ' + result.error); return; }
  closeEditModal();
  loadSubprojects();
}

// ── Delete BQ Item ─────────────────────────────────────────────────────────────
async function deleteBQItem(id) {
  if (!confirm('Yakin ingin menghapus item ini?')) return;
  const result = await api(`/api/bq/${id}`, { method: 'DELETE' });
  if (result?.error) { alert('Gagal menghapus: ' + result.error); return; }
  loadSubprojects();
}

// ── Subproject CRUD ───────────────────────────────────────────────────────────
function openSubprojectModal() {
  const modal = document.createElement('div');
  modal.className = 'modal'; modal.id = 'subprojectModal';
  modal.innerHTML = `
    <div class="modal-content">
      <button class="close-btn" onclick="closeSubprojectModal()">&times;</button>
      <h2>Tambah Subproyek</h2>
      <div class="form-group">
        <label for="subprojectName">Nama Subproyek:</label>
        <input type="text" id="subprojectName" placeholder="Masukkan nama subproyek">
      </div>
      <div class="modal-actions">
        <button class="btn" onclick="closeSubprojectModal()">Batal</button>
        <button class="btn btn-primary" onclick="saveSubproject()">Simpan</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.style.display = 'block';
  setTimeout(() => modal.classList.add('active'), 10);
}

function closeSubprojectModal() {
  const modal = document.getElementById('subprojectModal');
  if (!modal) return;
  modal.classList.remove('active');
  setTimeout(() => modal.remove(), 300);
}

async function saveSubproject() {
  const name = document.getElementById('subprojectName')?.value.trim();
  if (!name) { alert('Nama subproyek tidak boleh kosong'); return; }
  const result = await api('/api/subprojects', { method: 'POST', body: JSON.stringify({ name }) });
  if (result?.success) { closeSubprojectModal(); loadSubprojects(); }
  else alert(result?.error || 'Gagal menambahkan subproyek');
}

function editSubproject(id, name) {
  const modal = document.createElement('div');
  modal.className = 'modal'; modal.id = 'editSubprojectModal';
  modal.innerHTML = `
    <div class="modal-content">
      <button class="close-btn" onclick="closeEditSubprojectModal()">&times;</button>
      <h2>Edit Subproyek</h2>
      <div class="form-group">
        <label for="editSubprojectName">Nama Subproyek:</label>
        <input type="text" id="editSubprojectName" value="${name}">
      </div>
      <div class="modal-actions">
        <button class="btn" onclick="closeEditSubprojectModal()">Batal</button>
        <button class="btn btn-primary" onclick="saveEditedSubproject(${id})">Simpan</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.style.display = 'block';
  setTimeout(() => modal.classList.add('active'), 10);
}

function closeEditSubprojectModal() {
  const modal = document.getElementById('editSubprojectModal');
  if (!modal) return;
  modal.classList.remove('active');
  setTimeout(() => modal.remove(), 300);
}

async function saveEditedSubproject(id) {
  const name = document.getElementById('editSubprojectName')?.value.trim();
  if (!name) { alert('Nama subproyek tidak boleh kosong'); return; }
  const result = await api(`/api/subprojects/${id}`, { method: 'PUT', body: JSON.stringify({ name }) });
  if (result?.success) { closeEditSubprojectModal(); loadSubprojects(); }
  else alert(result?.error || 'Gagal mengupdate subproyek');
}

async function deleteSubproject(id) {
  if (!confirm('Yakin ingin menghapus subproyek ini? Semua AHS yang terkait akan dihapus dari subproyek.')) return;
  const result = await api(`/api/subprojects/${id}`, { method: 'DELETE' });
  if (result?.success) loadSubprojects();
  else alert(result?.error || 'Gagal menghapus subproyek');
}

// ── Misc ───────────────────────────────────────────────────────────────────────
function logout() { fetch('/api/auth/logout', { method: 'POST' }).finally(() => { window.location.href = '/login.html'; }); }

function goBack() {
  window.location.href = 'index.html';
}
