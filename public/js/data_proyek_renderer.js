// public/js/data_proyek_renderer.js
// Data Proyek page — mengganti ipcRenderer dengan fetch() API

async function api(url, options = {}) {
  const res = await fetch(url, { headers: {'Content-Type':'application/json'}, ...options });
  if (res.status === 401) { window.location.href = '/login.html'; return null; }
  return res.json();
}

function displayProject(project) {
  const projectList = document.getElementById('projectList');
  if (!projectList) return;
  projectList.innerHTML = '';

  if (project) {
    const projectItem = document.createElement('div');
    projectItem.className = 'project-item';
    projectItem.innerHTML = `
      <h3>${project.name}</h3>
      <p>Lokasi: ${project.location || '-'}</p>
      <p>Sumber Dana: ${project.funding || '-'}</p>
    `;
    projectList.appendChild(projectItem);

    document.getElementById('projectName').value = project.name;
    document.getElementById('projectLocation').value = project.location || '';
    document.getElementById('projectFunding').value = project.funding || '';
  }
}

async function loadProject() {
  const project = await api('/api/project');
  if (project) displayProject(project);
}

// Form submission
document.getElementById('projectForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('projectName').value.trim();
  const location = document.getElementById('projectLocation').value.trim();
  const funding = document.getElementById('projectFunding').value.trim();

  if (!name || !location || !funding) {
    alert('Mohon isi semua field yang diperlukan');
    return;
  }

  const result = await api('/api/project', {
    method: 'POST',
    body: JSON.stringify({ name, location, funding }),
  });

  if (result?.success) {
    alert(result.message);
    if (result.project) displayProject(result.project);
  } else {
    alert('Terjadi kesalahan: ' + (result?.error || 'Unknown error'));
  }
});

function logout() {
  fetch('/api/auth/logout', { method: 'POST' }).finally(() => { window.location.href = '/login.html'; });
}

function goBack() {
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', loadProject);
