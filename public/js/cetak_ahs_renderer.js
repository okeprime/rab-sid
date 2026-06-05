// public/js/cetak_ahs_renderer.js
// Cetak/Print AHS page — mengganti ipcRenderer dengan fetch() + window.print()

async function api(url, options = {}) {
  url = 'https://rab-sid.up.railway.app' + url;
  const res = await fetch(url, {
    credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...options });
  if (res.status === 401) { return null; }
  return res.json();
}

// Load project information
async function loadProjectInfo() {
  const project = await api('/api/project');
  const nameEl = document.getElementById('projectName');
  const locEl = document.getElementById('projectLocation');
  const fundEl = document.getElementById('projectFunding');
  if (nameEl) nameEl.textContent = project?.name || 'Belum ada proyek';
  if (locEl) locEl.textContent = project?.location || 'Belum ada lokasi';
  if (fundEl) fundEl.textContent = project?.funding || 'Belum ada sumber dana';
}

// Setup back button
function setupBackButton() {
  document.querySelector('.back-btn')?.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
}

// Loading indicator
function showLoading() { document.getElementById('loadingIndicator')?.classList.add('active'); }
function hideLoading() { document.getElementById('loadingIndicator')?.classList.remove('active'); }

// ── Print functions — di web menggunakan download Excel via API ─────────────────

async function downloadExcel(type) {
  showLoading();
  try {
    let url = '';
    switch (type) {
      case 'materials': url = '/api/export/materials'; break;
      case 'wages':     url = '/api/export/materials?category=upah'; break;
      case 'ahs':       url = '/api/export/ahs'; break;
      case 'kesimpulan': url = '/api/export/kesimpulan'; break;
      case 'bq':        url = '/api/export/bq'; break;
      case 'rekapBQ':   url = '/api/export/rekap-bq'; break;
      default:          url = '/api/export/materials'; break;
    }
    // Buka tab baru untuk download
    const a = document.createElement('a');
    a.href = 'https://rab-sid.up.railway.app' + url;
    a.target = '_blank';
    a.click();
  } finally {
    hideLoading();
  }
}

// Tombol print menggunakan window.print() untuk cetak PDF via browser
function print(type) {
  showLoading();
  setTimeout(() => {
    window.print();
    hideLoading();
  }, 500);
}

function printAll()       { downloadExcel('all'); }
function printWages()     { downloadExcel('wages'); }
function printMaterials() { downloadExcel('materials'); }
function printAhsOnly()   { downloadExcel('ahs'); }
function printBQ()        { downloadExcel('bq'); }
function printRekapBQ()   { downloadExcel('rekapBQ'); }
function printKesimpulan(){ downloadExcel('kesimpulan'); }

// Logout
function logout() {
  fetch(`https://rab-sid.up.railway.app/api/auth/logout`, { method: 'POST' }).finally(() => {});
}

document.addEventListener('DOMContentLoaded', () => {
  loadProjectInfo();
  setupBackButton();
});

// === GLOBAL SCOPE EXPORTS ===
window.printAll = printAll;
window.printWages = printWages;
window.printMaterials = printMaterials;
window.printAhsOnly = printAhsOnly;
window.printBQ = printBQ;
window.printRekapBQ = printRekapBQ;
window.printKesimpulan = printKesimpulan;
window.print = print;
window.logout = logout;
