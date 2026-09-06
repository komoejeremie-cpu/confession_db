const form = document.querySelector('form[data-auth-form]');
const message = document.querySelector('[data-form-message]');
const submitButton = form?.querySelector('button[type="submit"]');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  submitButton.textContent = form.dataset.authForm === 'register' ? 'Création...' : 'Connexion...';
  message.textContent = '';
  message.className = 'form-message';

  try {
    const response = await fetch(`/api/auth/${form.dataset.authForm}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form)))
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Une erreur est survenue.');

    window.location.assign('/profile.html');
  } catch (error) {
    message.textContent = error.message;
    message.classList.add('error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = form.dataset.authForm === 'register' ? 'Créer mon compte' : 'Se connecter';
  }
});
