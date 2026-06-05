// public/js/userList_renderer.js
// User List page (admin only) — mengganti ipcRenderer dengan fetch() API

async function api(url, options = {}) {
  url = 'https://rab-sid.up.railway.app' + url;
  const res = await fetch(url, {
    credentials: 'include', headers: {'Content-Type':'application/json'}, ...options });
  if (res.status === 401) { return null; }
  if (res.status === 403) { alert('Akses ditolak - hanya admin'); window.location.href = '/index'; return null; }
  return res.json();
}

function renderUserTable(users) {
  const tableBody = document.getElementById('userTableBody');
  if (!tableBody) return;
  tableBody.innerHTML = '';
  users.forEach((user) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.id}</td>
      <td>${user.username}</td>
      <td>${user.hint || '-'}</td>
      <td>
        ${user.username !== 'admin'
          ? `<button class="action-btn delete" onclick="deleteUser(${user.id}, '${user.username}')">Hapus</button>`
          : '<span style="color:#999">Admin</span>'}
      </td>
    `;
    tableBody.appendChild(row);
  });
}

async function loadUsers() {
  const data = await api('/api/auth/users');
  if (data) renderUserTable(data);
}

async function deleteUser(id, username) {
  if (!confirm(`Hapus user "${username}"? Semua data user ini akan ikut terhapus.`)) return;
  const result = await api(`/api/auth/users/${id}`, { method: 'DELETE' });
  if (result?.error) { alert('Error: ' + result.error); return; }
  alert('User berhasil dihapus');
  loadUsers();
}

function logout() {
  fetch(`https://rab-sid.up.railway.app/api/auth/logout`, { method: 'POST' }).finally(() => {});
}

function goBack() {
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', async () => {
  // Cek apakah admin
  const me = await api('/api/auth/me');
  if (!me || !me.isAdmin) {
    alert('Halaman ini hanya untuk admin');
    window.location.href = '/index';
    return;
  }
  loadUsers();
});
