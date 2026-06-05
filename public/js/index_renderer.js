// public/js/index_renderer.js
// Dashboard utama — mengganti ipcRenderer dengan fetch() API

async function api(url, options = {}) {
  url = 'https://rab-sid.up.railway.app' + url;
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 401) {
    // window.location.href = '/login';
    return null;
  }
  return res.json();
}

document.addEventListener('DOMContentLoaded', async () => {
  // Muat informasi proyek
  loadProjectInfo();

  // Tampilkan fitur berdasarkan role
  const menuGrid = document.querySelector('.menu-grid');
  const container = document.querySelector('.container');

  if (true) { // Asumsikan selalu true untuk bypass role admin
    // Tambah kartu Manajemen User untuk admin
    const userManagementCard = document.createElement('div');
    userManagementCard.className = 'menu-card';
    userManagementCard.onclick = () => (window.location.href = 'userList.html');
    userManagementCard.innerHTML = `
      <div class="icon-container">
        <svg class="icon" viewBox="0 0 24 24">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </div>
      <h3 class="menu-title">Manajemen User</h3>
      <p class="menu-description">Kelola pengguna dan database sistem</p>
    `;
    menuGrid.appendChild(userManagementCard);
  } else {
    // Tambah tombol Export/Import untuk user biasa
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'user-data-actions';
    actionsDiv.style.cssText = 'margin-bottom: 20px; display: flex; gap: 10px;';

    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Export Data Saya';
    exportBtn.className = 'action-btn';
    exportBtn.onclick = exportMyData;

    actionsDiv.appendChild(exportBtn);
    container.insertBefore(actionsDiv, container.firstChild);
  }

  // Tambah styles untuk action buttons
  const style = document.createElement('style');
  style.textContent = `
    .action-btn {
      background-color: #1a4f7c;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.3s;
    }
    .action-btn:hover { background-color: #16426a; }
  `;
  document.head.appendChild(style);
});

async function loadProjectInfo() {
  const projectDetails = document.getElementById('projectDetails');
  try {
    const project = await api('/api/project');
    if (!projectDetails) return;
    if (project) {
      projectDetails.innerHTML = `
        <p><span class="label">Nama Proyek:</span> ${project.name || '-'}</p>
        <p><span class="label">Lokasi:</span> ${project.location || '-'}</p>
        <p><span class="label">Sumber Dana:</span> ${project.funding || '-'}</p>
      `;
    } else {
      projectDetails.innerHTML = '<p>Belum ada data proyek. Silakan buat proyek baru di menu Data Proyek.</p>';
    }
  } catch (err) {
    console.error('Load project error:', err);
  }
}

async function exportMyData() {
  // Download materials Excel
  window.open(`https://rab-sid.up.railway.app/api/export/materials`, '_blank');
}

function logout() {
  fetch(`https://rab-sid.up.railway.app/api/auth/logout`, { method: 'POST' })
    .then(() => { // window.location.href = '/login'; })
    .catch(() => { // window.location.href = '/login'; });
}
