const form = document.querySelector('#reset-password-form');
const message = document.querySelector('#reset-password-message');
const submitButton = form?.querySelector('button[type="submit"]');

const token = new URLSearchParams(window.location.search).get('token');

if (!token) {
  message.textContent =
    'Lien de réinitialisation invalide ou incomplet.';
  message.classList.add('error');

  if (form) {
    form.hidden = true;
  }
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(form);

  const password = formData.get('password');
  const passwordConfirmation =
    formData.get('passwordConfirmation');

  if (password !== passwordConfirmation) {
    message.textContent =
      'Les deux mots de passe ne correspondent pas.';
    message.className = 'form-message error';
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Réinitialisation...';

  message.textContent = '';
  message.className = 'form-message';

  try {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token,
        password,
        passwordConfirmation
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || 'Une erreur est survenue.'
      );
    }

    message.textContent = data.message;
    message.classList.add('success');

    form.reset();

    setTimeout(() => {
      window.location.replace('/login.html');
    }, 2000);

  } catch (error) {
    message.textContent = error.message;
    message.classList.add('error');

  } finally {
    submitButton.disabled = false;
    submitButton.textContent =
      'Réinitialiser mon mot de passe';
  }
});