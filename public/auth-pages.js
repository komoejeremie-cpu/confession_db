const form = document.querySelector('form[data-auth-form]');
const message = document.querySelector('[data-form-message]');
const submitButton = form?.querySelector('button[type="submit"]');
const coachFields = document.querySelector('#coach-fields');
const accountTypeInputs = [...document.querySelectorAll('input[name="accountType"]')];

function toggleCoachFields() {
  const isCoach = form?.querySelector('input[name="accountType"]:checked')?.value === 'COACH';
  if (!coachFields) return;
  coachFields.hidden = !isCoach;
  coachFields.querySelectorAll('input, textarea').forEach((field) => {
    field.required = isCoach;
  });
}

accountTypeInputs.forEach((input) => input.addEventListener('change', toggleCoachFields));
toggleCoachFields();

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  if (form.dataset.authForm === 'register' && formData.get('password') !== formData.get('passwordConfirmation')) {
    message.textContent = 'Les deux mots de passe ne correspondent pas.';
    message.className = 'form-message error';
    return;
  }
  submitButton.disabled = true;
  submitButton.textContent = form.dataset.authForm === 'register' ? 'Création...' : 'Connexion...';
  message.textContent = '';
  message.className = 'form-message';

  try {
    const response = await fetch(`/api/auth/${form.dataset.authForm}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(formData))
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Une erreur est survenue.');

    window.location.replace(data.role === 'ADMIN' ? '/admin.html' : '/profile.html');
  } catch (error) {
    message.textContent = error.message;
    message.classList.add('error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = form.dataset.authForm === 'register' ? 'Créer mon compte' : 'Se connecter';
  }
});
