// The list of GiANT tools, and the two places it is shown:
//   - the landing page grid:  <ul data-tool-list></ul>
//   - the left "Tools" navigation on every tool page (added automatically)
// To add a tool, add an entry here.
(() => {
  const TOOLS = [
    {
      slug: 'leadership-mirror',
      name: 'Leadership Mirror',
      question: 'What is it like to be on the other side of me?',
      description: 'What is it like to be on the other side of me? Place your photo in the mirror and assess yourself.',
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

  const icon = t => `<span class="tool-icon${t.glow ? ` glow-${t.glow}` : ''}" aria-hidden="true">${t.letter ? `<span class="tool-letter"${t.letterColor ? ` style="color:${t.letterColor}"` : ''}>${t.letter}</span>` : ''}</span>`;

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

  // Landing page
  const list = document.querySelector('[data-tool-list]');
  if (list) list.innerHTML = TOOLS.map(t => card(t)).join('');

  // Tool pages: left navigation (a slide-out panel on narrow screens)
  const slug = location.pathname.split('/').filter(Boolean)[0];
  if (!TOOLS.some(t => t.slug === slug)) return;

  const tool = TOOLS.find(t => t.slug === slug);
  const toolUrl = `${location.origin}/${slug}/`;

  // QR code as crisp SVG squares, with the standard 4-module quiet zone
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
      <div class="tool-nav-qr">
        <button class="qr-thumb" type="button" aria-haspopup="dialog" aria-label="Show a larger QR code for this tool">
          ${qrSvg(toolUrl)}
        </button>
        <span class="qr-caption">Scan to open this tool</span>
      </div>
    </nav>
    <dialog class="qr-dialog" aria-label="QR code for ${tool.name}">
      <button class="qr-big" type="button" aria-label="Close QR code">${qrSvg(toolUrl)}</button>
      <p class="qr-dialog-caption"><strong>${tool.name}</strong><span>Scan with your phone camera · tap to close</span></p>
    </dialog>`);

  const nav = document.getElementById('toolNav');
  const toggle = document.querySelector('.tool-nav-toggle');
  const scrim = document.querySelector('.tool-nav-scrim');

  function setOpen(open) {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open);
    scrim.hidden = !open;
    if (open) nav.querySelector('[aria-current]')?.focus();
    else toggle.focus();
  }
  toggle.addEventListener('click', () => setOpen(true));

  // QR: the thumbnail opens a large version; tapping it (or Escape) closes
  const qrDialog = document.querySelector('.qr-dialog');
  document.querySelector('.qr-thumb').addEventListener('click', () => qrDialog.showModal());
  qrDialog.addEventListener('click', () => qrDialog.close());
  nav.querySelector('.tool-nav-close').addEventListener('click', () => setOpen(false));
  scrim.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('open') && !qrDialog.open) setOpen(false);
  });
})();
