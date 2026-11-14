import {icon} from './icons.js?v=15';
let closed={income:true,'car-section':true,'expenses-section':true,saving:true};
const toggles=new Map();
const definitions=[['income','Annual income'],['car-section','Car budget'],['expenses-section','Monthly essentials'],['saving','Save up for']];
export function setupCategories(){
 for(const [id,title]of definitions){
  const card=document.getElementById(id),head=card.querySelector('.section-head'),heading=head.querySelector('h2');
  const toggle=document.createElement('button');toggle.className='category-toggle';toggle.type='button';
  const label=document.createElement('span');label.className='category-title';
  const glyph=heading.querySelector('[data-icon]');if(glyph)toggle.append(glyph);
  label.textContent=title;toggle.append(label);
  toggle.insertAdjacentHTML('beforeend','<span class="category-total"></span><span class="category-chevron">'+icon('chevron')+'</span>');
  heading.replaceChildren(toggle);
  const body=document.createElement('div'),clip=document.createElement('div'),content=document.createElement('div');
  body.className='category-body';body.id=id+'-body';clip.className='category-clip';content.className='category-content';
  for(const node of [...card.children])if(node!==head)content.append(node);
  const add=head.querySelector('#addGoal');if(add)content.append(add);
  const total=head.querySelector('#expenseTotal');if(total){total.hidden=true;content.append(total);}
  clip.append(content);body.append(clip);card.append(body);toggle.setAttribute('aria-controls',body.id);
  function apply(){const collapsed=!!closed[id];card.classList.toggle('is-collapsed',collapsed);toggle.setAttribute('aria-expanded',String(!collapsed));clip.inert=collapsed;clip.setAttribute('aria-hidden',String(collapsed));}
  toggles.set(id,apply);toggle.addEventListener('click',()=>{const wasClosed=closed[id];for(const [key]of definitions)closed[key]=true;closed[id]=!wasClosed;for(const refresh of toggles.values())refresh();});apply();
 }
}
export function updateCategoryTotals(plan,calculation,format){
 const values={income:[plan.salary,'/ yr'],'car-section':[plan.car,'/ mo'],'expenses-section':[calculation.expenses,'/ mo'],saving:[calculation.savings,'/ mo']};
 for(const [id,[value,period]]of Object.entries(values)){const total=document.querySelector('#'+id+' .category-total');if(total)total.textContent=format(value)+' '+period;}
}
