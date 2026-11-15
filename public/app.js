// Quasar: compare plans, lock one in, then track what's left each month.
import {ctx, $, esc, money, toast, modal} from './context.js?v=44';
import {icon} from './icons.js?v=44';
import './fields.js?v=44';
import {load, flush, backupBlob, readBackup, eraseAll} from './store.js?v=44';
import {samples, reduceMotion, holdToConfirm} from './motion.js?v=44';
import {attachSwipe} from './swipe.js?v=44';
import {blank, calculate, uid} from './finance.js?v=44';
import {closePanel, panelOpen} from './expand.js?v=44';
import {renderToday, setupToday} from './today.js?v=44';
import {renderLedger, setupLedger} from './ledger-view.js?v=44';
import {renderPlans, setupPlans} from './plans-view.js?v=44';
import {runIntro} from './intro.js?v=44';

const VIEWS = {today: renderToday, ledger: renderLedger, plans: renderPlans};
const curve = samples(300, 28);

ctx.refresh = () => VIEWS[ctx.tab]();

function movePillTo(button, animate = true) {
  const pill = document.querySelector('.tab-pill'), x = button.offsetLeft, w = button.offsetWidth;
  const from = Number(pill.dataset.x ?? x), fromW = Number(pill.dataset.w ?? w);
  pill.style.width = w + 'px';
  pill.style.transform = `translateX(${x}px)`;
  pill.dataset.x = x; pill.dataset.w = w;
  if (animate && !reduceMotion() && from !== x) pill.animate(curve.map((v, i) => ({transform: `translateX(${from + (x - from) * v}px) scaleX(${1 + .12 * Math.sin(Math.PI * Math.min(1, v))})`, width: `${fromW + (w - fromW) * v}px`, offset: i / 60})), {duration: 520, easing: 'linear'});
}

function goTo(tab, {animate = true} = {}) {
  if (panelOpen()) closePanel();
  const changed = tab !== ctx.tab;
  ctx.tab = tab;
  for (const name of Object.keys(VIEWS)) $(`view-${name}`).hidden = name !== tab;
  document.querySelectorAll('.tabbar [data-tab]').forEach(b => {
    const on = b.dataset.tab === tab;
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    if (on) movePillTo(b, animate);
  });
  VIEWS[tab]();
  if (changed && animate) {
    const view = $(`view-${tab}`);
    view.classList.remove('is-entering'); void view.offsetWidth; view.classList.add('is-entering');
    scrollTo({top: 0, behavior: 'instant'});
  }
}

// Plans list, backup and restore.
const swipeControls = new WeakMap();
function showPlans() {
  const s = ctx.state;
  modal('Plans', `<button type="button" class="button primary" data-new-plan>${icon('plus')} New plan</button>
    <div class="plan-list" style="margin-top:14px">${s.plans.map(p => `<div class="plan-item"><div class="swipe-row" data-plan="${p.id}"><button type="button" class="swipe-delete" aria-label="Delete ${esc(p.name)}">${icon('trash')}<span>Delete</span></button><div class="swipe-front"><button type="button" class="load-plan" data-load="${p.id}"><span class="plan-title">${esc(p.name)}${p.id === s.currentPlanId ? icon('check') : ''}</span><small>${p.incomeMode === 'takehome' ? `${money(p.takeHome)} take-home / mo` : `${money(p.salary)} / yr`} · ${money(calculate(p).left)} left / mo${s.budget?.planId === p.id ? ' · Your budget' : ''}</small></button><button type="button" class="swipe-options" aria-label="Options for ${esc(p.name)}" aria-expanded="false" aria-controls="actions-${p.id}">${icon('more')}</button></div></div><div class="plan-actions" id="actions-${p.id}" hidden><button type="button" data-duplicate="${p.id}">${icon('plans')} Duplicate</button><button type="button" data-export-plan="${p.id}">${icon('download')} PDF</button><button type="button" class="danger" data-delete-plan="${p.id}">${icon('trash')} Delete</button></div></div>`).join('')}</div>
    <div class="modal-section"><h3>Your name</h3><p class="fine">Used for your welcome when you open Quasar.</p><label class="text-field"><input id="nameField" type="text" maxlength="40" autocomplete="given-name" enterkeyhint="done" value="${esc(s.prefs.name)}" aria-label="Your name"></label></div>
    <div class="modal-section"><h3>Backup</h3><p class="fine">Everything lives only on this device. Export a backup now and then, or to move to the installed app or a new phone.</p><div class="button-row"><button type="button" class="button quiet" data-export-backup>${icon('download')} Export</button><button type="button" class="button quiet" data-import-backup>${icon('upload')} Import</button></div></div>
    <div class="modal-section"><h3>Start over</h3><p class="fine">Erase every plan, month and purchase on this device and begin again from the welcome screen.</p><button type="button" class="button danger" data-erase>${icon('trash')} Erase all data</button></div>`);
  $('nameField').addEventListener('change', e => { const name = e.target.value.trim().slice(0, 40); if (!name) { e.target.value = s.prefs.name; return; } s.prefs.name = name; e.target.value = name; ctx.commit({render: false}); toast('Name saved'); });
  $('modalBody').querySelectorAll('.swipe-row').forEach(row => {
    const button = row.querySelector('.swipe-options'), panel = row.nextElementSibling;
    swipeControls.set(row, attachSwipe(row, deletePlan, () => {
      const opening = panel.hidden;
      $('modalBody').querySelectorAll('.plan-actions').forEach(el => el.hidden = true);
      $('modalBody').querySelectorAll('.swipe-options').forEach(el => el.setAttribute('aria-expanded', 'false'));
      panel.hidden = !opening;
      button.setAttribute('aria-expanded', String(opening));
    }));
  });
}

function deletePlan(id) {
  const s = ctx.state, index = s.plans.findIndex(p => p.id === id);
  if (index < 0) return;
  const [deleted] = s.plans.splice(index, 1), wasCurrent = s.currentPlanId === id;
  if (!s.plans.length) s.plans.push(blank());
  if (wasCurrent) s.currentPlanId = s.plans[0].id;
  ctx.commit();
  if ($('modal').open) showPlans();
  toast('Plan deleted', () => { s.plans.splice(Math.min(index, s.plans.length), 0, deleted); if (wasCurrent) s.currentPlanId = deleted.id; ctx.commit(); if ($('modal').open) showPlans(); });
}

let pendingImport = null;
$('modalBody').addEventListener('click', async e => {
  const b = e.target.closest('button');
  if (!b) return;
  const s = ctx.state;
  if (b.dataset.newPlan !== undefined) {
    const plan = blank(); plan.name = `Plan ${s.plans.length + 1}`;
    s.plans.push(plan); s.currentPlanId = plan.id; ctx.commit();
    $('modal').close(); goTo('plans');
    $('planName').focus(); $('planName').select();
    toast('Plan created');
  } else if (b.dataset.load) {
    s.currentPlanId = b.dataset.load; ctx.commit(); $('modal').close(); goTo('plans');
  } else if (b.dataset.duplicate) {
    const source = s.plans.find(p => p.id === b.dataset.duplicate), copy = structuredClone(source);
    Object.assign(copy, {id: uid(), name: `${source.name} copy`.slice(0, 80), expenses: copy.expenses.map(x => ({...x, id: uid()})), goals: copy.goals.map(x => ({...x, id: uid()}))});
    s.plans.splice(s.plans.indexOf(source) + 1, 0, copy); s.currentPlanId = copy.id; ctx.commit();
    $('modal').close(); goTo('plans'); toast('Plan duplicated');
  } else if (b.dataset.deletePlan) {
    const row = document.querySelector(`[data-plan="${b.dataset.deletePlan}"]`);
    row.nextElementSibling.hidden = true;
    swipeControls.get(row)?.remove();
  } else if (b.dataset.exportPlan) {
    const plan = s.plans.find(p => p.id === b.dataset.exportPlan);
    b.disabled = true;
    try { const {downloadPlanPdf} = await import('./plan-pdf.js?v=44'); await downloadPlanPdf(structuredClone(plan)); }
    catch { toast('Could not create the PDF. Try again.'); }
    finally { b.disabled = false; }
  } else if (b.dataset.exportBackup !== undefined) {
    await flush();
    const url = URL.createObjectURL(backupBlob(s)), a = document.createElement('a');
    a.href = url; a.download = `quasar-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Backup exported');
  } else if (b.dataset.importBackup !== undefined) {
    $('importFile').click();
  } else if (b.dataset.confirmImport !== undefined && pendingImport) {
    ctx.state = pendingImport; pendingImport = null;
    ctx.commit({render: false}); await flush();
    $('modal').close(); goTo(ctx.state.budget ? 'today' : 'plans'); toast('Backup restored');
  } else if (b.dataset.cancelImport !== undefined || b.dataset.cancelErase !== undefined) {
    pendingImport = null; showPlans();
  } else if (b.dataset.erase !== undefined) {
    showErase();
  }
});

// Erasing is a separate confirmation screen with a press-and-hold, so it can't
// happen from a stray tap. It offers a backup first.
function showErase() {
  const s = ctx.state, entries = s.months.reduce((n, m) => n + m.entries.length, 0);
  const counts = [`${s.plans.length} plan${s.plans.length === 1 ? '' : 's'}`, s.months.length ? `${s.months.length} month${s.months.length === 1 ? '' : 's'} of tracking` : '', entries ? `${entries} logged purchase${entries === 1 ? '' : 's'}` : ''].filter(Boolean);
  modal('Erase all data?', `<p class="lede">This permanently deletes ${counts.join(', ')}${s.budget ? ', your locked-in budget' : ''}${s.prefs.name ? ' and your name' : ''} from this device. It can't be undone.</p>
    <p class="fine">Want a copy first? Export a backup, and you can import it later.</p>
    <div style="display:grid;gap:10px;margin-top:18px">
      <button type="button" class="button quiet" data-export-backup>${icon('download')} Export backup first</button>
      <button type="button" class="button danger hold-button" id="holdErase"><span>Hold to erase everything</span></button>
      <button type="button" class="button quiet" data-cancel-erase>Cancel</button>
    </div>`);
  holdToConfirm($('holdErase'), async () => {
    $('holdErase').querySelector('span:not(.hold-fill)').textContent = 'Erasing…';
    await eraseAll();
    location.reload();
  });
}

$('importFile').addEventListener('change', async e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    pendingImport = await readBackup(file);
    const entries = pendingImport.months.reduce((n, m) => n + m.entries.length, 0);
    modal('Restore backup?', `<p class="lede">This replaces everything on this device with the backup: ${pendingImport.plans.length} plan${pendingImport.plans.length === 1 ? '' : 's'}, ${pendingImport.months.length} month${pendingImport.months.length === 1 ? '' : 's'} and ${entries} ledger entr${entries === 1 ? 'y' : 'ies'}.</p><p class="fine">Export a backup of the current data first if you might want it back.</p><div class="button-row" style="margin-top:18px"><button type="button" class="button quiet" data-cancel-import>Cancel</button><button type="button" class="button danger" data-confirm-import>Replace</button></div>`);
  } catch (err) { toast(err.message); }
});

$('closeModal').onclick = () => $('modal').close();
$('modal').addEventListener('click', e => { if (e.target === $('modal')) $('modal').close(); });
$('menuButton').addEventListener('click', showPlans);
document.querySelectorAll('.tabbar [data-tab]').forEach(b => b.addEventListener('click', () => goTo(b.dataset.tab)));
addEventListener('resize', () => { const active = document.querySelector('.tabbar [aria-current=page]'); if (active) movePillTo(active, false); });
// Day changes (the app left open overnight) refresh the per-day numbers.
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !panelOpen()) ctx.refresh(); });

document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));
setupToday(goTo);
setupLedger(goTo);
setupPlans(goTo, showPlans);

const {state, warning} = await load();
ctx.state = state;
if (warning) {
  $('saveStatus').textContent = 'Storage limited';
  $('saveStatus').classList.add('is-warning');
  toast('This browser limits storage. Export a backup from the menu.');
}
goTo(state.budget ? 'today' : 'plans', {animate: false});
runIntro(goTo);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
