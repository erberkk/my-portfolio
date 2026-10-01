/* ============================================================
   SELECTED WORK — VINYL (interactive)
   Drag to spin · click tracks · play/pause · RPM changes
   ============================================================ */

const SW_PROJECTS = [
  { num: '01', name: '<em>Stackmate</em>', plain: 'Stackmate', tag: 'Co-founder Match · Mobile', year: '2026',
    blurb: 'Swipe-style matching for co-founders: verified profiles, a multi-factor compatibility engine that scores in the background, blind post-meeting reviews, subscriptions and calendar-based scheduling. Designed, built and shipped solo. Live on the App Store, Android on the way.',
    stack: ['Flutter', 'FastAPI', 'PostgreSQL', 'Supabase'], color: 'accent', url: 'https://stackmateapp.com', link: 'stackmateapp.com' },
  { num: '02', name: '<em>Pixy</em>', plain: 'Pixy', tag: 'Desktop · Local AI', year: '2026',
    blurb: 'A small robot that sits on your desktop. It catches permission prompts from Claude Code and puts them on top of every window, chats with a model on your own machine, and listens when you say "hey pixy". Nothing leaves the disk it was written to.',
    stack: ['Rust', 'Tauri', 'Local LLM', 'Whisper'], color: 'lime', url: 'https://pixy-omega.vercel.app', link: 'pixy-omega.vercel.app' },
  { num: '03', name: 'Fay <em>Gurme</em>', plain: 'Fay Gurme', tag: 'Concept · Digital menu', year: '2026',
    blurb: 'A bilingual QR menu concept for a restaurant in Bolu: a scroll-driven editorial opening, then 198 dishes with Turkish-aware search, allergen labels and a saved list. Vanilla JS and GSAP, no framework, zero WCAG AA violations under axe-core.',
    stack: ['Vanilla JS', 'GSAP', 'Node', 'Playwright'], color: 'accent', url: 'https://fay-gurme-demo.vercel.app', link: 'fay-gurme-demo.vercel.app' },
  { num: '04', name: 'Sarıcaer <em>Studio</em>', plain: 'Sarıcaer Studio', tag: 'Client Work · Motion', year: '2026',
    blurb: 'A trilingual one-pager for a fitness studio in Bolu: pinned scroll sequences, a hand-rolled responsive image pipeline, and WhatsApp-based signup that stores nothing server-side. Static export, no backend to run.',
    stack: ['Next.js', 'Motion', 'Tailwind', 'Lenis'], color: 'lime', url: 'https://www.saricaerstudio.com', link: 'saricaerstudio.com' },
  { num: '05', name: '<em>Nimbus</em>', plain: 'Nimbus', tag: 'Cloud · RAG', year: '2025',
    blurb: 'Your files, searchable by meaning. Drop a PDF, ask a question, get cited answers. Multi-language and multi-tenant.',
    stack: ['Go · Fiber', 'MongoDB', 'MinIO', 'React', 'RAG'], color: 'accent', url: 'https://github.com/erberkk/Nimbus', link: 'Source on GitHub' },
  { num: '06', name: 'Error <em>Agent</em>', plain: 'Error Agent', tag: 'Developer tooling · AI', year: '2024',
    blurb: 'A Python library that watches production for errors, reasons about stack traces, opens a GitHub PR with a fix, and pings the team on Slack.',
    stack: ['Python', 'FastAPI', 'LLM', 'GitHub API'], color: 'lime', url: 'https://github.com/erberkk/python-error-agent', link: 'Source on GitHub' },
  { num: '07', name: 'Claude · <em>Figma</em>', plain: 'Claude × Figma', tag: 'Design Ops · Plugin', year: '2025',
    blurb: 'A Figma plugin wired to Claude. Select frames, ask natural-language questions about the design, and get back actionable edits and analysis.',
    stack: ['TypeScript', 'Figma API', 'Claude'], color: 'accent', url: 'https://github.com/erberkk/claude-figma-plugin', link: 'Source on GitHub' },
  { num: '08', name: 'GitHub <em>Streak Stats</em>', plain: 'GitHub Streak Stats', tag: 'README · Open source', year: '2025',
    blurb: 'An animated SVG widget for your GitHub profile README that pulls your live contribution streak and renders it as a self-updating card.',
    stack: ['SVG', 'Node', 'GitHub API', 'GitHub Actions'], color: 'lime', url: 'https://github.com/erberkk/github-streak-stats', link: 'Source on GitHub' },
  { num: '09', name: '<em>Spotify</em> Stats', plain: 'Spotify Stats', tag: 'README · Open source', year: '2025',
    blurb: 'A companion README widget that shows your currently-playing track and most-listened artists, refreshed on its own schedule.',
    stack: ['SVG', 'Node', 'Spotify API', 'OAuth'], color: 'accent', url: 'https://github.com/erberkk/spotify-stats', link: 'Source on GitHub' },
  { num: '10', name: 'Heart · <em>Detection</em>', plain: 'Heart Disease Detection', tag: 'Health · Award', year: '2024',
    blurb: 'A TensorFlow model that estimates heart-disease risk from clinical inputs. Engineering Project of the Year, Beykoz University 2024.',
    stack: ['TensorFlow', 'Python', 'Flask'], color: 'lime', url: 'https://github.com/erberkk/diagnomodel', link: 'Source on GitHub' },
];

(function vinyl() {
  const stage = document.querySelector('.sw-v-G .vinyl-stage');
  if (!stage) return;

  const player = stage.querySelector('.vinyl-player');
  const discWrap = stage.querySelector('.vinyl-disc-wrap');
  const label = stage.querySelector('.vinyl-label');
  const arm = stage.querySelector('.vinyl-arm');
  const rpmB = stage.querySelector('.vinyl-rpm b');
  const sideSide = stage.querySelector('.vinyl-side-side');
  const sideTitle = stage.querySelector('.vinyl-side-title');
  const sideBlurb = stage.querySelector('.vinyl-side-blurb');
  const tracksEl = stage.querySelector('.vinyl-tracks');
  const visitEl = stage.querySelector('.vinyl-visit');
  const indexEl = document.querySelector('.sw-index-list');
  const countEl = stage.querySelector('.vinyl-nav-count b');
  const prev = stage.querySelector('.vinyl-nav-btn.prev');
  const next = stage.querySelector('.vinyl-nav-btn.next');
  const playPauseBtn = stage.querySelector('.vinyl-nav-btn.play-pause');

  // Indexed directly by project (no wraparound) — keep at least as many
  // letters as there are entries in SW_PROJECTS.
  const SIDE = ['A','B','C','D','E','F','G','H','I','J','K','L'];

  let idx = 0;
  let playing = true;
  let rotation = 0;         // current angle (deg)
  let velocity = 0.8;       // deg per frame (45rpm-ish visual)
  const targetVel = 0.9;    // play speed
  let currentTrack = 0;
  let lastDragAngle = null;
  let dragging = false;

  function render() {
    const p = SW_PROJECTS[idx];
    label.classList.remove('alt', 'dark');
    if (p.color === 'lime') label.classList.add('alt');
    else if (idx % 3 === 2) label.classList.add('dark');

    label.querySelector('.vinyl-label-num').textContent = 'PROJECT ' + p.num;
    label.querySelector('.vinyl-label-name').innerHTML = p.name;
    label.querySelector('.vinyl-label-tag').textContent = p.tag;

    sideSide.innerHTML = `SIDE <b>${SIDE[idx]}</b> · Project <b>${p.num}</b> · ${p.year}`;
    sideTitle.innerHTML = p.url
      ? `<a href="${p.url}" target="_blank" rel="noopener">${p.name} ↗</a>`
      : p.name;
    sideBlurb.textContent = p.blurb;
    visitEl.href = p.url;
    visitEl.innerHTML = `${p.url.includes('github.com') ? '' : 'Visit '}<b>${p.link}</b> ↗`;
    if (indexEl) indexEl.querySelectorAll('li').forEach((li, i) => li.classList.toggle('on', i === idx));

    tracksEl.innerHTML = p.stack.map((s, i) => `
      <li data-t="${i}" class="${i === currentTrack ? 'playing' : ''}">
        <span class="trk-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="trk-name">${s}</span>
      </li>
    `).join('');
    tracksEl.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', () => {
        currentTrack = parseInt(li.dataset.t);
        tracksEl.querySelectorAll('li').forEach(x => x.classList.toggle('playing', parseInt(x.dataset.t) === currentTrack));
        setArm();
      });
    });

    countEl.textContent = (idx + 1) + ' / ' + SW_PROJECTS.length;
    setArm();
  }

  function setArm() {
    // arm angle based on current track — outer edge for track 0, inner for last
    const tracks = SW_PROJECTS[idx].stack.length;
    const t = tracks > 1 ? currentTrack / (tracks - 1) : 0;
    const angle = -22 + t * 10; // -22deg (outer) to -12deg (inner)
    arm.classList.add('skip');
    arm.style.transform = `rotate(${playing ? angle : -22}deg)`;
    setTimeout(() => arm.classList.remove('skip'), 400);
  }

  function updatePlayState() {
    playPauseBtn.textContent = playing ? '❚❚' : '▶';
    player.classList.toggle('paused', !playing);
    arm.classList.toggle('playing', playing);
    rpmB.textContent = playing ? '45 RPM' : 'STOP';
  }

  function togglePlay() {
    playing = !playing;
    updatePlayState();
    setArm();
  }

  if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlay);
  if (prev) prev.addEventListener('click', () => { idx = (idx - 1 + SW_PROJECTS.length) % SW_PROJECTS.length; currentTrack = 0; render(); });
  if (next) next.addEventListener('click', () => { idx = (idx + 1) % SW_PROJECTS.length; currentTrack = 0; render(); });

  // Drag to spin
  function getAngle(e) {
    const r = player.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - cx;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - cy;
    return Math.atan2(y, x) * 180 / Math.PI;
  }

  function onDown(e) {
    dragging = true;
    player.classList.add('dragging');
    lastDragAngle = getAngle(e);
    velocity = 0;
    e.preventDefault();
  }
  function onMove(e) {
    if (!dragging) return;
    const a = getAngle(e);
    let delta = a - lastDragAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    rotation += delta;
    velocity = delta; // momentum
    lastDragAngle = a;
    discWrap.style.transform = `rotate(${rotation}deg)`;
    // switch project when dragged past threshold in either direction
    if (Math.abs(rotation - spinBaseline) > 180) {
      if (rotation - spinBaseline > 0) idx = (idx + 1) % SW_PROJECTS.length;
      else idx = (idx - 1 + SW_PROJECTS.length) % SW_PROJECTS.length;
      spinBaseline = rotation;
      currentTrack = 0;
      render();
    }
  }
  let spinBaseline = 0;
  function onUp() {
    if (!dragging) return;
    dragging = false;
    player.classList.remove('dragging');
    // if playing, momentum decays toward target velocity
    // if paused, velocity decays to 0
  }

  player.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  player.addEventListener('touchstart', onDown, { passive: false });
  window.addEventListener('touchmove', (e) => { if (dragging) { onMove(e); e.preventDefault(); } }, { passive: false });
  window.addEventListener('touchend', onUp);

  // Continuous rotation loop
  function tick() {
    if (!dragging) {
      if (playing) {
        // ease velocity toward target
        velocity += (targetVel - velocity) * 0.04;
      } else {
        velocity *= 0.92;
        if (Math.abs(velocity) < 0.01) velocity = 0;
      }
      rotation += velocity;
      discWrap.style.transform = `rotate(${rotation}deg)`;
    }
    requestAnimationFrame(tick);
  }
  tick();

  // keyboard
  document.addEventListener('keydown', (e) => {
    // Only if vinyl section is in view
    const r = stage.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft') prev.click();
    else if (e.key === 'ArrowRight') next.click();
    else if (e.key === ' ') { e.preventDefault(); togglePlay(); }
  });

  // The whole list, so nobody has to flip through records to see what's there.
  if (indexEl) {
    indexEl.innerHTML = SW_PROJECTS.map((p, i) => `
      <li data-i="${i}">
        <button type="button" class="sw-idx-pick">
          <span class="sw-idx-num">${p.num}</span>
          <span class="sw-idx-name">${p.name}</span>
          <span class="sw-idx-tag">${p.tag}</span>
          <span class="sw-idx-year">${p.year}</span>
        </button>
        <a class="sw-idx-go" href="${p.url}" target="_blank" rel="noopener" aria-label="Open ${p.plain}">↗</a>
      </li>`).join('');
    indexEl.querySelectorAll('.sw-idx-pick').forEach((btn) => {
      btn.addEventListener('click', () => {
        idx = parseInt(btn.parentElement.dataset.i);
        currentTrack = 0;
        render();
        stage.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }

  render();
  updatePlayState();
})();
