// Shared mirror for GiANT Tools pages.
//
// A page provides:
//   <div class="stage" data-mirror data-meter-label="Influence"></div>
//   <section class="scales"> ... <input type="range" data-lo data-hi [data-mid]> ... </section>
//   <button id="reset">, <p class="privacy">
// and this script builds the mirror + meter, wires the sliders, and handles the photo.
//
// Balance mode (data-mode="balance", e.g. Push / Pull): sliders sit in [data-scales] and
// carry data-side="push" | "pull". The mirror rides a beam with Tell and Ask at its ends
// instead of the meter.
//
// The photo is kept in sessionStorage so it follows the person between tools in the
// same tab, and is cleared by the browser when that tab or window closes.
(() => {
  // ---------- Tuning ----------
  const STOPS = [[0, '#a2373a'], [0.25, '#c8732f'], [0.5, '#e8b53c'], [0.75, '#8fa53a'], [1, '#3a8b3a']];
  const CHROMA_BOOST = 1.3; // glow is a touch more saturated than the bar so it reads on white
  const CLEAR_AT = 0.75;    // average score where the fog is fully gone (mid-green on the bar)
  const MAX_BLUR = 6;       // px of blur on screen at the very lowest scores
  const LINGER_BLUR = .50;  // px of blur that stays past mid-green until every slider is far right
  const MAX_FOG = 0.85;     // opacity of the fog layer at the very lowest scores
  const FOG_CURVE = 1;      // >1 clears quickly at first, then tapers toward mid-green
  const PHOTO_KEY = 'giantTools.photo';
  const PHOTO_MAX_EDGE = 1600;  // downscale before keeping, so it fits in session storage
  const BALANCE_STOPS = [[0, '#a2373a'], [0.5, '#7d4fb0'], [1, '#5b6ee8']];   // Tell → balanced → Ask

  // ---------- Markup ----------
  const stage = document.querySelector('[data-mirror]');
  const meterLabel = stage.dataset.meterLabel || 'Influence';
  const balanceMode = stage.dataset.mode === 'balance';
  stage.classList.toggle('balance-mode', balanceMode);
  const MIRROR_HTML = `
    <div class="mirror" id="mirror" role="button" tabindex="0" aria-label="Add your photo">
      <img class="photo" id="photo" alt="Your portrait">
      <div class="shine" id="shine"></div>
      <div class="fog" id="fog"></div>
      <div class="glass"></div>
      <svg class="glare" viewBox="0 0 60 60" aria-hidden="true">
        <g stroke="rgba(110,130,150,.55)" stroke-width="1.4" stroke-linecap="round" fill="none">
          <line x1="4" y1="2" x2="40" y2="38"/>
          <line x1="22" y1="2" x2="40" y2="20"/>
          <line x1="2" y1="22" x2="30" y2="50"/>
        </g>
      </svg>
      <div class="empty-hint">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>
        </svg>
        <span>Tap to add<br>your photo</span>
      </div>
    </div>`;
  stage.innerHTML = balanceMode ? `
    <div class="beam-rig">
      <div class="beam-tilt">
        <div class="beam-slide">${MIRROR_HTML}</div>
        <div class="beam" aria-hidden="true"></div>
      </div>
      <div class="fulcrum" aria-hidden="true"></div>
      <span class="beam-end tell" aria-hidden="true">Tell</span>
      <span class="beam-end ask" aria-hidden="true">Ask</span>
      <span class="beam-goal" aria-hidden="true">Balanced</span>
      <div class="sr-only" id="beam" role="meter" aria-label="Balance between Tell and Ask"
        aria-valuemin="-100" aria-valuemax="100" aria-valuenow="0"></div>
    </div>` : `${MIRROR_HTML}
    <div class="meter" id="meter" role="meter" aria-label="${meterLabel}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">
      <svg class="meter-arrow" viewBox="0 0 12 8" aria-hidden="true"><path d="M6 0 12 8H0z"/></svg>
      <div class="meter-track"><div class="meter-fill" id="meterFill"></div></div>
      <span class="meter-label">${meterLabel}</span>
    </div>`;
  stage.insertAdjacentHTML('afterend', `
    <div class="photo-tools" id="photoTools" hidden>
      <span>Drag to position · pinch or scroll to zoom</span>
      <button class="link" type="button" id="changePhoto">Change photo</button>
      <button class="link" type="button" id="forgetPhoto">Forget my photo</button>
    </div>
    <input type="file" id="file" accept="image/*" hidden>`);

  const privacy = document.querySelector('.privacy');
  if (privacy) {
    privacy.textContent = 'Your photo never leaves this device. It is kept only while this browser tab is open, ' +
      'so you can use it across tools, and is cleared when you close the tab or window.';
  }

  // ---------- Color: sample the slider gradient and blend in OKLab ----------
  const hexToRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  const toLin = c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const fromLin = c => c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;

  function rgbToOklab([r, g, b]) {
    r = toLin(r); g = toLin(g); b = toLin(b);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
      0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
    ];
  }
  function oklabToRgb([L, a, b]) {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    ].map(c => Math.round(Math.min(1, Math.max(0, fromLin(c))) * 255));
  }

  const LAB_STOPS = STOPS.map(([t, hex]) => [t, rgbToOklab(hexToRgb(hex))]);

  const LAB_BALANCE = BALANCE_STOPS.map(([t, hex]) => [t, rgbToOklab(hexToRgb(hex))]);

  function colorAt(t, stops = LAB_STOPS) {
    for (let i = 1; i < stops.length; i++) {
      const [t1, c1] = stops[i];
      if (t <= t1) {
        const [t0, c0] = stops[i - 1];
        const k = (t - t0) / (t1 - t0);
        return c0.map((v, j) => v + (c1[j] - v) * k);
      }
    }
    return stops[stops.length - 1][1];
  }

  // Each slider contributes its bar color, weighted by distance from center.
  // The middle of a bar is neutral (weight 0); the ends are full strength.
  function blend(values) {
    let wSum = 0, wSq = 0, L = 0, a = 0, b = 0, chroma = 0;
    for (const v of values) {
      const w = Math.abs(v * 2 - 1);
      if (!w) continue;
      const [cl, ca, cb] = colorAt(v);
      L += cl * w; a += ca * w; b += cb * w;
      chroma += Math.hypot(ca, cb) * w;
      wSum += w; wSq += w * w;
    }
    if (!wSum) return { strength: 0 };
    L /= wSum; a /= wSum; b /= wSum; chroma /= wSum;
    // Averaging opposing hues drains color toward gray; restore the mean vividness.
    const c = Math.hypot(a, b);
    if (c > 1e-4) { a *= chroma * CHROMA_BOOST / c; b *= chroma * CHROMA_BOOST / c; }
    return {
      rgb: oklabToRgb([L, a, b]).join(','),
      strength: Math.sqrt(wSq / values.length),   // RMS: one strong slider still shows clearly
    };
  }

  // ---------- Sliders ----------
  const sliders = [...document.querySelectorAll('.scales input[type=range], [data-scales] input[type=range]')];

  // A slider with data-mid gets its center word shown under the midpoint
  sliders.filter(s => s.dataset.mid).forEach(s => {
    const track = document.createElement('div');
    track.className = 'track';
    s.replaceWith(track);
    track.append(s);
    track.insertAdjacentHTML('beforeend', `<span class="mid-word" aria-hidden="true">${s.dataset.mid}</span>`);
  });
  const mirror = document.getElementById('mirror');
  const fogLayer = document.getElementById('fog');
  const shine = document.getElementById('shine');
  const meter = document.getElementById('meter');
  const meterFill = document.getElementById('meterFill');
  const beam = document.getElementById('beam');
  let fog = 0, blur = 0;
  const mean = xs => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

  function describe(el) {
    const v = +el.value;
    if (v === 50) return `${v}, ${el.dataset.mid || 'balanced'}`;
    return `${v}, leaning ${v < 50 ? el.dataset.lo : el.dataset.hi}`;
  }

  // Aura: the glow color carries the score; the photo itself stays untouched.
  function setGlow(rgb, k) {
    mirror.style.boxShadow = rgb && k
      ? `0 0 ${18 + 30 * k}px ${3 + 10 * k}px rgba(${rgb},${(.8 * k).toFixed(3)}),` +
        `0 0 ${80 + 90 * k}px ${20 + 50 * k}px rgba(${rgb},${(.3 * k).toFixed(3)})`
      : '';
  }

  // Fog is heavy at a low score, light at neutral, and gone from CLEAR_AT up. A slight
  // blur lingers past that, tied to the lowest slider, so the mirror is only perfectly
  // sharp once every slider is all the way right.
  function setClarity(score, lowest) {
    fog = Math.max(0, (CLEAR_AT - score) / CLEAR_AT) ** FOG_CURVE;
    const linger = LINGER_BLUR * Math.min(1, (1 - lowest) / 0.1) ** 0.5;   // fades over the last 10%
    blur = Math.max(fog * MAX_BLUR, linger);
    fogLayer.style.opacity = (fog * MAX_FOG).toFixed(3);
    shine.style.opacity = (Math.max(0, (score - CLEAR_AT) / (1 - CLEAR_AT)) * .8).toFixed(3);
    applyPhotoFilter();
  }

  // Standard tools: glow blends the three slider colors, clarity and the meter follow the average.
  function updateScore(values) {
    const { rgb, strength } = blend(values);
    setGlow(rgb, strength ** 0.6);
    const avg = mean(values);
    setClarity(avg, Math.min(...values));

    const pct = Math.round(avg * 100);
    meterFill.style.setProperty('--level', avg.toFixed(3));
    meter.setAttribute('aria-valuenow', pct);
    meter.setAttribute('aria-valuetext', `${meterLabel} ${pct} percent`);
  }

  // Balance tools: the beam tips toward the stronger side and the mirror slides with it.
  // Glow runs red (Tell) → purple (balanced) → blue (Ask) and grows with overall use;
  // the fog clears as the weaker side grows, so the clearest mirror means strong use of both.
  function updateBalance(values) {
    const side = name => mean(values.filter((_, i) => sliders[i].dataset.side === name));
    const push = side('push'), pull = side('pull');
    const lean = pull - push;                       // -1 all Tell … +1 all Ask
    setGlow(oklabToRgb(colorAt((lean + 1) / 2, LAB_BALANCE)).join(','), ((push + pull) / 2) ** 0.6);
    setClarity(Math.min(push, pull), Math.min(...values));

    stage.style.setProperty('--lean', lean.toFixed(3));
    const pct = Math.round(lean * 100);
    beam.setAttribute('aria-valuenow', pct);
    beam.setAttribute('aria-valuetext', Math.abs(pct) < 5 ? 'Balanced'
      : `Leaning ${pct < 0 ? 'Tell' : 'Ask'}, ${Math.abs(pct)} percent`);
  }

  // How far the mirror can slide before reaching the end of the beam
  function layoutBeam() {
    if (!balanceMode) return;
    const rig = stage.querySelector('.beam-rig');
    stage.style.setProperty('--travel', `${Math.max(0, (rig.clientWidth - mirror.offsetWidth) / 2 - 6)}px`);
  }

  function update() {
    const values = sliders.map(s => s.value / 100);
    balanceMode ? updateBalance(values) : updateScore(values);
    sliders.forEach(s => s.setAttribute('aria-valuetext', describe(s)));
  }
  sliders.forEach(s => s.addEventListener('input', update));
  document.getElementById('reset')?.addEventListener('click', () => {
    sliders.forEach(s => { s.value = 50; });
    update();
  });

  // ---------- Photo: load, keep for the session, drag / pinch / scroll to frame ----------
  const photo = document.getElementById('photo');
  const fileInput = document.getElementById('file');
  const photoTools = document.getElementById('photoTools');
  const view = { w: 0, h: 0, zoom: 1, x: 0, y: 0, scale: 1 };

  // The blur is applied before the photo's scale transform, so divide it out
  // to keep the on-screen blur the same at any photo size or zoom.
  function applyPhotoFilter() {
    photo.style.filter = blur && view.w
      ? `blur(${(blur / view.scale).toFixed(2)}px) saturate(${(1 - .35 * fog).toFixed(3)})`
      : '';
  }

  const hasPhoto = () => mirror.classList.contains('has-photo');
  const openPicker = () => fileInput.click();

  mirror.addEventListener('click', () => { if (!hasPhoto()) openPicker(); });
  mirror.addEventListener('keydown', e => {
    if (!hasPhoto() && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openPicker(); }
  });
  document.getElementById('changePhoto').addEventListener('click', openPicker);
  document.getElementById('forgetPhoto').addEventListener('click', forgetPhoto);

  function showPhoto(src) {
    const img = new Image();
    img.onload = () => {
      Object.assign(view, { w: img.naturalWidth, h: img.naturalHeight, zoom: 1, x: 0, y: 0 });
      photo.src = src;
      photo.style.width = view.w + 'px';
      photo.style.height = view.h + 'px';
      mirror.classList.add('has-photo');
      mirror.removeAttribute('role');
      mirror.setAttribute('aria-label', 'Your photo in the mirror');
      photoTools.hidden = false;
      render();
      applyPhotoFilter();
    };
    img.onerror = () => {
      sessionGet() === src && sessionRemove();
      alert("That file couldn't be opened as an image. Try a JPG or PNG.");
    };
    img.src = src;
  }

  function forgetPhoto() {
    sessionRemove();
    photo.removeAttribute('src');
    photo.style.filter = '';
    Object.assign(view, { w: 0, h: 0, zoom: 1, x: 0, y: 0, scale: 1 });
    mirror.classList.remove('has-photo');
    mirror.setAttribute('role', 'button');
    mirror.setAttribute('aria-label', 'Add your photo');
    photoTools.hidden = true;
    mirror.focus();
  }

  // Session storage can be blocked or full; the photo still works for this page.
  function sessionGet() { try { return sessionStorage.getItem(PHOTO_KEY); } catch { return null; } }
  function sessionSet(v) { try { sessionStorage.setItem(PHOTO_KEY, v); } catch { /* not kept */ } }
  function sessionRemove() { try { sessionStorage.removeItem(PHOTO_KEY); } catch { /* nothing kept */ } }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Downscale to a JPEG so it is light to keep and to blur
      const k = Math.min(1, PHOTO_MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * k);
      canvas.height = Math.round(img.naturalHeight * k);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      sessionSet(dataUrl);
      showPhoto(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      alert("That file couldn't be opened as an image. Try a JPG or PNG.");
    };
    img.src = url;
  });

  function render() {
    if (!view.w) return;
    const fw = mirror.clientWidth, fh = mirror.clientHeight;   // layout size, ignores the beam's tilt
    view.zoom = Math.min(4, Math.max(1, view.zoom));
    const scale = Math.max(fw / view.w, fh / view.h) * view.zoom;   // "cover" the frame, then zoom
    const maxX = Math.max(0, (view.w * scale - fw) / 2);
    const maxY = Math.max(0, (view.h * scale - fh) / 2);
    view.x = Math.min(maxX, Math.max(-maxX, view.x));
    view.y = Math.min(maxY, Math.max(-maxY, view.y));
    photo.style.transform = `translate(-50%, -50%) translate(${view.x}px, ${view.y}px) scale(${scale})`;
    if (scale !== view.scale) { view.scale = scale; applyPhotoFilter(); }
  }
  window.addEventListener('resize', () => { render(); layoutBeam(); });

  const pointers = new Map();
  let pinch = null;

  mirror.addEventListener('pointerdown', e => {
    if (!hasPhoto()) return;
    mirror.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    mirror.classList.add('dragging');
    if (pointers.size === 2) pinch = pinchState();
  });

  mirror.addEventListener('pointermove', e => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const next = { x: e.clientX, y: e.clientY };
    if (pointers.size === 1) {
      view.x += next.x - prev.x;
      view.y += next.y - prev.y;
      pointers.set(e.pointerId, next);
    } else if (pointers.size === 2 && pinch) {
      pointers.set(e.pointerId, next);
      const now = pinchState();
      view.zoom *= now.dist / pinch.dist;
      view.x += now.mx - pinch.mx;
      view.y += now.my - pinch.my;
      pinch = now;
    }
    render();
  });

  const endPointer = e => {
    pointers.delete(e.pointerId);
    pinch = pointers.size === 2 ? pinchState() : null;
    if (!pointers.size) mirror.classList.remove('dragging');
  };
  mirror.addEventListener('pointerup', endPointer);
  mirror.addEventListener('pointercancel', endPointer);

  function pinchState() {
    const [a, b] = [...pointers.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  }

  mirror.addEventListener('wheel', e => {
    if (!hasPhoto()) return;
    e.preventDefault();
    view.zoom *= Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
    render();
  }, { passive: false });

  layoutBeam();
  update();
  const saved = sessionGet();
  if (saved) showPhoto(saved);
})();
