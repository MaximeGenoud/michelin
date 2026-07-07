/* ============ Michelin Givisiez 100 — logique applicative ============ */
(function () {
  "use strict";

  const store = {
    get(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* mode privé */ }
    }
  };

  const KEYS = {
    registrations: "mg100.registrations",
    newsletter: "mg100.newsletter",
    memories: "mg100.memories"
  };

  /* ---------- Toasts ---------- */
  function toast(message, type = "success") {
    let root = document.getElementById("toast-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "toast-root";
      document.body.appendChild(root);
    }
    const el = document.createElement("div");
    el.className = "toast " + type;
    el.setAttribute("role", "status");
    el.innerHTML =
      '<span class="material-symbols-outlined icon-fill" style="font-size:20px">' +
      (type === "error" ? "error" : "check_circle") +
      "</span><span>" + message + "</span>";
    root.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; }, 3600);
    setTimeout(() => el.remove(), 4000);
  }

  /* ---------- Modales ---------- */
  let lastFocused = null;
  function openModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    document.querySelectorAll(".modal-backdrop.open").forEach((other) => {
      if (other !== m) { other.classList.remove("open"); other.setAttribute("aria-hidden", "true"); }
    });
    lastFocused = document.activeElement;
    m.classList.add("open");
    m.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    const first = m.querySelector("input, textarea, select, button");
    if (first) setTimeout(() => first.focus(), 60);
  }
  function closeModal(m) {
    if (typeof m === "string") m = document.getElementById(m);
    if (!m) return;
    m.classList.remove("open");
    m.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocused) lastFocused.focus();
  }
  document.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-open-modal]");
    if (opener) {
      e.preventDefault();
      const eventName = opener.getAttribute("data-event");
      if (eventName) {
        const select = document.querySelector("#modal-inscription select[name=event]");
        if (select) select.value = eventName;
      }
      openModal(opener.getAttribute("data-open-modal"));
      return;
    }
    const closer = e.target.closest("[data-close-modal]");
    if (closer) { closeModal(closer.closest(".modal-backdrop")); return; }
    if (e.target.classList && e.target.classList.contains("modal-backdrop")) closeModal(e.target);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") document.querySelectorAll(".modal-backdrop.open").forEach(closeModal);
  });

  /* ---------- Inscription à un événement ---------- */
  const inscriptionForm = document.getElementById("form-inscription");
  if (inscriptionForm) {
    inscriptionForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(inscriptionForm).entries());
      if (!data.name || !data.name.trim()) return toast("Veuillez indiquer votre nom.", "error");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || "")) return toast("Adresse e-mail invalide.", "error");
      const regs = store.get(KEYS.registrations, []);
      if (regs.some(r => r.email === data.email && r.event === data.event)) {
        return toast("Vous êtes déjà inscrit·e à cet événement.", "error");
      }
      regs.push({ ...data, date: new Date().toISOString() });
      store.set(KEYS.registrations, regs);
      inscriptionForm.reset();
      closeModal("modal-inscription");
      toast("Inscription confirmée pour « " + data.event + " ». À bientôt !");
      refreshRegistrationBadges();
    });
  }

  function refreshRegistrationBadges() {
    const regs = store.get(KEYS.registrations, []);
    document.querySelectorAll("[data-event-badge]").forEach((btn) => {
      const name = btn.getAttribute("data-event-badge");
      if (regs.some(r => r.event === name)) {
        btn.innerHTML =
          '<span class="material-symbols-outlined icon-fill text-lg">check_circle</span> Inscrit·e';
        btn.classList.add("pointer-events-none", "opacity-80");
      }
    });
  }
  refreshRegistrationBadges();

  /* ---------- Partager un souvenir ---------- */
  const memoryForm = document.getElementById("form-souvenir");
  if (memoryForm) {
    memoryForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(memoryForm).entries());
      if (!data.name || !data.name.trim()) return toast("Veuillez indiquer votre nom.", "error");
      if (!data.story || data.story.trim().length < 10) return toast("Racontez-nous un peu plus (10 caractères min.).", "error");
      const memories = store.get(KEYS.memories, []);
      memories.push({ ...data, date: new Date().toISOString() });
      store.set(KEYS.memories, memories);
      memoryForm.reset();
      closeModal("modal-souvenir");
      toast("Merci ! Votre souvenir a bien été transmis à l'équipe du centenaire.");
    });
  }

  /* ---------- Newsletter ---------- */
  document.querySelectorAll("form[data-newsletter]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = (new FormData(form).get("email") || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast("Adresse e-mail invalide.", "error");
      const list = store.get(KEYS.newsletter, []);
      if (list.includes(email)) return toast("Cette adresse est déjà inscrite.", "error");
      list.push(email);
      store.set(KEYS.newsletter, list);
      form.reset();
      toast("Inscription à la newsletter confirmée. Merci !");
    });
  });

  /* ---------- Modules intranet (non connectés) ---------- */
  document.querySelectorAll("[data-soon]").forEach((el) => {
    el.addEventListener("click", () => {
      toast("« " + el.getAttribute("data-soon") + " » sera connecté à l'intranet prochainement.", "error");
    });
  });

  /* ---------- Statut d'ouverture en direct (page Contact) ---------- */
  const statusEl = document.getElementById("open-status");
  if (statusEl) {
    function renderStatus() {
      const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Zurich" }));
      const day = now.getDay(); // 0 dim … 6 sam
      const minutes = now.getHours() * 60 + now.getMinutes();
      const open = day >= 1 && day <= 5 && minutes >= 8 * 60 && minutes < 17 * 60;
      const dot = document.getElementById("open-dot");
      if (open) {
        statusEl.textContent = "Ouvert jusqu'à 17:00";
        if (dot) dot.className = "h-2 w-2 rounded-full bg-emerald-500 animate-pulse";
      } else {
        const nextOpen = (day >= 1 && day <= 5 && minutes < 8 * 60) ? "aujourd'hui à 08:00"
          : (day === 5 && minutes >= 17 * 60) || day === 6 ? "lundi à 08:00"
          : day === 0 ? "lundi à 08:00" : "demain à 08:00";
        statusEl.textContent = "Fermé — réouverture " + nextOpen;
        if (dot) dot.className = "h-2 w-2 rounded-full bg-error";
      }
    }
    renderStatus();
    setInterval(renderStatus, 60000);
  }

  /* ---------- Apparition au défilement ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- Repli si une image distante ne charge pas ---------- */
  document.querySelectorAll("img[data-remote]").forEach((img) => {
    img.addEventListener("error", () => {
      img.removeAttribute("src");
      img.classList.add("img-fallback");
    });
  });
})();
