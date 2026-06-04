// public/js/renderer.js
// Login page — mengganti ipcRenderer dengan fetch() API

// ── Helper ─────────────────────────────────────────────────────────────────────
async function apiPost(url, data) {
  url = (window.API_BASE || '') + url;
  const res = await fetch(url, {
    credentials: 'include',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

// ── Login ──────────────────────────────────────────────────────────────────────
async function attemptLogin() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  if (!username || !password) {
    showError('Mohon isi username dan password');
    return;
  }

  try {
    const result = await apiPost('/api/auth/login', { username, password });
    if (result.success) {
      showSuccess(result.message);
      window.location.href = '/index';
    } else {
      showError(result.message);
    }
  } catch (err) {
    showError('Gagal terhubung ke server');
  }
}

// ── Register ───────────────────────────────────────────────────────────────────
async function attemptRegister() {
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirmPassword = document.getElementById('regConfirmPassword').value;
  const hint = document.getElementById('regHint').value.trim();

  if (!username || !password || !confirmPassword || !hint) {
    showError('Mohon isi semua field');
    return;
  }
  if (password !== confirmPassword) {
    showError('Password tidak cocok');
    return;
  }

  try {
    const result = await apiPost('/api/auth/register', { username, password, hint });
    if (result.success) {
      showSuccess(result.message);
      setTimeout(() => {
        showLoginForm();
        clearFormInputs('registerForm');
      }, 2000);
    } else {
      showError(result.message);
    }
  } catch (err) {
    showError('Gagal terhubung ke server');
  }
}

// ── Reset Password ─────────────────────────────────────────────────────────────
async function attemptReset() {
  const username = document.getElementById('resetUsername').value.trim();
  const hint = document.getElementById('resetHint').value.trim();
  const newPassword = document.getElementById('resetPassword').value;
  const confirmPassword = document.getElementById('resetConfirmPassword').value;

  if (!username || !hint || !newPassword || !confirmPassword) {
    showError('Mohon isi semua field');
    return;
  }
  if (newPassword !== confirmPassword) {
    showError('Password baru tidak cocok');
    return;
  }

  try {
    const result = await apiPost('/api/auth/reset', { username, hint, newPassword });
    if (result.success) {
      showSuccess('Password berhasil direset. Silakan login dengan password baru.');
      setTimeout(() => {
        showLoginForm();
        clearFormInputs('resetForm');
      }, 3000);
    } else {
      showError(result.message);
    }
  } catch (err) {
    showError('Gagal terhubung ke server');
  }
}

// ── Utility ────────────────────────────────────────────────────────────────────
function clearFormInputs(formId) {
  const form = document.getElementById(formId);
  if (form) {
    for (const input of form.getElementsByTagName('input')) {
      input.value = '';
    }
  }
}

// Enter key handler untuk form login
document.addEventListener('DOMContentLoaded', () => {
  const pwdField = document.getElementById('password');
  if (pwdField) {
    pwdField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') attemptLogin();
    });
  }
});
