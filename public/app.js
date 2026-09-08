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
const loginSection = document.querySelector('#connexion');
const appToast = document.querySelector('#app-toast');
const appToastTitle = document.querySelector('.app-toast-title');
const appToastMessage = document.querySelector('.app-toast-message');
const appToastClose = document.querySelector('.app-toast-close');
const authActionModal = document.querySelector('#auth-action-modal');
const authActionClose = document.querySelector('#auth-action-close');

let selectedCategory = '';
let toastTimer;
let currentUser = null;
let authCheckPromise;


/* =========================================================
   AUTHENTIFICATION
   ========================================================= */

async function getCurrentUser() {
  if (!authCheckPromise) {
    authCheckPromise = fetch('/api/auth/me')
      .then((response) => (
        response.ok
          ? response.json()
          : null
      ))
      .catch(() => null);
  }

  currentUser = await authCheckPromise;
  return currentUser;
}


function showAuthActionModal() {
  if (authActionModal) {
    authActionModal.hidden = false;
  }
}


function hideAuthActionModal() {
  if (authActionModal) {
    authActionModal.hidden = true;
  }
}


async function updateAuthenticatedView() {
  if (!loginSection) return;

  try {
    const user = await getCurrentUser();

    if (!user) return;

    loginSection.hidden = true;

    if (loginLink) {
      loginLink.textContent = `Bonjour ${user.name}`;
      loginLink.href =
        user.role === 'ADMIN'
          ? '/admin.html'
          : '/profile.html';
    }
  } catch (_error) {
    // Une session absente laisse la section connexion visible.
  }
}


/* =========================================================
   TOASTS
   ========================================================= */

function showToast(
  message,
  type = 'info',
  title = 'Information'
) {
  if (!appToast) return;

  window.clearTimeout(toastTimer);

  if (appToastTitle) {
    appToastTitle.textContent = title;
  }

  if (appToastMessage) {
    appToastMessage.textContent = message;
  }

  appToast.className = `app-toast ${type}`;
  appToast.hidden = false;

  toastTimer = window.setTimeout(() => {
    appToast.hidden = true;
  }, 5000);
}


appToastClose?.addEventListener('click', () => {
  appToast.hidden = true;
});


authActionClose?.addEventListener(
  'click',
  hideAuthActionModal
);


authActionModal?.addEventListener(
  'click',
  (event) => {
    if (event.target === authActionModal) {
      hideAuthActionModal();
    }
  }
);


/* =========================================================
   UTILITAIRES
   ========================================================= */

function escapeHtml(value = '') {
  return String(value).replace(
    /[&<>'"]/g,
    (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    })[character]
  );
}


function icon(name, size = 18) {
  const icons = {
    heart: `
      <svg
        viewBox="0 0 24 24"
        width="${size}"
        height="${size}"
        aria-hidden="true"
      >
        <path
          d="M20.8 8.7c0 5.5-8.8 10.2-8.8 10.2S3.2 14.2 3.2 8.7A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.8 2.3Z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    `,

    comment: `
      <svg
        viewBox="0 0 24 24"
        width="${size}"
        height="${size}"
        aria-hidden="true"
      >
        <path
          d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.7 8.7 0 0 1-3.5-.7L4 20l1.4-3.7A7.2 7.2 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    `,

    reply: `
      <svg
        viewBox="0 0 24 24"
        width="${size}"
        height="${size}"
        aria-hidden="true"
      >
        <path
          d="M9 8 4 12l5 4"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M4 12h9a6 6 0 0 1 6 6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    `,

    send: `
      <svg
        viewBox="0 0 24 24"
        width="${size}"
        height="${size}"
        aria-hidden="true"
      >
        <path
          d="m4 4 16 8-16 8 3-8-3-8Z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M7 12h13"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        />
      </svg>
    `,

    user: `
      <svg
        viewBox="0 0 24 24"
        width="${size}"
        height="${size}"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="8"
          r="3.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        />
        <path
          d="M5 20a7 7 0 0 1 14 0"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        />
      </svg>
    `,

    star: `
      <svg
        viewBox="0 0 24 24"
        width="${size}"
        height="${size}"
        aria-hidden="true"
      >
        <path
          d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linejoin="round"
        />
      </svg>
    `
  };

  return icons[name] || '';
}


function formatDate(value) {
  return new Intl.RelativeTimeFormat(
    'fr',
    { numeric: 'auto' }
  ).format(
    Math.round(
      (new Date(value) - Date.now()) / 86400000
    ),
    'day'
  );
}


/* =========================================================
   COMMENTAIRES
   ========================================================= */

function buildCommentTree(comments) {
  const map = new Map();

  comments.forEach((comment) => {
    map.set(Number(comment.id), {
      ...comment,
      id: Number(comment.id),
      parent_comment_id:
        comment.parent_comment_id
          ? Number(comment.parent_comment_id)
          : null,
      children: []
    });
  });

  const roots = [];

  map.forEach((comment) => {
    if (
      comment.parent_comment_id !== null &&
      map.has(comment.parent_comment_id)
    ) {
      map
        .get(comment.parent_comment_id)
        .children
        .push(comment);
    } else {
      roots.push(comment);
    }
  });

  return roots;
}


function renderCommentTree(
  comments,
  level = 0
) {
  if (!comments.length) {
    return `
      <div class="comments-empty">
        Aucun commentaire pour le moment.
      </div>
    `;
  }

  return comments.map((comment) => {
    const authorName = escapeHtml(
      comment.author_name || 'Utilisateur'
    );

    const content = escapeHtml(
      comment.content || ''
    );

    const likesCount = Number(
      comment.likes_count || 0
    );

    const liked = Boolean(comment.liked);

    const createdAt = comment.created_at
      ? new Date(
          comment.created_at
        ).toLocaleString(
          'fr-FR',
          {
            dateStyle: 'short',
            timeStyle: 'short'
          }
        )
      : '';

    return `
      <article
        class="comment-item"
        data-comment-id="${comment.id}"
      >

        <div class="comment-avatar">
          ${icon('user', 18)}
        </div>

        <div class="comment-body">

          <div class="comment-header">
            <strong class="comment-author">
              ${authorName}
            </strong>

            <time class="comment-date">
              ${escapeHtml(createdAt)}
            </time>
          </div>

          <div class="comment-content">
            ${content}
          </div>

          <div class="comment-actions">

            <button
              type="button"
              class="comment-action comment-like-button ${
                liked ? 'is-liked' : ''
              }"
              data-comment-id="${comment.id}"
              aria-label="Aimer le commentaire"
            >
              <span class="icon">
                ${icon('heart', 17)}
              </span>

              <span class="comment-like-count">
                ${likesCount}
              </span>
            </button>

            <button
              type="button"
              class="comment-action reply-button"
              data-comment-id="${comment.id}"
              aria-label="Répondre au commentaire"
            >
              <span class="icon">
                ${icon('reply', 17)}
              </span>

              <span>Répondre</span>
            </button>

          </div>

          <form
            class="reply-form"
            data-parent-comment-id="${comment.id}"
            hidden
          >
            <input
              type="text"
              name="content"
              maxlength="1000"
              placeholder="Écrire une réponse..."
              required
            >

            <button type="submit">
              ${icon('send', 17)}
              <span>Envoyer</span>
            </button>
          </form>

          ${
            comment.children?.length
              ? `
                <div class="comment-children">
                  ${renderCommentTree(
                    comment.children,
                    level + 1
                  )}
                </div>
              `
              : ''
          }

        </div>
      </article>
    `;
  }).join('');
}


async function loadComments(confessionId) {
  const commentsContainer =
    document.querySelector(
      `[data-comments-for="${confessionId}"]`
    );

  if (!commentsContainer) return;

  try {
    const response = await fetch(
      `/api/confessions/${confessionId}/comments`
    );

    const comments = await response.json();

    if (!response.ok) {
      throw new Error(
        comments.error ||
        'Impossible de charger les commentaires.'
      );
    }

    const tree = buildCommentTree(comments);

    commentsContainer.innerHTML =
      renderCommentTree(tree);

  } catch (error) {
    console.error(error);

    commentsContainer.innerHTML = `
      <div class="comments-error">
        Impossible de charger les commentaires.
      </div>
    `;
  }
}


/* =========================================================
   CONFESSIONS
   ========================================================= */

function renderConfessions(confessions) {
  if (confessionCount) {
    confessionCount.textContent =
      confessions.length;
  }

  if (!confessionGrid) return;

  if (!confessions.length) {
    confessionGrid.innerHTML = `
      <p class="empty-state">
        Aucune confession ne correspond à votre recherche.
      </p>
    `;

    return;
  }

  confessionGrid.innerHTML = confessions.map(
    (confession) => `
      <article
        class="confession-card"
        data-confession-id="${confession.id}"
      >

        <div class="card-top">

          <div class="anon">
            <span class="anon-icon">
              ${icon('user', 20)}
            </span>

            <div>
              <strong>Anonyme</strong>

              <small>
                ${formatDate(
                  confession.created_at
                )}
              </small>
            </div>
          </div>

          <span class="tag">
            ${escapeHtml(
              confession.category
            )}
          </span>

        </div>

        <h3>
          « ${escapeHtml(
            confession.title
          )} »
        </h3>

        <p>
          ${escapeHtml(
            confession.content
          )}
        </p>

        <div class="card-meta card-actions">

          <button
            type="button"
            class="interaction-button like-button"
            aria-label="Aimer la confession"
          >
            ${icon('heart', 18)}

            <span>
              ${confession.likes_count ?? 0}
            </span>
          </button>

          <button
            type="button"
            class="interaction-button comment-button"
            aria-label="Voir les commentaires"
          >
            ${icon('comment', 18)}

            <span>
              ${confession.comments_count ?? 0}
            </span>
          </button>

          <button
            type="button"
            class="interaction-button favorite-button"
            aria-label="Ajouter aux favoris"
          >
            ${icon('star', 18)}

            <span>
              Favori
            </span>
          </button>

        </div>

        <div
          class="comments-list"
          data-comments-for="${confession.id}"
        >
          <span class="comments-loading">
            Chargement des commentaires...
          </span>
        </div>

        <form
          class="comment-form"
          data-confession-id="${confession.id}"
          hidden
        >
          <input
            type="text"
            name="content"
            maxlength="1000"
            placeholder="Écrire un commentaire..."
            required
          >

          <button type="submit">
            ${icon('send', 17)}
            <span>Envoyer</span>
          </button>
        </form>

      </article>
    `
  ).join('');

  confessions.forEach((confession) => {
    loadComments(confession.id);
  });
}


/* =========================================================
   COACHS
   ========================================================= */

function renderCoaches(coaches) {
  if (coachCount) {
    coachCount.textContent =
      coaches.length;
  }

  if (!coachGrid) return;

  if (!coaches.length) {
    coachGrid.innerHTML = `
      <p class="empty-state">
        Aucun coach ne correspond à vos filtres.
      </p>
    `;

    return;
  }

  coachGrid.innerHTML = coaches.map(
    (coach) => `
      <article
        class="coach-card"
        data-coach-id="${coach.id}"
      >

        <div class="coach-head">

          <div class="coach-photo photo1">
            ${escapeHtml(
              coach.name
                .split(' ')
                .map((part) => part[0])
                .join('')
            )}
          </div>

          <div>
            <h3>
              ${escapeHtml(coach.name)}
            </h3>

            <span class="verified">
              ✓ Coach vérifié
            </span>

            <p>
              ▥ ${coach.years_experience}
              ans d'expérience
            </p>
          </div>

        </div>

        <div class="tags">
          ${
            (coach.specialties || [])
              .map(
                (tag) => `
                  <span>
                    ${escapeHtml(tag)}
                  </span>
                `
              )
              .join('')
          }
        </div>

        <div class="rating">
          ★★★★★
          <b>${coach.rating}</b>
          <small>
            (${coach.reviews_count} avis)
          </small>
        </div>

        <a
          href="#connexion"
          class="coach-link"
        >
          Voir le profil →
        </a>

      </article>
    `
  ).join('');
}


/* =========================================================
   CHARGEMENT DES DONNÉES
   ========================================================= */

async function loadContent() {
  const params = new URLSearchParams();

  if (selectedCategory) {
    params.set(
      'category',
      selectedCategory
    );
  }

  if (confessionSearch?.value) {
    params.set(
      'search',
      confessionSearch.value
    );
  }

  const [
    confessionsResponse,
    coachesResponse,
    categoriesResponse
  ] = await Promise.all([
    fetch(
      `/api/confessions?${params}`
    ),
    fetch('/api/coaches'),
    fetch('/api/categories')
  ]);

  if (
    !confessionsResponse.ok ||
    !coachesResponse.ok ||
    !categoriesResponse.ok
  ) {
    throw new Error(
      'Impossible de charger les données.'
    );
  }

  renderConfessions(
    await confessionsResponse.json()
  );

  const coaches =
    await coachesResponse.json();

  renderCoaches(coaches);

  const categories =
    await categoriesResponse.json();

  if (confessionCategory) {
    confessionCategory.innerHTML =
      '<option value="">Choisir une catégorie</option>' +
      categories
        .map(
          (category) => `
            <option value="${escapeHtml(
              category.name
            )}">
              ${escapeHtml(
                category.name
              )}
            </option>
          `
        )
        .join('');
  }

  if (
    coachSpecialty &&
    !coachSpecialty.options[1]
  ) {
    coachSpecialty.innerHTML += [
      ...new Set(
        coaches.flatMap(
          (coach) =>
            coach.specialties || []
        )
      )
    ]
      .map(
        (specialty) => `
          <option value="${escapeHtml(
            specialty
          )}">
            ${escapeHtml(specialty)}
          </option>
        `
      )
      .join('');
  }

  if (confessionCoach) {
    confessionCoach.innerHTML =
      '<option value="">Aucun coach</option>' +
      coaches
        .map(
          (coach) => `
            <option value="${coach.id}">
              ${escapeHtml(
                coach.name
              )}
              —
              ${coach.rating} ★
            </option>
          `
        )
        .join('');
  }
}


/* =========================================================
   PUBLICATION D'UNE CONFESSION
   ========================================================= */

confessionForm?.addEventListener(
  'submit',
  async (event) => {
    event.preventDefault();

    if (!await getCurrentUser()) {
      showAuthActionModal();
      return;
    }

    const button =
      confessionForm.querySelector(
        'button'
      );

    const title =
      confessionForm.elements.title;

    const category =
      confessionForm.elements.category;

    const content =
      confessionForm.elements.content;

    const coach =
      confessionForm.elements.coachId;

    button.disabled = true;
    button.textContent =
      'Publication...';

    try {
      const response = await fetch(
        '/api/confessions',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json'
          },
          body: JSON.stringify({
            title: title.value,
            category: category.value,
            content: content.value,
            coachId:
              coach.value || null
          })
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          'La publication a échoué.'
        );
      }

      confessionForm.reset();

      showToast(
        'Ta confession a été publiée anonymement.',
        'success',
        'Publication réussie'
      );

      await loadContent();

    } catch (error) {
      showToast(
        error.message,
        'error',
        'Publication impossible'
      );

    } finally {
      button.disabled = false;
      button.textContent =
        'Publier ma confession';
    }
  }
);


/* =========================================================
   FILTRES COACHS
   ========================================================= */

async function applyCoachFilters() {
  const params =
    new URLSearchParams();

  if (coachSearch?.value) {
    params.set(
      'search',
      coachSearch.value
    );
  }

  if (coachSpecialty?.value) {
    params.set(
      'specialty',
      coachSpecialty.value
    );
  }

  const response = await fetch(
    `/api/coaches?${params}`
  );

  if (!response.ok) {
    throw new Error(
      'Impossible de filtrer les coachs.'
    );
  }

  let coaches =
    await response.json();

  if (coachRating?.value) {
    coaches = coaches.filter(
      (coach) =>
        Number(coach.rating) >=
        Number(coachRating.value)
    );
  }

  if (coachExperience?.value) {
    coaches = coaches.filter(
      (coach) =>
        Number(
          coach.years_experience
        ) >=
        Number(
          coachExperience.value
        )
    );
  }

  renderCoaches(coaches);
}


/* =========================================================
   RECHERCHE ET CATÉGORIES
   ========================================================= */

confessionSearch?.addEventListener(
  'input',
  () => {
    loadContent().catch(() => {});
  }
);


chips.forEach((chip) => {
  chip.addEventListener(
    'click',
    () => {
      chips.forEach((item) => {
        item.classList.remove(
          'selected'
        );
      });

      chip.classList.add('selected');

      selectedCategory =
        chip.textContent.trim() ===
        'Toutes'
          ? ''
          : chip.textContent.trim();

      loadContent().catch(() => {});
    }
  );
});


toggleFiltersButton?.addEventListener(
  'click',
  () => {
    document
      .querySelector('.chips')
      ?.toggleAttribute('hidden');
  }
);


filterCoachesButton?.addEventListener(
  'click',
  () => {
    applyCoachFilters().catch(
      (error) => {
        showToast(
          error.message,
          'error',
          'Filtrage impossible'
        );
      }
    );
  }
);


/* =========================================================
   CONNEXION
   ========================================================= */

loginForm?.addEventListener(
  'submit',
  async (event) => {
    event.preventDefault();

    const button =
      loginForm.querySelector(
        'button'
      );

    button.disabled = true;

    try {
      const response = await fetch(
        '/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json'
          },
          body: JSON.stringify(
            Object.fromEntries(
              new FormData(loginForm)
            )
          )
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          'Connexion impossible.'
        );
      }

      window.location.replace(
        data.role === 'ADMIN'
          ? '/admin.html'
          : '/profile.html'
      );

    } catch (error) {
      showToast(
        error.message,
        'error',
        'Connexion impossible'
      );

    } finally {
      button.disabled = false;
    }
  }
);


/* =========================================================
   MOT DE PASSE OUBLIÉ
   ========================================================= */

/*
 * IMPORTANT :
 * L'ancien code affichait :
 *
 * "La récupération du mot de passe sera disponible prochainement."
 *
 * Maintenant la fonctionnalité existe réellement.
 * Le lien doit ouvrir la page de récupération.
 */

forgotPasswordLink?.addEventListener(
  'click',
  (event) => {
    event.preventDefault();

    window.location.href =
      '/forgot-password.html';
  }
);


/* =========================================================
   CONNEXION GOOGLE
   ========================================================= */

googleLoginButton?.addEventListener(
  'click',
  () => {
    showToast(
      'La connexion Google nécessite la configuration OAuth du projet.',
      'info',
      'Connexion Google'
    );
  }
);


/* =========================================================
   ACTIONS SUR LES COMMENTAIRES ET CONFESSIONS
   ========================================================= */

document.addEventListener(
  'click',
  async (event) => {
    if (
      !(event.target instanceof Element)
    ) {
      return;
    }


    /* -----------------------------------------------------
       LIKE COMMENTAIRE
       ----------------------------------------------------- */

    const commentLikeButton =
      event.target.closest(
        '.comment-like-button'
      );

    if (commentLikeButton) {
      const comment =
        commentLikeButton.closest(
          '[data-comment-id]'
        );

      const card =
        comment?.closest(
          '[data-confession-id]'
        );

      if (!comment || !card) return;

      const confessionId =
        card.dataset.confessionId;

      const commentId =
        comment.dataset.commentId;

      if (!await getCurrentUser()) {
        showAuthActionModal();
        return;
      }

      try {
        const response =
          await fetch(
            `/api/confessions/${confessionId}/comments/${commentId}/like`,
            {
              method: 'POST'
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
            'Action impossible.'
          );
        }

        commentLikeButton.classList.toggle(
          'active',
          data.liked
        );

        const count =
          commentLikeButton.querySelector(
            '.comment-like-count'
          );

        if (count) {
          count.textContent =
            data.likes_count;
        }

      } catch (error) {
        showToast(
          error.message,
          'error',
          'Action impossible'
        );
      }

      return;
    }


    /* -----------------------------------------------------
       RÉPONDRE À UN COMMENTAIRE
       ----------------------------------------------------- */

    const replyButton =
      event.target.closest(
        '.reply-button'
      );

    if (replyButton) {
      const comment =
        replyButton.closest(
          '[data-comment-id]'
        );

      if (!comment) return;

      if (!await getCurrentUser()) {
        showAuthActionModal();
        return;
      }

      const replyForm =
        comment.querySelector(
          '.reply-form'
        );

      if (!replyForm) return;

      replyForm.hidden =
        !replyForm.hidden;

      if (!replyForm.hidden) {
        const input =
          replyForm.querySelector(
            'input[name="content"]'
          );

        if (input) {
          input.focus();
        }
      }

      return;
    }


    /* -----------------------------------------------------
       ACTIONS SUR LES CONFESSIONS
       ----------------------------------------------------- */

    const button =
      event.target.closest(
        '.like-button, .favorite-button, .comment-button'
      );

    if (!button) return;

    const card =
      button.closest(
        '[data-confession-id]'
      );

    if (!card) return;

    const id =
      card.dataset.confessionId;

    if (!await getCurrentUser()) {
      showAuthActionModal();
      return;
    }


    /* -----------------------------------------------------
       OUVRIR / FERMER COMMENTAIRES
       ----------------------------------------------------- */

    if (
      button.classList.contains(
        'comment-button'
      )
    ) {
      const form =
        card.querySelector(
          '.comment-form'
        );

      if (!form) return;

      form.hidden =
        !form.hidden;

      if (!form.hidden) {
        const input =
          form.querySelector(
            'input[name="content"]'
          );

        if (input) {
          input.focus();
        }
      }

      return;
    }


    /* -----------------------------------------------------
       LIKE OU FAVORI
       ----------------------------------------------------- */

    const endpoint =
      button.classList.contains(
        'like-button'
      )
        ? 'like'
        : 'favorite';

    try {
      const response =
        await fetch(
          `/api/confessions/${id}/${endpoint}`,
          {
            method: 'POST'
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          'Action impossible.'
        );
      }

      if (endpoint === 'like') {
        button.classList.toggle(
          'active',
          data.liked
        );

        const count =
          button.querySelector(
            'span'
          );

        if (count) {
          count.textContent =
            data.likes_count;
        }

      } else {
        button.classList.toggle(
          'active',
          data.favorite
        );
      }

    } catch (error) {
      showToast(
        error.message,
        'error',
        'Action impossible'
      );
    }
  }
);


/* =========================================================
   COMMENTAIRES / RÉPONSES
   ========================================================= */

document.addEventListener(
  'submit',
  async (event) => {
    if (
      !(event.target instanceof HTMLFormElement) ||
      !event.target.matches(
        '.comment-form, .reply-form'
      )
    ) {
      return;
    }

    event.preventDefault();

    if (!await getCurrentUser()) {
      showAuthActionModal();
      return;
    }

    const form = event.target;

    const card =
      form.closest(
        '[data-confession-id]'
      );

    if (!card) return;

    const confessionId =
      card.dataset.confessionId;

    const input =
      form.elements.content;

    if (!input) return;

    const content =
      input.value.trim();

    if (!content) {
      return;
    }

    const parentCommentId =
      form.classList.contains(
        'reply-form'
      )
        ? Number(
            form.dataset.parentCommentId
          )
        : null;

    try {
      const response =
        await fetch(
          `/api/confessions/${confessionId}/comments`,
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json'
            },
            body: JSON.stringify({
              content,
              parentCommentId
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          'Commentaire impossible.'
        );
      }

      form.reset();
      form.hidden = true;

      showToast(
        form.classList.contains(
          'reply-form'
        )
          ? 'Votre réponse est maintenant visible par la communauté.'
          : 'Votre commentaire est maintenant visible par la communauté.',
        'success',
        form.classList.contains(
          'reply-form'
        )
          ? 'Réponse publiée'
          : 'Commentaire publié'
      );

      await loadComments(
        confessionId
      );

    } catch (error) {
      console.error(error);

      showToast(
        error.message,
        'error',
        form.classList.contains(
          'reply-form'
        )
          ? 'Réponse impossible'
          : 'Commentaire impossible'
      );
    }
  }
);


/* =========================================================
   INSCRIPTION
   ========================================================= */

showSignupLink?.addEventListener(
  'click',
  (event) => {
    event.preventDefault();

    signupForm.hidden = false;

    signupForm
      .querySelector('input')
      ?.focus();
  }
);


hideSignupLink?.addEventListener(
  'click',
  (event) => {
    event.preventDefault();

    signupForm.hidden = true;
  }
);


signupForm?.addEventListener(
  'submit',
  async (event) => {
    event.preventDefault();

    const button =
      signupForm.querySelector(
        'button'
      );

    const formData =
      new FormData(signupForm);

    if (
      formData.get('password') !==
      formData.get(
        'passwordConfirmation'
      )
    ) {
      showToast(
        'Les deux mots de passe ne correspondent pas.',
        'error',
        'Inscription impossible'
      );

      return;
    }

    button.disabled = true;
    button.textContent =
      'Création...';

    signupMessage.textContent = '';
    signupMessage.className =
      'form-message';

    try {
      const response =
        await fetch(
          '/api/auth/register',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json'
            },
            body: JSON.stringify(
              Object.fromEntries(
                formData
              )
            )
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          'L’inscription a échoué.'
        );
      }

      window.location.assign(
        '/profile.html'
      );

    } catch (error) {
      signupMessage.textContent =
        error.message;

      signupMessage.classList.add(
        'error'
      );

    } finally {
      button.disabled = false;
      button.textContent =
        'Créer mon compte';
    }
  }
);


/* =========================================================
   INITIALISATION
   ========================================================= */

updateAuthenticatedView();

loadContent().catch(() => {
  // Le HTML conserve ses données de démonstration
  // tant que la base n'est pas configurée.
});