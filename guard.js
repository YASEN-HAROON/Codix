// guard.js
// Included by every protected page (dashboard, profile, projects,
// settings). It does three things:
//   1. Confirms there's a real session by calling /api/me — if not,
//      it bounces the visitor back to the login page immediately.
//   2. Fills in any user-specific placeholders it finds on the page
//      (name, initial, email) with the real logged-in user's data.
//   3. Wires the sidebar "Log out" link to actually call /api/logout.
//
// Pages don't all have the same elements, so every lookup below is
// optional — if an id isn't present on a given page, it's just skipped.

(async function guard() {
  try {
    const res = await fetch('/api/me', { credentials: 'include' });
    if (!res.ok) throw new Error('not authenticated');
    const { user } = await res.json();
    applyUserToPage(user);
  } catch {
    window.location.href = '/index.html';
  }
})();

function applyUserToPage(user) {
  const firstName = user.full_name.split(' ')[0];
  const initial = firstName.charAt(0).toUpperCase();

  // Dashboard greeting, e.g. "Welcome back, Sara"
  const subtitle = document.getElementById('welcome-subtitle');
  if (subtitle) subtitle.textContent = `Welcome back, ${firstName}`;

  // Avatar circles (dashboard header + profile hero) — just show the initial
  document.querySelectorAll('#user-avatar, #profile-avatar').forEach((el) => {
    el.textContent = initial;
  });

  // Profile page: name, "joined" date, and form fields
  const profileName = document.getElementById('profile-name');
  if (profileName) profileName.textContent = user.full_name;

  const profileMeta = document.getElementById('profile-meta');
  if (profileMeta && user.created_at) {
    const joined = new Date(user.created_at).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    profileMeta.textContent = `Joined ${joined}`;
  }

  const fullNameInput = document.getElementById('input-full-name');
  if (fullNameInput) fullNameInput.value = user.full_name;

  const displayNameInput = document.getElementById('input-display-name');
  if (displayNameInput) displayNameInput.value = firstName;

  const emailInput = document.getElementById('input-email');
  if (emailInput) emailInput.value = user.email;
}

// Log out from the sidebar on every protected page
const logoutLink = document.getElementById('logout-link');
if (logoutLink) {
  logoutLink.addEventListener('click', async (e) => {
    e.preventDefault();
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/index.html';
  });
}
