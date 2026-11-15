import {DEFAULT_STATE,isState,stateTax} from './states.js?v=43';
export const uid=()=>globalThis.crypto.randomUUID();
// New plans start empty; onboarding or the user fills them in.
export function blank(){return {id:uid(),name:'My plan',salary:0,incomeMode:'salary',takeHome:0,state:DEFAULT_STATE,other:0,famli:true,car:0,goals:[],expenses:[]};}
// Goal icons (Font Awesome Free). A goal without a chosen icon shows one guessed
// from its name, so lists stay scannable with no extra taps.
export const GOAL_ICONS=[
 ['piggy-bank','Savings'],['umbrella','Emergency'],['plane','Travel'],['house','Home'],['car','Car'],
 ['graduation-cap','Education'],['ring','Wedding'],['gift','Gifts'],['laptop','Tech'],['paw','Pet']
];
const ICON_WORDS=[
 ['umbrella',/emergenc|rainy|cushion|safety net/],['plane',/trip|travel|vacation|flight|holiday in|getaway|japan|europe|mexico/],
 ['house',/house|home|down ?payment|apartment|condo|deposit|move|moving/],['car',/\bcar\b|truck|vehicle|tesla|bike|motorcycle/],
 ['graduation-cap',/school|college|tuition|class|course|degree|education|student/],['ring',/wedding|engage|ring|honeymoon/],
 ['gift',/gift|christmas|birthday|present|holiday/],['laptop',/laptop|computer|mac|phone|iphone|tech|camera|tv|console|gaming/],
 ['paw',/\bpet\b|dog|cat|puppy|kitten|vet/]
];
// Optional goal colors. Muted-bright so they read on black, and none is the
// action blue, which stays reserved for buttons.
export const GOAL_COLORS=[
 ['green','Green','#4fd18b'],['teal','Teal','#5fd2cc'],['sky','Sky','#7cc4ff'],['purple','Purple','#c39cff'],
 ['pink','Pink','#f282b4'],['red','Red','#ff7a6b'],['orange','Orange','#f2a65e'],['yellow','Yellow','#f5cf5a']
];
export const goalColor=goal=>GOAL_COLORS.find(([id])=>id===goal.color)?.[2]||null;
export function goalIcon(goal){if(GOAL_ICONS.some(([id])=>id===goal.icon))return goal.icon;const name=String(goal.name||'').toLowerCase();return ICON_WORDS.find(([,re])=>re.test(name))?.[0]||'piggy-bank';}
// Slider range for an amount: about twice the value, so the thumb sits near the
// middle whether it's $375 or $100,000, never pinned at the end. base/5 is the
// smallest range (e.g. $1k for bills). The max is a round number and the step
// scales with it (e.g. $1k in $10s, $200k in $1,000s).
export function sliderRange(value,base){const target=Math.max(base/5,(Number(value)||0)*2),unit=10**Math.floor(Math.log10(target)),max=Math.ceil(target/unit-1e-9)*unit;return {max,step:Math.max(1,10**(Math.floor(Math.log10(max))-2))};}
// True for a plan nobody has filled in yet.
export const isUntouched=p=>!p.salary&&!p.takeHome&&!p.car&&!p.other&&!p.expenses.length&&!p.goals.length;
// FAMLI is Colorado's paid-leave premium, so it only applies when the state is Colorado.
export function taxes(salary,famli=true,stateCode=DEFAULT_STATE){
 const income=Math.max(0,salary), taxable=Math.max(0,income-16100);
 const brackets=[[12400,.1],[50400,.12],[105700,.22],[201775,.24],[256225,.32],[640600,.35],[Infinity,.37]];
 let federal=0,previous=0;for(const [ceiling,rate] of brackets){federal+=Math.max(0,Math.min(taxable,ceiling)-previous)*rate;previous=ceiling;}
 const state=stateTax(income,stateCode),ss=Math.min(income,184500)*.062,medicare=income*.0145+Math.max(0,income-200000)*.009,leave=famli&&stateCode==='CO'?Math.min(income,184500)*.0044:0;
 return {federal,state,ss,medicare,leave,total:federal+state+ss+medicare+leave};
}
// Take-home mode skips the Colorado estimate for people paid elsewhere or with
// pre-tax deductions; the monthly amount entered is used as-is.
export const usesTakeHome=p=>p.incomeMode==='takehome';
export function calculate(p){const tax=usesTakeHome(p)?{federal:0,state:0,ss:0,medicare:0,leave:0,total:0}:taxes(p.salary,p.famli,p.state),net=(usesTakeHome(p)?p.takeHome:(p.salary-tax.total)/12)-p.other,expenses=p.expenses.reduce((s,e)=>s+e.amount,0),available=net-expenses-p.car;
 const active=p.goals.filter(g=>g.target>g.saved),weights={slow:1,medium:2,fast:4};
 // Custom goals set aside a fixed amount first (never more than is available or
 // still needed); paced goals then share a slice of whatever remains.
 let room=Math.max(0,available);const fixed=new Map();
 for(const g of active.filter(g=>g.pace==='custom')){const take=Math.min(g.target-g.saved,g.perMonth||0,room);fixed.set(g,take);room-=take;}
 const paced=active.filter(g=>g.pace!=='custom');
 // A shared savings pool prevents multiple goals from allocating the same money.
 const weight=paced.reduce((s,g)=>s+weights[g.pace],0),fraction=paced.length?Math.max(...paced.map(g=>({slow:.1,medium:.25,fast:.4})[g.pace])):0,pool=room*fraction;
 const goals=p.goals.map(g=>{const remaining=Math.max(0,g.target-g.saved),monthly=!remaining?0:g.pace==='custom'?fixed.get(g)||0:weight?Math.min(remaining,pool*weights[g.pace]/weight):0;return {...g,remaining,monthly,months:remaining===0?0:monthly>0?Math.ceil(remaining/monthly):null};});
 const savings=goals.reduce((s,g)=>s+g.monthly,0);return {tax,net,expenses,available,savings,goals,left:available-savings};}
export function validatePlan(p,keepIds=false){
 const number=(n,max=1e8)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max;
 if(!p||typeof p.name!=='string'||p.name.length>80||!number(p.salary,1e8)||!number(p.other)||!number(p.car)||typeof p.famli!=='boolean'||!Array.isArray(p.expenses)||!Array.isArray(p.goals)||p.expenses.length>50||p.goals.length>30)throw Error('Invalid plan format.');
 const incomeMode=p.incomeMode??'salary',takeHome=p.takeHome??0;
 if(!['salary','takehome'].includes(incomeMode)||!number(takeHome,1e6))throw Error('Invalid take-home pay.');
 for(const e of p.expenses)if(typeof e.name!=='string'||e.name.length>80||!number(e.amount))throw Error('Invalid expense.');
 for(const g of p.goals)if(typeof g.name!=='string'||g.name.length>80||!number(g.target)||!number(g.saved)||!['slow','medium','fast','custom'].includes(g.pace)||(g.perMonth!==undefined&&!number(g.perMonth,1e6)))throw Error('Invalid savings goal.');
 // Unknown icon ids are dropped rather than rejected, so older or edited backups still load.
 const goals=p.goals.map(g=>{const {icon,color,...rest}=g;if(GOAL_ICONS.some(([id])=>id===icon))rest.icon=icon;if(GOAL_COLORS.some(([id])=>id===color))rest.color=color;return rest;});
 const id=x=>keepIds&&typeof x.id==='string'?x.id:uid();
 // Plans from before the state selector were Colorado estimates.
 const state=isState(p.state)?p.state:DEFAULT_STATE;
 return {...p,incomeMode,takeHome,state,id:id(p),expenses:p.expenses.map(e=>({...e,id:id(e)})),goals:goals.map(g=>({...g,id:id(g)}))};
}
// Caps use cents and round down so input can never cross the available balance.
export function spendingLimit(p,id){const c=calculate(p);const own=id==='car'?p.car:(p.expenses.find(e=>e.id===id)?.amount||0);return Math.max(0,Math.floor((c.net-c.expenses-p.car+own+1e-8)*100)/100);}
export function minimumSalary(p){if(usesTakeHome(p))return 0;const required=(p.other+p.car+p.expenses.reduce((n,e)=>n+e.amount,0))*12;let low=0,high=1000000;for(let i=0;i<60;i++){const mid=(low+high)/2;if(mid-taxes(mid,p.famli,p.state).total>=required)high=mid;else low=mid;}return Math.max(0,Math.ceil(high-1e-7));}
// Illustrative purchase-price estimate: 60 months, 6-10% APR, no down payment.
// Taxes and fees are not financed in this estimate.
export const CAR_PRICE_ASSUMPTIONS='60 months · 6–10% APR · $0 down · before tax & fees';
export function loanPrincipal(payment,apr,months){const rate=apr/12;return rate===0?payment*months:payment*(-Math.expm1(-months*Math.log1p(rate)))/rate;}
export function carPriceRange(payment){const monthly=Number.isFinite(payment)?Math.max(0,payment):0;return {low:Math.floor(loanPrincipal(monthly,.10,60)/100)*100,high:Math.floor(loanPrincipal(monthly,.06,60)/100)*100};}
