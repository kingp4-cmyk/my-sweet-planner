
/* MY SWEET AJANDA — GERÇEK FOTOĞRAF DOKULU SİM v19 */

(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';

  const MAX_STROKES = 160;
  const MAX_POINTS = 9000;

  const TEXTURE = './assets/pink-glitter.webp';

  const clamp = (n, min, max) =>
    Math.max(min, Math.min(max, n));

  const random = (a, b) =>
    a + Math.random() * (b - a);

  let ready = false;
  let mode = 'off';

  let stroke = null;
  let pointerId = null;
  let lastMouse = null;

  let drawingFrame = 0;
  let sprayFrame = 0;

  let flying = [];
  let flyingCanvas = null;

  // =====================================
  // FIRÇA TASARIMI
  // =====================================

  const style = document.createElement('style');

  style.id = 'msp-photo-glitter-v19';

  style.textContent = `
    .msp-glitter-workshop {
      margin-top: 15px;
      padding: 12px;
      border-radius: 18px;
      border: 1px solid #efbed9;
      background: linear-gradient(
        135deg,
        #fff3fa,
        #fffafe
      );
    }

    .msp-glitter-title {
      color: #9d3b72;
      font-size: 12px;
      font-weight: 900;
    }

    .msp-glitter-workshop p {
      font-size: 11px;
      color: #98657f;
      line-height: 1.5;
    }

    .msp-glitter-brush {
      display: flex;
      align-items: center;
      gap: 9px;
      width: 100%;
      background: white;
      color: #9d4171;
      text-align: left;
      padding: 8px;
      border: 2px solid #f3c8de;
      border-radius: 14px;
      cursor: pointer;
    }

    .msp-glitter-brush[aria-pressed="true"] {
      border-color: #da4d9a;
      background: #fff0f8;
      box-shadow: 0 0 0 3px #ffdeed;
    }

    .msp-glitter-photo {
      display: block;
      flex: none;
      width: 64px;
      height: 52px;
      border: 2px solid white;
      border-radius: 10px;
      background:
        url('${TEXTURE}') center / cover,
        #f5a5d0;
      box-shadow: 0 3px 10px #bc66994a;
    }

    .msp-glitter-brush strong {
      display: block;
      font-size: 12px;
    }

    .msp-glitter-brush small {
      display: block;
      font-size: 10px;
      opacity: .75;
    }

    .msp-glitter-workshop label {
      display: flex;
      justify-content: space-between;
      margin: 12px 0 5px;
      font-size: 11px;
      font-weight: 800;
      color: #975178;
    }

    .msp-glitter-workshop input[type="range"] {
      width: 100%;
      accent-color: #e552a2;
      cursor: pointer;
    }

    .msp-glitter-actions {
      display: grid;
      grid-template-columns: repeat(
        3,
        minmax(0, 1fr)
      );
      gap: 6px;
      margin-top: 10px;
    }

    .msp-glitter-actions button {
      background: white;
      color: #9c4676;
      font-size: 11px;
      font-weight: 800;
      padding: 9px 4px;
      border-radius: 10px;
      border: 1px solid #eec0d8;
      cursor: pointer;
    }

    .msp-glitter-actions button[aria-pressed="true"] {
      background: #d54c96;
      color: white;
    }

    .msp-glitter-status {
      min-height: 28px;
      margin-bottom: 0;
    }

    .msp-glitter-layer {
      position: absolute;
      inset: 0;
      z-index: 18;
      pointer-events: none;
    }

    .msp-glitter-layer svg {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
      pointer-events: none;
    }

    .msp-glitter-layer.is-active {
      pointer-events: auto;
      cursor: crosshair;
      touch-action: none;
    }

    .msp-glitter-flying {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      z-index: 10000;
      pointer-events: none;
    }

    .hero-girlboss {
      background:
        linear-gradient(
          #ffe7f5b0,
          #ffb5da88
        ),
        url('${TEXTURE}')
        center / 190px !important;
    }

    .birthday-box {
      background:
        linear-gradient(
          130deg,
          #fff2fadc,
          #fff8fce8
        ),
        url('${TEXTURE}')
        center / 230px !important;
    }
  `;

  document.head.append(style);

  // =====================================
  // AJANDA VERİLERİ
  // =====================================

  function getState() {
    if (window.MSP_GLITTER_API?.getState) {
      return window.MSP_GLITTER_API.getState();
    }

    try {
      return typeof state !== 'undefined'
        ? state
        : null;
    } catch {
      return null;
    }
  }

  function monthKey() {
    if (window.MSP_GLITTER_API?.monthId) {
      return window.MSP_GLITTER_API.monthId();
    }

    const s = getState();

    return s
      ? `${s.year}-${s.activeMonth}`
      : '';
  }

  function strokes() {
    const s = getState();

    if (!s) return [];

    if (
      !s.glitterStrokes ||
      typeof s.glitterStrokes !== 'object'
    ) {
      s.glitterStrokes = {};
    }

    const key = monthKey();

    if (!Array.isArray(s.glitterStrokes[key])) {
      s.glitterStrokes[key] = [];
    }

    return s.glitterStrokes[key];
  }

  function save() {
    if (window.MSP_GLITTER_API?.save) {
      window.MSP_GLITTER_API.save();
    } else if (
      typeof scheduleSave === 'function'
    ) {
      scheduleSave();
    }
  }

  function say(message) {
    const label = $('mspGlitterStatus');

    if (label) {
      label.textContent = message;
    }
  }

  function pointsCount(items) {
    return items.reduce(
      (n, item) =>
        n + (item.points?.length || 0),
      0
    );
  }

  // =====================================
  // SABİT RASTGELE DAĞILIM
  // =====================================

  function hash(text) {
    let n = 2166136261;

    for (const ch of String(text)) {
      n ^= ch.charCodeAt(0);
      n = Math.imul(n, 16777619);
    }

    return n >>> 0;
  }

  function rngFrom(text) {
    let seed = hash(text);

    return () => {
      seed = (seed + 0x6D2B79F5) | 0;

      let t = Math.imul(
        seed ^ seed >>> 15,
        1 | seed
      );

      t ^= t + Math.imul(
        t ^ t >>> 7,
        61 | t
      );

      return (
        (t ^ t >>> 14) >>> 0
      ) / 4294967296;
    };
  }

  // =====================================
  // SVG YARDIMCI FONKSİYONLARI
  // =====================================

  function svgElement(name, attrs = {}) {
    const el = document.createElementNS(
      NS,
      name
    );

    for (
      const [key, value]
      of Object.entries(attrs)
    ) {
      el.setAttribute(key, String(value));
    }

    return el;
  }

  function pixelPoint(point, width, height) {
    return [
      point[0] * width / 10000,
      point[1] * height / 10000
    ];
  }

  function pointerPoint(event) {
    const r =
      $('mspGlitterLayer').getBoundingClientRect();

    return [
      Math.round(
        clamp(
          (event.clientX - r.left) /
          Math.max(1, r.width),
          0,
          1
        ) * 10000
      ),

      Math.round(
        clamp(
          (event.clientY - r.top) /
          Math.max(1, r.height),
          0,
          1
        ) * 10000
      )
    ];
  }

  function pathOf(points) {
    if (!points.length) return '';

    let d = `M ${points[0][0]} ${points[0][1]}`;

    if (points.length === 1) {
      return d + ' l .01 .01';
    }

    for (const p of points.slice(1)) {
      d += ` L ${p[0]} ${p[1]}`;
    }

    return d;
  }

  // =====================================
  // GERÇEK FOTOĞRAF DOKULU SİM
  // =====================================

  function draw() {
    if (!ready || !getState()) return;

    const layer = $('mspGlitterLayer');
    const svg = $('mspGlitterSvg');

    const r = layer.getBoundingClientRect();

    const width = Math.max(1, r.width);
    const height = Math.max(1, r.height);

    svg.setAttribute(
      'viewBox',
      `0 0 ${width} ${height}`
    );

    svg.setAttribute(
      'preserveAspectRatio',
      'none'
    );

    svg.replaceChildren();

    const defs = svgElement('defs');

    // Fotoğrafı tekrar eden sim dokusuna çevir
    const pattern = svgElement('pattern', {
      id: 'msp-glitter-photo-pattern',
      patternUnits: 'userSpaceOnUse',
      width: 210,
      height: 210
    });

    pattern.append(
      svgElement('image', {
        href: TEXTURE,
        width: 210,
        height: 210,
        preserveAspectRatio: 'xMidYMid slice'
      })
    );

    defs.append(pattern);

    // Kenarlara yumuşak saydamlaşma
    const blur = svgElement('filter', {
      id: 'msp-glitter-edge-blur',
      x: '-30%',
      y: '-50%',
      width: '160%',
      height: '200%'
    });

    blur.append(
      svgElement('feGaussianBlur', {
        stdDeviation: 2.2
      })
    );

    defs.append(blur);
    svg.append(defs);

    for (const item of strokes()) {
      if (
        !Array.isArray(item.points) ||
        !item.points.length
      ) {
        continue;
      }

      const size = clamp(
        Number(item.size) || 32,
        12,
        90
      );

      const density = clamp(
        Number(item.opacity ?? 42),
        12,
        75
      ) / 100;

      const pts = item.points.map(
        p => pixelPoint(
          p,
          width,
          height
        )
      );

      const d = pathOf(pts);

      const g = svgElement('g');

      // Fotoğraf dokusunun üç yumuşak katmanı
      const layers = [
        {
          w: .99,
          alpha: .10,
          blur: true
        },
        {
          w: .72,
          alpha: .33,
          blur: false
        },
        {
          w: .32,
          alpha: .19,
          blur: false
        }
      ];

      for (const part of layers) {
        const path = svgElement('path', {
          d,
          fill: 'none',
          stroke:
            'url(#msp-glitter-photo-pattern)',

          'stroke-width':
            size * part.w,

          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',

          opacity:
            part.alpha * (.65 + density)
        });

        if (part.blur) {
          path.setAttribute(
            'filter',
            'url(#msp-glitter-edge-blur)'
          );
        }

        g.append(path);
      }

      // Çizginin çevresine dağılmış gerçek sim
      const rng = rngFrom(
        item.id || 'old-glitter'
      );

      const step = Math.max(
        1,
        Math.ceil(pts.length / 65)
      );

      let count = 0;

      for (
        let i = 0;
        i < pts.length;
        i += step
      ) {
        const p = pts[i];

        const prev =
          pts[Math.max(0, i - 1)];

        const next =
          pts[Math.min(
            pts.length - 1,
            i + 1
          )];

        const dx = next[0] - prev[0];
        const dy = next[1] - prev[1];

        const length =
          Math.hypot(dx, dy) || 1;

        const tx = dx / length;
        const ty = dy / length;

        const nx = -ty;
        const ny = tx;

        for (let k = 0; k < 5; k++) {
          const across =
            (rng() - .5) *
            size * 1.65;

          const along =
            (rng() - .5) *
            size * .8;

          const distance =
            Math.abs(across) /
            (size * .825);

          // En dışta opaklık sıfır
          const alpha =
            (.22 + rng() * .36) *
            density *
            Math.pow(
              1 - distance,
              1.8
            );

          const radius =
            .65 +
            Math.pow(rng(), 1.5) *
            size * .068;

          const speck = svgElement(
            'circle',
            {
              cx:
                p[0] +
                nx * across +
                tx * along,

              cy:
                p[1] +
                ny * across +
                ty * along,

              r: radius,

              fill:
                'url(#msp-glitter-photo-pattern)',

              opacity: alpha
            }
          );

          g.append(speck);

          if (++count > 400) {
            break;
          }
        }

        if (count > 400) {
          break;
        }
      }

      svg.append(g);
    }
  }

  function requestDraw() {
    if (drawingFrame) return;

    drawingFrame = requestAnimationFrame(
      () => {
        drawingFrame = 0;
        draw();
      }
    );
  }

  // =====================================
  // FIŞ FIŞ UÇUŞAN SİM ANİMASYONU
  // =====================================

  function spray(
    event,
    dx = 1,
    dy = 0
  ) {
    const size = Number(
      $('mspGlitterSize')?.value
    ) || 32;

    const density = Number(
      $('mspGlitterDensity')?.value
    ) || 42;

    const len = Math.hypot(dx, dy) || 1;

    const ux = dx / len;
    const uy = dy / len;

    const now = performance.now();

    const count = clamp(
      Math.round(
        size * density / 150
      ),
      7,
      22
    );

    for (
      let i = 0;
      i < count;
      i++
    ) {
      const a = random(
        0,
        Math.PI * 2
      );

      const v = random(.03, .17);

      flying.push({
        x:
          event.clientX +
          random(
            -size / 5,
            size / 5
          ),

        y:
          event.clientY +
          random(
            -size / 5,
            size / 5
          ),

        vx:
          Math.cos(a) * v +
          ux * random(-.09, .05),

        vy:
          Math.sin(a) * v +
          uy * random(-.07, .04) -
          .035,

        size: random(.5, 1.8),

        alpha:
          random(.28, .75) *
          density / 100,

        white: Math.random() < .32,

        born: now,

        life: random(350, 800)
      });
    }

    if (flying.length > 280) {
      flying.splice(
        0,
        flying.length - 280
      );
    }

    if (!sprayFrame) {
      sprayFrame = requestAnimationFrame(
        animateSpray
      );
    }
  }

  // =====================================
  // UÇUŞAN SİMLERİ HAREKET ETTİR
  // =====================================

  function animateSpray(now) {
    sprayFrame = 0;

    if (!flyingCanvas) return;

    const w = innerWidth;
    const h = innerHeight;

    const ratio = Math.min(
      devicePixelRatio || 1,
      1.5
    );

    const cw = Math.round(w * ratio);
    const ch = Math.round(h * ratio);

    if (
      flyingCanvas.width !== cw ||
      flyingCanvas.height !== ch
    ) {
      flyingCanvas.width = cw;
      flyingCanvas.height = ch;
    }

    const ctx =
      flyingCanvas.getContext('2d');

    ctx.setTransform(
      ratio,
      0,
      0,
      ratio,
      0,
      0
    );

    ctx.clearRect(0, 0, w, h);

    flying = flying.filter(
      f => now - f.born < f.life
    );

    for (const p of flying) {
      const t = now - p.born;

      const fade = Math.pow(
        1 - t / p.life,
        1.5
      );

      const x =
        p.x + p.vx * t;

      const y =
        p.y +
        p.vy * t +
        .00012 * t * t;

      const radius = p.size * 3.1;

      // Simin beyaz ışık halesi
      const glow =
        ctx.createRadialGradient(
          x,
          y,
          0,
          x,
          y,
          radius
        );

      glow.addColorStop(
        0,
        `rgba(255,255,255,${
          p.alpha * fade
        })`
      );

      glow.addColorStop(
        .32,
        `rgba(255,224,246,${
          p.alpha * fade * .65
        })`
      );

      glow.addColorStop(
        1,
        'rgba(255,194,227,0)'
      );

      ctx.fillStyle = glow;

      ctx.fillRect(
        x - radius,
        y - radius,
        radius * 2,
        radius * 2
      );

      ctx.fillStyle = p.white
        ? '#fff'
        : '#ed8cbe';

      ctx.globalAlpha = Math.min(
        1,
        p.alpha * fade * 1.2
      );

      ctx.fillRect(
        x - p.size / 2,
        y - p.size / 2,
        p.size,
        p.size
      );

      // Bazı taneciklerde beyaz parlama
      if (p.white) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = .55;

        ctx.beginPath();

        ctx.moveTo(
          x - 2 * p.size,
          y
        );

        ctx.lineTo(
          x + 2 * p.size,
          y
        );

        ctx.moveTo(
          x,
          y - 2 * p.size
        );

        ctx.lineTo(
          x,
          y + 2 * p.size
        );

        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }

    if (flying.length) {
      sprayFrame = requestAnimationFrame(
        animateSpray
      );
    }
  }

  // =====================================
  // FIRÇAYI AÇ / KAPAT
  // =====================================

  function setMode(next) {
    mode = next;

    $('mspGlitterLayer').classList.toggle(
      'is-active',
      mode !== 'off'
    );

    $('mspGlitterBrush').setAttribute(
      'aria-pressed',
      String(mode === 'paint')
    );

    $('mspGlitterErase').setAttribute(
      'aria-pressed',
      String(mode === 'erase')
    );

    if (mode === 'paint') {
      say(
        'Fotoğraf dokulu sim açık. Ajandaya sürükle ♡'
      );
    } else if (mode === 'erase') {
      say(
        'Silgi açık. Simin üzerine tıkla.'
      );
    } else {
      say(
        'Fırça kapalı. Ajandanı normal kullanabilirsin.'
      );

      flying = [];
    }
  }

  // =====================================
  // SİLGİ
  // =====================================

  function eraseAt(event) {
    const r =
      $('mspGlitterLayer').getBoundingClientRect();

    const x = event.clientX - r.left;
    const y = event.clientY - r.top;

    const all = strokes();

    for (
      let i = all.length - 1;
      i >= 0;
      i--
    ) {
      const item = all[i];

      const tolerance = Math.max(
        17,
        (Number(item.size) || 32) * .9
      );

      const found = (
        item.points || []
      ).some(p => {
        const [px, py] = pixelPoint(
          p,
          r.width,
          r.height
        );

        return Math.hypot(
          px - x,
          py - y
        ) < tolerance;
      });

      if (found) {
        all.splice(i, 1);

        save();
        requestDraw();

        say('Sim süslemesi silindi.');
        return;
      }
    }

    say('Burada silinecek sim yok.');
  }

  // =====================================
  // ÇİZİME BAŞLA
  // =====================================

  function pointerDown(event) {
    if (mode === 'off') return;

    if (
      event.pointerType === 'mouse' &&
      event.button !== 0
    ) {
      return;
    }

    if (mode === 'erase') {
      eraseAt(event);
      return;
    }

    if (!getState()) return;

    const all = strokes();

    if (
      all.length >= MAX_STROKES ||
      pointsCount(all) >= MAX_POINTS
    ) {
      say(
        'Bu ayın sim sınırına ulaştın.'
      );

      return;
    }

    event.preventDefault();

    stroke = {
      id:
        crypto.randomUUID?.() ||
        `glitter-${Date.now()}-${Math.random()}`,

      size: Number(
        $('mspGlitterSize').value
      ),

      opacity: Number(
        $('mspGlitterDensity').value
      ),

      points: [
        pointerPoint(event)
      ]
    };

    all.push(stroke);

    pointerId = event.pointerId;

    lastMouse = [
      event.clientX,
      event.clientY
    ];

    $('mspGlitterLayer').setPointerCapture(
      pointerId
    );

    spray(event);
    requestDraw();
  }

  // =====================================
  // SÜRÜKLEDİKÇE SİM SERP
  // =====================================

  function pointerMove(event) {
    if (
      !stroke ||
      pointerId !== event.pointerId
    ) {
      return;
    }

    event.preventDefault();

    const p = pointerPoint(event);

    const prev =
      stroke.points[
        stroke.points.length - 1
      ];

    const r =
      $('mspGlitterLayer').getBoundingClientRect();

    const distance = Math.hypot(
      (p[0] - prev[0]) *
        r.width / 10000,

      (p[1] - prev[1]) *
        r.height / 10000
    );

    if (
      distance < 4 ||
      stroke.points.length >= 450 ||
      pointsCount(strokes()) >= MAX_POINTS
    ) {
      return;
    }

    stroke.points.push(p);

    spray(
      event,
      event.clientX - lastMouse[0],
      event.clientY - lastMouse[1]
    );

    lastMouse = [
      event.clientX,
      event.clientY
    ];

    requestDraw();
  }

  // =====================================
  // ÇİZİMİ KAYDET
  // =====================================

  function pointerUp(event) {
    if (!stroke) return;

    if (
      event &&
      event.pointerId !== pointerId
    ) {
      return;
    }

    stroke = null;
    pointerId = null;
    lastMouse = null;

    save();
    requestDraw();

    say(
      'Fotoğraf dokulu sim ajandana kaydediliyor…'
    );
  }

  // =====================================
  // STICKER BAHÇESİNE SİM EKLE
  // =====================================

  function init() {
    if (
      ready ||
      !getState() ||
      !$('plannerStage') ||
      !$('dayGrid')?.children.length
    ) {
      return;
    }

    ready = true;

    const panel =
      document.createElement('section');

    panel.className =
      'msp-glitter-workshop';

    panel.innerHTML = `
      <div class="msp-glitter-title">
        ♡ GERÇEK PEMBE SİM
      </div>

      <p>
        Gerçek sim fotoğrafı dokusu
        ve uçuşan sim animasyonu.
      </p>

      <button
        id="mspGlitterBrush"
        type="button"
        class="msp-glitter-brush"
        aria-pressed="false">

        <span
          class="msp-glitter-photo"
          aria-hidden="true">
        </span>

        <span>
          <strong>Fotoğraf dokulu sim</strong>
          <small>
            Seç, ajandada sürükle
          </small>
        </span>
      </button>

      <label for="mspGlitterSize">
        Fırça genişliği
        <output id="mspGlitterSizeText">
          32 px
        </output>
      </label>

      <input
        id="mspGlitterSize"
        type="range"
        min="14"
        max="80"
        step="2"
        value="32">

      <label for="mspGlitterDensity">
        Sim yoğunluğu
        <output id="mspGlitterDensityText">
          42%
        </output>
      </label>

      <input
        id="mspGlitterDensity"
        type="range"
        min="12"
        max="75"
        step="1"
        value="42">

      <div class="msp-glitter-actions">

        <button
          id="mspGlitterErase"
          type="button"
          aria-pressed="false">
          Silgi
        </button>

        <button
          id="mspGlitterUndo"
          type="button">
          ↶ Geri al
        </button>

        <button
          id="mspGlitterDone"
          type="button">
          ✓ Bitir
        </button>
      </div>

      <p
        id="mspGlitterStatus"
        class="msp-glitter-status"
        role="status">
        Fırça kapalı.
      </p>
    `;

    $('emojiPalette').insertAdjacentElement(
      'afterend',
      panel
    );

    // Ajandada kalıcı sim çizimi
    const layer =
      document.createElement('div');

    layer.id = 'mspGlitterLayer';
    layer.className = 'msp-glitter-layer';

    layer.innerHTML = `
      <svg
        id="mspGlitterSvg"
        xmlns="${NS}"
        aria-hidden="true">
      </svg>
    `;

    $('plannerStage').append(layer);

    // Fare hareketinde uçuşan sim katmanı
    flyingCanvas =
      document.createElement('canvas');

    flyingCanvas.className =
      'msp-glitter-flying';

    flyingCanvas.setAttribute(
      'aria-hidden',
      'true'
    );

    document.body.append(flyingCanvas);

    $('mspGlitterBrush').onclick = () => {
      setMode(
        mode === 'paint'
          ? 'off'
          : 'paint'
      );
    };

    $('mspGlitterErase').onclick = () => {
      setMode(
        mode === 'erase'
          ? 'off'
          : 'erase'
      );
    };

    $('mspGlitterDone').onclick = () => {
      setMode('off');
    };

    $('mspGlitterUndo').onclick = () => {
      const all = strokes();

      if (!all.length) {
        say('Geri alınacak sim yok.');
        return;
      }

      all.pop();

      save();
      requestDraw();

      say(
        'Son sim süslemesi geri alındı.'
      );
    };

    $('mspGlitterSize').oninput = event => {
      $('mspGlitterSizeText').textContent =
        event.target.value + ' px';
    };

    $('mspGlitterDensity').oninput = event => {
      $('mspGlitterDensityText').textContent =
        event.target.value + '%';
    };

    layer.addEventListener(
      'pointerdown',
      pointerDown
    );

    layer.addEventListener(
      'pointermove',
      pointerMove
    );

    layer.addEventListener(
      'pointerup',
      pointerUp
    );

    layer.addEventListener(
      'pointercancel',
      pointerUp
    );

    document.addEventListener(
      'keydown',
      e => {
        if (e.key === 'Escape') {
          setMode('off');
        }
      }
    );

    if ('ResizeObserver' in window) {
      new ResizeObserver(
        requestDraw
      ).observe($('plannerStage'));
    }

    new MutationObserver(() => {
      if (
        !stroke &&
        mode !== 'off'
      ) {
        setMode('off');
      }

      requestDraw();
    }).observe(
      $('monthHeading'),
      {
        childList: true,
        characterData: true,
        subtree: true
      }
    );

    window.addEventListener(
      'pagehide',
      () => {
        if (stroke) {
          save();
        }
      }
    );

    draw();
  }

  // =====================================
  // AJANDA YÜKLENİNCE BAŞLAT
  // =====================================

  function boot() {
    init();

    if (ready) return;

    const grid = $('dayGrid');

    if (!grid) return;

    const observer = new MutationObserver(
      () => {
        init();

        if (ready) {
          observer.disconnect();
        }
      }
    );

    observer.observe(
      grid,
      {
        childList: true
      }
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      boot
    );
  } else {
    boot();
  }

})();
