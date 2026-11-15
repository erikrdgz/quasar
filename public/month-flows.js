// Reality check, Close Month (press-and-hold) and closed-month history panels.
import {ctx, esc, money, cash, toast} from './context.js?v=37';
import {icon} from './icons.js?v=37';
import {openPanel} from './expand.js?v=37';
import {holdToConfirm, movePill} from './motion.js?v=37';
import {category, closeMonth, canReopen, reopenLast, closedMonths, daysLeft, followingKey, makeEntry, monthKey, monthName, openMonthOf, realityGap, totals} from './ledger.js?v=37';

const parse = text => { const n = Number(String(text).replace(/[$,\s]/g, '')); return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN; };

export function entryRow(e, {button = false} = {}) {
  const cat = category(e.category), date = new Date(e.at);
  const when = date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
  const title = esc(e.name || cat.label);
  const inner = `<span class="entry-icon" style="--cat:${cat.color}">${icon(cat.id)}</span><span class="entry-text"><b>${title}</b><small>${e.name ? cat.label + ' · ' : ''}${when}</small></span><span class="entry-amount">−${cash(e.amount)}</span>`;
  const cls = `entry${e.kind === 'adjustment' ? ' is-adjustment' : ''}`;
  return button ? `<button type="button" class="${cls}" data-tile="entry-${e.id}" data-edit="${e.id}">${inner}</button>` : `<div class="${cls}">${inner}</div>`;
}

export function openRealityCheck(origin) {
  const month = openMonthOf(ctx.state);
  if (!month) return;
  openPanel(origin, {
    title: 'Reality check',
    build(body, api) {
      const logged = totals(month).used;
      body.innerHTML = `
        <p class="lede">Open your banking app and add up what you spent on purchases in ${monthName(month.key)}: cards and debit. Leave out rent, bills, car and savings transfers.</p>
        <div><p class="group-title">Your bank says you spent</p><label class="amount-field small"><span>$</span><input id="bankSpent" type="text" inputmode="decimal" autocomplete="off" placeholder="0" value="${month.check ? month.check.bank : ''}" aria-label="Spent according to your bank"></label></div>
        <div class="group rows"><div><span>Logged in Quasar</span><b>${cash(logged)}</b></div><div><span>Your bank</span><b id="bankEcho">—</b></div><div class="total"><span>Difference</span><b id="gapValue">—</b></div></div>
        <p class="lede" id="gapNote"></p>
        <div id="gapActions" style="display:grid;gap:10px"></div>`;
      const input = body.querySelector('#bankSpent');
      function update() {
        input.value = input.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 10);
        const bank = parse(input.value), ok = input.value !== '' && Number.isFinite(bank);
        const gap = ok ? realityGap(month, bank) : 0;
        body.querySelector('#bankEcho').textContent = ok ? cash(bank) : '—';
        body.querySelector('#gapValue').textContent = ok ? (gap === 0 ? 'None' : cash(Math.abs(gap))) : '—';
        const note = body.querySelector('#gapNote'), actions = body.querySelector('#gapActions');
        if (!ok) { note.textContent = ''; actions.innerHTML = ''; return; }
        if (gap > 0) {
          note.textContent = `${cash(gap)} isn't in your ledger yet. Scroll your bank for purchases you didn't log, add them, or record the rest as unlogged spending so your number matches reality.`;
          actions.innerHTML = `<button type="button" class="button primary" data-act="adjust">Record ${cash(gap)} as unlogged</button><button type="button" class="button quiet" data-act="later">I'll find them</button>`;
        } else if (gap < 0) {
          note.textContent = `You've logged ${cash(-gap)} more than your bank shows. Look for duplicates, or charges still pending at the bank.`;
          actions.innerHTML = `<button type="button" class="button quiet" data-act="later">Done</button>`;
        } else {
          note.textContent = 'Everything matches. Nice.';
          actions.innerHTML = `<button type="button" class="button quiet" data-act="later">Done</button>`;
        }
      }
      input.addEventListener('input', update);
      body.querySelector('#gapActions').addEventListener('click', e => {
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (!act) return;
        const bank = parse(input.value);
        month.check = {bank, at: new Date().toISOString()};
        if (act === 'adjust') {
          const entry = makeEntry({amount: realityGap(month, bank), kind: 'adjustment', name: 'Reality check'});
          month.entries.push(entry);
          ctx.commit({render: false});
          api.close().then(() => { ctx.refresh(); toast(`Recorded ${cash(entry.amount)} unlogged`, () => { month.entries = month.entries.filter(x => x !== entry); ctx.commit(); }); });
        } else { ctx.commit({render: false}); api.close().then(() => ctx.refresh()); }
      });
      update();
    },
    initialFocus: body => body.querySelector('#bankSpent'),
  });
}

export function openCloseMonth(origin) {
  const month = openMonthOf(ctx.state);
  if (!month) return;
  const t = totals(month), name = monthName(month.key), now = new Date();
  const early = monthKey(now) <= month.key, remaining = daysLeft(month, now);
  const nextName = monthName(followingKey(month.key, now));
  let carry = false;
  openPanel(origin, {
    tone: early ? '' : 'notice',
    title: `Close ${name}`,
    build(body, api) {
      body.innerHTML = `
        ${early ? `<div class="group" style="border-color:#ffb54766"><p class="lede"><b style="color:var(--warn)">${name} isn't over.</b> ${remaining} day${remaining === 1 ? '' : 's'} left. If you close now, purchases you add go to ${nextName}.</p></div>` : `<p class="lede">${name} has ended. Review it, choose what happens to what's left, then hold to close. Closed months stay in your history.</p>`}
        <div class="group rows">
          <div><span>Available</span><b>${cash(t.available)}</b></div>
          <div class="minus"><span>Purchases</span><b>−${cash(t.spent)}</b></div>
          ${t.adjusted ? `<div class="minus"><span>Unlogged spending</span><b>−${cash(t.adjusted)}</b></div>` : ''}
          <div class="total"><span>${t.left < 0 ? 'Over by' : 'Left'}</span><b style="color:${t.left < 0 ? 'var(--bad)' : 'var(--good)'}">${cash(Math.abs(t.left))}</b></div>
        </div>
        ${month.check ? '' : `<p class="fine">You haven't run a reality check this month. It's worth doing before closing so the numbers match your bank.</p>`}
        <div><p class="group-title">What happens to ${t.left < 0 ? 'the overspend' : "what's left"}</p>
          <div class="segmented" id="carryChoice"><span class="pace-lens" aria-hidden="true"></span><button type="button" class="selected" aria-pressed="true" data-carry="0">Start fresh</button><button type="button" aria-pressed="false" data-carry="1">${t.left < 0 ? 'Carry −' : 'Carry +'}${money(Math.abs(t.left))}</button></div>
          <p class="fine" id="carryNote" style="margin-top:10px"></p></div>
        <button type="button" class="button quiet hold-button" id="holdClose"><span>Hold to close ${name}</span></button>`;
      const seg = body.querySelector('#carryChoice');
      function note() {
        body.querySelector('#carryNote').textContent = carry
          ? (t.left < 0 ? `${nextName} starts ${money(-t.left)} lower to make up for it.` : `${nextName} starts with an extra ${money(t.left)}.`)
          : `${nextName} starts with your normal ${money(ctx.state.budget.spendable)}.`;
      }
      seg.addEventListener('click', e => {
        const b = e.target.closest('[data-carry]');
        if (!b) return;
        carry = b.dataset.carry === '1';
        seg.querySelectorAll('button').forEach(x => { x.classList.toggle('selected', x === b); x.setAttribute('aria-pressed', String(x === b)); });
        movePill(seg);
        note();
      });
      requestAnimationFrame(() => movePill(seg));
      note();
      holdToConfirm(body.querySelector('#holdClose'), () => {
        closeMonth(ctx.state, {carry}, new Date());
        ctx.commit({render: false});
        setTimeout(() => api.close().then(() => {
          ctx.refresh();
          toast(`${name} closed`, () => { try { reopenLast(ctx.state); ctx.commit(); toast(`${name} reopened`); } catch (err) { toast(err.message); } });
        }), 260);
      });
    },
  });
}

export function openHistoryMonth(origin, key) {
  const month = ctx.state.months.find(m => m.key === key);
  if (!month) return;
  const t = totals(month), latest = closedMonths(ctx.state)[0] === month;
  const entries = [...month.entries].sort((a, b) => b.at.localeCompare(a.at));
  openPanel(origin, {
    title: monthName(month.key, true),
    build(body, api) {
      body.innerHTML = `
        <div class="group rows">
          <div><span>Available</span><b>${cash(t.available)}</b></div>
          <div class="minus"><span>Spent</span><b>−${cash(t.used)}</b></div>
          <div class="total"><span>${t.left < 0 ? 'Over by' : 'Left'}</span><b>${cash(Math.abs(t.left))}</b></div>
          ${month.carriedOut ? `<div><span>Carried into next month</span><b>${cash(month.carriedOut)}</b></div>` : ''}
        </div>
        <div class="entry-list">${entries.length ? entries.map(e => entryRow(e)).join('') : '<p class="empty-note">No purchases this month.</p>'}</div>
        ${latest ? (canReopen(ctx.state) ? `<button type="button" class="button quiet" id="reopen">Reopen ${monthName(month.key)}</button>` : `<p class="fine">This month can't be reopened because the current month already has activity.</p>`) : ''}`;
      body.querySelector('#reopen')?.addEventListener('click', () => {
        reopenLast(ctx.state);
        ctx.commit({render: false});
        api.close().then(() => { ctx.refresh(); toast(`${monthName(month.key)} reopened`); });
      });
    },
  });
}
