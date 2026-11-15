// Damped springs: immediate response, a restrained overshoot, then settlement.
// Numeric springs preserve velocity when a slider changes its target mid-flight.
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const states=new WeakMap();
export function springValue(el,target,format){let s=states.get(el);if(!s){s={x:target,v:0,target,frame:0};states.set(el,s);el.textContent=format(target);return;}s.target=target;if(reduce.matches){cancelAnimationFrame(s.frame);s.frame=0;s.x=target;s.v=0;el.textContent=format(target);return;}if(s.frame)return;let last=performance.now();function tick(now){const dt=Math.min((now-last)/1000,.032);last=now;const steps=4;for(let i=0;i<steps;i++){s.v+=(230*(s.target-s.x)-30*s.v)*dt/steps;s.x+=s.v*dt/steps;}el.textContent=format(s.x);if(Math.abs(s.target-s.x)<.1&&Math.abs(s.v)<.5){s.x=s.target;s.v=0;s.frame=0;el.textContent=format(s.target);return;}s.frame=requestAnimationFrame(tick);}s.frame=requestAnimationFrame(tick);}
export function samples(stiffness=280,damping=24){let x=0,v=0;const values=[];for(let i=0;i<=60;i++){values.push(x);for(let j=0;j<4;j++){v+=(stiffness*(1-x)-damping*v)/240;x+=v/240;}}values[60]=1;return values;}
const curve=samples();
export const reduceMotion=()=>reduce.matches;
export function springIn(el){if(reduce.matches)return;el.animate(curve.map((v,i)=>({transform:`translateY(${(1-v)*20}px) scale(${.96+.04*v})`,opacity:Math.min(1,i/8),offset:i/60})),{duration:620,easing:'linear'});}
export function movePill(group){const pill=group?.querySelector('.pace-lens'),active=group?.querySelector('.selected');if(!pill||!active)return;const x=active.offsetLeft,w=active.offsetWidth;const previous=Number(pill.dataset.x??x);pill.style.width=w+'px';pill.style.transform=`translateX(${x}px)`;pill.dataset.x=x;if(!reduce.matches&&previous!==x)pill.animate(curve.map((v,i)=>({transform:`translateX(${previous+(x-previous)*v}px) scaleX(${1+.1*Math.sin(Math.PI*v)})`,offset:i/60})),{duration:560,easing:'linear'});}
window.addEventListener('resize',()=>document.querySelectorAll('.segmented').forEach(movePill));
document.addEventListener('pointerdown',e=>{const b=e.target.closest('button');if(!b||b.closest('.swipe-row')||b.classList.contains('tile')||b.classList.contains('hold-button'))return;if(b&&!reduce.matches)b.animate([{transform:'scale(1)'},{transform:'scale(.985)'}],{duration:100,fill:'forwards'});});
for(const event of ['pointerup','pointercancel'])document.addEventListener(event,()=>{document.querySelectorAll('button').forEach(b=>{if(b.closest('.swipe-row')||b.classList.contains('tile')||b.classList.contains('hold-button'))return;if(b.getAnimations().length){b.getAnimations().forEach(a=>a.cancel());if(!reduce.matches)b.animate(curve.map((v,i)=>({transform:`scale(${.985+.015*v})`,offset:i/60})),{duration:320});}});});

// Press-and-hold confirmation for actions that should never happen by accident.
// The fill only commits when held for the full duration; releasing early rewinds it.
export function holdToConfirm(button,onConfirm,duration=1500){
 const fill=document.createElement('span');fill.className='hold-fill';fill.setAttribute('aria-hidden','true');button.prepend(fill);
 let animation=null,done=false;
 function start(e){if(done||animation||button.disabled)return;if(e.type==='keydown'){if(e.repeat||(e.key!==' '&&e.key!=='Enter'))return;e.preventDefault();}
  button.classList.add('is-holding');animation=fill.animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration,easing:'cubic-bezier(.3,0,.4,1)',fill:'forwards'});
  animation.onfinish=()=>{done=true;animation=null;button.classList.remove('is-holding');button.classList.add('is-confirmed');navigator.vibrate?.(18);onConfirm();};}
 function cancel(){if(!animation)return;const a=animation;animation=null;button.classList.remove('is-holding');const progress=a.effect.getComputedTiming().progress||0;a.cancel();if(progress>0&&!reduce.matches)fill.animate([{transform:`scaleX(${progress})`},{transform:'scaleX(0)'}],{duration:260,easing:'cubic-bezier(.2,.8,.2,1)'});}
 button.addEventListener('pointerdown',e=>{if(e.button!==0)return;try{button.setPointerCapture(e.pointerId);}catch{}start(e);});
 for(const name of ['pointerup','pointercancel','lostpointercapture','blur'])button.addEventListener(name,cancel);
 button.addEventListener('keydown',start);button.addEventListener('keyup',cancel);
 button.addEventListener('click',e=>e.preventDefault());
 button.addEventListener('contextmenu',e=>e.preventDefault());
 return {reset(){done=false;button.classList.remove('is-confirmed');}};
}

// Like springValue, but the spring lives under a key instead of an element, so a
// number keeps animating when its tile is re-rendered mid-flight.
const keyed=new Map();
export function springText(key,el,target,format){let s=keyed.get(key);if(!s||reduce.matches){if(s)cancelAnimationFrame(s.frame);keyed.set(key,{x:target,v:0,target,frame:0,el,format});el.textContent=format(target);return;}s.el=el;s.format=format;s.target=target;el.textContent=format(s.frame?s.x:s.x);if(s.frame||s.x===target){if(!s.frame)el.textContent=format(target);return;}let last=performance.now();function tick(now){const dt=Math.min((now-last)/1000,.032);last=now;for(let i=0;i<4;i++){s.v+=(170*(s.target-s.x)-26*s.v)*dt/4;s.x+=s.v*dt/4;}s.el.textContent=s.format(s.x);if(Math.abs(s.target-s.x)<.05&&Math.abs(s.v)<.5){s.x=s.target;s.v=0;s.frame=0;s.el.textContent=s.format(s.target);return;}s.frame=requestAnimationFrame(tick);}s.frame=requestAnimationFrame(tick);}

// Slide-to-confirm, after the iPhone's "slide to unlock". Drag the knob to the end
// to commit; releasing early springs it home. Arrow keys step it for keyboard use,
// and reaching the end by keyboard also commits.
export function slideToConfirm(track,onConfirm,{label='slide to confirm',done='Done',icon='',doneIcon=''}={}){
 track.classList.add('slide-confirm');track.setAttribute('role','slider');track.tabIndex=0;
 track.setAttribute('aria-label',label);track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');track.setAttribute('aria-valuenow','0');
 track.innerHTML=`<span class="slide-fill" aria-hidden="true"></span><span class="slide-text" aria-hidden="true">${label}</span><span class="slide-knob" aria-hidden="true">${icon}</span>`;
 const knob=track.querySelector('.slide-knob'),fill=track.querySelector('.slide-fill'),text=track.querySelector('.slide-text');
 let x=0,max=0,drag=null,frame=0,done_=false,lastX=0,lastT=0,velocity=0;
 const measure=()=>{max=Math.max(0,track.clientWidth-knob.offsetWidth-8);};
 function paint(){const p=max?x/max:0;knob.style.transform=`translateX(${x}px)`;fill.style.width=`${x+knob.offsetWidth+8}px`;text.style.opacity=String(Math.max(0,1-p*1.8));track.setAttribute('aria-valuenow',String(Math.round(p*100)));}
 function springTo(target,then){cancelAnimationFrame(frame);if(reduce.matches){x=target;paint();then?.();return;}let v=velocity,last=performance.now();function tick(now){const dt=Math.min((now-last)/1000,.032);last=now;for(let i=0;i<4;i++){v+=(420*(target-x)-34*v)*dt/4;x+=v*dt/4;}x=Math.min(max,x);paint();if(Math.abs(target-x)<.3&&Math.abs(v)<4){x=target;paint();frame=0;then?.();}else frame=requestAnimationFrame(tick);}frame=requestAnimationFrame(tick);}
 function commit(){if(done_)return;done_=true;track.classList.add('is-done');track.setAttribute('aria-valuenow','100');knob.innerHTML=doneIcon||icon;text.textContent=done;text.style.opacity='1';navigator.vibrate?.(18);springTo(max,()=>setTimeout(onConfirm,220));}
 knob.addEventListener('pointerdown',e=>{if(done_||e.button!==0)return;measure();cancelAnimationFrame(frame);drag={start:e.clientX-x};lastX=e.clientX;lastT=performance.now();velocity=0;try{knob.setPointerCapture(e.pointerId);}catch{}track.classList.add('is-dragging');e.preventDefault();});
 knob.addEventListener('pointermove',e=>{if(!drag)return;const now=performance.now();velocity=(e.clientX-lastX)/Math.max(.001,(now-lastT)/1000);lastX=e.clientX;lastT=now;const raw=e.clientX-drag.start;x=raw<0?raw*.15:raw>max?max+(raw-max)*.15:raw;x=Math.max(-8,Math.min(max+8,x));paint();});
 function release(){if(!drag)return;drag=null;track.classList.remove('is-dragging');if(x>=max*.9||(x>max*.6&&velocity>900))commit();else{springTo(0);}}
 knob.addEventListener('pointerup',release);knob.addEventListener('pointercancel',()=>{velocity=0;release();});
 track.addEventListener('keydown',e=>{if(done_)return;measure();const step=max/5;if(e.key==='ArrowRight'||e.key==='ArrowUp'){e.preventDefault();velocity=0;const target=Math.min(max,x+step);if(target>=max-1)commit();else springTo(target);}else if(e.key==='ArrowLeft'||e.key==='ArrowDown'||e.key==='Home'){e.preventDefault();velocity=0;springTo(e.key==='Home'?0:Math.max(0,x-step));}else if(e.key==='End'){e.preventDefault();commit();}});
 requestAnimationFrame(()=>{measure();paint();});
 return {reset(){done_=false;track.classList.remove('is-done');knob.innerHTML=icon;text.textContent=label;velocity=0;springTo(0);}};
}
