const form = document.querySelector('#forgot-password-form');
const message = document.querySelector('#forgot-password-message');
const submitButton = form?.querySelector('button[type="submit"]');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const email = formData.get('email')?.trim();

  submitButton.disabled = true;
  submitButton.textContent = 'Envoi...';

  message.textContent = '';
  message.className = 'form-message';

  try {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
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

  } catch (error) {
    message.textContent = error.message;
    message.classList.add('error');

  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Envoyer le lien';
  }
});