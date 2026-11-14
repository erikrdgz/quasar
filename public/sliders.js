let lensId = 0;

// Project the six-pixel rail through a shallow capsule lens. Using the projected
// geometry directly keeps the optical distortion identical in WebKit and Chromium.
function refractedRail() {
  const top = [], bottom = [];
  for (let x = 0; x <= 56; x++) {
    const surface = Math.max(0, 1 - ((x - 28) / 28) ** 2);
    const halfHeight = 3 - 1.65 * surface ** 1.4;
    top.push(`${x},${18 - halfHeight}`);
    bottom.unshift(`${x},${18 + halfHeight}`);
  }
  return `M${top.join(' L')} L${bottom.join(' L')} Z`;
}
const railShape = refractedRail();

export function syncRange(input) {
  if (!input) return;
  let wrapper = input.parentElement;
  if (!wrapper.classList.contains('range-control')) {
    wrapper = document.createElement('div');
    wrapper.className = 'range-control';
    input.before(wrapper);
    wrapper.append(input);
    wrapper.insertAdjacentHTML('beforeend', '<span class="range-track" aria-hidden="true"></span><span class="range-thumb" aria-hidden="true"></span>');
    const fid = 'lens-' + (++lensId);
    wrapper.querySelector('.range-thumb').innerHTML = `<svg class="lens-optics" viewBox="0 0 56 36" aria-hidden="true"><defs><clipPath id="${fid}-rail"><path d="${railShape}"/></clipPath><linearGradient id="${fid}-blue" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#b1e6ff"/><stop offset=".24" stop-color="#71c3ff"/><stop offset=".65" stop-color="#388dff"/><stop offset="1" stop-color="#135eea"/></linearGradient><linearGradient id="${fid}-dark" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#617996"/><stop offset=".35" stop-color="#3b4d68"/><stop offset="1" stop-color="#253349"/></linearGradient><linearGradient id="${fid}-rim" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".9"/><stop offset=".35" stop-color="#bce3ff" stop-opacity=".15"/><stop offset=".7" stop-color="#bce3ff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity=".7"/></linearGradient></defs><g clip-path="url(#${fid}-rail)"><rect class="lens-filled" x="0" y="0" width="28" height="36" fill="url(#${fid}-blue)"/><rect class="lens-unfilled" x="28" y="0" width="28" height="36" fill="url(#${fid}-dark)"/></g><rect x=".8" y=".8" width="54.4" height="34.4" rx="17.2" fill="none" stroke="url(#${fid}-rim)" stroke-width="1.3"/></svg>`;
    input.addEventListener('pointerdown', () => wrapper.classList.add('is-dragging'));
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture', 'blur']) input.addEventListener(name, () => wrapper.classList.remove('is-dragging'));
    input.addEventListener('input', () => syncRange(input));
  }
  const min = Number(input.min) || 0, max = Number(input.max) || 0, value = Number(input.value) || 0;
  const progress = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  wrapper.style.setProperty('--progress', progress);
  const trackWidth = Math.max(0, wrapper.clientWidth - 44);
  // Horizontal compression follows the same subtle inward pinch at either stop.
  const left = Math.min(28, progress * trackWidth * .85);
  wrapper.querySelector('.lens-filled').setAttribute('x', 28 - left);
  wrapper.querySelector('.lens-filled').setAttribute('width', left);
  wrapper.querySelector('.lens-unfilled').setAttribute('width', Math.min(28, (1 - progress) * trackWidth * .85));
  input.setAttribute('aria-valuetext', new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value));
  wrapper.classList.toggle('is-zero', max <= min);
}
for (const name of ['pointerup', 'pointercancel']) document.addEventListener(name, () => document.querySelectorAll('.is-dragging').forEach(el => el.classList.remove('is-dragging')));
