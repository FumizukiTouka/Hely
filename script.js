/* =========================================================
   HELYNIA RAQUELA — Interaksi
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const DEBUT = new Date(2023, 9, 29); // 29 Oktober 2023 (bulan 0-based)
  const DAY_MS = 86400000;
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  /* ---------- Tahun footer ---------- */
  $("#year").textContent = today.getFullYear();

  /* ---------- Hari bertakhta sejak debut ---------- */
  const reignDays = Math.max(0, Math.round((todayMidnight - DEBUT) / DAY_MS));
  $("#reignDays").textContent = reignDays.toLocaleString("id-ID");

  /* ---------- Banner anniversary (29 Okt – 5 Nov) ---------- */
  (() => {
    const m = today.getMonth();
    const d = today.getDate();
    const inWindow = (m === 9 && d >= 29) || (m === 10 && d <= 5);
    const years = today.getFullYear() - DEBUT.getFullYear();
    if (!inWindow || years < 1 || sessionStorage.getItem("annivClosed")) return;

    const banner = $("#annivBanner");
    $("#annivText").textContent = `✦ Selamat Anniversary ke-${years}, Helynia Raquela! Terima kasih telah setia, Hellper ✦`;
    banner.hidden = false;
    $("#annivClose").addEventListener("click", () => {
      banner.hidden = true;
      sessionStorage.setItem("annivClosed", "1");
    });
  })();

  /* ---------- Navigasi ---------- */
  const nav = $("#nav");
  const navToggle = $("#navToggle");
  const navMenu = $("#navMenu");

  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 20);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const setMenu = (open) => {
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
    navMenu.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
  };
  navToggle.addEventListener("click", () => setMenu(navToggle.getAttribute("aria-expanded") !== "true"));
  $$("a", navMenu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => e.key === "Escape" && setMenu(false));

  // Tandai menu aktif sesuai section yang terlihat
  const navLinks = $$("a", navMenu);
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${id}`));
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  $$("main section[id]").forEach((s) => sectionObserver.observe(s));

  /* ---------- Reveal on scroll (dengan stagger) ---------- */
  const reveals = $$(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("is-visible"));
  } else {
    // Stagger antar saudara dalam satu parent
    const groups = new Map();
    reveals.forEach((el) => {
      const list = groups.get(el.parentElement) || [];
      list.push(el);
      groups.set(el.parentElement, list);
    });
    groups.forEach((list) => list.forEach((el, i) => (el.style.transitionDelay = `${Math.min(i * 80, 480)}ms`)));

    const revealObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
          // Setelah muncul, lepas kelas reveal agar transisi hover milik elemen kembali aktif
          setTimeout(() => {
            entry.target.style.transitionDelay = "";
            entry.target.classList.remove("reveal", "is-visible");
          }, 1500);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => revealObserver.observe(el));
  }

  /* ---------- Jadwal: hari ini & siaran berikutnya ---------- */
  (() => {
    const days = $$(".day");
    const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const todayIdx = today.getDay();
    const status = $("#scheduleStatus");

    days.forEach((d) => d.classList.toggle("is-today", Number(d.dataset.day) === todayIdx));

    for (let offset = 0; offset < 7; offset++) {
      const idx = (todayIdx + offset) % 7;
      const card = days.find((d) => Number(d.dataset.day) === idx && d.classList.contains("day--live"));
      if (!card) continue;

      card.classList.add("is-next");
      const title = $(".day__title", card).textContent.replace(/\s+/g, " ").trim();
      if (offset === 0) {
        status.innerHTML = `🔴 Hari ini sang putri akan siaran: <b>${title}</b> <span>(20.00 WIB)</span>`;
      } else {
        const when = offset === 1 ? "besok" : `dalam ${offset} hari`;
        status.innerHTML = `Siaran berikutnya: <b>${dayNames[idx]}</b> &mdash; ${title} <span>(20.00 WIB · ${when})</span>`;
      }
      break;
    }
  })();

  /* ---------- Salin ke clipboard ---------- */
  const toast = $("#toast");
  let toastTimer;
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    }
  };

  $$("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const text = btn.dataset.copy;
      const ok = await copyText(text);
      showToast(ok ? `✦ ${text} disalin` : "Gagal menyalin, coba manual ya~");
      if (ok && btn.classList.contains("tag")) {
        btn.classList.add("is-copied");
        setTimeout(() => btn.classList.remove("is-copied"), 1800);
      }
    });
  });

  /* ---------- Portrait: deteksi gambar & efek tilt ---------- */
  const portrait = $("#portrait");
  if ($(".portrait__img", portrait)) portrait.classList.add("has-image");

  if (finePointer && !reduceMotion) {
    const art = $(".hero__art");
    art.addEventListener("mousemove", (e) => {
      const r = art.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      portrait.style.transform = `rotateY(${x * 12}deg) rotateX(${-y * 12}deg)`;
    });
    art.addEventListener("mouseleave", () => (portrait.style.transform = ""));
  }

  /* ---------- Link card spotlight ---------- */
  $$(".link-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });

  /* ---------- Cursor glow ---------- */
  if (finePointer && !reduceMotion) {
    const glow = $(".cursor-glow");
    let gx = 0, gy = 0, tx = 0, ty = 0, started = false;
    window.addEventListener("mousemove", (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!started) {
        started = true;
        gx = tx; gy = ty;
        document.body.classList.add("has-pointer");
        requestAnimationFrame(follow);
      }
    }, { passive: true });
    function follow() {
      gx += (tx - gx) * 0.12;
      gy += (ty - gy) * 0.12;
      glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
      requestAnimationFrame(follow);
    }
  }

  /* ---------- Bara api (embers) ---------- */
  (() => {
    if (reduceMotion) return;
    const canvas = $("#embers");
    const ctx = canvas.getContext("2d");
    let w, h, dpr, particles = [];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width = window.innerWidth * dpr;
      h = canvas.height = window.innerHeight * dpr;
      const count = Math.round(Math.min(70, (window.innerWidth * window.innerHeight) / 22000));
      particles = Array.from({ length: count }, () => spawn(true));
    };

    const spawn = (anywhere = false) => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10 * dpr,
      r: (Math.random() * 1.8 + 0.4) * dpr,
      vy: (Math.random() * 0.5 + 0.15) * dpr,
      vx: (Math.random() - 0.5) * 0.25 * dpr,
      sway: Math.random() * Math.PI * 2,
      life: Math.random() * 0.6 + 0.4,
      hue: Math.random() < 0.82 ? 350 : 40, // merah darah / emas
    });

    let visible = true;
    document.addEventListener("visibilitychange", () => {
      visible = !document.hidden;
      if (visible) requestAnimationFrame(tick);
    });

    function tick() {
      if (!visible) return;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.sway += 0.02;
        p.x += p.vx + Math.sin(p.sway) * 0.3 * dpr;
        p.y -= p.vy;
        const fade = Math.min(1, p.y / (h * 0.6)) * p.life;
        if (p.y < -10 || fade <= 0.01) { particles[i] = spawn(); continue; }

        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, `hsla(${p.hue}, 90%, 62%, ${fade})`);
        g.addColorStop(1, `hsla(${p.hue}, 90%, 50%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(tick);
    }

    resize();
    let rt;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(resize, 200); });
    requestAnimationFrame(tick);
  })();

  /* ---------- Easter egg: panggil sang putri ----------
     Klik mahkota 3x, atau ketik "hel" di keyboard. */
  (() => {
    const summon = $("#summon");
    const trigger = () => {
      summon.classList.remove("is-active");
      void summon.offsetWidth; // restart animasi
      summon.classList.add("is-active");
    };

    let clicks = 0, clickTimer;
    $(".hero__crown").addEventListener("click", () => {
      clicks++;
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => (clicks = 0), 900);
      if (clicks >= 3) { clicks = 0; trigger(); }
    });

    let buffer = "";
    document.addEventListener("keydown", (e) => {
      if (e.target.matches("input, textarea") || e.key.length !== 1) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-3);
      if (buffer === "hel") { buffer = ""; trigger(); }
    });
  })();
})();
