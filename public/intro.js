// First run: a two-step onboarding that asks for a name.
// Every launch after that: a short welcome with the logo and a greeting.
import {ctx, money} from './context.js?v=22';
import {samples, reduceMotion} from './motion.js?v=22';
import {openMonthOf, totals, monthName} from './ledger.js?v=22';
import {pickGreeting} from './greeting.js?v=22';
import {flush} from './store.js?v=22';

const curve = samples(220, 22);
const intro = () => document.getElementById('intro');
const logo = '<img class="intro-logo" src="./icon-512.png" alt="" width="168" height="168">';

function springIn(el, {y = 24, scale = 0.94, delay = 0} = {}) {
  if (reduceMotion()) return el.animate([{opacity: 0}, {opacity: 1}], {duration: 200, delay, fill: 'backwards'});
  return el.animate(curve.map((v, i) => ({opacity: Math.min(1, i / 12), transform: `translateY(${(1 - v) * y}px) scale(${scale + (1 - scale) * v})`, offset: i / 60})), {duration: 700, delay, easing: 'linear', fill: 'backwards'});
}

function swap(html) {
  const root = intro();
  root.innerHTML = `<div class="intro-step">${html}</div>`;
  [...root.querySelector('.intro-step').children].forEach((el, i) => springIn(el, {delay: i * 70}));
  return root.querySelector('.intro-step');
}

// The overlay lifts away and the app settles in underneath.
async function dismiss() {
  const root = intro(), app = document.getElementById('app'), tabbar = document.querySelector('.tabbar');
  if (!root || root.dataset.leaving) return;
  root.dataset.leaving = '1';
  if (!reduceMotion()) {
    const img = root.querySelector('.intro-logo');
    img?.animate([{transform: 'scale(1)', opacity: 1}, {transform: 'scale(1.35)', opacity: 0}], {duration: 420, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards'});
    [app, tabbar].forEach(el => el.animate(curve.map((v, i) => ({opacity: Math.min(1, i / 14), transform: `${el === tabbar ? 'translateX(-50%) ' : ''}scale(${0.94 + 0.06 * v})`, offset: i / 60})), {duration: 760, delay: 120, easing: 'linear', fill: 'backwards'}));
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
  swap(`${logo}<h1 class="intro-greeting"></h1><p></p>`);
  root.querySelector('.intro-greeting').textContent = line;
  root.querySelector('p').textContent = subline();
  root.setAttribute('aria-label', line);
  const timer = setTimeout(dismiss, reduceMotion() ? 1100 : 1900);
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
