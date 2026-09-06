const profileForm = document.querySelector('#profile-form');
const profileMessage = document.querySelector('#profile-message');
const postsContainer = document.querySelector('#my-posts');
const profileName = document.querySelector('#profile-name');
const profileEmail = document.querySelector('#profile-email');
const logoutButton = document.querySelector('#logout-button');
const editProfileButton = document.querySelector('#edit-profile-button');
const cancelProfileButton = document.querySelector('#cancel-profile-button');
const profileSummary = document.querySelector('#profile-summary');
const profileSummaryName = document.querySelector('#profile-summary-name');
const profileSummaryEmail = document.querySelector('#profile-summary-email');
const coachApplicationForm = document.querySelector('#coach-application-form');
const showCoachApplicationButton = document.querySelector('#show-coach-application');
const coachApplicationStatus = document.querySelector('#coach-application-status');
const coachApplicationMessage = document.querySelector('#coach-application-message');
const coachSpeciality = document.querySelector('#coach-speciality');
const coachExperience = document.querySelector('#coach-experience');
const coachBio = document.querySelector('#coach-bio');
const adminLink = document.querySelector('#admin-link');

function setEditMode(enabled) {
  profileForm.hidden = !enabled;
  profileSummary.hidden = enabled;
  editProfileButton.hidden = enabled;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function formatDate(value) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function showMessage(text, type = '') {
  profileMessage.textContent = text;
  profileMessage.className = `form-message ${type}`;
}

function showCoachMessage(text, type = '') {
  coachApplicationMessage.textContent = text;
  coachApplicationMessage.className = `form-message ${type}`;
}

function setCoachStatus(status) {
  const labels = {
    PENDING: 'Candidature en attente',
    APPROVED: 'Coach validé',
    REJECTED: 'Candidature à compléter',
    SUSPENDED: 'Profil suspendu'
  };
  coachApplicationStatus.textContent = labels[status] || 'Non candidat';
  coachApplicationStatus.className = `application-status ${String(status || 'none').toLowerCase()}`;
  showCoachApplicationButton.hidden = ['PENDING', 'APPROVED'].includes(status);
}

async function loadProfile() {
  const [profileResponse, postsResponse, applicationResponse] = await Promise.all([
    fetch('/api/auth/profile'),
    fetch('/api/confessions/mine'),
    fetch('/api/coaches/application')
  ]);

  if (profileResponse.status === 401 || postsResponse.status === 401) {
    window.location.assign('/login.html');
    return;
  }

  const profile = await profileResponse.json();
  const posts = await postsResponse.json();
  const application = await applicationResponse.json();
  profileName.value = profile.name;
  profileEmail.value = profile.email;
  profileSummaryName.textContent = profile.name;
  profileSummaryEmail.textContent = profile.email;
  adminLink.hidden = profile.role !== 'ADMIN';
  setEditMode(false);
  setCoachStatus(application?.status);
  if (application) {
    coachSpeciality.value = application.speciality || '';
    coachExperience.value = application.experience ?? '';
    coachBio.value = application.bio || '';
  }

  postsContainer.innerHTML = posts.length
    ? posts.map((post) => `
      <article class="profile-post">
        <div class="profile-post-meta"><span>${escapeHtml(post.category)}</span><small>${formatDate(post.created_at)}</small></div>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.content)}</p>
        <small>♡ ${post.likes_count} · ◇ ${post.comments_count}</small>
      </article>
    `).join('')
    : '<p class="empty-state">Vous n’avez encore publié aucune confession.</p>';
}

profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = profileForm.querySelector('button');
  button.disabled = true;
  showMessage('');

  try {
    const response = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: profileName.value, email: profileEmail.value })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Impossible de mettre à jour le profil.');
    profileName.value = data.name;
    profileEmail.value = data.email;
    profileSummaryName.textContent = data.name;
    profileSummaryEmail.textContent = data.email;
    setEditMode(false);
    showMessage('Profil mis à jour.', 'success');
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    button.disabled = false;
  }
});

editProfileButton.addEventListener('click', () => {
  profileMessage.textContent = '';
  setEditMode(true);
  profileName.focus();
});

cancelProfileButton.addEventListener('click', () => {
  profileName.value = profileSummaryName.textContent;
  profileEmail.value = profileSummaryEmail.textContent;
  showMessage('');
  setEditMode(false);
});

logoutButton.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.assign('/login.html');
});

showCoachApplicationButton.addEventListener('click', () => {
  coachApplicationForm.hidden = false;
  showCoachApplicationButton.hidden = true;
  coachSpeciality.focus();
});

coachApplicationForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = coachApplicationForm.querySelector('button');
  button.disabled = true;
  showCoachMessage('');

  try {
    const response = await fetch('/api/coaches/application', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speciality: coachSpeciality.value, experience: coachExperience.value, bio: coachBio.value })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'La candidature n’a pas pu être envoyée.');
    coachApplicationForm.hidden = true;
    setCoachStatus(data.status);
    showCoachMessage('Votre candidature a été envoyée et sera vérifiée par notre équipe.', 'success');
  } catch (error) {
    showCoachMessage(error.message, 'error');
    showCoachApplicationButton.hidden = false;
  } finally {
    button.disabled = false;
  }
});

loadProfile().catch(() => window.location.assign('/login.html'));
