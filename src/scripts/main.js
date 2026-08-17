import Lenis from 'lenis';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Mark that JS is running so the reveal hidden-state applies (see global.css).
   Done synchronously before paint so there's no flash of hidden content. */
document.documentElement.classList.add('js');

/* ---------- Lenis smooth scroll ---------- */
let lenis = null;
if (!reduce) {
  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
}

/* ---------- Parallax painting + clouds + laptop ---------- */
const skyInner = document.querySelector('.sky-canvas__inner');
const skyCanvas = document.querySelector('.sky-canvas');
const cloudLayer = document.querySelector('.clouds');
const laptop = document.querySelector('[data-tilt]');
function updateParallax() {
  const scrollY = window.scrollY;
  if (skyInner) {
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    // Keep content over the painting's blue sky band: cap the drift so the warm
    // foliage at the bottom of the painting never rises into the content area
    // (matches the live site, whose page is nearly as tall as the painting).
    const realOverflow = Math.max(0, skyInner.offsetHeight - document.documentElement.scrollHeight);
    const overflow = Math.min(realOverflow, 520);
    const progress = docH > 0 ? scrollY / docH : 0;
    const shift = -progress * overflow;
    skyInner.style.transform = `translateX(-50%) translateY(${shift}px)`;
  }
  // cloud layer drifts down slower than the page for depth (images keep CSS drift)
  if (cloudLayer) cloudLayer.style.transform = `translateY(${scrollY * 0.1}px)`;
  // laptop gently settles flat and lifts as it scrolls into view
  if (laptop) {
    const r = laptop.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, 1 - (r.top - vh * 0.2) / (vh * 0.8)));
    const rot = 6 - p * 6;         // 6deg -> 0deg
    const ty = (1 - p) * 40;       // lifts up 40px
    laptop.style.transform = `rotateX(${rot}deg) translateY(${ty}px)`;
  }
}

/* ---------- Nav scrolled state ---------- */
const nav = document.getElementById('nav');
function updateNav() {
  if (!nav) return;
  nav.classList.toggle('is-scrolled', window.scrollY > 40);
}

/* scroll listeners */
function onScroll() {
  updateParallax();
  updateNav();
  checkReveal();
}
if (lenis) lenis.on('scroll', onScroll);
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', updateParallax);
window.addEventListener('load', () => { updateParallax(); updateNav(); });
updateParallax();
updateNav();

/* ---------- Scroll reveal ----------
   Driven by scroll + load events (not solely IntersectionObserver) so it
   still works in environments where IO / compositing is unavailable, and
   never leaves content stranded at opacity 0. */
const revealEls = [...document.querySelectorAll('[data-reveal]')];
function checkReveal() {
  if (reduce) { revealEls.forEach((el) => el.classList.add('is-in')); return; }
  const trigger = window.innerHeight * 0.9;
  for (let i = revealEls.length - 1; i >= 0; i--) {
    const el = revealEls[i];
    if (el.getBoundingClientRect().top < trigger) {
      el.classList.add('is-in');
      revealEls.splice(i, 1);
    }
  }
}
window.addEventListener('scroll', checkReveal, { passive: true });
window.addEventListener('resize', checkReveal);
window.addEventListener('load', checkReveal);
checkReveal();
// Safety net: never let content stay hidden if something goes wrong.
setTimeout(() => revealEls.forEach((el) => el.classList.add('is-in')), 2500);

/* ---------- Marquee ---------- */
document.querySelectorAll('[data-marquee]').forEach((row) => {
  const track = row.querySelector('.tm__track');
  if (!track) return;
  const speed = parseFloat(row.dataset.speed || '60'); // px per second
  const reverse = row.hasAttribute('data-reverse');
  let half = track.scrollWidth / 2;
  let offset = reverse ? -half : 0;
  let last = performance.now();
  let paused = false;
  row.addEventListener('mouseenter', () => (paused = true));
  row.addEventListener('mouseleave', () => (paused = false));
  function step(now) {
    const dt = (now - last) / 1000;
    last = now;
    if (!paused && !reduce) {
      offset += (reverse ? 1 : -1) * speed * dt;
      if (!reverse && offset <= -half) offset += half;
      if (reverse && offset >= 0) offset -= half;
      track.style.transform = `translateX(${offset}px)`;
    }
    requestAnimationFrame(step);
  }
  window.addEventListener('resize', () => { half = track.scrollWidth / 2; });
  requestAnimationFrame(step);
});

/* ---------- FAQ accordion ---------- */
document.querySelectorAll('.faq__q').forEach((btn) => {
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
  });
});

/* ---------- Pricing toggle ---------- */
const planOpts = document.querySelectorAll('.pricing__opt');
planOpts.forEach((opt) => {
  opt.addEventListener('click', () => {
    planOpts.forEach((o) => o.classList.remove('is-active'));
    opt.classList.add('is-active');
    const plan = opt.dataset.plan;
    document.querySelectorAll('[data-price]').forEach((el) => {
      el.textContent = el.dataset[plan];
    });
    document.querySelectorAll('[data-billed]').forEach((el) => {
      el.textContent = el.dataset[plan];
    });
  });
});

/* ---------- Brief tabs ---------- */
const briefTabs = document.querySelectorAll('[data-brief-tab]');
briefTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.briefTab;
    document.querySelectorAll('[data-brief-tab]').forEach((t) => t.classList.toggle('is-active', t === tab));
    document.querySelectorAll('[data-brief-panel]').forEach((p) => {
      p.classList.toggle('is-active', p.dataset.briefPanel === target);
    });
  });
});

/* ---------- Anchor smooth scroll via Lenis ---------- */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: -70 });
    else target.scrollIntoView({ behavior: 'smooth' });
  });
});
