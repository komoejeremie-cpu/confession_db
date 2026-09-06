const form = document.querySelector('#admin-login-form');
const message = document.querySelector('#admin-login-message');
const button = form.querySelector('button');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  button.disabled = true;
  button.textContent = 'Vérification...';
  message.textContent = '';
  message.className = 'form-message';

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form)))
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Connexion impossible.');
    if (data.role !== 'ADMIN') {
      await fetch('/api/auth/logout', { method: 'POST' });
      throw new Error('Ce compte ne possède pas les droits administrateur.');
    }
    window.location.replace('/admin.html');
  } catch (error) {
    message.textContent = error.message;
    message.classList.add('error');
  } finally {
    button.disabled = false;
    button.textContent = 'Accéder à l’administration';
  }
});
