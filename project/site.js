/* ============================================================
   ERBERK — interactions
   ============================================================ */
import { createChrome } from "./chrome.js?v=5";
import { SW_CATS, SW_PROJECTS } from "./projects.js?v=3";

const { gsap, ScrollTrigger, SplitText, Lenis } = window;
gsap.registerPlugin(ScrollTrigger, SplitText);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
const mobile = () => matchMedia("(max-width: 860px)").matches;

/* ---------------------------------------------------------- chrome */
let chrome = null;
try { chrome = createChrome($("#chrome")); } catch (e) { console.warn("chrome:", e); }
if (!chrome) document.documentElement.classList.add("no-gl");
const T = chrome ? chrome.target : { };

/* ---------------------------------------------------------- lenis */
const lenis = new Lenis({ lerp: 0.09 });
lenis.stop();
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
$$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
  const id = a.getAttribute("href");
  if (id.length < 2 || !document.querySelector(id)) return;
  e.preventDefault();
  lenis.scrollTo(id === "#top" ? 0 : id, { duration: 1.6 });
}));

/* ---------------------------------------------------------- cursor */
const cursor = $(".cursor"), ring = $(".cursor__ring"), clabel = $(".cursor__label");
const cp = { x: -100, y: -100 }, rp = { x: -100, y: -100 };
addEventListener("pointermove", (e) => {
  cp.x = e.clientX; cp.y = e.clientY;
  document.documentElement.classList.add("cursor-live");
}, { passive: true });
gsap.ticker.add(() => {
  rp.x += (cp.x - rp.x) * 0.2; rp.y += (cp.y - rp.y) * 0.2;
  ring.style.transform = `translate3d(${rp.x}px, ${rp.y}px, 0)`;
});
function setCursor(kind, label = "") {
  cursor.classList.toggle("is-link", kind === "link");
  cursor.classList.toggle("is-label", kind === "label");
  clabel.textContent = label;
}
document.addEventListener("pointerover", (e) => {
  const t = e.target.closest?.("[data-cursor], a, button");
  if (!t) return setCursor("");
  if (t.dataset.cursor) setCursor("label", t.dataset.cursor);
  else setCursor("link");
}, { passive: true });

if (fine && !reduced) {
  $$(".magnetic").forEach((el) => {
    const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.3); yTo((e.clientY - r.top - r.height / 2) * 0.35);
    });
    el.addEventListener("pointerleave", () => { xTo(0); yTo(0); });
  });
}

// clicking empty space splashes the metal
addEventListener("pointerdown", (e) => {
  if (!chrome || e.target.closest("a, button, input, textarea, label, .mail-pop, .proj")) return;
  chrome.splash(1);
});

/* ---------------------------------------------------------- clock + progress */
const timeEl = $("#time");
const tick = () => { timeEl.textContent = "Istanbul · " + new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" }); };
tick(); setInterval(tick, 15000);
const progress = $("#progress");
lenis.on("scroll", ({ progress: p }) => { progress.style.transform = `scaleX(${p || 0})`; });

/* ---------------------------------------------------------- stack band */
const tracks = $$(".band__track").map((el) => {
  el.innerHTML += el.innerHTML; // seamless loop
  return { el, x: 0, dir: +el.dataset.dir };
});
let bandSign = 1;
gsap.ticker.add((_, dtMs) => {
  const v = lenis.velocity || 0;
  if (Math.abs(v) > 0.4) bandSign = Math.sign(v);
  if (chrome) T.vel = gsap.utils.clamp(-1, 1, v / 40);
  const speed = reduced ? 0 : 0.04 + Math.min(Math.abs(v), 60) * 0.01;
  tracks.forEach((t) => {
    const w = t.el.scrollWidth / 2;
    t.x -= speed * t.dir * bandSign * dtMs;
    if (w) t.x = ((t.x % w) - w) % w;
    t.el.style.transform = `translate3d(${t.x}px,0,0) skewX(${gsap.utils.clamp(-10, 10, -v * 0.18)}deg)`;
  });
});

/* ---------------------------------------------------------- selected work */
(function work() {
  const list = $("#workList"), filterEl = $("#workFilter");
  list.innerHTML = SW_PROJECTS.map((p, i) => `
    <li class="proj" data-cat="${p.cat}" data-i="${i}">
      <button class="proj__btn" aria-expanded="false" aria-controls="proj-${i}" data-cursor="Open">
        <span class="proj__num">${p.num}</span>
        <span class="proj__name">${p.name}</span>
        <span class="proj__tag">${p.tag} · ${p.year}</span>
      </button>
      <div class="proj__body" id="proj-${i}"><div class="proj__inner"><div>
        <p class="proj__blurb">${p.blurb}</p>
        <ul class="proj__stack">${p.stack.map((s) => `<li>${s}</li>`).join("")}</ul>
        <a class="proj__link" href="${p.url}" target="_blank" rel="noopener">${p.link} ↗</a>
      </div></div></div>
    </li>`).join("");
  const items = $$(".proj", list);
  const close = (li) => { li.classList.remove("is-open"); $(".proj__btn", li).setAttribute("aria-expanded", "false"); };
  items.forEach((li) => {
    const btn = $(".proj__btn", li);
    btn.addEventListener("click", () => {
      const open = !li.classList.contains("is-open");
      items.forEach(close);
      if (open) { li.classList.add("is-open"); btn.setAttribute("aria-expanded", "true"); btn.dataset.cursor = "Close"; }
      else btn.dataset.cursor = "Open";
      items.filter((x) => x !== li).forEach((x) => ($(".proj__btn", x).dataset.cursor = "Open"));
      chrome?.splash(0.6);
      setTimeout(() => ScrollTrigger.refresh(), 650);
    });
    btn.addEventListener("pointerenter", () => { if (chrome) T.hover = 1; });
    btn.addEventListener("pointerleave", () => { if (chrome) T.hover = 0; });
    btn.addEventListener("focus", () => { if (chrome) T.hover = 1; });
    btn.addEventListener("blur", () => { if (chrome) T.hover = 0; });
  });
  const cats = [{ id: "all", label: "All" }, ...SW_CATS];
  filterEl.innerHTML = cats.map((c) => `<button type="button" data-cat="${c.id}" aria-pressed="${c.id === "all"}">${c.label}</button>`).join("");
  $$("button", filterEl).forEach((b) => b.addEventListener("click", () => {
    $$("button", filterEl).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    items.forEach((li) => { li.hidden = b.dataset.cat !== "all" && li.dataset.cat !== b.dataset.cat; if (li.hidden) close(li); });
    chrome?.splash(0.4);
    ScrollTrigger.refresh();
  }));
})();

/* ---------------------------------------------------------- journey: active row */
const rowsWrap = $(".rows"), rows = $$(".row");
let activeRow = -1;
function updateRows() {
  const mid = innerHeight * 0.5;
  let best = -1, bestD = Infinity;
  rows.forEach((r, i) => {
    const b = r.getBoundingClientRect();
    if (b.bottom < innerHeight * 0.15 || b.top > innerHeight * 0.85) return;
    const d = Math.abs((b.top + b.bottom) / 2 - mid);
    if (d < bestD) { bestD = d; best = i; }
  });
  if (best !== activeRow) {
    activeRow = best;
    rows.forEach((r, i) => r.classList.toggle("is-active", i === best));
    rowsWrap.classList.toggle("has-active", best >= 0);
  }
  if (chrome && best >= 0) T.active = best;
}

/* ---------------------------------------------------------- section → chrome */
const secs = $$("main > section[data-shape]");
function readSec(el) {
  const m = mobile() && el.dataset.m ? el.dataset.m.split(" ").map(Number) : null;
  return { x: m ? m[0] : +el.dataset.x || 0, y: m ? m[1] : +el.dataset.y || 0, s: m ? m[2] : +el.dataset.s || 1, shape: el.dataset.shape };
}
gsap.ticker.add(() => {
  updateRows();
  if (!chrome) return;
  const vh = innerHeight;
  let o = readSec(secs[0]), shape = o.shape, local = 0;
  o = { ...o };
  for (let i = 1; i < secs.length; i++) {
    const r = secs[i].getBoundingClientRect();
    const p = gsap.utils.clamp(0, 1, (vh * 0.85 - r.top) / (vh * 0.7));
    if (p <= 0) break;
    const s = readSec(secs[i]);
    o.x += (s.x - o.x) * p; o.y += (s.y - o.y) * p; o.s += (s.s - o.s) * p;
    if (p > 0.4) {
      shape = s.shape;
      local = gsap.utils.clamp(0, 1, (vh - r.top) / (r.height + vh * 0.5));
    }
  }
  if (shape === secs[0].dataset.shape) local = gsap.utils.clamp(0, 1, scrollY / vh);
  T.local = local;
  T.shape = shape; T.x = o.x; T.y = o.y; T.scale = o.s;
  // on phones the metal sits behind copy, so it steps back while text is on screen
  T.dim = mobile() && shape !== "hero" ? 0.55 : 1;
});

/* ---------------------------------------------------------- text */
let splits = [];
function buildSplits() {
  splits.forEach((s) => s.revert());
  splits = [
    ...$$(".hero__name .line").map((el) => SplitText.create(el, { type: "chars", charsClass: "char" })),
    ...$$(".split").map((el) => SplitText.create(el, { type: "lines", mask: "lines", linesClass: "line" })),
  ];
}
function scrollAnims() {
  $$(".split").forEach((el) => {
    if (el.closest(".hero")) return;
    gsap.from($$(".line", el), { yPercent: 110, duration: 1.2, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: el, start: "top 88%" } });
  });
  gsap.from(".stat", { y: 40, opacity: 0, duration: 1.1, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: ".stats", start: "top 85%" } });
  gsap.from(".proj", { y: 30, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.04, scrollTrigger: { trigger: ".work__list", start: "top 88%" } });
  gsap.from(".row > *", { y: 30, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.07, scrollTrigger: { trigger: ".rows", start: "top 88%" } });
  gsap.from(".contact__headline .line, .say", { yPercent: 105, duration: 1.3, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: ".contact__headline", start: "top 80%" } });
  gsap.from(".contact__foot .col", { y: 20, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.06, scrollTrigger: { trigger: ".contact__foot", start: "top 95%" } });
}

/* ---------------------------------------------------------- stats counter */
$$(".stat .n").forEach((n) => {
  ScrollTrigger.create({
    trigger: n, start: "top 85%", once: true,
    onEnter: () => {
      const to = parseFloat(n.dataset.to || "0"), pre = n.dataset.prefix || "", suf = n.dataset.suffix || "";
      const o = { v: 0 };
      gsap.to(o, { v: to, duration: reduced ? 0 : 1.6, ease: "expo.out", onUpdate: () => { n.textContent = pre + Math.round(o.v).toLocaleString("en-US") + suf; } });
    },
  });
});

/* ---------------------------------------------------------- GitHub heatmap (cached 6h) */
(function heatmap() {
  const grid = $("#ghGrid");
  if (!grid) return;
  const totalEl = $("#ghTotal"), streakEl = $("#ghStreak");
  const USER = "erberkk", CACHE_KEY = "gh-heatmap-v1", CACHE_TTL = 6 * 60 * 60 * 1000;
  const today = new Date();
  const readCache = () => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { ts, byDate, total } = JSON.parse(raw);
      return ts && Date.now() - ts <= CACHE_TTL ? { byDate, total } : null;
    } catch { return null; }
  };
  const writeCache = (byDate, total) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), byDate, total })); } catch {} };
  function render(byDate, total) {
    const first = new Date(today);
    first.setDate(first.getDate() - 365);
    first.setDate(first.getDate() - first.getDay());
    const weeks = Math.ceil((today - first) / (7 * 86400000)) + 1;
    grid.style.gridTemplateColumns = `repeat(${weeks}, 1fr)`;
    const cells = [];
    let html = "";
    for (let w = 0; w < weeks; w++) for (let d = 0; d < 7; d++) {
      const date = new Date(first);
      date.setDate(first.getDate() + w * 7 + d);
      const key = date.toISOString().slice(0, 10), hit = byDate[key], future = date > today;
      const commits = hit ? hit.count : 0;
      cells.push({ date, commits, future });
      html += future ? `<div class="gh-cell" style="opacity:0.15"></div>` : `<div class="gh-cell ${hit && hit.level ? "l" + hit.level : ""}" title="${commits} contributions · ${key}"></div>`;
    }
    grid.innerHTML = html;
    let streak = 0;
    for (const c of cells.filter((c) => !c.future).sort((a, b) => b.date - a.date)) { if (c.commits > 0) streak++; else break; }
    totalEl.textContent = total.toLocaleString();
    streakEl.textContent = streak;
  }
  async function fetchAll() {
    let startYear = 2019;
    try { const u = await fetch(`https://api.github.com/users/${USER}`); if (u.ok) startYear = new Date((await u.json()).created_at).getFullYear(); } catch {}
    const years = [];
    for (let y = startYear; y <= today.getFullYear(); y++) years.push(y);
    const results = await Promise.all(years.map((y) => fetch(`https://github-contributions-api.jogruber.de/v4/${USER}?y=${y}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)));
    const byDate = {};
    let total = 0;
    results.forEach((d) => d?.contributions?.forEach((c) => { byDate[c.date] = c; total += c.count; }));
    return { byDate, total };
  }
  grid.style.gridTemplateColumns = "repeat(53, 1fr)";
  grid.innerHTML = '<div class="gh-cell"></div>'.repeat(53 * 7);
  const cached = readCache();
  if (cached) return render(cached.byDate, cached.total);
  fetchAll().then(({ byDate, total }) => { render(byDate, total); writeCache(byDate, total); })
    .catch(() => { totalEl.textContent = "n/a"; streakEl.textContent = "—"; });
})();

/* ---------------------------------------------------------- mail popup (Web3Forms via /api/contact) */
(function mailPopup() {
  const pop = $("#mailPop"), btn = $("#sayHiBtn"), form = $("#mailPopForm"), status = $("#mailPopStatus");
  if (!pop || !btn || !form) return;
  const open = () => { pop.classList.add("open"); pop.setAttribute("aria-hidden", "false"); lenis.stop(); chrome?.splash(1); setTimeout(() => form.querySelector("input[name=name]")?.focus(), 300); };
  const close = () => { pop.classList.remove("open"); pop.setAttribute("aria-hidden", "true"); lenis.start(); };
  btn.addEventListener("click", (e) => { e.preventDefault(); open(); });
  $$("[data-close]", pop).forEach((el) => el.addEventListener("click", close));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && pop.classList.contains("open")) close(); });
  // On any failure, hand the visitor a direct way to reach me instead of a dead end.
  function fail(msg) {
    status.className = "mail-pop__status mono err";
    status.textContent = msg + " Email me directly: ";
    const a = document.createElement("a");
    a.href = "mailto:erberk@erberkakbulut.com";
    a.textContent = "erberk@erberkakbulut.com";
    status.appendChild(a);
  }
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = {
      name: (fd.get("name") || "").toString().trim(),
      email: (fd.get("email") || "").toString().trim(),
      message: (fd.get("message") || "").toString().trim(),
      botcheck: !!fd.get("botcheck"),
    };
    const submit = form.querySelector(".mail-pop__send");
    submit.disabled = true;
    status.className = "mail-pop__status mono";
    status.textContent = "sending…";
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.success) {
        status.className = "mail-pop__status mono ok";
        status.textContent = "✓ sent. talk soon.";
        form.reset();
        setTimeout(() => { close(); status.textContent = ""; }, 2400);
      } else fail(j.message || "Failed.");
    } catch { fail("Network error."); }
    finally { submit.disabled = false; }
  });
})();

/* ---------------------------------------------------------- boot */
const countEl = $("#preCount"), bar = $("#preBar");
const shown = { v: 0 };
const loadTick = () => {
  shown.v += (1 - shown.v) * 0.05;
  countEl.textContent = String(Math.round(shown.v * 100)).padStart(3, "0");
  bar.style.transform = `scaleX(${shown.v})`;
};
gsap.ticker.add(loadTick);
await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);
await new Promise((r) => { const w = () => (shown.v > 0.995 ? r() : requestAnimationFrame(w)); w(); });
gsap.ticker.remove(loadTick);
countEl.textContent = "100";
buildSplits();
scrollAnims();
chrome?.snap();

const intro = gsap.timeline({ defaults: { ease: "expo.inOut" } })
  .to(".pre__count span", { yPercent: -110, duration: 0.8, ease: "expo.in" })
  .to("#pre", { clipPath: "inset(0 0 100% 0)", duration: 1.3 }, "-=0.1");
if (chrome) intro.fromTo(T, { intro: 0 }, { intro: 1, duration: 3.4, ease: "power2.out" }, "-=1.2");
intro
  .from(".hero__name .char", { yPercent: 115, duration: 1.4, ease: "expo.out", stagger: 0.035 }, "-=2.1")
  .from(".hero__sub .line", { yPercent: 110, duration: 1.2, ease: "expo.out", stagger: 0.08 }, "-=1.2")
  .from(".hero__meta, .hero__cta, .nav", { opacity: 0, duration: 1, ease: "power2.out" }, "-=1.1")
  .add(() => { document.body.classList.remove("is-loading"); $("#pre").remove(); lenis.start(); ScrollTrigger.refresh(); chrome?.splash(0.7); });

window.__done = true;
