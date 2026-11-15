// Add / edit purchase sheet: amount → optional name → category → Add.
import {ctx, $, esc, money, cash, toast} from './context.js?v=40';
import {icon} from './icons.js?v=40';
import {openPanel} from './expand.js?v=40';
import {CATEGORIES, category, makeEntry, openMonthOf, totals} from './ledger.js?v=40';
import {persist} from './store.js?v=40';

const parseAmount = text => { const n = Number(String(text).replace(/[$,\s]/g, '')); return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN; };

export function bumpHero() {
  const hero = document.querySelector('[data-tile="hero"]');
  if (!hero) return;
  hero.classList.remove('is-bumped');
  void hero.offsetWidth;
  hero.classList.add('is-bumped');
}

// Redraw once the card is home, so the hero visibly counts down.
function afterClose(closing, fn) { closing.then(() => { ctx.refresh(); bumpHero(); fn?.(); }); }

export function openPurchase(origin, entryId = null) {
  const month = openMonthOf(ctx.state);
  if (!month) return;
  const existing = entryId ? month.entries.find(e => e.id === entryId) : null;
  if (entryId && !existing) return;
  let chosen = existing?.category && existing.kind === 'purchase' ? existing.category : 'misc';
  const isAdjustment = existing?.kind === 'adjustment';

  openPanel(origin, {
    tone: existing ? '' : 'accent',
    title: existing ? (isAdjustment ? 'Unlogged spending' : 'Edit purchase') : 'Add purchase',
    build(body, api) {
      body.innerHTML = `
        <label class="amount-field"><span>$</span><input id="pAmount" type="text" inputmode="decimal" autocomplete="off" placeholder="0" aria-label="Amount" value="${existing ? existing.amount : ''}"></label>
        <label class="text-field"><span>Name <em style="font-style:normal;color:var(--dim)">optional</em></span><input id="pName" type="text" maxlength="80" autocomplete="off" enterkeyhint="done" placeholder="Coffee, gas, Target…" value="${esc(existing?.name || '')}"></label>
        ${isAdjustment ? '' : `<div><p class="group-title">Category</p><div class="chips" id="pChips">${CATEGORIES.map(c => `<button type="button" class="chip" data-cat="${c.id}" style="--cat:${c.color}" aria-pressed="${c.id === chosen}">${icon(c.id)}${c.label}</button>`).join('')}</div></div>`}
        <div class="preview" id="pPreview"><span>Left after this</span><b></b></div>
        <button type="button" class="button primary" id="pSave">${existing ? 'Save' : 'Add purchase'}</button>
        ${existing ? `<button type="button" class="button danger" id="pDelete">${icon('trash')} Delete</button>` : ''}`;
      const amount = body.querySelector('#pAmount'), name = body.querySelector('#pName'), save = body.querySelector('#pSave');
      function preview() {
        const value = parseAmount(amount.value || 0), base = totals(month).left + (existing ? existing.amount : 0);
        const after = base - (Number.isFinite(value) ? value : 0);
        const el = body.querySelector('#pPreview');
        el.querySelector('b').textContent = money(after);
        el.classList.toggle('is-over', after < 0);
        save.disabled = !(value > 0);
      }
      amount.addEventListener('input', () => {
        // Keep digits and one decimal point with at most two places.
        const clean = amount.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').replace(/^(\d*\.\d{0,2}).*$/, '$1').slice(0, 10);
        if (clean !== amount.value) amount.value = clean;
        preview();
      });
      body.querySelector('#pChips')?.addEventListener('click', e => {
        const chip = e.target.closest('[data-cat]');
        if (!chip) return;
        chosen = chip.dataset.cat;
        body.querySelectorAll('[data-cat]').forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
      });
      amount.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); name.focus(); } });
      save.addEventListener('click', () => submit(api));
      body.querySelector('#pDelete')?.addEventListener('click', () => remove(api));
      preview();
    },
    initialFocus: body => body.querySelector('#pAmount'),
  });

  function submit(api) {
    const amount = parseAmount($('pAmount').value), name = $('pName').value;
    let entry;
    try { entry = makeEntry({amount, name, category: chosen, kind: existing?.kind || 'purchase', at: existing?.at || new Date()}); }
    catch (err) { toast(err.message); return; }
    if (existing) {
      const before = {...existing};
      Object.assign(existing, {amount: entry.amount, name: entry.name, category: entry.category});
      ctx.commit({render: false});
      afterClose(api.close(), () => toast('Purchase updated', () => { Object.assign(existing, before); ctx.commit(); }));
      return;
    }
    month.entries.push(entry);
    ctx.commit({render: false});
    persist();
    const closing = api.close();
    const label = entry.name || category(entry.category).label;
    afterClose(closing, () => toast(`${cash(entry.amount)} · ${label}`, () => {
      month.entries = month.entries.filter(e => e.id !== entry.id);
      ctx.commit();
      bumpHero();
    }));
  }

  function remove(api) {
    const index = month.entries.indexOf(existing);
    month.entries.splice(index, 1);
    ctx.commit({render: false});
    afterClose(api.close(), () => toast('Purchase deleted', () => { month.entries.splice(Math.min(index, month.entries.length), 0, existing); ctx.commit(); bumpHero(); }));
  }
}

export function deleteEntry(id) {
  const month = openMonthOf(ctx.state);
  const index = month?.entries.findIndex(e => e.id === id) ?? -1;
  if (index < 0) return;
  const [removed] = month.entries.splice(index, 1);
  ctx.commit();
  toast('Purchase deleted', () => { month.entries.splice(Math.min(index, month.entries.length), 0, removed); ctx.commit(); });
}
