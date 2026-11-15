// First run: the logo, then a short setup walkthrough (setup.js).
// Every launch after that: a short welcome with the logo and a greeting.
import {ctx, money} from './context.js?v=37';
import {samples, reduceMotion} from './motion.js?v=37';
import {openMonthOf, totals, monthName, lockIn} from './ledger.js?v=37';
import {startSetup} from './setup.js?v=37';
import {pickGreeting} from './greeting.js?v=37';
import {flush, persist} from './store.js?v=37';

const curve = samples(220, 22);
const intro = () => document.getElementById('intro');
const logo = `<div class="intro-mark" aria-hidden="true">
  <img class="intro-orbit" src="./quasar-ring.png" alt="" width="168" height="168" decoding="async">
  <svg class="intro-stroke" viewBox="0 0 512 512" aria-hidden="true">
    <defs><mask id="intro-tail-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512"><path class="intro-tail-draw" d="M259 286 Q318 315 444 415" pathLength="1" fill="none" stroke="white" stroke-width="84" stroke-linecap="round"/></mask></defs>
    <image href="./quasar-stroke.svg" width="512" height="512" mask="url(#intro-tail-mask)"/>
  </svg>
  <img class="intro-logo-shine" src="./quasar-ring.png" alt="" width="168" height="168" decoding="async">
  <span class="intro-logo-flare"></span>
</div>`;
const logoReady = new WeakMap();

// A signature in three beats: seat the reflective ring, write the diagonal,
// then cut a single specular light across the completed mark.
async function revealLogo(mark) {
  try { await mark.querySelector('.intro-orbit').decode(); } catch { /* Keep the welcome usable if the image fails. */ }
  if (!mark.isConnected) return;
  const orbit = mark.querySelector('.intro-orbit');
  const stroke = mark.querySelector('.intro-stroke');
  const draw = mark.querySelector('.intro-tail-draw');
  if (reduceMotion()) {
    draw.style.strokeDashoffset = '0';
    [orbit, stroke].forEach(el => el.animate([{opacity: 0}, {opacity: 1}], {duration: 180, fill: 'both'}));
    return;
  }
  // Center the mark alone, then lift it into the completed welcome layout.
  const lift = (mark.parentElement.getBoundingClientRect().height - mark.getBoundingClientRect().height) / 2;
  mark.animate([{transform: `translateY(${lift}px)`}, {transform: 'translateY(0px)'}], {duration: 420, delay: 1000, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both'});
  // A quick 350ms finishing turn, then a separate glass sparkle and a brief hold.
  orbit.animate([
    {opacity: 0, transform: 'perspective(600px) rotateY(12deg) rotateZ(-90deg) scale(.98)', filter: 'blur(1.5px)', offset: 0},
    {opacity: 1, transform: 'perspective(600px) rotateY(8deg) rotateZ(-78.75deg) scale(.99)', filter: 'blur(.4px)', offset: .12},
    {opacity: 1, transform: 'perspective(600px) rotateY(-2deg) rotateZ(-22.5deg) scale(1)', filter: 'blur(.3px)', offset: .60, easing: 'cubic-bezier(.12,.45,.18,1)'},
    {opacity: 1, transform: 'perspective(600px) rotateY(0deg) rotateZ(0deg) scale(1)', filter: 'blur(0px)', offset: 5 / 6},
    {opacity: 1, transform: 'perspective(600px) rotateY(0deg) rotateZ(0deg) scale(1)', filter: 'blur(0px)', offset: 1}
  ], {duration: 420, easing: 'linear', fill: 'both'});
  stroke.animate([{opacity: 0}, {opacity: 1, offset: .25}, {opacity: 1}], {duration: 250, delay: 350, fill: 'both'});
  draw.animate([{strokeDashoffset: '1'}, {strokeDashoffset: '0'}], {duration: 220, delay: 350, easing: 'cubic-bezier(.3,0,.15,1)', fill: 'both'});
  mark.querySelector('.intro-logo-shine').animate([
    {opacity: 0, maskPosition: '130% 0', webkitMaskPosition: '130% 0', offset: 0},
    {opacity: .95, maskPosition: '100% 0', webkitMaskPosition: '100% 0', offset: .16},
    {opacity: .85, maskPosition: '0% 0', webkitMaskPosition: '0% 0', offset: .82},
    {opacity: 0, maskPosition: '-30% 0', webkitMaskPosition: '-30% 0', offset: 1}
  ], {duration: 400, delay: 410, easing: 'cubic-bezier(.25,.1,.25,1)', fill: 'both'});
  // A small specular glint follows the glass rim before blooming at the stroke.
  mark.querySelector('.intro-logo-flare').animate([
    {opacity: 0, transform: 'translate(28%,-154%) rotate(-28deg) scale(.45)', offset: 0},
    {opacity: .65, transform: 'translate(63%,-85%) rotate(-12deg) scale(.65)', offset: .25},
    {opacity: 1, transform: 'translate(0%,0%) rotate(12deg) scale(1.15)', offset: .57},
    {opacity: .45, transform: 'translate(0%,0%) rotate(18deg) scale(.8)', offset: .76},
    {opacity: 0, transform: 'translate(0%,0%) rotate(22deg) scale(.35)', offset: 1}
  ], {duration: 600, delay: 400, easing: 'linear', fill: 'both'});
}

function springIn(el, {y = 24, scale = 0.94, delay = 0, duration = 700} = {}) {
  if (reduceMotion()) return el.animate([{opacity: 0}, {opacity: 1}], {duration: 200, delay, fill: 'backwards'});
  return el.animate(curve.map((v, i) => ({opacity: Math.min(1, i / 12), transform: `translateY(${(1 - v) * y}px) scale(${scale + (1 - scale) * v})`, offset: i / 60})), {duration, delay, easing: 'linear', fill: 'backwards'});
}

function swap(html) {
  const root = intro();
  root.innerHTML = `<div class="intro-step">${html}</div>`;
  const step = root.querySelector('.intro-step');
  const mark = step.querySelector('.intro-mark');
  if (mark) {
    const content = [...step.children].filter(el => el !== mark);
    content.forEach(el => { el.style.opacity = '0'; el.inert = true; });
    const ready = revealLogo(mark);
    logoReady.set(step, ready);
    ready.then(() => {
      if (!step.isConnected) return;
      content.forEach((el, i) => {
        el.style.removeProperty('opacity');
        springIn(el, {y: 16, scale: 1, delay: reduceMotion() ? 0 : 1000 + i * 70, duration: 420}).finished.then(() => { el.inert = false; });
      });
    });
  } else [...step.children].forEach((el, i) => springIn(el, {delay: i * 90}));
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
  // Turn ends at 350ms, sparkle at 1000ms, content by 1560ms, app entry at 2150ms.
  let timer;
  Promise.resolve(logoReady.get(step)).then(() => {
    if (step.isConnected && !root.dataset.leaving) timer = setTimeout(dismiss, reduceMotion() ? 1100 : 1650);
  });
  root.addEventListener('click', () => { clearTimeout(timer); dismiss(); }, {once: true});
}

function onboarding() {
  const step1 = swap(`${logo}<h1>Quasar</h1><p>See what you'll have each month, then watch it as you spend.</p><button type="button" class="button primary intro-button">Get started</button>`);
  step1.querySelector('button').addEventListener('click', async () => {
    // Glide the welcome away before the walkthrough eases in.
    const leaving = reduceMotion()
      ? step1.animate([{opacity: 1}, {opacity: 0}], {duration: 140, fill: 'forwards'})
      : step1.animate([{opacity: 1, transform: 'none'}, {opacity: 0, transform: 'translateX(-44px)'}], {duration: 300, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards'});
    await leaving.finished;
    startSetup(intro(), {
      back: onboarding,
      finish: async ({locked}) => {
        const s = ctx.state;
        if (locked) lockIn(s, ctx.plan(), new Date());
        s.prefs.onboarded = true;
        ctx.commit({render: false});
        await flush();
        if (locked) persist();
        navigate?.(locked ? 'today' : 'plans', {animate: false});
        const name = s.prefs.name;
        showWelcome(name ? `You're all set, ${name}` : "You're all set");
      },
    });
  }, {once: true});
}

let navigate = null;
export function runIntro(goTo) {
  navigate = goTo;
  if (ctx.state.prefs.onboarded) showWelcome();
  else onboarding();
}

// Coming back after a while counts as "coming back".
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') hiddenAt = Date.now();
  else if (hiddenAt && Date.now() - hiddenAt > 30 * 60 * 1000 && ctx.state?.prefs.onboarded && !intro()) showWelcome();
});
