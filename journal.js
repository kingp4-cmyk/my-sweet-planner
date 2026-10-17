'use strict';
/* Journal is loaded ONLY on journal.html, never on the 31-day planner. */
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const $ = id => document.getElementById(id);
const colors = [
  ['rose','#fff9f5','#ffc4e3'],['peach','#fff9ee','#ffdcab'],
  ['mint','#f5fff9','#b6ebd4'],['lilac','#fbf7ff','#d5b8f6'],
  ['butter','#fffef1','#fff0ae']
];
const patterns = [['lines','☰'],['dots','· ·'],['gingham','▦'],['hearts','♡'],['stars','✦'],['flowers','✿'],['ribbons','🎀'],['grid','▤'],['sprinkles','✨'],['checker','◈']];
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const journalStickerSources = ["./assets/stickers/blessed.webp","./assets/stickers/bow-small.webp","./assets/stickers/darling-magic.webp","./assets/stickers/discipline.webp","./assets/stickers/disco-heart.webp","./assets/stickers/dream-girl.webp","./assets/stickers/girl-boss-glasses.webp","./assets/stickers/girls-go-heaven.webp","./assets/stickers/girls-support.webp","./assets/stickers/glossy-lips.webp","./assets/stickers/heart-sunglasses.webp","./assets/stickers/hot-girl-summer.webp","./assets/stickers/hot-girls-read.webp","./assets/stickers/hotter-than-july.webp","./assets/stickers/its-me.webp","./assets/stickers/main-character.webp","./assets/stickers/pink-bow.webp","./assets/stickers/pink-car.webp","./assets/stickers/pink-cocktail.webp","./assets/stickers/pink-leopard.webp","./assets/stickers/pink-phone.webp","./assets/stickers/pink-star.webp","./assets/stickers/pretty-sharp.webp","./assets/stickers/queen-cards.webp","./assets/stickers/romanticizing.webp","./assets/stickers/silver-star.webp","./assets/stickers/soft-heart.webp","./assets/stickers/think-like-boss.webp","./assets/stickers/too-glam.webp","./assets/stickers/vintage-altin-ay.webp","./assets/stickers/vintage-ask-kaseti.webp","./assets/stickers/vintage-ask-mektubu.webp","./assets/stickers/vintage-atli-karinca.webp","./assets/stickers/vintage-ayicik.webp","./assets/stickers/vintage-cicek-demeti.webp","./assets/stickers/vintage-cicekli-cay.webp","./assets/stickers/vintage-cilek.webp","./assets/stickers/vintage-cilekli-milkshake.webp","./assets/stickers/vintage-dantel-kalp.webp","./assets/stickers/vintage-disco-kalp.webp","./assets/stickers/vintage-disco-topu.webp","./assets/stickers/vintage-focus-on-good.webp","./assets/stickers/vintage-ikinci-kelebek.webp","./assets/stickers/vintage-ince-kurdele.webp","./assets/stickers/vintage-iyi-seyler.webp","./assets/stickers/vintage-kalp-canta.webp","./assets/stickers/vintage-kalp-gozluk.webp","./assets/stickers/vintage-kalp-kilit.webp","./assets/stickers/vintage-kalpli-madalya.webp","./assets/stickers/vintage-kalpli-pasta.webp","./assets/stickers/vintage-kapakli-telefon.webp","./assets/stickers/vintage-kelebek.webp","./assets/stickers/vintage-kirazli-kurdele.webp","./assets/stickers/vintage-kirazli-pankek.webp","./assets/stickers/vintage-kurdeleli-kitap.webp","./assets/stickers/vintage-main-character-kalp.webp","./assets/stickers/vintage-minik-kalp.webp","./assets/stickers/vintage-mor-deniz-kabugu.webp","./assets/stickers/vintage-mucevher-kalp.webp","./assets/stickers/vintage-okuyan-kiz.webp","./assets/stickers/vintage-parfum.webp","./assets/stickers/vintage-pembe-canta.webp","./assets/stickers/vintage-pembe-icecek.webp","./assets/stickers/vintage-pembe-klasik-araba.webp","./assets/stickers/vintage-pembe-laleler.webp","./assets/stickers/vintage-pembe-mum.webp","./assets/stickers/vintage-pembe-vosvos.webp","./assets/stickers/vintage-plak.webp","./assets/stickers/vintage-pretty-girl.webp","./assets/stickers/vintage-romantik-hayat.webp","./assets/stickers/vintage-ruj.webp","./assets/stickers/vintage-saten-fiyonk.webp","./assets/stickers/vintage-simli-yildiz.webp","./assets/stickers/vintage-tatli-kedi.webp","./assets/stickers/vintage-you-are-enough.webp","./assets/bow.png","./assets/bunny.png","./assets/butterfly.png","./assets/cherries.png","./assets/cloud.png","./assets/cup.png","./assets/flower.png","./assets/heart.png","./assets/kitty.png","./assets/moon.png","./assets/star.png","./assets/strawberry.png"];
const allowedFontFamilies = {
  georgia: 'Georgia, serif',trebuchet: '"Trebuchet MS", sans-serif',
  verdana: 'Verdana, sans-serif',comic: '"Comic Sans MS", cursive',
  courier: '"Courier New", monospace',times: '"Times New Roman", serif',
  cursive: 'cursive'
};
const allowedMoods = ['','Mutlu','Neşeli','Huzurlu','Heyecanlı','Enerjik','Umutlu','Motive','Minnettar','Sevgi dolu','Sakin','Düşünceli','Duygusal','Yorgun','Uykulu','Endişeli','Üzgün','Kırgın','Bunalmış','Cesur'];
// Preserve mood choices saved by earlier versions rather than clearing them.
const legacyMoods = {'😊':'Neşeli','🥰':'Mutlu','😌':'Huzurlu','🥺':'Duygusal','😴':'Yorgun','💪':'Enerjik'};
const emptyEntry = () => ({ content:'', mood:'', paper:'rose', pattern:'lines', fontSize:18, fontFamily:'georgia', customColor:'#fff9f5', decorations:[], glitterStrokes:[] });
const safeHex = v => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#fff9f5';
const clamp = (n,min,max) => Math.min(max,Math.max(min,Number(n) || 0));
const normalize = item => ({
  content: typeof item?.content === 'string' ? item.content.slice(0,25000) : '',
  mood: allowedMoods.includes(legacyMoods[item?.mood] || item?.mood) ? (legacyMoods[item?.mood] || item.mood) : '',
  paper: item?.paper === 'custom' || colors.some(c => c[0] === item?.paper) ? item.paper : 'rose',
  pattern: patterns.some(p => p[0] === item?.pattern) ? item.pattern : 'lines',
  fontSize: [16,18,20,23].includes(Number(item?.fontSize)) ? Number(item.fontSize) : 18,
  fontFamily: Object.hasOwn(allowedFontFamilies,item?.fontFamily) ? item.fontFamily : 'georgia',
  customColor: safeHex(item?.customColor),
  decorations: Array.isArray(item?.decorations) ? item.decorations.slice(0,48).filter(d =>
    d && Number.isFinite(Number(d.x)) && Number.isFinite(Number(d.y)) &&
    Number.isFinite(Number(d.size)) && Number.isInteger(Number(d.asset)) &&
    d.asset >= 0 && d.asset < journalStickerSources.length
  ).map(d=>({
    id: typeof d.id === 'string' ? d.id.slice(0,50) : '',
    asset:Number(d.asset),x:clamp(d.x,3,97),y:clamp(d.y,3,97),size:clamp(d.size,24,160)
  })) : [],
  glitterStrokes: Array.isArray(item?.glitterStrokes) ? item.glitterStrokes.slice(0,36).map(stroke =>
    Array.isArray(stroke) ? stroke.slice(0,110).filter(pt=>Array.isArray(pt) && Number.isFinite(Number(pt[0])) && Number.isFinite(Number(pt[1])))
      .map(pt=>[Math.round(clamp(pt[0],0,1000)),Math.round(clamp(pt[1],0,1000))]) : []
  ).filter(stroke=>stroke.length>1) : []
});

const app = getApps().length ? getApp() : initializeApp(window.MSP_FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
let user = null;
let activeDate = today();
let entry = emptyEntry();
let cloudTimer = null;
let loadingSerial = 0;
let saveSerial = 0;
const cloudQueue = new Map();
let liveURLs = [];
let isReady = false;
let archiveMonth = today().slice(0,7);
let galleryExpanded = false;
let glitterActive = false;
let activeStroke = null;
let selectedStickerSize = 70;
let selectedStickerId = null;
let eraserActive = false;
let eraserPointerId = null;

const localKey = date => `msp-journal-v1:${user.uid}:${date}`;
function say(message) { $('journalSaveStatus').textContent = message; }
function cached(date) {
  try { const raw = JSON.parse(localStorage.getItem(localKey(date))); return raw && typeof raw === 'object' ? raw : null; }
  catch { return null; }
}
function cache(date, data, dirty) {
  try { localStorage.setItem(localKey(date), JSON.stringify({data,dirty, savedAt:Date.now()})); return true; }
  catch (e) { console.warn('Local cache failed', e); say('⚠ Tarayıcı belleği dolu. Yedeğini indir!'); return false; }
}
function snapshot() { return normalize(entry); }
function localSave() {
  if (!user || !isReady) return;
  cache(activeDate, snapshot(), true);
  say('♡ Cihazına kaydedildi; bulut bekliyor…');
}
function changed() {
  localSave();
  $('journalCharacters').textContent = `${entry.content.length} / 25000`;
  clearTimeout(cloudTimer);
  cloudTimer = setTimeout(() => void push(activeDate,snapshot()), 1000);
}
function push(date, data) {
  if (!user) return Promise.resolve();
  // Serialize cloud writes per day: an old request must never finish after a newer one.
  const previous = cloudQueue.get(date) || Promise.resolve();
  const pending = previous.then(() => writeEntry(date,data));
  cloudQueue.set(date,pending);
  void pending.then(() => {
    if (cloudQueue.get(date) === pending) cloudQueue.delete(date);
  });
  return pending;
}
async function writeEntry(date,data) {
  const sequence = ++saveSerial;
  const ref = doc(db, 'plannerUsers', user.uid, 'journal', date);
  try {
    await setDoc(ref,{data,version:1,updatedAt:serverTimestamp()});
    const local = cached(date);
    // Only mark clean if the browser has not made newer edits.
    if (local && JSON.stringify(normalize(local.data)) === JSON.stringify(data)) {
      cache(date,data,false);
      if (activeDate === date && sequence === saveSerial) say('☁ Günlüğün buluta kaydedildi ✓');
    } else if (local?.dirty) {
      // Include edits made during this request, even if the user changed dates.
      void push(date,normalize(local.data));
    }
  } catch (e) {
    console.warn('[Journal] Cloud save failed', e);
    if (activeDate === date) say(e?.code === 'permission-denied'
      ? '♡ Taslak yalnızca bu cihazda kaydedildi · Bulut eşitlemesi kapalı'
      : '♡ Taslak bu cihazda kaydedildi · Bulut bağlantısı bekleniyor');
  }
}
/* All decorations are small references to built-in static assets. No image data is
   written to Firestore, and the existing daily record schema is preserved. */
function resizeWriting() {
  const t=$('journalText');
  t.style.height='auto';
  t.style.height=`${Math.max(345,t.scrollHeight+8)}px`;
}
function renderArchive() {
  const month=$('journalArchiveMonth');
  if (month.value!==archiveMonth) month.value=archiveMonth;
  const [y,m]=archiveMonth.split('-').map(Number);
  const count=new Date(y,m,0).getDate();
  const host=$('journalArchiveDays');
  host.replaceChildren();
  for(let d=1;d<=count;d++){
    const date=`${archiveMonth}-${String(d).padStart(2,'0')}`;
    const b=document.createElement('button');b.type='button';b.textContent=d;
    b.title=new Date(y,m-1,d).toLocaleDateString('tr-TR',{day:'numeric',month:'long',weekday:'long'});
    if(date===activeDate)b.setAttribute('aria-current','date');
    b.addEventListener('click',()=>changeDate(date));host.append(b);
  }
}
function shiftArchiveMonth(n) {
  const [y,m]=archiveMonth.split('-').map(Number);
  const d=new Date(y,m-1+n,1);
  if(d.getFullYear()<1900||d.getFullYear()>2099)return;
  archiveMonth=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  renderArchive();
}
const stickerId=()=>crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
function renderStickerGallery() {
  const host=$('journalStickerGallery');host.replaceChildren();
  const sources=galleryExpanded ? journalStickerSources : journalStickerSources.slice(0,18);
  sources.forEach(src => {
    const index=journalStickerSources.indexOf(src);
    const button=document.createElement('button');button.type='button';
    button.title=`${src.split('/').pop().split('.')[0].replaceAll('-',' ')} ekle`;
    const img=new Image();img.src=src;img.loading='lazy';img.decoding='async';img.alt=button.title;
    button.append(img);
    button.addEventListener('click',()=>{
      if(!isReady)return;
      if(entry.decorations.length>=48){say('⚠ Bu günün sticker sınırı 48.');return;}
      const newDeco={id:stickerId(),asset:index,x:65,y:55,size:70};
      entry.decorations.push(newDeco);selectedStickerId=newDeco.id;
      syncSelectedSticker();renderDecorations();changed();
      say('🎀 Sticker eklendi; sayfanın üzerinde sürükleyebilirsin.');
    });
    host.append(button);
  });
  const more=$('journalStickerMore');
  more.textContent=galleryExpanded?'♡ Daha az sticker göster':`♡ Daha fazla sticker göster (${journalStickerSources.length})`;
  more.setAttribute('aria-expanded',String(galleryExpanded));
}
function syncSelectedSticker(){
  const selected=entry.decorations.find(d=>d.id===selectedStickerId);
  if(selected)selectedStickerSize=selected.size;
  else selectedStickerSize=70;
  const slider=$('journalStickerSize');
  slider.disabled=!selected;
  slider.value=String(selectedStickerSize);
  $('journalStickerSizeValue').textContent=selected?`${selectedStickerSize} px`:'Sticker seç ♡';
}
function renderDecorations() {
  const host=$('journalDecorations');host.replaceChildren();
  for(const deco of entry.decorations){
    const src=journalStickerSources[deco.asset];if(!src)continue;
    const el=document.createElement('div');el.className='journal-deco-item';
    el.style.left=`${deco.x}%`;el.style.top=`${deco.y}%`;
    el.style.setProperty('--deco-size',`${deco.size}px`);
    if(deco.id===selectedStickerId)el.classList.add('is-selected');
    const img=new Image();img.src=src;img.loading='lazy';img.draggable=false;img.alt='Sürüklenebilir sticker';
    const del=document.createElement('button');del.type='button';del.className='journal-deco-delete';
    del.textContent='×';del.title='Stickerı kaldır';del.setAttribute('aria-label','Stickerı kaldır');
    del.addEventListener('click',e=>{e.stopPropagation();entry.decorations=entry.decorations.filter(d=>d!==deco);if(selectedStickerId===deco.id)selectedStickerId=null;syncSelectedSticker();renderDecorations();changed();});
    el.append(img,del);
    el.addEventListener('pointerdown',ev=>{
      if(ev.target===del || glitterActive || eraserActive)return;
      selectedStickerId=deco.id;syncSelectedSticker();
      host.querySelectorAll('.journal-deco-item').forEach(item=>item.classList.remove('is-selected'));
      el.classList.add('is-selected');
      ev.preventDefault();el.setPointerCapture(ev.pointerId);el.style.cursor='grabbing';
    });
    el.addEventListener('pointermove',ev=>{
      if(!el.hasPointerCapture(ev.pointerId))return;
      const rect=$('journalPaper').getBoundingClientRect();
      deco.x=clamp((ev.clientX-rect.left)*100/rect.width,3,97);
      deco.y=clamp((ev.clientY-rect.top)*100/rect.height,3,97);
      el.style.left=`${deco.x}%`;el.style.top=`${deco.y}%`;
    });
    el.addEventListener('pointerup',ev=>{
      if(!el.hasPointerCapture(ev.pointerId))return;
      el.releasePointerCapture(ev.pointerId);el.style.cursor='grab';changed();
    });
    host.append(el);
  }
}
const NS='http://www.w3.org/2000/svg';
function makeSvg(tag,attrs){const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));return e;}
function pathData(points){return points.map((p,i)=>`${i?'L':'M'}${p[0]} ${p[1]}`).join(' ');}
function makeGlitterPath(points){
  const g=makeSvg('g',{}),d=pathData(points);
  g.append(makeSvg('path',{d,stroke:'#ffb3dc','stroke-opacity':'.4','stroke-width':20,'vector-effect':'non-scaling-stroke'}));
  g.append(makeSvg('path',{d,stroke:'url(#journalGlitterTexture)','stroke-width':13,'vector-effect':'non-scaling-stroke'}));
  return g;
}
function renderGlitter(){
  const paths=$('journalGlitterPaths');paths.replaceChildren();
  for(const points of entry.glitterStrokes)paths.append(makeGlitterPath(points));
  $('journalGlitterLayer').classList.toggle('is-drawing',glitterActive || eraserActive);
  $('journalGlitterLayer').classList.toggle('is-erasing',eraserActive);
  $('journalGlitterEraser').setAttribute('aria-pressed',String(eraserActive));
  $('journalGlitterToggle').setAttribute('aria-pressed',String(glitterActive));
  $('journalGlitterToggle').textContent=glitterActive?'✨ Simli fırçayı kapat':'✨ Simli fırçayı aç';
}
function pointAtPointer(e){const r=$('journalGlitterLayer').getBoundingClientRect();return [Math.round(clamp((e.clientX-r.left)/r.width*1000,0,1000)),Math.round(clamp((e.clientY-r.top)/r.height*1000,0,1000))];}

function paint() {
  $('journalDate').value = activeDate;
  const parts = activeDate.split('-').map(Number);
  $('journalPrettyDate').textContent = new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'long',year:'numeric',weekday:'long'}).format(new Date(parts[0],parts[1]-1,parts[2]));
  $('journalText').value = entry.content;
  $('journalMood').value = entry.mood;
  $('journalFont').value = String(entry.fontSize);
  $('journalFontFamily').value=entry.fontFamily;
  updateFontPreview();
  $('journalText').style.fontSize = `${entry.fontSize}px`;
  $('journalText').style.fontFamily=allowedFontFamilies[entry.fontFamily];
  resizeWriting();
  $('journalCustomColor').value = entry.customColor;
  $('journalCharacters').textContent = `${entry.content.length} / 25000`;
  $('journalPaper').className = `journal-paper paper-${entry.paper} pattern-${entry.pattern}${glitterActive ? ' glitter-active' : ''}`;
  $('journalPaper').style.setProperty('--custom-paper',entry.customColor);
  renderDecorations();
  syncSelectedSticker();
  renderGlitter();
  renderArchive();
  $('journalSwatches').innerHTML = '';
  for (const [key,,swatch] of colors) {
    const btn = document.createElement('button'); btn.type='button'; btn.style.background = swatch;
    btn.title = `${key} sayfa`;btn.setAttribute('aria-label',`${key} sayfa`);
    btn.setAttribute('aria-pressed',String(key===entry.paper));
    btn.addEventListener('click', () => { entry.paper=key;paint();changed(); });
    $('journalSwatches').append(btn);
  }
  $('journalPatterns').innerHTML = '';
  for (const [key,icon] of patterns) {
    const btn = document.createElement('button');btn.type='button';btn.textContent=icon;btn.title=`${key} desen`;
    btn.setAttribute('aria-pressed', String(key===entry.pattern));
    btn.addEventListener('click', () => {entry.pattern=key;paint();changed();});
    $('journalPatterns').append(btn);
  }
}
function changeDate(date) {
  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(date) || !Number.isFinite(new Date(`${date}T12:00:00`).getTime())) return;
  clearTimeout(cloudTimer);
  archiveMonth = date.slice(0,7);
  if (user && isReady && cached(activeDate)?.dirty) void push(activeDate,snapshot());
  void loadDate(date);
}
async function loadDate(date) {
  const token = ++loadingSerial;
  isReady=false;
  $('journalText').readOnly=true;
  activeDate=date;
  archiveMonth=date.slice(0,7);
  selectedStickerId=null;selectedStickerSize=70;
  revokeMedia();
  const local = cached(date);
  entry = normalize(local?.data);
  paint();
  say('♡ Günlük yükleniyor…');
  let remote = null;
  let cloudLoadFailed = false;
  try {
    const snap = await getDoc(doc(db,'plannerUsers',user.uid,'journal',date));
    if (snap.exists()) remote = normalize(snap.data().data);
  } catch (e) {
    console.warn('[Journal] Cloud load failed',e);
    cloudLoadFailed = true;
    if (token !== loadingSerial) return;
    say(e?.code === 'permission-denied' ? '♡ Cihazındaki günlük açıldı · Bulut eşitlemesi kapalı' : '♡ Cihazındaki günlük açıldı · Bulut bağlantısı bekleniyor');
  }
  if (token !== loadingSerial) return;
  if (local?.dirty) {
    entry = normalize(local.data); // Never clobber unsynced local text with an older remote copy.
  } else if (remote) {
    entry = remote;
    cache(date, entry, false);
  } else if (local) entry = normalize(local.data);
  else entry=emptyEntry();
  paint();
  isReady=true;
  $('journalText').readOnly=false;
  if (local?.dirty) { say('♡ Bekleyen değişiklikler buluta gönderiliyor…');void push(date,snapshot()); }
  else if (remote) say('☁ Buluttan yüklendi ✓');
  else if (!local && !cloudLoadFailed) say('♡ Yeni bir sayfa, yeni bir hikâye...');
  await renderMedia(token);
}

/* IndexedDB: media remains on this browser only. Do not place blobs into
 * planner Firestore JSON (700 KB limit). Load only for selected date. */
const DB_NAME='msp-journal-media-v1';
function mediaDB() {
  return new Promise((resolve,reject) => {
    if (!('indexedDB' in window)) { reject(new Error('Bu tarayıcı dosya depolamayı desteklemiyor.'));return; }
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=() => {const db=req.result;if(!db.objectStoreNames.contains('files')) {
      const store=db.createObjectStore('files',{keyPath:'id'}); store.createIndex('userDay','userDay',{unique:false});
    }};
    req.onsuccess=() => resolve(req.result); req.onerror=() => reject(req.error);
  });
}
async function mediaTransaction(mode,job) {
  const db=await mediaDB();
  try { return await new Promise((resolve,reject) => {
    const tx=db.transaction('files',mode);
    const store=tx.objectStore('files');
    let result;
    const req=job(store);
    req.onsuccess=() => { result=req.result; };
    req.onerror=() => reject(req.error);
    tx.oncomplete=() => resolve(result);
    tx.onerror=() => reject(tx.error);
    tx.onabort=() => reject(tx.error);
  }); } finally {db.close();}
}
const mediaKey = date => `${user.uid}:${date}`;
const getMedia = date => mediaTransaction('readonly',store=>store.index('userDay').getAll(mediaKey(date)));
const saveMedia = item => mediaTransaction('readwrite',store=>store.put(item));
const removeMedia = id => mediaTransaction('readwrite',store=>store.delete(id));
function revokeMedia() {for(const url of liveURLs) URL.revokeObjectURL(url);liveURLs=[];}
async function optimizedImage(file) {
  if (!file.type.startsWith('image/') || file.type==='image/gif') return file;
  if (file.size < 170000 && file.type==='image/webp') return file;
  const url=URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((resolve,reject) => { img.onload=resolve; img.onerror=reject; img.src=url; });
    const size=Math.min(1,1400/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(img.naturalWidth*size));
    canvas.height=Math.max(1,Math.round(img.naturalHeight*size));
    canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.8));
    return blob || file;
  } catch {return file;} finally {URL.revokeObjectURL(url);}
}
async function addFiles(files,type) {
  if (!user || !isReady) return;
  const date=activeDate;
  for (const file of [...files]) {
    const mediaType = type==='image' ? file.type.startsWith('image/') && ['image/jpeg','image/png','image/webp'].includes(file.type)
      : type==='video' ? ['video/mp4','video/webm','video/quicktime'].includes(file.type)
      : file.type.startsWith('audio/');
    if (!mediaType) {say(`⚠ Desteklenmeyen dosya biçimi: ${file.name}`);continue;}
    if (file.size > (type==='image' ? 22 : 12)*1024*1024) {
      say('⚠ Bu dosya çok büyük. Video ve ses en fazla 12 MB olabilir.');continue;
    }
    try {
      const blob=type==='image' ? await optimizedImage(file) : file;
      if (blob.size > 12*1024*1024) {say('⚠ Dosya 12 MB sınırını aşıyor.'); continue;}
      const id=crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await saveMedia({id,userDay:mediaKey(date),type,name:file.name.slice(0,120),mime:blob.type || file.type,blob,createdAt:Date.now()});
      say('♡ Medyan bu tarayıcıya eklendi. Yedeğini indirmeyi unutma.');
    } catch(e) {console.error(e);say('⚠ Cihazda yer yetersiz olabilir. Medya eklenemedi; yedeğini kontrol et.');}
  }
  if (date===activeDate) await renderMedia(loadingSerial);
}
async function renderMedia(token) {
  revokeMedia();
  for (const type of ['image','video','audio']) {
    const id={image:'journalImageList',video:'journalVideoList',audio:'journalAudioList'}[type];
    $(id).replaceChildren();
  }
  let all=[];
  try {all=await getMedia(activeDate);}catch(e){console.warn(e);say('⚠ Medya depolama alanı açılamadı.');return;}
  if (token!==loadingSerial) return;
  const selectedDate=activeDate;
  for (const item of all.sort((a,b)=>a.createdAt-b.createdAt)) {
    const wrap=document.createElement('div');wrap.className='memory-item';
    const src=URL.createObjectURL(item.blob);liveURLs.push(src);
    const media=document.createElement(item.type==='image'?'img':item.type==='video'?'video':'audio');
    media.src=src;
    if(item.type==='image') {media.alt=item.name;media.loading='lazy';media.decoding='async';}
    else {media.controls=true;media.preload='none';}
    const foot=document.createElement('div');foot.className='memory-item-footer';
    const name=document.createElement('span');name.textContent=item.name;
    const del=document.createElement('button');del.type='button';del.textContent='×';del.title='Bu anıyı sil';del.className='memory-remove';del.setAttribute('aria-label',`${item.name} dosyasını kaldır`);
    del.addEventListener('click',async()=>{
      if(!confirm('Bu dosyayı bu cihazdaki günlüğünden silmek istiyor musun?'))return;
      try{await removeMedia(item.id); if(activeDate===selectedDate) await renderMedia(loadingSerial);}
      catch{say('⚠ Dosya silinemedi.');}
    });
    foot.append(name);wrap.append(media,foot,del);
    $({image:'journalImageList',video:'journalVideoList',audio:'journalAudioList'}[item.type]).append(wrap);
  }
}
function appendAtCursor(value) {
  const textarea=$('journalText');
  const start=textarea.selectionStart,end=textarea.selectionEnd;
  textarea.setRangeText(value,start,end,'end');entry.content=textarea.value;changed();textarea.focus();
}
const readDataURL = blob => new Promise((resolve,reject) => {
  const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);
});
async function exportDay() {
  if(!user)return;
  localSave();
  $('journalExport').disabled=true;
  say('♡ Anıların yedekleniyor…');
  try {
    const files=await getMedia(activeDate);
    const media=[];
    for (const file of files) media.push({name:file.name,type:file.type,mime:file.mime,data:await readDataURL(file.blob)});
    const output={format:'my-sweet-ajanda-journal-backup-v1',date:activeDate,entry:snapshot(),media};
    const blob=new Blob([JSON.stringify(output)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`my-sweet-gunlugum-${activeDate}.json`;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),12000);
    say('✓ Günlüğünün bu güne ait yedeği indirildi.');
  } catch(e){console.error(e);say('⚠ Yedek alınamadı; medyanı ve tarayıcı alanını kontrol et.');}
  finally{$('journalExport').disabled=false;}
}
async function importDay(file) {
  if(!file || !user)return;
  if(file.size>70*1024*1024) {say('⚠ Bu yedek çok büyük.');return;}
  let parsed;
  try {parsed=JSON.parse(await file.text());}catch{say('⚠ Geçersiz JSON yedeği.');return;}
  if(parsed?.format!=='my-sweet-ajanda-journal-backup-v1' || parsed.date!==activeDate || !Array.isArray(parsed.media)) {
    say('⚠ Yedek dosyasının tarihi, açık günlük tarihiyle aynı olmalı.');return;
  }
  if(!confirm('Bu yedek açık günün yazısını değiştirecek ve medyalarını ekleyecek. Devam edilsin mi?'))return;
  const next=normalize(parsed.entry);
  const date=activeDate;
  try {
    for(const item of parsed.media.slice(0,100)) {
      if(typeof item.data!=='string' || !item.data.startsWith('data:'))continue;
      const response=await fetch(item.data); const blob=await response.blob();
      if(blob.size>12*1024*1024)continue;
      const type=['image','video','audio'].includes(item.type)?item.type:null;
      if(!type)continue;
      const id=crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await saveMedia({id,userDay:mediaKey(date),type,name:String(item.name||'Anı').slice(0,120),mime:blob.type,blob,createdAt:Date.now()});
    }
    if(activeDate===date){entry=next;paint();changed();await renderMedia(loadingSerial);say('♡ Yedek geri yüklendi; bulut kaydı hazırlanıyor.');}
  }catch(e){console.error(e);say('⚠ Yedeğin bir bölümü içe aktarılamadı.');}
}

$('journalText').addEventListener('input',e=>{entry.content=e.target.value;changed();});

$('journalText').addEventListener('input',resizeWriting);
$('journalArchiveMonth').addEventListener('change',e=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)){archiveMonth=e.target.value;renderArchive();}});
$('journalMonthPrev').addEventListener('click',()=>shiftArchiveMonth(-1));
$('journalMonthNext').addEventListener('click',()=>shiftArchiveMonth(1));
$('journalToday').addEventListener('click',()=>changeDate(today()));
$('journalUseCustomColor').addEventListener('click',()=>{entry.customColor=safeHex($('journalCustomColor').value);entry.paper='custom';paint();changed();});
$('journalStickerMore').addEventListener('click',()=>{galleryExpanded=!galleryExpanded;renderStickerGallery();});
document.addEventListener('keydown',e=>{if(e.key==='Escape' && selectedStickerId){selectedStickerId=null;syncSelectedSticker();renderDecorations();}});
$('journalStickerSize').addEventListener('input',e=>{
  if(!isReady)return;
  selectedStickerSize=Number(e.target.value);
  const selected=entry.decorations.find(d=>d.id===selectedStickerId);
  if(selected){selected.size=selectedStickerSize;renderDecorations();changed();}
  syncSelectedSticker();
});
$('journalGlitterToggle').addEventListener('click',()=>{
  glitterActive=!glitterActive;
  if(glitterActive)eraserActive=false;
  renderGlitter();$('journalPaper').classList.toggle('glitter-active',glitterActive);
});
$('journalGlitterEraser').addEventListener('click',()=>{
  eraserActive=!eraserActive;if(eraserActive)glitterActive=false;
  renderGlitter();$('journalPaper').classList.toggle('glitter-active',glitterActive);
});
$('journalGlitterUndo').addEventListener('click',()=>{if(!isReady)return;entry.glitterStrokes.pop();renderGlitter();changed();});
const glitterLayer=$('journalGlitterLayer');
// Erase the nearest stroke with a stroke-sized hit test instead of deleting the entire day's art.
function eraseStrokeAt(e){
  const [x,y]=pointAtPointer(e);
  let nearestIndex=-1,nearest=Infinity;
  entry.glitterStrokes.forEach((points,i)=>{
    for(let k=1;k<points.length;k++){
      const a=points[k-1],b=points[k];const dx=b[0]-a[0],dy=b[1]-a[1];
      const d2=dx*dx+dy*dy;
      const t=d2?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/d2)):0;
      const distance=Math.hypot(x-(a[0]+t*dx),y-(a[1]+t*dy));
      if(distance<nearest){nearest=distance;nearestIndex=i;}
    }
  });
  if(nearestIndex>=0 && nearest<25){entry.glitterStrokes.splice(nearestIndex,1);renderGlitter();changed();}
}
glitterLayer.addEventListener('pointerdown',e=>{
  if(eraserActive){
    if(!isReady)return;
    e.preventDefault();eraserPointerId=e.pointerId;
    glitterLayer.setPointerCapture(e.pointerId);eraseStrokeAt(e);return;
  }
  if(!glitterActive||!isReady||entry.glitterStrokes.length>=36){if(glitterActive && entry.glitterStrokes.length>=36)say('⚠ 36 sim çizgisi sınırına ulaştın.');return;}
  e.preventDefault();glitterLayer.setPointerCapture(e.pointerId);
  activeStroke=[pointAtPointer(e)];
});
glitterLayer.addEventListener('pointermove',e=>{
  if(eraserActive && eraserPointerId===e.pointerId){eraseStrokeAt(e);return;}
  if(!activeStroke||!glitterLayer.hasPointerCapture(e.pointerId))return;
  const pt=pointAtPointer(e),last=activeStroke.at(-1);
  if(Math.hypot(pt[0]-last[0],pt[1]-last[1])<8)return;
  if(activeStroke.length>=110)return;
  activeStroke.push(pt);
  let preview=$('journalGlitterPaths').lastElementChild;
  if(!preview?.dataset?.preview){preview=makeGlitterPath(activeStroke);preview.dataset.preview='1';$('journalGlitterPaths').append(preview);}
  else { const d=pathData(activeStroke);preview.querySelectorAll('path').forEach(path=>path.setAttribute('d',d)); }
});
function finishGlitter(e){
  if(eraserPointerId===e.pointerId){eraserPointerId=null;if(glitterLayer.hasPointerCapture(e.pointerId))glitterLayer.releasePointerCapture(e.pointerId);return;}
  if(!activeStroke)return;
  if(glitterLayer.hasPointerCapture(e.pointerId))glitterLayer.releasePointerCapture(e.pointerId);
  if(activeStroke.length===1)activeStroke.push([Math.min(1000,activeStroke[0][0]+1),activeStroke[0][1]+1]);
  entry.glitterStrokes.push(activeStroke);activeStroke=null;
  renderGlitter();changed();
}
glitterLayer.addEventListener('pointerup',finishGlitter);
glitterLayer.addEventListener('pointercancel',finishGlitter);
renderStickerGallery();

$('journalMood').addEventListener('change',e=>{entry.mood=e.target.value;changed();});
$('journalFont').addEventListener('change',e=>{entry.fontSize=Number(e.target.value);$('journalText').style.fontSize=`${entry.fontSize}px`;resizeWriting();changed();});
$('journalFontFamily').addEventListener('change',e=>{
  updateFontPreview();
  if(!Object.hasOwn(allowedFontFamilies,e.target.value))return;
  entry.fontFamily=e.target.value;$('journalText').style.fontFamily=allowedFontFamilies[entry.fontFamily];
  resizeWriting();changed();
});
// Font choices are shown in their actual typeface before committing a selection.
const fontPicker=$('journalFontPicker');
const fontTrigger=$('journalFontTrigger');
const fontChoices=$('journalFontChoices');
const fontOptionNames=Object.fromEntries([...fontChoices.querySelectorAll('[data-journal-font]')].map(b=>[b.dataset.journalFont,b.querySelector('span').textContent]));
function updateFontPreview(){
  const key=$('journalFontFamily').value;
  $('journalFontTriggerName').textContent=fontOptionNames[key]||'Klasik günlük';
  fontTrigger.style.fontFamily=allowedFontFamilies[key]||'Georgia,serif';
  fontChoices.querySelectorAll('[data-journal-font]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.journalFont===key)));
}
function closeFontChoices(){fontChoices.hidden=true;fontTrigger.setAttribute('aria-expanded','false');}
fontTrigger.addEventListener('click',()=>{
  if(fontChoices.hidden){fontChoices.hidden=false;fontTrigger.setAttribute('aria-expanded','true');}
  else closeFontChoices();
});
fontChoices.querySelectorAll('[data-journal-font]').forEach(btn=>btn.addEventListener('click',()=>{
  if(!isReady)return;
  $('journalFontFamily').value=btn.dataset.journalFont;
  $('journalFontFamily').dispatchEvent(new Event('change',{bubbles:true}));
  updateFontPreview();closeFontChoices();fontTrigger.focus();
}));
document.addEventListener('pointerdown',e=>{if(!fontPicker.contains(e.target))closeFontChoices();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!fontChoices.hidden){closeFontChoices();fontTrigger.focus();}});

$('journalDate').addEventListener('change',e=>{if(e.target.value)changeDate(e.target.value);});
function dateShift(days) {const d=new Date(`${activeDate}T12:00:00`);d.setDate(d.getDate()+days);changeDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);}
$('journalPrevDay').addEventListener('click',()=>dateShift(-1));
$('journalNextDay').addEventListener('click',()=>dateShift(1));
$('journalSaveNow').addEventListener('click',()=>{if(!user)return;localSave();clearTimeout(cloudTimer);void push(activeDate,snapshot());});
$('journalExport').addEventListener('click',()=>void exportDay());
$('journalImport').addEventListener('change',e=>{void importDay(e.target.files?.[0]);e.target.value='';});
$('journalFocus').addEventListener('click',()=>$('journalText').focus());
$('journalThemeNext').addEventListener('click',()=>{entry.paper=colors[(colors.findIndex(x=>x[0]===entry.paper)+1)%colors.length][0];paint();changed();});
$('journalPatternNext').addEventListener('click',()=>{entry.pattern=patterns[(patterns.findIndex(x=>x[0]===entry.pattern)+1)%patterns.length][0];paint();changed();});
document.querySelectorAll('[data-insert]').forEach(btn=>btn.addEventListener('click',()=>appendAtCursor(btn.dataset.insert)));
for(const [type,id] of [['image','journalImages'],['video','journalVideos'],['audio','journalAudio']]) {
  const input=$(id);input.addEventListener('change',()=>{void addFiles(input.files,type);input.value='';});
  const panel=input.closest('[data-media-drop]');
  panel.addEventListener('dragover',e=>{e.preventDefault();panel.classList.add('drag-over');});
  panel.addEventListener('dragleave',()=>panel.classList.remove('drag-over'));
  panel.addEventListener('drop',e=>{e.preventDefault();panel.classList.remove('drag-over');void addFiles(e.dataTransfer.files,type);});
}
window.addEventListener('pagehide',()=>{if(user && isReady && cached(activeDate)?.dirty)cache(activeDate,snapshot(),true);revokeMedia();});
document.addEventListener('visibilitychange',()=>{if(document.hidden && user && isReady && cached(activeDate)?.dirty)localSave();});
$('journalDate').max='2099-12-31';$('journalDate').min='1900-01-01';
const backToTop=$('journalBackToTop');
function refreshBackToTop(){backToTop.classList.toggle('is-visible',window.scrollY>180);}
window.addEventListener('scroll',refreshBackToTop,{passive:true});
backToTop.addEventListener('click',()=>window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));
refreshBackToTop();

onAuthStateChanged(auth, async nextUser => {
  if (!nextUser || nextUser.isAnonymous || !nextUser.emailVerified) {
    clearTimeout(cloudTimer);
    user=null;isReady=false;entry=emptyEntry();
    $('journalText').readOnly=true;
    $('journalGate').innerHTML='🔒 Günlüğün yalnızca sana özel.<div><a href="./index.html">Ajandama dön ve giriş yap ♡</a></div>';
    $('journalGate').hidden=false;
    $('journalRoot').hidden=true;return;
  }
  user=nextUser;
  const avatarImg=$('journalAvatarImage');
  const avatarName=$('journalAvatarName');
  avatarName.textContent=(nextUser.displayName || nextUser.email?.split('@')[0] || 'Profilim').slice(0,22);
  void getDoc(doc(db,'raceProfiles',user.uid)).then(snap=>{
    if(!snap.exists())return;
    const profile=snap.data();
    const looks=['pink','denim','violet','black','mint','blonde','sky','navy'];
    const legacy={moss:'pink',charcoal:'black',amber:'denim',coral:'mint'};
    const key=legacy[profile.avatar]||profile.avatar;
    const idx=looks.indexOf(key);
    if(idx>=0)avatarImg.src=`./assets/avatars/girl-${String(idx+1).padStart(2,'0')}.webp`;
    if(typeof profile.displayName==='string')avatarName.textContent=profile.displayName.slice(0,22);
  }).catch(()=>{});
  $('journalGate').hidden=true;
  $('journalRoot').hidden=false;
  await loadDate(today());
},e=>{$('journalGate').textContent=`⚠ Günlük açılamadı: ${e.message}`;});
