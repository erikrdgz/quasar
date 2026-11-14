export const uid=()=>globalThis.crypto.randomUUID();
export function blank(){return {id:uid(),name:'My plan',salary:130000,other:0,famli:true,car:0,goals:[],expenses:[['Rent',375],['Food',400],['Phone',200],['Xcel',100],['Legal',260]].map(([name,amount])=>({id:uid(),name,amount}))};}
export function taxes(salary,famli=true){
 const income=Math.max(0,salary), taxable=Math.max(0,income-16100);
 const brackets=[[12400,.1],[50400,.12],[105700,.22],[201775,.24],[256225,.32],[640600,.35],[Infinity,.37]];
 let federal=0,previous=0;for(const [ceiling,rate] of brackets){federal+=Math.max(0,Math.min(taxable,ceiling)-previous)*rate;previous=ceiling;}
 const state=taxable*.044,ss=Math.min(income,184500)*.062,medicare=income*.0145+Math.max(0,income-200000)*.009,leave=famli?Math.min(income,184500)*.0044:0;
 return {federal,state,ss,medicare,leave,total:federal+state+ss+medicare+leave};
}
export function calculate(p){const tax=taxes(p.salary,p.famli),net=(p.salary-tax.total)/12-p.other,expenses=p.expenses.reduce((s,e)=>s+e.amount,0),available=net-expenses-p.car;
 const active=p.goals.filter(g=>g.target>g.saved),weights={slow:1,medium:2,fast:4};
 // A shared savings pool prevents multiple goals from allocating the same money.
 const weight=active.reduce((s,g)=>s+weights[g.pace],0),fraction=active.length?Math.max(...active.map(g=>({slow:.1,medium:.25,fast:.4})[g.pace])):0,pool=Math.max(0,available)*fraction;
 const goals=p.goals.map(g=>{const remaining=Math.max(0,g.target-g.saved),monthly=remaining&&weight?Math.min(remaining,pool*weights[g.pace]/weight):0;return {...g,remaining,monthly,months:remaining===0?0:monthly>0?Math.ceil(remaining/monthly):null};});
 const savings=goals.reduce((s,g)=>s+g.monthly,0);return {tax,net,expenses,available,savings,goals,left:available-savings};}
export function validatePlan(p){
 const number=(n,max=1e7)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max;
 if(!p||typeof p.name!=='string'||p.name.length>80||!number(p.salary,1e6)||!number(p.other)||!number(p.car)||typeof p.famli!=='boolean'||!Array.isArray(p.expenses)||!Array.isArray(p.goals)||p.expenses.length>50||p.goals.length>30)throw Error('Invalid plan format.');
 for(const e of p.expenses)if(typeof e.name!=='string'||e.name.length>80||!number(e.amount))throw Error('Invalid expense.');
 for(const g of p.goals)if(typeof g.name!=='string'||g.name.length>80||!number(g.target)||!number(g.saved)||!['slow','medium','fast'].includes(g.pace))throw Error('Invalid savings goal.');
 return {...p,id:uid(),expenses:p.expenses.map(e=>({...e,id:uid()})),goals:p.goals.map(g=>({...g,id:uid()}))};
}
// Caps use cents and round down so input can never cross the available balance.
export function spendingLimit(p,id){const c=calculate(p);const own=id==='car'?p.car:(p.expenses.find(e=>e.id===id)?.amount||0);return Math.max(0,Math.floor((c.net-c.expenses-p.car+own+1e-8)*100)/100);}
export function minimumSalary(p){const required=(p.other+p.car+p.expenses.reduce((n,e)=>n+e.amount,0))*12;let low=0,high=1000000;for(let i=0;i<60;i++){const mid=(low+high)/2;if(mid-taxes(mid,p.famli).total>=required)high=mid;else low=mid;}return Math.ceil(high-1e-7);}
