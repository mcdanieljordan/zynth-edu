/* ============================ voice: Web Speech API commands + read-aloud ============================
   Uses the browser's built-in speech recognition (Chrome, Edge, Safari). No library, no API key.
   Everything it can do is also available by click or key; voice is an extra, never the only way. */
const Voice=(()=>{
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  const supported=!!SR;
  let rec=null,want=false,busy=false,hudTimer=0,restartTimer=0,failStreak=0,msg='',busyTimer=0;

  /* ---------- text helpers ---------- */
  const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  const ONES={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19};
  const TENS={twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
  /* "three hundred" -> "300", "forty two" -> "42" (so spoken and written numbers compare equal) */
  function numberize(s){
    s=s.replace(/\b(for|fore)\s+hundred\b/g,'four hundred').replace(/\b(to|too)\s+hundred\b/g,'two hundred')
       .replace(/\bwon\s+hundred\b/g,'one hundred').replace(/\b(tree|free)\s+hundred\b/g,'three hundred')
       .replace(/\b([1-9])\s+hundred\b/g,'$100');
    const t=s.split(' '),out=[];
    for(let i=0;i<t.length;){
      const w=t[i];
      if(w in ONES||w in TENS||w==='hundred'||w==='thousand'){
        let total=0,cur=0,j=i,prev='';
        for(;j<t.length;j++){
          const x=t[j];
          if(x in ONES){if(prev==='ones')break;cur+=ONES[x];prev='ones';}
          else if(x in TENS){if(prev==='ones'||prev==='tens')break;cur+=TENS[x];prev='tens';}
          else if(x==='hundred'){cur=(cur||1)*100;prev='hundred';}
          else if(x==='thousand'){total+=(cur||1)*1000;cur=0;prev='thousand';}
          else if(x==='and'&&j+1<t.length&&(t[j+1] in ONES||t[j+1] in TENS)&&prev)continue;
          else break;
        }
        out.push(String(total+cur));i=Math.max(j,i+1);
      }else{out.push(w);i++;}
    }
    return out.join(' ');
  }
  const SAY={math:['math','maths','mathematics','numbers'],sci:['science','sci'],ela:['language arts','language','reading','english','e l a','ela','arts'],
             hist:['history and geography','history','geography','social studies','social'],fun:['bonus trivia','bonus','trivia','fun']};
  function findCat(t){
    const tt=' '+t+' ';let best=-1,bl=0;
    CATS.forEach((c,i)=>{(SAY[c.key]||[]).concat([norm(c.name)]).forEach(p=>{if(p.length>bl&&tt.includes(' '+p+' ')){best=i;bl=p.length;}});});
    return best;
  }
  const ROW={a:0,ay:0,eh:0,alpha:0,alfa:0,b:1,be:1,bee:1,bravo:1,c:2,see:2,sea:2,charlie:2,d:3,dee:3,delta:3,e:4,echo:4,f:5,ef:5,eff:5,foxtrot:5,g:6,gee:6,golf:6};
  const COL={'1':1,one:1,won:1,'2':2,two:2,to:2,too:2,'3':3,three:3,tree:3,'4':4,four:4,for:4,fore:4,'5':5,five:5,'6':6,six:6,'7':7,seven:7};
  /* "b 4", "bravo four", "bee for", "b4" -> [row, col] (0-based) */
  function parseCoord(t){
    let m=t.match(/\b([a-g])\s?([1-7])\b/);
    if(m)return['abcdefg'.indexOf(m[1]),+m[2]-1];
    const tok=t.split(' ');
    for(let i=0;i<tok.length;i++){
      const l=ROW[tok[i]];if(l==null)continue;
      for(let j=i+1;j<=i+2&&j<tok.length;j++){const d=COL[tok[j]];if(d!=null)return[l,d-1];}
    }
    for(let i=0;i<tok.length-1;i++){const d=COL[tok[i]],l=ROW[tok[i+1]];if(d!=null&&l!=null)return[l,d-1];}
    return null;
  }
  const LET={a:0,ay:0,eh:0,alpha:0,b:1,be:1,bee:1,bravo:1,c:2,see:2,sea:2,charlie:2,d:3,dee:3,delta:3};
  const HOMO={to:'2',too:'2',for:'4',fore:'4',won:'1',ate:'8',tree:'3'};
  /* which option (0-3) did they mean? letter, "option C", "number 2", or the answer text itself */
  const SPOKEN_MATH=/\b(equals|equal|plus|minus|times|divided by|over|point|percent|dollars|dollar|degrees|degree|squared|cubed)\b/g;
  function parseAnswer(t,q){
    t=t.replace(SPOKEN_MATH,' ').replace(/\s+/g,' ').trim();
    const opts=q.opts.map(o=>numberize(norm(o)));
    let m=t.match(/\b(?:option|choice|number|answer|letter)\s+([1-4])\b/);if(m)return+m[1]-1;
    m=t.match(/\b(?:option|choice|answer|letter|pick|select|choose)\s+(?:is\s+)?(a|ay|eh|b|be|bee|c|see|sea|d|dee|alpha|bravo|charlie|delta)\b/);if(m)return LET[m[1]];
    const stripped=t.replace(/\b(the|answer|is|it|its|i|say|think|choose|pick|select|final|lock|in|please|um|uh|my|its)\b/g,' ').replace(/\s+/g,' ').trim();
    if(!stripped&&!t)return-1;
    const homo=stripped.split(' ').map(w=>HOMO[w]||w).join(' ');
    for(const cand of [t,stripped,homo]){
      if(!cand)continue;
      const hits=[];opts.forEach((o,i)=>{if(o===cand)hits.push(i);});
      if(hits.length===1)return hits[0];
    }
    const tok=stripped.split(' ').filter(Boolean);
    if(tok.length&&tok.length<=2){for(const w of tok)if(w in LET)return LET[w];}
    let hits=[];opts.forEach((o,i)=>{if(o&&(' '+stripped+' ').includes(' '+o+' '))hits.push(i);});
    if(hits.length===1)return hits[0];
    hits=[];opts.forEach((o,i)=>{if(stripped.length>=3&&(' '+o+' ').includes(' '+stripped+' '))hits.push(i);});
    if(hits.length===1)return hits[0];
    return-1;
  }
  /* squad by name: any word of the name works; "s one" matches "S1"; "team 3" = third squad */
  function matchTeam(t,foes){
    const tt=' '+t+' ',comp=t.replace(/\s+/g,'');
    const hits=[];
    foes.forEach(f=>{
      const nm=norm(f.name);if(!nm)return;
      if(tt.includes(' '+nm+' ')){hits.push({f,s:100+nm.length});return;}
      const words=nm.split(' ').filter(w=>w.length>=3);
      const got=words.filter(w=>tt.includes(' '+w+' ')||tt.includes(' '+w+'s '));
      if(got.length){hits.push({f,s:got.join('').length});return;}
      const c=nm.replace(/\s+/g,'');
      if(c.length<=4&&comp.includes(c))hits.push({f,s:2});
    });
    if(!hits.length){
      const m=t.match(/\b(?:team|squad|group|number)\s+(\d{1,2})\b/);
      if(m){const f=G.teams[+m[1]-1];if(f&&foes.includes(f))return{f};}
      return null;
    }
    hits.sort((a,b)=>b.s-a.s);
    const top=hits.filter(h=>h.s===hits[0].s);
    return top.length>1?{amb:top.map(h=>h.f)}:{f:top[0].f};
  }

  /* ---------- acting on the screen (always through the same buttons a click would use) ---------- */
  const click=sel=>{const b=$(sel);if(b&&!b.disabled){b.click();return true;}return false;};
  const answered=()=>!!$('#fbHost .fb button');
  const primary=()=>$('#fbHost .fb button')||$('#fireOut > button')||$('[data-act="done"]');
  const NEXT=/\b(next|continue|okay|ok|go on|keep going|proceed|done|move on|next turn|next team)\b/;
  function nextCmd(t){
    if(NEXT.test(t)){const b=primary();if(b&&!b.disabled){b.click();return'Next';}}
    return null;
  }
  function ctx(){
    if(!$('#modal').hidden)return'modal';
    if(!$('#victory').hidden)return'victory';
    if(!G)return'setup';
    if(!S)return'board';
    return S.step;
  }

  const handlers={
    setup(t){
      if(/\b(start|begin|launch)\b.*\b(battle|game|play)\b|^(start|begin)$|\blet s (go|play)\b/.test(t)&&click('[data-act="start"]'))return'Starting the battle';
      if((/\b(continue|resume)\b.*\b(battle|game)\b|^(continue|resume)$/.test(t))&&click('[data-act="resume"]'))return'Continuing the battle';
      return null;
    },
    board(t){
      if(/\b(random|surprise|pick one|pick for me|you pick|any tile|anything)\b/.test(t)){
        const open=$$('.tile:not(.used):not(:disabled)');
        if(open.length){const b=pick(open);b.click();return'Random tile';}
        return{no:'No tiles left'};
      }
      const ci=findCat(t);let row=-1;
      let m=t.match(/\b([1-5])00\b/);
      if(m)row=+m[1]-1;else{m=t.match(/\b(?:row|level|tier)\s*([1-5])\b/);if(m)row=+m[1]-1;}
      if(ci>=0&&row>=0){
        const b=$(`.tile[data-ci="${ci}"][data-r="${row}"]`);if(!b)return null;
        if(b.disabled)return{no:`${CATS[ci].name} ${(row+1)*100} is already used`};
        b.click();return`${CATS[ci].name} ${(row+1)*100}`;
      }
      if(ci>=0)return{no:`Add a number: "${CATS[ci].name} 300"`};
      if(row>=0)return{no:`Add a subject: "Math ${(row+1)*100}"`};
      return null;
    },
    target(t){
      const foes=G.teams.filter(x=>x!==S.atk&&x.alive);
      const m=matchTeam(t,foes);
      if(!m&&/\b(cancel|back|go back|back to the board|never mind|nevermind)\b/.test(t)&&click('[data-act="cancel-strike"]'))return'Back to the board';
      if(m&&m.amb)return{no:'Which squad? '+m.amb.map(f=>f.name).join(' or ')};
      const lock=/\b(lock|lock on|lock in|confirm|engage|yes|go)\b/.test(t);
      if(m&&m.f){
        click(`.tgt[data-i="${G.teams.indexOf(m.f)}"]`);
        if(lock){click('[data-act="lock"]');return'Locked on '+m.f.name;}
        return'Target: '+m.f.name;
      }
      if(lock&&S.target&&click('[data-act="lock"]'))return'Locked on '+S.target.name;
      return null;
    },
    challenge(t){
      if(/\b(another|new idea|different|skip)\b/.test(t)&&click('[data-act="idea"]'))return'New idea';
      if(/\b(missed|miss|failed|fail|didn t|didnt|did not|nope|no|not done|couldn t|could not)\b/.test(t)&&click('[data-act="chal-no"]'))return'Challenge missed';
      if(/\b(completed|complete|done|did it|nailed it|success|passed|yes|finished|good job)\b/.test(t)&&click('[data-act="chal-ok"]'))return'Challenge complete';
      return null;
    },
    ammo(t,c){return handlers.question(t,c);},
    repair(t,c){return handlers.question(t,c);},
    question(t,c){
      if(answered())return nextCmd(t);
      const pb=$('#tpause');
      if(/\b(pause|hold on|freeze|stop the (timer|clock))\b/.test(t)&&pb&&pb.getAttribute('aria-pressed')!=='true'){pb.click();return'Timer paused';}
      if(/\b(resume|unpause|start the (timer|clock))\b/.test(t)&&pb&&pb.getAttribute('aria-pressed')==='true'){pb.click();return'Timer running';}
      if(/\b(more time|add (some )?time|extra time|plus 15|add 15|15 more)\b/.test(t)&&click('#tplus'))return'+15 seconds';
      const q=c==='repair'?S.replQ:S.ammoQ;if(!q)return null;
      const i=parseAnswer(t,q);
      if(i>=0){const b=$$('#qopts .opt')[i];if(b&&!b.disabled){b.click();return'Answer '+'ABCD'[i];}}
      return null;
    },
    fire(t){
      if($('#fireOut > button'))return nextCmd(t);
      if(/\b(random|surprise|anywhere|you pick|pick for me|any square)\b/.test(t)){
        const open=$$('#sea .sc:not(:disabled)');if(open.length){pick(open).click();return'Random shot';}
      }
      const co=parseCoord(t);
      if(co){
        const b=$$('#sea .sc')[co[0]*7+co[1]],name='ABCDEFG'[co[0]]+(co[1]+1);
        if(!b)return null;
        if(b.disabled)return{no:name+' was already fired on'};
        b.click();return'Fire '+name;
      }
      return null;
    },
    result(t){return nextCmd(t);},
    victory(t){
      if(/\b(rematch|play again|again|new game|one more)\b/.test(t)&&click('[data-act="rematch"]'))return'Rematch';
      if(/\b(back|setup|settings|home|menu)\b/.test(t)&&click('[data-act="back"]'))return'Back to setup';
      return null;
    },
    modal(t){
      if(/\bkeep playing\b|\b(keep|continue) (going|playing)\b/.test(t)&&click('[data-act="e-keep"]'))return'Keep playing';
      if(/\b(standings|ranking|rank|scores)\b/.test(t)&&click('[data-act="e-rank"]'))return'Showing standings';
      if(/\bsave\b/.test(t)&&click('[data-act="e-save"]'))return'Saved';
      if(/\b(leave|quit|exit|discard)\b/.test(t)&&click('[data-act="e-quit"]'))return'Leaving';
      if(/\b(close|cancel|never mind|nevermind|dismiss|okay|ok|got it)\b/.test(t)){closeModal();return'Closed';}
      return null;
    }
  };
  function globalCmd(t,c){
    if(/\b(stop listening|stop voice|voice off|mute (the )?(mic|microphone)|turn off (the )?(mic|microphone|voice)|stop the mic)\b/.test(t)){stop();return'Mic off';}
    if(/\b(help|what can i say|voice commands|show commands)\b/.test(t)&&c!=='modal'){help();return'Voice commands';}
    if(/\b(sound|sounds|music|volume) off\b|\bmute (the )?(sound|sounds|game)\b/.test(t)){if(Snd.on)toggleSound();return'Sound off';}
    if(/\b(sound|sounds) on\b|\bunmute\b/.test(t)){if(!Snd.on)toggleSound();return'Sound on';}
    if(/\b(next|change|switch|new|different) (theme|look|skin)\b/.test(t)){cycleTheme();return'Next theme';}
    if((c==='ammo'||c==='repair')&&/\bread (the )?(question|it|that|again|aloud|out loud)\b|\brepeat (the )?(question|that|it)\b/.test(t)){readQuestion();return'Reading the question';}
    if((c==='board'||c==='setup')&&/\b(end|finish) (the )?game\b/.test(t)&&G){openEnd();return'End game?';}
    return null;
  }

  /* one spoken phrase in -> {ok, act, kind} out */
  function handle(raw){
    let t=norm(raw);
    if(!t)return{ok:false,act:''};
    if(setup&&setup.cfg&&setup.cfg.wake){
      const m=t.match(/^(?:hey |ok |okay )?(?:computer|zynth|synth|zenith|zinth|sinth)\b\s*/);
      if(!m)return{ok:false,act:'',skip:true};
      t=t.slice(m[0].length);
      if(!t)return{ok:true,act:'Yes?'};
    }
    t=numberize(t);
    const c=ctx();
    let r=globalCmd(t,c);
    if(r==null&&handlers[c])r=handlers[c](t,c);
    if(r==null)return{ok:false,act:''};
    if(typeof r==='object')return{ok:false,act:r.no,kind:'no'};
    return{ok:true,act:r};
  }

  /* ---------- on-screen status ---------- */
  function hud(heard,act,kind){
    const h=$('#voiceHud');if(!h)return;
    h.hidden=false;h.className=(want?'live ':'')+(kind||'');
    $('#vHeard').textContent=heard||'';$('#vAct').textContent=act||'';
    clearTimeout(hudTimer);
    hudTimer=setTimeout(()=>{h.hidden=true;},kind==='err'?6000:3800);
  }
  /* shown once when the mic is switched on; after that only the glowing mic button stays (so it never covers the board) */
  function startHud(){
    if(!want)return;
    hud(setup.cfg.wake?'Say "computer", then a command':'Listening','Say "help" for commands','ok');
  }
  function paint(){
    $$('[data-act="voice"]').forEach(b=>{
      b.classList.toggle('live',want);b.setAttribute('aria-pressed',String(want));
      const l=$('.vlab',b);if(l)l.textContent=want?'Voice on':'Voice off';
    });
  }

  /* ---------- the microphone ---------- */
  function build(){
    rec=new SR();
    rec.continuous=true;rec.interimResults=true;rec.lang='en-US';rec.maxAlternatives=3;
    rec.onstart=()=>{failStreak=0;paint();};
    rec.onresult=e=>{
      for(let i=e.resultIndex;i<e.results.length;i++){
        const r=e.results[i];
        if(!r.isFinal){if(!busy)hud('“'+r[0].transcript.trim()+'…”','','');continue;}
        if(busy)continue;
        const heard=r[0].transcript.trim();let best=null;
        for(let k=0;k<r.length;k++){
          const x=handle(r[k].transcript);
          if(x.ok){best=x;break;}
          if(!best||(!best.act&&x.act)||(best.skip&&!x.skip))best=x;
        }
        if(best&&best.ok)hud('“'+heard+'”','✓ '+best.act,'ok');
        else if(best&&best.skip)hud('“'+heard+'”','Waiting for the wake word','');
        else if(best&&best.act)hud('“'+heard+'”',best.act,'no');
        else hud('“'+heard+'”','Not a command. Say "help"','no');
      }
    };
    rec.onerror=e=>{
      const er=e.error;
      if(er==='not-allowed'||er==='service-not-allowed'){want=false;msg='The mic is blocked. Allow the microphone for this page, and open the game from its web link (a preview window may block it).';}
      else if(er==='audio-capture'){want=false;msg='No microphone found.';}
      else if(er==='network'){failStreak++;msg='Speech service unreachable. It needs the internet.';if(failStreak>3)want=false;}
    };
    rec.onend=()=>{
      paint();
      if(want){clearTimeout(restartTimer);restartTimer=setTimeout(()=>{try{rec.start();}catch(err){}},350);}
      else if(msg){hud('',msg,'err');msg='';}
    };
  }
  function start(){
    if(!supported){hud('','Voice needs Chrome, Edge or Safari','err');return false;}
    want=true;msg='';
    if(!rec)build();
    try{rec.start();}catch(e){/* already running */}
    paint();startHud();return true;
  }
  function stop(){
    want=false;clearTimeout(restartTimer);
    try{rec&&rec.stop();}catch(e){}
    paint();hud('','Mic off','');
  }
  const toggle=()=>{want?stop():start();};

  /* ---------- talking back: read-aloud + optional computer-voice callouts ---------- */
  const speakable=s=>String(s)
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,' ')
    .replace(/×/g,' times ').replace(/÷/g,' divided by ').replace(/−/g,' minus ').replace(/\+/g,' plus ').replace(/=/g,' equals ')
    .replace(/²/g,' squared').replace(/³/g,' cubed').replace(/√/g,' square root of ').replace(/%/g,' percent').replace(/\s+/g,' ');
  function say(text,force){
    if(!('speechSynthesis' in window))return;
    if(!force&&!(setup&&setup.cfg&&setup.cfg.callouts))return;
    try{
      speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(speakable(text));
      u.rate=1.02;u.pitch=.95;
      busy=true;clearTimeout(busyTimer);busyTimer=setTimeout(()=>{busy=false;},15000);
      const free=()=>{clearTimeout(busyTimer);busyTimer=setTimeout(()=>{busy=false;},450);};
      u.onend=free;u.onerror=free;
      speechSynthesis.speak(u);
    }catch(e){busy=false;}
  }
  function readQuestion(){
    if(!S)return;
    const q=S.step==='repair'?S.replQ:S.ammoQ;if(!q)return;
    const opts=answered()?'':q.opts.map((o,i)=>'ABCD'[i]+'. '+o).join('. ');
    say(q.q+'. '+opts,true);
  }

  function help(){
    const s=t=>`<span class="say">${t}</span>`;
    openModal(`<h2>Voice commands</h2>
      <p class="note" style="margin-bottom:8px">Click the mic button, allow the microphone, then speak. Everything also works by clicking or with the keyboard.</p>
      <div class="vh">
        <div><h4>Pick a tile</h4>${s('Math 300')}${s('Science four hundred')}${s('History 200')}${s('Language arts 500')}${s('Bonus 100')}${s('Random tile')}</div>
        <div><h4>Choose a target</h4>${s('Blue Barracudas')} (any word in the name works) ${s('Lock on')}${s('Back')}</div>
        <div><h4>Challenge</h4>${s('Completed')}${s('Missed')}${s('Another idea')}</div>
        <div><h4>Answer</h4>${s('A')}${s('B')}${s('C')}${s('D')}${s('Option C')} or say the answer itself</div>
        <div><h4>Fire</h4>${s('Fire B 4')}${s('Alpha three')}${s('Random shot')}</div>
        <div><h4>Keep going</h4>${s('Next')}${s('Read the question')}${s('Pause')}${s('Resume')}${s('More time')}</div>
        <div><h4>Anytime</h4>${s('Next theme')}${s('Sound off')}${s('Help')}${s('Stop listening')}</div>
        <div><h4>Good to know</h4>Speak after the mic pulses. Squads named like S1 work: say "S one". Turn on the wake word in Look to ignore classroom chatter. Chrome and Edge send voice to a cloud speech service.</div>
      </div>
      <button class="btn block" data-act="e-keep">Got it</button>`);
  }

  const note=(text)=>hud('',text,'ok');
  return{get on(){return want;},supported,note,start,stop,toggle,handle,say,readQuestion,help,paint,_t:{norm,numberize,parseCoord,parseAnswer,findCat,matchTeam,ctx}};
})();
