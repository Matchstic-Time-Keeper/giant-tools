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
  ];

  const icon = t => `<span class="tool-icon" aria-hidden="true">${t.letter ? `<span class="tool-letter">${t.letter}</span>` : ''}</span>`;

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
    </nav>`);

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
  nav.querySelector('.tool-nav-close').addEventListener('click', () => setOpen(false));
  scrim.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) setOpen(false); });
})();
