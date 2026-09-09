const confessionGrid = document.querySelector('.confession-grid');
const coachGrid = document.querySelector('.coach-grid');
const confessionForm = document.querySelector('#confession-form');
const confessionCategory = document.querySelector('#confession-category');
const confessionCoach = document.querySelector('#confession-coach');
const searchInput = document.querySelector('#search');
const categoryFilter = document.querySelector('#category-filter');
const showAllConfessionsButton = document.querySelector(
  '#show-all-confessions'
);

const loginSection = document.querySelector('#connexion');
const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');
const forgotPasswordLink = document.querySelector('#forgot-password');

const navLoginLink = document.querySelector('.nav-actions .login-link');
const navProfileLink = document.querySelector(
  '.nav-actions a[href="/profile.html"]'
);

const confessionCount = document.querySelector('#confession-count');

let allConfessions = [];
let showAllConfessions = false;

/* =========================================================
   UTILITAIRES
========================================================= */

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function showToast(
  message,
  type = 'success',
  title = 'Information'
) {
  let toastContainer = document.querySelector('.toast-container');

  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  toast.innerHTML = `
    <div class="toast-content">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(message)}</span>
    </div>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-hide');

    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}

/* =========================================================
   AUTHENTIFICATION
========================================================= */

async function getCurrentUser() {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include'
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return data.user || data || null;
  } catch (error) {
    console.error('Erreur récupération utilisateur :', error);
    return null;
  }
}

async function updateAuthenticatedView() {
  const user = await getCurrentUser();

  if (user) {
    if (navLoginLink) {
      navLoginLink.hidden = true;
    }

    if (navProfileLink) {
      navProfileLink.hidden = false;
      navProfileLink.textContent = 'Mon espace personnel';
    }

    if (loginSection) {
      loginSection.hidden = true;
    }

    return user;
  }

  if (navLoginLink) {
    navLoginLink.hidden = false;
  }

  if (navProfileLink) {
    navProfileLink.hidden = true;
  }

  if (loginSection) {
    loginSection.hidden = false;
  }

  return null;
}

/* =========================================================
   CONFESSIONS
========================================================= */

function renderConfessions(confessions) {
  if (!confessionGrid) {
    return;
  }

  const visibleConfessions = showAllConfessions
    ? confessions
    : confessions.slice(0, 5);

  if (confessionCount) {
    confessionCount.textContent = `${confessions.length} publication${
      confessions.length > 1 ? 's' : ''
    }`;
  }

  if (visibleConfessions.length === 0) {
    confessionGrid.innerHTML = `
      <div class="empty-state">
        <h3>Aucune publication trouvée</h3>
        <p>
          Aucune publication ne correspond à ta recherche.
        </p>
      </div>
    `;

    if (showAllConfessionsButton) {
      showAllConfessionsButton.hidden = true;
    }

    return;
  }

  confessionGrid.innerHTML = visibleConfessions
    .map((confession) => {
      const likesCount = Number(confession.likes_count || 0);
      const commentsCount = Number(confession.comments_count || 0);

      const imageHtml = confession.image_url
        ? `
          <div class="confession-image">
            <img
              src="${escapeHtml(confession.image_url)}"
              alt="Image de la publication"
              loading="lazy"
            />
          </div>
        `
        : '';

      return `
        <article
          class="confession-card"
          data-confession-id="${escapeHtml(confession.id)}"
        >
          ${imageHtml}

          <div class="confession-card-content">

            <div class="confession-card-header">
              <span class="tag">
                ${escapeHtml(confession.category_name || 'Général')}
              </span>

              <span class="confession-date">
                ${escapeHtml(formatDate(confession.created_at))}
              </span>
            </div>

            <h3>
              ${escapeHtml(confession.title || 'Sans titre')}
            </h3>

            <p class="confession-preview">
              ${escapeHtml(confession.content || '')}
            </p>

            <div class="confession-meta">
              <span>
                Publication anonyme
              </span>
            </div>

            <div class="confession-actions">

              <button
                type="button"
                class="interaction-button like-button ${
                  confession.liked ? 'is-active' : ''
                }"
                data-action="like"
                data-confession-id="${escapeHtml(confession.id)}"
              >
                <span>♡</span>
                <span class="like-count">${likesCount}</span>
              </button>

              <button
                type="button"
                class="interaction-button"
                data-action="comments"
                data-confession-id="${escapeHtml(confession.id)}"
              >
                <span>💬</span>
                <span>${commentsCount}</span>
              </button>

              <button
                type="button"
                class="interaction-button favorite-button ${
                  confession.favorite ? 'is-active' : ''
                }"
                data-action="favorite"
                data-confession-id="${escapeHtml(confession.id)}"
              >
                <span>☆</span>
              </button>

            </div>

            <div
              class="comments-section"
              id="comments-${escapeHtml(confession.id)}"
              hidden
            >
              <div class="comments-list"></div>

              <form
                class="comment-form"
                data-confession-id="${escapeHtml(confession.id)}"
              >
                <input
                  type="text"
                  name="content"
                  placeholder="Écrire un commentaire..."
                  required
                  maxlength="1000"
                />

                <button
                  type="submit"
                  class="btn btn-primary"
                >
                  Commenter
                </button>
              </form>
            </div>

          </div>
        </article>
      `;
    })
    .join('');

  if (showAllConfessionsButton) {
    showAllConfessionsButton.hidden =
      confessions.length <= 5 || showAllConfessions;

    showAllConfessionsButton.textContent = showAllConfessions
      ? ''
      : 'Voir toutes les publications';
  }

  visibleConfessions.forEach((confession) => {
    loadComments(confession.id);
  });
}

/* =========================================================
   COMMENTAIRES
========================================================= */

async function loadComments(confessionId) {
  const commentsSection = document.querySelector(
    `#comments-${CSS.escape(String(confessionId))}`
  );

  if (!commentsSection) {
    return;
  }

  const commentsList = commentsSection.querySelector('.comments-list');

  if (!commentsList) {
    return;
  }

  try {
    const response = await fetch(
      `/api/confessions/${encodeURIComponent(confessionId)}/comments`,
      {
        credentials: 'include'
      }
    );

    if (!response.ok) {
      return;
    }

    const data = await response.json();
    const comments = data.comments || data || [];

    renderComments(commentsList, comments);
  } catch (error) {
    console.error('Erreur chargement commentaires :', error);
  }
}

function renderComments(container, comments) {
  if (!comments || comments.length === 0) {
    container.innerHTML = `
      <p class="no-comments">
        Aucun commentaire pour le moment.
      </p>
    `;

    return;
  }

  const parents = comments.filter(
    (comment) => !comment.parent_comment_id
  );

  const replies = comments.filter(
    (comment) => comment.parent_comment_id
  );

  container.innerHTML = parents
    .map((comment) => {
      const commentReplies = replies.filter(
        (reply) =>
          Number(reply.parent_comment_id) === Number(comment.id)
      );

      return `
        <div
          class="comment"
          data-comment-id="${escapeHtml(comment.id)}"
        >
          <div class="comment-header">
            <strong>
              ${escapeHtml(comment.user_name || 'Utilisateur')}
            </strong>

            <span>
              ${escapeHtml(formatDate(comment.created_at))}
            </span>
          </div>

          <p>
            ${escapeHtml(comment.content || '')}
          </p>

          <div class="comment-actions">

            <button
              type="button"
              class="interaction-button comment-like-button ${
                comment.liked ? 'is-active' : ''
              }"
              data-action="comment-like"
              data-comment-id="${escapeHtml(comment.id)}"
            >
              ♡
              <span>
                ${Number(comment.likes_count || 0)}
              </span>
            </button>

            <button
              type="button"
              class="comment-reply-button"
              data-action="reply"
              data-comment-id="${escapeHtml(comment.id)}"
            >
              Répondre
            </button>

          </div>

          <div class="comment-replies">
            ${commentReplies
              .map(
                (reply) => `
                  <div
                    class="comment reply"
                    data-comment-id="${escapeHtml(reply.id)}"
                  >
                    <div class="comment-header">
                      <strong>
                        ${escapeHtml(
                          reply.user_name || 'Utilisateur'
                        )}
                      </strong>

                      <span>
                        ${escapeHtml(
                          formatDate(reply.created_at)
                        )}
                      </span>
                    </div>

                    <p>
                      ${escapeHtml(reply.content || '')}
                    </p>

                    <button
                      type="button"
                      class="interaction-button comment-like-button ${
                        reply.liked ? 'is-active' : ''
                      }"
                      data-action="comment-like"
                      data-comment-id="${escapeHtml(reply.id)}"
                    >
                      ♡
                      <span>
                        ${Number(reply.likes_count || 0)}
                      </span>
                    </button>
                  </div>
                `
              )
              .join('')}
          </div>

          <div
            class="reply-form-container"
            data-reply-to="${escapeHtml(comment.id)}"
            hidden
          >
            <form class="reply-form">
              <input
                type="text"
                name="content"
                placeholder="Écrire une réponse..."
                maxlength="1000"
                required
              />

              <button
                type="submit"
                class="btn btn-primary"
              >
                Répondre
              </button>
            </form>
          </div>

        </div>
      `;
    })
    .join('');
}

/* =========================================================
   LIKES / FAVORIS
========================================================= */

async function toggleLike(confessionId, button) {
  try {
    const response = await fetch(
      `/api/confessions/${encodeURIComponent(confessionId)}/like`,
      {
        method: 'POST',
        credentials: 'include'
      }
    );

    if (response.status === 401) {
      showToast(
        'Connecte-toi pour aimer une publication.',
        'info',
        'Connexion requise'
      );

      return;
    }

    if (!response.ok) {
      throw new Error('Impossible de modifier le like.');
    }

    const data = await response.json();

    const countElement = button.querySelector('.like-count');

    if (countElement && data.likes_count !== undefined) {
      countElement.textContent = data.likes_count;
    }

    button.classList.toggle(
      'is-active',
      Boolean(data.liked)
    );
  } catch (error) {
    console.error(error);

    showToast(
      'Impossible de modifier cette réaction.',
      'error',
      'Erreur'
    );
  }
}

async function toggleFavorite(confessionId, button) {
  try {
    const response = await fetch(
      `/api/confessions/${encodeURIComponent(confessionId)}/favorite`,
      {
        method: 'POST',
        credentials: 'include'
      }
    );

    if (response.status === 401) {
      showToast(
        'Connecte-toi pour ajouter une publication aux favoris.',
        'info',
        'Connexion requise'
      );

      return;
    }

    if (!response.ok) {
      throw new Error('Impossible de modifier le favori.');
    }

    const data = await response.json();

    button.classList.toggle(
      'is-active',
      Boolean(data.favorite)
    );
  } catch (error) {
    console.error(error);

    showToast(
      'Impossible de modifier les favoris.',
      'error',
      'Erreur'
    );
  }
}

/* =========================================================
   COMMENTAIRES : LIKE
========================================================= */

async function toggleCommentLike(commentId, button) {
  try {
    const response = await fetch(
      `/api/comments/${encodeURIComponent(commentId)}/like`,
      {
        method: 'POST',
        credentials: 'include'
      }
    );

    if (response.status === 401) {
      showToast(
        'Connecte-toi pour aimer un commentaire.',
        'info',
        'Connexion requise'
      );

      return;
    }

    if (!response.ok) {
      throw new Error(
        'Impossible de modifier le like du commentaire.'
      );
    }

    const data = await response.json();

    button.classList.toggle(
      'is-active',
      Boolean(data.liked)
    );

    const countElement = button.querySelector('span');

    if (countElement && data.likes_count !== undefined) {
      countElement.textContent = data.likes_count;
    }
  } catch (error) {
    console.error(error);

    showToast(
      'Impossible de modifier cette réaction.',
      'error',
      'Erreur'
    );
  }
}

/* =========================================================
   AJOUT COMMENTAIRE
========================================================= */

async function submitComment(form) {
  const confessionId = form.dataset.confessionId;
  const input = form.elements.content;

  if (!confessionId || !input?.value.trim()) {
    return;
  }

  const content = input.value.trim();

  try {
    const response = await fetch(
      `/api/confessions/${encodeURIComponent(confessionId)}/comments`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content
        })
      }
    );

    if (response.status === 401) {
      showToast(
        'Connecte-toi pour commenter.',
        'info',
        'Connexion requise'
      );

      return;
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));

      throw new Error(
        data.error || 'Impossible d’ajouter le commentaire.'
      );
    }

    input.value = '';

    await loadComments(confessionId);

    showToast(
      'Ton commentaire a été publié.',
      'success',
      'Commentaire publié'
    );
  } catch (error) {
    console.error(error);

    showToast(
      error.message || 'Impossible de publier le commentaire.',
      'error',
      'Erreur'
    );
  }
}

/* =========================================================
   RÉPONSE À UN COMMENTAIRE
========================================================= */

async function submitReply(form) {
  const container = form.closest('.reply-form-container');

  if (!container) {
    return;
  }

  const commentId = container.dataset.replyTo;
  const commentElement = container.closest('.comment');
  const confessionCard = container.closest('.confession-card');

  if (!commentId || !commentElement || !confessionCard) {
    return;
  }

  const confessionId =
    confessionCard.dataset.confessionId;

  const input = form.elements.content;

  if (!input?.value.trim()) {
    return;
  }

  try {
    const response = await fetch(
      `/api/confessions/${encodeURIComponent(
        confessionId
      )}/comments`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: input.value.trim(),
          parent_comment_id: commentId
        })
      }
    );

    if (response.status === 401) {
      showToast(
        'Connecte-toi pour répondre.',
        'info',
        'Connexion requise'
      );

      return;
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));

      throw new Error(
        data.error || 'Impossible de publier la réponse.'
      );
    }

    input.value = '';

    await loadComments(confessionId);

    showToast(
      'Ta réponse a été publiée.',
      'success',
      'Réponse publiée'
    );
  } catch (error) {
    console.error(error);

    showToast(
      error.message || 'Impossible de publier la réponse.',
      'error',
      'Erreur'
    );
  }
}

/* =========================================================
   CHARGEMENT DES COACHS
========================================================= */

function renderCoaches(coaches) {
  if (!coachGrid) {
    return;
  }

  if (!coaches || coaches.length === 0) {
    coachGrid.innerHTML = `
      <div class="empty-state">
        <h3>Aucun coach disponible</h3>
        <p>Les coachs approuvés apparaîtront ici.</p>
      </div>
    `;

    return;
  }

  coachGrid.innerHTML = coaches
    .map((coach) => {
      const photoHtml = coach.photo_url
        ? `
          <img
            src="${escapeHtml(coach.photo_url)}"
            alt="Photo du coach"
            class="coach-photo"
            loading="lazy"
          />
        `
        : `
          <div class="coach-photo coach-photo-placeholder">
            ${escapeHtml(
              (coach.name || 'C').charAt(0).toUpperCase()
            )}
          </div>
        `;

      return `
        <article class="coach-card">

          <div class="coach-card-photo">
            ${photoHtml}
          </div>

          <div class="coach-card-content">

            <h3>
              ${escapeHtml(coach.name || 'Coach')}
            </h3>

            <p class="coach-speciality">
              ${escapeHtml(
                coach.speciality || 'Coach accompagnant'
              )}
            </p>

            ${
              coach.bio
                ? `
                  <p>
                    ${escapeHtml(coach.bio)}
                  </p>
                `
                : ''
            }

            ${
              coach.rating_avg !== undefined &&
              coach.rating_avg !== null
                ? `
                  <div class="coach-rating">
                    ★ ${Number(coach.rating_avg).toFixed(1)}
                  </div>
                `
                : ''
            }

            <a
              href="/coach-profil.html?id=${encodeURIComponent(
                coach.id
              )}"
              class="btn btn-secondary"
            >
              Voir le profil
            </a>

          </div>

        </article>
      `;
    })
    .join('');
}

/* =========================================================
   CHARGEMENT DES DONNÉES
========================================================= */

async function loadContent() {
  const search = searchInput?.value.trim() || '';
  const category = categoryFilter?.value || '';

  const params = new URLSearchParams();

  if (search) {
    params.set('search', search);
  }

  if (category) {
    params.set('category', category);
  }

  const [
    confessionsResponse,
    coachesResponse,
    categoriesResponse
  ] = await Promise.all([
    fetch(`/api/confessions?${params.toString()}`, {
      credentials: 'include'
    }),
    fetch('/api/coaches', {
      credentials: 'include'
    }),
    fetch('/api/categories', {
      credentials: 'include'
    })
  ]);

  if (!confessionsResponse.ok) {
    throw new Error(
      'Impossible de charger les publications.'
    );
  }

  if (!coachesResponse.ok) {
    throw new Error(
      'Impossible de charger les coachs.'
    );
  }

  if (!categoriesResponse.ok) {
    throw new Error(
      'Impossible de charger les catégories.'
    );
  }

  const confessionsData =
    await confessionsResponse.json();

  const coachesData =
    await coachesResponse.json();

  const categoriesData =
    await categoriesResponse.json();

  const confessions =
    confessionsData.confessions ||
    confessionsData ||
    [];

  const coaches =
    coachesData.coaches ||
    coachesData ||
    [];

  const categories =
    categoriesData.categories ||
    categoriesData ||
    [];

  allConfessions = confessions;

  renderConfessions(allConfessions);
  renderCoaches(coaches);

  /*
   * Remplissage du sélecteur de catégories
   * uniquement si nécessaire.
   */
  if (
    confessionCategory &&
    confessionCategory.options.length <= 1
  ) {
    confessionCategory.innerHTML =
      '<option value="">Choisir une catégorie</option>' +
      categories
        .map(
          (item) => `
            <option value="${escapeHtml(item.id)}">
              ${escapeHtml(item.name)}
            </option>
          `
        )
        .join('');
  }

  /*
   * Le filtre de catégories peut également
   * être rempli dynamiquement.
   */
  if (
    categoryFilter &&
    categoryFilter.options.length <= 1
  ) {
    categoryFilter.innerHTML =
      '<option value="">Toutes les catégories</option>' +
      categories
        .map(
          (item) => `
            <option value="${escapeHtml(item.id)}">
              ${escapeHtml(item.name)}
            </option>
          `
        )
        .join('');
  }
}

/* =========================================================
   BOUTON "VOIR TOUTES LES PUBLICATIONS"
========================================================= */

if (showAllConfessionsButton) {
  showAllConfessionsButton.addEventListener(
    'click',
    () => {
      showAllConfessions = true;

      renderConfessions(allConfessions);
    }
  );
}

/* =========================================================
   RECHERCHE / FILTRE
========================================================= */

let searchTimeout;

if (searchInput) {
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(() => {
      showAllConfessions = false;

      loadContent().catch((error) => {
        console.error(error);

        showToast(
          'Impossible de mettre à jour les publications.',
          'error',
          'Erreur'
        );
      });
    }, 300);
  });
}

if (categoryFilter) {
  categoryFilter.addEventListener('change', () => {
    showAllConfessions = false;

    loadContent().catch((error) => {
      console.error(error);

      showToast(
        'Impossible de filtrer les publications.',
        'error',
        'Erreur'
      );
    });
  });
}

/* =========================================================
   FORMULAIRE DE PUBLICATION
========================================================= */

if (confessionForm) {
  confessionForm.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();

      const title =
        confessionForm.elements.title;

      const category =
        confessionForm.elements.category;

      const content =
        confessionForm.elements.content;

      const coach =
        confessionForm.elements.coachId;

      const image =
        confessionForm.elements.image;

      if (!title?.value.trim()) {
        showToast(
          'Ajoute un titre à ta publication.',
          'error',
          'Titre manquant'
        );

        return;
      }

      if (!category?.value) {
        showToast(
          'Choisis une catégorie.',
          'error',
          'Catégorie manquante'
        );

        return;
      }

      if (!content?.value.trim()) {
        showToast(
          'Écris le contenu de ta publication.',
          'error',
          'Contenu manquant'
        );

        return;
      }

      const submitButton =
        confessionForm.querySelector(
          'button[type="submit"]'
        );

      const originalButtonText =
        submitButton?.textContent ||
        'Publier ma publication';

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Publication...';
      }

      try {
        const formData = new FormData();

        formData.append(
          'title',
          title.value.trim()
        );

        formData.append(
          'category',
          category.value
        );

        formData.append(
          'content',
          content.value.trim()
        );

        formData.append(
          'coachId',
          coach?.value || ''
        );

        if (image?.files?.[0]) {
          formData.append(
            'image',
            image.files[0]
          );
        }

        const response = await fetch(
          '/api/confessions',
          {
            method: 'POST',
            credentials: 'include',
            body: formData
          }
        );

        const data =
          await response.json().catch(
            () => ({})
          );

        if (response.status === 401) {
          showToast(
            'Connecte-toi pour publier une publication.',
            'info',
            'Connexion requise'
          );

          return;
        }

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Impossible de publier cette publication.'
          );
        }

        confessionForm.reset();

        showAllConfessions = false;

        await loadContent();

        showToast(
          'Ta publication a bien été publiée.',
          'success',
          'Publication réussie'
        );

        /*
         * Retour vers la section des publications
         * après publication.
         */
        const confessionsSection =
          document.querySelector('#confessions');

        if (confessionsSection) {
          confessionsSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      } catch (error) {
        console.error(
          'Erreur publication :',
          error
        );

        showToast(
          error.message ||
            'Impossible de publier ta publication.',
          'error',
          'Erreur de publication'
        );
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent =
            originalButtonText ||
            'Publier ma publication';
        }
      }
    }
  );
}

/* =========================================================
   CLICS SUR LES PUBLICATIONS
========================================================= */

if (confessionGrid) {
  confessionGrid.addEventListener(
    'click',
    async (event) => {
      const button =
        event.target.closest(
          '[data-action]'
        );

      if (!button) {
        return;
      }

      const action =
        button.dataset.action;

      const confessionId =
        button.dataset.confessionId;

      if (!confessionId) {
        return;
      }

      if (action === 'like') {
        await toggleLike(
          confessionId,
          button
        );

        return;
      }

      if (action === 'favorite') {
        await toggleFavorite(
          confessionId,
          button
        );

        return;
      }

      if (action === 'comments') {
        const commentsSection =
          document.querySelector(
            `#comments-${CSS.escape(
              String(confessionId)
            )}`
          );

        if (commentsSection) {
          commentsSection.hidden =
            !commentsSection.hidden;
        }

        return;
      }

      if (action === 'reply') {
        const commentId =
          button.dataset.commentId;

        const replyContainer =
          button
            .closest('.comment')
            ?.querySelector(
              `[data-reply-to="${CSS.escape(
                String(commentId)
              )}"]`
            );

        if (replyContainer) {
          replyContainer.hidden =
            !replyContainer.hidden;
        }

        return;
      }

      if (action === 'comment-like') {
        const commentId =
          button.dataset.commentId;

        if (!commentId) {
          return;
        }

        await toggleCommentLike(
          commentId,
          button
        );
      }
    }
  );

  confessionGrid.addEventListener(
    'submit',
    async (event) => {
      const form =
        event.target.closest('form');

      if (!form) {
        return;
      }

      if (
        form.classList.contains(
          'comment-form'
        )
      ) {
        event.preventDefault();

        await submitComment(form);

        return;
      }

      if (
        form.classList.contains(
          'reply-form'
        )
      ) {
        event.preventDefault();

        await submitReply(form);
      }
    }
  );
}

/* =========================================================
   CONNEXION
========================================================= */

if (loginForm) {
  loginForm.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();

      const email =
        loginForm.elements.email;

      const password =
        loginForm.elements.password;

      if (
        !email?.value.trim() ||
        !password?.value
      ) {
        showToast(
          'Renseigne ton adresse email et ton mot de passe.',
          'error',
          'Champs manquants'
        );

        return;
      }

      const submitButton =
        loginForm.querySelector(
          'button[type="submit"]'
        );

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent =
          'Connexion...';
      }

      try {
        const response =
          await fetch(
            '/api/auth/login',
            {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type':
                  'application/json'
              },
              body: JSON.stringify({
                email:
                  email.value.trim(),
                password:
                  password.value
              })
            }
          );

        const data =
          await response.json().catch(
            () => ({})
          );

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Connexion impossible.'
          );
        }

        showToast(
          'Connexion réussie.',
          'success',
          'Bienvenue'
        );

        window.location.assign(
          '/profile.html'
        );
      } catch (error) {
        console.error(error);

        showToast(
          error.message ||
            'Connexion impossible.',
          'error',
          'Erreur'
        );
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent =
            'Se connecter';
        }
      }
    }
  );
}

/* =========================================================
   INSCRIPTION
========================================================= */

if (registerForm) {
  registerForm.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();

      const name =
        registerForm.elements.name;

      const email =
        registerForm.elements.email;

      const password =
        registerForm.elements.password;

      if (
        !name?.value.trim() ||
        !email?.value.trim() ||
        !password?.value
      ) {
        showToast(
          'Renseigne tous les champs.',
          'error',
          'Champs manquants'
        );

        return;
      }

      const submitButton =
        registerForm.querySelector(
          'button[type="submit"]'
        );

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent =
          'Création...';
      }

      try {
        const response =
          await fetch(
            '/api/auth/register',
            {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type':
                  'application/json'
              },
              body: JSON.stringify({
                name:
                  name.value.trim(),
                email:
                  email.value.trim(),
                password:
                  password.value
              })
            }
          );

        const data =
          await response.json().catch(
            () => ({})
          );

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Inscription impossible.'
          );
        }

        showToast(
          'Ton compte a été créé.',
          'success',
          'Inscription réussie'
        );

        window.location.assign(
          '/profile.html'
        );
      } catch (error) {
        console.error(error);

        showToast(
          error.message ||
            'Inscription impossible.',
          'error',
          'Erreur'
        );
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent =
            "S'inscrire";
        }
      }
    }
  );
}

/* =========================================================
   MOT DE PASSE OUBLIÉ
========================================================= */

if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener(
    'click',
    (event) => {
      event.preventDefault();

      window.location.assign(
        '/forgot-password.html'
      );
    }
  );
}

/* =========================================================
   INITIALISATION
========================================================= */

(async function init() {
  try {
    await updateAuthenticatedView();

    await loadContent();
  } catch (error) {
    console.error(
      'Erreur initialisation application :',
      error
    );

    showToast(
      error.message ||
        'Impossible de charger les données.',
      'error',
      'Erreur de chargement'
    );
  }
})();