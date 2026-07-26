/**
 * Codix client – talks to /api/* routes (Next.js on Vercel)
 */
(function () {
  const API = "/api";

  async function api(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || res.statusText || "Request failed");
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function showError(form, message) {
    let el = form.querySelector(".form-error");
    if (!el) {
      el = document.createElement("div");
      el.className = "form-error";
      form.insertBefore(el, form.firstChild);
    }
    el.style.display = "block";
    el.textContent = message;
  }

  function clearError(form) {
    const el = form.querySelector(".form-error");
    if (el) el.style.display = "none";
  }

  // ——— Auth pages ———
  function initLogin() {
    const form = document.querySelector('form[data-form="login"]');
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearError(form);
      const btn = form.querySelector('button[type="submit"]');
      const email = form.querySelector('input[type="email"]').value.trim();
      const password = form.querySelector('input[type="password"]').value;

      btn.disabled = true;
      try {
        await api("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        window.location.href = "/dashboard.html";
      } catch (err) {
        showError(form, err.message || "Login failed");
        btn.disabled = false;
      }
    });
  }

  function initSignup() {
    const form = document.querySelector('form[data-form="signup"]');
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearError(form);
      const inputs = form.querySelectorAll("input");
      const fullName = inputs[0].value.trim();
      const email = inputs[1].value.trim();
      const password = inputs[2].value;
      const confirm = inputs[3].value;
      const btn = form.querySelector('button[type="submit"]');

      if (password !== confirm) {
        showError(form, "Passwords do not match");
        return;
      }

      btn.disabled = true;
      try {
        await api("/auth/signup", {
          method: "POST",
          body: JSON.stringify({ fullName, email, password }),
        });
        window.location.href = "/dashboard.html";
      } catch (err) {
        showError(form, err.message || "Signup failed");
        btn.disabled = false;
      }
    });
  }

  // ——— Shared: require auth or redirect ———
  async function requireAuth() {
    try {
      const { user } = await api("/auth/me");
      return user;
    } catch {
      window.location.href = "/index.html";
      return null;
    }
  }

  // ——— Logout ———
  function initLogout() {
    document.querySelectorAll(".nav-item.logout").forEach((el) => {
      el.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          await api("/auth/logout", { method: "POST" });
        } catch (_) {}
        window.location.href = "/index.html";
      });
    });
  }

  // ——— Dashboard ———
  async function initDashboard() {
    if (!document.querySelector(".stats")) return;
    const user = await requireAuth();
    if (!user) return;

    try {
      const data = await api("/dashboard");

      // Stats
      const values = document.querySelectorAll(".stat-value");
      if (values[0]) values[0].textContent = data.stats.projects;
      if (values[1]) values[1].textContent = data.stats.teamMembers;
      if (values[2]) values[2].textContent = data.stats.tasksDone;
      if (values[3]) values[3].textContent = data.stats.hours;

      // Projects list
      const projectList = document.querySelector(".project-list");
      if (projectList && data.projects?.length) {
        projectList.innerHTML = data.projects
          .map(
            (p) => `
          <div class="project-item">
            <div class="project-color" style="background:${p.color}"></div>
            <div class="project-info">
              <h3>${escapeHtml(p.name)}</h3>
              <p>${
                p.status === "COMPLETED"
                  ? "Completed"
                  : p.tasksLeft + " tasks remaining"
              }</p>
            </div>
            <div class="progress-ring">
              <svg width="40" height="40">
                <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="3"/>
                <circle cx="20" cy="20" r="16" fill="none" stroke="${p.color}" stroke-width="3"
                  stroke-dasharray="100" stroke-dashoffset="${100 - p.progress}" stroke-linecap="round"
                  transform="rotate(-90 20 20)"/>
              </svg>
              <span>${p.progress}%</span>
            </div>
          </div>`
          )
          .join("");
      }

      // Leaderboard
      const leaderList = document.querySelector(".leaderboard-list");
      if (leaderList && data.leaderboard?.length) {
        leaderList.innerHTML = data.leaderboard
          .map(
            (l) => `
          <div class="leader-item ${l.rank <= 3 ? "rank-" + l.rank : ""}">
            <span class="rank">${l.rank}</span>
            <div class="leader-avatar">${escapeHtml(l.letter)}</div>
            <div class="leader-info">
              <h3>${escapeHtml(l.name)}</h3>
              <p>${l.tasksCompleted} tasks completed</p>
            </div>
            <span class="leader-score">${l.score.toLocaleString()}</span>
          </div>`
          )
          .join("");
      }

      // Tasks
      const taskList = document.querySelector(".task-list");
      if (taskList && data.tasks?.length) {
        taskList.innerHTML = data.tasks
          .map(
            (t) => `
          <label class="task-item" data-id="${t.id}">
            <input type="checkbox" ${t.completed ? "checked" : ""}>
            <span class="checkmark"></span>
            <span class="task-text">${escapeHtml(t.title)}</span>
            ${t.tag ? `<span class="task-tag">${escapeHtml(t.tag)}</span>` : ""}
          </label>`
          )
          .join("");

        taskList.querySelectorAll(".task-item input").forEach((input) => {
          input.addEventListener("change", async () => {
            const id = input.closest(".task-item").dataset.id;
            try {
              await api(`/tasks/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ completed: input.checked }),
              });
            } catch (err) {
              input.checked = !input.checked;
              console.error(err);
            }
          });
        });
      }

      // Avatar letter
      const avatar = document.querySelector(".user-avatar");
      if (avatar && user.avatarLetter) avatar.textContent = user.avatarLetter;
    } catch (err) {
      console.error("Dashboard load failed", err);
    }

    // Add task button
    const addBtn = document.querySelector(".tasks-card .btn-sm");
    if (addBtn) {
      addBtn.addEventListener("click", async () => {
        const title = prompt("Task title:");
        if (!title?.trim()) return;
        try {
          await api("/tasks", {
            method: "POST",
            body: JSON.stringify({ title: title.trim(), tag: "Code" }),
          });
          location.reload();
        } catch (err) {
          alert(err.message);
        }
      });
    }
  }

  // ——— Projects page ———
  async function initProjects() {
    if (!document.querySelector(".projects-grid")) return;
    const user = await requireAuth();
    if (!user) return;

    let currentFilter = "all";

    async function load(status) {
      const q = status && status !== "all" ? `?status=${status}` : "";
      const { projects } = await api(`/projects${q}`);
      const grid = document.querySelector(".projects-grid");
      if (!grid) return;

      const statusLabel = {
        COMPLETED: "Completed",
        IN_PROGRESS: "In progress",
        ON_HOLD: "On hold",
      };
      const statusClass = {
        COMPLETED: "completed",
        IN_PROGRESS: "progress",
        ON_HOLD: "hold",
      };

      grid.innerHTML = projects
        .map(
          (p) => `
        <article class="project-card card" data-id="${p.id}">
          <div class="project-card-top">
            <div class="project-color-dot" style="background:${p.color}"></div>
            <span class="project-status ${statusClass[p.status] || "progress"}">${
              statusLabel[p.status] || p.status
            }</span>
          </div>
          <h3>${escapeHtml(p.name)}</h3>
          <p class="project-desc">${escapeHtml(p.description || "")}</p>
          <div class="project-progress">
            <div class="progress-bar-track">
              <div class="progress-bar-fill" style="width:${p.progress}%; background:${p.color}"></div>
            </div>
            <span class="progress-pct">${p.progress}%</span>
          </div>
          <div class="project-card-footer">
            <div class="project-meta">
              <span>${
                p.status === "COMPLETED"
                  ? p.taskCount + " tasks"
                  : p.status === "ON_HOLD"
                  ? "Paused"
                  : p.tasksLeft + " tasks left"
              }</span>
              <span>·</span>
              <span>Updated ${formatRelative(p.updatedAt)}</span>
            </div>
            <div class="project-avatars">
              ${p.members
                .map(
                  (m) =>
                    `<span class="mini-avatar">${escapeHtml(m.letter)}</span>`
                )
                .join("")}
            </div>
          </div>
        </article>`
        )
        .join("");
    }

    document.querySelectorAll(".filter-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document
          .querySelectorAll(".filter-chip")
          .forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        const text = chip.textContent.trim().toLowerCase();
        if (text === "all") currentFilter = "all";
        else if (text === "in progress") currentFilter = "IN_PROGRESS";
        else if (text === "completed") currentFilter = "COMPLETED";
        else if (text === "on hold") currentFilter = "ON_HOLD";
        load(currentFilter);
      });
    });

    // New project
    const newBtn = document.querySelector(".header-right .btn-sm");
    if (newBtn) {
      newBtn.addEventListener("click", async () => {
        const name = prompt("Project name:");
        if (!name?.trim()) return;
        const description = prompt("Short description (optional):") || "";
        try {
          await api("/projects", {
            method: "POST",
            body: JSON.stringify({
              name: name.trim(),
              description: description.trim() || null,
            }),
          });
          load(currentFilter);
        } catch (err) {
          alert(err.message);
        }
      });
    }

    await load("all");
  }

  // ——— Profile ———
  async function initProfile() {
    if (!document.querySelector(".profile-hero")) return;
    const user = await requireAuth();
    if (!user) return;

    try {
      const { profile } = await api("/profile");

      // Hero
      const avatar = document.querySelector(".profile-avatar");
      if (avatar) avatar.textContent = profile.avatarLetter || "A";
      const h2 = document.querySelector(".profile-hero-info h2");
      if (h2) h2.textContent = profile.fullName;
      const meta = document.querySelector(".profile-meta");
      if (meta) {
        const joined = new Date(profile.createdAt).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
        meta.textContent = `Joined ${joined}${
          profile.location ? " · " + profile.location : ""
        }`;
      }
      const phValues = document.querySelectorAll(".ph-value");
      if (phValues[0]) phValues[0].textContent = profile.stats?.projects ?? 0;
      if (phValues[1]) phValues[1].textContent = profile.stats?.tasks ?? 0;
      if (phValues[2]) phValues[2].textContent = profile.stats?.hours ?? 0;

      // Form fields
      const form = document.querySelector(".profile-form");
      if (form) {
        const inputs = form.querySelectorAll("input, textarea, select");
        // full name, display name, email, phone, bio, location, timezone
        const map = [
          profile.fullName,
          profile.displayName,
          profile.email,
          profile.phone,
          profile.bio,
          profile.location,
        ];
        inputs.forEach((el, i) => {
          if (el.tagName === "SELECT") {
            // timezone
            [...el.options].forEach((o) => {
              o.selected = o.text === profile.timezone;
            });
          } else if (map[i] !== undefined && map[i] !== null) {
            el.value = map[i];
          }
        });
      }

      // Save
      const saveBtn = document.querySelector(".header-right .btn-sm");
      if (saveBtn && form) {
        saveBtn.addEventListener("click", async () => {
          const inputs = form.querySelectorAll("input, textarea, select");
          const payload = {
            fullName: inputs[0].value.trim(),
            displayName: inputs[1].value.trim() || null,
            email: inputs[2].value.trim(),
            phone: inputs[3].value.trim() || null,
            bio: inputs[4].value.trim() || null,
            location: inputs[5].value.trim() || null,
            timezone: inputs[6].value || inputs[6].options[inputs[6].selectedIndex]?.text,
          };
          try {
            await api("/profile", {
              method: "PATCH",
              body: JSON.stringify(payload),
            });
            alert("Profile saved");
            location.reload();
          } catch (err) {
            alert(err.message);
          }
        });
      }

      // Delete account
      const delBtn = document.querySelector(".btn-danger");
      if (delBtn) {
        delBtn.addEventListener("click", async () => {
          if (
            !confirm(
              "Permanently delete your account and all data? This cannot be undone."
            )
          )
            return;
          try {
            await api("/profile", { method: "DELETE" });
            window.location.href = "/index.html";
          } catch (err) {
            alert(err.message);
          }
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  // ——— Settings ———
  async function initSettings() {
    if (!document.querySelector(".settings-layout")) return;
    const user = await requireAuth();
    if (!user) return;

    try {
      const { settings } = await api("/settings");

      // Toggles – order matches HTML
      const toggles = document.querySelectorAll(".toggle-input");
      const keys = [
        "emailNotifications",
        "pushNotifications",
        "weeklySummary",
        "marketingEmails",
        "reduceMotion",
        "twoFactor",
        "showOnlineStatus",
        "publicProfile",
      ];
      // Appearance toggles are mixed with selects; map carefully
      const allToggleKeys = [
        "emailNotifications",
        "pushNotifications",
        "weeklySummary",
        "marketingEmails",
        null, // reduce motion is later
        null,
        null,
      ];

      // Simpler: set by matching parent text
      document.querySelectorAll(".toggle-row").forEach((row) => {
        const title = row.querySelector("h3")?.textContent?.trim();
        const input = row.querySelector(".toggle-input");
        if (!input || !title) return;
        const map = {
          "Email notifications": "emailNotifications",
          "Push notifications": "pushNotifications",
          "Weekly summary": "weeklySummary",
          "Marketing emails": "marketingEmails",
          "Reduce motion": "reduceMotion",
          "Two-factor authentication": "twoFactor",
          "Show online status": "showOnlineStatus",
          "Public profile": "publicProfile",
        };
        const key = map[title];
        if (key && settings[key] !== undefined) {
          input.checked = !!settings[key];
        }
      });

      // Selects
      document.querySelectorAll(".settings-select").forEach((sel) => {
        const label = sel
          .closest(".settings-item")
          ?.querySelector("h3")
          ?.textContent?.trim();
        if (label === "Theme" && settings.theme) {
          [...sel.options].forEach((o) => (o.selected = o.text === settings.theme));
        }
        if (label === "Density" && settings.density) {
          [...sel.options].forEach(
            (o) => (o.selected = o.text === settings.density)
          );
        }
      });

      // Save
      const saveBtn = document.querySelector(".header-right .btn-sm");
      if (saveBtn) {
        saveBtn.addEventListener("click", async () => {
          const payload = {};
          document.querySelectorAll(".toggle-row").forEach((row) => {
            const title = row.querySelector("h3")?.textContent?.trim();
            const input = row.querySelector(".toggle-input");
            const map = {
              "Email notifications": "emailNotifications",
              "Push notifications": "pushNotifications",
              "Weekly summary": "weeklySummary",
              "Marketing emails": "marketingEmails",
              "Reduce motion": "reduceMotion",
              "Two-factor authentication": "twoFactor",
              "Show online status": "showOnlineStatus",
              "Public profile": "publicProfile",
            };
            const key = map[title];
            if (key) payload[key] = input.checked;
          });
          document.querySelectorAll(".settings-select").forEach((sel) => {
            const label = sel
              .closest(".settings-item")
              ?.querySelector("h3")
              ?.textContent?.trim();
            if (label === "Theme") payload.theme = sel.value || sel.options[sel.selectedIndex].text;
            if (label === "Density")
              payload.density = sel.value || sel.options[sel.selectedIndex].text;
          });

          try {
            await api("/settings", {
              method: "PATCH",
              body: JSON.stringify(payload),
            });
            alert("Settings saved");
          } catch (err) {
            alert(err.message);
          }
        });
      }

      // Delete
      const delBtn = document.querySelector(".btn-danger");
      if (delBtn) {
        delBtn.addEventListener("click", async () => {
          if (
            !confirm(
              "Permanently delete your account and all data? This cannot be undone."
            )
          )
            return;
          try {
            await api("/profile", { method: "DELETE" });
            window.location.href = "/index.html";
          } catch (err) {
            alert(err.message);
          }
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  // ——— Helpers ———
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatRelative(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return days + "d ago";
    if (days < 30) return Math.floor(days / 7) + "w ago";
    return d.toLocaleDateString();
  }

  // Boot
  document.addEventListener("DOMContentLoaded", () => {
    initLogin();
    initSignup();
    initLogout();
    initDashboard();
    initProjects();
    initProfile();
    initSettings();
  });
})();
