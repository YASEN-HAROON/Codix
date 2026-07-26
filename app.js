// app.js
// Talks to the backend (server.js) for signup/login. Included by both
// index.html (login) and signup.html.

function showError(message) {
  let el = document.querySelector('.form-error');
  if (!el) {
    el = document.createElement('div');
    el.className = 'form-error';
    const form = document.querySelector('form');
    form.insertBefore(el, form.firstChild);
  }
  el.textContent = message;
  el.style.display = 'block';
}

function clearError() {
  const el = document.querySelector('.form-error');
  if (el) el.style.display = 'none';
}

function setLoading(button, loading, loadingText, defaultText) {
  button.disabled = loading;
  button.textContent = loading ? loadingText : defaultText;
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // send/receive the auth cookie
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}

// ---------- Login page ----------
const loginForm = document.querySelector('[data-form="login"]');
if (loginForm) {
  const btn = loginForm.querySelector('.btn');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();
    const email = loginForm.querySelector('input[type="email"]').value.trim();
    const password = loginForm.querySelector('input[type="password"]').value;

    if (!email || !password) {
      showError('Please enter your email and password.');
      return;
    }

    setLoading(btn, true, 'LOGGING IN…', 'LOG IN →');
    try {
      const { user } = await postJSON('/api/login', { email, password });
      window.location.href = '/dashboard.html';
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(btn, false, 'LOGGING IN…', 'LOG IN →');
    }
  });
}

// ---------- Signup page ----------
const signupForm = document.querySelector('[data-form="signup"]');
if (signupForm) {
  const btn = signupForm.querySelector('.btn');
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();
    const full_name = signupForm.querySelector('input[type="text"]').value.trim();
    const [emailInput] = signupForm.querySelectorAll('input[type="email"]');
    const [passwordInput, confirmInput] = signupForm.querySelectorAll('input[type="password"]');

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirm_password = confirmInput.value;

    if (!full_name || !email || !password || !confirm_password) {
      showError('Please fill in every field.');
      return;
    }
    if (password !== confirm_password) {
      showError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      showError('Password must be at least 8 characters.');
      return;
    }

    setLoading(btn, true, 'CREATING ACCOUNT…', 'CREATE ACCOUNT →');
    try {
      const { user } = await postJSON('/api/signup', {
        full_name,
        email,
        password,
        confirm_password,
      });
      window.location.href = '/dashboard.html';
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(btn, false, 'CREATING ACCOUNT…', 'CREATE ACCOUNT →');
    }
  });
}
