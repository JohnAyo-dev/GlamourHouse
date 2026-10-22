(() => {
  "use strict";

  /* ================= LAUNCH COUNTDOWN =================
     Set a date below (local time). Leave as null to show the "no date yet" note. */
  const LAUNCH_DATE = new Date("2026-11-27T10:00:00"); // e.g. new Date("2027-01-15T10:00:00")

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
  const NOTE_COLORS = ["#f2e6c9", "#f2d8d4", "#dce6d6", "#e5dfd0", "#eadce9"];
  const QUAD_MEDIA = { pictures: "image", graphics: "image", videos: "video", bts: "video" };
  const MEDIA_LIMIT = 80 * 1024 * 1024;
  const MEDIA_DB = "gh_media";
  const MEDIA_STORE = "files";

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
  const noteMediaBtn = document.getElementById("note-media");
  const mediaInput = document.getElementById("media-input");
  const boardBarHint = document.getElementById("board-bar-hint");
  const mediaUrls = new Map();

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

  /* Media files live in IndexedDB (blobs), notes only keep the reference */
  function mediaDb() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("indexeddb unavailable"));
        return;
      }
      const request = indexedDB.open(MEDIA_DB, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(MEDIA_STORE)) db.createObjectStore(MEDIA_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function mediaPut(id, blob) {
    return mediaDb().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(MEDIA_STORE, "readwrite");
      tx.objectStore(MEDIA_STORE).put(blob, id);
      tx.oncomplete = () => resolve(id);
      tx.onerror = () => reject(tx.error);
    }));
  }

  function mediaGet(id) {
    return mediaDb().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(MEDIA_STORE, "readonly");
      const request = tx.objectStore(MEDIA_STORE).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    }));
  }

  function mediaDelete(id) {
    return mediaDb().then((db) => new Promise((resolve) => {
      const tx = db.transaction(MEDIA_STORE, "readwrite");
      tx.objectStore(MEDIA_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    })).catch(() => {});
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
      if (el) el.textContent = count === 1 ? "1 item" : `${count} items`;
    });
  }

  function revokeMediaUrls() {
    mediaUrls.forEach((url) => URL.revokeObjectURL(url));
    mediaUrls.clear();
  }

  function showMediaIn(frame, note) {
    if (!frame) return;
    mediaGet(note.mediaId || note.id).then((blob) => {
      if (!blob || !frame.isConnected) return;
      const url = URL.createObjectURL(blob);
      mediaUrls.set(note.id, url);
      let node;
      if (note.kind === "video") {
        node = document.createElement("video");
        node.controls = true;
        node.muted = true;
        node.playsInline = true;
        node.preload = "metadata";
      } else {
        node = document.createElement("img");
        node.alt = note.name || "Mood board photo";
      }
      node.src = url;
      frame.appendChild(node);
    }).catch(() => {});
  }

  function renderNotes() {
    revokeMediaUrls();
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
      if (n.kind === "image" || n.kind === "video") {
        el.classList.add("is-media");
        el.innerHTML = `
          <div class="mood-media-frame"></div>
          <div class="mood-note-foot">
            <span class="mood-note-tag">${escapeHtml(n.name || (n.kind === "video" ? "Video" : "Photo"))}</span>
            <button type="button" class="mood-note-del" aria-label="Remove media">Remove</button>
          </div>`;
        boardSurface.appendChild(el);
        showMediaIn(el.querySelector(".mood-media-frame"), n);
        return;
      }
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
    if (boardBarHint) {
      boardBarHint.textContent = QUAD_MEDIA[quad] === "video"
        ? "Click anywhere to pin a note or add a video · Esc to close"
        : "Click anywhere to pin a note or add a photo · Esc to close";
    }
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
    if (noteMediaBtn) noteMediaBtn.textContent = QUAD_MEDIA[activeQuad] === "video" ? "Add video" : "Add photo";
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

  /* Pinned position = center of where the composer sat, as % of the surface */
  function composerCenter() {
    const rect = boardSurface.getBoundingClientRect();
    const cx = parseFloat(composer.style.left) + composer.offsetWidth / 2;
    const cy = parseFloat(composer.style.top) + composer.offsetHeight / 2;
    return {
      x: Math.min(92, Math.max(8, (cx / rect.width) * 100)),
      y: Math.min(90, Math.max(10, (cy / rect.height) * 100)),
    };
  }

  function addMediaFiles(fileList) {
    const kind = QUAD_MEDIA[activeQuad];
    if (!kind || !fileList || !fileList.length) return;
    const quad = activeQuad;
    const base = composerCenter();
    const all = Array.from(fileList);
    const files = all.filter((file) => {
      const type = file.type || "";
      const rightKind = kind === "video" ? type.startsWith("video/") : type.startsWith("image/");
      return rightKind && file.size <= MEDIA_LIMIT;
    });
    hideComposer();
    if (files.length < all.length) {
      window.alert("Some files were skipped — add " + (kind === "video" ? "videos" : "images") + " under 80 MB.");
    }
    files.forEach((file, i) => {
      const id = "media-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
      mediaPut(id, file).then(() => {
        const index = notes.length;
        notes.push({
          id,
          quad,
          kind,
          mediaId: id,
          name: file.name,
          text: "",
          x: Math.min(92, Math.max(8, base.x + (i % 3) * 7)),
          y: Math.min(90, Math.max(10, base.y + Math.floor(i / 3) * 9)),
          color: NOTE_COLORS[index % NOTE_COLORS.length],
          tilt: (((index * 7) % 5) - 2) * 1.4,
          tag: "",
          createdAt: Date.now(),
        });
        saveMood();
        renderNotes();
        updateCounts();
      }).catch(() => {});
    });
  }

  function pinNote() {
    const text = noteInput.value.trim();
    if (!text) {
      noteInput.focus();
      return;
    }
    const { x, y } = composerCenter();
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
      const gone = notes.find((n) => n.id === id);
      notes = notes.filter((n) => n.id !== id);
      if (gone && gone.mediaId) mediaDelete(gone.mediaId);
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

  if (noteMediaBtn && mediaInput) {
    noteMediaBtn.addEventListener("click", () => {
      const kind = QUAD_MEDIA[activeQuad];
      if (!kind) return;
      mediaInput.accept = kind + "/*";
      mediaInput.value = "";
      mediaInput.click();
    });
    mediaInput.addEventListener("change", () => {
      addMediaFiles(mediaInput.files);
      mediaInput.value = "";
    });
  }

  document.addEventListener("keydown", (e) => {
    if (boardFull.hidden) return;
    if (e.key !== "Escape") return;
    if (composer.hidden) closeBoard();
    else hideComposer();
  });

  updateCounts();

  /* ================= FOLDER PHOTOS (shared) =================
     Loader for any image folder. It prefers a fresh browser cache, otherwise
     lists the folder through the GitHub API (any file names; each file is
     versioned by its blob sha so edits show up), then scans numbered files
     (prefix1, prefix2…), then a JSON manifest, then the last known list, then
     inline defaults. Add, remove or replace images in the folder and the
     galleries follow — no manifest to edit. */
  const PHOTO_EXT_RE = /\.(jpe?g|png|webp|gif|avif)$/i;
  const photoCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

  function photoTitle(file) {
    return file
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/(^|\s)([a-z])/g, (match, space, letter) => space + letter.toUpperCase());
  }

  function loadFolderPhotos(config) {
    const { folder, api, cacheKey, manifest, prefix = "", ttl = 5 * 60 * 1000, alt, fallback = [] } = config;
    const readCache = (anyAge) => {
      try {
        const raw = JSON.parse(localStorage.getItem(cacheKey) || "null");
        if (raw && Array.isArray(raw.files) && raw.files.length && (anyAge || Date.now() - raw.t < ttl)) return raw.files;
      } catch { /* ignore */ }
      return null;
    };
    const writeCache = (files) => {
      try { localStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), files })); } catch { /* ignore */ }
    };
    const fromApi = () => fetch(api)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("listing failed"))))
      .then((items) => {
        const files = (Array.isArray(items) ? items : [])
          .filter((item) => item && item.type === "file" && PHOTO_EXT_RE.test(item.name))
          .map((item) => ({ file: item.name, v: item.sha || "" }))
          .sort((a, b) => photoCollator.compare(a.file, b.file));
        if (!files.length) throw new Error("empty listing");
        return files;
      });
    const fromScan = () => new Promise((resolve) => {
      if (!prefix) { resolve([]); return; }
      const exts = ["jpg", "jpeg", "png", "webp"];
      const files = [];
      let number = 1;
      let extIndex = 0;
      let missed = 0;
      const probe = () => {
        if (missed >= 2 || number > 200 || (number > 20 && !files.length)) { resolve(files); return; }
        if (extIndex >= exts.length) { number += 1; extIndex = 0; missed += 1; probe(); return; }
        const candidate = prefix + number + "." + exts[extIndex++];
        const image = new Image();
        image.onload = () => { missed = 0; files.push({ file: candidate, v: "" }); probe(); };
        image.onerror = probe;
        image.src = folder + candidate;
      };
      probe();
    });
    const fromManifest = () => {
      if (!manifest) return Promise.resolve([]);
      return fetch(manifest)
        .then((response) => (response.ok ? response.json() : []))
        .then((items) => (Array.isArray(items) ? items : [])
          .filter((item) => item && typeof item.name === "string" && typeof item.src === "string")
          .map((item) => ({ name: item.name, src: item.src, alt: item.alt })))
        .catch(() => []);
    };
    const decorate = (files) => files.map((file, i) => {
      const name = file.name || photoTitle(file.file);
      return {
        name,
        src: file.src || folder + file.file + (file.v ? "?v=" + file.v : ""),
        alt: file.alt || (typeof alt === "function" ? alt(name, i) : alt) || name,
      };
    });

    const cached = readCache(false);
    if (cached) return Promise.resolve(decorate(cached));

    return fromApi()
      .catch(fromScan)
      .then((files) => (files.length ? (writeCache(files), files) : fromManifest()))
      .then((files) => (files && files.length ? files : readCache(true) || fallback))
      .then(decorate);
  }

  /* ================= GH PHOTO SLIDESHOW =================
     Runs on the same carousel as the model gallery, fed straight from
     assets/images/GH — every image in the folder, present and future. */
  const shootGallery = document.getElementById("shoot-gallery");
  const shootGalleryTrack = document.getElementById("shoot-gallery-track");
  const shootGalleryDots = document.getElementById("shoot-gallery-dots");
  const shootGalleryCount = document.getElementById("shoot-gallery-count");
  if (shootGallery && shootGalleryTrack) {
    const fallbackPhotos = ["GH1.jpg", "GH2.jpg", "GH3.jpg", "GH4.jpg", "GH5.jpg", "GH6.jpg", "GH7.jpg", "GH8.jpg", "GH9.jpg", "GH10.jpg", "GH11.jpg"].map((file, i) => ({ src: "assets/images/GH/" + file, alt: "Glamour House shoot photo " + (i + 1) }));
    let shootPhotos = fallbackPhotos;
    let shootSlide = 0;
    let shootTimer;
    function showShootSlide(index) {
      if (!shootPhotos.length) return;
      shootSlide = (index + shootPhotos.length) % shootPhotos.length;
      shootGalleryTrack.querySelectorAll(".model-gallery-slide").forEach((slide, i) => {
        slide.classList.toggle("is-active", i === shootSlide);
        slide.setAttribute("aria-hidden", i === shootSlide ? "false" : "true");
      });
      shootGalleryDots.querySelectorAll("button").forEach((dot, i) => {
        dot.classList.toggle("is-active", i === shootSlide);
        dot.setAttribute("aria-current", i === shootSlide ? "true" : "false");
      });
      shootGalleryCount.textContent = String(shootSlide + 1).padStart(2, "0") + " / " + String(shootPhotos.length).padStart(2, "0");
    }
    function restartShootTimer() {
      window.clearInterval(shootTimer);
      if (shootPhotos.length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        shootTimer = window.setInterval(() => showShootSlide(shootSlide + 1), 4800);
      }
    }
    function renderShootPhotos() {
      shootGalleryTrack.replaceChildren();
      shootGalleryDots.replaceChildren();
      shootPhotos.forEach((photo, i) => {
        const slide = document.createElement("figure");
        slide.className = "model-gallery-slide";
        const img = document.createElement("img");
        img.src = photo.src;
        img.alt = photo.alt || "Glamour House shoot photo " + (i + 1);
        img.loading = i === 0 ? "eager" : "lazy";
        slide.appendChild(img);
        shootGalleryTrack.appendChild(slide);
        const dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("aria-label", "Show photo " + (i + 1));
        dot.addEventListener("click", () => { showShootSlide(i); restartShootTimer(); });
        shootGalleryDots.appendChild(dot);
      });
      showShootSlide(0);
      shootGallery.querySelectorAll(".model-gallery-control").forEach((button) => { button.hidden = shootPhotos.length < 2; });
      shootGalleryDots.hidden = shootPhotos.length < 2;
      restartShootTimer();
      shootGallery.classList.remove("is-arriving");
      requestAnimationFrame(() => shootGallery.classList.add("is-arriving"));
    }
    shootGallery.querySelector(".model-gallery-prev").addEventListener("click", () => { showShootSlide(shootSlide - 1); restartShootTimer(); });
    shootGallery.querySelector(".model-gallery-next").addEventListener("click", () => { showShootSlide(shootSlide + 1); restartShootTimer(); });
    shootGallery.addEventListener("mouseenter", () => window.clearInterval(shootTimer));
    shootGallery.addEventListener("mouseleave", restartShootTimer);
    shootGallery.addEventListener("focusin", () => window.clearInterval(shootTimer));
    shootGallery.addEventListener("focusout", restartShootTimer);
    const GH_API = "https://api.github.com/repos/JohnAyo-dev/GlamourHouse/contents/assets/images/GH?ref=master";
    let shootSignature = "";
    function applyShootPhotos(photos) {
      if (!photos.length) return;
      const signature = photos.map((photo) => photo.src).join("|");
      if (signature === shootSignature) return;
      shootSignature = signature;
      shootPhotos = photos;
      renderShootPhotos();
    }
    const refreshShootPhotos = () => loadFolderPhotos({
      folder: "assets/images/GH/",
      api: GH_API,
      cacheKey: "gh_photos_v1",
      prefix: "GH",
      alt: (name, i) => "Glamour House shoot photo " + (i + 1),
    }).then(applyShootPhotos);

    renderShootPhotos();
    refreshShootPhotos();
    window.setInterval(() => { if (!document.hidden) refreshShootPhotos(); }, 5 * 60 * 1000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshShootPhotos(); });
  }

  /* ================= MEET THE MODELS ================= */
  const modelList = document.getElementById("model-list");
  const modelGallery = document.getElementById("model-gallery");
  const modelGalleryTrack = document.getElementById("model-gallery-track");
  const modelGalleryDots = document.getElementById("model-gallery-dots");
  const modelGalleryName = document.getElementById("model-gallery-name");
  const modelGalleryCount = document.getElementById("model-gallery-count");
  if (modelList && modelGalleryTrack) {
    let modelPhotos = [];
    let modelSlide = 0;
    let modelTimer;
    let modelSignature = "";
    function showModelSlide(index) {
      if (!modelPhotos.length) return;
      modelSlide = (index + modelPhotos.length) % modelPhotos.length;
      modelGalleryTrack.querySelectorAll(".model-gallery-slide").forEach((slide, i) => {
        slide.classList.toggle("is-active", i === modelSlide);
        slide.setAttribute("aria-hidden", i === modelSlide ? "false" : "true");
      });
      modelGalleryDots.querySelectorAll("button").forEach((dot, i) => {
        dot.classList.toggle("is-active", i === modelSlide);
        dot.setAttribute("aria-current", i === modelSlide ? "true" : "false");
      });
      modelGalleryCount.textContent = String(modelSlide + 1).padStart(2, "0") + " / " + String(modelPhotos.length).padStart(2, "0");
      const activeName = modelPhotos[modelSlide].name;
      modelGalleryName.textContent = activeName;
      modelList.querySelectorAll(".model-select").forEach((button) => {
        const active = button.dataset.model === activeName;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-expanded", active ? "true" : "false");
      });
    }
    function restartModelTimer() {
      window.clearInterval(modelTimer);
      if (modelPhotos.length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        modelTimer = window.setInterval(() => showModelSlide(modelSlide + 1), 4800);
      }
    }
    function selectModel(button) {
      modelList.querySelectorAll(".model-select").forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-expanded", active ? "true" : "false");
      });
      const index = modelPhotos.findIndex((photo) => photo.name === button.dataset.model);
      showModelSlide(index >= 0 ? index : 0);
      modelGallery.classList.remove("is-arriving");
      requestAnimationFrame(() => modelGallery.classList.add("is-arriving"));
      restartModelTimer();
    }
    function renderModels(photos) {
      modelPhotos = photos;
      modelGalleryTrack.replaceChildren();
      modelGalleryDots.replaceChildren();
      modelList.replaceChildren();
      photos.forEach((photo, i) => {
        const slide = document.createElement("figure");
        slide.className = "model-gallery-slide";
        const img = document.createElement("img");
        img.src = photo.src;
        img.alt = photo.alt || photo.name + " — Glamour House model";
        img.loading = i === 0 ? "eager" : "lazy";
        slide.appendChild(img);
        modelGalleryTrack.appendChild(slide);

        const dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("aria-label", "Show " + photo.name);
        dot.addEventListener("click", () => { showModelSlide(i); restartModelTimer(); });
        modelGalleryDots.appendChild(dot);

        const button = document.createElement("button");
        button.className = "model-select";
        button.type = "button";
        button.dataset.model = photo.name;
        button.setAttribute("aria-expanded", "false");
        const number = document.createElement("span");
        number.className = "model-number";
        number.textContent = String(i + 1).padStart(2, "0");
        const name = document.createElement("span");
        name.className = "model-name";
        name.textContent = photo.name;
        const arrow = document.createElement("span");
        arrow.className = "model-arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "↗";
        button.append(number, name, arrow);
        button.addEventListener("mouseenter", () => selectModel(button));
        button.addEventListener("focus", () => selectModel(button));
        button.addEventListener("click", () => selectModel(button));
        const item = document.createElement("li");
        item.appendChild(button);
        modelList.appendChild(item);
      });
      showModelSlide(0);
      const first = modelList.querySelector(".model-select");
      if (first) selectModel(first);
    }
    function applyModels(photos) {
      if (!photos.length) return;
      const signature = photos.map((photo) => photo.src).join("|");
      if (signature === modelSignature) return;
      modelSignature = signature;
      renderModels(photos);
    }
    modelGallery.querySelector(".model-gallery-prev").addEventListener("click", () => { showModelSlide(modelSlide - 1); restartModelTimer(); });
    modelGallery.querySelector(".model-gallery-next").addEventListener("click", () => { showModelSlide(modelSlide + 1); restartModelTimer(); });
    modelGallery.addEventListener("mouseenter", () => window.clearInterval(modelTimer));
    modelGallery.addEventListener("mouseleave", restartModelTimer);
    const refreshModels = () => loadFolderPhotos({
      folder: "assets/images/Models/",
      api: "https://api.github.com/repos/JohnAyo-dev/GlamourHouse/contents/assets/images/Models?ref=master",
      cacheKey: "gh_models_v1",
      manifest: "assets/images/Models/models.json",
      alt: (name) => name + " — Glamour House model",
    }).then(applyModels);

    refreshModels();
    window.setInterval(() => { if (!document.hidden) refreshModels(); }, 5 * 60 * 1000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshModels(); });
  }

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
    ".section-head, .timeline-item, .whiteboard, .cufs-banner, .launch-panel"
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
  /* ================= THEME TOGGLE ================= */
  const themeToggle = document.getElementById("theme-toggle");
  const syncThemeBtn = () => {
    const isDark = document.documentElement.dataset.theme === "dark";
    themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    themeToggle.setAttribute("title", isDark ? "Light mode" : "Dark mode");
  };
  themeToggle.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("gh_theme", next);
    } catch {
      /* storage unavailable — session-only */
    }
    syncThemeBtn();
  });
  syncThemeBtn();
})();
