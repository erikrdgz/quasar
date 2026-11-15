import {calculate,carPriceRange,CAR_PRICE_ASSUMPTIONS,usesTakeHome} from './finance.js?v=40';
const cash=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const ink=[28,36,50],muted=[101,112,128],blue=[58,102,165],sand=[145,117,77],teal=[57,127,116],purple=[123,98,157];
const plain=s=>Array.isArray(s)?s.map(plain):String(s).replace(/[\u2010-\u2015]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"');
export async function createPlanPdf(plan){
 await import('./jspdf.umd.min.js');
 const doc=new globalThis.jspdf.jsPDF({unit:'mm',format:'letter',compress:true});
 const c=calculate(plan),width=215.9,height=279.4,margin=18,right=width-margin;
 let y=18;
 doc.setProperties({title:`${plan.name} - Quasar overview`,subject:'Financial plan overview',creator:'Quasar'});
 function text(s,x,top,size=10,color=ink,weight='normal',options={}){doc.setFont('helvetica',weight);doc.setFontSize(size);doc.setTextColor(...color);doc.text(plain(s),x,top,options);}
 function newPage(){doc.addPage();y=20;text('Quasar',margin,y,12,blue,'bold');text(plan.name,right,y,9,muted,'normal',{align:'right',maxWidth:125});y+=13;}
 function room(h){if(y+h>height-20)newPage();}
 function section(title,color){room(22);y+=7;text(title,margin,y,12,color,'bold');y+=8;}
 function row(label,value,color=ink){const lines=doc.splitTextToSize(plain(label),116),h=Math.max(7,lines.length*4.5+2);room(h);text(lines,margin,y,10,ink);text(value,right,y,10,color,'normal',{align:'right'});y+=h;}
 text('Quasar',margin,y,20,blue,'bold');
 text(new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),right,y,9,muted,'normal',{align:'right'});y+=12;
 doc.setFontSize(16);const nameLines=doc.splitTextToSize(plain(plan.name),right-margin);text(nameLines,margin,y,16,ink,'bold');y+=nameLines.length*6.5+7;
 doc.setFillColor(238,244,252);doc.roundedRect(margin,y,right-margin,36,4,4,'F');
 text('Left to spend each month',margin+6,y+8,10,muted);text(cash(c.left),margin+6,y+22,26,blue,'bold');text(`${cash(c.left*12/52)} / week`,right-6,y+21,10,blue,'normal',{align:'right'});y+=47;
 if(usesTakeHome(plan))row('Monthly take-home (entered)',cash(c.net),blue);else{row('Annual income',cash(plan.salary),blue);row('Monthly take-home (estimated)',cash(c.net),blue);}row('Monthly essentials',cash(c.expenses),sand);row('Car budget per month',cash(plan.car),teal);if(plan.car>0){const range=carPriceRange(plan.car);row('Estimated car price',`${cash(range.low)} - ${cash(range.high)}`,teal);room(9);text(CAR_PRICE_ASSUMPTIONS,margin,y,8,muted);y+=9;}row('Goal contributions per month',cash(c.savings),purple);row('Left to spend per year',cash(c.left*12),blue);
 section('Monthly essentials',sand);
 if(plan.expenses.length)for(const expense of plan.expenses)row(expense.name,cash(expense.amount),sand);else row('No expenses',cash(0),sand);
 if(c.goals.length){section('Savings goals',purple);for(const goal of c.goals){
   doc.setFontSize(11);const title=doc.splitTextToSize(plain(goal.name),right-margin-8);const h=title.length*4.8+23;room(h+4);
   doc.setFillColor(246,243,249);doc.roundedRect(margin,y-4,right-margin,h,3,3,'F');text(title,margin+4,y+2,11,purple,'bold');const baseline=y+title.length*4.8+5;
   text(`Saved ${cash(goal.saved)} of ${cash(goal.target)}`,margin+4,baseline,9,ink);text(`${cash(goal.monthly)} / month`,right-4,baseline,9,purple,'bold',{align:'right'});
   const timing=goal.months===0?'Goal reached':goal.months===null?'Awaiting available income':`${goal.months} month${goal.months===1?'':'s'} to goal`;
   text(`${goal.pace[0].toUpperCase()+goal.pace.slice(1)} pace`,margin+4,baseline+7,9,muted);text(timing,right-4,baseline+7,9,muted,'normal',{align:'right'});y+=h+3;
 }}
 const pages=doc.getNumberOfPages();for(let page=1;page<=pages;page++){doc.setPage(page);text('Quasar',margin,height-10,8,muted);text(`${page} / ${pages}`,right,height-10,8,muted,'normal',{align:'right'});}
 return doc;
}
export async function downloadPlanPdf(plan){const doc=await createPlanPdf(plan);doc.save(`quasar-${plan.name.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()||'plan'}.pdf`);}
