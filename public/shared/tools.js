// The list of GiANT tools, and the places it is shown:
//   - the landing page grid:  <ul data-tool-list></ul>, plus a QR code in <div data-tool-qr>
//   - the left "Tools" navigation on every tool page (added automatically), with a QR code
// To add a tool, add an entry here.
(() => {
  const TOOLS = [
    {
      slug: 'leadership-mirror',
      name: 'Leadership Mirror',
      question: 'What is it like to be on the other side of me?',
      description: 'What is it like to be on the other side of me? Place your photo in the mirror and assess yourself.',
      figure: 'headshot',
    },
    {
      slug: 'resistant-responsive',
      name: 'Resistant or Responsive',
      question: 'How responsive am I?',
      description: 'How responsive am I? Assess how secure, confident and humble you are.',
      letter: 'R',
    },
    {
      slug: 'push-pull',
      name: 'Push or Pull',
      question: 'Am I a balanced leader?',
      description: 'Am I a balanced leader? See whether you lean toward telling or asking.',
      glow: 'balance',
      letter: 'P',
      letterColor: '#7d4fb0',   // balance purple, between Tell red and Ask blue
    },
  ];

  // A soft, out-of-focus head-and-shoulders shape behind the glass
  const HEADSHOT = `<svg class="tool-figure" viewBox="0 0 34 48" aria-hidden="true">
    <circle cx="17" cy="20" r="7.5"/><ellipse cx="17" cy="46" rx="14" ry="13"/></svg>`;

  const icon = t => `<span class="tool-icon${t.glow ? ` glow-${t.glow}` : ''}" aria-hidden="true">${
    t.figure === 'headshot' ? HEADSHOT : ''}${
    t.letter ? `<span class="tool-letter"${t.letterColor ? ` style="color:${t.letterColor}"` : ''}>${t.letter}</span>` : ''}</span>`;

  const card = (t, { compact = false, current = false } = {}) => `
    <li>
      <a class="tool-card${compact ? ' compact' : ''}" href="/${t.slug}/"${current ? ' aria-current="page"' : ''}>
        ${icon(t)}
        <span class="tool-text">
          <span class="tool-name">${t.name}</span>
          <span class="tool-desc">${compact ? t.question : t.description}</span>
        </span>
      </a>
    </li>`;

  // ---------- QR code ----------
  // Crisp SVG squares with the standard 4-module quiet zone
  function qrSvg(text) {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount(), q = 4, size = n + q * 2;
    let d = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + q} ${r + q}h1v1h-1z`;
    }
    return `<svg viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" aria-hidden="true">` +
      `<rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#111"/></svg>`;
  }

  // A small QR thumbnail that expands to a large one; tapping the large one (or Escape) closes it
  function qrBlock({ url, title, caption }) {
    const svg = qrSvg(url);
    return {
      html: `
        <div class="qr-block">
          <button class="qr-thumb" type="button" aria-haspopup="dialog" aria-label="Show a larger QR code for ${title}">${svg}</button>
          <span class="qr-caption">${caption}</span>
        </div>`,
      dialog: `
        <dialog class="qr-dialog" aria-label="QR code for ${title}">
          <button class="qr-big" type="button" aria-label="Close QR code">${svg}</button>
          <p class="qr-dialog-caption"><strong>${title}</strong><span>Scan with your phone camera · tap to close</span></p>
        </dialog>`,
    };
  }

  function wireQr() {
    const dialog = document.querySelector('.qr-dialog');
    document.querySelector('.qr-thumb').addEventListener('click', () => dialog.showModal());
    dialog.addEventListener('click', () => dialog.close());
    return dialog;
  }

  // ---------- Landing page ----------
  const list = document.querySelector('[data-tool-list]');
  if (list) list.innerHTML = TOOLS.map(t => card(t)).join('');

  const landingQr = document.querySelector('[data-tool-qr]');
  if (landingQr) {
    const qr = qrBlock({ url: `${location.origin}/`, title: 'GiANT Tools', caption: 'Scan to open GiANT Tools on your phone' });
    landingQr.innerHTML = qr.html;
    document.body.insertAdjacentHTML('beforeend', qr.dialog);
    wireQr();
  }

  // ---------- Tool pages: left navigation (a slide-out panel on narrow screens) ----------
  const slug = location.pathname.split('/').filter(Boolean)[0];
  const tool = TOOLS.find(t => t.slug === slug);
  if (!tool) return;

  const qr = qrBlock({ url: `${location.origin}/${slug}/`, title: tool.name, caption: 'Scan to open this tool' });
  document.body.classList.add('has-tool-nav');
  document.body.insertAdjacentHTML('afterbegin', `
    <button class="tool-nav-toggle" type="button" aria-controls="toolNav" aria-expanded="false">
      <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h14"/></svg>
      Tools
    </button>
    <div class="tool-nav-scrim" hidden></div>
    <nav class="tool-nav" id="toolNav" aria-label="Tools">
      <div class="tool-nav-head">
        <a href="/" class="tool-nav-title">Tools</a>
        <button class="tool-nav-close" type="button" aria-label="Close tools">
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg>
        </button>
      </div>
      <ul class="tool-nav-list">
        ${TOOLS.map(t => card(t, { compact: true, current: t.slug === slug })).join('')}
      </ul>
      <div class="tool-nav-qr">${qr.html}</div>
    </nav>
    ${qr.dialog}`);

  const nav = document.getElementById('toolNav');
  const toggle = document.querySelector('.tool-nav-toggle');
  const scrim = document.querySelector('.tool-nav-scrim');
  const qrDialog = wireQr();

  function setOpen(open) {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open);
    scrim.hidden = !open;
    if (open) nav.querySelector('[aria-current]')?.focus();
    else toggle.focus();
  }
  toggle.addEventListener('click', () => setOpen(true));
  nav.querySelector('.tool-nav-close').addEventListener('click', () => setOpen(false));
  scrim.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('open') && !qrDialog.open) setOpen(false);
  });
})();
