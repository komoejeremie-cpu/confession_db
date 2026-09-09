const coachName =
  document.querySelector('#coach-name');

const coachSpeciality =
  document.querySelector('#coach-speciality');

const coachBio =
  document.querySelector('#coach-bio');

const coachExperience =
  document.querySelector('#coach-experience');

const coachRating =
  document.querySelector('#coach-rating');

const coachReviews =
  document.querySelector('#coach-reviews');

const coachPhoto =
  document.querySelector('#coach-photo');

const coachPhotoPlaceholder =
  document.querySelector(
    '#coach-photo-placeholder'
  );

const coachPhotoSection =
  document.querySelector(
    '#coach-photo-section'
  );

const coachPhotoForm =
  document.querySelector(
    '#coach-photo-form'
  );

const coachPhotoInput =
  document.querySelector(
    '#coach-photo-input'
  );

const errorContainer =
  document.querySelector(
    '#coach-profile-error'
  );

  const coachRatingForm =
  document.querySelector(
    '#coach-rating-form'
  );

const coachRatingInput =
  document.querySelector(
    '#coach-rating-input'
  );

const coachRatingComment =
  document.querySelector(
    '#coach-rating-comment'
  );

const coachRatingMessage =
  document.querySelector(
    '#coach-rating-message'
  );

  const coachReviewsList =
  document.querySelector(
    '#coach-reviews-list'
  );

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getCoachId() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  return params.get('id');
}

function renderRating(rating) {
  const value =
    Number(rating || 0);

  const rounded =
    Math.round(value);

  const stars =
    '★'.repeat(rounded) +
    '☆'.repeat(5 - rounded);

  return `
    <span class="rating-stars">
      ${stars}
    </span>

    <strong>
      ${value.toFixed(1)}
    </strong>
  `;
}

if (coachRatingForm) {
  coachRatingForm.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();

      const coachId = getCoachId();
      const rating = Number(
        coachRatingInput?.value
      );
      const comment =
        coachRatingComment?.value.trim() || '';

      if (!coachId) {
        return;
      }

      if (
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
      ) {
        showRatingMessage(
          'Choisis une note entre 1 et 5.',
          true
        );
        return;
      }

      const submitButton =
        coachRatingForm.querySelector(
          'button[type="submit"]'
        );

      const originalText =
        submitButton?.textContent ||
        'Publier mon avis';

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent =
          'Publication...';
      }

      try {
        const response =
          await fetch(
            `/api/coaches/${encodeURIComponent(
              coachId
            )}/rating`,
            {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type':
                  'application/json'
              },
              body: JSON.stringify({
                rating,
                comment
              })
            }
          );

        const data =
          await response.json()
            .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Impossible de publier ton avis.'
          );
        }

        showRatingMessage(
          'Ton avis a bien été publié.'
        );

        coachRatingForm.reset();

        async function loadReviews() {
  const coachId = getCoachId();

  if (!coachId || !coachReviewsList) {
    return;
  }

  try {
    const response = await fetch(
      `/api/coaches/${encodeURIComponent(coachId)}/ratings`
    );

    const reviews = await response.json();

    if (!response.ok) {
      throw new Error(
        reviews.error ||
          'Impossible de charger les avis.'
      );
    }

    if (!reviews.length) {
      coachReviewsList.innerHTML = `
        <p class="empty-state">
          Aucun avis pour le moment.
        </p>
      `;
      return;
    }

    coachReviewsList.innerHTML =
      reviews.map((review) => {
        const rating =
          Number(review.rating || 0);

        const stars =
          '★'.repeat(rating) +
          '☆'.repeat(5 - rating);

        const date =
          review.created_at
            ? new Date(
                review.created_at
              ).toLocaleDateString('fr-FR')
            : '';

        return `
          <article class="coach-review">
            <div class="coach-review-header">
              <strong>
                ${escapeHtml(
                  review.user_name ||
                    'Utilisateur'
                )}
              </strong>

              <span class="rating-stars">
                ${stars}
              </span>
            </div>

            ${
              review.comment
                ? `
                  <p>
                    ${escapeHtml(
                      review.comment
                    )}
                  </p>
                `
                : ''
            }

            <small>
              ${date}
            </small>
          </article>
        `;
      }).join('');
  } catch (error) {
    console.error(error);

    coachReviewsList.innerHTML = `
      <p class="empty-state">
        Impossible de charger les avis.
      </p>
    `;
  }
}

        loadCoach();
        loadReviews();
      } catch (error) {
        console.error(error);

        showRatingMessage(
          error.message ||
            'Impossible de publier ton avis.',
          true
        );
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent =
            originalText;
        }
      }
    }
  );
}

function showRatingMessage(
  message,
  isError = false
) {
  if (!coachRatingMessage) {
    return;
  }

  coachRatingMessage.textContent =
    message;

  coachRatingMessage.hidden = false;

  coachRatingMessage.classList.toggle(
    'error',
    isError
  );
}

async function loadCoach() {
  const coachId =
    getCoachId();

  if (!coachId) {
    showError();
    return;
  }

  try {
    const response =
      await fetch(
        `/api/coaches/${encodeURIComponent(
          coachId
        )}`
      );

    if (!response.ok) {
      throw new Error(
        'Coach introuvable.'
      );
    }

    const coach =
      await response.json();

    renderCoach(coach);

    await checkCurrentUser();
  } catch (error) {
    console.error(error);

    showError();
  }
}



function renderCoach(coach) {
  if (coachName) {
    coachName.textContent =
      coach.name || 'Coach';
  }

  if (coachSpeciality) {
    coachSpeciality.textContent =
      coach.speciality ||
      'Coach accompagnant';
  }

  if (coachBio) {
    coachBio.textContent =
      coach.bio ||
      'Aucune présentation disponible.';
  }

  if (coachExperience) {
    coachExperience.textContent =
      coach.experience ?? 0;
  }

  if (coachRating) {
    coachRating.innerHTML =
      renderRating(
        coach.rating
      );
  }

  if (coachReviews) {
    const count =
      Number(
        coach.reviews_count || 0
      );

    coachReviews.textContent =
      `${count} avis`;
  }

  if (coach.photo_url) {
    coachPhoto.src =
      coach.photo_url;

    coachPhoto.hidden = false;

    coachPhotoPlaceholder.hidden =
      true;
  } else {
    coachPhoto.hidden = true;

    coachPhotoPlaceholder.hidden =
      false;

    coachPhotoPlaceholder.textContent =
      (coach.name || 'C')
        .charAt(0)
        .toUpperCase();
  }
}

async function checkCurrentUser() {
  try {
    const response =
      await fetch(
        '/api/auth/me',
        {
          credentials: 'include'
        }
      );

    if (!response.ok) {
      return;
    }

    const data =
      await response.json();

    const user =
      data.user || data;

    if (
      user?.role === 'COACH'
    ) {
      coachPhotoSection.hidden =
        false;
    }
  } catch (error) {
    console.error(
      'Erreur authentification :',
      error
    );
  }
}

function showError() {
  const profile =
    document.querySelector(
      '#coach-profile'
    );

  if (profile) {
    profile.classList.add(
      'profile-not-found'
    );
  }

  if (errorContainer) {
    errorContainer.hidden = false;
  }

  if (coachName) {
    coachName.textContent = '';
  }
}

if (coachPhotoForm) {
  coachPhotoForm.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();

      const file =
        coachPhotoInput?.files?.[0];

      if (!file) {
        alert(
          'Sélectionne une image.'
        );

        return;
      }

      if (
        !file.type.startsWith(
          'image/'
        )
      ) {
        alert(
          'Le fichier doit être une image.'
        );

        return;
      }

      if (
        file.size >
        5 * 1024 * 1024
      ) {
        alert(
          'La photo ne doit pas dépasser 5 Mo.'
        );

        return;
      }

      const submitButton =
        coachPhotoForm.querySelector(
          'button[type="submit"]'
        );

      const originalText =
        submitButton?.textContent ||
        'Mettre à jour ma photo';

      if (submitButton) {
        submitButton.disabled =
          true;

        submitButton.textContent =
          'Envoi...';
      }

      try {
        const formData =
          new FormData();

        formData.append(
          'photo',
          file
        );

        const response =
          await fetch(
            '/api/coaches/profile/photo',
            {
              method: 'POST',
              credentials: 'include',
              body: formData
            }
          );

        const data =
          await response.json()
            .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Impossible de mettre à jour la photo.'
          );
        }

        if (data.photo_url) {
          coachPhoto.src =
            data.photo_url;

          coachPhoto.hidden =
            false;

          coachPhotoPlaceholder.hidden =
            true;
        }

        coachPhotoForm.reset();

        alert(
          'Photo de profil mise à jour.'
        );
      } catch (error) {
        console.error(error);

        alert(
          error.message ||
            'Impossible de mettre à jour la photo.'
        );
      } finally {
        if (submitButton) {
          submitButton.disabled =
            false;

          submitButton.textContent =
            originalText;
        }
      }
    }
  );
}

loadCoach();