/* ============================ core rules (no DOM) ============================ */
const N=7;
const SHIPS={D:{name:'Dreadnought',len:4},C:{name:'Cruiser',len:3},F:{name:'Frigate',len:3},S:{name:'Scout',len:2}};
const SHIP_KEYS=['D','C','F','S'];
const R=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const r5=x=>Math.round(x/5)*5;

/* ---- squad colours: 6 vivid, then the same 6 as pastels, then the pattern repeats ---- */
const VIVID=['#FF4D5A','#2F8CFF','#26C46B','#FFC62E','#9B5DF5','#FF8B2B'];
const PASTEL=['#FFB8BF','#B5D3FF','#B7EBC9','#FFEBA3','#D9C6FF','#FFD2A6'];
const teamColor=i=>(Math.floor(i/6)%2===0?VIVID[i%6]:PASTEL[i%6]);
const DEFAULT_NAMES=['Red Rockets','Blue Barracudas','Green Gators','Yellow Yetis','Purple Pirates','Orange Orcas','Rose Rays','Sky Sharks','Mint Marlins','Lemon Lobsters','Lilac Llamas','Peach Penguins'];
const defaultName=i=>DEFAULT_NAMES[i%12]+(i>=12?' '+(Math.floor(i/12)+1):'');
const lum=h=>{const v=[1,3,5].map(k=>parseInt(h.slice(k,k+2),16)/255).map(c=>c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4));return .2126*v[0]+.7152*v[1]+.0722*v[2];};
const inkFor=h=>{const L=lum(h);return (L+.05)/(0.0199+.05)>=1.05/(L+.05)?'#10264A':'#FFFFFF';};
const MAX_TEAMS=12;

/* ---- fleet layouts: 7 rows of 7 characters. D=Dreadnought(4) C=Cruiser(3) F=Frigate(3) S=Scout(2) ---- */
const DEFAULT_TEMPLATES=[
 {id:'d1',name:'Corner Patrol',on:true,rows:['DDDD..C','......C','......C','.......','.......','......S','FFF...S']},
 {id:'d2',name:'Crossroads',on:true,rows:['C.....S','C.....S','C..D...','...D...','...D...','...D...','....FFF']},
 {id:'d3',name:'Staircase',on:true,rows:['DDDD...','.......','..CCC..','.......','....FFF','.......','SS.....']},
 {id:'d4',name:'Twin Towers',on:true,rows:['.D...F.','.D...F.','.D...F.','.D.....','...C..S','...C..S','...C...']},
 {id:'d5',name:'Fortress',on:true,rows:['.......','..DDDD.','..C.F..','..C.F..','..C.F..','.S.....','.S.....']},
 {id:'d6',name:'Scattered',on:true,rows:['S.....F','S.....F','......F','....C..','....C..','....C..','DDDD...']}
];
function parseRows(rows){
  if(!Array.isArray(rows)||rows.length!==N||rows.some(r=>typeof r!=='string'||r.length!==N))return null;
  const out=[];let total=0;
  for(const k of SHIP_KEYS){
    const cells=[];
    rows.forEach((row,r)=>[...row].forEach((ch,c)=>{if(ch===k)cells.push([r,c]);}));
    if(cells.length!==SHIPS[k].len)return null;
    const sameR=cells.every(x=>x[0]===cells[0][0]),sameC=cells.every(x=>x[1]===cells[0][1]);
    if(!sameR&&!sameC)return null;
    const s=cells.map(x=>sameR?x[1]:x[0]).sort((a,b)=>a-b);
    if(!s.every((v,i)=>i===0||v===s[i-1]+1))return null;
    out.push({key:k,cells});total+=cells.length;
  }
  const letters=rows.join('').replace(/[.]/g,'').length;
  return letters===total?out:null;
}
const TF=[(r,c)=>[r,c],(r,c)=>[r,N-1-c],(r,c)=>[N-1-r,c],(r,c)=>[N-1-r,N-1-c],(r,c)=>[c,r],(r,c)=>[c,N-1-r],(r,c)=>[N-1-c,r],(r,c)=>[N-1-c,N-1-r]];
const transformShips=(ships,t)=>ships.map(s=>({key:s.key,cells:s.cells.map(([r,c])=>TF[t](r,c))}));
/* give every squad its own layout; reuse (flipped) only when there are more squads than layouts */
function assignFleets(n,templates,mix){
  let pool=templates.filter(t=>t.on&&parseRows(t.rows));
  if(!pool.length)pool=DEFAULT_TEMPLATES;
  let order=[],out=[];
  for(let i=0;i<n;i++){
    const reused=i>=pool.length;
    if(!order.length)order=shuffle(pool);
    const t=order.pop();
    let ships=parseRows(t.rows);
    if(mix||reused)ships=transformShips(ships,R(0,7));
    out.push({ships,tpl:t.name});
  }
  return out;
}

/* ---- teams, hit points, shots ---- */
function hpPerShip(total,count){return Math.max(10,r5(total/count));}
function makeTeam(def,i,cfg,fleet){
  const per=hpPerShip(cfg.hp,fleet.ships.length);
  const ships=fleet.ships.map(s=>({key:s.key,name:SHIPS[s.key].name,len:s.cells.length,cells:s.cells,hp:per,maxHp:per,hits:0,sunk:false}));
  const map=Array.from({length:N},()=>Array(N).fill(-1));
  ships.forEach((s,si)=>s.cells.forEach(([r,c])=>map[r][c]=si));
  const color=teamColor(i);
  return{name:(def.name||'').trim()||defaultName(i),members:(def.members||[]).slice(),grade:def.grade,color,ink:inkFor(color),
    ships,map,shots:Array.from({length:N},()=>Array(N).fill('')),alive:true,mi:0,tpl:fleet.tpl,
    stats:{shots:0,hits:0,sunk:0,right:0,asked:0,dealt:0,blocked:0}};
}
const teamHp=t=>t.ships.reduce((a,s)=>a+(s.sunk?0:s.hp),0);
const teamMax=t=>t.ships.reduce((a,s)=>a+s.maxHp,0);
const shipsAfloat=t=>t.ships.filter(s=>!s.sunk).length;

function shotAt(t,r,c,hints){
  const si=t.map[r][c];
  if(si<0){
    let near=false;
    if(hints)for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const y=r+a,x=c+b;if(y>=0&&x>=0&&y<N&&x<N&&t.map[y][x]>=0&&t.shots[y][x]!=='h'&&t.shots[y][x]!=='s')near=true;}
    t.shots[r][c]=near?'n':'m';
    return{type:near?'near':'miss'};
  }
  t.shots[r][c]='h';t.ships[si].hits++;
  return{type:'hit',si};
}
/* speed bonus: answering in the first third of the time gives x1.5, the second third x1.25 */
const speedMult=f=>f<.33?1.5:f<.66?1.25:1;
function calcDamage({value,surge,mult,shieldOk,shieldPct}){
  const base=value*(surge?2:1),dmg=r5(base*mult);
  const blocked=shieldOk?r5(dmg*shieldPct/100):0;
  return{base,dmg,blocked,final:dmg-blocked};
}
/* a ship goes down when its own HP runs out OR every square of it has been hit (its leftover HP is lost) */
function applyDamage(t,si,dmg){
  const s=t.ships[si],before=s.hp,taken=Math.min(before,dmg);
  s.hp=before-taken;
  let finishing=0,sunk=false;
  if(s.hp<=0||s.hits>=s.len){finishing=s.hp;s.hp=0;s.sunk=true;sunk=true;s.cells.forEach(([r,c])=>t.shots[r][c]='s');}
  if(t.ships.every(x=>x.sunk))t.alive=false;
  return{before,taken,finishing,sunk,eliminated:!t.alive};
}

/* ============================ mental math (always fresh, short, no paper) ============================ */
const sup=n=>String(n).split('').map(d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]||d).join('');
const sub=n=>String(n).split('').map(d=>'₀₁₂₃₄₅₆₇₈₉'[d]||d).join('');
const NM=['Emma','Liam','Ava','Noah','Mia','Lucas','Zoe','Ethan','Sofia','Mateo'];
const EM=['🍎','🍪','⭐','🎈','🐟','⚽','🍕','🧩','🚀','🐢'];

/* multiple choice from a number; wrong answers are near misses (off by 1, 2, 10...) */
function numQ(q,ans,exp,o={}){
  const u=o.u||1,fmt=o.fmt||String,seen=new Set([ans]),out=[];
  const lo=o.neg?-Infinity:(o.min!=null?o.min:0),hi=o.max!=null?o.max:Infinity;
  const add=v=>{v=+(+v).toFixed(4);if(!seen.has(v)&&v>=lo&&v<=hi&&out.length<3){seen.add(v);out.push(v);}};
  (o.x||[]).forEach(add);
  const d=[1,-1,2,-2,3,-3,5,-5,10,-10];if(Math.abs(ans)>=100)d.push(100,-100,20,-20);
  shuffle(d).forEach(k=>add(ans+k*u));
  for(let k=1;out.length<3&&k<60;k++)add(ans+k*u);
  return{q,a:fmt(ans),w:out.map(fmt),exp};
}
/* multiple choice from text answers */
const txtQ=(q,a,w,exp)=>({q,a,w:shuffle(w.filter(x=>x!==a)).slice(0,3),exp});

const add=(a,b,o)=>numQ(`${a} + ${b} = ?`,a+b,`${a} + ${b} = ${a+b}`,o);
const sbt=(a,b,o)=>numQ(`${a} − ${b} = ?`,a-b,`${a} − ${b} = ${a-b}`,o);
const mul=(a,b,o)=>numQ(`${a} × ${b} = ?`,a*b,`${a} × ${b} = ${a*b}`,Object.assign({x:[a+b]},o));
const div=(a,b)=>numQ(`${a*b} ÷ ${b} = ?`,a,`${a} × ${b} = ${a*b}, so ${a*b} ÷ ${b} = ${a}`,{x:[b]});
const gap=(a,t,o)=>numQ(`${a} + ? = ${t}`,t-a,`${a} + ${t-a} = ${t}`,o);
const gap2=(b,t,o)=>numQ(`? + ${b} = ${t}`,t-b,`${t-b} + ${b} = ${t}`,o);
const dbl=(a)=>numQ(`Double ${a} = ?`,a*2,`${a} + ${a} = ${a*2}`);
const half=(a)=>numQ(`Half of ${a*2} = ?`,a,`${a} + ${a} = ${a*2}`);
const skip=(s,st)=>{const n=[0,1,2,3].map(i=>s+i*st);return numQ(`${n.join(', ')}, ?`,s+4*st,`Count by ${st}s: next is ${s+4*st}`,{x:[s+5*st,s+3*st+1]});};
const nm=()=>pick(NM),em=()=>pick(EM);
/* short word problems: a name, a number, an emoji, one question */
const wAdd=(a,b,o)=>{const e=em();return numQ(`${nm()} has ${a} ${e}. Gets ${b} more. Total?`,a+b,`${a} + ${b} = ${a+b}`,o);};
const wSub=(a,b,o)=>{const e=em();return numQ(`${nm()} has ${a} ${e}. Gives ${b} away. Left?`,a-b,`${a} − ${b} = ${a-b}`,o);};
const wGrp=(a,b)=>{const e=em();return numQ(`${a} bags, ${b} ${e} in each. How many ${e}?`,a*b,`${a} × ${b} = ${a*b}`,{x:[a+b]});};
const wShare=(a,b)=>{const e=em();return numQ(`${a*b} ${e} shared by ${b} kids. Each gets?`,a,`${a*b} ÷ ${b} = ${a}`,{x:[b]});};
const wMore=(a,b)=>{const [n,m]=shuffle(NM).slice(0,2);return numQ(`${n} has ${a+b} ⭐. ${m} has ${a}. How many more?`,b,`${a+b} − ${a} = ${b}`);};
const wCost=(p,k)=>numQ(`1 snack costs $${p}. Buy ${k}. Total?`,p*k,`${k} × $${p} = $${p*k}`,{fmt:n=>'$'+n,x:[p+k]});
const wTime=(a,b)=>numQ(`Class is ${a} min. ${b} min are gone. Minutes left?`,a-b,`${a} − ${b} = ${a-b}`);
const frac=(n,d,w)=>{ /* n/d of w */
  const a=w/d*n;return numQ(`${n}/${d} of ${w} = ?`,a,`${w} ÷ ${d} = ${w/d}${n>1?`, then × ${n} = ${a}`:''}`,{x:[w/d]});};
const pct=(p,b)=>numQ(`${p}% of ${b} = ?`,b*p/100,`${p}% of ${b} = ${b*p/100}`,{x:[b-b*p/100]});
const rnd=(n,to)=>{if(n%to===0)n+=R(1,to-1);if(n%to===to/2)n+=1;const a=Math.round(n/to)*to;return numQ(`Round ${n} to the nearest ${to}`,a,`${n} is closest to ${a}`,{u:to});};
const fracAdd=()=>{const t=pick([[1,4,1,4,'1/2'],[1,2,1,4,'3/4'],[1,8,3,8,'1/2'],[2,5,1,5,'3/5'],[1,3,1,3,'2/3'],[3,10,2,10,'1/2'],[1,6,2,6,'1/2']]);
  const ans=t[4],pool=['1/2','3/4','2/3','1/4','3/5','2/5','4/5','3/8','5/6'];
  return txtQ(`${t[0]}/${t[1]} + ${t[2]}/${t[3]} = ?`,ans,shuffle(pool),`${t[0]}/${t[1]} + ${t[2]}/${t[3]} = ${ans}`);};
const bigger=(a,b)=>txtQ(`Which is bigger: ${a} or ${b}?`,String(Math.max(a,b)),[String(Math.min(a,b)),'They are equal','Can\'t tell'],`${Math.max(a,b)} is greater than ${Math.min(a,b)}`);
const intq=(a,op,b)=>{const ans=op==='+'?a+b:op==='−'?a-b:a*b;const A=a<0?`(${a})`:a,B=b<0?`(${b})`:b;
  return numQ(`${A} ${op} ${B} = ?`,ans,`${A} ${op} ${B} = ${ans}`,{neg:true,x:[-ans]});};
const solve=(a,x,b)=>{ /* a·x + b = total */
  const t=a*x+b;
  return numQ(a===1?`x + ${b} = ${t}`:`${a}x + ${b} = ${t}`,x,`${t} − ${b} = ${a*x}${a>1?`, then ÷ ${a} = ${x}`:''}`,{fmt:n=>'x = '+n,x:[t-b]});};
const solveMul=(a,x)=>numQ(`${a}x = ${a*x}`,x,`${a*x} ÷ ${a} = ${x}`,{fmt:n=>'x = '+n,x:[a]});
const TRIPLES=[[3,4,5],[5,12,13],[6,8,10],[9,12,15],[8,15,17],[7,24,25]];

/* MATH[grade][tier]: a function that returns a fresh question. Tier 0 is easiest. */
const MATH=[
 /* K */[
  ()=>add(R(1,3),R(1,2),{max:6}),
  ()=>pick([()=>sbt(R(3,5),R(1,2),{max:6}),()=>wAdd(R(1,4),R(1,4),{max:9})])(),
  ()=>gap(R(1,9),10,{max:10}),
  ()=>pick([()=>wSub(R(5,9),R(1,4),{max:10}),()=>add(R(3,6),R(2,4),{max:11})])()],
 /* G1 */[
  ()=>pick([()=>add(R(2,6),R(2,4),{max:11}),()=>sbt(R(6,10),R(1,5),{max:10})])(),
  ()=>pick([()=>add(R(6,9),R(4,9)),()=>sbt(R(11,18),R(3,9))])(),
  ()=>pick([()=>gap2(R(3,9),R(11,18)),()=>gap(R(4,9),R(11,15))])(),
  ()=>pick([()=>wAdd(R(8,12),R(3,8)),()=>add(R(1,4)*10,R(1,4)*10),()=>wSub(R(12,19),R(3,9))])()],
 /* G2 */[
  ()=>pick([()=>add(R(7,9),R(5,9)),()=>sbt(R(13,18),R(5,9))])(),
  ()=>pick([()=>add(R(2,6)*10,R(1,3)*10),()=>sbt(R(5,9)*10,R(1,4)*10),()=>add(R(2,8)*10+R(0,9),10)])(),
  ()=>pick([()=>add(R(2,7)*10+R(1,5),R(1,2)*10),()=>sbt(R(5,9)*10+R(1,5),9),()=>skip(R(1,3)*5,5)])(),
  ()=>pick([()=>wAdd(R(2,6)*10+R(1,6),R(1,3)*10),()=>dbl(R(11,25)),()=>skip(R(2,9)*2,pick([2,10])),()=>wMore(R(12,30),R(3,9))])()],
 /* G3 */[
  ()=>pick([()=>mul(R(2,9),2),()=>mul(R(2,9),5),()=>mul(R(2,9),10)])(),
  ()=>pick([()=>mul(R(3,6),R(3,6)),()=>div(R(2,6),R(2,5)),()=>half(R(8,25))])(),
  ()=>pick([()=>mul(R(6,9),R(6,9)),()=>div(R(5,9),R(5,9)),()=>wGrp(R(3,7),R(3,8))])(),
  ()=>pick([()=>mul(R(2,9)*10,R(2,5)),()=>wShare(R(4,9),R(3,6)),()=>wCost(R(2,9),R(3,6)),()=>rnd(R(11,99),10)])()],
 /* G4 */[
  ()=>pick([()=>mul(R(6,9),R(6,9)),()=>div(R(6,9),R(6,9))])(),
  ()=>pick([()=>mul(R(11,19),R(2,5)),()=>mul(R(4,8),25),()=>mul(R(5,9),R(11,12))])(),
  ()=>pick([()=>frac(1,2,R(4,20)*2),()=>frac(1,4,R(3,12)*4),()=>frac(1,3,R(3,12)*3)])(),
  ()=>pick([()=>div(R(3,9)*100,R(2,5)),()=>mul(R(2,9),R(2,9)*10),()=>rnd(R(101,999),100),()=>wTime(60,R(2,9)*5)])()],
 /* G5 */[
  ()=>pick([()=>mul(R(7,9),R(7,12)),()=>div(R(7,12),R(7,9))])(),
  ()=>pick([()=>mul(R(12,25),4),()=>mul(R(3,9),R(15,25)),()=>{const a=R(1,4),b=R(1,5);return numQ(`0.${a} + 0.${b} = ?`,+(0.1*(a+b)).toFixed(1),`${a} tenths + ${b} tenths = ${a+b} tenths`,{fmt:n=>(+n).toFixed(1),u:.1});}])(),
  ()=>pick([()=>frac(3,4,R(2,8)*4),()=>frac(2,3,R(2,8)*3),()=>fracAdd()])(),
  ()=>pick([()=>{const a=R(2,9),b=R(2,6),c=R(2,6);return numQ(`${a} + ${b} × ${c} = ?`,a+b*c,`Multiply first: ${b} × ${c} = ${b*c}, then + ${a} = ${a+b*c}`,{x:[(a+b)*c]});},()=>pct(10,R(2,15)*10),()=>pct(50,R(3,20)*10)])()],
 /* G6 */[
  ()=>pick([()=>mul(R(11,15),R(6,9)),()=>mul(R(4,9),25),()=>div(R(12,16),R(6,9))])(),
  ()=>pick([()=>pct(25,R(2,12)*8),()=>pct(10,R(2,30)*10),()=>pct(50,R(3,20)*14)])(),
  ()=>pick([()=>{const [a,b,l]=pick([[4,6,12],[3,5,15],[6,8,24],[4,10,20],[6,9,18],[2,7,14]]);return numQ(`LCM of ${a} and ${b} = ?`,l,`Smallest number both ${a} and ${b} divide into: ${l}`);},()=>{const [x,y,g]=pick([[12,18,6],[24,36,12],[16,40,8],[30,45,15],[20,50,10]]);return numQ(`GCF of ${x} and ${y} = ?`,g,`Biggest number that divides both: ${g}`);},()=>{const k=R(2,5),a=R(2,5),b=R(3,6);return numQ(`${a} : ${b} = ${a*k} : ?`,b*k,`Multiply both by ${k}: ${b} × ${k} = ${b*k}`);}])(),
  ()=>pick([()=>intq(-R(2,9),'+',R(4,12)),()=>intq(R(2,8),'−',R(9,15)),()=>intq(-R(2,9),'×',R(2,6))])()],
 /* G7 */[
  ()=>pick([()=>intq(-R(3,9),'+',R(5,15)),()=>intq(R(2,9),'−',R(10,20)),()=>intq(-R(2,9),'−',R(2,9))])(),
  ()=>pick([()=>pct(20,R(2,12)*5),()=>pct(15,R(2,10)*20),()=>pct(25,R(2,15)*8)])(),
  ()=>pick([()=>solve(1,R(2,15),R(2,12)),()=>solveMul(R(2,9),R(2,12)),()=>{const a=R(2,6),x=R(2,9);return numQ(`x ÷ ${a} = ${x}`,a*x,`${x} × ${a} = ${a*x}`,{fmt:n=>'x = '+n});}])(),
  ()=>pick([()=>solve(R(2,5),R(2,9),R(1,9)),()=>intq(-R(2,9),'×',-R(2,9)),()=>{const a=R(2,4),p=R(2,5),k=R(2,4);return numQ(`${a} pens = $${a*p}. ${a*k} pens = ?`,a*k*p,`1 pen = $${p}, so ${a*k} pens = $${a*k*p}`,{fmt:n=>'$'+n});}])()],
 /* G8 */[
  ()=>pick([()=>{const n=R(5,15);return numQ(`√${n*n} = ?`,n,`${n} × ${n} = ${n*n}`);},()=>{const b=R(2,3),e=R(3,5);return numQ(`${b}${sup(e)} = ?`,b**e,`${b} multiplied ${e} times = ${b**e}`);},()=>{const b=R(2,9);return numQ(`${b}² + ${b}² = ?`,2*b*b,`${b*b} + ${b*b} = ${2*b*b}`);}])(),
  ()=>pick([()=>solve(R(2,5),R(2,12),R(1,9)),()=>{const a=R(2,6),b=R(1,8),x=R(2,9);return numQ(`${a}(x + ${b}) = ${a*(x+b)}`,x,`Divide by ${a}: x + ${b} = ${x+b}, so x = ${x}`,{fmt:n=>'x = '+n,x:[x+b]});}])(),
  ()=>pick([()=>{const [a,b,c]=pick(TRIPLES.slice(0,4));return numQ(`Legs ${a} and ${b}. Hypotenuse?`,c,`${a}² + ${b}² = ${a*a+b*b} = ${c}²`,{x:[a+b]});},()=>{const n=R(2,9);return numQ(`√${n*n*4} = ?`,2*n,`${2*n} × ${2*n} = ${4*n*n}`);}])(),
  ()=>pick([()=>{const m=pick([-4,-3,-2,2,3,4]),x1=R(0,3),y1=R(-3,3),dx=R(1,3),x2=x1+dx,y2=y1+m*dx;return numQ(`Slope through (${x1}, ${y1}) and (${x2}, ${y2})?`,m,`(${y2} − ${y1}) ÷ (${x2} − ${x1}) = ${m}`,{neg:true,x:[-m]});},()=>{const a=R(2,5),b=R(2,5);return numQ(`x${sup(a)} · x${sup(b)} = ?`,a+b,`Add the powers: ${a} + ${b} = ${a+b}`,{fmt:n=>'x'+sup(n),x:[a*b]});}])()],
 /* G9 */[
  ()=>pick([()=>{const n=R(3,12);return numQ(`x² = ${n*n}, x > 0. x = ?`,n,`${n} × ${n} = ${n*n}`,{fmt:n=>'x = '+n});},()=>{const a=R(2,6),c=R(-3,4),b=R(1,9);return numQ(`f(x) = ${a}x + ${b}. f(${c}) = ?`,a*c+b,`${a}(${c}) + ${b} = ${a*c+b}`,{neg:true});}])(),
  ()=>pick([()=>{const x=R(5,12),y=R(1,4);return numQ(`x + y = ${x+y} and x − y = ${x-y}. x = ?`,x,`Add them: 2x = ${2*x}, so x = ${x}`,{fmt:n=>'x = '+n,x:[y]});},()=>solve(R(3,7),R(2,9),R(1,9))])(),
  ()=>{const p=R(1,6),q=p+R(1,4),S=p+q,P=p*q;const f=(a,b)=>{const t=[a,b].sort((m,n)=>m-n).map(v=>v<0?'−'+(-v):String(v));return `x = ${t[0]} or ${t[1]}`;};return{q:`Solve: x² − ${S}x + ${P} = 0`,a:f(p,q),w:[f(-p,-q),f(p,-q),f(-p,q)],exp:`Factor: (x − ${p})(x − ${q}) = 0`};},
  ()=>pick([()=>{const a=R(2,6);let b=R(2,6);if(a===b)b=a+1;return numQ(`x${sup(a)} · x${sup(b)} = ?`,a+b,`Add the powers: ${a} + ${b} = ${a+b}`,{fmt:n=>'x'+sup(n),x:[a*b]});},()=>{const a=R(2,4),b=R(2,3);return numQ(`(x${sup(a)})${sup(b)} = ?`,a*b,`Multiply the powers: ${a} × ${b} = ${a*b}`,{fmt:n=>'x'+sup(n),x:[a+b]});}])()],
 /* G10 */[
  ()=>{const b=pick([2,3,5,10]),n=R(2,4);return numQ(`log${sub(b)}(${b**n}) = ?`,n,`${b} to the power ${n} = ${b**n}`,{x:[b]});},
  ()=>{const a=R(2,9),d=R(2,6),n=R(5,10);return numQ(`${a}, ${a+d}, ${a+2*d}, … Term ${n} = ?`,a+(n-1)*d,`${a} + ${n-1} × ${d} = ${a+(n-1)*d}`,{x:[a+n*d]});},
  ()=>{const b=R(3,9),c=R(1,6);return numQ(`Discriminant of x² + ${b}x + ${c}?`,b*b-4*c,`${b}² − 4(${c}) = ${b*b-4*c}`,{neg:true,x:[b*b-c,b*b+4*c]});},
  ()=>{const [n,a]=pick([['sin 30°','1/2'],['cos 60°','1/2'],['sin 45°','√2/2'],['cos 30°','√3/2'],['tan 45°','1'],['sin 90°','1']]);return txtQ(`${n} = ?`,a,['1/2','√2/2','√3/2','1','0'],`Special-angle value: ${n} = ${a}`);}]
];
const buildMath=(g,t)=>MATH[g][Math.max(0,Math.min(3,t))]();

const BANK=[
/* K */{
 sci:[["Which one is a solid you can hold?","Rock","Water|Air|Steam","A rock is a solid. It keeps its own shape."],["What do plants need to grow?","Water and sunlight","Candy and soda|Only toys|Darkness only","Plants use water, sunlight, and air to grow."],["Which body part do you use to hear?","Ears","Eyes|Nose|Hands","Ears let us hear sounds."],["Which season is usually the coldest?","Winter","Summer|Spring|Fall","Winter has the coldest weather in most places."]],
 ela:[["Which word rhymes with 'cat'?","Hat","Dog|Cup|Sun","'Cat' and 'hat' both end in the -at sound."],["What letter does 'ball' start with?","B","D|P|T","'Ball' starts with the /b/ sound."],["How many claps (syllables) are in 'banana'?","3","1|2|4","Ba-na-na has three parts."],["What mark goes at the end of a question?","Question mark","Period|Comma|Quotation mark","Questions end with a question mark (?)."]],
 hist:[["Which community helper drives a big red truck and puts out fires?","Firefighter","Mail carrier|Teacher|Baker","Firefighters put out fires and help in emergencies."],["Who is the leader of the United States government?","The President","The mail carrier|The teacher|The doctor","The President leads the country."],["What colors are the stripes on the U.S. flag?","Red and white","Blue and green|Yellow and black|Orange and purple","The flag has red and white stripes."],["Which tool shows a flat picture of places?","Map","Hammer|Spoon|Crayon","A map shows where places are."]],
 fun:[["What animal says 'quack' and swims in ponds?","Duck","Cow|Horse|Pig","Ducks quack and love water."],["How many days are in a week?","7","5|6|10","There are seven days in a week."],["What color do you get when you mix blue and yellow?","Green","Purple|Orange|Brown","Blue plus yellow makes green."],["How many legs does a spider have?","8","6|4|10","Spiders have eight legs."]],
 def:[["Which shape has 3 sides?","Triangle","Circle|Square|Star","A triangle has three sides."],["What is the opposite of 'hot'?","Cold","Big|Fast|Loud","Hot and cold are opposites."],["Which one is a fruit?","Apple","Carrot|Bread|Rice","An apple grows on a tree and is a fruit."],["Which animal says 'moo'?","Cow","Pig|Duck|Cat","Cows say moo."],["What color is the sky on a sunny day?","Blue","Red|Green|Pink","A clear daytime sky looks blue."],["How many fingers are on one hand?","5","3|4|10","One hand has five fingers."]]},
/* G1 */{
 sci:[["Which one is a living thing?","Tree","Rock|Chair|Cloud","Trees grow, need water, and make seeds."],["What do we call frozen water?","Ice","Steam|Mud|Cloud","Water becomes ice when it freezes."],["What do living green plants need from the Sun to make food?","Light","Sand|Wind|Snow","Plants use light to make their food."],["What force pulls things toward the ground?","Gravity","Magnetism|Wind|Friction","Gravity pulls objects down toward Earth."]],
 ela:[["Which word is a noun?","Dog","Run|Happy|Quickly","A noun names a person, place, or thing."],["Which word is the action verb in: 'The happy dog runs fast'?","runs","happy|dog|fast","'Runs' tells what the dog does."],["Which word is the opposite of 'big'?","Small","Tall|Loud|Fast","Big and small are opposites."],["Which word is spelled correctly?","friend","freind|frend|fren","Remember: i before e in 'friend'."]],
 hist:[["Which tool is a round model of the whole Earth?","Globe","Compass|Ruler|Clock","A globe is a 3D model of Earth."],["Which holiday celebrates the nation's independence on July 4?","Independence Day","Thanksgiving|Halloween|Earth Day","July 4 is Independence Day."],["What does a map key (legend) explain?","What the symbols mean","How old the map is|Who drew it|The weather","The key tells what each symbol stands for."],["What is a rule that everyone must follow called?","Law","Toy|Snack|Dream","Laws keep people safe and fair."]],
 fun:[["How many primary colors are there?","3","2|5|7","The primary colors are red, yellow, and blue."],["How many minutes are in one hour?","60","30|100|24","An hour has 60 minutes."],["Which planet do we live on?","Earth","Mars|Venus|Jupiter","We live on planet Earth."],["Which is the largest ocean?","Pacific Ocean","Atlantic Ocean|Indian Ocean|Arctic Ocean","The Pacific is the biggest ocean."]],
 def:[["How many sides does a square have?","4","3|5|6","A square has four equal sides."],["What day comes after Tuesday?","Wednesday","Monday|Thursday|Friday","Wednesday follows Tuesday."],["Which animal is a mammal?","Dog","Frog|Shark|Eagle","Mammals have fur and feed milk to babies."],["What is the first month of the year?","January","March|June|December","The year starts in January."],["Which season comes after winter?","Spring","Summer|Fall|Winter","Spring follows winter."],["Which number is bigger?","9","6|3|They are equal","9 is greater than 6 and 3."]]},
/* G2 */{
 sci:[["Which is a source of light?","The Sun","A rock|A mirror|A cup","The Sun makes its own light."],["What are the three states of matter?","Solid, liquid, gas","Hot, warm, cold|Rock, sand, soil|Ice, snow, hail","Matter is solid, liquid, or gas."],["What happens when the Sun heats liquid water so it becomes invisible vapor?","Evaporation","Freezing|Melting|Condensation","Evaporation turns liquid water into vapor."],["Which animal is an amphibian?","Frog","Snake|Fish|Bat","Frogs live in water and on land."]],
 ela:[["Which word is a compound word?","Sunlight","Beautiful|Running|Happy","Sunlight is 'sun' + 'light'."],["What is the plural of 'mouse'?","Mice","Mouses|Mices|Mouse","Mouse becomes mice."],["Which word means the same as 'big'?","Large","Tiny|Slow|Soft","Big and large are synonyms."],["Which sentence is correct?","She runs to school.","She run to school.|She running to school.|She runned to school.","'She runs' matches the singular subject."]],
 hist:[["What does a compass rose show on a map?","Directions","Weather|Prices|Population","It shows north, south, east, and west."],["Who was the first president of the United States?","George Washington","Abraham Lincoln|Thomas Jefferson|John Adams","George Washington was the first president."],["Which landform is surrounded by water on all sides?","Island","Valley|Mountain|Plain","An island has water all around it."],["Which landform is a high, flat area of land?","Plateau","Valley|Island|Delta","A plateau is elevated with a flat top."]],
 fun:[["Which planet is known as the Red Planet?","Mars","Venus|Saturn|Neptune","Iron oxide makes Mars look red."],["How many continents are there?","7","5|6|8","There are seven continents."],["What is the largest land animal?","African elephant","Giraffe|Hippo|Rhino","The African elephant is the largest on land."],["How many hours are in a day?","24","12|60|48","A day has 24 hours."]],
 def:[["Which animal is a reptile?","Snake","Dog|Frog|Dolphin","Snakes are reptiles."],["How many sides does a hexagon have?","6","5|8|4","Hex means six."],["What do bees make?","Honey","Milk|Silk|Sap","Bees make honey."],["In which direction does the Sun rise?","East","West|North|South","The Sun rises in the east."],["What do we call a baby dog?","Puppy","Kitten|Cub|Calf","A baby dog is a puppy."],["Which month is shortest?","February","April|June|September","February has the fewest days."]]},
/* G3 */{
 sci:[["Which is a producer in a food chain?","Grass","Rabbit|Hawk|Snake","Producers make their own food, like grass."],["What force slows things down when surfaces rub together?","Friction","Gravity|Magnetism|Buoyancy","Friction resists sliding motion."],["In which stage does a caterpillar build a chrysalis?","Pupa","Egg|Larva|Adult","The pupa stage is when the body transforms."],["What is the Sun?","A star","A planet|A moon|A comet","The Sun is a star at the center of our solar system."]],
 ela:[["What is a synonym?","A word with a similar meaning","A word with the opposite meaning|A word that sounds the same|A word that rhymes","Synonyms mean almost the same thing."],["Which word is the adjective in 'The tall tree swayed'?","tall","tree|swayed|The","'Tall' describes the tree."],["What does the prefix 'un-' mean in 'unhappy'?","Not","Again|Before|Very","'Un-' means not."],["What is the contraction of 'do not'?","don't","do'nt|dont'|d'not","The apostrophe replaces the missing 'o'."]],
 hist:[["Which ocean borders the eastern coast of the United States?","Atlantic Ocean","Pacific Ocean|Indian Ocean|Arctic Ocean","The Atlantic is on the east coast."],["What is a map scale used for?","Measuring real distances","Showing directions|Naming the map|Showing colors","Scale compares map distance to real distance."],["Lines of latitude run in which direction?","East to west","North to south|Diagonally|In circles around the poles only","Latitude lines run east-west."],["Which document begins with 'We the People'?","The U.S. Constitution","Declaration of Independence|Bill of Sale|Mayflower Compact","The Constitution opens with 'We the People'."]],
 fun:[["How many sides does an octagon have?","8","6|7|10","Oct means eight."],["Which instrument has black and white keys?","Piano","Violin|Drum|Flute","A piano has black and white keys."],["What is the hardest natural substance?","Diamond","Gold|Iron|Quartz","Diamond is the hardest natural material."],["Which inventor made the first practical light bulb in 1879?","Thomas Edison","Benjamin Franklin|Alexander Bell|Henry Ford","Edison perfected a long-lasting bulb."]],
 def:[["Which tool measures temperature?","Thermometer","Ruler|Scale|Clock","A thermometer measures temperature."],["What is the capital of the United States?","Washington, D.C.","New York City|Los Angeles|Chicago","The capital is Washington, D.C."],["Which word is a verb?","jump","blue|table|soft","Verbs show action."],["What is the opposite of 'ancient'?","Modern","Old|Broken|Dusty","Ancient means very old; modern means new."],["Which plant part takes in water from the soil?","Roots","Leaves|Flower|Seeds","Roots absorb water."],["Which gas do people need to breathe?","Oxygen","Helium|Hydrogen|Carbon dioxide","We breathe in oxygen."]]},
/* G4 */{
 sci:[["Which layer of Earth do we live on?","Crust","Mantle|Outer core|Inner core","The crust is the thin outer layer."],["What is the main energy source for Earth's weather and water cycle?","The Sun","The Moon|Earth's core|Wind","Solar energy drives the water cycle."],["Which rock forms when magma or lava cools and hardens?","Igneous","Sedimentary|Metamorphic|Mineral","Igneous means formed from fire."],["What kind of energy does a moving car have?","Kinetic energy","Nuclear energy|Stored energy|Sound energy","Kinetic energy is energy of motion."]],
 ela:[["Which word is the adverb in 'She quickly ran home'?","quickly","She|ran|home","'Quickly' tells how she ran."],["What is a metaphor?","A comparison without 'like' or 'as'","A comparison using 'like' or 'as'|An exaggeration|A word that imitates a sound","A metaphor says one thing IS another."],["Which device is 'as bright as the morning sun'?","Simile","Metaphor|Idiom|Personification","A simile compares using like or as."],["What does 'it's raining cats and dogs' mean?","It's raining very hard","Animals are falling|It's a light drizzle|The storm is over","It's an idiom for heavy rain."]],
 hist:[["Which Texas city is the state capital?","Austin","Houston|Dallas|San Antonio","Austin is the capital of Texas."],["Which explorer sailed for Spain and reached the Americas in 1492?","Christopher Columbus","Ferdinand Magellan|Marco Polo|Leif Erikson","Columbus sailed in 1492."],["What was the first permanent English colony in North America, founded in 1607?","Jamestown","Plymouth|Roanoke|Boston","Jamestown, Virginia, started in 1607."],["What are the three branches of U.S. government?","Legislative, executive, judicial","Army, navy, air force|Local, state, county|Senate, House, Cabinet","Three branches share power."]],
 fun:[["How many players per team are on the field in soccer?","11","9|10|12","Soccer teams field eleven players."],["Which is the tallest mountain above sea level?","Mount Everest","K2|Denali|Kilimanjaro","Everest is the tallest above sea level."],["Which planet is second largest and famous for its rings?","Saturn","Jupiter|Uranus|Neptune","Saturn is second largest."],["What is the largest living mammal?","Blue whale","African elephant|Orca|Sperm whale","The blue whale is the largest animal ever."]],
 def:[["How many degrees are in a right angle?","90","45|180|360","A right angle is 90 degrees."],["What is it called when water falls as rain or snow?","Precipitation","Evaporation|Condensation|Transpiration","Precipitation is water falling from clouds."],["What is the plural of 'child'?","Children","Childs|Childrens|Childes","Child becomes children."],["Which direction does a compass needle point?","North","South|East|West","Compass needles point toward magnetic north."],["Which continent is Egypt in?","Africa","Asia|Europe|South America","Egypt is in northern Africa."],["What kind of noun names a specific person or place?","Proper noun","Common noun|Adjective|Pronoun","Proper nouns are capitalized."]]},
/* G5 */{
 sci:[["Which is a physical change?","Ice melting","Wood burning|Iron rusting|Milk spoiling","Melting changes form but not the substance."],["Which Earth sphere includes all of its water?","Hydrosphere","Atmosphere|Lithosphere|Biosphere","Hydro means water."],["What process turns carbon dioxide, water, and light into glucose and oxygen?","Photosynthesis","Respiration|Digestion|Decomposition","Plants make food through photosynthesis."],["Which layer at Earth's center is solid iron and nickel?","Inner core","Outer core|Mantle|Crust","The inner core is solid under huge pressure."]],
 ela:[["Which word is a pronoun?","they","table|green|quickly","Pronouns replace nouns."],["What is the main idea of a paragraph?","The most important point","The first sentence|A small detail|The title","The main idea is what it is mostly about."],["What is the central message or lesson of a story?","Theme","Setting|Plot|Character","The theme is the underlying message."],["What is giving human traits to non-human things?","Personification","Hyperbole|Alliteration|Onomatopoeia","'The wind whispered' is personification."]],
 hist:[["Which ship carried the Pilgrims to America in 1620?","Mayflower","Santa Maria|Niña|Titanic","The Pilgrims sailed on the Mayflower."],["Who wrote most of the Declaration of Independence?","Thomas Jefferson","Ben Franklin|George Washington|John Hancock","Jefferson was the main author."],["Which 1776 document declared the colonies independent from Britain?","Declaration of Independence","The Constitution|Bill of Rights|Magna Carta","Adopted July 4, 1776."],["Which 1803 purchase doubled the size of the United States?","Louisiana Purchase","Alaska Purchase|Gadsden Purchase|Texas Annexation","The U.S. bought Louisiana from France."]],
 fun:[["How many sides does a pentagon have?","5","4|6|8","Penta means five."],["Which is the smallest planet in our solar system?","Mercury","Mars|Pluto|Venus","Mercury is the smallest planet."],["Which gas makes up about 78% of Earth's atmosphere?","Nitrogen","Oxygen|Carbon dioxide|Argon","Nitrogen is the most abundant gas in air."],["What is the capital of Canada?","Ottawa","Toronto|Vancouver|Montreal","Ottawa is Canada's capital."]],
 def:[["Which tool measures the volume of a liquid?","Graduated cylinder","Ruler|Thermometer|Balance","A graduated cylinder measures liquid volume."],["Which fraction equals 1/2?","2/4","1/4|2/3|3/4","2/4 simplifies to 1/2."],["Which word means the same as 'enormous'?","Gigantic","Tiny|Ordinary|Fragile","Enormous and gigantic are synonyms."],["Which is a renewable energy source?","Solar power","Coal|Natural gas|Oil","Sunlight does not run out."],["What is the job of red blood cells?","Carry oxygen","Fight germs|Digest food|Send signals","Red blood cells carry oxygen."],["What is the line between two states or countries called?","Border","Delta|Peninsula|Equator","A border separates regions."]]},
/* G6 */{
 sci:[["What is the basic unit of life?","Cell","Atom|Organ|Tissue","All living things are made of cells."],["Which organelle contains chlorophyll?","Chloroplast","Nucleus|Ribosome|Vacuole","Chloroplasts capture light for photosynthesis."],["Which organelle makes ATP energy through cellular respiration?","Mitochondria","Nucleus|Golgi body|Lysosome","Mitochondria are the cell's power plants."],["Which type of heat transfer needs direct contact?","Conduction","Convection|Radiation|Evaporation","Conduction passes heat through touching matter."]],
 ela:[["What is the purpose of persuasive writing?","To convince the reader","To entertain|To describe a place|To list facts only","Persuasive writing argues a position."],["The root 'tele' (as in telephone) means what?","Far","Near|Sound|Write","Tele means far."],["The Latin root 'bene' (benefit, benevolent) means what?","Good / well","Bad|Many|Over","Bene means good or well."],["What is the author's attitude toward a subject called?","Tone","Plot|Setting|Rhyme","Tone is the author's attitude."]],
 hist:[["On which river did ancient Egyptian civilization develop?","Nile River","Tigris River|Indus River|Yellow River","Egypt grew along the Nile."],["Which ancient civilization built the Colosseum?","Rome","Greece|Egypt|Persia","The Romans built the Colosseum."],["Which civilization arose between the Tigris and Euphrates Rivers?","Mesopotamia","Egypt|Rome|Phoenicia","Mesopotamia means 'between the rivers'."],["What is government by a king or queen called?","Monarchy","Democracy|Republic|Oligarchy","A monarchy is ruled by a monarch."]],
 fun:[["Which planet is closest to the Sun?","Mercury","Venus|Earth|Mars","Mercury orbits closest to the Sun."],["What is the chemical formula for water?","H₂O","CO₂|O₂|NaCl","Two hydrogen atoms and one oxygen atom."],["How many bones are in an adult human skeleton?","206","106|306|156","Adults have 206 bones."],["Which ocean holds the Mariana Trench?","Pacific Ocean","Atlantic Ocean|Indian Ocean|Arctic Ocean","The deepest trench is in the Pacific."]],
 def:[["25% as a fraction?","1/4","1/2|1/5|2/5","25 out of 100 is 1/4."],["In which atmosphere layer does weather happen?","Troposphere","Stratosphere|Mesosphere|Thermosphere","The troposphere is the lowest layer."],["What is a word with the opposite meaning called?","Antonym","Synonym|Homonym|Acronym","Antonyms are opposites."],["What is the largest organ of the human body?","Skin","Heart|Liver|Lungs","Skin covers the whole body."],["Which Greek city-state is the birthplace of democracy?","Athens","Sparta|Corinth|Thebes","Athens developed early democracy."],["Mean of 2, 4, 6?","4","3|6|12","(2+4+6) ÷ 3 = 4."]]},
/* G7 */{
 sci:[["What is the smallest unit of an element that keeps its properties?","Atom","Molecule|Cell|Electron","An atom is the basic unit of an element."],["Which is a chemical change?","Burning wood","Melting ice|Cutting paper|Boiling water","Burning makes new substances."],["What drives the movement of tectonic plates?","Mantle convection currents","Ocean tides|Wind|The Moon's gravity","Heat-driven currents in the mantle move the plates."],["What does DNA stand for?","Deoxyribonucleic acid","Dioxynitrogen acid|Dynamic nuclear acid|Dual nucleotide acid","DNA carries genetic instructions."]],
 ela:[["What type of word is 'and' in 'salt and pepper'?","Conjunction","Preposition|Adverb|Pronoun","Conjunctions join words."],["Which point of view uses 'I' and 'we'?","First person","Second person|Third person limited|Omniscient","First person is told by a character."],["Which fallacy attacks a person's character instead of their argument?","Ad hominem","Straw man|Bandwagon|False dilemma","Ad hominem means 'to the person'."],["What is an allusion?","A reference to a well-known person, place, or work","A repeated consonant sound|A direct comparison|An exaggeration","Allusions point to famous works or events."]],
 hist:[["What were the armored warriors of medieval Europe called?","Knights","Samurai|Pharaohs|Senators","Knights served feudal lords."],["Which 1215 document limited the power of the English king?","Magna Carta","Bill of Rights|Domesday Book|Mayflower Compact","King John signed Magna Carta."],["Which trade network linked East Asia with the Mediterranean?","The Silk Road","The Spice Coast|The Amber Road|The Oregon Trail","The Silk Road moved goods and ideas."],["Which period of 'rebirth' in art and learning began in Italy?","Renaissance","Reformation|Enlightenment|Industrial Revolution","Renaissance means rebirth."]],
 fun:[["Which is the largest planet?","Jupiter","Saturn|Neptune|Earth","Jupiter is the largest planet."],["Who painted the Mona Lisa?","Leonardo da Vinci","Michelangelo|Raphael|Van Gogh","Leonardo painted it in the early 1500s."],["What is the chemical symbol for gold?","Au","Go|Gd|Ag","Au comes from the Latin 'aurum'."],["About how fast does light travel?","300,000 km/s","30,000 km/s|3,000 km/s|3,000,000 km/s","Light moves about 300,000 kilometers per second."]],
 def:[["−3 + 7 = ?","4","−4|10|−10","Start at −3 and move up 7."],["Which is a prime number?","13","15|21|27","13 has only two factors: 1 and 13."],["What does a thesaurus list?","Synonyms","Maps|Rhymes only|Recipes","A thesaurus gives words with similar meanings."],["Which cell part controls the cell's activities?","Nucleus","Ribosome|Vacuole|Cell wall","The nucleus is the control center."],["On which continent is the Sahara Desert?","Africa","Asia|Australia|South America","The Sahara covers northern Africa."],["Which gas from burning fossil fuels traps heat in the atmosphere?","Carbon dioxide","Oxygen|Helium|Nitrogen","CO₂ is a greenhouse gas."]]},
/* G8 */{
 sci:[["What is the SI unit of force?","Newton","Joule|Watt|Pascal","Force is measured in newtons."],["What is the pH of a neutral solution?","7","0|10|14","Pure water is neutral at pH 7."],["What is the process of plants releasing water vapor through stomata?","Transpiration","Evaporation|Condensation|Respiration","Transpiration is part of the water cycle."],["Which bond forms when atoms share electrons?","Covalent bond","Ionic bond|Gravitational bond|Magnetic bond","Covalent bonds share electron pairs."]],
 ela:[["Which sentence uses 'their' correctly?","Their dog barked loudly.","Their going to the store.|The book is over their.|Their is a cat outside.","'Their' shows possession."],["Who is the main character's opponent called?","Antagonist","Protagonist|Narrator|Foil","The antagonist opposes the protagonist."],["Which sentence has a dangling modifier?","Walking to the store, my hat blew off in the wind.","Walking to the store, I lost my hat.|After lunch, we took a walk.|Running quickly, Mia caught the bus.","The hat wasn't walking; the modifier doesn't match the subject."],["Which device is 'jumbo shrimp'?","Oxymoron","Simile|Personification|Alliteration","Contradictory words together form an oxymoron."]],
 hist:[["Who was U.S. president during the Civil War?","Abraham Lincoln","Ulysses S. Grant|Andrew Jackson|Thomas Jefferson","Lincoln led the Union."],["Which amendment abolished slavery?","13th Amendment","1st Amendment|19th Amendment|26th Amendment","Ratified in 1865."],["Which 1863 order freed enslaved people in Confederate states?","Emancipation Proclamation","Homestead Act|Bill of Rights|Missouri Compromise","Lincoln issued it on January 1, 1863."],["Which 1803 case established judicial review?","Marbury v. Madison","Brown v. Board|Plessy v. Ferguson|Dred Scott v. Sandford","The Court claimed power to strike down laws."]],
 fun:[["What is the capital of France?","Paris","Lyon|Marseille|Nice","Paris is France's capital."],["Which element has the symbol O?","Oxygen","Gold|Osmium|Iron","O is oxygen."],["Who developed the Special Theory of Relativity in 1905?","Albert Einstein","Isaac Newton|Niels Bohr|Max Planck","Einstein published it in 1905."],["Who proposed evolution by natural selection?","Charles Darwin","Gregor Mendel|Louis Pasteur|Isaac Newton","Darwin published On the Origin of Species."]],
 def:[["√81 = ?","9","8|18|7","9 × 9 = 81."],["2³ = ?","8","6|9|5","2 × 2 × 2 = 8."],["Which law says every action has an equal and opposite reaction?","Newton's Third Law","Newton's First Law|Law of Gravity|Ohm's Law","That is Newton's Third Law."],["Which organ system includes the heart and blood vessels?","Circulatory system","Digestive system|Nervous system|Respiratory system","The circulatory system moves blood."],["What was the U.S.–Soviet rivalry after World War II called?","The Cold War","The Civil War|World War I|The Great Depression","Both sides avoided direct war."],["What do you call words that sound alike but differ in meaning, like 'their' and 'there'?","Homophones","Synonyms|Antonyms|Acronyms","Homophones sound the same."]]},
/* G9 */{
 sci:[["What is the electric charge of a proton?","Positive","Negative|Neutral|It varies","Protons are positive."],["Which kind of reaction releases heat?","Exothermic","Endothermic|Isothermal|Catalytic","Exothermic reactions give off energy."],["By Newton's Second Law, what acceleration does a 50 N net force cause on a 10 kg object?","5 m/s²","0.5 m/s²|50 m/s²|500 m/s²","a = F/m = 50 ÷ 10 = 5."],["Which organelle is the site of protein synthesis?","Ribosome","Lysosome|Golgi apparatus|Nucleolus","Ribosomes build proteins."]],
 ela:[["What is the turning point of a story called?","Climax","Exposition|Resolution|Denouement","The climax is the peak of tension."],["What is irony?","A contrast between expectation and reality","Repeated initial sounds|A direct comparison|A long speech","Irony hinges on the unexpected."],["Which term names an extended narrative whose characters and events symbolize larger ideas?","Allegory","Satire|Soliloquy|Foreshadowing","An allegory carries a hidden meaning."],["Which is an example of verbal irony?","Saying 'Great weather!' during a storm","A fire station burning down|A reader knowing a secret|Describing wind as a whisper","Verbal irony says the opposite of what is meant."]],
 hist:[["Which ancient civilization built the Parthenon?","Ancient Greece","Rome|Egypt|Persia","The Parthenon is in Athens."],["Which revolution began in France in 1789?","French Revolution","Russian Revolution|Glorious Revolution|American Revolution","It began with the storming of the Bastille."],["Which treaty ended World War I with Germany?","Treaty of Versailles","Treaty of Paris|Treaty of Ghent|Treaty of Tordesillas","Signed in 1919."],["What was the goal of Cold War 'containment'?","Stopping the spread of communism","Expanding trade with Asia|Building a bigger navy|Ending the space race","Containment aimed to limit communism."]],
 fun:[["Which country is largest by area?","Russia","Canada|China|United States","Russia is the largest country."],["What is the capital of Australia?","Canberra","Sydney|Melbourne|Perth","Canberra is the capital."],["Who patented the first practical telephone in 1876?","Alexander Graham Bell","Thomas Edison|Nikola Tesla|Guglielmo Marconi","Bell received the patent in 1876."],["What is Avogadro's number, approximately?","6.022 × 10²³","3.14 × 10⁸|9.81 × 10⁰|1.6 × 10⁻¹⁹","One mole contains about 6.022 × 10²³ particles."]],
 def:[["What is the slope of y = 3x + 2?","3","2|5|−3","In y = mx + b, the slope is m."],["Which gas is most abundant in Earth's atmosphere?","Nitrogen","Oxygen|Argon|Carbon dioxide","Nitrogen is about 78%."],["What is π to two decimal places?","3.14","3.41|3.12|2.71","π ≈ 3.14159."],["Which type of rock is marble?","Metamorphic","Igneous|Sedimentary|Volcanic","Limestone becomes marble under heat and pressure."],["Who wrote 'Romeo and Juliet'?","William Shakespeare","Charles Dickens|Mark Twain|Jane Austen","Shakespeare wrote it in the 1590s."],["What does GDP measure?","Total value of goods and services produced","Population growth|National debt|Tax rates","Gross Domestic Product."]]},
/* G10 */{
 sci:[["How many valence electrons do noble gases like neon and argon have?","8","2|4|6","A full outer shell makes them stable."],["What is the rate of change of velocity?","Acceleration","Speed|Momentum|Displacement","Acceleration is change in velocity over time."],["Which molecule carries amino acids to the ribosome?","tRNA","mRNA|rRNA|DNA","Transfer RNA delivers amino acids."],["What is the SI unit of electrical resistance?","Ohm","Volt|Ampere|Watt","Resistance is measured in ohms (Ω)."]],
 ela:[["What is a thesis statement?","The central claim of an essay","A summary of sources|The concluding sentence|A quotation","The thesis states the main argument."],["What is an unreliable narrator?","A narrator whose account cannot be fully trusted","A minor character narrating|A third-person narrator|A narrator with a long memory","Readers must question what they are told."],["Which rhetorical appeal uses logic and evidence?","Logos","Ethos|Pathos|Kairos","Logos appeals to reason."],["Which poetic form has 14 lines?","Sonnet","Haiku|Limerick|Ode","A sonnet has fourteen lines."]],
 hist:[["Which war began in 1914 after the assassination of Archduke Franz Ferdinand?","World War I","World War II|The Cold War|The Crimean War","The assassination triggered a chain of alliances."],["What was the New Deal?","Roosevelt's programs to fight the Great Depression","A treaty ending WWI|A civil rights law|A plan to rebuild Europe","FDR's programs offered relief, recovery, and reform."],["Which amendment guaranteed women the right to vote?","19th Amendment","15th Amendment|18th Amendment|21st Amendment","Ratified in 1920."],["Which 1948 program gave aid to rebuild Western Europe?","Marshall Plan","Truman Doctrine|New Deal|Lend-Lease","The Marshall Plan sent billions in aid."]],
 fun:[["What is the chemical symbol for sodium?","Na","So|S|Sd","Na comes from the Latin 'natrium'."],["Who is credited with discovering penicillin in 1928?","Alexander Fleming","Louis Pasteur|Marie Curie|Jonas Salk","Fleming noticed mold killing bacteria."],["About how old is Earth?","4.5 billion years","450 million years|45 billion years|4.5 million years","Earth formed about 4.5 billion years ago."],["What does CPU stand for?","Central Processing Unit","Central Program Utility|Computer Power Unit|Core Processing Update","The CPU runs a computer's instructions."]],
 def:[["What is the sum of a triangle's interior angles?","180°","90°|270°|360°","Always 180 degrees."],["Which process divides a cell into two identical cells?","Mitosis","Meiosis|Osmosis|Diffusion","Mitosis makes identical copies."],["Which organ produces insulin?","Pancreas","Liver|Kidney|Stomach","The pancreas makes insulin."],["Who wrote the novel '1984'?","George Orwell","Aldous Huxley|Ray Bradbury|F. Scott Fitzgerald","Orwell published it in 1949."],["Which document set up the framework of U.S. government in 1787?","The Constitution","Articles of Confederation|Bill of Rights|Declaration of Independence","Drafted in Philadelphia in 1787."],["log₁₀(1000) = ?","3","2|10|100","10³ = 1000."]]}
];

/* ============================ roster import (CSV / pasted text / Excel) ============================ */
function parseCSV(text){
  const rows=[];let row=[],cell='',q=false;
  const first=text.split(/\r?\n/).find(l=>l.trim())||'';
  const cnt={'\t':0,',':0,';':0};for(const ch of first)if(ch in cnt)cnt[ch]++;
  let delim=',',best=0;for(const d of ['\t',',',';'])if(cnt[d]>best){best=cnt[d];delim=d;}
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(q){if(ch==='"'){if(text[i+1]==='"'){cell+='"';i++;}else q=false;}else cell+=ch;}
    else if(ch==='"')q=true;
    else if(ch===delim){row.push(cell);cell='';}
    else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}
    else cell+=ch;
  }
  row.push(cell);rows.push(row);
  return rows.map(r=>r.map(c=>c.trim())).filter(r=>r.some(c=>c));
}
const cleanName=s=>String(s||'').replace(/\s+/g,' ').trim();
const TEAM_HEAD=/^(team|group|squad|crew|table)(\s*(name|#|no\.?|number))?$/i;
const NAME_HEAD=/^(name|student|student name|full name|member|members|player|kid|child|scholar)$/i;
const FIRST_HEAD=/^(first|first name|given|given name|firstname)$/i;
const LAST_HEAD=/^(last|last name|surname|family name|lastname)$/i;

/* returns {mode:'groups'|'list', groups:[{name,members[]}], names:[...], note} */
function parseRoster(text){
  text=String(text||'').replace(/^﻿/,'');
  if(!text.trim())return{mode:'list',groups:[],names:[],note:'Nothing to read yet.'};
  /* blocks separated by blank lines = groups (title line optional) */
  if(/\n\s*\n/.test(text.trim())&&!/[,\t;]/.test(text)){
    const blocks=text.trim().split(/\n\s*\n/).map(b=>b.split(/\r?\n/).map(cleanName).filter(Boolean)).filter(b=>b.length);
    if(blocks.length>=2){
      const groups=blocks.map(b=>{const t=/^(team|group|squad|crew)\b/i.test(b[0])||/:$/.test(b[0]);return t?{name:b[0].replace(/:$/,''),members:b.slice(1)}:{name:'',members:b};});
      return{mode:'groups',groups,names:groups.flatMap(g=>g.members),note:'Groups read from blank-line breaks.'};
    }
  }
  const rows=parseCSV(text);
  if(!rows.length)return{mode:'list',groups:[],names:[],note:'Nothing to read yet.'};
  const head=rows[0].map(c=>c.toLowerCase());
  const ti=head.findIndex(c=>TEAM_HEAD.test(c)),ni=head.findIndex(c=>NAME_HEAD.test(c)),fi=head.findIndex(c=>FIRST_HEAD.test(c)),li=head.findIndex(c=>LAST_HEAD.test(c));
  const hasHeader=ti>=0||ni>=0||fi>=0;
  const body=hasHeader?rows.slice(1):rows;
  const nameOf=r=>{
    if(fi>=0&&li>=0)return cleanName((r[fi]||'')+' '+(r[li]||''));
    if(fi>=0)return cleanName(r[fi]);
    if(ni>=0)return cleanName(r[ni]);
    return null;
  };
  /* long format: one student per row with a team column */
  if(ti>=0&&(ni>=0||fi>=0)){
    const map=new Map();
    body.forEach(r=>{const t=cleanName(r[ti]),n=nameOf(r);if(!n)return;const k=t||'(no team)';if(!map.has(k))map.set(k,[]);map.get(k).push(n);});
    const groups=[...map].map(([name,members])=>({name:name==='(no team)'?'':name,members}));
    return{mode:'groups',groups,names:groups.flatMap(g=>g.members),note:`Found ${groups.length} group${groups.length===1?'':'s'} in the file.`};
  }
  /* wide format: team name then members across the row */
  if(ti>=0){
    const groups=body.map(r=>({name:cleanName(r[ti]),members:r.filter((c,i)=>i!==ti&&cleanName(c)).map(cleanName)})).filter(g=>g.name||g.members.length);
    return{mode:'groups',groups,names:groups.flatMap(g=>g.members),note:`Found ${groups.length} group${groups.length===1?'':'s'} in the file.`};
  }
  /* no header: if the first column repeats, it is a team column */
  if(!hasHeader&&body.length&&body.every(r=>r.length>=2)){
    const col=body.map(r=>cleanName(r[0]));
    if(new Set(col).size<col.length){
      const map=new Map();
      body.forEach(r=>{const t=cleanName(r[0]),n=cleanName(r.slice(1).filter(Boolean).join(' '));if(!n)return;if(!map.has(t))map.set(t,[]);map.get(t).push(n);});
      const groups=[...map].map(([name,members])=>({name,members}));
      return{mode:'groups',groups,names:groups.flatMap(g=>g.members),note:`Found ${groups.length} group${groups.length===1?'':'s'} in the file.`};
    }
  }
  /* plain list of students */
  let names;
  if(hasHeader)names=body.map(r=>nameOf(r)||cleanName(r[0])).filter(Boolean);
  else names=body.map(r=>cleanName(r.filter(Boolean).join(' '))).filter(Boolean);
  const seen=new Set();names=names.filter(n=>{const k=n.toLowerCase();if(seen.has(k))return false;seen.add(k);return true;});
  return{mode:'list',groups:[],names,note:`Found ${names.length} student${names.length===1?'':'s'}.`};
}
/* split a list into k balanced groups (shuffled) */
function splitGroups(names,k,doShuffle=true){
  k=Math.max(1,Math.min(k,names.length||1));
  const list=doShuffle?shuffle(names):names.slice();
  const groups=Array.from({length:k},()=>[]);
  list.forEach((n,i)=>groups[i%k].push(n));
  return groups;
}

/* ============================ sound: built-in synth + your own uploads ============================ */
const SOUND_SLOTS=[
 {key:'fire',label:'Cannon fire',hint:'A square is chosen'},
 {key:'hit',label:'Hit',hint:'A ship takes a hit'},
 {key:'miss',label:'Miss',hint:'Shot lands in open water'},
 {key:'deflect',label:'Deflected',hint:'A shield blocks damage'},
 {key:'sunk',label:'Ship sunk',hint:'A ship goes down'},
 {key:'correct',label:'Correct answer',hint:'Right answer'},
 {key:'wrong',label:'Wrong answer',hint:'Wrong answer or time out'},
 {key:'win',label:'Victory',hint:'A squad wins'}
];
const Snd=(()=>{
  let ctx=null,master=null,noiseBuf=null,vol=.85,on=true,db=null,persist=true;
  const custom={},playing={};
  const MAXCLIP=6000;
  function ensure(){
    if(!ctx){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
      ctx=new AC();master=ctx.createGain();master.gain.value=vol;master.connect(ctx.destination);
      noiseBuf=ctx.createBuffer(1,ctx.sampleRate*1.5,ctx.sampleRate);
      const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    }
    if(ctx.state==='suspended')ctx.resume();
    return ctx;
  }
  const T=()=>ctx.currentTime;
  function osc(type,f0,f1,t0,dur,v,atk=.01){
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(f0,t0);
    if(f1&&f1!==f0)o.frequency.exponentialRampToValueAtTime(Math.max(1,f1),t0+dur);
    g.gain.setValueAtTime(.0001,t0);g.gain.exponentialRampToValueAtTime(v,t0+atk);g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
    o.connect(g);g.connect(master);o.start(t0);o.stop(t0+dur+.05);
  }
  function noise(t0,dur,v,type='lowpass',f0=2000,f1=200,q=1){
    const s=ctx.createBufferSource();s.buffer=noiseBuf;
    const f=ctx.createBiquadFilter();f.type=type;f.Q.value=q;
    f.frequency.setValueAtTime(f0,t0);f.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t0+dur);
    const g=ctx.createGain();g.gain.setValueAtTime(v,t0);g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
    s.connect(f);f.connect(g);g.connect(master);s.start(t0,Math.random()*.4);s.stop(t0+dur+.05);
  }
  function boom(t,size=1){
    noise(t,.95*size,.9,'lowpass',2400,50,.7);
    osc('sine',150,26,t,.85*size,1);
    noise(t+.015,.35,.4,'highpass',4200,900,.8);
    osc('sawtooth',90,30,t,.5*size,.22);
  }
  const synth={
    click:()=>{const t=T();osc('square',760,520,t,.05,.07);},
    tick:()=>{const t=T();osc('square',1100,1100,t,.04,.08);},
    pick:()=>{const t=T();noise(t,.28,.28,'bandpass',350,2600,2);osc('sine',380,920,t,.22,.12);},
    surge:()=>{const t=T();osc('sawtooth',180,1700,t,.75,.12,.05);[784,988,1175,1568].forEach((f,i)=>osc('triangle',f,f,t+.5+i*.07,.3,.12));},
    fire:()=>{const t=T();noise(t,.28,.55,'lowpass',3200,260,.9);osc('square',230,48,t,.26,.28);},
    hit:()=>{boom(T(),1);},
    sunk:()=>{const t=T();boom(t,1.5);boom(t+.28,1);osc('sine',520,110,t+.55,1,.16,.05);osc('triangle',330,60,t+.7,1,.12,.05);for(let i=0;i<5;i++)osc('sine',300+Math.random()*500,100,t+.9+i*.11,.12,.08);},
    miss:()=>{const t=T();noise(t,.55,.4,'bandpass',1500,450,2);osc('sine',640,170,t+.04,.26,.22);},
    deflect:()=>{const t=T();osc('sine',1320,1320,t,.6,.22);osc('sine',1760,1760,t,.42,.16);osc('sine',2640,2640,t,.25,.09);osc('square',320,1700,t,.12,.07);noise(t,.1,.2,'highpass',5000,3000);},
    correct:()=>{const t=T();[523,659,784,1047].forEach((f,i)=>osc('triangle',f,f,t+i*.075,.22,.15));osc('sine',2093,2093,t+.3,.3,.06);},
    wrong:()=>{const t=T();osc('sawtooth',190,95,t,.34,.2);osc('sawtooth',150,70,t+.17,.42,.2);},
    error:()=>{const t=T();osc('square',140,100,t,.18,.1);},
    win:()=>{const t=T();[523,659,784,1047,784,1047,1319].forEach((f,i)=>osc('triangle',f,f,t+i*.14,.3,.16));osc('sawtooth',262,262,t,1.2,.05);}
  };
  function stopClip(k){const a=playing[k];if(a){try{a.pause();}catch(e){}delete playing[k];}}
  function play(k){
    if(!on)return;
    const c=custom[k];
    if(c){
      stopClip(k);
      try{const a=new Audio(c.url);a.volume=Math.min(1,vol);playing[k]=a;a.play().catch(()=>{});setTimeout(()=>{if(playing[k]===a)stopClip(k);},MAXCLIP);}catch(e){}
      return;
    }
    try{if(!ensure())return;(synth[k]||synth.click)();}catch(e){}
  }
  /* ---- uploads are kept in IndexedDB so they survive a reload on the same browser ---- */
  function open(){
    return new Promise(res=>{
      try{
        const rq=indexedDB.open('kq-arena-sounds',1);
        rq.onupgradeneeded=()=>rq.result.createObjectStore('clips');
        rq.onsuccess=()=>{db=rq.result;res(true);};
        rq.onerror=()=>{persist=false;res(false);};
      }catch(e){persist=false;res(false);}
    });
  }
  function tx(mode,fn){
    return new Promise(res=>{
      if(!db){res(null);return;}
      try{const t=db.transaction('clips',mode),s=t.objectStore('clips');const r=fn(s);t.oncomplete=()=>res(r&&r.result!==undefined?r.result:true);t.onerror=()=>res(null);}catch(e){res(null);}
    });
  }
  async function load(){
    await open();
    if(!db)return;
    for(const s of SOUND_SLOTS){
      const rec=await tx('readonly',st=>st.get(s.key));
      if(rec&&rec.blob){custom[s.key]={name:rec.name,url:URL.createObjectURL(rec.blob)};}
    }
  }
  async function setClip(k,file){
    if(!file)return{ok:false,msg:'No file chosen.'};
    if(!/^audio\//.test(file.type)&&!/\.(mp3|wav|ogg|m4a|aac|webm)$/i.test(file.name))return{ok:false,msg:'That file is not a sound. Try an MP3, WAV or OGG.'};
    if(file.size>6*1024*1024)return{ok:false,msg:'That file is over 6 MB. Pick a shorter clip.'};
    if(custom[k])URL.revokeObjectURL(custom[k].url);
    custom[k]={name:file.name,url:URL.createObjectURL(file)};
    let saved=false;
    if(db)saved=!!(await tx('readwrite',st=>st.put({name:file.name,blob:file},k)));
    return{ok:true,saved};
  }
  async function clearClip(k){
    stopClip(k);
    if(custom[k]){URL.revokeObjectURL(custom[k].url);delete custom[k];}
    if(db)await tx('readwrite',st=>st.delete(k));
  }
  return{
    play,load,setClip,clearClip,
    clipName:k=>custom[k]?custom[k].name:null,
    unlock:()=>{try{ensure();}catch(e){}},
    get on(){return on;},set on(v){on=!!v;if(!on)Object.keys(playing).forEach(stopClip);},
    get vol(){return vol;},set vol(v){vol=Math.max(0,Math.min(1,v));if(master)master.gain.value=vol;},
    get persists(){return !!db;}
  };
})();

/* ============================ effects: explosions, splashes, shields, confetti ============================ */
const FX=(()=>{
  const cv=document.getElementById('fx'),cx=cv.getContext('2d');
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  let ps=[],raf=0,last=0;
  const rnd=(a,b)=>a+Math.random()*(b-a);
  function fit(){cv.width=innerWidth;cv.height=innerHeight;}
  fit();addEventListener('resize',fit);
  function add(p){ps.push(Object.assign({vx:0,vy:0,g:0,drag:1,size:4,grow:0,rot:0,vr:0,alpha:1,delay:0,age:0,life:1,shape:'dot',color:'#fff'},p));if(!raf){last=performance.now();raf=requestAnimationFrame(tick);}}
  function tick(now){
    const dt=Math.min(.05,(now-last)/1000);last=now;
    cx.clearRect(0,0,cv.width,cv.height);
    ps=ps.filter(p=>{
      if(p.delay>0){p.delay-=dt;return true;}
      p.age+=dt;if(p.age>=p.life)return false;
      p.vy+=p.g*dt;p.vx*=Math.pow(p.drag,dt*60);p.vy*=Math.pow(p.drag,dt*60);
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;p.size+=p.grow*dt;
      const k=p.age/p.life,a=p.alpha*(1-k*k);
      cx.save();cx.globalAlpha=Math.max(0,a);cx.translate(p.x,p.y);
      if(p.shape==='dot'){cx.fillStyle=p.color;cx.beginPath();cx.arc(0,0,Math.max(.1,p.size*(1-k*.5)),0,6.283);cx.fill();}
      else if(p.shape==='smoke'){cx.fillStyle=p.color;cx.beginPath();cx.arc(0,0,Math.max(.1,p.size),0,6.283);cx.fill();}
      else if(p.shape==='ring'){cx.strokeStyle=p.color;cx.lineWidth=Math.max(1,p.width*(1-k));cx.beginPath();cx.arc(0,0,Math.max(.1,p.size),0,6.283);cx.stroke();}
      else if(p.shape==='spark'){cx.strokeStyle=p.color;cx.lineWidth=p.width||3;cx.lineCap='round';const l=Math.hypot(p.vx,p.vy)*.045;const a2=Math.atan2(p.vy,p.vx);cx.beginPath();cx.moveTo(0,0);cx.lineTo(-Math.cos(a2)*l,-Math.sin(a2)*l);cx.stroke();}
      else if(p.shape==='rect'){cx.rotate(p.rot);cx.fillStyle=p.color;cx.fillRect(-p.size/2,-p.size/4,p.size,p.size/2);}
      else if(p.shape==='flash'){const gr=cx.createRadialGradient(0,0,0,0,0,p.size);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,p.color);gr.addColorStop(1,'rgba(255,120,0,0)');cx.fillStyle=gr;cx.beginPath();cx.arc(0,0,p.size,0,6.283);cx.fill();}
      cx.restore();
      return true;
    });
    if(ps.length)raf=requestAnimationFrame(tick);else{raf=0;cx.clearRect(0,0,cv.width,cv.height);}
  }
  const FIRE=['#FFF3B0','#FFC62E','#FF8B2B','#FF4D5A','#FFFFFF'];
  function blast(x,y,s=1,delay=0){
    add({x,y,shape:'flash',size:90*s,grow:60*s,life:.35,color:'#FFC62E',delay});
    add({x,y,shape:'ring',size:10,grow:260*s,width:8*s,life:.5,color:'#FFF3B0',delay});
    for(let i=0;i<Math.round(26*s);i++){const a=rnd(0,6.283),v=rnd(120,520)*s;add({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,shape:'spark',width:rnd(2,5),g:420,drag:.97,life:rnd(.4,.9),color:FIRE[i%FIRE.length],delay});}
    for(let i=0;i<Math.round(9*s);i++){const a=rnd(0,6.283),v=rnd(20,130)*s;add({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-40,shape:'smoke',size:rnd(10,22)*s,grow:rnd(18,40),color:i%2?'#3a4558':'#56627a',alpha:.55,drag:.96,life:rnd(.8,1.5),delay:delay+.05});}
    for(let i=0;i<Math.round(8*s);i++){const a=rnd(-3.4,-.2),v=rnd(160,420)*s;add({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,shape:'dot',size:rnd(2,4),g:900,life:rnd(.6,1.1),color:i%2?'#10264A':'#FF8B2B',delay});}
  }
  return{
    hit(x,y){if(reduce){add({x,y,shape:'flash',size:80,life:.25,color:'#FFC62E'});return;}blast(x,y,1);},
    sunk(x,y){if(reduce){add({x,y,shape:'flash',size:140,life:.4,color:'#FF4D5A'});return;}blast(x,y,1.7);blast(x-30,y+10,1,.18);blast(x+34,y-8,1,.34);},
    splash(x,y){
      if(reduce)return;
      for(let i=0;i<3;i++)add({x,y,shape:'ring',size:6,grow:90+i*30,width:5-i,life:.7+i*.12,color:'#FFFFFF',delay:i*.1,alpha:.9});
      for(let i=0;i<18;i++){const a=rnd(-2.9,-.25),v=rnd(120,340);add({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,shape:'dot',size:rnd(2,5),g:900,life:rnd(.5,.9),color:i%3?'#BFEAFF':'#FFFFFF'});}
    },
    shield(x,y){
      if(reduce){add({x,y,shape:'ring',size:30,width:6,life:.4,color:'#7FE9FF'});return;}
      for(let i=0;i<3;i++)add({x,y,shape:'ring',size:14,grow:230+i*70,width:9-i*2,life:.55+i*.1,color:i%2?'#FFFFFF':'#7FE9FF',delay:i*.07});
      for(let i=0;i<20;i++){const a=rnd(0,6.283),v=rnd(100,360);add({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,shape:'spark',width:3,drag:.95,life:rnd(.35,.7),color:i%2?'#7FE9FF':'#FFFFFF'});}
    },
    confetti(x,y,n=60,cols){
      if(reduce)return;cols=cols||['#FF4D5A','#2F8CFF','#26C46B','#FFC62E','#9B5DF5','#FF8B2B'];
      for(let i=0;i<n;i++){const a=rnd(-2.6,-.55),v=rnd(280,760);add({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,shape:'rect',size:rnd(7,13),g:820,drag:.985,rot:rnd(0,6),vr:rnd(-9,9),life:rnd(1.4,2.4),color:cols[i%cols.length]});}
    },
    rain(ms=3500,cols){
      if(reduce)return;cols=cols||['#FF4D5A','#2F8CFF','#26C46B','#FFC62E','#9B5DF5','#FF8B2B'];
      const t0=performance.now();
      (function drip(){const n=Math.round(innerWidth/90);for(let i=0;i<n;i++)add({x:rnd(0,innerWidth),y:-12,vx:rnd(-60,60),vy:rnd(120,260),shape:'rect',size:rnd(8,14),g:90,rot:rnd(0,6),vr:rnd(-7,7),life:rnd(2.4,3.6),color:cols[Math.floor(Math.random()*cols.length)]});if(performance.now()-t0<ms)setTimeout(drip,170);})();
    },
    fireworks(n=7){
      if(reduce)return;
      for(let k=0;k<n;k++)setTimeout(()=>{const x=rnd(innerWidth*.15,innerWidth*.85),y=rnd(innerHeight*.15,innerHeight*.5),c=pick(VIVID);
        add({x,y,shape:'ring',size:8,grow:200,width:5,life:.6,color:c});
        for(let i=0;i<36;i++){const a=i/36*6.283,v=rnd(160,330);add({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,shape:'spark',width:3,g:160,drag:.96,life:rnd(.8,1.3),color:i%3?c:'#FFFFFF'});}
      },k*420);
    },
    shake(el){if(reduce||!el)return;el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake');setTimeout(()=>el.classList.remove('shake'),520);},
    center(el){const r=el.getBoundingClientRect();return[r.left+r.width/2,r.top+r.height/2];}
  };
})();

