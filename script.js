/* =========================================================
   HELYNIA RAQUELA — Interaksi
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* =========================================================
     KONFIGURASI
     ========================================================= */

  // Integrasi jadwal dengan YouTube (waiting room / live).
  // Isi apiKey dengan YouTube Data API v3 key agar jadwal otomatis aktif.
  // Jika apiKey kosong / gagal, jadwal template mingguan di HTML yang dipakai.
  // PENTING: batasi key ini dengan "HTTP referrer" (domain website) di Google Cloud Console.
  const YT = {
    apiKey: "",
    handle: "helyniaraquela",   // handle channel tanpa "@"
    channelId: "",              // opsional (UCxxxx). Jika diisi, lookup handle dilewati.
    cacheMinutes: 10,           // data disimpan di browser pengunjung agar hemat kuota
    lookaheadDays: 7,           // jumlah hari yang ditampilkan di Royal Schedule
    channelUrl: "https://youtube.com/@helyniaraquela",
  };

  // Perayaan yang memunculkan banner di atas halaman (tanggal mengikuti WIB).
  // month: 1–12, length: lama banner tampil (hari) dihitung dari tanggalnya.
  const CELEBRATIONS = [
    {
      id: "anniversary",
      month: 10, day: 29, length: 8, sinceYear: 2023,
      text: (n, isDay) => isDay
        ? `✦ Hari ini Anniversary ke-${n} Helynia Raquela! Terima kasih telah setia, Hellper ✦`
        : `✦ Selamat Anniversary ke-${n}, Helynia Raquela! Terima kasih telah setia, Hellper ✦`,
    },
    {
      id: "birthday",
      month: 2, day: 6, length: 8,
      className: "anniv-banner--bday",
      text: (_, isDay) => isDay
        ? `🎂 Hari ini ulang tahun sang putri! Selamat Ulang Tahun, Helynia Raquela ✦`
        : `🎂 Selamat Ulang Tahun, Helynia Raquela! Terima kasih telah setia, Hellper ✦`,
    },
  ];

  /* ========================================================= */

  const DEBUT = new Date(2023, 9, 29); // 29 Oktober 2023 (bulan 0-based)
  const DAY_MS = 86400000;
  const HOUR_MS = 3600000;
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const params = new URLSearchParams(location.search);

  // Helper zona waktu WIB (Asia/Jakarta, UTC+7, tanpa DST)
  const TZ = "Asia/Jakarta";
  const fmtWIB = (d, opts) => new Intl.DateTimeFormat("id-ID", { timeZone: TZ, ...opts }).format(d);
  const wibKey = (d) => fmtWIB(d, { year: "numeric", month: "2-digit", day: "2-digit" });
  const wibTime = (d) => fmtWIB(d, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const wibParts = (d = new Date()) => {
    const w = new Date(d.getTime() + 7 * HOUR_MS);
    return { y: w.getUTCFullYear(), m: w.getUTCMonth(), d: w.getUTCDate(), wd: w.getUTCDay() };
  };
  // Date untuk jam tertentu (WIB) pada hari ini + offset hari
  const wibAt = (offsetDays, hh, mm = 0) => {
    const p = wibParts();
    return new Date(Date.UTC(p.y, p.m, p.d + offsetDays, hh - 7, mm));
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage penuh / diblokir */ } },
  };

  /* ---------- Tahun footer ---------- */
  $("#year").textContent = today.getFullYear();

  /* ---------- Hari bertakhta sejak debut ---------- */
  const reignDays = Math.max(0, Math.round((todayMidnight - DEBUT) / DAY_MS));
  $("#reignDays").textContent = reignDays.toLocaleString("id-ID");

  /* ---------- Banner perayaan (anniversary & ulang tahun) ----------
     Pratinjau: tambahkan ?celebrate=birthday atau ?celebrate=anniversary di URL. */
  (() => {
    const p = wibParts();
    const todayUTC = Date.UTC(p.y, p.m, p.d);
    const preview = params.get("celebrate");

    let active = null;
    for (const c of CELEBRATIONS) {
      if (preview) {
        if (preview === c.id) active = { c, year: p.y, isDay: true };
      } else {
        for (const yr of [p.y, p.y - 1]) {
          const start = Date.UTC(yr, c.month - 1, c.day);
          if (todayUTC >= start && todayUTC < start + c.length * DAY_MS) {
            active = { c, year: yr, isDay: todayUTC === start };
            break;
          }
        }
      }
      if (active) break;
    }
    if (!active) return;

    const { c, year, isDay } = active;
    const n = c.sinceYear ? year - c.sinceYear : null;
    if (c.sinceYear && n < 1) return;

    const closedKey = `celebrationClosed:${c.id}:${year}`;
    if (!preview && sessionStorage.getItem(closedKey)) return;

    const banner = $("#annivBanner");
    $("#annivText").textContent = c.text(n, isDay);
    if (c.className) banner.classList.add(c.className);
    banner.hidden = false;
    document.documentElement.dataset.celebrate = c.id;
    $("#annivClose").addEventListener("click", () => {
      banner.hidden = true;
      sessionStorage.setItem(closedKey, "1");
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

  /* ---------- Royal Schedule ----------
     Mode 1 (YouTube): jika YT.apiKey diisi, jadwal dibangun dari waiting room / live di channel.
     Mode 2 (Template): jadwal mingguan di HTML (fallback bila API tidak tersedia).
     Pratinjau mode YouTube tanpa API key: tambahkan ?schedule=demo di URL. */
  (() => {
    const grid = $(".schedule");
    const status = $("#scheduleStatus");
    const note = $(".schedule__note");
    if (!grid || !status) return;

    const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const defaultNote = note ? note.innerHTML : "";
    const watchUrl = (id) => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;

    const relTime = (ms) => {
      if (ms <= 60000) return "sebentar lagi";
      const mins = Math.round(ms / 60000);
      if (mins < 60) return `dalam ${mins} menit`;
      const h = Math.floor(mins / 60);
      if (h < 24) return `dalam ${h} jam${mins % 60 ? ` ${mins % 60} menit` : ""}`;
      return `dalam ${Math.round(h / 24)} hari`;
    };

    /* ----- Mode template ----- */
    const renderTemplate = () => {
      grid.classList.remove("schedule--loading", "schedule--yt");
      if (note) note.innerHTML = defaultNote;
      const todayIdx = wibParts().wd;
      const days = $$(".day", grid);
      days.forEach((d) => d.classList.toggle("is-today", Number(d.dataset.day) === todayIdx));

      for (let offset = 0; offset < 8; offset++) {
        const idx = (todayIdx + offset) % 7;
        const card = days.find((d) => Number(d.dataset.day) === idx && d.classList.contains("day--live"));
        if (!card) continue;
        // Hari ini sudah lewat jam siaran (asumsi selesai ±23.00 WIB) → cari hari berikutnya
        if (offset === 0 && Date.now() > wibAt(0, 23).getTime()) continue;

        days.forEach((d) => d.classList.remove("is-next"));
        card.classList.add("is-next");
        const title = $(".day__title", card).textContent.replace(/\s+/g, " ").trim();
        const timeTxt = ($(".day__time", card)?.textContent || "").replace(/[^\d.:]+/g, " ").trim() || "20.00";
        const [hh, mm] = timeTxt.split(/[.:]/).map(Number);
        const start = wibAt(offset, hh || 20, mm || 0);
        const diff = start - Date.now();

        if (offset === 0 && diff <= 0) {
          status.innerHTML = `🔴 Waktunya siaran! <b>${esc(title)}</b> &mdash; <a href="${YT.channelUrl}" target="_blank" rel="noopener">cek YouTube</a>`;
        } else if (offset === 0) {
          status.innerHTML = `🔴 Hari ini sang putri akan siaran: <b>${esc(title)}</b> <span>(${wibTime(start)} WIB · ${relTime(diff)})</span>`;
        } else {
          status.innerHTML = `Siaran berikutnya: <b>${dayNames[idx]}</b> &mdash; ${esc(title)} <span>(${wibTime(start)} WIB · ${relTime(diff)})</span>`;
        }
        break;
      }
    };

    /* ----- Mode YouTube ----- */
    const api = async (path, query) => {
      const url = `https://www.googleapis.com/youtube/v3/${path}?${new URLSearchParams({ ...query, key: YT.apiKey })}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`YouTube API ${res.status}`);
      return res.json();
    };

    const getUploadsPlaylist = async () => {
      const key = `yt:uploads:${YT.channelId || YT.handle}`;
      const cached = store.get(key);
      if (cached) return cached;
      const q = YT.channelId ? { part: "contentDetails", id: YT.channelId } : { part: "contentDetails", forHandle: YT.handle };
      const data = await api("channels", q);
      const id = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!id) throw new Error("Channel tidak ditemukan");
      store.set(key, id);
      return id;
    };

    const getStreams = async (force = false) => {
      const key = `yt:streams:${YT.channelId || YT.handle}`;
      const cached = JSON.parse(store.get(key) || "null");
      if (!force && cached && Date.now() - cached.t < YT.cacheMinutes * 60000) return cached;

      const uploads = await getUploadsPlaylist();
      // Waiting room terjadwal ikut masuk playlist "uploads" (urut berdasarkan waktu dibuat)
      const pl = await api("playlistItems", { part: "contentDetails", playlistId: uploads, maxResults: 25 });
      const ids = (pl.items || []).map((i) => i.contentDetails.videoId).join(",");
      let items = [];
      if (ids) {
        const v = await api("videos", { part: "snippet,liveStreamingDetails", id: ids });
        items = (v.items || [])
          .filter((x) => ["upcoming", "live"].includes(x.snippet.liveBroadcastContent) && x.liveStreamingDetails)
          .map((x) => ({
            id: x.id,
            title: x.snippet.title,
            status: x.snippet.liveBroadcastContent,
            start: x.liveStreamingDetails.actualStartTime || x.liveStreamingDetails.scheduledStartTime,
            thumb: x.snippet.thumbnails?.medium?.url || x.snippet.thumbnails?.default?.url || "",
          }))
          .filter((x) => x.start);
      }
      const payload = { t: Date.now(), items };
      store.set(key, JSON.stringify(payload));
      return payload;
    };

    // Data contoh untuk ?schedule=demo
    const demoStreams = () => ({
      t: Date.now(),
      items: [
        { id: "demo1", title: "【FREETALK】Ngobrol santai bareng Hellper~ #Helonair", status: "upcoming", start: wibAt(0, 20).toISOString(), thumb: "" },
        { id: "demo2", title: "【HORROR】Jangan tinggalkan sang putri sendirian… #Helonair", status: "upcoming", start: wibAt(2, 20).toISOString(), thumb: "" },
        { id: "demo3", title: "【Wuthering Waves】Gacha pakai uang persembahan rakyat", status: "upcoming", start: wibAt(4, 19, 30).toISOString(), thumb: "" },
      ],
    });

    const streamCard = (s) => {
      const isLive = s.status === "live";
      const start = new Date(s.start);
      const href = s.id.startsWith("demo") ? YT.channelUrl : watchUrl(s.id);
      return `
        <a class="stream${isLive ? " stream--live" : ""}" href="${href}" target="_blank" rel="noopener">
          <span class="stream__thumb">${s.thumb ? `<img src="${esc(s.thumb)}" alt="" loading="lazy" />` : `<i aria-hidden="true">▶</i>`}</span>
          <span class="stream__title">${esc(s.title)}</span>
          <span class="day__time">${isLive ? "🔴 Sedang Live" : `⏳ ${wibTime(start)} WIB`}</span>
        </a>`;
    };

    const renderYouTube = ({ t, items }) => {
      const now = Date.now();
      const streams = items
        // buang waiting room usang yang tidak pernah dimulai
        .filter((s) => s.status === "live" || new Date(s.start).getTime() > now - 6 * HOUR_MS)
        .sort((a, b) => new Date(a.start) - new Date(b.start));

      const days = Array.from({ length: YT.lookaheadDays }, (_, o) => {
        const date = wibAt(o, 12);
        return { o, date, key: wibKey(date), items: [] };
      });
      streams.forEach((s) => {
        const day = days.find((d) => d.key === wibKey(new Date(s.start)));
        if (day) day.items.push(s);
        else if (s.status === "live") days[0].items.unshift(s); // live sejak kemarin
      });

      const next = streams.find((s) => s.status === "live") || streams.find((s) => new Date(s.start).getTime() > now - 3 * HOUR_MS);
      const nextKey = next ? (next.status === "live" ? days[0].key : wibKey(new Date(next.start))) : null;

      grid.innerHTML = days.map((d) => {
        const has = d.items.length > 0;
        const live = d.items.some((s) => s.status === "live");
        const cls = ["day", has && "day--live", live && "day--onair", d.o === 0 && "is-today", d.key === nextKey && "is-next"].filter(Boolean).join(" ");
        return `
          <article class="${cls}">
            ${has ? `<span class="day__flag">${live ? "Live" : "Waiting Room"}</span>` : ""}
            <span class="day__name">${dayNames[wibParts(d.date).wd]}</span>
            <span class="day__date">${fmtWIB(d.date, { day: "numeric", month: "short" })}</span>
            ${has ? d.items.map(streamCard).join("") : `<span class="day__rest">Istirahat di Singgasana</span>`}
          </article>`;
      }).join("");
      grid.classList.remove("schedule--loading");
      grid.classList.add("schedule--yt");

      if (!next) {
        status.innerHTML = `Belum ada waiting room yang dijadwalkan. Pantau pengumuman di <a href="https://x.com/Helyniaraquela" target="_blank" rel="noopener">X</a> &amp; Discord.`;
      } else if (next.status === "live") {
        status.innerHTML = `🔴 Sang putri sedang <b>LIVE</b>: ${esc(next.title)} &mdash; <a href="${watchUrl(next.id)}" target="_blank" rel="noopener">Tonton sekarang</a>`;
      } else {
        const start = new Date(next.start);
        const diff = start - now;
        const when = `${dayNames[wibParts(start).wd]}, ${fmtWIB(start, { day: "numeric", month: "short" })} · ${wibTime(start)} WIB`;
        status.innerHTML = `${diff <= 0 ? "🔴 Segera dimulai" : "Siaran berikutnya"}: <b>${when}</b> &mdash; ${esc(next.title)} <span>(${relTime(diff)})</span>`;
      }

      if (note) {
        note.innerHTML = `* Jadwal tersinkron otomatis dengan waiting room di <a href="${YT.channelUrl}" target="_blank" rel="noopener">YouTube</a> · diperbarui ${wibTime(new Date(t))} WIB.`;
      }
    };

    const demo = params.get("schedule") === "demo";
    if (!YT.apiKey && !demo) {
      renderTemplate();
      setInterval(renderTemplate, 60000);
      return;
    }

    let lastData = null;
    const load = async (force = false) => {
      try {
        lastData = demo ? demoStreams() : await getStreams(force);
        renderYouTube(lastData);
      } catch (err) {
        console.warn("[Royal Schedule] Gagal memuat data YouTube, memakai jadwal template.", err);
        if (!lastData) renderTemplate();
      }
    };

    grid.classList.add("schedule--loading");
    status.textContent = "Memeriksa waiting room di YouTube…";
    load();
    // Perbarui hitung mundur tiap menit & data tiap YT.cacheMinutes
    setInterval(() => lastData && renderYouTube(lastData), 60000);
    setInterval(() => !document.hidden && load(true), YT.cacheMinutes * 60000);
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
