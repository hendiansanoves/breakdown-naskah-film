/* BC7 Movie Maker — logika game, skor, Production Book, ekspor. */
/* ============ STATE ============ */
const KEY="bc7-movie-maker-state", VER=2;
function fresh(){const book={};SECTIONS.forEach(([id])=>book[id]={status:"not_started",data:{},note:""});return{version:VER,created:new Date().toISOString(),profile:null,levels:{},book,reflection:{r1:"",r2:"",r3:""},sound:true,lastMap:null}}
function load(){try{const raw=localStorage.getItem(KEY);if(!raw)return fresh();const s=JSON.parse(raw);if(!s||typeof s!=="object")return fresh();
  const f=fresh();const m=Object.assign(f,s);m.book=Object.assign(fresh().book,s.book||{});m.reflection=Object.assign(f.reflection,s.reflection||{});m.version=VER;return m}catch(e){return fresh()}}
function save(){try{S.updated=new Date().toISOString();localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
let S=load();
let UI={screen:"splash",run:null,modal:null,sel:"script_analysis",profileDraft:null};

/* ============ HELPERS ============ */
const isFramed=()=>{try{return window.self!==window.top}catch(e){return true}};
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const rp=n=>"Rp"+Number(n).toLocaleString("id-ID");
const shuffle=a=>{const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b};
const lv=id=>LEVELS.find(l=>l.id===id);
const L=id=>S.levels[id]||{best:0,xp:0,done:false,attempts:0};
const totalXP=()=>Math.min(CONFIG.max_xp,LEVELS.reduce((a,l)=>a+Math.min(l.xp,L(l.id).xp||0),0));
function unlocked(id){const i=LEVELS.findIndex(l=>l.id===id);if(i===0)return true;const p=L(LEVELS[i-1].id);return p.done&&p.best>=70}
const PRAISE=["Mantap, tepat sasaran! 🎯","Slay! Ini jawaban sutradara pro.","Gaskeun, kamu paham banget.","Clean! Kru bangga sama kamu.","Valid! No debat."];
const MISS=["Hampir! Cek penjelasannya ya.","Belum pas, tapi ini bahan belajar.","Plot twist: itu kurang tepat.","Retake dikit, kamu pasti bisa."];
const pick=a=>a[Math.floor(Math.random()*a.length)];

/* sound */
let AC=null;
function beep(type){if(!S.sound)return;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();const seq=type==="ok"?[523,659,784]:type==="no"?[300,220]:type==="win"?[523,659,784,1046]:[440];
  seq.forEach((f,i)=>{const o=AC.createOscillator(),g=AC.createGain();o.type=type==="no"?"sawtooth":"square";o.frequency.value=f;g.gain.setValueAtTime(.06,AC.currentTime+i*.09);g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+i*.09+.16);o.connect(g).connect(AC.destination);o.start(AC.currentTime+i*.09);o.stop(AC.currentTime+i*.09+.18)})}catch(e){}}
function toast(msg){const t=document.createElement("div");t.className="toast";t.textContent=msg;$("#toasts").appendChild(t);setTimeout(()=>t.remove(),2600)}
function confetti(){if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;const cs=["#FF4FA3","#FFE14D","#53E2FF","#7DFFB3","#9B7BFF"];for(let i=0;i<70;i++){const d=document.createElement("i");d.className="confetti";d.style.left=Math.random()*100+"vw";d.style.background=cs[i%cs.length];d.style.animationDuration=(1.8+Math.random()*1.8)+"s";d.style.animationDelay=Math.random()*.4+"s";d.style.borderRadius=Math.random()>.5?"50%":"2px";document.body.appendChild(d);setTimeout(()=>d.remove(),4200)}}

/* ============ SCORING & READINESS ============ */
function permitsOK(){const d=S.book.location_list.data;return !!(d&&d.lokasi&&d.lokasi.length===3&&d.lokasi.every(x=>x.izin==="Disetujui"))}
function budgetOK(){const d=S.book.budget_sheet.data;return !!(d&&typeof d.total==="number"&&d.total<=CONFIG.initial_budget_idr)}
function k3OK(){const d=S.book.k3_checklist.data;return !!(d&&d.terkonfirmasi===true)}
function approvedCount(){return SECTIONS.filter(([id])=>S.book[id].status==="approved").length}
function reflectionDone(){return ["r1","r2","r3"].filter(k=>(S.reflection[k]||"").trim().length>=30).length}
function score(){
  const avg=ids=>ids.reduce((a,id)=>a+L(id).best,0)/ids.length;
  const docs=40*approvedCount()/SECTIONS.length;
  const dec=30*avg(["L03","L04","L06"])/100;
  const con=20*avg(["L01","L02","L05"])/100;
  const ref=10*reflectionDone()/3;
  return{docs,dec,con,ref,total:Math.round(docs+dec+con+ref)};
}
function gates(){const sc=score().total;return[
  {k:"levels",ok:LEVELS.every(l=>L(l.id).done&&L(l.id).best>=70),t:"Enam level tuntas (mastery ≥ 70)",d:LEVELS.filter(l=>!(L(l.id).done&&L(l.id).best>=70)).map(l=>l.title).join(", ")||"Semua level beres"},
  {k:"score",ok:sc>=CONFIG.passing_score,t:"Nilai kompetensi minimal 75",d:"Nilai saat ini "+sc},
  {k:"docs",ok:approvedCount()===SECTIONS.length,t:"Semua dokumen Production Book disetujui",d:approvedCount()+"/"+SECTIONS.length+" disetujui"},
  {k:"izin",ok:permitsOK(),t:"Izin lokasi dipastikan",d:permitsOK()?"Lab, koridor, dan kelas disetujui":"Ada lokasi tanpa izin. Ulangi Crew Commander."},
  {k:"budget",ok:budgetOK(),t:"Anggaran tidak defisit",d:budgetOK()?rp(S.book.budget_sheet.data.total)+" dari "+rp(CONFIG.initial_budget_idr):"Budget sheet belum valid"},
  {k:"k3",ok:k3OK(),t:"K3 terkonfirmasi",d:k3OK()?"Checklist K3 lengkap tanpa tindakan berisiko":"Checklist K3 belum lengkap atau ada tindakan berisiko"}]}
const ready=()=>gates().every(g=>g.ok);

/* ============ RENDER ============ */
function render(){
  const app=$("#app");
  const scr=UI.screen;
  let html="";
  if(scr!=="splash")html+=topbar();
  html+='<main class="wrap" id="main">'+({splash,menu,profile,briefing,map,play,book,result}[scr]||menu)()+"</main>";
  if(UI.modal)html+=modal();
  app.innerHTML=html;
  if(UI.modal){const b=app.querySelector(".modal [data-act]");b&&b.focus()}
}
function topbar(){
  const p=S.profile;const xp=totalXP();
  const nb=(s,l,ic)=>`<button class="btn" data-act="go" data-to="${s}" ${UI.screen===s?'aria-current="page"':""} ${!p&&s!=="menu"?"disabled":""}>${ic}<span class="lbl">${l}</span></button>`;
  return `<header class="top"><div class="top-in">
   <button class="logo" data-act="go" data-to="menu" aria-label="Menu utama"><b>BC7</b><span>MOVIE MAKER</span></button>
   ${p?`<div class="player"><span class="ava" aria-hidden="true">${esc(p.avatar)}</span><span>${esc(p.name)}</span></div>`:""}
   <div class="xp" aria-label="XP ${xp} dari 1000"><div class="xpbar"><i style="width:${xp/10}%"></i></div><span class="xpnum">${xp}/1000 XP</span></div>
   <nav class="nav" aria-label="Navigasi">${nb("map","Misi","🗺️ ")}${nb("book","Book","📒 ")}${nb("result","Hasil","🏆 ")}
    <button class="btn" data-act="sound" aria-label="Suara ${S.sound?"aktif":"mati"}">${S.sound?"🔊":"🔇"}</button></nav>
  </div></header>`;
}
function splash(){
  return `<section class="splash"><div class="stack" style="align-items:center;gap:26px">
   <div class="row" style="justify-content:center"><span class="sticker bob" style="background:var(--cyan)">SMK BROADCASTING</span><span class="sticker" style="background:var(--yellow);transform:rotate(5deg)">PRA-PRODUKSI</span></div>
   <h1 class="title-xl"><span class="o">BC7</span><br><span class="p">Movie</span> Maker</h1>
   <p class="muted" style="max-width:46ch;font-size:1.05rem">Kamu jadi sutradara film pendek <b style="color:var(--text)">SATU FILE TERAKHIR</b>. Bedah naskah, atur kru, jaga anggaran, sampai lolos audit <b style="color:var(--yellow)">Ready to Shoot</b>.</p>
   <button class="btn pink" style="min-height:62px;padding:16px 34px;font-size:1.1rem" data-act="go" data-to="menu">▶ MULAI</button>
   <div class="marquee" aria-hidden="true"><span>${"FROM SCRIPT TO SCREEN ✦ 6 LEVEL ✦ 1000 XP ✦ RP300.000 ✦ NO DEFISIT ✦ K3 FIRST ✦ ".repeat(4)}</span></div>
  </div></section>`;
}
function menu(){
  const has=!!S.profile;
  return `<div class="menu-grid">
   <section class="stack" style="gap:20px">
    <span class="eyebrow">Main Menu</span>
    <h1 class="title-xl" style="font-size:clamp(2.2rem,6vw,4.4rem)">Siap jadi <span class="p">sutradara?</span></h1>
    <p class="muted" style="max-width:52ch">Enam misi pra-produksi. Setiap misi menghasilkan dokumen nyata untuk Production Book kamu. Semua cerita dan data adalah simulasi pembelajaran.</p>
    ${has?`<div class="card c-cyan row"><span class="ava" style="width:52px;height:52px;font-size:1.6rem">${esc(S.profile.avatar)}</span><div style="min-width:0"><b>${esc(S.profile.name)}</b><div class="muted" style="font-size:.88rem">${esc(S.profile.kelas||"-")} · Absen ${esc(S.profile.absen||"-")} · ${totalXP()} XP</div></div></div>`:""}
   </section>
   <nav class="menu-btns" aria-label="Menu utama">
    <button class="btn pink" data-act="newgame"><span>New Game</span><span>✦</span></button>
    <button class="btn" data-act="go" data-to="map" ${has?"":"disabled"}><span>Continue</span><span>▶</span></button>
    <button class="btn cyan" data-act="help"><span>Petunjuk</span><span>?</span></button>
    <button class="btn mint" data-act="go" data-to="profile"><span>Profil</span><span>☺</span></button>
    <button class="btn ghost" data-act="reset" ${has?"":"disabled"}><span>Reset progres</span><span>⟲</span></button>
   </nav></div>`;
}
const AVATARS=["🎬","🎥","🎧","✂️","💡","🎞️","📝","⭐"];
function profile(){
  const d=UI.profileDraft||(UI.profileDraft=Object.assign({name:"",kelas:"",absen:"",avatar:"🎬",demo:false},S.profile||{}));
  return `<section class="stack" style="max-width:720px;margin:0 auto;gap:22px">
   <span class="eyebrow">Player Profile</span><h2>Siapa sutradaranya?</h2>
   <form class="card c-yellow stack" id="pform" novalidate>
    <div class="grid2"><label class="f" for="p-name">Nama atau alias<input class="inp" id="p-name" data-bind="name" value="${esc(d.name)}" placeholder="Tulis nama kamu" autocomplete="off"></label>
    <label class="f" for="p-kelas">Kelas<input class="inp" id="p-kelas" data-bind="kelas" value="${esc(d.kelas)}" placeholder="Contoh: XI BC 1" autocomplete="off"></label></div>
    <label class="f" for="p-absen" style="max-width:220px">Nomor absen<input class="inp" id="p-absen" data-bind="absen" inputmode="numeric" value="${esc(d.absen)}" placeholder="Contoh: 07" autocomplete="off"></label>
    <div class="stack" style="gap:8px"><b style="font-size:.9rem">Pilih avatar</b><div class="avatars" role="group" aria-label="Avatar">${AVATARS.map(a=>`<button type="button" data-act="avatar" data-v="${a}" aria-pressed="${d.avatar===a}" aria-label="Avatar ${a}">${a}</button>`).join("")}</div></div>
    <p id="perr" class="muted" role="alert"></p>
    <div class="row"><button class="btn pink" type="submit">Simpan & lanjut</button><button class="btn ghost" type="button" data-act="demo">Mode demo anonim</button></div>
    <p class="muted" style="font-size:.82rem">Data hanya tersimpan di browser perangkat ini. Gunakan mode demo bila tidak ingin mengisi data pribadi.</p>
   </form></section>`;
}
function briefing(){
  return `<section class="stack" style="gap:28px">
   <div class="stack" style="gap:10px"><span class="eyebrow">Story Briefing · ${STORY.genre} · ±${STORY.duration} menit</span>
   <h2 style="font-size:clamp(1.8rem,5vw,3.2rem)">${STORY.title}</h2>
   <p style="max-width:68ch;font-size:1.05rem"><b style="color:var(--yellow)">Logline.</b> ${STORY.logline}</p></div>
   <div class="grid2" style="align-items:start">
    <div class="card c-violet stack"><h3>Sinopsis</h3><p class="muted">${STORY.synopsis}</p><p><b>Tema:</b> ${STORY.theme}<br><b>Setting:</b> ${STORY.setting}</p></div>
    <div class="script" aria-label="Kutipan naskah">${STORY.excerpt.map(e=>{const s=STORY.scenes.find(x=>x.id===e.scene);return `<p class="hd">${e.scene}. ${s.heading}</p>${e.lines.map(([sp,t])=>`<p class="sp">${sp}</p><p class="ln">${esc(t)}</p>`).join("")}`}).join('<hr style="border:0;border-top:1px dashed #999;margin:16px 0">')}</div>
   </div>
   <div class="stack"><h3>Karakter</h3><div class="cast">${STORY.characters.map(c=>`<div class="castc"><span class="em" aria-hidden="true">${c.em}</span><h3 style="margin-top:6px">${c.name}</h3><span class="chip info" style="margin:6px 0">${c.role}</span><p class="muted" style="font-size:.88rem">${c.desc}</p></div>`).join("")}</div></div>
   <div class="stack"><h3>Enam adegan</h3><div class="scenes">${STORY.scenes.map(s=>`<div class="scene"><span class="id">${s.id} · ${s.min} menit</span><p class="h">${s.heading}</p><p style="font-size:.9rem">${s.summary}</p></div>`).join("")}</div></div>
   <div><button class="btn pink" style="min-height:58px" data-act="go" data-to="map">Mulai misi →</button></div>
  </section>`;
}
function map(){
  return `<section class="stack" style="gap:24px">
   <div class="row" style="justify-content:space-between;align-items:flex-end"><div class="stack" style="gap:8px"><span class="eyebrow">Mission Map</span><h2>Enam take menuju hari shooting</h2></div>
   <button class="btn ghost sm" data-act="go" data-to="briefing">📜 Baca briefing</button></div>
   <div class="levels">${LEVELS.map((l,i)=>{const st=L(l.id),un=unlocked(l.id);const chip=!un?'<span class="chip dim">Terkunci</span>':st.done?(st.best>=70?'<span class="chip ok">Selesai</span>':'<span class="chip warn">Perlu retake</span>'):'<span class="chip info">Siap main</span>';
    return `<button class="slate" style="--c:${l.c}" data-act="${un?"start":"locked"}" data-id="${l.id}" aria-disabled="${!un}" aria-label="Level ${i+1} ${l.title}. ${un?"":"Terkunci."}">
     <div class="stripes"></div>${un?"":'<span class="lock" aria-hidden="true">🔒</span>'}
     <div class="body"><span class="take">TAKE 0${i+1} · ${l.xp} XP</span><h3>${l.title}</h3><p class="muted" style="font-size:.88rem">${l.objective}</p>
     <div class="mini" aria-hidden="true"><i style="width:${st.best||0}%"></i></div>
     <div class="meta">${chip}<span class="xpnum">${st.best?("Mastery "+st.best+"%"):"—"} · ${st.xp||0}/${l.xp} XP</span></div>
     ${!un&&i>0?`<small class="muted">Buka dengan mastery ≥ 70 di ${LEVELS[i-1].title}</small>`:""}</div></button>`}).join("")}</div>
   <div class="row"><button class="btn cyan" data-act="go" data-to="book">📒 Production Book</button><button class="btn" data-act="go" data-to="result">🏆 Audit Ready to Shoot</button></div>
  </section>`;
}

/* ---- gameplay ---- */
function initTask(t){
  const ts={};
  if(t.type==="order"){let o;do{o=shuffle(t.items.map(x=>x.id))}while(o.join()===t.items.map(x=>x.id).join());ts.order=o}
  if(t.type==="sort")ts.map={};
  if(t.type==="match"){ts.map={};ts.opts=shuffle(t.pairs.map(p=>p[1]))}
  if(t.type==="budget")ts.sel=[];
  if(t.type==="checklist")ts.sel=[];
  if(t.type==="permit")ts.map={};
  if(t.type==="choice")ts.pick=null;
  return ts;
}
function startLevel(id){
  const l=lv(id);UI.run={lv:id,i:-1,scores:[],answers:{},ts:null,checked:false,result:null,streak:0,done:false};UI.screen="play";render();window.scrollTo(0,0)
}
function play(){
  const r=UI.run;if(!r)return map();
  const l=lv(r.lv);const idx=LEVELS.indexOf(l);
  const dots=`<div class="dots" aria-label="Progres misi">${l.tasks.map((t,i)=>`<i class="${i<r.scores.length?(r.scores[i]>=.7?"ok":"no"):i===r.i?"on":""}"></i>`).join("")}</div>`;
  let npcKey=l.npc,msg=l.intro;
  if(r.i>=0&&!r.done){const t=l.tasks[r.i];npcKey=t.npc||l.npc;msg=r.checked?(r.result.score>=.7?pick(PRAISE):pick(MISS)):(r.i===0?l.intro:"Misi "+(r.i+1)+" dari "+l.tasks.length+". Fokus, kamu pasti bisa.")}
  if(r.done)msg=r.final.mastery>=70?"Take OK! Dokumenmu sudah masuk Production Book. Cek lalu setujui ya.":"Belum lolos 70. Baca feedback, lalu retake. XP terbaikmu tetap aman.";
  const n=NPC[npcKey];
  const side=`<aside class="card c-cyan npc stack" aria-label="Dialog NPC"><span class="take eyebrow" style="color:${l.c}">TAKE 0${idx+1}</span><h3>${l.title}</h3>${dots}
    <div class="row" style="margin-top:6px"><span class="face" style="background:${n.bg}" aria-hidden="true">${n.em}</span><b>${n.name}</b></div>
    <p class="bubble" aria-live="polite">${esc(msg)}</p>${r.streak>=2?`<span class="chip warn">🔥 Combo x${r.streak}</span>`:""}
    <button class="btn ghost sm" data-act="go" data-to="map">← Kembali ke peta</button></aside>`;
  let main;
  if(r.i<0)main=`<section class="card stack" style="gap:18px"><span class="eyebrow">Brief misi</span><h2>${l.objective}</h2>
     <p class="muted">${l.tasks.length} misi. Selesaikan semuanya untuk mendapat nilai mastery. Mastery ≥ 70 membuka level berikutnya. Mengulang level tidak menambah XP melebihi batas ${l.xp} XP.</p>
     <p><b>Output ke Production Book:</b> ${SECTIONS.filter(s=>s[2]===l.id).map(s=>`<span class="chip info" style="margin:2px">${s[1]}</span>`).join(" ")}</p>
     <div><button class="btn pink" data-act="begin">Action! 🎬</button></div></section>`;
  else if(r.done)main=levelDone(l);
  else main=taskView(l.tasks[r.i],r);
  return `<div class="play">${side}<div class="stack" style="gap:18px;min-width:0">${main}</div></div>`;
}
function taskView(t,r){
  const ts=r.ts,ck=r.checked,dis=ck?"disabled":"";
  let body="";
  if(t.type==="choice"){body=`<div class="opts" role="group" aria-label="Pilihan jawaban">${t.options.map(([id,tx],i)=>{let cls="";if(ck){if(id===t.correct)cls="right";else if(ts.pick===id)cls="wrong"}
     return `<button class="opt ${cls}" data-act="pick" data-v="${id}" aria-pressed="${ts.pick===id}" ${dis}><span class="k">${"ABC"[i]}</span><span>${esc(tx)}</span></button>`}).join("")}</div>`}
  if(t.type==="order"){body=`<ol class="olist">${ts.order.map((id,i)=>{const it=t.items.find(x=>x.id===id);const cls=ck?(t.items[i].id===id?"right":"wrong"):"";
     return `<li class="oitem ${cls}"><span class="n">${i+1}</span>${t.frames?`<span class="frame" aria-hidden="true">${it.code}</span>`:""}<span class="t">${it.sub?`<small>${esc(it.sub)}</small>`:""}${esc(it.label)}</span>
     <span class="mv"><button data-act="mv" data-i="${i}" data-d="-1" aria-label="Naikkan: ${esc(it.label)}" ${ck||i===0?"disabled":""}>▲</button><button data-act="mv" data-i="${i}" data-d="1" aria-label="Turunkan: ${esc(it.label)}" ${ck||i===ts.order.length-1?"disabled":""}>▼</button></span></li>`}).join("")}</ol>
     ${ck?`<p class="muted" style="font-size:.88rem">Urutan benar: ${t.items.map(x=>t.frames?x.code+" "+x.label:x.id).join(" → ")}</p>`:""}`}
  if(t.type==="sort"){body=`<div class="row" aria-hidden="true">${t.cats.map(c=>`<span class="chip" style="color:${CATS[c].c}">${CATS[c].label}: ${Object.values(ts.map).filter(v=>v===c).length}</span>`).join("")}</div>
     <div class="sortg">${t.items.map(([id,lb,cat])=>{const cls=ck?(ts.map[id]===cat?"right":"wrong"):"";return `<div class="sitem ${cls}"><span class="lb">${esc(lb)}${ck&&ts.map[id]!==cat?` <small style="color:var(--mint)">→ ${CATS[cat].label}</small>`:""}</span>
     <div class="pills" role="group" aria-label="Kategori untuk ${esc(lb)}">${t.cats.map(c=>`<button class="pill" style="--pc:${CATS[c].c}" data-act="sort" data-id="${id}" data-v="${c}" aria-pressed="${ts.map[id]===c}" ${dis}>${CATS[c].label}</button>`).join("")}</div></div>`}).join("")}</div>`}
  if(t.type==="match"){body=`<div class="sortg">${t.pairs.map(([a,b],i)=>{const cls=ck?(ts.map[i]===b?"right":"wrong"):"";return `<div class="mrow ${cls}"><label class="lb" for="m${i}">${esc(a)}</label>
     <select class="inp" id="m${i}" data-act-change="match" data-i="${i}" ${dis}><option value="">Pilih pasangan…</option>${ts.opts.map(o=>`<option ${ts.map[i]===o?"selected":""}>${esc(o)}</option>`).join("")}</select>
     ${ck&&ts.map[i]!==b?`<small>Jawaban tepat: ${esc(b)}</small>`:""}</div>`}).join("")}</div>`}
  if(t.type==="budget"){const tot=ts.sel.reduce((a,id)=>a+t.items.find(x=>x[0]===id)[2],0),over=tot>t.budget;
     body=`<div class="meter ${over?"over":""}" role="status" aria-live="polite"><div class="row" style="justify-content:space-between"><span class="eyebrow">Total terpakai</span><span class="big">${rp(tot)} <span class="muted" style="font-size:.8rem">/ ${rp(t.budget)}</span></span></div>
     <div class="bar"><i style="width:${Math.min(100,tot/t.budget*100)}%"></i></div><b style="color:${over?"var(--red)":"var(--mint)"}">${over?"DEFISIT "+rp(tot-t.budget)+" — tidak bisa diajukan":"Sisa dana "+rp(t.budget-tot)}</b></div>
     <div class="budget">${t.items.map(([id,lb,c])=>`<button class="bitem" data-act="budget" data-id="${id}" aria-pressed="${ts.sel.includes(id)}" ${dis}><span style="font-weight:700">${ts.sel.includes(id)?"✓ ":""}${esc(lb)}</span><span class="c">${rp(c)}</span></button>`).join("")}</div>`}
  if(t.type==="checklist"){body=`<div class="sortg">${t.items.map(([id,lb,good])=>{const on=ts.sel.includes(id);const cls=ck?(on===good?"right":"wrong"):"";return `<button class="check ${cls}" data-act="chk" data-id="${id}" aria-pressed="${on}" ${dis}><span class="box" aria-hidden="true">${on?"✓":""}</span><span>${esc(lb)}${ck&&!good?' <small style="color:var(--red)">(berisiko, jangan dilakukan)</small>':""}</span></button>`}).join("")}</div>`}
  if(t.type==="permit"){body=`<div class="sortg">${t.locs.map(loc=>{const v=ts.map[loc];const cls=ck?(v==="req"?"right":"wrong"):"";return `<div class="sitem ${cls}"><span class="lb">📍 ${STORY.locations[loc]}</span><div class="pills" role="group" aria-label="Tindakan untuk ${STORY.locations[loc]}">
     <button class="pill" style="--pc:var(--mint)" data-act="permit" data-id="${loc}" data-v="req" aria-pressed="${v==="req"}" ${dis}>Ajukan surat izin + jam pakai</button>
     <button class="pill" style="--pc:var(--red)" data-act="permit" data-id="${loc}" data-v="skip" aria-pressed="${v==="skip"}" ${dis}>Langsung pakai, masih di sekolah</button></div></div>`}).join("")}</div>`}
  const fb=r.warn?`<div class="fb warn" role="alert"><span class="em">⚠️</span><div><strong>Belum bisa dicek</strong><p>${esc(r.warn)}</p></div></div>`:"";
  const res=ck?`<div class="fb ${r.result.score>=.7?"ok":"no"}" role="status"><span class="em">${r.result.score>=.7?"✅":"❌"}</span><div class="stack" style="gap:6px"><strong>${r.result.score>=.7?"Benar":"Kurang tepat"} · skor ${Math.round(r.result.score*100)}</strong><p>${esc(t.feedback)}</p>${r.result.extra?`<p style="color:var(--yellow);font-weight:700">${esc(r.result.extra)}</p>`:""}</div></div>`:"";
  const l=lv(r.lv);
  return `<section class="card stack" style="gap:18px"><span class="eyebrow">Misi ${r.i+1}/${l.tasks.length}${t.critical?' · <span style="color:var(--red)">SYARAT KRITIS</span>':""}</span>
   <p class="prompt">${esc(t.prompt)}</p>${body}${fb}${res}
   <div class="row">${ck?`<button class="btn pink" data-act="next">${r.i===l.tasks.length-1?"Lihat hasil take":"Lanjut →"}</button>`:`<button class="btn" data-act="check">Cek jawaban</button>`}</div></section>`;
}
function grade(t,ts){
  if(t.type==="choice"){if(!ts.pick)return{need:"Pilih salah satu jawaban dulu."};return{score:ts.pick===t.correct?1:0}}
  if(t.type==="order"){const n=t.items.length,c=ts.order.filter((id,i)=>t.items[i].id===id).length;return{score:c/n}}
  if(t.type==="sort"){if(Object.keys(ts.map).length<t.items.length)return{need:"Masih ada item yang belum diberi kategori."};return{score:t.items.filter(([id,,c])=>ts.map[id]===c).length/t.items.length}}
  if(t.type==="match"){if(t.pairs.some((p,i)=>!ts.map[i]))return{need:"Lengkapi semua pasangan dulu."};const used=Object.values(ts.map);if(new Set(used).size!==used.length)return{need:"Satu jawaban hanya boleh dipakai sekali. Ada pilihan yang dobel."};return{score:t.pairs.filter(([a,b],i)=>ts.map[i]===b).length/t.pairs.length}}
  if(t.type==="budget"){const tot=ts.sel.reduce((a,id)=>a+t.items.find(x=>x[0]===id)[2],0);if(!ts.sel.length)return{need:"Pilih minimal satu pos anggaran."};
    if(tot>t.budget){beep("no");return{need:"Ditolak: total "+rp(tot)+" melebihi dana "+rp(t.budget)+" (defisit "+rp(tot-t.budget)+"). Kurangi pilihanmu."}}
    const ess=t.items.filter(x=>x[3]);const got=ess.filter(x=>ts.sel.includes(x[0])).length;const sc=got/ess.length;
    return{score:sc,extra:sc<1?"Ada pos esensial yang belum dianggarkan: "+ess.filter(x=>!ts.sel.includes(x[0])).map(x=>x[1]).join(", ")+".":""}}
  if(t.type==="checklist"){if(!ts.sel.length)return{need:"Centang tindakan K3 yang sudah kamu pastikan."};return{score:t.items.filter(([id,,g])=>ts.sel.includes(id)===g).length/t.items.length}}
  if(t.type==="permit"){if(Object.keys(ts.map).length<t.locs.length)return{need:"Tentukan tindakan untuk semua lokasi."};const c=t.locs.filter(l=>ts.map[l]==="req").length;return{score:c/t.locs.length,extra:c<t.locs.length?"Lokasi tanpa izin akan membuat audit Ready to Shoot ditolak.":""}}
}
function levelDone(l){
  const r=UI.run,f=r.final,ok=f.mastery>=70;const nx=LEVELS[LEVELS.indexOf(l)+1];
  return `<section class="card ${ok?"c-mint":""} stack" style="gap:20px;text-align:center;align-items:center">
   <span class="stamp" style="color:${ok?"var(--mint)":"var(--red)"}">${ok?"TAKE OK!":"RETAKE"}</span>
   <div class="row" style="justify-content:center;gap:28px"><div><div class="eyebrow">Mastery</div><div style="font:900 2.6rem/1 var(--f-display)">${f.mastery}%</div></div>
   <div><div class="eyebrow">XP baru</div><div style="font:900 2.6rem/1 var(--f-display);color:var(--yellow)">+${f.gain}</div></div>
   <div><div class="eyebrow">XP level</div><div style="font:900 2.6rem/1 var(--f-display)">${L(l.id).xp}/${l.xp}</div></div></div>
   ${f.capped?`<div class="fb no" style="text-align:left"><span class="em">⛔</span><div><strong>Syarat kritis gagal</strong><p>Jawaban soal kritis salah, jadi mastery dibatasi maksimal 60. Ulangi level ini.</p></div></div>`:""}
   ${f.gain===0&&r.prevBest>0?`<p class="muted">XP tidak bertambah karena skor ini tidak melebihi skor terbaikmu (${r.prevBest}%).</p>`:""}
   <p class="muted">${ok?(nx?`Level <b style="color:var(--text)">${nx.title}</b> terbuka!`:"Semua level tuntas. Lanjut setujui Production Book dan ikuti audit."):"Butuh mastery ≥ 70 untuk membuka level berikutnya."}</p>
   <div class="row" style="justify-content:center">${ok&&nx?`<button class="btn pink" data-act="start" data-id="${nx.id}">Level berikutnya →</button>`:""}
    <button class="btn cyan" data-act="go" data-to="book">📒 Cek Production Book</button><button class="btn ghost" data-act="start" data-id="${l.id}">⟲ Retake</button><button class="btn ghost" data-act="go" data-to="map">Peta misi</button></div></section>`;
}
function finishLevel(){
  const r=UI.run,l=lv(r.lv);
  let m=Math.round(r.scores.reduce((a,b)=>a+b,0)/r.scores.length*100);
  let capped=false;l.tasks.forEach((t,i)=>{if(t.critical&&r.scores[i]<1){m=Math.min(m,60);capped=true}});
  const prev=L(l.id);r.prevBest=prev.best||0;
  const best=Math.max(prev.best||0,m);const newXp=Math.max(prev.xp||0,Math.min(l.xp,Math.round(l.xp*best/100)));
  const gain=newXp-(prev.xp||0);
  S.levels[l.id]={best,xp:newXp,done:true,attempts:(prev.attempts||0)+1,lastMastery:m,lastPlayed:new Date().toISOString()};
  writeOutputs(l.id,r.answers);
  save();r.final={mastery:m,gain,capped};r.done=true;
  if(gain>0)toast("+"+gain+" XP");
  if(m>=70){beep("win");confetti()}else beep("no");
}
function writeOutputs(id,A){
  const set=(k,data)=>{S.book[k]={status:"needs_revision",data,note:S.book[k].note||""}};
  if(id==="L01"){const t=lv("L01").tasks;
    set("script_analysis",{judul:STORY.title,genre:STORY.genre,durasi:STORY.duration+" menit",tema:A.tema,konflik:A.konflik,logline:STORY.logline,tokoh:STORY.characters.map((c,i)=>({tokoh:c.name,peran:c.role,karakter_menurut_pemain:(A.tokoh||{})[c.name]||"-"}))});
    set("scene_list",{urutan_pemain:(A.scenes||[]).map((sid,i)=>{const s=STORY.scenes.find(x=>x.id===sid);return{no:i+1,scene:sid,heading:s.heading,ringkasan:s.summary,sesuai:sid===STORY.scenes[i].id?"✓":"✗"}})})}
  if(id==="L02"){set("breakdown_sheet",{scene:STORY.scenes.map(s=>({scene:s.id,lokasi:STORY.locations[s.location],pemeran:s.cast.join(", "),properti:s.props.join(", "),alat:"kamera, tripod, mikrofon"})),klasifikasi_S02:A.s02,klasifikasi_S06:A.s06})}
  if(id==="L03"){const crew=lv("L03").tasks[0].pairs;
    set("crew_list",{divisi:crew.map(([task],i)=>({tugas:task,divisi_pilihan:(A.crew||{})[task]||"-"}))});
    set("cast_list",{pemeran:STORY.characters.map(c=>({tokoh:c.name,deskripsi:c.desc,pemeran:c.id==="raka"?(A.casting||"-"):"Diisi setelah audisi"}))});
    set("location_list",{lokasi:Object.entries(STORY.locations).map(([k,n])=>({id:k,lokasi:n,scene:STORY.scenes.filter(s=>s.location===k).map(s=>s.id).join(", "),izin:(A.permits||{})[k]==="req"?"Disetujui":"Belum diajukan"}))})}
  if(id==="L04"){const t=lv("L04").tasks[0];const sel=A.budget||[];const items=t.items.filter(x=>sel.includes(x[0]));const total=items.reduce((a,x)=>a+x[2],0);
    set("budget_sheet",{dana_awal:CONFIG.initial_budget_idr,pos:items.map(x=>({pos:x[1],biaya:rp(x[2])})),total,sisa:CONFIG.initial_budget_idr-total,status:total<=CONFIG.initial_budget_idr?"Tidak defisit":"DEFISIT"});
    const eq=lv("L04").tasks[2].items;const em=A.equip||{};
    set("equipment_list",{sumber_kamera:A.camera||"-",alat:eq.filter(x=>em[x[0]]==="alat").map(x=>({alat:x[1],benar:x[2]==="alat"?"✓":"✗"}))});
    set("property_list",{properti:eq.filter(x=>em[x[0]]==="properti").map(x=>({properti:x[1],benar:x[2]==="properti"?"✓":"✗",muncul_di:STORY.scenes.filter(s=>s.props.some(p=>x[1].toLowerCase().startsWith(p))).map(s=>s.id).join(", ")||"-"}))})}
  if(id==="L05"){const sbt=lv("L05").tasks[1];
    set("storyboard",{scene:"S02",panel:(A.storyboard||[]).map((pid,i)=>{const p=sbt.items.find(x=>x.id===pid);return{panel:i+1,shot:p.code,deskripsi:p.label}})});
    set("shot_list",{shot:[{scene:"S02",ukuran:"WS",angle:"Eye level",keterangan:"Establishing lab"},{scene:"S02",ukuran:"CU",angle:"Eye level",keterangan:A.shot||"-"},{scene:"S03",ukuran:"LS",angle:"Eye level",keterangan:"Establishing koridor"},{scene:"S03",ukuran:"OTS",angle:"Eye level",keterangan:"Dialog Raka–Nisa bergantian"},{scene:"S03",ukuran:"ECU",angle:"High angle",keterangan:"Insert flashdisk"}],fungsi_shot_pemain:A.shots});
    set("floor_plan",{blocking_S03:A.blocking||"-",tata_suara:A.audio||"-",catatan:"Kamera di satu sisi garis aksi; mic diarahkan ke pemeran, menjauhi AC."})}
  if(id==="L06"){const k=lv("L06").tasks[3].items;const sel=A.k3||[];const conf=k.every(([id,,g])=>sel.includes(id)===g);
    set("shooting_schedule",{rencana:A.schedule||"-",hari:[{hari:"Hari 1",lokasi:"Lab komputer",scene:"S01, S02, S04, S05",waktu:"Siang–sore"},{hari:"Hari 2",lokasi:"Ruang kelas → Koridor",scene:"S06, S03",waktu:"Pagi → siang"}]});
    set("call_sheet",{isi_wajib:A.callsheet||"-",keputusan_izin:A.critical||"-"});
    set("k3_checklist",{item:k.map(([id,lb,g])=>({tindakan:lb,dicentang:sel.includes(id)?"Ya":"Tidak",aman:g?"Wajib":"Berisiko"})),terkonfirmasi:conf});
    set("readiness_report",{catatan:"Dihitung otomatis dari audit Ready to Shoot saat dokumen dibuka."})}
}
function recordAnswer(t,ts){
  const A=UI.run.answers;if(!t.key)return;
  if(t.type==="choice")A[t.key]=t.options.find(o=>o[0]===ts.pick)[1];
  if(t.type==="order")A[t.key]=ts.order.slice();
  if(t.type==="sort"){if(t.key==="equip")A.equip=Object.assign({},ts.map);else{const o={};t.cats.forEach(c=>o[CATS[c].label]=t.items.filter(([id])=>ts.map[id]===c).map(x=>x[1]).join(", ")||"-");A[t.key]=o}}
  if(t.type==="match"){const o={};t.pairs.forEach(([a],i)=>o[a]=ts.map[i]);A[t.key]=o}
  if(t.type==="budget")A.budget=ts.sel.slice();
  if(t.type==="checklist")A.k3=ts.sel.slice();
  if(t.type==="permit")A.permits=Object.assign({},ts.map);
}

/* ---- production book ---- */
const STAT={not_started:["Belum mulai","dim"],needs_revision:["Perlu ditinjau","warn"],approved:["Disetujui","ok"]};
function book(){
  const sel=UI.sel,sec=SECTIONS.find(s=>s[0]===sel),b=S.book[sel],lvl=L(sec[2]);
  const canApprove=b.status!=="not_started"&&lvl.done&&lvl.best>=70;
  const inFrame=isFramed;
  return `<section class="stack" style="gap:22px">
   <div class="row" style="justify-content:space-between;align-items:flex-end"><div class="stack" style="gap:8px"><span class="eyebrow">Production Book · ${STORY.title}</span><h2>${approvedCount()}/${SECTIONS.length} dokumen disetujui</h2></div>
   <div class="row"><button class="btn cyan sm" data-act="exportjson">⬇ Ekspor JSON</button><button class="btn ghost sm" data-act="copyjson">⧉ Salin JSON</button>${inFrame()?"":`<button class="btn ghost sm" data-act="print">🖨 Cetak / PDF</button>`}</div></div>
   ${inFrame()?`<p class="muted" style="font-size:.85rem">Cetak PDF tersedia saat file game dibuka langsung di browser (file index.html).</p>`:""}
   <div class="book"><nav class="card c-violet seclist" aria-label="Daftar bagian">${LEVELS.map(l=>`<span class="grp">${l.id} · ${l.title}</span>`+SECTIONS.filter(s=>s[2]===l.id).map(([id,t])=>`<button class="secb" data-act="sec" data-id="${id}" aria-current="${id===sel}"><span>${t}</span><span class="chip ${STAT[S.book[id].status][1]}">${S.book[id].status==="approved"?"✓":S.book[id].status==="needs_revision"?"!":"–"}</span></button>`).join("")).join("")}</nav>
   <article class="card stack" style="gap:16px"><div class="row" style="justify-content:space-between"><h3 style="font-size:1.4rem">${sec[1]}</h3><span class="chip ${STAT[b.status][1]}">${STAT[b.status][0]}</span></div>
    <p class="muted" style="font-size:.88rem">Sumber: ${sec[2]} · ${lv(sec[2]).title}</p>
    <div class="stack" style="gap:12px">${b.status==="not_started"?`<p class="muted">Belum ada data. Selesaikan level ${lv(sec[2]).title} untuk mengisi bagian ini.</p>`:sel==="readiness_report"?renderGates():sel==="storyboard"?renderSB(b.data):renderData(b.data)}</div>
    <label class="f" for="note-${sel}">Catatan / revisi kamu<textarea class="inp" id="note-${sel}" data-note="${sel}" placeholder="Tambahkan catatan, misalnya kontak pengelola lokasi atau detail properti." ${b.status==="not_started"?"disabled":""}>${esc(b.note)}</textarea></label>
    <div class="row">${b.status==="approved"?`<button class="btn ghost" data-act="unapprove" data-id="${sel}">Tandai perlu revisi</button>`:`<button class="btn mint" data-act="approve" data-id="${sel}" ${canApprove?"":"disabled"}>✓ Setujui dokumen</button>`}
     ${!canApprove&&b.status!=="approved"&&b.status!=="not_started"?`<span class="muted" style="font-size:.85rem">Butuh mastery ≥ 70 di ${lv(sec[2]).title}.</span>`:""}</div>
   </article></div></section>`;
}
function renderData(d){
  const val=v=>{if(Array.isArray(v)){if(v.length&&typeof v[0]==="object")return table(v);return esc(v.join(", "))}if(v&&typeof v==="object")return `<dl class="kv">${Object.entries(v).map(([k,x])=>`<dt>${esc(k.replace(/_/g," "))}</dt><dd>${val(x)}</dd>`).join("")}</dl>`;if(typeof v==="boolean")return v?"Ya":"Tidak";if(typeof v==="number")return rp(v);return esc(v)};
  return val(d);
}
function table(rows){const ks=Object.keys(rows[0]);return `<div class="tbl-wrap"><table><thead><tr>${ks.map(k=>`<th scope="col">${esc(k.replace(/_/g," "))}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${ks.map(k=>`<td>${esc(r[k])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`}
function renderSB(d){return `<p><b>Scene ${esc(d.scene)}</b></p><div class="sb">${(d.panel||[]).map(p=>`<div class="fr"><div class="img">${esc(p.shot)}</div><p><b>Panel ${p.panel}.</b> ${esc(p.deskripsi)}</p></div>`).join("")}</div>`}
function renderGates(){return `<ul class="gates">${gates().map(g=>`<li class="${g.ok?"y":"n"}"><span class="ic" aria-hidden="true">${g.ok?"✓":"✗"}</span><div><b>${g.t}</b><small>${esc(g.d)}</small></div><span class="sr">${g.ok?"terpenuhi":"belum terpenuhi"}</span></li>`).join("")}</ul>`}

/* ---- result ---- */
const BADGES=[["🕵️","Script Detective",()=>L("L01").best>=70],["🧩","Breakdown Master",()=>L("L02").best>=70],["🧢","Crew Commander",()=>L("L03").best>=70],["💸","Budget Survivor",()=>L("L04").best>=70&&budgetOK()],["🎥","Visual Director",()=>L("L05").best>=70],["🦺","Safety First",()=>k3OK()],["📒","Book Complete",()=>approvedCount()===SECTIONS.length],["🤝","Honest Crew",()=>L("L06").best>=70],["💯","Perfect Take",()=>LEVELS.some(l=>L(l.id).best===100)]];
function result(){
  return `<section class="stack" style="gap:24px"><div class="stack" style="gap:8px"><span class="eyebrow">Final Result · Audit Ready to Shoot</span><h2>Apakah produksimu siap shooting?</h2></div>
   <div id="verdict">${verdictHTML()}</div>
   <div class="res"><div class="card c-yellow stack" id="scorebox">${scoreHTML()}</div>
    <div class="card c-cyan stack"><h3>Checklist audit</h3><div id="gatebox">${renderGates()}</div></div></div>
   <div class="card c-violet stack"><h3>Refleksi (10% nilai)</h3><p class="muted" style="font-size:.88rem">Tulis minimal 30 karakter per jawaban agar dihitung.</p>
    ${[["r1","Keputusan pra-produksi apa yang paling sulit, dan kenapa?"],["r2","Apa hubungan tema kejujuran di film ini dengan caramu mengerjakan tugas?"],["r3","Satu hal yang akan kamu perbaiki sebelum shooting sungguhan?"]].map(([k,q])=>`<label class="f" for="ref-${k}">${q}<textarea class="inp" id="ref-${k}" data-ref="${k}">${esc(S.reflection[k])}</textarea></label>`).join("")}</div>
   <div class="card stack"><h3>Badge</h3><div class="badges">${BADGES.map(([e,n,f])=>`<div class="badge ${f()?"":"off"}"><span class="em" aria-hidden="true">${e}</span><b>${n}</b><span class="sr">${f()?"didapat":"belum didapat"}</span></div>`).join("")}</div></div>
   <p class="muted" style="font-size:.85rem">${CONFIG.disclaimer}</p></section>`;
}
function scoreHTML(){const s=score();const c=s.total>=75?"var(--mint)":s.total>=60?"var(--yellow)":"var(--red)";
  const r=(n,v,m)=>`<div class="r"><span>${n}</span><div class="mini"><i style="width:${v/m*100}%"></i></div><span>${v.toFixed(1)}/${m}</span></div>`;
  return `<div class="row" style="gap:24px"><div class="ring" style="--v:${s.total};--rc:${c}" role="img" aria-label="Nilai ${s.total} dari 100"><div><span><b>${s.total}</b><br><small class="muted">/100</small></span></div></div>
   <div class="stack" style="gap:6px;min-width:0;flex:1"><h3>Nilai kompetensi</h3><p class="muted" style="font-size:.88rem">Lulus jika ≥ ${CONFIG.passing_score}. XP (${totalXP()}/1000) terpisah dari nilai.</p><span class="chip ${s.total>=75?"ok":"bad"}">${s.total>=75?"Lulus nilai":"Belum lulus nilai"}</span></div></div>
   <div class="brk">${r("Kualitas dokumen",s.docs,40)}${r("Keputusan",s.dec,30)}${r("Konsep",s.con,20)}${r("Refleksi",s.ref,10)}</div>`}
function verdictHTML(){const y=ready();return `<div class="verdict ${y?"y":"n"}" role="status"><span class="eyebrow" style="color:inherit">${y?"Status audit":"Status audit"}</span><h2>${y?"READY TO SHOOT 🎬":"BELUM SIAP SHOOTING"}</h2><p style="margin-top:8px">${y?"Semua syarat terpenuhi. Kru, gaskeun ke hari shooting!":"Masih ada syarat yang belum terpenuhi. Cek checklist audit di bawah."}</p></div>`}
function refreshResult(){const v=$("#verdict"),s=$("#scorebox"),g=$("#gatebox");if(v)v.innerHTML=verdictHTML();if(s)s.innerHTML=scoreHTML();if(g)g.innerHTML=renderGates()}

/* ---- export ---- */
function exportObj(){const s=score();return{metadata:{game_id:CONFIG.game_id,title:CONFIG.title,version:CONFIG.version,state_version:VER,story_id:STORY.id,exported_at:new Date().toISOString(),disclaimer:CONFIG.disclaimer},
  student:{name:S.profile?.name||"",class:S.profile?.kelas||"",number:S.profile?.absen||"",demo:!!S.profile?.demo},film_title:STORY.title,
  progress:{total_xp:totalXP(),levels:LEVELS.map(l=>({id:l.id,title:l.title,mastery:L(l.id).best,xp:L(l.id).xp||0,max_xp:l.xp,attempts:L(l.id).attempts||0}))},
  score:{total:s.total,quality_of_documents:+s.docs.toFixed(1),decisions:+s.dec.toFixed(1),concepts:+s.con.toFixed(1),reflection:+s.ref.toFixed(1),passing_score:CONFIG.passing_score},
  readiness:{ready_to_shoot:ready(),gates:gates().map(g=>({gate:g.t,ok:g.ok,detail:g.d}))},
  sections:SECTIONS.map(([id,t,src])=>({id,title:t,source_level:src,status:S.book[id].status,data:S.book[id].data,note:S.book[id].note})),reflection:S.reflection}}
function printBook(){const o=exportObj();
  const sec=o.sections.map(s=>`<section><h2>${esc(s.title)} <small>(${STAT[s.status][0]})</small></h2>${s.status==="not_started"?"<p>Belum diisi.</p>":s.id==="readiness_report"?`<ul>${o.readiness.gates.map(g=>`<li>${g.ok?"✔":"✘"} ${esc(g.gate)} — ${esc(g.detail)}</li>`).join("")}</ul>`:renderData(s.data)}${s.note?`<p><b>Catatan:</b> ${esc(s.note)}</p>`:""}</section>`).join("");
  $("#print").innerHTML=`<h1>Production Book — ${STORY.title}</h1><p>${esc(o.student.name)} · ${esc(o.student.class)} · Absen ${esc(o.student.number)} · Nilai ${o.score.total} · ${o.readiness.ready_to_shoot?"READY TO SHOOT":"Belum siap"} · ${new Date().toLocaleDateString("id-ID")}</p>${sec}<p><i>${CONFIG.disclaimer}</i></p>`;
  window.print()}

/* ---- modal ---- */
function modal(){const m=UI.modal;return `<div class="modal-bg" role="dialog" aria-modal="true" aria-labelledby="mt"><div class="card c-yellow modal stack"><h3 id="mt" style="font-size:1.3rem">${m.title}</h3><div class="stack" style="gap:10px">${m.body}</div>
  <div class="row">${m.ok?`<button class="btn ${m.danger?"danger":"pink"}" data-act="${m.ok}">${m.okLabel}</button>`:""}<button class="btn ghost" data-act="close">${m.ok?"Batal":"Tutup"}</button></div></div></div>`}
const HELP=`<p>1. Isi profil (atau pilih mode demo).<br>2. Baca Story Briefing film <b>SATU FILE TERAKHIR</b>.<br>3. Mainkan 6 level berurutan. Mastery ≥ 70 membuka level berikutnya.<br>4. Setiap level mengisi Production Book. Tinjau lalu setujui tiap dokumen.<br>5. Isi refleksi dan ikuti audit Ready to Shoot.</p>
<p><b>Syarat Ready to Shoot:</b> 6 level tuntas, nilai ≥ 75, semua dokumen disetujui, izin lokasi, anggaran tidak defisit, dan K3 terkonfirmasi.</p>
<p class="muted">XP maksimal 1000. Retake menyimpan skor terbaik tanpa menggandakan XP. Semua tombol bisa dipakai dengan keyboard (Tab, Enter, Spasi).</p>`;

/* ============ ACTIONS ============ */
const ACT={
  go:d=>{if(d.to==="profile")UI.profileDraft=null;UI.screen=d.to;render();window.scrollTo(0,0)},
  sound:()=>{S.sound=!S.sound;save();render()},
  help:()=>{UI.modal={title:"Petunjuk bermain",body:HELP};render()},
  close:()=>{UI.modal=null;render()},
  newgame:()=>{if(S.profile){UI.modal={title:"Mulai game baru?",body:"<p>Progres, XP, dan Production Book sebelumnya akan dihapus dari perangkat ini.</p>",ok:"doNew",okLabel:"Ya, mulai baru",danger:true};render()}else ACT.doNew()},
  doNew:()=>{const snd=S.sound;S=fresh();S.sound=snd;try{localStorage.removeItem(KEY)}catch(e){}UI.modal=null;UI.profileDraft=null;UI.screen="profile";render()},
  reset:()=>{UI.modal={title:"Reset semua progres?",body:"<p>Tindakan ini menghapus profil, XP, nilai, dan Production Book di perangkat ini. Tidak bisa dibatalkan.</p>",ok:"doReset",okLabel:"Hapus progres",danger:true};render()},
  doReset:()=>{S=fresh();try{localStorage.removeItem(KEY)}catch(e){}UI.modal=null;UI.run=null;UI.screen="menu";render();toast("Progres dihapus")},
  avatar:(d)=>{UI.profileDraft.avatar=d.v;document.querySelectorAll(".avatars button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.v===d.v))},
  demo:()=>{const id=Math.random().toString(36).slice(2,6).toUpperCase();S.profile={name:"Demo-"+id,kelas:"Demo",absen:"-",avatar:UI.profileDraft?.avatar||"🎬",demo:true};save();UI.screen="briefing";render();toast("Mode demo aktif")},
  start:d=>startLevel(d.id),
  locked:()=>{toast("🔒 Selesaikan level sebelumnya dengan mastery ≥ 70");beep("no")},
  begin:()=>{const r=UI.run;r.i=0;r.ts=initTask(lv(r.lv).tasks[0]);r.checked=false;r.warn=null;render()},
  pick:d=>{UI.run.ts.pick=d.v;UI.run.warn=null;render()},
  mv:d=>{const o=UI.run.ts.order,i=+d.i,j=i+ +d.d;[o[i],o[j]]=[o[j],o[i]];render();const b=document.querySelectorAll(".oitem")[j]?.querySelector(`[data-d="${d.d}"]`);(b&&!b.disabled?b:document.querySelectorAll(".oitem")[j]?.querySelector("button:not(:disabled)"))?.focus()},
  sort:d=>{UI.run.ts.map[d.id]=d.v;UI.run.warn=null;rerenderKeep()},
  permit:d=>{UI.run.ts.map[d.id]=d.v;UI.run.warn=null;rerenderKeep()},
  budget:d=>{const s=UI.run.ts.sel,i=s.indexOf(d.id);i>=0?s.splice(i,1):s.push(d.id);UI.run.warn=null;const t=lv(UI.run.lv).tasks[UI.run.i];const tot=s.reduce((a,id)=>a+t.items.find(x=>x[0]===id)[2],0);if(tot>t.budget)beep("no");rerenderKeep()},
  chk:d=>{const s=UI.run.ts.sel,i=s.indexOf(d.id);i>=0?s.splice(i,1):s.push(d.id);rerenderKeep()},
  check:()=>{const r=UI.run,t=lv(r.lv).tasks[r.i];const g=grade(t,r.ts);if(g.need){r.warn=g.need;render();return}
    r.warn=null;r.checked=true;r.result=g;r.scores[r.i]=g.score;recordAnswer(t,r.ts);
    if(g.score>=.7){r.streak++;beep("ok")}else{r.streak=0;beep("no")}render()},
  next:()=>{const r=UI.run,l=lv(r.lv);if(r.i>=l.tasks.length-1){finishLevel();render();window.scrollTo(0,0);return}r.i++;r.ts=initTask(l.tasks[r.i]);r.checked=false;r.result=null;render();window.scrollTo(0,0)},
  sec:d=>{UI.sel=d.id;render()},
  approve:d=>{S.book[d.id].status="approved";save();beep("ok");toast("Dokumen disetujui ✓");if(approvedCount()===SECTIONS.length)confetti();render()},
  unapprove:d=>{S.book[d.id].status="needs_revision";save();render()},
  exportjson:()=>{const txt=JSON.stringify(exportObj(),null,2);if(isFramed()){showJson(txt,"Salin JSON di bawah lalu simpan sebagai file .json. Unduhan langsung tersedia saat file index.html dibuka di browser.");return}try{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([txt],{type:"application/json"}));a.download="production-book-"+(S.profile?.name||"pemain").replace(/[^\w-]+/g,"_")+".json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);toast("File JSON dibuat")}catch(e){}
    showJson(txt,"Jika unduhan tidak muncul, salin JSON di bawah lalu simpan sebagai file .json.")},
  copyjson:()=>{const txt=JSON.stringify(exportObj(),null,2);const done=()=>toast("JSON tersalin ✓");try{navigator.clipboard.writeText(txt).then(done,()=>showJson(txt,"Salin manual teks di bawah ini."))}catch(e){showJson(txt,"Salin manual teks di bawah ini.")}},
  print:()=>printBook()
};
function showJson(txt,msg){UI.modal={title:"Ekspor Production Book",body:`<p class="muted">${msg}</p><textarea class="inp" id="jsonout" readonly style="min-height:260px;font-family:var(--f-script);font-size:.8rem">${esc(txt)}</textarea>`};render();const ta=$("#jsonout");ta&&ta.select()}
function rerenderKeep(){const a=document.activeElement;const key=a&&a.dataset?[a.dataset.act,a.dataset.id,a.dataset.v].join("|"):null;const y=window.scrollY;render();window.scrollTo(0,y);if(key){const el=[...document.querySelectorAll("[data-act]")].find(e=>[e.dataset.act,e.dataset.id,e.dataset.v].join("|")===key);el&&el.focus({preventScroll:true})}}

document.addEventListener("click",e=>{const b=e.target.closest("[data-act]");if(!b||b.disabled)return;if(b.tagName==="SELECT")return;e.preventDefault();const f=ACT[b.dataset.act];f&&f(b.dataset,b)});
document.addEventListener("change",e=>{const el=e.target;if(el.dataset.actChange==="match"){UI.run.ts.map[el.dataset.i]=el.value;UI.run.warn=null}});
document.addEventListener("input",e=>{const el=e.target;
  if(el.dataset.bind&&UI.profileDraft){UI.profileDraft[el.dataset.bind]=el.value}
  if(el.dataset.note){const b=S.book[el.dataset.note];b.note=el.value;if(b.status==="approved"){b.status="needs_revision";render();const t=document.getElementById(el.id);t&&(t.focus(),t.setSelectionRange(t.value.length,t.value.length))}save()}
  if(el.dataset.ref){S.reflection[el.dataset.ref]=el.value;save();refreshResult()}});
document.addEventListener("submit",e=>{if(e.target.id!=="pform")return;e.preventDefault();const d=UI.profileDraft;
  if(!d.name.trim()){$("#perr").textContent="Nama atau alias wajib diisi, atau pilih mode demo anonim.";$("#p-name").focus();return}
  S.profile={name:d.name.trim().slice(0,40),kelas:d.kelas.trim().slice(0,20),absen:d.absen.trim().slice(0,5),avatar:d.avatar,demo:false};save();UI.screen="briefing";render();window.scrollTo(0,0);toast("Profil tersimpan ✓")});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&UI.modal){UI.modal=null;render()}});

/* ============ BOOT ============ */
render();
