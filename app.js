// Codix frontend — talks to the real backend API (see /api).
(function () {
  'use strict';

  const page = document.body.dataset.page;

  // ---------- helpers ----------

  async function api(path, options = {}) {
    const res = await fetch(path, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok) {
      const err = new Error((data && data.error) || 'Something went wrong.');
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function showFormError(message) {
    const el = document.getElementById('formError');
    if (!el) return;
    if (!message) {
      el.style.display = 'none';
      el.textContent = '';
      return;
    }
    el.textContent = message;
    el.style.display = 'block';
  }

  async function wireLogout() {
    const btn = document.getElementById('logoutBtn');
    if (!btn) return;
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await api('/api/auth/logout', { method: 'POST' });
      } catch {
        // ignore — redirect regardless
      }
      window.location.href = 'index.html';
    });
  }

  // Ensures the visitor is logged in; redirects to login if not.
  // Returns the current user object, or null (and redirects) if unauthenticated.
  async function requireSession() {
    try {
      return await api('/api/auth/me');
    } catch {
      window.location.href = 'index.html';
      return null;
    }
  }

  function statusLabel(status) {
    if (status === 'completed') return 'Completed';
    if (status === 'hold') return 'On hold';
    return 'In progress';
  }

  function relativeTime(dateStr) {
    const then = new Date(dateStr);
    const diffMs = Date.now() - then.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.round(diffMins / 60);
    if (diffHrs < 24) return diffHrs === 1 ? 'today' : `${diffHrs}h ago`;
    const diffDays = Math.round(diffHrs / 24);
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.round(diffDays / 7)}w ago`;
  }

  // ---------- LOGIN PAGE ----------
  function initLogin() {
    const form = document.querySelector('form[data-form="login"]');
    if (!form) return;
    const btn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      showFormError('');
      const email = form.querySelector('input[name="email"]').value.trim();
      const password = form.querySelector('input[name="password"]').value;

      btn.disabled = true;
      const originalText = btn.textContent;
      btn.textContent = 'Logging in…';

      try {
        await api('/api/auth/login', { method: 'POST', body: { email, password } });
        window.location.href = 'dashboard.html';
      } catch (err) {
        showFormError(err.message);
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  }

  // ---------- SIGNUP PAGE ----------
  function initSignup() {
    const form = document.querySelector('form[data-form="signup"]');
    if (!form) return;
    const btn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      showFormError('');
      const fullName = form.querySelector('input[name="fullName"]').value.trim();
      const email = form.querySelector('input[name="email"]').value.trim();
      const password = form.querySelector('input[name="password"]').value;
      const confirmPassword = form.querySelector('input[name="confirmPassword"]').value;

      if (password !== confirmPassword) {
        showFormError('Passwords do not match.');
        return;
      }

      btn.disabled = true;
      const originalText = btn.textContent;
      btn.textContent = 'Creating account…';

      try {
        await api('/api/auth/signup', {
          method: 'POST',
          body: { fullName, email, password, confirmPassword },
        });
        window.location.href = 'dashboard.html';
      } catch (err) {
        showFormError(err.message);
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  }

  // ---------- DASHBOARD PAGE ----------
  async function initDashboard() {
    wireLogout();
    const user = await requireSession();
    if (!user) return;

    const avatarLetter = user.avatar_letter || (user.full_name || '?')[0].toUpperCase();
    document.getElementById('headerAvatar').textContent = avatarLetter;
    document.getElementById('welcomeSubtitle').textContent =
      `Welcome back${user.display_name ? ', ' + user.display_name : ''}`;

    let data;
    try {
      data = await api('/api/dashboard');
    } catch (err) {
      document.getElementById('taskList').innerHTML = `<p class="empty-state">${escapeHtml(err.message)}</p>`;
      return;
    }

    document.getElementById('statProjects').textContent = data.stats.projectsCount;
    document.getElementById('statTeam').textContent = data.stats.teamMembers;
    document.getElementById('statTasksDone').textContent = data.stats.tasksDone;
    document.getElementById('statHours').textContent = data.stats.hoursLogged;

    renderTopProjects(data.topProjects);
    renderLeaderboard(data.leaderboard);
    renderTasks(data.tasks);

    document.getElementById('addTaskBtn').addEventListener('click', async () => {
      const text = window.prompt('New task:');
      if (!text || !text.trim()) return;
      try {
        const task = await api('/api/tasks', { method: 'POST', body: { text: text.trim() } });
        const list = document.getElementById('taskList');
        const empty = list.querySelector('.empty-state');
        if (empty) empty.remove();
        list.insertAdjacentHTML('afterbegin', taskItemHtml(task));
        bindTaskRow(document.getElementById(`task-${task.id}`));
      } catch (err) {
        alert(err.message);
      }
    });
  }

  function renderTopProjects(projects) {
    const container = document.getElementById('topProjectsList');
    if (!projects.length) {
      container.innerHTML = '<p class="empty-state">No projects yet. Create one from the Projects page.</p>';
      return;
    }
    container.innerHTML = projects.map((p) => {
      const pct = Math.max(0, Math.min(100, Number(p.progress) || 0));
      const dash = 100 - pct;
      const doneCount = Number(p.done_count) || 0;
      const taskCount = Number(p.task_count) || 0;
      const subtitle = p.status === 'completed' ? 'Completed' : `${taskCount - doneCount} tasks remaining`;
      return `
        <div class="project-item">
          <div class="project-color" style="background:${escapeHtml(p.color)}"></div>
          <div class="project-info">
            <h3>${escapeHtml(p.name)}</h3>
            <p>${escapeHtml(subtitle)}</p>
          </div>
          <div class="progress-ring">
            <svg width="40" height="40">
              <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="3"/>
              <circle cx="20" cy="20" r="16" fill="none" stroke="${escapeHtml(p.color)}" stroke-width="3"
                stroke-dasharray="100" stroke-dashoffset="${dash}" stroke-linecap="round"
                transform="rotate(-90 20 20)"/>
            </svg>
            <span>${pct}%</span>
          </div>
        </div>`;
    }).join('');
  }

  function renderLeaderboard(entries) {
    const container = document.getElementById('leaderboardList');
    if (!entries.length) {
      container.innerHTML = '<p class="empty-state">No leaderboard data yet.</p>';
      return;
    }
    container.innerHTML = entries.map((e, i) => {
      const rank = i + 1;
      const rankClass = rank <= 3 ? ` rank-${rank}` : '';
      const name = e.display_name || 'User';
      const score = Number(e.completed) * 30; // simple points weighting
      return `
        <div class="leader-item${rankClass}">
          <span class="rank">${rank}</span>
          <div class="leader-avatar">${escapeHtml(e.avatar_letter || name[0].toUpperCase())}</div>
          <div class="leader-info">
            <h3>${escapeHtml(name)}</h3>
            <p>${e.completed} tasks completed</p>
          </div>
          <span class="leader-score">${score.toLocaleString()}</span>
        </div>`;
    }).join('');
  }

  function taskItemHtml(task) {
    return `
      <label class="task-item" id="task-${task.id}" data-id="${task.id}">
        <input type="checkbox" ${task.done ? 'checked' : ''}>
        <span class="checkmark"></span>
        <span class="task-text">${escapeHtml(task.text)}</span>
        <span class="task-tag">${escapeHtml(task.tag)}</span>
        <button type="button" class="task-item-delete" title="Delete task">✕</button>
      </label>`;
  }

  function renderTasks(tasks) {
    const container = document.getElementById('taskList');
    if (!tasks.length) {
      container.innerHTML = '<p class="empty-state">No tasks yet. Add one to get started.</p>';
      return;
    }
    container.innerHTML = tasks.map(taskItemHtml).join('');
    tasks.forEach((t) => bindTaskRow(document.getElementById(`task-${t.id}`)));
  }

  function bindTaskRow(row) {
    if (!row) return;
    const id = row.dataset.id;
    const checkbox = row.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', async () => {
      try {
        await api(`/api/tasks/${id}`, { method: 'PATCH', body: { done: checkbox.checked } });
      } catch (err) {
        checkbox.checked = !checkbox.checked;
        alert(err.message);
      }
    });
    const deleteBtn = row.querySelector('.task-item-delete');
    deleteBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await api(`/api/tasks/${id}`, { method: 'DELETE' });
        row.remove();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // ---------- PROFILE PAGE ----------
  async function initProfile() {
    wireLogout();
    const user = await requireSession();
    if (!user) return;

    let profile;
    try {
      profile = await api('/api/profile');
    } catch (err) {
      showFormError(err.message);
      return;
    }

    const avatarLetter = user.avatar_letter || (profile.full_name || '?')[0].toUpperCase();
    document.getElementById('profileAvatar').textContent = avatarLetter;
    document.getElementById('profileHeroName').textContent = profile.full_name || '';
    const joined = profile.created_at
      ? new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      : '';
    document.getElementById('profileHeroMeta').textContent =
      [joined ? `Joined ${joined}` : null, profile.location].filter(Boolean).join(' · ');

    document.getElementById('fieldFullName').value = profile.full_name || '';
    document.getElementById('fieldDisplayName').value = profile.display_name || '';
    document.getElementById('fieldEmail').value = profile.email || '';
    document.getElementById('fieldPhone').value = profile.phone || '';
    document.getElementById('fieldBio').value = profile.bio || '';
    document.getElementById('fieldLocation').value = profile.location || '';
    if (profile.timezone) document.getElementById('fieldTimezone').value = profile.timezone;

    try {
      const dash = await api('/api/dashboard');
      document.getElementById('heroProjects').textContent = dash.stats.projectsCount;
      document.getElementById('heroTasks').textContent = dash.stats.tasksDone;
      document.getElementById('heroHours').textContent = dash.stats.hoursLogged;
    } catch {
      // non-critical
    }

    document.getElementById('saveProfileBtn').addEventListener('click', async () => {
      showFormError('');
      const body = {
        fullName: document.getElementById('fieldFullName').value.trim(),
        displayName: document.getElementById('fieldDisplayName').value.trim(),
        email: document.getElementById('fieldEmail').value.trim(),
        phone: document.getElementById('fieldPhone').value.trim(),
        bio: document.getElementById('fieldBio').value.trim(),
        location: document.getElementById('fieldLocation').value.trim(),
        timezone: document.getElementById('fieldTimezone').value,
      };
      const btn = document.getElementById('saveProfileBtn');
      const original = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Saving…';
      try {
        await api('/api/profile', { method: 'PUT', body });
        document.getElementById('profileHeroName').textContent = body.fullName;
        document.getElementById('profileAvatar').textContent = body.fullName[0].toUpperCase();
        btn.textContent = 'Saved ✓';
        setTimeout(() => { btn.textContent = original; }, 1500);
      } catch (err) {
        showFormError(err.message);
        btn.textContent = original;
      } finally {
        btn.disabled = false;
      }
    });

    document.getElementById('deleteAccountBtn').addEventListener('click', async () => {
      if (!window.confirm('This permanently deletes your account and all your data. Continue?')) return;
      try {
        await api('/api/auth/me', { method: 'DELETE' });
        window.location.href = 'index.html';
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // ---------- PROJECTS PAGE ----------
  async function initProjects() {
    wireLogout();
    const user = await requireSession();
    if (!user) return;

    let projects = [];
    async function load() {
      try {
        projects = await api('/api/projects');
        renderProjects(projects);
      } catch (err) {
        document.getElementById('projectsGrid').innerHTML = `<p class="empty-state">${escapeHtml(err.message)}</p>`;
      }
    }

    function currentFilter() {
      const active = document.querySelector('#projectFilters .filter-chip.active');
      return active ? active.dataset.filter : 'all';
    }

    function renderProjects(list) {
      const filter = currentFilter();
      const searchTerm = (document.getElementById('projectSearch').value || '').toLowerCase();
      const filtered = list.filter((p) => {
        const matchesFilter = filter === 'all' || p.status === filter;
        const matchesSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm);
        return matchesFilter && matchesSearch;
      });

      const grid = document.getElementById('projectsGrid');
      if (!filtered.length) {
        grid.innerHTML = '<p class="empty-state">No projects match. Try a different filter or create one.</p>';
        return;
      }

      grid.innerHTML = filtered.map((p) => {
        const pct = Math.max(0, Math.min(100, Number(p.progress) || 0));
        const taskCount = Number(p.task_count) || 0;
        const doneCount = Number(p.done_count) || 0;
        const remaining = taskCount - doneCount;
        const metaText = p.status === 'completed'
          ? `${taskCount} tasks`
          : p.status === 'hold' ? 'Paused' : `${remaining} tasks left`;

        return `
          <article class="project-card card" data-id="${p.id}">
            <div class="project-card-top">
              <div class="project-color-dot" style="background:${escapeHtml(p.color)}"></div>
              <span class="project-status ${escapeHtml(p.status)}">${escapeHtml(statusLabel(p.status))}</span>
            </div>
            <h3>${escapeHtml(p.name)}</h3>
            <p class="project-desc">${escapeHtml(p.description || '')}</p>
            <div class="project-progress">
              <div class="progress-bar-track">
                <div class="progress-bar-fill" style="width:${pct}%; background:${escapeHtml(p.color)}"></div>
              </div>
              <span class="progress-pct">${pct}%</span>
            </div>
            <div class="project-card-footer">
              <div class="project-meta">
                <span>${escapeHtml(metaText)}</span>
                <span>·</span>
                <span>Updated ${relativeTime(p.updated_at)}</span>
              </div>
              <button type="button" class="project-card-delete" title="Delete project">Delete ✕</button>
            </div>
          </article>`;
      }).join('');

      grid.querySelectorAll('.project-card').forEach((card) => {
        const id = card.dataset.id;
        card.querySelector('.project-card-delete').addEventListener('click', async () => {
          if (!window.confirm('Delete this project? This cannot be undone.')) return;
          try {
            await api(`/api/projects/${id}`, { method: 'DELETE' });
            await load();
          } catch (err) {
            alert(err.message);
          }
        });
      });
    }

    document.querySelectorAll('#projectFilters .filter-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#projectFilters .filter-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        renderProjects(projects);
      });
    });

    document.getElementById('projectSearch').addEventListener('input', () => renderProjects(projects));

    document.getElementById('newProjectBtn').addEventListener('click', async () => {
      const name = window.prompt('Project name:');
      if (!name || !name.trim()) return;
      const description = window.prompt('Short description (optional):') || '';
      const colors = ['#6366f1', '#22c55e', '#ec4899', '#f59e0b', '#8b5cf6', '#14b8a6'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      try {
        await api('/api/projects', { method: 'POST', body: { name: name.trim(), description, color } });
        await load();
      } catch (err) {
        alert(err.message);
      }
    });

    await load();
  }

  // ---------- SETTINGS PAGE ----------
  async function initSettings() {
    wireLogout();
    const user = await requireSession();
    if (!user) return;

    let settings;
    try {
      settings = await api('/api/settings');
    } catch (err) {
      showFormError(err.message);
      return;
    }

    document.getElementById('toggleEmailNotif').checked = !!settings.email_notifications;
    document.getElementById('togglePushNotif').checked = !!settings.push_notifications;
    document.getElementById('toggleWeeklySummary').checked = !!settings.weekly_summary;
    document.getElementById('toggleMarketing').checked = !!settings.marketing_emails;
    document.getElementById('selectTheme').value = settings.theme || 'Dark';
    document.getElementById('selectDensity').value = settings.density || 'Comfortable';
    document.getElementById('toggleReduceMotion').checked = !!settings.reduce_motion;
    document.getElementById('toggleTwoFactor').checked = !!settings.two_factor;
    document.getElementById('toggleOnlineStatus').checked = !!settings.show_online_status;
    document.getElementById('togglePublicProfile').checked = !!settings.public_profile;

    document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
      showFormError('');
      const body = {
        emailNotifications: document.getElementById('toggleEmailNotif').checked,
        pushNotifications: document.getElementById('togglePushNotif').checked,
        weeklySummary: document.getElementById('toggleWeeklySummary').checked,
        marketingEmails: document.getElementById('toggleMarketing').checked,
        theme: document.getElementById('selectTheme').value,
        density: document.getElementById('selectDensity').value,
        reduceMotion: document.getElementById('toggleReduceMotion').checked,
        twoFactor: document.getElementById('toggleTwoFactor').checked,
        showOnlineStatus: document.getElementById('toggleOnlineStatus').checked,
        publicProfile: document.getElementById('togglePublicProfile').checked,
      };
      const btn = document.getElementById('saveSettingsBtn');
      const original = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Saving…';
      try {
        await api('/api/settings', { method: 'PUT', body });
        btn.textContent = 'Saved ✓';
        setTimeout(() => { btn.textContent = original; }, 1500);
      } catch (err) {
        showFormError(err.message);
        btn.textContent = original;
      } finally {
        btn.disabled = false;
      }
    });

    document.getElementById('changePasswordBtn').addEventListener('click', async () => {
      const currentPassword = window.prompt('Current password:');
      if (currentPassword === null) return;
      const newPassword = window.prompt('New password (min 6 characters):');
      if (newPassword === null) return;
      try {
        await api('/api/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } });
        alert('Password updated.');
      } catch (err) {
        alert(err.message);
      }
    });

    const exportBtn = document.getElementById('exportDataBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        try {
          const [profile, projects, tasks] = await Promise.all([
            api('/api/profile'),
            api('/api/projects'),
            api('/api/tasks'),
          ]);
          const blob = new Blob([JSON.stringify({ profile, projects, tasks }, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'codix-data-export.json';
          a.click();
          URL.revokeObjectURL(url);
        } catch (err) {
          alert(err.message);
        }
      });
    }

    document.getElementById('deleteAccountBtn').addEventListener('click', async () => {
      if (!window.confirm('This permanently deletes your account and all your data. Continue?')) return;
      try {
        await api('/api/auth/me', { method: 'DELETE' });
        window.location.href = 'index.html';
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // ---------- boot ----------
  document.addEventListener('DOMContentLoaded', () => {
    if (page === 'login') initLogin();
    else if (page === 'signup') initSignup();
    else if (page === 'dashboard') initDashboard();
    else if (page === 'profile') initProfile();
    else if (page === 'projects') initProjects();
    else if (page === 'settings') initSettings();
  });
})();
