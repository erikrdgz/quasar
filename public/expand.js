// Tile → panel morph, modelled on iOS's card/app-launch transition.
//
// One spring drives everything, so the pieces can never drift apart:
//   • the panel's shape (a rounded clip that grows from the tile's rect),
//   • the panel's content, which rides the clip's top-left corner and scales up
//     from the tile's width,
//   • a copy of the tile that scales up with it and dissolves early,
//   • the app behind, which recedes and dims.
// Geometry is always measured with the app unscaled, and a close that interrupts
// an open reverses from wherever the card is at that moment.
import {icon} from './icons.js?v=35';
import {reduceMotion} from './motion.js?v=35';

// iOS-style spring described by response (seconds) and damping ratio.
function spring(response, dampingRatio) {
  const k = (2 * Math.PI / response) ** 2, c = 4 * Math.PI * dampingRatio / response, dt = 1 / 240;
  let x = 0, v = 0;
  const values = [0];
  for (let frame = 0; frame < 90; frame++) {
    for (let i = 0; i < 4; i++) { v += (k * (1 - x) - c * v) * dt; x += v * dt; }
    values.push(x);
    if (Math.abs(1 - x) < 0.0015 && Math.abs(v) < 0.02) break;
  }
  values[values.length - 1] = 1;
  return {values, duration: (values.length - 1) * 1000 / 60};
}
const OPEN = spring(0.5, 0.82);   // lands with a small, quick settle
const CLOSE = spring(0.4, 1);     // critically damped: returns home without overshoot

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
const radiusOf = el => parseFloat(getComputedStyle(el).borderTopLeftRadius) || 24;
const rectOf = el => { const r = el.getBoundingClientRect(); return {top: r.top, left: r.left, width: r.width, height: r.height}; };

// Open panels, bottom to top. A panel opened with {nested: true} stacks on the
// one below it (which recedes like the app does); any other open closes them all.
const stack = [];
export const panelOpen = () => stack.length > 0;
// Closes everything (e.g. on a tab switch): stacked panels instantly, the bottom one animated.
export function closePanel() { while (stack.length > 1) stack.at(-1).close(true); return stack[0]?.close() || Promise.resolve(); }

function cloneTile(tile, rect) {
  const ghost = tile.cloneNode(true);
  ghost.classList.remove('is-origin');
  ghost.classList.add('panel-ghost');
  ghost.removeAttribute('data-tile');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.inert = true;
  Object.assign(ghost.style, {width: rect.width + 'px', height: rect.height + 'px'});
  return ghost;
}

/**
 * @param origin  the tapped tile (data-tile lets it be found again after re-renders)
 * @param opts    {tone, title, build(body, api), onClose, initialFocus(body), nested, shape(api)}
 *                shape: the element the panel visibly becomes (defaults to the whole panel).
 *                The panel's box stays full-screen so the morph is painted all the way.
 */
export function openPanel(origin, opts) {
  const parent = opts.nested ? stack.at(-1) || null : null;
  if (!parent) while (stack.length) stack.at(-1).close(true);
  const key = origin.dataset.tile;
  const findOrigin = () => (origin.isConnected ? origin : key && document.querySelector(`[data-tile="${key}"]`));
  const app = document.getElementById('app'), tabbar = document.querySelector('.tabbar');
  // What recedes behind this panel: the app, or the panel it opened from.
  const behind = parent ? parent.panel : app;

  const from = rectOf(origin), fromRadius = radiusOf(origin);
  const layer = document.createElement('div');
  layer.className = 'panel-layer';
  layer.innerHTML = `<div class="panel-backdrop"></div><section class="panel" role="dialog" aria-modal="true" aria-labelledby="panel-title" data-tone="${opts.tone || ''}"><div class="panel-inner"><header class="panel-head"><h2 id="panel-title"></h2><div class="panel-aside"></div><button class="panel-close" type="button" aria-label="Close">${icon('close')}</button></header><div class="panel-body"></div></div></section>`;
  const panel = layer.querySelector('.panel'), inner = layer.querySelector('.panel-inner'), body = layer.querySelector('.panel-body');
  const backdrop = layer.querySelector('.panel-backdrop'), aside = layer.querySelector('.panel-aside');
  layer.querySelector('h2').textContent = opts.title || '';
  if (opts.style) panel.setAttribute('style', opts.style);
  document.body.append(layer);
  if (parent) parent.layer.inert = true;
  else {
    document.documentElement.classList.add('panel-open');
    app.inert = true;
    if (tabbar) tabbar.inert = true;
  }

  let running = [], run = null;
  const api = {
    panel, body, layer, parent,
    setAside(html) { aside.innerHTML = html; },
    setTitle(text) { layer.querySelector('h2').textContent = text; },
    close,
  };
  opts.build(body, api);

  const box = rectOf(panel), to = rectOf(opts.shape?.(api) || panel), toRadius = radiusOf(panel);
  origin.classList.add('is-origin');
  let ghost = cloneTile(origin, from);
  layer.append(ghost);

  // Keyframe values for every piece at progress p (0 = tile, 1 = open panel).
  function frames(tile, tileRadius, ghostRect, p, phase) {
    const top = lerp(tile.top, to.top, p), left = lerp(tile.left, to.left, p);
    const width = lerp(tile.width, to.width, p), height = lerp(tile.height, to.height, p);
    const radius = lerp(tileRadius, toRadius, clamp(p));
    const opening = phase === 'open';
    return {
      panel: {clipPath: `inset(${top - box.top}px ${box.left + box.width - left - width}px ${box.top + box.height - top - height}px ${left - box.left}px round ${radius}px)`},
      inner: {
        transform: `translate(${left - to.left}px, ${top - to.top}px) scale(${width / to.width})`,
        // Closing: content leaves early so the shrinking shape never crops it.
        opacity: opening ? clamp((p - 0.1) / 0.4) : clamp((p - 0.62) / 0.3),
      },
      ghost: {
        transform: `translate(${left}px, ${top}px) scale(${width / ghostRect.width})`,
        opacity: opening ? clamp(1 - p / 0.32) : clamp(1 - p / 0.6),
      },
      backdrop: {opacity: clamp(p)},
      behind: {transform: `scale(${1 - (parent ? 0.04 : 0.06) * p})`, filter: `brightness(${1 - 0.5 * clamp(p)})`},
    };
  }

  function animate(curve, p0, p1, tile, tileRadius, ghostRect, phase) {
    const steps = curve.values.map(v => frames(tile, tileRadius, ghostRect, lerp(p0, p1, v), phase));
    const timing = {duration: Math.max(1, curve.duration * Math.sqrt(Math.abs(p1 - p0))), easing: 'linear', fill: 'both'};
    const track = (el, part) => el.animate(steps.map((s, i) => ({...s[part], offset: i / (steps.length - 1)})), timing);
    running = [track(panel, 'panel'), track(inner, 'inner'), track(ghost, 'ghost'), track(backdrop, 'backdrop'), track(behind, 'behind')];
    run = {curve, p0, p1, start: performance.now(), duration: timing.duration};
    return Promise.all(running.map(a => a.finished));
  }

  // Where the spring is right now, so an interrupted open reverses smoothly.
  function progressNow() {
    if (!run) return 1;
    const t = clamp((performance.now() - run.start) / run.duration), values = run.curve.values;
    return lerp(run.p0, run.p1, values[Math.min(values.length - 1, Math.round(t * (values.length - 1)))]);
  }

  if (!parent) app.style.transformOrigin = `50% ${scrollY + innerHeight / 2}px`;
  if (reduceMotion()) {
    ghost.remove();
    layer.animate([{opacity: 0}, {opacity: 1}], {duration: 160});
  } else {
    animate(OPEN, 0, 1, from, fromRadius, from, 'open').catch(() => {});
  }

  const focusTarget = opts.initialFocus?.(body) || layer.querySelector('.panel-close');
  focusTarget.focus({preventScroll: true});

  // Only the top panel answers Escape.
  function onKey(e) { if (e.key === 'Escape' && stack.at(-1) === api) { e.preventDefault(); close(); } }
  document.addEventListener('keydown', onKey);
  layer.querySelector('.panel-close').addEventListener('click', () => close());
  backdrop.addEventListener('click', () => close());

  function cleanup() {
    document.removeEventListener('keydown', onKey);
    running.forEach(a => a.cancel());
    layer.remove();
    const index = stack.indexOf(api);
    if (index >= 0) stack.splice(index, 1);
    if (parent) parent.layer.inert = false;
    else {
      document.documentElement.classList.remove('panel-open');
      app.inert = false;
      if (tabbar) tabbar.inert = false;
      app.style.transformOrigin = '';
    }
    const tile = findOrigin();
    tile?.classList.remove('is-origin');
    if (!parent) document.querySelectorAll('.is-origin').forEach(el => el.classList.remove('is-origin'));
    tile?.focus?.({preventScroll: true});
  }

  // Resolves once the card is back in its tile and the layer is gone.
  let closed = null;
  function close(immediate = false) {
    if (closed) return closed;
    document.activeElement?.blur?.();
    opts.onClose?.();
    if (immediate) { cleanup(); return (closed = Promise.resolve()); }
    const p0 = progressNow();
    // Drop the running animations first so the tile is measured unscaled.
    running.forEach(a => a.cancel());
    const tile = findOrigin();
    if (reduceMotion() || !tile) {
      return (closed = layer.animate([{opacity: 1}, {opacity: 0}], {duration: 160}).finished.then(cleanup));
    }
    tile.classList.add('is-origin');
    const back = rectOf(tile);
    // Re-clone so the tile copy carries the tile's latest numbers home.
    const fresh = cloneTile(tile, back);
    ghost.replaceWith(fresh);
    ghost = fresh;
    return (closed = animate(CLOSE, p0, 0, back, radiusOf(tile), back, 'close').then(cleanup, cleanup));
  }

  stack.push(api);
  return api;
}
