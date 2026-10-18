(() => {
  "use strict";

  /* ================= LAUNCH COUNTDOWN =================
     Set a date below (local time). Leave as null to show the "no date yet" note. */
  const LAUNCH_DATE = "2026-05-12T10:00:00"; // e.g. new Date("2027-01-15T10:00:00")

  /* ================= MOOD BOARD ================= */
  const MOOD_KEY = "gh_mood_v2";
  const LEGACY_KEY = "gh_ideas_v1"; // pre-mood-board ideas, migrated once
  const QUAD_ORDER = ["pictures", "videos", "bts", "graphics"];
  const QUAD_LABELS = {
    pictures: "Pictures",
    videos: "Videos",
    bts: "Behind the Scenes",
    graphics: "Graphics",
  };
  const NOTE_COLORS = ["#ffe66d", "#ffb3d1", "#b8f0c8", "#b7d9ff", "#ffd0a6"];

  const quadGrid = document.getElementById("quad-grid");
  const boardFull = document.getElementById("board-full");
  const boardSurface = document.getElementById("board-surface");
  const boardBarIndex = document.getElementById("board-bar-index");
  const boardBarName = document.getElementById("board-bar-name");
  const boardEmpty = document.getElementById("board-empty");
  const boardClose = document.getElementById("board-close");
  const composer = document.getElementById("note-composer");
  const noteInput = document.getElementById("note-input");
  const noteCancel = document.getElementById("note-cancel");

  let activeQuad = null;
  let notes = load(MOOD_KEY, null);
  if (notes === null) {
    notes = migrateLegacy();
    saveMood();
  }

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveMood() {
    try {
      localStorage.setItem(MOOD_KEY, JSON.stringify(notes));
    } catch {
      /* storage unavailable — session-only */
    }
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c]);
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }

  /* Old idea-card entries become notes pinned in a loose grid on Pictures */
  function migrateLegacy() {
    const legacy = load(LEGACY_KEY, []);
    if (!Array.isArray(legacy) || !legacy.length) return [];
    return legacy.map((idea, i) => ({
      id: idea.id || Date.now().toString(36) + i,
      quad: "pictures",
      text: idea.text || "",
      x: 14 + (i % 4) * 20,
      y: 16 + Math.floor(i / 4) * 26,
      color: NOTE_COLORS[i % NOTE_COLORS.length],
      tilt: (((i * 7) % 5) - 2) * 1.4,
      tag: idea.tag || "",
      createdAt: idea.createdAt || Date.now(),
    }));
  }

  function updateCounts() {
    QUAD_ORDER.forEach((q) => {
      const count = notes.filter((n) => n.quad === q).length;
      const el = quadGrid.querySelector(`[data-count="${q}"]`);
      if (el) el.textContent = count === 1 ? "1 note" : `${count} notes`;
    });
  }

  function renderNotes() {
    boardSurface.querySelectorAll(".mood-note").forEach((n) => n.remove());
    const mine = notes.filter((n) => n.quad === activeQuad);
    mine.forEach((n) => {
      const el = document.createElement("div");
      el.className = "mood-note";
      el.dataset.id = n.id;
      el.style.left = n.x + "%";
      el.style.top = n.y + "%";
      el.style.background = n.color;
      el.style.setProperty("--tilt", (n.tilt ?? -1.5) + "deg");
      el.innerHTML = `
        <p>${escapeHtml(n.text)}</p>
        <div class="mood-note-foot">
          <span class="mood-note-tag">${escapeHtml(n.tag || formatDate(n.createdAt))}</span>
          <button type="button" class="mood-note-del" aria-label="Remove note">Remove</button>
        </div>`;
      boardSurface.appendChild(el);
    });
    boardEmpty.classList.toggle("is-hidden", mine.length > 0);
  }

  function openBoard(quad) {
    activeQuad = quad;
    boardBarIndex.textContent = String(QUAD_ORDER.indexOf(quad) + 1).padStart(2, "0");
    boardBarName.textContent = QUAD_LABELS[quad];
    boardFull.hidden = false;
    boardFull.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    hideComposer();
    renderNotes();
    boardClose.focus();
  }

  function closeBoard() {
    boardFull.hidden = true;
    boardFull.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    hideComposer();
    const btn = quadGrid.querySelector(`[data-quad="${activeQuad}"]`);
    activeQuad = null;
    if (btn) btn.focus();
  }

  function showComposer(clientX, clientY) {
    const rect = boardSurface.getBoundingClientRect();
    composer.hidden = false;
    const w = composer.offsetWidth;
    const h = composer.offsetHeight;
    let x = clientX - rect.left + 12;
    let y = clientY - rect.top + 12;
    x = Math.max(8, Math.min(x, rect.width - w - 8));
    y = Math.max(8, Math.min(y, rect.height - h - 8));
    composer.style.left = x + "px";
    composer.style.top = y + "px";
    noteInput.value = "";
    noteInput.focus();
  }

  function hideComposer() {
    composer.hidden = true;
    noteInput.value = "";
  }

  function pinNote() {
    const text = noteInput.value.trim();
    if (!text) {
      noteInput.focus();
      return;
    }
    /* Note position = center of where the composer sat, as % of the surface */
    const rect = boardSurface.getBoundingClientRect();
    const cx = parseFloat(composer.style.left) + composer.offsetWidth / 2;
    const cy = parseFloat(composer.style.top) + composer.offsetHeight / 2;
    const x = Math.min(92, Math.max(8, (cx / rect.width) * 100));
    const y = Math.min(90, Math.max(10, (cy / rect.height) * 100));
    const i = notes.length;
    notes.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      quad: activeQuad,
      text,
      x,
      y,
      color: NOTE_COLORS[i % NOTE_COLORS.length],
      tilt: (((i * 7) % 5) - 2) * 1.4,
      tag: "",
      createdAt: Date.now(),
    });
    saveMood();
    hideComposer();
    renderNotes();
    updateCounts();
  }

  quadGrid.addEventListener("click", (e) => {
    const btn = e.target.closest(".quad");
    if (btn) openBoard(btn.dataset.quad);
  });

  boardClose.addEventListener("click", closeBoard);

  boardSurface.addEventListener("click", (e) => {
    if (e.target.closest(".mood-note-del")) {
      const id = e.target.closest(".mood-note").dataset.id;
      notes = notes.filter((n) => n.id !== id);
      saveMood();
      renderNotes();
      updateCounts();
      return;
    }
    /* clicks on existing notes or the composer itself never spawn a new note */
    if (e.target.closest(".mood-note") || e.target.closest(".note-composer")) return;
    showComposer(e.clientX, e.clientY);
  });

  composer.addEventListener("submit", (e) => {
    e.preventDefault();
    pinNote();
  });
  noteCancel.addEventListener("click", hideComposer);

  document.addEventListener("keydown", (e) => {
    if (boardFull.hidden) return;
    if (e.key !== "Escape") return;
    if (composer.hidden) closeBoard();
    else hideComposer();
  });

  updateCounts();

  /* ================= COUNTDOWN ================= */
  const countdown = document.getElementById("countdown");
  const launchNote = document.getElementById("launch-note");

  if (LAUNCH_DATE instanceof Date && !isNaN(LAUNCH_DATE)) {
    launchNote.textContent = "Glamour House launches — watch it come down:";
    const tick = () => {
      const diff = LAUNCH_DATE.getTime() - Date.now();
      if (diff <= 0) {
        countdown.innerHTML = "<p class='idea-text'>We're live. Welcome to Glamour House.</p>";
        return;
      }
      const units = {
        days: Math.floor(diff / 86400000),
        hours: Math.floor(diff / 3600000) % 24,
        mins: Math.floor(diff / 60000) % 60,
        secs: Math.floor(diff / 1000) % 60,
      };
      for (const [unit, val] of Object.entries(units)) {
        const el = countdown.querySelector(`[data-unit="${unit}"]`);
        if (el) el.textContent = String(val).padStart(2, "0");
      }
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ================= SCROLL REVEAL ================= */
  const revealTargets = document.querySelectorAll(
    ".section-head, .timeline-item, .idea-form, .idea-filters, .cufs-banner, .launch-panel"
  );
  revealTargets.forEach((el) => el.classList.add("reveal"));

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("is-visible"));
  }
})();
