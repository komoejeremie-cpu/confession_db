const confessionGrid = document.querySelector('.confession-grid');
const coachGrid = document.querySelector('.coach-grid');
const confessionForm = document.querySelector('#confession-form');
const signupForm = document.querySelector('#signup-form');
const showSignupLink = document.querySelector('#show-signup');
const hideSignupLink = document.querySelector('#hide-signup');
const signupMessage = document.querySelector('#signup-message');
const loginForm = document.querySelector('#login-form');
const loginLink = document.querySelector('.login-link');
const forgotPasswordLink = document.querySelector('#forgot-password');
const googleLoginButton = document.querySelector('#google-login');
const confessionSearch = document.querySelector('#confession-search');
const confessionCount = document.querySelector('#confession-count');
const toggleFiltersButton = document.querySelector('#toggle-filters');
const chips = [...document.querySelectorAll('.chip')];
const coachSearch = document.querySelector('#coach-search');
const coachSpecialty = document.querySelector('#coach-specialty');
const coachRating = document.querySelector('#coach-rating');
const coachExperience = document.querySelector('#coach-experience');
const coachCount = document.querySelector('#coach-count');
const filterCoachesButton = document.querySelector('#filter-coaches');
const confessionCategory = document.querySelector('#confession-category');
const confessionCoach = document.querySelector('#confession-coach');
const appToast = document.querySelector('#app-toast');
const appToastTitle = document.querySelector('.app-toast-title');
const appToastMessage = document.querySelector('.app-toast-message');
const appToastClose = document.querySelector('.app-toast-close');
let selectedCategory = '';
let toastTimer;

function showToast(message, type = 'info', title = 'Information') {
  if (!appToast) return;
  window.clearTimeout(toastTimer);
  appToastTitle.textContent = title;
  appToastMessage.textContent = message;
  appToast.className = `app-toast ${type}`;
  appToast.hidden = false;
  toastTimer = window.setTimeout(() => {
    appToast.hidden = true;
  }, 5000);
}

appToastClose?.addEventListener('click', () => {
  appToast.hidden = true;
});

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[character]);
}

function formatDate(value) {
  return new Intl.RelativeTimeFormat('fr', { numeric: 'auto' }).format(
    Math.round((new Date(value) - Date.now()) / 86400000),
    'day'
  );
}

function renderConfessions(confessions) {
  if (confessionCount) confessionCount.textContent = confessions.length;
  if (!confessionGrid) return;
  if (!confessions.length) {
    confessionGrid.innerHTML = '<p class="empty-state">Aucune confession ne correspond à votre recherche.</p>';
    return;
  }
  confessionGrid.innerHTML = confessions.map((confession) => `
    <article class="confession-card" data-confession-id="${confession.id}">
      <div class="card-top">
        <div class="anon"><span>♙</span><div><strong>Anonyme</strong><small>${formatDate(confession.created_at)}</small></div></div>
        <span class="tag">${escapeHtml(confession.category)}</span>
      </div>
      <h3>« ${escapeHtml(confession.title)} »</h3>
      <p>${escapeHtml(confession.content)}</p>
      <div class="card-meta card-actions">
        <button type="button" class="interaction-button like-button">♡ <span>${confession.likes_count ?? 0}</span></button>
        <button type="button" class="interaction-button comment-button">◇ <span>${confession.comments_count ?? 0}</span></button>
        <button type="button" class="interaction-button favorite-button">☆ <span>Favori</span></button>
      </div>
      <div class="comments-list" data-comments-for="${confession.id}"><span class="comments-loading">Chargement des commentaires...</span></div>
      <form class="comment-form" hidden><input name="content" maxlength="1000" placeholder="Écrire un commentaire..." required><button type="submit">Envoyer</button></form>
    </article>
  `).join('');
  confessions.forEach((confession) => loadComments(confession.id));
}

async function loadComments(confessionId) {
  const commentsContainer = document.querySelector(`[data-comments-for="${confessionId}"]`);
  if (!commentsContainer) return;

  try {
    const response = await fetch(`/api/confessions/${confessionId}/comments`);
    const comments = await response.json();
    if (!response.ok) throw new Error(comments.error || 'Impossible de charger les commentaires.');
    commentsContainer.innerHTML = comments.length
      ? comments.map((comment) => `<div class="comment-item"><strong>${escapeHtml(comment.author_name || 'Membre de la communauté')}</strong><p>${escapeHtml(comment.content)}</p><small>${formatDate(comment.created_at)}</small></div>`).join('')
      : '<span class="comments-empty">Aucun commentaire pour le moment.</span>';
  } catch (_error) {
    commentsContainer.innerHTML = '<span class="comments-empty">Commentaires indisponibles.</span>';
  }
}

function renderCoaches(coaches) {
  if (coachCount) coachCount.textContent = coaches.length;
  if (!coachGrid) return;
  if (!coaches.length) {
    coachGrid.innerHTML = '<p class="empty-state">Aucun coach ne correspond à vos filtres.</p>';
    return;
  }
  coachGrid.innerHTML = coaches.map((coach) => `
    <article class="coach-card" data-coach-id="${coach.id}">
      <div class="coach-head">
        <div class="coach-photo photo1">${escapeHtml(coach.name.split(' ').map((part) => part[0]).join(''))}</div>
        <div><h3>${escapeHtml(coach.name)}</h3><span class="verified">✓ Coach vérifié</span><p>▥ ${coach.years_experience} ans d'expérience</p></div>
      </div>
      <div class="tags">${(coach.specialties || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
      <div class="rating">★★★★★ <b>${coach.rating}</b> <small>(${coach.reviews_count} avis)</small></div>
      <a href="#connexion" class="coach-link">Voir le profil →</a>
    </article>
  `).join('');
}

async function loadContent() {
  const [confessionsResponse, coachesResponse, categoriesResponse] = await Promise.all([
    fetch(`/api/confessions?${new URLSearchParams({ ...(selectedCategory ? { category: selectedCategory } : {}), ...(confessionSearch?.value ? { search: confessionSearch.value } : {}) })}`),
    fetch('/api/coaches'),
    fetch('/api/categories')
  ]);

  if (!confessionsResponse.ok || !coachesResponse.ok || !categoriesResponse.ok) {
    throw new Error('Impossible de charger les données.');
  }

  renderConfessions(await confessionsResponse.json());
  const coaches = await coachesResponse.json();
  renderCoaches(coaches);
  const categories = await categoriesResponse.json();
  if (confessionCategory && !confessionCategory.options[1]) {
    confessionCategory.innerHTML += categories.map((category) => `<option value="${escapeHtml(category.name)}">${escapeHtml(category.name)}</option>`).join('');
  }
  if (coachSpecialty && !coachSpecialty.options[1]) {
    coachSpecialty.innerHTML += [...new Set(coaches.flatMap((coach) => coach.specialties || []))].map((specialty) => `<option value="${escapeHtml(specialty)}">${escapeHtml(specialty)}</option>`).join('');
  }
  if (confessionCoach) {
    confessionCoach.innerHTML = '<option value="">Aucun coach</option>' + coaches.map((coach) => `<option value="${coach.id}">${escapeHtml(coach.name)} — ${coach.rating} ★</option>`).join('');
  }
}

confessionForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = confessionForm.querySelector('button');
  const title = confessionForm.elements.title;
  const category = confessionForm.elements.category;
  const content = confessionForm.elements.content;
  const coach = confessionForm.elements.coachId;

  button.disabled = true;
  button.textContent = 'Publication...';

  try {
    const response = await fetch('/api/confessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.value,
        category: category.value,
        content: content.value,
        coachId: coach.value || null
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'La publication a échoué.');

    confessionForm.reset();
    showToast('Ta confession a été publiée anonymement.', 'success', 'Publication réussie');
    await loadContent();
  } catch (error) {
    showToast(error.message, 'error', 'Publication impossible');
  } finally {
    button.disabled = false;
    button.textContent = 'Publier ma confession';
  }
});

async function applyCoachFilters() {
  const params = new URLSearchParams();
  if (coachSearch?.value) params.set('search', coachSearch.value);
  if (coachSpecialty?.value) params.set('specialty', coachSpecialty.value);
  const response = await fetch(`/api/coaches?${params}`);
  if (!response.ok) throw new Error('Impossible de filtrer les coachs.');
  let coaches = await response.json();
  if (coachRating?.value) coaches = coaches.filter((coach) => Number(coach.rating) >= Number(coachRating.value));
  if (coachExperience?.value) coaches = coaches.filter((coach) => Number(coach.years_experience) >= Number(coachExperience.value));
  renderCoaches(coaches);
}

confessionSearch?.addEventListener('input', () => loadContent().catch(() => {}));
chips.forEach((chip) => chip.addEventListener('click', () => {
  chips.forEach((item) => item.classList.remove('selected'));
  chip.classList.add('selected');
  selectedCategory = chip.textContent.trim() === 'Toutes' ? '' : chip.textContent.trim();
  loadContent().catch(() => {});
}));
toggleFiltersButton?.addEventListener('click', () => document.querySelector('.chips')?.toggleAttribute('hidden'));
filterCoachesButton?.addEventListener('click', () => applyCoachFilters().catch((error) => showToast(error.message, 'error', 'Filtrage impossible')));

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector('button');
  button.disabled = true;
  try {
    const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(loginForm))) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Connexion impossible.');
    window.location.replace(data.role === 'ADMIN' ? '/admin.html' : '/profile.html');
  } catch (error) {
    showToast(error.message, 'error', 'Connexion impossible');
  } finally {
    button.disabled = false;
  }
});

forgotPasswordLink?.addEventListener('click', (event) => {
  event.preventDefault();
  showToast('La récupération du mot de passe sera disponible prochainement.', 'info', 'Fonctionnalité à venir');
});

googleLoginButton?.addEventListener('click', () => showToast('La connexion Google nécessite la configuration OAuth du projet.', 'info', 'Connexion Google'));

document.addEventListener('click', async (event) => {
  const button = event.target.closest('.like-button, .favorite-button, .comment-button');
  if (!button) return;
  const card = button.closest('[data-confession-id]');
  const id = card.dataset.confessionId;
  if (button.classList.contains('comment-button')) {
    card.querySelector('.comment-form').hidden = !card.querySelector('.comment-form').hidden;
    return;
  }
  const endpoint = button.classList.contains('like-button') ? 'like' : 'favorite';
  try {
    const response = await fetch(`/api/confessions/${id}/${endpoint}`, { method: 'POST' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    button.classList.toggle('active', endpoint === 'like' ? data.liked : data.favorite);
    if (endpoint === 'like') button.querySelector('span').textContent = data.likes_count;
  } catch (error) {
    showToast(error.message, 'error', 'Action impossible');
  }
});

document.addEventListener('submit', async (event) => {
  if (!event.target.matches('.comment-form')) return;
  event.preventDefault();
  const form = event.target;
  const id = form.closest('[data-confession-id]').dataset.confessionId;
  const response = await fetch(`/api/confessions/${id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: form.elements.content.value }) });
  const data = await response.json();
  if (!response.ok) return showToast(data.error, 'error', 'Commentaire impossible');
  form.reset();
  form.hidden = true;
  showToast('Votre commentaire est maintenant visible par la communauté.', 'success', 'Commentaire publié');
  await loadContent();
});

showSignupLink?.addEventListener('click', (event) => {
  event.preventDefault();
  signupForm.hidden = false;
  signupForm.querySelector('input')?.focus();
});

hideSignupLink?.addEventListener('click', (event) => {
  event.preventDefault();
  signupForm.hidden = true;
});

signupForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = signupForm.querySelector('button');
  const formData = new FormData(signupForm);

  if (formData.get('password') !== formData.get('passwordConfirmation')) {
    showToast('Les deux mots de passe ne correspondent pas.', 'error', 'Inscription impossible');
    return;
  }

  button.disabled = true;
  button.textContent = 'Création...';
  signupMessage.textContent = '';
  signupMessage.className = 'form-message';

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(formData))
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'L’inscription a échoué.');

    window.location.assign('/profile.html');
  } catch (error) {
    signupMessage.textContent = error.message;
    signupMessage.classList.add('error');
  } finally {
    button.disabled = false;
    button.textContent = 'Créer mon compte';
  }
});

loadContent().catch(() => {
  // Le HTML conserve ses données de démonstration tant que la base n'est pas configurée.
});
