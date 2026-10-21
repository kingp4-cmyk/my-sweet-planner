/* My Sweet Ajanda v48 — v44 break companion preserved; soft fairy-dust string keystrokes.
   No Firebase, Supabase, account, journal records or competition data are changed. */
(() => {
  'use strict';
  if (window.__mspCozyV48) return;
  window.__mspCozyV48 = true;

  const $ = id => document.getElementById(id);
  const STATE_KEY = 'msp-mini-break-state-v44';
  const MINUTES_KEY = 'msp-race-mini-break-minutes-v1';
  const SOUND_KEY = 'msp-race-mini-break-sound-v1';
  const TYPE_KEY = 'msp-journal-typewriter-sound-v1';
  const LEASE_KEY = 'msp-mini-break-audio-owner-v44';
  const tabId = (crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`);
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const save = (key, val) => { try { localStorage.setItem(key, String(val)); } catch {} };
  const clamp = n => Math.min(240, Math.max(1, Math.round(Number(n) || 5)));
  const nowMs = () => Date.now();
  const readMinutes = () => clamp(read(MINUTES_KEY) || 5);

  let fallbackState = null;
  function makeIdle(minutes = readMinutes()) {
    return {version:44, status:'idle', minutes, remainingMs:minutes * 60000,
      deadline:0, alarmUntil:0, finishedAt:0, notificationSent:false};
  }
  function load() {
    try {
      const v = JSON.parse(read(STATE_KEY));
      if (v?.version === 44 && ['idle','running','paused','alarming','done'].includes(v.status) &&
          Number.isFinite(v.minutes) && v.minutes>=1 && v.minutes<=240 &&
          Number.isFinite(v.remainingMs) && Number.isFinite(v.deadline) &&
          Number.isFinite(v.alarmUntil)) return v;
    } catch {}
    return fallbackState || makeIdle();
  }
  function store(v) { fallbackState = v; save(STATE_KEY, JSON.stringify(v)); }
  function remaining(v, now=nowMs()) {
    return v.status === 'running' ? Math.max(0, v.deadline-now) :
      Math.max(0, Number(v.remainingMs)||0);
  }
  function current() {
    const v = load(), t = nowMs();
    if (v.status==='running' && t>=v.deadline) {
      v.remainingMs=0;
      v.finishedAt=v.deadline;
      v.deadline=0;
      // If the user returns much later, don't sound an unexpected old alarm.
      if (t-v.finishedAt <= 5*60000) {
        v.status='alarming';
        v.alarmUntil=t+60000; // one full minute from detection, even after a short tab suspension
        v.notificationSent=false;
      } else { v.status='done'; v.alarmUntil=0; }
      store(v);
    } else if (v.status==='alarming' && t>=v.alarmUntil) {
      v.status='done'; v.alarmUntil=0; store(v);
    }
    return v;
  }
  function modify(fn) { const v=current(); fn(v); store(v); refresh(); }
  function fmt(ms) {
    const secs=Math.max(0, Math.ceil(ms/1000));
    const m=Math.floor(secs/60), s=secs%60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  let ctx=null, lastChime=0, lastTyped=0, lastPhysicalKey=0, fairySamples=null, fairyCount=0;
  function audio() {
    const Ctor=window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try { if(!ctx) ctx=new Ctor(); return ctx; } catch { return null; }
  }
  function unlock() {
    const a=audio();
    if(a?.state==='suspended') void a.resume().catch(()=>{});
  }
  // Browser audio usually needs a click/keystroke on EACH new page after navigation.
  document.addEventListener('pointerdown', unlock, {passive:true});
  document.addEventListener('keydown', unlock, {passive:true});

  function melody() {
    if(read(SOUND_KEY)==='off') return;
    const a=audio();
    if(!a) return;
    if(a.state==='suspended') { void a.resume().catch(()=>{}); return; }
    if(a.state!=='running') return;
    const base=a.currentTime+.02;
    // A mellow music-box phrase, repeated about every 3.5 seconds for 60 seconds.
    [659.25,783.99,880,1046.5,783.99].forEach((freq,i)=>{
      const t=base+i*.35;
      [[1,.08],[2,.014]].forEach(([oct,volume])=>{
        const o=a.createOscillator(), g=a.createGain();
        o.type='sine'; o.frequency.setValueAtTime(freq*oct,t);
        g.gain.setValueAtTime(.0001,t);
        g.gain.exponentialRampToValueAtTime(volume,t+.02);
        g.gain.exponentialRampToValueAtTime(.0001,t+.7);
        o.connect(g).connect(a.destination); o.start(t); o.stop(t+.72);
      });
    });
  }
  function ownChime(t) {
    try {
      const prior=JSON.parse(read(LEASE_KEY)||'null');
      if(prior && prior.id!==tabId && prior.until>t &&
         (document.hidden || !prior.hidden)) return false;
      save(LEASE_KEY, JSON.stringify({id:tabId,until:t+4500,hidden:document.hidden}));
      return true;
    } catch { return true; }
  }
  function releaseChime() {
    try {
      const lease=JSON.parse(read(LEASE_KEY)||'null');
      if(lease?.id===tabId) localStorage.removeItem(LEASE_KEY);
    } catch {}
  }
  window.addEventListener('pagehide', releaseChime);
  function notifyOnce(v) {
    if(v.notificationSent || !('Notification' in window) || Notification.permission!=='granted') return;
    try {
      new Notification('🌷 My Sweet Ajanda — Mola bitti!', {
        body:'Tatlı molan sona erdi. Yeniden parlamaya hazır mısın? ♡',
        tag:'msp-mini-break', silent:true
      });
      v.notificationSent=true; store(v);
    } catch {}
  }

  const style=document.createElement('style');
  style.id='msp-cozy-features-v44';
  style.textContent=`
    #msp-break-companion[hidden]{display:none!important}
    #msp-break-companion{position:fixed;right:16px;bottom:16px;z-index:2147480000;max-width:min(360px,calc(100vw - 24px));display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 12px;background:#fff6fcf7;color:#963b72;border:2px solid #edacd0;border-radius:17px;box-shadow:0 8px 29px #9e477052;font:700 12px/1.4 system-ui,sans-serif}
    #msp-break-companion b{font-size:15px;white-space:nowrap}
    #msp-break-companion button{border-radius:11px;border:1px solid #e7a8c9;background:#ffe1f0;color:#982b72;min-height:33px;padding:6px 9px;font:800 12px system-ui;cursor:pointer}
    #msp-break-companion button:focus-visible{outline:3px solid #a970c3;outline-offset:2px}
    .glam-race #raceV44Silence{background:#fff0fb;color:#a12c71;border:1px solid #df8ab9;border-radius:11px;padding:8px 12px;font-weight:800;cursor:pointer}
    #raceV44Silence[hidden]{display:none!important}
    .journal-format-toolbar #journalTypewriterToggle{display:inline-flex;align-items:center;gap:6px;max-width:100%;white-space:normal;min-height:37px;padding:6px 11px;border:2px solid #e5a5cd;border-radius:12px;background:#fff8fc;color:#974475;font:800 12px system-ui;cursor:pointer}
    .journal-format-toolbar #journalTypewriterToggle[aria-pressed="true"]{background:#e8c8f6;border-color:#c47bd8;color:#743877}
    .glam-race .club-race-header{gap:10px;padding:2px 2px 6px}
    .glam-race .race-page-links,.glam-race .race-header-actions{gap:10px;align-items:center}
    .glam-race .cloud-status{font-size:12px;white-space:nowrap;color:#ab6a8d;font-weight:800}
    .glam-race .club-back,.glam-race #logoutBtn{min-height:42px;padding:9px 15px;border-radius:999px;font-size:14px;gap:7px;box-shadow:0 7px 16px rgba(220,150,185,.18),inset 0 1px 0 rgba(255,255,255,.92)}
    .glam-race .race-journal-link .y2k-race-logo{width:22px;height:22px;object-fit:contain}
    .glam-race #clubProfileOpen{min-height:50px;padding:5px 15px 5px 7px;border-radius:999px;font-size:15px;gap:9px;box-shadow:0 10px 22px rgba(220,150,185,.22),inset 0 1px 0 rgba(255,255,255,.96)}
    .glam-race #clubProfileOpen .glam-avatar{width:38px;height:38px;flex:0 0 38px;border:2px solid #efb9d5;box-shadow:0 2px 8px rgba(216,116,170,.25)}
    .glam-race #clubProfileOpen .club-profile-name{max-width:112px;font-weight:900}
    @media(max-width:700px){.glam-race .club-back,.glam-race #logoutBtn{min-height:38px;padding:8px 12px;font-size:13px}.glam-race #clubProfileOpen{min-height:46px;padding:4px 12px 4px 6px;font-size:14px}.glam-race #clubProfileOpen .glam-avatar{width:34px;height:34px;flex-basis:34px}.glam-race .race-page-links,.glam-race .race-header-actions{gap:8px}}
    @media(max-width:480px){#msp-break-companion{right:8px;bottom:8px;padding:8px}.glam-race .club-back,.glam-race #logoutBtn{min-height:36px;padding:7px 11px;font-size:12px}.glam-race #clubProfileOpen{min-height:42px;padding:4px 10px 4px 5px}.glam-race #clubProfileOpen .club-profile-name{max-width:84px}}
  `;
  document.head.append(style);

  const chip=document.createElement('aside');
  chip.id='msp-break-companion'; chip.hidden=true;
  chip.setAttribute('aria-label','Mini mola sayacı');
  chip.innerHTML=`<span id="mspBreakChipLabel">🌷 Mola</span><b id="mspBreakChipClock">05:00</b><button id="mspBreakChipAudio" type="button" title="Bu sayfada alarm sesini etkinleştir">🔊 Ses</button><button id="mspBreakChipStop" type="button">Sustur</button>`;
  document.body.append(chip);
  const chipClock=$('mspBreakChipClock'), chipLabel=$('mspBreakChipLabel');
  const chipAudio=$('mspBreakChipAudio'), chipStop=$('mspBreakChipStop');
  chipAudio.addEventListener('click',()=>{ unlock(); chipAudio.textContent='🔊 Açık'; });
  chipStop.addEventListener('click',()=>silence());

  const clock=$('raceV42BreakClock'), toggle=$('raceV42BreakToggle'), reset=$('raceV42BreakReset');
  const note=$('raceV42BreakNote'), minutes=$('raceV43BreakMinutes'), sound=$('raceV43BreakSound');
  const presets=[...document.querySelectorAll('[data-race-break-minutes]')];
  const silenceBtn=$('raceV44Silence');
  const permissionBtn=$('raceV44Permission');
  if(sound) sound.checked=read(SOUND_KEY)!=='off';
  if(permissionBtn) {
    permissionBtn.hidden=(!('Notification' in window) || Notification.permission==='granted');
    permissionBtn.addEventListener('click',async()=>{
      if(!('Notification' in window))return;
      try { const permission=await Notification.requestPermission();
        permissionBtn.textContent=permission==='granted'?'✓ Bildirimler açık':'Bildirim izni verilmedi';
      } catch { permissionBtn.textContent='Bildirim kullanılamıyor'; }
    });
  }
  function describe(v) {
    return ({idle:'Mola öncesinde çalışma kronometreni duraklat ♡',
      running:'Molan sürüyor ♡ Diğer sayfalarda da devam eder.',
      paused:'Molan duraklatıldı ♡',
      alarming:'🔔 Molan bitti! Alarmı susturabilirsin ♡',
      done:'🌷 Molan bitti! Hazırsan kaldığın yerden devam et ♡'})[v.status];
  }
  function render(v) {
    const left=remaining(v);
    if(clock) clock.textContent=fmt(left);
    if(minutes && document.activeElement!==minutes) minutes.value=String(v.minutes);
    if(toggle) {
      toggle.textContent=v.status==='running'?'Ⅱ Duraklat':
        (v.status==='alarming'?'🔔 Alarm çalıyor': v.status==='done'?'▶ Yeniden başlat':'▶ Mola başlat');
      toggle.disabled=v.status==='alarming';
    }
    if(silenceBtn) silenceBtn.hidden=v.status!=='alarming';
    if(note) note.textContent=describe(v);
    for(const btn of presets) btn.setAttribute('aria-pressed',String(Number(btn.dataset.raceBreakMinutes)===v.minutes));
    const showChip=['running','paused','alarming'].includes(v.status);
    chip.hidden=!showChip;
    if(showChip){
      chipClock.textContent=fmt(left);
      chipLabel.textContent=v.status==='alarming'?'🔔 Mola sona erdi':v.status==='paused'?'🌷 Mola durdu':'🌷 Mola';
      chipStop.hidden=v.status!=='alarming';
      chipAudio.hidden=(read(SOUND_KEY)==='off');
      chipAudio.textContent=ctx?.state==='running'?'🔊 Ses açık':'🔊 Sesi aç';
    }
  }
  function refresh() {
    const v=current(); render(v);
    if(v.status==='alarming') {
      const t=nowMs();
      if(ownChime(t)) {
        notifyOnce(v);
        if(read(SOUND_KEY)!=='off' && t-lastChime>3400) { lastChime=t; melody(); }
      }
    } else releaseChime();
  }
  function setDuration(val) {
    const v=clamp(val); save(MINUTES_KEY,v);
    modify(s=>Object.assign(s,makeIdle(v)));
  }
  function silence() {
    modify(s=>{s.status='done';s.remainingMs=0;s.deadline=0;s.alarmUntil=0;});
    releaseChime();
  }
  if(minutes) minutes.addEventListener('change',()=>setDuration(minutes.value));
  presets.forEach(b=>b.addEventListener('click',()=>setDuration(b.dataset.raceBreakMinutes)));
  if(sound) sound.addEventListener('change',()=>{
    save(SOUND_KEY,sound.checked?'on':'off'); if(sound.checked) unlock(); refresh();
  });
  if(toggle) toggle.addEventListener('click',()=>{
    unlock();
    if(minutes && Number(minutes.value)!==current().minutes) setDuration(minutes.value);
    modify(v=>{
      if(v.status==='running') {v.remainingMs=remaining(v); v.deadline=0;v.status='paused';}
      else if(v.status!=='alarming') {
        v.remainingMs=v.status==='done'?v.minutes*60000:Math.max(1000,v.remainingMs);
        v.deadline=nowMs()+v.remainingMs; v.status='running'; v.alarmUntil=0;v.notificationSent=false;
      }
    });
  });
  if(reset) reset.addEventListener('click',()=>modify(s=>Object.assign(s,makeIdle(s.minutes))));
  if(silenceBtn) silenceBtn.addEventListener('click',silence);

  // Opt-in, non-persistent audio; journal text is neither read nor modified by this module.
  const typeButton=$('journalTypewriterToggle'), typeLabel=$('journalTypewriterLabel');
  const field=$('journalText');
  let typingOn=read(TYPE_KEY)==='on';
  function renderType() {
    if(!typeButton)return;
    typeButton.setAttribute('aria-pressed',String(typingOn));
    typeButton.setAttribute('aria-label',`Peri teli tuş sesi ${typingOn?'açık':'kapalı'}. Değiştirmek için tıkla.`);
    if(typeLabel)typeLabel.textContent=typingOn?'✨ Peri teli: Açık':'✨ Peri teli: Kapalı';
  }
  // Tiny, airy fairy-dust string pluck for each typed key. The tone is softer,
  // more like a magical harp or a shimmering string than a click or bright bell.
  // Reuse the short precomputed buffers so fast typing stays smooth on mobile.
  function fairyBuffer(a) {
    if (fairySamples?.rate===a.sampleRate) return fairySamples.buffers;
    const rate=a.sampleRate;
    const pitches=[659.25,587.33,698.46,783.99,739.99,659.25];
    const count=Math.ceil(rate*0.185);
    const buffers=pitches.map((f,variant)=>{
      const out=a.createBuffer(1,count,rate);
      const pcm=out.getChannelData(0);
      let seed=(6143+variant*883)>>>0;
      let filtered=0;
      for(let i=0;i<count;i++) {
        const t=i/rate;
        const attack=1-Math.exp(-t/0.0026);
        const body=attack*Math.exp(-t/0.060);
        const softEnd=Math.max(0,Math.min(1,(0.182-t)/0.018));
        const env=body*softEnd;
        const glide=1+0.010*Math.exp(-t/0.026);
        const phase=2*Math.PI*f*glide*t;
        const main=0.19*Math.sin(phase)*env;
        const octave=0.070*Math.sin(phase*2+0.22)*env*Math.exp(-t/0.085);
        const shimmer=0.030*Math.sin(phase*2.97+0.9)*env*Math.exp(-t/0.040);
        seed=(Math.imul(seed,1664525)+1013904223)>>>0;
        const white=seed/2147483648-1;
        filtered+=0.06*(white-filtered);
        const dust=(white-filtered)*0.005*attack*Math.exp(-t/0.016);
        const q=t-0.026;
        const tail=q>0 ? 0.020*(1-Math.exp(-q/0.004))*Math.sin(2*Math.PI*f*1.50*q+0.35)*Math.exp(-q/0.045) : 0;
        pcm[i]=main+octave+shimmer+dust+tail;
      }
      const echo1=Math.round(rate*0.024), echo2=Math.round(rate*0.051);
      for(let i=0;i<count;i++) {
        pcm[i]+= (i>=echo1?pcm[i-echo1]*0.14:0) + (i>=echo2?pcm[i-echo2]*0.06:0);
      }
      return out;
    });
    fairySamples={rate,buffers};
    return buffers;
  }
  function keyClick() {

    if(!typingOn || field?.readOnly || field?.disabled) return;
    const t=nowMs(); if(t-lastTyped<35)return;
    lastTyped=t;
    const a=audio();if(!a)return;
    if(a.state==='suspended') { void a.resume().catch(()=>{}); return; }
    if(a.state!=='running')return;
    try {
      const source=a.createBufferSource(),volume=a.createGain();
      const samples=fairyBuffer(a);
      source.buffer=samples[fairyCount++%samples.length];
      volume.gain.value=0.47;
      source.connect(volume).connect(a.destination);
      source.start();
    } catch { /* Typing must always work even if browser audio is unavailable. */ }
  }
  if(typeButton) typeButton.addEventListener('click',()=>{
    typingOn=!typingOn;save(TYPE_KEY,typingOn?'on':'off');renderType();
    if(typingOn){ unlock(); setTimeout(keyClick,60); }
  });
  if(field) {
    field.addEventListener('keydown',e=>{
      if(!e.isTrusted || !typingOn || e.isComposing || e.ctrlKey || e.altKey || e.metaKey)return;
      if(e.key.length===1 || ['Enter','Backspace','Delete'].includes(e.key)){
        lastPhysicalKey=nowMs();keyClick();
      }
    });
    field.addEventListener('beforeinput',e=>{
      if(!e.isTrusted || !typingOn || e.isComposing)return;
      if(nowMs()-lastPhysicalKey<90)return;
      if((e.inputType==='insertText' && e.data?.length===1) ||
         ['deleteContentBackward','insertParagraph','insertLineBreak'].includes(e.inputType))keyClick();
    });
  }
  window.addEventListener('storage',e=>{
    if(e.key===STATE_KEY || e.key===SOUND_KEY)refresh();
    if(e.key===TYPE_KEY){ typingOn=read(TYPE_KEY)==='on';renderType(); }
  });
  document.addEventListener('visibilitychange',refresh);
  window.addEventListener('focus',refresh);
  renderType();refresh();
  setInterval(refresh,420);
})();
