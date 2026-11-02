/* ============================ Battleship Jeopardy v2: app ============================ */
"use strict";

/* ---------- helpers ---------- */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store={
  get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){return false;}},
  del(k){try{localStorage.removeItem(k);}catch(e){}}
};

/* ---------- board: 5 categories x 5 rows (100 to 500) ---------- */
const ROWS=5;
const CATS=[
  {key:'math',name:'Math'},
  {key:'sci',name:'Science'},
  {key:'ela',name:'Language Arts'},
  {key:'hist',name:'History & Geography'},
  {key:'fun',name:'Bonus Trivia'}
];
const TILES=CATS.length*ROWS;
/* difficulty ladder per row: [grade offset, tier]. 100 = prerequisite from a grade below, 500 = preview of the next grade up */
const LADDER=[[-1,1],[0,0],[0,2],[0,3],[1,1]];
function getQuestion(ci,row,grade){
  const key=CATS[ci].key;
  let [dg,tier]=LADDER[row];
  if(grade+dg<0){dg=0;tier=Math.min(tier,0);}
  const g=Math.max(0,Math.min(10,grade+dg));
  const q=key==='math'?build(buildMath(g,tier)):build(dec(BANK[g][key][tier]));
  q.grade=g;q.row=row;q.teks=null;
  return q;
}
function freshQuestion(ci,row,grade,avoid){
  let q;
  for(let i=0;i<8;i++){
    q=getQuestion(ci,row,grade);
    if(!G.usedQ.has(q.q)&&q.q!==avoid)break;
  }
  G.usedQ.add(q.q);
  return q;
}

/* ---------- themes: tokens only; the active team's color floods the page ---------- */
const SHAPES=['circle','square','triangle','diamond','hexagon','star','pentagon','octagon'];
const CLIP={
  circle:'circle(50% at 50% 50%)',square:'inset(0 round 18%)',triangle:'polygon(50% 4%,96% 92%,4% 92%)',
  diamond:'polygon(50% 0,100% 50%,50% 100%,0 50%)',hexagon:'polygon(25% 4%,75% 4%,100% 50%,75% 96%,25% 96%,0 50%)',
  star:'polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)',
  pentagon:'polygon(50% 0,100% 38%,82% 100%,18% 100%,0 38%)',octagon:'polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)'
};
const THEMES={
  holo:{name:'Holo Deck',base:'#12B5E5',glow:true,good:'#3CF0A0',bad:'#FF6B7D',disp:"'Orbitron','Arial Black',sans-serif",body:"'Rajdhani','Trebuchet MS',sans-serif",
    panel:'rgba(3,10,26,0.70)',pInk:'#E8FBFF',line:'var(--acc)',lw:1,r:8,sh:'0 0 26px rgba(var(--accRgb),0.38), inset 0 0 36px rgba(var(--accRgb),0.10)',
    head:'rgba(var(--accRgb),0.22)',headInk:'#F2FDFF',tile:'rgba(var(--accRgb),0.13)',tileInk:'#EAFDFF',tline:'rgba(var(--accRgb),0.85)',
    tsh:'0 0 14px rgba(var(--accRgb),0.35), inset 0 0 18px rgba(var(--accRgb),0.12)',used:'rgba(255,255,255,0.04)',usedInk:'rgba(230,250,255,0.45)',
    btn:'var(--acc)',btnInk:'#04101E',veil:[3,8,22,0.44],
    layers:[{img:'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',size:'64px 64px'},{img:'linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',size:'64px 64px'}]},
  arcade:{name:'Arcade Harbor',base:'#2E9BE6',disp:"'Bungee','Arial Black',sans-serif",body:"'Fredoka','Trebuchet MS',sans-serif",
    panel:'#FFFFFF',pInk:'#10264A',line:'#10264A',lw:3,r:20,sh:'0 6px 0 #10264A',head:'#10264A',headInk:'#FFFFFF',tile:'#FFC62E',tileInk:'#10264A',tline:'#10264A',tsh:'0 4px 0 #10264A',used:'#D6E2EF',usedInk:'#5B7396',btn:'#26C46B',btnInk:'#10264A',veil:null,
    layers:[{img:'radial-gradient(circle at 50% 100%, rgba(255,255,255,0.30) 0 34px, transparent 35px)',pos:'0 100%',size:'96px 48px',rep:'repeat-x'},{img:'radial-gradient(circle at 50% 100%, rgba(16,38,74,0.18) 0 34px, transparent 35px)',pos:'48px 100%',size:'96px 62px',rep:'repeat-x'}]},
  space:{name:'Space Fleet',base:'#2A44B0',disp:"'Orbitron','Arial Black',sans-serif",body:"'Rajdhani','Trebuchet MS',sans-serif",
    panel:'rgba(6,10,36,0.86)',pInk:'#EAF4FF',line:'#7FE7FF',lw:2,r:12,sh:'0 0 22px rgba(127,231,255,0.40)',head:'#7FE7FF',headInk:'#04112B',tile:'rgba(127,231,255,0.14)',tileInk:'#CFF6FF',tline:'#7FE7FF',tsh:'0 0 12px rgba(127,231,255,0.35)',used:'rgba(255,255,255,0.05)',usedInk:'#8F9CC0',btn:'#7FE7FF',btnInk:'#04112B',veil:[5,8,30,0.42],
    layers:[{img:'radial-gradient(1.6px 1.6px at 22px 34px, #fff, transparent)',size:'190px 210px'},{img:'radial-gradient(1.2px 1.2px at 96px 130px, #fff, transparent)',size:'190px 210px'},{img:'radial-gradient(2.2px 2.2px at 150px 70px, #FFF3C0, transparent)',size:'190px 210px'},{img:'radial-gradient(1.2px 1.2px at 60px 180px, #fff, transparent)',size:'190px 210px'}]},
  pirate:{name:'Pirate Seas',base:'#C9A35B',disp:"'Pirata One','Georgia',serif",body:"'Alegreya SC','Georgia',serif",
    panel:'#F4E4B8',pInk:'#3B2410',line:'#6B3F17',lw:4,r:10,sh:'0 6px 0 #3B2410',head:'#3B2410',headInk:'#F4E4B8',tile:'#E7C779',tileInk:'#3B2410',tline:'#6B3F17',tsh:'0 4px 0 #6B3F17',used:'#D9C79A',usedInk:'#7A5B2A',btn:'#B5361E',btnInk:'#FFF4DC',veil:[40,20,0,0.16],
    layers:[{img:'repeating-linear-gradient(90deg, rgba(60,30,0,0.14) 0 3px, transparent 3px 140px)'},{img:'repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0 1px, transparent 1px 9px)'}]},
  neon:{name:'Neon Arcade',base:'#6A2BB8',disp:"'Chakra Petch','Arial Black',sans-serif",body:"'Chakra Petch','Trebuchet MS',sans-serif",
    panel:'rgba(14,4,36,0.88)',pInk:'#F6EEFF',line:'#FF4FD8',lw:2,r:6,sh:'0 0 20px rgba(255,79,216,0.55)',head:'#FF4FD8',headInk:'#1A0430',tile:'rgba(0,229,255,0.12)',tileInk:'#7CF4FF',tline:'#00E5FF',tsh:'0 0 12px rgba(0,229,255,0.55)',used:'rgba(255,255,255,0.05)',usedInk:'#A596C8',btn:'#00E5FF',btnInk:'#06121F',veil:[14,0,40,0.38],
    layers:[{img:'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)',size:'48px 48px'},{img:'linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)',size:'48px 48px'}]},
  deep:{name:'Deep Sea',base:'#0A78B5',disp:"'Baloo 2','Trebuchet MS',sans-serif",body:"'Baloo 2','Trebuchet MS',sans-serif",
    panel:'rgba(255,255,255,0.90)',pInk:'#06304F',line:'rgba(255,255,255,0.95)',lw:2,r:28,sh:'0 10px 30px rgba(0,40,80,0.35)',head:'#0A4C7A',headInk:'#FFFFFF',tile:'#FFFFFF',tileInk:'#06304F',tline:'#0A4C7A',tsh:'0 6px 14px rgba(0,40,80,0.28)',used:'rgba(6,48,79,0.14)',usedInk:'#3D6685',btn:'#FFB703',btnInk:'#06304F',veil:[0,40,90,0.20],
    layers:[{img:'radial-gradient(circle at 18% 82%, rgba(255,255,255,0.34) 0 16px, transparent 17px)',size:'100% 100%',rep:'no-repeat'},{img:'radial-gradient(circle at 24% 66%, rgba(255,255,255,0.26) 0 9px, transparent 10px)',size:'100% 100%',rep:'no-repeat'},{img:'radial-gradient(circle at 88% 74%, rgba(255,255,255,0.30) 0 20px, transparent 21px)',size:'100% 100%',rep:'no-repeat'},{img:'radial-gradient(circle at 82% 52%, rgba(255,255,255,0.22) 0 11px, transparent 12px)',size:'100% 100%',rep:'no-repeat'},{img:'radial-gradient(circle at 52% 94%, rgba(255,255,255,0.28) 0 13px, transparent 14px)',size:'100% 100%',rep:'no-repeat'}]},
  comic:{name:'Comic Pop',base:'#FFE45C',disp:"'Bangers','Arial Black',sans-serif",body:"'Comic Neue','Comic Sans MS',sans-serif",
    panel:'#FFFDF2',pInk:'#111111',line:'#111111',lw:4,r:4,sh:'8px 8px 0 #111111',head:'#111111',headInk:'#FFE45C',tile:'#FFE45C',tileInk:'#111111',tline:'#111111',tsh:'4px 4px 0 #111111',used:'#E5E1CC',usedInk:'#6B6750',btn:'#FF3B3B',btnInk:'#FFFFFF',veil:null,
    layers:[{img:'radial-gradient(circle, rgba(0,0,0,0.18) 2.4px, transparent 2.8px)',size:'14px 14px'}]}
};
const THEME_KEYS=Object.keys(THEMES);
const hexRgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const linC=c=>{c=c/255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
const rgbLum=v=>0.2126*linC(v[0])+0.7152*linC(v[1])+0.0722*linC(v[2]);
const rgbInk=v=>{const L=rgbLum(v);return (L+0.05)/(0.0199+0.05)>=1.05/(L+0.05)?'#10264A':'#FFFFFF';};
const rgbaStr=(v,a)=>'rgba('+v[0]+','+v[1]+','+v[2]+','+a+')';
const rgbHex=v=>'#'+v.map(c=>c.toString(16).padStart(2,'0')).join('');
const mixVeil=(v,w)=>w?v.map((c,i)=>Math.round(c*(1-w[3])+w[i]*w[3])):v;
const fillFor=p=>p>55?'#22B35E':p>25?'#F2B01E':'#E5484D';
let prevBg=null;
function irisWipe(oldBg){
  const w=$('#wipe');if(!w)return;
  w.style.background=oldBg;w.classList.remove('go');void w.offsetWidth;w.classList.add('go');
  clearTimeout(irisWipe.t);irisWipe.t=setTimeout(()=>w.classList.remove('go'),800);
}
const irisOK=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches&&(!G||G.cfg.d3);
function applyTheme(key,color){
  const T=THEMES[key]||THEMES.arcade,r=document.documentElement.style;
  const base=hexRgb(color),bgRgb=mixVeil(base,T.veil),ink=rgbInk(bgRgb),inkRgb=hexRgb(ink),pRgb=hexRgb(T.pInk);
  const acc=base.map(c=>Math.round(c+(255-c)*0.5));
  const layerCss=l=>l.img+' '+(l.pos||'0 0')+(l.size?' / '+l.size:'')+' '+(l.rep||'repeat');
  const veil=T.veil?['linear-gradient(rgba('+T.veil.join(',')+'), rgba('+T.veil.join(',')+'))']:[];
  const glow=T.glow?['radial-gradient(ellipse 130% 85% at 50% 92%, '+rgbaStr(base,0.74)+', transparent 78%)']:[];
  const bgCss=T.layers.map(layerCss).concat(glow).concat(veil).concat([color]).join(', ');
  if(prevBg&&prevBg!==bgCss&&document.body.classList.contains('playing')&&irisOK())irisWipe(prevBg);
  prevBg=bgCss;
  const set=(k,v)=>r.setProperty(k,v);
  set('--bg',bgCss);
  set('--disp',T.disp);set('--body',T.body);set('--panel',T.panel);set('--pInk',T.pInk);set('--line',T.line);set('--lw',T.lw+'px');set('--r',T.r+'px');set('--sh',T.sh);
  set('--head',T.head);set('--headInk',T.headInk);set('--tile',T.tile);set('--tileInk',T.tileInk);set('--tline',T.tline);set('--tsh',T.tsh);
  set('--used',T.used);set('--usedInk',T.usedInk);set('--btn',T.btn);set('--btnInk',T.btnInk);
  set('--ink',ink);set('--inkRgb',inkRgb.join(','));set('--bgHex',rgbHex(bgRgb));
  set('--soft',rgbaStr(inkRgb,0.14));set('--softLine',rgbaStr(inkRgb,0.28));set('--pSoft',rgbaStr(pRgb,0.08));
  set('--acc',rgbHex(acc));set('--accRgb',acc.join(','));
  set('--good',T.good||'#1F9D55');set('--bad',T.bad||'#D64545');
  document.documentElement.dataset.theme=key;
  return{T,ink,bgHex:rgbHex(bgRgb)};
}

/* ---------- classes and saved setup (this device) ---------- */
const DEF_CFG={hp:800,timer:30,challenge:true,repairPct:100,lastChance:true,hints:true,mix:true,end:'board',vol:.85,theme:'holo',surprise:false,d3:true,fx:true,callouts:false,wake:false,v4:true};
let meta=store.get('bj3-meta',null);
if(!meta||!Array.isArray(meta.list)||!meta.list.length)meta={current:'Class 1',list:['Class 1']};
const ck=k=>'bj3-'+k+'-'+meta.current;
const saveMeta=()=>store.set('bj3-meta',meta);
function defaultSetup(){return{teams:[0,1,2,3].map(i=>({name:defaultName(i),grade:3,members:[]})),cfg:{...DEF_CFG}};}
function migrateCfg(c){const cfg=Object.assign({},DEF_CFG,c);if(!(c&&c.v4)){cfg.theme='holo';cfg.v4=true;}return cfg;}
function loadSetup(){
  const s=store.get(ck('setup'),null);
  try{
    if(s&&Array.isArray(s.teams)&&s.teams.length>=2&&s.teams.length<=MAX_TEAMS){
      return{teams:s.teams.map(t=>({name:String(t.name||''),grade:Math.max(0,Math.min(10,+t.grade||0)),members:Array.isArray(t.members)?t.members.map(String):[]})),cfg:migrateCfg(s.cfg)};
    }
  }catch(e){}
  return defaultSetup();
}
let setup=loadSetup();
const saveSetup=()=>store.set(ck('setup'),setup);
const letterFor=(name,i)=>{const n=String(name||'').trim();if(/^[A-Za-z]{1,2}\d{1,2}$/.test(n))return n.toUpperCase();return(n[0]||String(i+1)).toUpperCase();};

/* ---------- modal ---------- */
let lastFocus=null;
function openModal(html){
  lastFocus=document.activeElement;
  $('#sheet').innerHTML=html;$('#modal').hidden=false;
  const f=$('#sheet').querySelector('button,input,select,textarea');if(f)f.focus({preventScroll:true});
}
function closeModal(){$('#modal').hidden=true;$('#sheet').innerHTML='';if(lastFocus&&lastFocus.focus&&document.contains(lastFocus))lastFocus.focus({preventScroll:true});}

/* ============================ setup screen ============================ */
const seg=(name,vals,cur,fmt)=>`<div class="seg" role="group">${vals.map(v=>`<button type="button" data-set="${name}" data-v="${v}" aria-pressed="${String(cur)===String(v)}">${fmt?fmt(v):v}</button>`).join('')}</div>`;
const tgl=(id,label,on)=>`<label class="tgl"><span>${label}</span><input type="checkbox" id="${id}" ${on?'checked':''}><span class="tr"><i></i></span></label>`;
let setupBooted=false;
function renderSetup(){
  const c=setup.cfg,th=THEMES[c.theme]||THEMES.arcade;
  applyFx();
  $('#setup').classList.toggle('boot',!setupBooted);setupBooted=true;
  applyTheme(c.theme,th.base);
  document.body.classList.remove('playing');
  const sv=store.get(ck('save'),null);
  let resume='';
  if(sv&&sv.G&&Array.isArray(sv.G.teams)&&sv.G.teams.length){
    const d=new Date(sv.when||Date.now());
    resume=`<div class="card resume"><div><b>Battle in progress for ${esc(meta.current)}</b><div>${sv.G.teams.length} squads · board ${sv.G.round} · saved ${esc(d.toLocaleDateString(undefined,{month:'short',day:'numeric'}))} at ${esc(d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}))}</div></div><div class="row"><button class="btn" data-act="resume">Continue the battle</button><button class="btn sm ghost" data-act="discard">Discard</button></div></div>`;
  }
  $('#setup').innerHTML=`
    <div class="hdr"><h1>Battleship Jeopardy</h1><div class="row">
      <label class="sr" for="clsSel">Class</label>
      <select id="clsSel" style="width:auto;min-width:180px">${meta.list.map(n=>`<option value="${esc(n)}" ${n===meta.current?'selected':''}>${esc(n)}</option>`).join('')}<option value="__new">＋ New class…</option></select>
      <button class="ibtn wide${Voice.on?' live':''}" data-act="voice" aria-pressed="${Voice.on}">${ICON.mic}<span class="vlab">Voice ${Voice.on?'on':'off'}</span></button><button class="ibtn wide" data-act="sound">Sound ${Snd.on?'on':'off'}</button>
    </div></div>
    <p class="hero">Answer to load your ammo. Land a shot on a hidden fleet. When your ship takes a hit, answer to repair the damage.</p>
    ${resume}
    <div class="grid2">
      <div class="card"><h3>Squads</h3>
        <div class="field" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><label class="lbl" for="allGrade" style="margin:0">Set every squad to</label>
          <select id="allGrade" style="width:auto;min-width:160px"><option value="">Choose…</option>${GRADES.map((g,i)=>`<option value="${i}">${g}</option>`).join('')}</select></div>
        <div id="teamList"></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn sm sun" data-act="add-team" id="addTeam">＋ Add squad</button><button class="btn sm" data-act="roster">Import teams from a file</button></div>
        <p class="note" style="margin-top:10px">Each squad answers at its own grade level. You can change it during the game too.</p>
      </div>
      <div class="stack">
        <div class="card"><h3>Rules</h3>
          <div class="field"><span class="lbl">Life points per squad</span>${seg('hp',[400,800,1200,2000],c.hp)}<p class="note" id="perShip" style="margin-top:6px"></p></div>
          <div class="field"><span class="lbl">Repair: a right answer heals</span>${seg('repairPct',[50,75,100],c.repairPct,v=>v+'%')}<p class="note" style="margin-top:6px">of the damage the hit squad just took.</p></div>
          <div class="field"><span class="lbl">Question timer</span>${seg('timer',[20,30,45,60,0],c.timer,v=>v?v+'s':'Off')}</div>
          ${tgl('tLast','Last-chance repair: a ship at 0 HP can be saved',c.lastChance)}
          ${tgl('tChal','Teacher challenge before each question',c.challenge)}
          ${tgl('tHints','Radar warns on a near miss',c.hints)}
          <div class="field" style="margin-top:12px"><label class="lbl" for="selEnd">Game ends</label><select id="selEnd"><option value="board">When the board is cleared</option><option value="two">After the board is played twice</option><option value="last">When one squad is left</option></select></div>
        </div>
        <div class="card"><h3>Look</h3>
          <div class="themes">${THEME_KEYS.map(k=>{const t=THEMES[k];return`<button type="button" class="th" data-set="theme" data-v="${k}" aria-pressed="${c.theme===k}"><i style="background:linear-gradient(90deg,${t.base} 0 60%,${t.btn} 60% 100%)"></i>${t.name}</button>`;}).join('')}</div>
          ${tgl('tSurp','Surprise me: a new theme each game',c.surprise)}
          ${tgl('tD3','3D camera and zoom animations',c.d3)}
          ${tgl('tFx','Animated hologram background',c.fx)}
          ${tgl('tCall','Computer voice callouts',c.callouts)}
          ${tgl('tWake','Voice needs the wake word "computer"',c.wake)}
          <button class="btn sm ghost block" data-act="vhelp" style="margin-top:8px">See voice commands</button>
        </div>
        <button class="btn lg block" data-act="start">Start the battle</button>
      </div>
    </div>
    <div class="steps" aria-label="How a turn works">
      <div><b>Pick a tile</b>Bigger numbers mean harder questions and bigger blasts.</div>
      <div><b>Pick a target</b>Choose which squad to fire on.</div>
      <div><b>Challenge</b>You judge it. Done unlocks the question.</div>
      <div><b>Load ammo</b>Answer it. Fast answers hit harder.</div>
      <div><b>Fire</b>Call a square on their hidden fleet.</div>
      <div><b>Repair</b>The hit squad answers to heal the damage.</div>
    </div>`;
  $('#selEnd').value=c.end;
  renderTeams();perShip();
}
function perShip(){const n=SHIP_KEYS.length;const p=$('#perShip');if(p)p.textContent=`Split evenly across ${n} ships: ${hpPerShip(setup.cfg.hp,n)} HP each.`;}
function renderTeams(){
  $('#teamList').innerHTML=setup.teams.map((t,i)=>{
    const col=teamColor(i),L=letterFor(t.name,i);
    return`<div class="trow" data-i="${i}"><div class="badge" style="background:${col};color:${inkFor(col)};clip-path:${CLIP[SHAPES[i%8]]};font-size:${L.length>1?17:22}px">${esc(L)}</div>
      <input type="text" data-f="name" maxlength="28" aria-label="Squad ${i+1} name" placeholder="${esc(defaultName(i))}" value="${esc(t.name)}">
      <select data-f="grade" aria-label="Grade level for squad ${i+1}">${GRADES.map((g,gi)=>`<option value="${gi}" ${gi===t.grade?'selected':''}>${g}</option>`).join('')}</select>
      <button type="button" class="x" data-act="del-team" aria-label="Remove squad ${i+1}">✕</button>
      <textarea data-f="members" rows="${Math.max(1,Math.min(4,t.members.length||1))}" aria-label="Members of squad ${i+1}" placeholder="Student names, one per line">${esc(t.members.join('\n'))}</textarea></div>`;
  }).join('');
  const add=$('#addTeam');if(add){add.disabled=setup.teams.length>=MAX_TEAMS;add.textContent=setup.teams.length>=MAX_TEAMS?'12 squads is the most':'＋ Add squad';}
}
const members2arr=txt=>txt.split(/[\n,;]+/).map(cleanName).filter(Boolean);

/* ---------- roster import (CSV, text, or pasted) ---------- */
function openRoster(){
  const st={parsed:null,mode:'size',n:4,useFile:true,groups:[],over:false};
  openModal(`<h2>Import teams</h2>
    <div class="grid2" style="gap:16px">
      <div class="stack">
        <div><label class="lbl" for="rFile">1. Choose your Leadership export (CSV)</label><input type="file" id="rFile" accept=".csv,.tsv,.txt"></div>
        <div><label class="lbl" for="rText">Or paste a list here</label><textarea id="rText" rows="7" placeholder="Group,Student&#10;S1,First L.&#10;S1,First L.&#10;S2,First L."></textarea></div>
        <p class="note" id="rNote" aria-live="polite">Nothing loaded yet.</p>
      </div>
      <div class="stack">
        <span class="lbl" style="margin:0">2. Check the groups</span>
        <label class="tgl" id="rUseWrap" hidden><span>Use the groups from the file</span><input type="checkbox" id="rUse" checked><span class="tr"><i></i></span></label>
        <div id="rMake" class="seg" style="align-items:center"><button type="button" id="mSize" aria-pressed="true">Groups of</button><button type="button" id="mCount" aria-pressed="false">Number of groups</button><input type="number" id="rN" min="1" max="12" value="4" style="width:84px" aria-label="Number for splitting"></div>
        <div class="glist" id="rList"><p class="note">Groups will show up here.</p></div>
        <button class="btn lg block" id="rApply" disabled>Use these squads</button>
        <button class="btn sm ghost block" id="rCancel">Cancel</button>
      </div></div>`);
  const note=$('#rNote');
  function compute(){
    const p=st.parsed;st.over=false;
    if(!p||!p.names.length){st.groups=[];return;}
    if(p.mode==='groups'&&st.useFile){
      st.over=p.groups.length>MAX_TEAMS;
      st.groups=p.groups.slice(0,MAX_TEAMS).map(g=>({name:/^\d+$/.test(g.name)?'Team '+g.name:g.name,members:g.members}));
      return;
    }
    const total=p.names.length;
    let k=st.mode==='size'?Math.ceil(total/Math.max(1,st.n)):st.n;
    st.over=k>MAX_TEAMS;k=Math.max(1,Math.min(k,MAX_TEAMS,total));
    st.groups=splitGroups(p.names,k,true).map(m=>({name:'',members:m}));
  }
  function paint(){
    const list=$('#rList');
    $('#rUseWrap').hidden=!(st.parsed&&st.parsed.mode==='groups');
    $('#rMake').style.opacity=(st.parsed&&st.parsed.mode==='groups'&&st.useFile)?.45:1;
    $('#mSize').setAttribute('aria-pressed',st.mode==='size');$('#mCount').setAttribute('aria-pressed',st.mode==='count');
    if(!st.groups.length){list.innerHTML='<p class="note">Groups will show up here.</p>';$('#rApply').disabled=true;return;}
    list.innerHTML=st.groups.map((g,i)=>{const c=teamColor(i);return`<div class="g" style="--tc:${c};--ti:${inkFor(c)}"><b>${esc(g.name||defaultName(i))}</b><br>${g.members.map(esc).join(' · ')||'No members'}</div>`;}).join('');
    $('#rApply').disabled=st.groups.length<2;
    $('#rApply').textContent=st.groups.length<2?'Need at least 2 groups':`Use these ${st.groups.length} squads`;
    if(st.over)note.textContent=`That would make more than ${MAX_TEAMS} groups, so the list stops at ${MAX_TEAMS}.`;
  }
  function ingest(text,label){
    st.parsed=parseRoster(text);
    note.textContent=(label?label+': ':'')+st.parsed.note;
    if(st.parsed.mode==='list'&&st.parsed.names.length)st.n=st.mode==='size'?4:Math.max(2,Math.round(st.parsed.names.length/4));
    $('#rN').value=st.n;compute();paint();
  }
  $('#rFile').onchange=async e=>{
    const f=e.target.files[0];if(!f)return;
    if(/\.(xlsx|xls|docx|pdf|doc|pages)$/i.test(f.name)){note.textContent='That file type can\'t be read here. Save it as CSV, or paste the names into the box.';return;}
    try{const txt=await f.text();$('#rText').value=txt;ingest(txt,f.name);}catch(err){note.textContent='Could not read that file.';}
  };
  $('#rText').oninput=e=>ingest(e.target.value,'');
  $('#rUse').onchange=e=>{st.useFile=e.target.checked;compute();paint();};
  $('#mSize').onclick=()=>{st.mode='size';st.n=4;$('#rN').value=4;compute();paint();};
  $('#mCount').onclick=()=>{st.mode='count';st.n=Math.max(2,Math.min(MAX_TEAMS,Math.round(((st.parsed&&st.parsed.names.length)||16)/4)));$('#rN').value=st.n;compute();paint();};
  $('#rN').oninput=e=>{st.n=Math.max(1,Math.min(60,Math.round(+e.target.value||1)));compute();paint();};
  $('#rCancel').onclick=closeModal;
  $('#rApply').onclick=()=>{
    const g0=setup.teams[0]?setup.teams[0].grade:3;
    setup.teams=st.groups.map((g,i)=>({name:g.name||defaultName(i),grade:g0,members:g.members}));
    saveSetup();closeModal();renderSetup();Snd.play('correct');
  };
}

/* ============================ game state ============================ */
let G=null,S=null,timerH=null,qHandle=null;
const memberUp=t=>t.members.length?t.members[t.mi%t.members.length]:null;
function log(m,c=''){G.log.unshift({m,c});if(G.log.length>120)G.log.pop();}
function newSurge(){G.surge=R(0,CATS.length-1)+'-'+R(0,ROWS-1);}
function fit(){document.documentElement.style.setProperty('--s',Math.min(innerWidth/1440,innerHeight/900));}
addEventListener('resize',fit);
function showGame(on){$('#setup').hidden=on;$('#game').hidden=!on;document.body.classList.toggle('playing',on);if(on){fit();window.scrollTo(0,0);lastView=null;probeSpeed();}}

function startGame(){
  saveSetup();
  const cfg={...setup.cfg};
  const fleets=assignFleets(setup.teams.length,DEFAULT_TEMPLATES,cfg.mix);
  const teams=setup.teams.map((d,i)=>{const t=makeTeam(d,i,cfg,fleets[i]);t.shape=SHAPES[i%8];t.letter=letterFor(t.name,i);t.stats.healed=0;return t;});
  const theme=cfg.surprise?pick(THEME_KEYS):cfg.theme;
  G={cfg,theme,teams,turn:0,used:new Set(),round:1,log:[],usedQ:new Set(),over:false,surge:null,turns:0,className:meta.current};
  S=null;newSurge();
  $('#victory').hidden=true;showGame(true);
  log(`Battle on! ${teams.length} squads, ${cfg.hp} HP each.`,'info');
  renderGame();saveGame();
}
function saveGame(){
  if(!G||G.over)return;
  store.set(ck('save'),{v:3,when:Date.now(),G:{...G,used:[...G.used],usedQ:[...G.usedQ]}});
}
function resumeGame(){
  const s=store.get(ck('save'),null);
  try{
    if(!s||!s.G||!Array.isArray(s.G.teams)||s.G.teams.length<2)throw 0;
    G={...s.G,used:new Set(s.G.used||[]),usedQ:new Set(s.G.usedQ||[]),over:false};
    if(G.teams.some(t=>!Array.isArray(t.ships)||!Array.isArray(t.map)))throw 0;
    if(!G.cfg.v4){G.theme='holo';G.cfg.d3=true;G.cfg.v4=true;}
    S=null;
  }catch(e){store.del(ck('save'));G=null;renderSetup();return;}
  $('#victory').hidden=true;showGame(true);renderGame();
}

/* ---------- rules: hits and repairs ---------- */
function resolveHit(t,si,dmg,lastChance){
  const s=t.ships[si],before=s.hp,taken=Math.min(before,dmg);
  s.hp=before-taken;
  let state='damaged',finishing=0;
  if(s.hits>=s.len){finishing=s.hp;s.hp=0;s.sunk=true;state='holes';}
  else if(s.hp<=0){if(lastChance){s.critical=true;state='critical';}else{s.sunk=true;state='sunk';}}
  if(s.sunk)s.cells.forEach(([r,c])=>t.shots[r][c]='s');
  if(t.ships.every(x=>x.sunk))t.alive=false;
  return{before,taken,state,finishing,eliminated:!t.alive};
}
function resolveRepair(t,si,ok,taken,pct){
  const s=t.ships[si];let heal=0,saved=false,sunk=false;
  if(s.critical){
    s.critical=false;
    if(ok){heal=Math.min(s.maxHp,Math.max(5,r5(taken*pct/100)));s.hp=heal;saved=true;}
    else{s.hp=0;s.sunk=true;sunk=true;s.cells.forEach(([r,c])=>t.shots[r][c]='s');}
  }else if(ok){heal=Math.max(0,Math.min(r5(taken*pct/100),s.maxHp-s.hp));s.hp+=heal;}
  if(t.ships.every(x=>x.sunk))t.alive=false;
  return{heal,saved,sunk,eliminated:!t.alive};
}

/* ============================ rendering: turn screen ============================ */
const ICON={
  mic:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  sound:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
  mute:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
  theme:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.6 0 2-1 1.6-2-.5-1.2.3-2.5 1.7-2.5H17a4 4 0 0 0 4-4C21 6.9 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10.5" cy="7.5" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/></svg>',
  flag:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4"/><path d="M5 4h13l-3 4.5L18 13H5"/></svg>',
  bolt:'<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor"/></svg>',
  check:'<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
};
const micBtn=()=>`<button class="ibtn${Voice.on?' live':''}" data-act="voice" aria-pressed="${Voice.on}" aria-label="Voice commands ${Voice.on?'on':'off'}">${ICON.mic}</button>`;
const topBar=chip=>`<div class="top"><div class="l"><div class="brand">Battleship Jeopardy</div><span class="chip">${esc(G.className)} · ${chip}</span><span class="chip">${esc(THEMES[G.theme].name)}</span></div>
  <div class="r">${micBtn()}<button class="ibtn" data-act="sound" aria-label="${Snd.on?'Sound on':'Sound off'}">${Snd.on?ICON.sound:ICON.mute}</button><button class="ibtn" data-act="theme" aria-label="Change theme">${ICON.theme}</button><button class="ibtn" data-act="end" aria-label="End or leave this game">${ICON.flag}</button></div></div>`;
const badgeHtml=(t,size,fs,extra='')=>`<div class="badge" style="width:${size}px;height:${size}px;clip-path:${CLIP[t.shape]};background:${extra||'var(--ink)'};color:${extra?inkFor(t.color):'var(--bgHex)'};font-size:${t.letter.length>1?Math.round(fs*0.74):fs}px"><span style="padding-top:${t.shape==='triangle'?Math.round(size*.15):t.shape==='star'?Math.round(size*.06):0}px">${esc(t.letter)}</span></div>`;
function bannerHtml(t,sub){
  const fs=Math.max(36,Math.min(76,Math.floor(1230/(Math.max(6,t.name.length)*1.02))));
  return`<div class="banner"><div class="proj">${badgeHtml(t,96,46)}</div><div style="min-width:0"><div class="bn-name" style="font-size:${fs}px">${esc(t.name)}</div><div class="bn-sub">${sub}</div></div></div>`;
}
function shipsHtml(t){
  return t.ships.map(s=>{
    const pct=Math.round(s.hp/s.maxHp*100);
    return`<div class="shp${s.sunk?' sunk':''}"><div class="row"><span>${esc(s.name)}</span><span>${s.sunk?'sunk':s.hp+'/'+s.maxHp}</span></div><div class="bar"><i style="width:${s.sunk?0:pct}%;background:${fillFor(pct)}"></i></div></div>`;
  }).join('');
}
function leftHtml(t){
  const who=memberUp(t),nm=who||'Your squad',fs=nm.length<=8?46:nm.length<=12?38:30;
  const show=t.members.slice(0,6),more=t.members.length-show.length;
  return`<aside class="left"><div class="cap">Up now</div><div class="upname" style="font-size:${fs}px">${esc(nm)}</div>
    ${t.members.length?`<div class="cap" style="margin-top:8px">Squad</div><div class="mems">${show.map(m=>`<div class="mem${m===who?' up':''}">${esc(m)}</div>`).join('')}${more>0?`<div class="mem">+${more} more</div>`:''}</div>`:''}
    <div class="cap" style="margin-top:8px">Fleet</div><div style="display:grid;gap:8px">${shipsHtml(t)}</div></aside>`;
}
function boardHtml(){
  let h=CATS.map(c=>`<div class="cat"><b>${esc(c.name)}</b></div>`).join('');
  for(let r=0;r<ROWS;r++)for(let c=0;c<CATS.length;c++){
    const k=c+'-'+r,used=G.used.has(k),surge=G.surge===k&&!used;
    h+=`<button type="button" class="tile${used?' used':''}${S&&!used?' lock':''}${surge?' surge':''}" style="--i:${r*CATS.length+c}" data-act="tile" data-ci="${c}" data-r="${r}" ${used||G.over||S?'disabled':''} aria-label="${esc(CATS[c].name)}, ${(r+1)*100} points${used?', already answered':surge?', power surge':''}">${used?ICON.check:(r+1)*100}${surge?`<span class="bolt">${ICON.bolt}</span>`:''}</button>`;
  }
  return`<section class="board">${h}</section>`;
}
function sqHtml(t,on){
  const hp=teamHp(t),max=teamMax(t),pct=Math.round(hp/max*100);
  return`<div class="sq${on?' on':''}${t.alive?'':' out'}">${badgeHtml(t,40,18,t.color)}<div><div class="nm">${esc(t.name)}</div><div class="hb"><div class="bar"><i style="width:${pct}%;background:${fillFor(pct)}"></i></div><span>${t.alive?hp:'OUT'}</span></div></div></div>`;
}
function standingsHtml(){return`<aside class="side"><h4>Squads</h4>${G.teams.map((t,i)=>sqHtml(t,i===G.turn&&t.alive&&!G.over)).join('')}</aside>`;}
function turnHtml(){
  const t=G.teams[G.turn];applyTheme(G.theme,t.color);
  const left=TILES-G.used.size,lim=G.cfg.end==='board'?1:G.cfg.end==='two'?2:0;
  return topBar(`Board ${G.round}${lim?' of '+lim:''} · ${left} tile${left===1?'':'s'} left`)+bannerHtml(t,'Pick a tile!')+`<div class="cols">${leftHtml(t)}${boardHtml()}${standingsHtml()}</div>`;
}
/* effects level: the Look toggle, or automatic if this computer is too slow to animate smoothly */
let autoLite=false,probed=false;
function applyFx(){document.documentElement.classList.toggle('lite',!setup.cfg.fx||autoLite);}
function probeSpeed(){
  if(probed||navigator.webdriver||!setup.cfg.fx)return;
  probed=true;
  let n=0,t0=0;
  setTimeout(()=>{requestAnimationFrame(function f(t){if(!t0)t0=t;n++;if(t-t0<2200)requestAnimationFrame(f);else{
    const fps=n/((t-t0)/1000);
    if(fps<22){autoLite=true;applyFx();Voice.note('Slow computer: effects reduced. You can change this in Look.');}
  }});},2500);
}
let lastView=null;
function renderGame(){
  if(!G)return;
  const stage=$('#stage');
  stage.classList.toggle('compact',G.teams.length>8);
  stage.classList.toggle('d3',!!G.cfg.d3);
  /* camera move only when the screen really changes: zoom in to a question, pull back to the board */
  const view=S?'s:'+S.step:'b:'+G.turn+':'+G.round;
  let anim='';
  if(view!==lastView){
    anim=S?(S.step==='result'?'out':'in'):(lastView&&lastView[0]==='s'?'out':'boot');
    lastView=view;
  }
  stage.dataset.anim=anim;
  stage.innerHTML=S?strikeHtml():turnHtml();
}

/* ============================ strike flow ============================ */
const STEP_NAMES={target:'Pick your target',challenge:'Challenge time',ammo:'Load the ammo',fire:'Fire!',repair:'Repair',result:'Result'};
function openStrike(ci,row){
  if(S||G.over)return;
  const key=ci+'-'+row;if(G.used.has(key))return;
  const atk=G.teams[G.turn],foes=G.teams.filter(t=>t!==atk&&t.alive);
  S={atk,key,ci,row,value:(row+1)*100,surge:G.surge===key,step:'target',target:foes.length===1?foes[0]:null,mult:1,dmg:0,si:-1,shot:null,res:null,ammoQ:null,replQ:null,idea:pick(IDEAS),hit:null,rep:null};
  Snd.play('pick');if(S.surge)setTimeout(()=>Snd.play('surge'),180);
  Voice.say(CATS[ci].name+' '+S.value+(S.surge?', power surge':''));
  goStep(S.target?(G.cfg.challenge?'challenge':'ammo'):'target');
}
function goStep(step){
  stopTimer();qHandle=null;S.step=step;
  if(step==='ammo'){G.used.add(S.key);}
  renderGame();
  if(step==='ammo')mountAmmo();
  if(step==='fire')mountFire();
  if(step==='repair')mountRepair();
  if(step==='result')afterResult();
}
function stopTimer(){if(timerH){clearInterval(timerH);timerH=null;}}
function closeStrike(){stopTimer();qHandle=null;S=null;renderGame();}

const infoLeft=(extra='')=>`<aside class="qleft"><div class="cap">${esc(CATS[S.ci].name)}</div><div class="big">${S.value}</div><div class="cap">points${S.surge?' · power surge x2':''}</div>
  ${S.target?`<div class="cap" style="margin-top:8px">Target</div><div style="font-size:26px;font-weight:700;line-height:1.15">${esc(S.target.name)}</div>`:''}${extra}</aside>`;
const stepChip=()=>`<div class="chips"><span class="chip solid">${STEP_NAMES[S.step]}</span><span class="chip pan">${esc(CATS[S.ci].name)} · ${S.value}</span>${S.surge?'<span class="chip pan">Power surge x2</span>':''}</div>`;
const ringHtml=secs=>secs?`<div class="cap">Timer</div><div class="ring"><svg width="190" height="190" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" fill="none" stroke="rgba(var(--inkRgb),.22)" stroke-width="12"/><circle id="ringFill" cx="60" cy="60" r="52" fill="none" stroke="var(--ink)" stroke-width="12" stroke-linecap="round" stroke-dasharray="326.7" stroke-dashoffset="0" transform="rotate(-90 60 60)"/></svg><div class="n"><b id="tnum">${secs}</b><small>seconds</small></div></div>
  <div class="tctl"><button class="btn sm ghost" id="tplus" style="border-color:var(--ink);color:var(--ink)" aria-label="Add 15 seconds">+15s</button><button class="btn sm ghost" id="tpause" style="border-color:var(--ink);color:var(--ink)" aria-pressed="false">Pause</button></div>`
  :`<div class="cap">Timer</div><div style="font-size:24px;font-weight:700">No timer</div>`;

function strikeHtml(){
  const atk=S.atk,tgt=S.target;
  const defenderTurn=S.step==='repair'||(S.step==='result'&&S.res&&S.res.type==='hit');
  const team=defenderTurn&&tgt?tgt:atk;
  applyTheme(G.theme,team.color);
  const top=topBar(`${esc(STEP_NAMES[S.step])}`);
  let sub='',left='',mid='',right='';
  const timer=G.cfg.timer;
  const qMid=`<div class="qtext" id="qtext"></div><div class="opts" id="qopts"></div><div id="fbHost"></div>`;
  if(S.step==='target'){
    const foes=G.teams.filter(t=>t!==atk&&t.alive);
    sub=`${esc(memberUp(atk)?memberUp(atk)+', ':'')}choose who to fire on`;
    left=infoLeft();
    mid=`${stepChip()}<div class="targets">${foes.map(t=>{const i=G.teams.indexOf(t);return`<button type="button" class="tgt${S.target===t?' sel':''}" style="--tc:${t.color};--ti:${inkFor(t.color)}" data-act="pick-target" data-i="${i}">${badgeHtml(t,48,20,'var(--ti)').replace('color:'+inkFor(t.color),'color:var(--tc)')}<span><b>${esc(t.name)}</b><small>${teamHp(t)} HP · ${shipsAfloat(t)} ship${shipsAfloat(t)===1?'':'s'} afloat</small></span></button>`;}).join('')}</div>
      <button class="btn lg block" data-act="lock" ${S.target?'':'disabled'}>${S.target?'Lock on '+esc(S.target.name):'Pick a squad'}</button>`;
    right=`<aside class="qright"><div class="cap">Changed your mind?</div><button class="btn sm ghost" data-act="cancel-strike" style="border-color:var(--ink);color:var(--ink)">Back to the board</button></aside>`;
  }else if(S.step==='challenge'){
    sub='Teacher challenge: you judge it';
    left=infoLeft();
    mid=`${stepChip()}<div class="qtext">If ${esc(atk.name)} completes it, the ammo question unlocks.</div>
      <div class="fb" style="font-size:34px;line-height:1.25"><div class="cap" style="margin-bottom:6px">Idea (or make up your own)</div><div id="idea">${esc(S.idea)}</div></div>
      <div class="opts"><button class="btn lg" data-act="chal-ok">Completed</button><button class="btn lg bad" data-act="chal-no">Missed</button></div>
      <button class="btn sm ghost" data-act="idea" style="align-self:flex-start">Another idea</button>`;
    right=`<aside class="qright"><div class="cap">${esc(memberUp(atk)||atk.name)}</div><div style="font-size:24px;font-weight:700">is up</div></aside>`;
  }else if(S.step==='ammo'){
    const power=S.value*(S.surge?2:1);
    sub=`${esc(memberUp(atk)?memberUp(atk)+', you\'re up! ':'')}Answer to load the ammo`;
    left=infoLeft(`<div class="note-box" style="margin-top:10px">${power} damage if right${timer?'<br>Fast answers add up to +50%':''}</div>`);
    mid=`${stepChip()}${qMid}`;
    right=`<aside class="qright">${ringHtml(timer)}<div style="font-size:22px;font-weight:700;line-height:1.25;margin-top:6px">Read it out loud, then pick a letter.</div></aside>`;
  }else if(S.step==='fire'){
    sub=`Ammo loaded: ${S.dmg} damage${S.mult>1?` (speed x${S.mult})`:''}. Call a square!`;
    left=infoLeft(`<div class="note-box" style="margin-top:10px">${S.dmg} damage</div>`);
    mid=`${stepChip()}<div class="sea" id="sea" role="group" aria-label="Fire at ${esc(tgt.name)}"></div>
      <div class="chips" style="justify-content:center"><span class="chip pan">empty</span>${G.cfg.hints?'<span class="chip pan">yellow = ship next to it</span>':''}<span class="chip pan">red = hit</span><span class="chip pan">black = sunk</span></div>`;
    right=`<aside class="qright"><div class="cap">Result</div><div id="fireOut" aria-live="polite" style="font-size:24px;font-weight:700;line-height:1.25">Tap a square on the grid to fire.</div></aside>`;
  }else if(S.step==='repair'){
    const sh=tgt.ships[S.si],h=S.hit;
    const secs=timer?Math.max(Math.min(15,timer),timer-5):0;
    const base=Math.round(sh.hp/sh.maxHp*100),pend=Math.round(Math.min(sh.maxHp-sh.hp,Math.max(5,r5(h.taken*G.cfg.repairPct/100)))/sh.maxHp*100);
    sub=`${esc(atk.name)} hit your ${esc(sh.name)} for ${h.taken}. Answer to repair it!`;
    left=`<aside class="qleft"><div class="cap">${sh.critical?'Last chance':'Direct hit'}</div><div class="big" style="font-size:44px">${esc(sh.name)}</div>
      <div style="font-size:28px;font-weight:700">${sh.hp} / ${sh.maxHp} HP</div>
      <div class="pendbar"><div style="width:${base}%;background:${fillFor(base)}"></div><div style="width:${pend}%;background:repeating-linear-gradient(45deg,rgba(var(--inkRgb),.75) 0 8px,rgba(var(--inkRgb),.3) 8px 16px)"></div></div>
      <div style="font-size:24px;font-weight:700;line-height:1.2">Answer right to repair up to +${Math.max(5,r5(h.taken*G.cfg.repairPct/100))} HP</div>
      ${sh.critical?'<div class="note-box">Last chance! At 0 HP this ship sinks unless you answer right.</div>':''}</aside>`;
    mid=`<div class="chips"><span class="chip solid">Repair question</span><span class="chip pan">${esc(CATS[S.ci].name)}</span></div>${qMid}`;
    right=`<aside class="qright">${ringHtml(secs)}<div style="font-size:22px;font-weight:700;line-height:1.25;margin-top:6px">${esc(memberUp(tgt)?memberUp(tgt)+', you\'re up!':'Read it out loud, then pick a letter.')}</div></aside>`;
  }else{
    return resultHtml();
  }
  return top+bannerHtml(team,sub)+`<div class="qcols">${left}<section class="qmid">${mid}</section>${right}</div>`;
}

/* ---------- one question UI, used for ammo and repair ---------- */
function mountQuestion(q,{seconds,contLabel,onDone}){
  $('#qtext').textContent=q.q;
  if(q.q.length<=22&&/[=+×÷−%]/.test(q.q))$('#qtext').classList.add('eq');
  const host=$('#qopts');let answered=false,elapsed=0,extra=0,paused=false,lastT=performance.now(),lastSec=-1;
  const frac=()=>seconds?Math.min(1,elapsed/((seconds+extra)*1000)):1;
  const btns=q.opts.map((o,i)=>{const b=el('button','opt',`<b>${'ABCD'[i]}</b><span></span>`);b.type='button';b.style.setProperty('--oi',i);$('span',b).textContent=o;b.onclick=()=>finish(i);host.append(b);return b;});
  function finish(i){
    if(answered)return;answered=true;stopTimer();
    const f=Math.min(1,elapsed/(Math.max(1,seconds)*1000)),ok=i===q.ans,timedOut=i<0;
    btns.forEach((b,k)=>{b.disabled=true;if(k===q.ans)b.classList.add('ok');else if(k===i)b.classList.add('no');else b.classList.add('dim');});
    if(ok){Snd.play('correct');const [x,y]=FX.center(btns[q.ans]);FX.confetti(x,y,28);}else{Snd.play('wrong');FX.shake($('#stage'));}
    const fb=el('div','fb '+(ok?'ok':'no'));
    fb.innerHTML=`<h3>${ok?'Correct!':timedOut?'Time ran out':'Not quite'}</h3><p></p>`;
    $('p',fb).textContent=(ok?'':`The answer is ${q.opts[q.ans]}. `)+q.exp;
    const go=el('button','btn lg block',contLabel(ok,f));go.type='button';go.style.marginTop='10px';
    fb.append(go);$('#fbHost').append(fb);go.focus({preventScroll:true});
    go.onclick=()=>{Snd.play('click');onDone(ok,f);};
  }
  if(seconds){
    const ring=$('#ringFill'),num=$('#tnum'),pauseB=$('#tpause');
    $('#tplus').onclick=()=>{extra+=15;Snd.play('click');};
    pauseB.onclick=()=>{paused=!paused;pauseB.textContent=paused?'Resume':'Pause';pauseB.setAttribute('aria-pressed',paused);};
    const paint=()=>{
      const now=performance.now();if(!paused)elapsed+=now-lastT;lastT=now;
      const total=(seconds+extra)*1000,rem=total-elapsed,sec=Math.max(0,Math.ceil(rem/1000));
      ring.style.strokeDashoffset=String(326.7*(1-Math.max(0,rem/total)));
      num.textContent=sec;
      if(sec!==lastSec){lastSec=sec;if(sec<=5&&sec>0&&!paused)Snd.play('tick');}
      if(rem<=0)finish(-1);
    };
    paint();timerH=setInterval(paint,100);
  }
  qHandle={pick:i=>{if(!answered&&btns[i])finish(i);}};
}

function mountAmmo(){
  const atk=S.atk;
  if(!S.ammoQ)S.ammoQ=freshQuestion(S.ci,S.row,atk.grade);
  const power=S.value*(S.surge?2:1),timer=G.cfg.timer;
  mountQuestion(S.ammoQ,{
    seconds:timer,
    contLabel:ok=>ok?'Ammo loaded! Pick a square':'Misfire. See the result',
    onDone:(ok,f)=>{
      atk.stats.asked++;atk.mi++;
      if(ok){
        atk.stats.right++;
        S.mult=timer?speedMult(f):1;S.dmg=r5(power*S.mult);
        log(`${atk.name} loads ${S.dmg} damage${S.mult>1?` (speed x${S.mult})`:''}.`,'info');
        goStep('fire');
      }else{
        S.res={type:'misfire'};log(`${atk.name} missed the ammo question. Misfire.`,'warn');goStep('result');
      }
    }
  });
}

function mountFire(){
  const t=S.target,sea=$('#sea');
  sea.append(el('div','ax'));
  for(let c=0;c<N;c++)sea.append(el('div','ax',c+1));
  const cells=[];
  const paint=(b,v)=>{b.className='sc'+(v?' '+v:'');b.textContent=v==='h'?'✕':v==='s'?'☠':v==='n'?'~':'';};
  for(let r=0;r<N;r++){
    sea.append(el('div','ax','ABCDEFG'[r]));
    for(let c=0;c<N;c++){
      const b=el('button','sc');b.type='button';b.setAttribute('aria-label',`Fire at ${'ABCDEFG'[r]}${c+1}`);
      paint(b,t.shots[r][c]);if(t.shots[r][c])b.disabled=true;
      b.onclick=()=>fire(r,c,b);sea.append(b);cells.push(b);
    }
  }
  function fire(r,c,b){
    cells.forEach(x=>x.disabled=true);
    Snd.play('fire');
    const res=shotAt(t,r,c,G.cfg.hints);S.shot=res;S.atk.stats.shots++;
    const out=$('#fireOut'),coord='ABCDEFG'[r]+(c+1),[x,y]=FX.center(b);
    const nxt=el('button','btn lg block');nxt.type='button';nxt.style.marginTop='12px';
    if(res.type==='hit'){
      S.si=res.si;const ship=t.ships[res.si];S.atk.stats.hits++;
      const h=resolveHit(t,res.si,S.dmg,G.cfg.lastChance);S.hit=h;
      S.atk.stats.dealt+=h.taken;if(ship.sunk)S.atk.stats.sunk++;
      for(let a=0;a<N;a++)for(let d=0;d<N;d++)paint(cells[a*N+d],t.shots[a][d]);
      setTimeout(()=>{Snd.play(ship.sunk?'sunk':'hit');ship.sunk?FX.sunk(x,y):FX.hit(x,y);FX.shake($('#stage'));sea.classList.remove('punch','pull');void sea.offsetWidth;sea.classList.add(ship.sunk?'pull':'punch');Voice.say(ship.sunk?'Ship destroyed':'Direct hit');},280);
      log(`${S.atk.name} hits ${t.name}'s ${ship.name} at ${coord} for ${h.taken}.`,'hit');
      const goesRepair=!ship.sunk&&t.alive;
      out.innerHTML=`<div class="fb no"><h3>Direct hit on the ${esc(ship.name)}!</h3><p>${h.taken} damage.${ship.sunk?(h.state==='holes'?' Every square is hit, so the hull collapses.':' The ship goes down.'):ship.critical?' It is at 0 HP: one answer can save it.':''}${goesRepair?` ${esc(t.name)} can repair by answering a question.`:''}</p></div>`;
      nxt.textContent=goesRepair?`${t.name}: repair!`:'See the result';
      nxt.onclick=()=>{Snd.play('click');S.res={type:'hit'};if(goesRepair)goStep('repair');else goStep('result');};
    }else{
      paint(b,t.shots[r][c]);
      S.res={type:res.type};
      setTimeout(()=>{Snd.play('miss');FX.splash(x,y);Voice.say(res.type==='near'?'Near miss':'Miss');},280);
      log(`${S.atk.name} fires at ${coord} on ${t.name}: ${res.type==='near'?'miss, but a ship is close':'splash, nothing there'}.`);
      out.innerHTML=`<div class="fb"><h3>${res.type==='near'?'Near miss':'Splash'}</h3><p>${res.type==='near'?'The radar picked up a ship right next to that square.':'Nothing there. No damage this turn.'}</p></div>`;
      nxt.textContent='Continue';nxt.onclick=()=>{Snd.play('click');goStep('result');};
    }
    out.append(nxt);nxt.focus({preventScroll:true});
  }
}

function mountRepair(){
  const t=S.target,tm=G.cfg.timer,secs=tm?Math.max(Math.min(15,tm),tm-5):0;
  if(!S.replQ)S.replQ=freshQuestion(S.ci,S.row,t.grade,S.ammoQ&&S.ammoQ.q);
  const sh=t.ships[S.si],h=S.hit,crit=sh.critical;
  mountQuestion(S.replQ,{
    seconds:secs,
    contLabel:ok=>ok?(crit?'Saved! See the result':'Repaired! See the result'):(crit?'It sinks. See the result':'No repair. See the result'),
    onDone:ok=>{
      t.stats.asked++;t.mi++;if(ok)t.stats.right++;
      const r=resolveRepair(t,S.si,ok,h.taken,G.cfg.repairPct);
      S.rep={ok,...r,crit};t.stats.healed+=r.heal;
      if(S.rep.sunk)S.atk.stats.sunk++;
      if(ok)Snd.play('deflect');
      Voice.say(ok?(crit?'Ship saved':'Repair complete'):(crit?'Ship lost':'Repair failed'));
      log(ok?`${t.name} repairs the ${sh.name}: +${r.heal} HP${crit?' and saves it from sinking':''}.`:`${t.name} fails to repair the ${sh.name}${crit?' and it sinks':''}.`,ok?'good':'warn');
      if(r.eliminated)log(`${t.name} has been eliminated!`,'hit');
      goStep('result');
    }
  });
}

function resultHtml(){
  const r=S.res,t=S.target,atk=S.atk;let body='',title='',teamForColor=atk;
  if(r.type==='jam'){title='Challenge missed';body=`<p class="qtext" style="font-size:30px">No question this time. The tile stays on the board and the turn passes.</p>`;}
  else if(r.type==='misfire'){title='Misfire';body=`<p class="qtext" style="font-size:30px">A wrong answer means no shot. The tile is used up and the turn passes.</p>`;}
  else if(r.type==='miss'||r.type==='near'){title='No damage';body=`<p class="qtext" style="font-size:30px">${r.type==='near'?'Close! A ship is hiding right next to that square.':'The shot found open water.'}</p>`;}
  else{
    teamForColor=t;const h=S.hit,ship=t.ships[S.si],rep=S.rep;
    const rows=[['Tile value',S.value]];
    if(S.surge)rows.push(['Power surge x2','+'+S.value]);
    if(S.mult>1)rows.push([`Speed bonus x${S.mult}`,'+'+(S.dmg-r5(S.value*(S.surge?2:1)))]);
    rows.push([`Damage to the ${ship.name}`,'−'+h.taken]);
    if(h.finishing)rows.push(['Hull collapses: leftover HP lost','−'+h.finishing]);
    if(rep)rows.push([rep.ok?(rep.saved?'Repair saved the ship':'Repair heals'):'Repair failed',rep.ok?'+'+rep.heal:'0']);
    title=t.alive?(ship.sunk?`The ${ship.name} is sunk!`:`${esc(ship.name)} now at ${ship.hp} / ${ship.maxHp} HP`):`${esc(t.name)} is eliminated!`;
    body=`<table class="calc"><tbody>${rows.map(([a,b])=>`<tr><td>${esc(a)}</td><td>${b}</td></tr>`).join('')}<tr class="tot"><td>${esc(t.name)} HP now</td><td>${teamHp(t)} / ${teamMax(t)}</td></tr></tbody></table>
      <div class="fleet2">${shipsHtml(t)}</div>`;
  }
  applyTheme(G.theme,teamForColor.color);
  return topBar('Result')+bannerHtml(teamForColor,'Result')+`<div class="qcols"><aside class="qleft"><div class="cap">${esc(CATS[S.ci].name)}</div><div class="big">${S.value}</div><div class="cap">points${S.surge?' · power surge x2':''}</div></aside>
    <section class="qmid"><h3 class="qtext" style="font-size:40px">${title}</h3>${body}<button class="btn lg block" data-act="done" style="margin-top:auto">Next squad's turn</button></section>
    <aside class="qright"><div class="cap">Next up</div><div style="font-size:26px;font-weight:700;line-height:1.2">${esc(nextTeam().name)}</div></aside></div>`;
}
function afterResult(){
  setTimeout(()=>{
    const r=S&&S.res;if(!r)return;
    if(r.type==='hit'){
      if(S.hit&&S.hit.eliminated&&!S.target.alive)Snd.play('sunk');
    }
    const b=$('[data-act="done"]');if(b)b.focus({preventScroll:true});
  },100);
}
function nextTeam(){let i=G.turn;do{i=(i+1)%G.teams.length;}while(!G.teams[i].alive&&G.teams.some((t,k)=>k!==G.turn&&t.alive)&&i!==G.turn);return G.teams[i];}
function finishStrike(){
  stopTimer();qHandle=null;S=null;
  G.turns=(G.turns||0)+1;
  const alive=G.teams.filter(t=>t.alive);
  if(alive.length<=1){renderGame();endGame('last');return;}
  let i=G.turn;do{i=(i+1)%G.teams.length;}while(!G.teams[i].alive);G.turn=i;
  if(G.used.size>=TILES){
    const lim=G.cfg.end==='board'?1:G.cfg.end==='two'?2:Infinity;
    if(G.round>=lim){renderGame();endGame('board');return;}
    G.used.clear();G.round++;newSurge();
    log(`Board ${G.round}! Every tile is back.`,'info');
  }
  renderGame();saveGame();
}

/* ============================ standings + victory ============================ */
function standings(){return G.teams.slice().sort((a,b)=>(b.alive-a.alive)||(teamHp(b)-teamHp(a))||(shipsAfloat(b)-shipsAfloat(a))||(b.stats.dealt-a.stats.dealt));}
const sameRank=(a,b)=>a.alive===b.alive&&teamHp(a)===teamHp(b)&&shipsAfloat(a)===shipsAfloat(b)&&a.stats.dealt===b.stats.dealt;
function endGame(reason){
  stopTimer();G.over=true;store.del(ck('save'));
  const rank=standings(),top=rank[0],winners=rank.filter(t=>sameRank(t,top));
  applyTheme(G.theme,top.color);
  const names=winners.map(w=>esc(w.name));
  const title=winners.length===1?`<span class="wn" style="--wc:${top.color};--wi:${inkFor(top.color)}">${names[0]}</span> wins!`:`It's a tie: ${names.join(' & ')}!`;
  const why=reason==='last'?'Last squad afloat.':reason==='manual'?'Standings by hit points left.':'Final standings by hit points left.';
  $('#vbox').innerHTML=`<h2>${title}</h2><p class="note" style="font-size:20px">${why}</p>
    <div style="overflow:auto"><table class="stats"><thead><tr><th>#</th><th>Squad</th><th>HP left</th><th>Ships</th><th>Damage</th><th>Repaired</th><th>Hits</th><th>Answers</th></tr></thead><tbody>
    ${rank.map((t,i)=>`<tr style="--tc:${t.color}"><td>${i+1}</td><td><span class="dot"></span>${esc(t.name)}</td><td>${teamHp(t)}/${teamMax(t)}</td><td>${shipsAfloat(t)}/${t.ships.length}</td><td>${t.stats.dealt}</td><td>${t.stats.healed||0}</td><td>${t.stats.hits}/${t.stats.shots}</td><td>${t.stats.right}/${t.stats.asked}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="row2"><button class="btn lg" data-act="rematch">Rematch</button><button class="btn lg ghost" data-act="back">Back to setup</button></div>`;
  $('#victory').hidden=false;renderGame();
  $('[data-act="rematch"]').focus({preventScroll:true});
  Snd.play('win');FX.rain(4200);FX.fireworks(6);Voice.say(winners.length===1?top.name+' wins':'It is a tie');
}
function toSetup(){
  stopTimer();S=null;G=null;
  $('#modal').hidden=true;$('#victory').hidden=true;
  showGame(false);renderSetup();
}
function openEnd(){
  openModal(`<h2>End this game?</h2><p class="note" style="font-size:20px;margin-bottom:14px">Pick what happens next.</p>
    <div class="stack"><button class="btn lg block" data-act="e-rank">Show the standings</button><button class="btn block ghost" data-act="e-keep">Keep playing</button><button class="btn block ghost" data-act="e-save">Save and leave (continue later)</button><button class="btn block bad" data-act="e-quit">Leave without saving</button></div>`);
}

/* ============================ events ============================ */
function cycleTheme(){
  const cur=G?G.theme:setup.cfg.theme,k=THEME_KEYS[(THEME_KEYS.indexOf(cur)+1)%THEME_KEYS.length];
  if(G){G.theme=k;renderGame();saveGame();}
  setup.cfg.theme=k;saveSetup();
}
function toggleSound(){Snd.on=!Snd.on;if(Snd.on)Snd.play('click');if(G)renderGame();else renderSetup();}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act],[data-set]');if(!b||b.disabled)return;
  Snd.unlock();
  if(b.dataset.set){
    const k=b.dataset.set,v=b.dataset.v;
    setup.cfg[k]=(k==='theme')?v:+v;saveSetup();
    if(k==='theme')renderSetup();
    else{$$(`[data-set="${k}"]`).forEach(x=>x.setAttribute('aria-pressed',x.dataset.v===v));perShip();}
    return;
  }
  const a=b.dataset.act;
  const acts={
    start:()=>{if(setup.teams.length<2)return;startGame();},
    resume:()=>resumeGame(),
    discard:()=>{store.del(ck('save'));renderSetup();},
    sound:toggleSound,
    theme:cycleTheme,
    voice:()=>Voice.toggle(),
    vhelp:()=>Voice.help(),
    end:openEnd,
    roster:openRoster,
    'add-team':()=>{if(setup.teams.length<MAX_TEAMS){setup.teams.push({name:defaultName(setup.teams.length),grade:setup.teams[0]?setup.teams[0].grade:3,members:[]});saveSetup();renderTeams();}},
    'del-team':()=>{const i=+b.closest('.trow').dataset.i;if(setup.teams.length>2){setup.teams.splice(i,1);saveSetup();renderTeams();}},
    tile:()=>openStrike(+b.dataset.ci,+b.dataset.r),
    'pick-target':()=>{S.target=G.teams[+b.dataset.i];Snd.play('click');renderGame();},
    lock:()=>{Snd.play('click');Voice.say('Target locked: '+S.target.name);goStep(G.cfg.challenge?'challenge':'ammo');},
    'cancel-strike':closeStrike,
    'chal-ok':()=>{Snd.play('correct');goStep('ammo');},
    'chal-no':()=>{Snd.play('wrong');S.res={type:'jam'};log(`${S.atk.name} missed the challenge. Turn passes.`,'warn');goStep('result');},
    idea:()=>{S.idea=pick(IDEAS.filter(x=>x!==S.idea));$('#idea').textContent=S.idea;Snd.play('click');},
    done:finishStrike,
    rematch:startGame,
    back:toSetup,
    'e-keep':closeModal,
    'e-rank':()=>{closeModal();if(S){stopTimer();S=null;}endGame('manual');},
    'e-save':()=>{closeModal();if(S){stopTimer();if(S.step!=='target'&&S.step!=='challenge')G.used.add(S.key);S=null;}saveGame();toSetup();},
    'e-quit':()=>{closeModal();toSetup();}
  };
  if(acts[a])acts[a]();
});
document.addEventListener('input',e=>{
  const f=e.target.dataset&&e.target.dataset.f;if(!f)return;
  const row=e.target.closest('.trow');if(!row)return;
  const t=setup.teams[+row.dataset.i];
  if(f==='name'){t.name=e.target.value;const i=+row.dataset.i,L=letterFor(t.name,i),bd=$('.badge',row);bd.textContent=L;bd.style.fontSize=(L.length>1?17:22)+'px';}
  if(f==='members'){t.members=members2arr(e.target.value);e.target.rows=Math.max(1,Math.min(4,e.target.value.split('\n').length));}
  saveSetup();
});
document.addEventListener('change',e=>{
  const id=e.target.id,f=e.target.dataset&&e.target.dataset.f;
  if(f==='grade'){setup.teams[+e.target.closest('.trow').dataset.i].grade=+e.target.value;saveSetup();return;}
  if(id==='allGrade'){if(e.target.value==='')return;const g=+e.target.value;setup.teams.forEach(t=>t.grade=g);saveSetup();renderTeams();e.target.value='';return;}
  if(id==='selEnd'){setup.cfg.end=e.target.value;saveSetup();return;}
  if(id==='tLast'){setup.cfg.lastChance=e.target.checked;saveSetup();return;}
  if(id==='tChal'){setup.cfg.challenge=e.target.checked;saveSetup();return;}
  if(id==='tHints'){setup.cfg.hints=e.target.checked;saveSetup();return;}
  if(id==='tSurp'){setup.cfg.surprise=e.target.checked;saveSetup();return;}
  if(id==='tD3'){setup.cfg.d3=e.target.checked;saveSetup();return;}
  if(id==='tFx'){setup.cfg.fx=e.target.checked;autoLite=false;saveSetup();applyFx();return;}
  if(id==='tCall'){setup.cfg.callouts=e.target.checked;saveSetup();if(e.target.checked)Voice.say('Computer voice on');return;}
  if(id==='tWake'){setup.cfg.wake=e.target.checked;saveSetup();return;}
  if(id==='clsSel'){
    if(e.target.value==='__new'){
      openModal(`<h2>New class</h2><div class="field"><label class="lbl" for="newCls">Class name</label><input type="text" id="newCls" maxlength="24" placeholder="Example: Kb"></div><div class="row2"><button class="btn" id="newGo">Create class</button><button class="btn ghost" id="newNo">Cancel</button></div>`);
      const go=()=>{const n=cleanName($('#newCls').value);if(!n)return;if(!meta.list.includes(n))meta.list.push(n);meta.current=n;saveMeta();setup=loadSetup();closeModal();renderSetup();};
      $('#newGo').onclick=go;$('#newCls').onkeydown=ev=>{if(ev.key==='Enter')go();};
      $('#newNo').onclick=()=>{closeModal();renderSetup();};
      return;
    }
    meta.current=e.target.value;saveMeta();setup=loadSetup();renderSetup();
  }
});
document.addEventListener('keydown',e=>{
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.key==='Escape'&&!$('#modal').hidden){closeModal();return;}
  const tag=(e.target&&e.target.tagName)||'';
  if(!S||!qHandle||/INPUT|TEXTAREA|SELECT/.test(tag))return;
  if(e.key==='r'||e.key==='R'){Voice.readQuestion();return;}
  const k=e.key.toLowerCase(),i='1234'.indexOf(k)>=0&&k.length===1?+k-1:'abcd'.indexOf(k)>=0&&k.length===1?'abcd'.indexOf(k):-1;
  if(i>=0)qHandle.pick(i);
});
addEventListener('pointerdown',()=>Snd.unlock(),{once:true});

/* ============================ start-up ============================ */
Snd.vol=typeof setup.cfg.vol==='number'?setup.cfg.vol:.85;
Snd.load();
fit();applyFx();renderSetup();
(function rig(){
  const p=$('#holoBg .parts');
  if(p)for(let i=0;i<18;i++){const d=document.createElement('i');d.style.cssText=`left:${(Math.random()*100).toFixed(1)}%;--d:${(8+Math.random()*10).toFixed(1)}s;--dl:${(-Math.random()*14).toFixed(1)}s;--z:${(2+Math.random()*4).toFixed(1)}px`;p.append(d);}
  let raf=0,mx=0,my=0;
  addEventListener('pointermove',e=>{
    if(e.pointerType!=='mouse')return;
    mx=e.clientX;my=e.clientY;
    if(raf)return;
    raf=requestAnimationFrame(()=>{raf=0;const st=$('#stage');if(!st)return;st.style.setProperty('--px',((mx/innerWidth-.5)*2).toFixed(3));st.style.setProperty('--py',((my/innerHeight-.5)*2).toFixed(3));});
  });
})();
window.__bj={get G(){return G;},get S(){return S;},setup:()=>setup};
