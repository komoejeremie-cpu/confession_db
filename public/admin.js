const message = document.querySelector('#admin-message');
const applicationsList = document.querySelector('#applications-list');
const usersList = document.querySelector('#users-list');
const confessionsList = document.querySelector('#admin-confessions-list');
const passwordForm = document.querySelector('#admin-password-form');
const confirmBox = document.querySelector('#admin-confirm');
const confirmMessage = document.querySelector('#admin-confirm-message');
const confirmCancel = document.querySelector('#admin-confirm-cancel');
const confirmAccept = document.querySelector('#admin-confirm-accept');

function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]); }
function showMessage(text, type = '') { message.textContent = text; message.className = `form-message ${type}`; }

function askConfirmation(text) {
  return new Promise((resolve) => {
    confirmMessage.textContent = text;
    confirmBox.hidden = false;
    const close = (accepted) => {
      confirmBox.hidden = true;
      confirmCancel.removeEventListener('click', cancel);
      confirmAccept.removeEventListener('click', accept);
      resolve(accepted);
    };
    const cancel = () => close(false);
    const accept = () => close(true);
    confirmCancel.addEventListener('click', cancel);
    confirmAccept.addEventListener('click', accept);
  });
}

passwordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(passwordForm));
  if (data.newPassword !== data.passwordConfirmation) {
    showMessage('Les nouveaux mots de passe ne correspondent pas.', 'error');
    return;
  }
  try {
    const result = await api('/password', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    passwordForm.reset();
    showMessage(result.message, 'success');
  } catch (error) { showMessage(error.message, 'error'); }
});

async function api(path, options = {}) {
  const response = await fetch(`/api/admin${path}`, options);
  const data = response.status === 204 ? null : await response.json();
  if (response.status === 401 || response.status === 403) window.location.assign('/login.html');
  if (!response.ok) throw new Error(data?.error || 'Action impossible.');
  return data;
}

async function loadOverview() {
  const data = await api('/overview');
  document.querySelector('#stat-users').textContent = data.users;
  document.querySelector('#stat-coaches').textContent = data.pendingCoaches;
  document.querySelector('#stat-confessions').textContent = data.confessions;
}

async function loadApplications() {
  const applications = await api('/coach-applications');
  applicationsList.innerHTML = applications.length ? applications.map((application) => `<article class="admin-item"><div><strong>${escapeHtml(application.name)}</strong><small>${escapeHtml(application.email)} · ${escapeHtml(application.speciality)} · ${application.experience} ans</small><p>${escapeHtml(application.bio || 'Aucune présentation.')}</p></div><div class="admin-item-actions"><span class="application-status ${application.status.toLowerCase()}">${application.status}</span>${application.status === 'PENDING' ? `<button class="btn btn-primary" data-application-action="APPROVED" data-id="${application.id}">Valider</button><button class="btn btn-danger" data-application-action="REJECTED" data-id="${application.id}">Refuser</button>` : ''}</div></article>`).join('') : '<p class="empty-state">Aucune candidature.</p>';
}

async function loadUsers() {
  const users = await api('/users');
  usersList.innerHTML = users.map((user) => `<article class="admin-item"><div><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(user.email)}</small></div><div class="admin-item-actions"><select data-role-id="${user.id}"><option ${user.role === 'USER' ? 'selected' : ''}>USER</option><option ${user.role === 'COACH' ? 'selected' : ''}>COACH</option><option ${user.role === 'ADMIN' ? 'selected' : ''}>ADMIN</option></select><button class="btn btn-danger" data-delete-user="${user.id}">Supprimer</button></div></article>`).join('');
}

async function loadConfessions() {
  const confessions = await api('/confessions');
  confessionsList.innerHTML = confessions.length ? confessions.map((confession) => `<article class="admin-item"><div><strong>${escapeHtml(confession.title)}</strong><small>${escapeHtml(confession.author_name)} · ${escapeHtml(confession.category)}</small><p>${escapeHtml(confession.content)}</p></div><button class="btn btn-danger" data-delete-confession="${confession.id}">Supprimer</button></article>`).join('') : '<p class="empty-state">Aucune confession.</p>';
}

async function refresh() { await Promise.all([loadOverview(), loadApplications(), loadUsers(), loadConfessions()]); }

document.addEventListener('click', async (event) => {
  const applicationButton = event.target.closest('[data-application-action]');
  const deleteUserButton = event.target.closest('[data-delete-user]');
  const deleteConfessionButton = event.target.closest('[data-delete-confession]');
  try {
    if (applicationButton) { await api(`/coach-applications/${applicationButton.dataset.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: applicationButton.dataset.applicationAction }) }); showMessage('Candidature mise à jour.', 'success'); await refresh(); }
    if (deleteUserButton && await askConfirmation('Supprimer définitivement ce compte ?')) { await api(`/users/${deleteUserButton.dataset.deleteUser}`, { method: 'DELETE' }); showMessage('Compte supprimé.', 'success'); await refresh(); }
    if (deleteConfessionButton && await askConfirmation('Supprimer définitivement cette confession ?')) { await api(`/confessions/${deleteConfessionButton.dataset.deleteConfession}`, { method: 'DELETE' }); showMessage('Confession supprimée.', 'success'); await refresh(); }
  } catch (error) { showMessage(error.message, 'error'); }
});

document.addEventListener('change', async (event) => {
  if (!event.target.matches('[data-role-id]')) return;
  try { await api(`/users/${event.target.dataset.roleId}/role`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: event.target.value }) }); showMessage('Rôle mis à jour.', 'success'); } catch (error) { showMessage(error.message, 'error'); }
});

document.querySelectorAll('[data-reload]').forEach((button) => button.addEventListener('click', () => refresh().catch((error) => showMessage(error.message, 'error'))));
document.querySelector('#admin-logout').addEventListener('click', async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.assign('/login.html'); });
refresh().catch(() => window.location.assign('/login.html'));