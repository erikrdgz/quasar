// First run: a two-step onboarding that asks for a name.
// Every launch after that: a short welcome with the logo and a greeting.
import {ctx, money} from './context.js?v=22';
import {samples, reduceMotion} from './motion.js?v=22';
import {openMonthOf, totals, monthName} from './ledger.js?v=22';
import {pickGreeting} from './greeting.js?v=22';
import {flush} from './store.js?v=22';

const curve = samples(220, 22);
const intro = () => document.getElementById('intro');
const logo = `<div class="intro-mark" aria-hidden="true">
  <img class="intro-logo-source" src="./icon-512.png" alt="" width="168" height="168" decoding="async">
  <svg class="intro-orbit" viewBox="0 0 512 512" aria-hidden="true">
    <defs>
      <filter id="intro-ring-soft"><feGaussianBlur stdDeviation="2"/></filter>
      <filter id="intro-seam-soft"><feGaussianBlur stdDeviation="9"/></filter>
      <mask id="intro-ring-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512"><g filter="url(#intro-ring-soft)"><circle cx="248" cy="245" r="160" fill="white"/><circle cx="248" cy="245" r="94" fill="black"/></g></mask>
      <mask id="intro-clean-ring" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512"><rect width="512" height="512" fill="white"/><path d="M248 245L512 265V512H230Z" fill="black" filter="url(#intro-seam-soft)"/></mask>
      <mask id="intro-ring-patch" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512"><path d="M248 245L512 265V512H230Z" fill="white" filter="url(#intro-seam-soft)"/></mask>
    </defs>
    <g mask="url(#intro-ring-mask)">
      <image href="./icon-512.png" width="512" height="512" mask="url(#intro-clean-ring)"/>
      <g mask="url(#intro-ring-patch)"><image href="./icon-512.png" width="512" height="512" transform="rotate(90 248 245)"/></g>
    </g>
  </svg>
  <svg class="intro-stroke" viewBox="0 0 512 512" aria-hidden="true">
    <defs><clipPath id="intro-tail-clip"><path d="M248 272L318 286L458 427L344 382L283 340Z"/></clipPath><mask id="intro-tail-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512"><path class="intro-tail-draw" d="M259 286 Q318 315 444 415" pathLength="1" fill="none" stroke="white" stroke-width="84" stroke-linecap="round"/></mask></defs>
    <image href="./icon-512.png" width="512" height="512" clip-path="url(#intro-tail-clip)" mask="url(#intro-tail-mask)"/>
  </svg>
  <img class="intro-logo-finish" src="./icon-512.png" alt="" width="168" height="168" decoding="async">
  <img class="intro-logo-shine" src="./icon-512.png" alt="" width="168" height="168" decoding="async">
  <span class="intro-logo-flare"></span>
</div>`;
const logoReady = new WeakMap();

// A signature in three beats: seat the reflective ring, write the diagonal,
// then cut a single specular light across the completed mark.
async function revealLogo(mark) {
  try { await mark.querySelector('.intro-logo-source').decode(); } catch { /* Keep the welcome usable if the image fails. */ }
  if (!mark.isConnected) return;
  const orbit = mark.querySelector('.intro-orbit');
  const stroke = mark.querySelector('.intro-stroke');
  const draw = mark.querySelector('.intro-tail-draw');
  const finish = mark.querySelector('.intro-logo-finish');
  if (reduceMotion()) {
    finish.animate([{opacity: 0}, {opacity: 1}], {duration: 180, fill: 'both'});
    return;
  }
  // One continuous revolution, a short deceleration, then the separate sparkle.
  orbit.animate([
    {opacity: 0, transform: 'perspective(600px) rotateY(24deg) rotateZ(-360deg) scale(.92)', filter: 'blur(1.5px)', offset: 0},
    {opacity: 1, transform: 'perspective(600px) rotateY(18deg) rotateZ(-315deg) scale(.96)', filter: 'blur(.4px)', offset: .12},
    {opacity: 1, transform: 'perspective(600px) rotateY(-12deg) rotateZ(-90deg) scale(1)', filter: 'blur(.3px)', offset: .68, easing: 'cubic-bezier(.12,.45,.18,1)'},
    {opacity: 1, transform: 'perspective(600px) rotateY(0deg) rotateZ(0deg) scale(1)', filter: 'blur(0px)', offset: .94},
    {opacity: 0, transform: 'perspective(600px) rotateY(0deg) rotateZ(0deg) scale(1)', filter: 'blur(0px)', offset: 1}
  ], {duration: 1480, easing: 'linear', fill: 'both'});
  stroke.animate([{opacity: 0}, {opacity: 1, offset: .25}, {opacity: 0}], {duration: 250, delay: 1350, fill: 'both'});
  draw.animate([{strokeDashoffset: '1'}, {strokeDashoffset: '0'}], {duration: 220, delay: 1350, easing: 'cubic-bezier(.3,0,.15,1)', fill: 'both'});
  finish.animate([{opacity: 0}, {opacity: 1}], {duration: 100, delay: 1380, fill: 'both'});
  mark.querySelector('.intro-logo-shine').animate([
    {opacity: 0, maskPosition: '130% 0', webkitMaskPosition: '130% 0', offset: 0},
    {opacity: .95, maskPosition: '100% 0', webkitMaskPosition: '100% 0', offset: .16},
    {opacity: .85, maskPosition: '0% 0', webkitMaskPosition: '0% 0', offset: .82},
    {opacity: 0, maskPosition: '-30% 0', webkitMaskPosition: '-30% 0', offset: 1}
  ], {duration: 320, delay: 1410, easing: 'cubic-bezier(.25,.1,.25,1)', fill: 'both'});
  // A small specular glint follows the glass rim before blooming at the stroke.
  mark.querySelector('.intro-logo-flare').animate([
    {opacity: 0, transform: 'translate(28%,-154%) rotate(-28deg) scale(.45)', offset: 0},
    {opacity: .65, transform: 'translate(63%,-85%) rotate(-12deg) scale(.65)', offset: .25},
    {opacity: 1, transform: 'translate(0%,0%) rotate(12deg) scale(1.15)', offset: .57},
    {opacity: .45, transform: 'translate(0%,0%) rotate(18deg) scale(.8)', offset: .76},
    {opacity: 0, transform: 'translate(0%,0%) rotate(22deg) scale(.35)', offset: 1}
  ], {duration: 410, delay: 1390, easing: 'linear', fill: 'both'});
}

function springIn(el, {y = 24, scale = 0.94, delay = 0} = {}) {
  if (reduceMotion()) return el.animate([{opacity: 0}, {opacity: 1}], {duration: 200, delay, fill: 'backwards'});
  return el.animate(curve.map((v, i) => ({opacity: Math.min(1, i / 12), transform: `translateY(${(1 - v) * y}px) scale(${scale + (1 - scale) * v})`, offset: i / 60})), {duration: 700, delay, easing: 'linear', fill: 'backwards'});
}

function swap(html) {
  const root = intro();
  root.innerHTML = `<div class="intro-step">${html}</div>`;
  const step = root.querySelector('.intro-step');
  [...step.children].forEach((el, i) => {
    if (el.classList.contains('intro-mark')) logoReady.set(step, revealLogo(el));
    else springIn(el, {delay: i * 90});
  });
  return root.querySelector('.intro-step');
}

// The overlay lifts away and the app settles in underneath.
async function dismiss() {
  const root = intro(), app = document.getElementById('app'), tabbar = document.querySelector('.tabbar');
  if (!root || root.dataset.leaving) return;
  root.dataset.leaving = '1';
  if (!reduceMotion()) {
    const img = root.querySelector('.intro-mark');
    img?.animate([{transform: 'scale(1)', opacity: 1}, {transform: 'scale(1.35)', opacity: 0}], {duration: 420, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards'});
    [app, tabbar].forEach(el => el.animate(curve.map((v, i) => ({opacity: Math.min(1, i / 14), transform: `${el === tabbar ? 'translateX(-50%) ' : ''}scale(${0.94 + 0.06 * v})`, offset: i / 60})), {duration: 420, delay: 80, easing: 'linear', fill: 'backwards'}));
  }
  await root.animate([{opacity: 1}, {opacity: 0}], {duration: reduceMotion() ? 160 : 380, delay: reduceMotion() ? 0 : 80, easing: 'ease-out', fill: 'forwards'}).finished;
  root.remove();
}

function subline() {
  const month = openMonthOf(ctx.state);
  if (ctx.state.budget && month) {
    const left = totals(month).left;
    return left >= 0 ? `${money(left)} left to spend in ${monthName(month.key)}` : `${money(-left)} over in ${monthName(month.key)}`;
  }
  return "Let's find your number.";
}

export function showWelcome(text = null) {
  let root = intro();
  if (!root) {
    root = document.createElement('div');
    root.id = 'intro';
    root.className = 'intro';
    document.body.append(root);
  }
  delete root.dataset.leaving;
  const prefs = ctx.state.prefs;
  const line = text || pickGreeting(prefs.name, new Date(), Math.random, prefs.lastGreeting);
  if (!text) { prefs.lastGreeting = line; ctx.commit({render: false}); }
  const step = swap(`${logo}<h1 class="intro-greeting"></h1><p></p>`);
  root.querySelector('.intro-greeting').textContent = line;
  root.querySelector('p').textContent = subline();
  root.setAttribute('aria-label', line);
  // Logo settles at 1800ms; the app finishes entering at 2420ms.
  let timer;
  Promise.resolve(logoReady.get(step)).then(() => {
    if (step.isConnected && !root.dataset.leaving) timer = setTimeout(dismiss, reduceMotion() ? 1100 : 1920);
  });
  root.addEventListener('click', () => { clearTimeout(timer); dismiss(); }, {once: true});
}

function onboarding() {
  const step1 = swap(`${logo}<h1>Quasar</h1><p>See what you'll have each month, then watch it as you spend.</p><button type="button" class="button primary intro-button">Get started</button>`);
  step1.querySelector('button').addEventListener('click', askName, {once: true});
}

function askName() {
  const step = swap(`<h1>What should we call you?</h1><p>Just a first name. It stays on this device.</p><input class="intro-name" type="text" maxlength="40" autocomplete="given-name" autocapitalize="words" enterkeyhint="go" placeholder="Name" aria-label="Your name"><button type="button" class="button primary intro-button" disabled>Continue</button>`);
  const input = step.querySelector('input'), button = step.querySelector('button');
  input.focus();
  input.addEventListener('input', () => { button.disabled = !input.value.trim(); });
  const finish = async () => {
    const name = input.value.trim().slice(0, 40);
    if (!name) return;
    ctx.state.prefs.name = name;
    ctx.commit({render: false});
    await flush();
    input.blur();
    showWelcome(`Nice to meet you, ${name}`);
  };
  button.addEventListener('click', finish);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); finish(); } });
}

export function runIntro() {
  if (ctx.state.prefs.name) showWelcome();
  else onboarding();
}

// Coming back after a while counts as "coming back".
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') hiddenAt = Date.now();
  else if (hiddenAt && Date.now() - hiddenAt > 30 * 60 * 1000 && ctx.state?.prefs.name && !intro()) showWelcome();
});
