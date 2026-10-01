/* ============================================================
   HERO GLOBE — dotted sphere, Istanbul marked, routes into CEE
   Drag to spin · pauses off-screen · no dependencies
   ============================================================ */

(function globe() {
  const canvas = document.getElementById('globe');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const RAD = Math.PI / 180;
  const EMBER = '255,91,34';
  const LIME = '200,255,61';
  const BONE = '242,237,228';

  function ll(lat, lon) {
    lat *= RAD; lon *= RAD;
    return [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
  }

  // Evenly spread dots (Fibonacci sphere).
  const N = innerWidth < 700 ? 900 : 1500;
  const dots = new Float32Array(N * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    dots[i * 3] = Math.cos(golden * i) * r;
    dots[i * 3 + 1] = y;
    dots[i * 3 + 2] = Math.sin(golden * i) * r;
  }

  const HOME = ll(41.01, 28.98);
  const ENDS = [
    [42.70, 23.32], [44.43, 26.10], [44.79, 20.45], [47.50, 19.04], [48.21, 16.37],
    [50.08, 14.44], [52.23, 21.01], [45.81, 15.98], [37.98, 23.73], [46.06, 14.51],
  ].map(([a, b]) => ll(a, b));

  // Great-circle arcs, lifted off the surface in the middle.
  const SEG = 40;
  const arcs = ENDS.map((end) => {
    const dot = HOME[0] * end[0] + HOME[1] * end[1] + HOME[2] * end[2];
    const om = Math.acos(Math.min(1, dot));
    const so = Math.sin(om);
    const pts = [];
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG;
      const a = Math.sin((1 - t) * om) / so;
      const b = Math.sin(t * om) / so;
      const lift = 1 + Math.sin(Math.PI * t) * om * 0.55;
      pts.push([
        (HOME[0] * a + end[0] * b) * lift,
        (HOME[1] * a + end[1] * b) * lift,
        (HOME[2] * a + end[2] * b) * lift,
      ]);
    }
    return pts;
  });

  // Start with Istanbul just off-centre and the north tilted towards us.
  let yaw = -29 * RAD + 0.35;
  let pitch = 0.5;
  let vel = 0;
  const AUTO = 0.08; // rad / s
  let mx = 0, my = 0; // pointer parallax

  let W = 0, H = 0, R = 0, dpr = 1;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(2, devicePixelRatio || 1);
    W = rect.width; H = rect.height;
    R = Math.min(W, H) * 0.4;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!running) draw(performance.now());
  }

  let cyw, syw, cp, sp, ox, oy;
  function setup() {
    const p = pitch + my * 0.08;
    const y = yaw + mx * 0.08;
    cyw = Math.cos(y); syw = Math.sin(y); cp = Math.cos(p); sp = Math.sin(p);
    ox = W / 2; oy = H / 2;
  }
  // Writes screen x, y and depth z (1 = facing us) into out.
  function project(x, y, z, out) {
    const x1 = x * cyw + z * syw;
    const z1 = -x * syw + z * cyw;
    const y2 = y * cp - z1 * sp;
    const z2 = y * sp + z1 * cp;
    out[0] = ox + x1 * R;
    out[1] = oy - y2 * R;
    out[2] = z2;
  }

  const P = [0, 0, 0];
  const Q = [0, 0, 0];

  function draw(now) {
    const t = now / 1000;
    ctx.clearRect(0, 0, W, H);
    setup();

    // soft ember glow behind the sphere
    const g = ctx.createRadialGradient(ox, oy, R * 0.2, ox, oy, R * 1.25);
    g.addColorStop(0, `rgba(${EMBER},0.07)`);
    g.addColorStop(1, `rgba(${EMBER},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = `rgba(${BONE},0.07)`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(ox, oy, R, 0, Math.PI * 2); ctx.stroke();

    // dots, bucketed by depth so fillStyle changes only a few times
    const buckets = [[], [], [], []];
    for (let i = 0; i < N; i++) {
      project(dots[i * 3], dots[i * 3 + 1], dots[i * 3 + 2], P);
      const z = P[2];
      const b = z < 0 ? 0 : z < 0.35 ? 1 : z < 0.7 ? 2 : 3;
      buckets[b].push(P[0], P[1]);
    }
    const alpha = [0.06, 0.14, 0.24, 0.34];
    const size = [0.9, 1.2, 1.5, 1.8];
    for (let b = 0; b < 4; b++) {
      ctx.fillStyle = `rgba(${BONE},${alpha[b]})`;
      const arr = buckets[b], s = size[b], h = s / 2;
      for (let i = 0; i < arr.length; i += 2) ctx.fillRect(arr[i] - h, arr[i + 1] - h, s, s);
    }

    // routes: each one draws itself out from Istanbul, then fades
    ctx.lineCap = 'round';
    arcs.forEach((pts, k) => {
      const cycle = (t * 0.32 + k * 0.17) % 1.5;
      const head = Math.min(1, cycle) * SEG;
      const tail = Math.max(0, cycle - 0.5) * SEG;
      if (head <= tail) return;
      for (let i = Math.floor(tail); i < Math.ceil(head) && i < SEG; i++) {
        project(pts[i][0], pts[i][1], pts[i][2], P);
        project(pts[i + 1][0], pts[i + 1][1], pts[i + 1][2], Q);
        const z = (P[2] + Q[2]) / 2;
        if (z < -0.05) continue;
        const a = Math.min(1, (z + 0.05) * 1.6) * 0.85;
        ctx.strokeStyle = `rgba(${EMBER},${a})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(P[0], P[1]); ctx.lineTo(Q[0], Q[1]); ctx.stroke();
      }
      if (cycle >= 1) {
        const e = pts[SEG];
        project(e[0], e[1], e[2], P);
        if (P[2] > 0) {
          ctx.fillStyle = `rgba(${LIME},${Math.min(1, P[2] * 1.5) * (1.5 - cycle) * 2})`;
          ctx.beginPath(); ctx.arc(P[0], P[1], 2.2, 0, Math.PI * 2); ctx.fill();
        }
      }
    });

    // Istanbul
    project(HOME[0], HOME[1], HOME[2], P);
    if (P[2] > 0) {
      const a = Math.min(1, P[2] * 2);
      const pulse = (t * 0.8) % 1;
      ctx.strokeStyle = `rgba(${EMBER},${a * (1 - pulse)})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(P[0], P[1], 4 + pulse * 18, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = `rgba(${EMBER},${a})`;
      ctx.beginPath(); ctx.arc(P[0], P[1], 3.6, 0, Math.PI * 2); ctx.fill();
      ctx.font = '500 10px "JetBrains Mono", monospace';
      ctx.fillStyle = `rgba(${BONE},${a * 0.8})`;
      ctx.fillText('IST', P[0] + 10, P[1] - 8);
    }
  }

  // ---- loop, paused when the hero is off-screen
  let running = false, visible = true, last = 0;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!dragging) {
      vel += (AUTO - vel) * Math.min(1, dt * 1.5);
      yaw += vel * dt;
    }
    draw(now);
    requestAnimationFrame(frame);
  }
  function start() {
    if (running || reduced || !visible || document.hidden) return;
    running = true; last = performance.now();
    requestAnimationFrame(frame);
  }
  function stop() { running = false; }

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    visible ? start() : stop();
  }).observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  new ResizeObserver(resize).observe(canvas);

  // ---- drag to spin (horizontal on touch so the page still scrolls)
  let dragging = false, px = 0, py = 0, lastMove = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; px = e.clientX; py = e.clientY; lastMove = performance.now();
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('dragging');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dx = e.clientX - px, dy = e.clientY - py;
    px = e.clientX; py = e.clientY;
    const d = dx * 0.006;
    yaw += d;
    if (e.pointerType === 'mouse') pitch = Math.max(-0.3, Math.min(1.1, pitch + dy * 0.004));
    vel = d / Math.max(0.008, (now - lastMove) / 1000);
    lastMove = now;
    if (!running) draw(now);
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove('dragging');
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    vel = Math.max(-4, Math.min(4, vel));
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  // slight parallax with the cursor
  if (!reduced) {
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX / innerWidth - 0.5;
      my = e.clientY / innerHeight - 0.5;
    }, { passive: true });
  }

  resize();
  start();
})();
