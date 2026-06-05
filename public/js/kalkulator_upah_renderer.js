// public/js/kalkulator_upah_renderer.js
// Kalkulator Upah — fetch API version

async function api(url, options = {}) {
  url = 'https://rab-sid.up.railway.app' + url;
  const res = await fetch(url, {
    credentials: 'include', headers: {'Content-Type':'application/json'}, ...options });
  if (res.status === 401) { return null; }
  return res.json();
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', minimumFractionDigits:0 }).format(amount);
}
function formatNumber(number) {
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits:2, maximumFractionDigits:2 }).format(number);
}

function showSummaryReport() {
  document.getElementById('summaryReport').style.display = 'block';
  document.getElementById('detailReport').style.display = 'none';
  loadSummaryData();
}
function showDetailReport() {
  document.getElementById('summaryReport').style.display = 'none';
  document.getElementById('detailReport').style.display = 'block';
  loadDetailData();
}
function goBack() { window.location.href = 'index.html'; }

async function loadSummaryData() {
  const data = await api('/api/calculator/wage-summary');
  if (!data) return;
  const tbody = document.getElementById('summaryTableBody');
  tbody.innerHTML = '';
  let totalBiaya = 0;
  data.forEach((item) => {
    const biaya = (item.hrg_satuan || 0) * (item.volume || 0);
    totalBiaya += biaya;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.deskripsi}</td>
      <td>${item.satuan}</td>
      <td>${formatCurrency(item.hrg_satuan || 0)}</td>
      <td>${formatNumber(item.volume || 0)}</td>
      <td>${formatCurrency(biaya)}</td>
    `;
    tbody.appendChild(row);
  });
  const total = document.getElementById('summaryTotal');
  if (total) total.textContent = formatCurrency(totalBiaya);
}

async function loadDetailData() {
  const data = await api('/api/calculator/wage-summary');
  if (!data) return;
  const container = document.getElementById('ahsGroups');
  container.innerHTML = '';

  const groups = {};
  data.forEach(item => { if (!groups[item.kelompok]) groups[item.kelompok] = []; groups[item.kelompok].push(item); });

  Object.entries(groups).forEach(([kelompok, items]) => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'ahs-group';
    let groupTotal = 0;

    const table = document.createElement('table');
    table.innerHTML = `<thead><tr><th colspan="5" class="ahs-title">${kelompok}</th></tr><tr><th>Deskripsi</th><th>Satuan</th><th>HRG Satuan</th><th>Volume</th><th>Biaya</th></tr></thead>`;
    const tbody = document.createElement('tbody');
    items.forEach(item => {
      const biaya = (item.hrg_satuan || 0) * (item.volume || 0);
      groupTotal += biaya;
      const row = document.createElement('tr');
      row.innerHTML = `<td>${item.deskripsi}</td><td>${item.satuan}</td><td>${formatCurrency(item.hrg_satuan||0)}</td><td>${formatNumber(item.volume||0)}</td><td>${formatCurrency(biaya)}</td>`;
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    table.innerHTML += `<tfoot><tr class="total-row"><td colspan="4">Total ${kelompok}</td><td>${formatCurrency(groupTotal)}</td></tr></tfoot>`;
    groupDiv.appendChild(table);
    container.appendChild(groupDiv);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  showSummaryReport();
  document.querySelector('.back-btn')?.addEventListener('click', goBack);
});
