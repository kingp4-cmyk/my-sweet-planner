'use strict';
/* My Sweet Ajanda v25 TEST — Supabase server-verified Firebase media backup.
 * Journal text stays in Firebase. Original local IndexedDB blobs are NEVER
 * removed by upload, retry, or migration. No client-side Supabase secret keys.
 */
const ENDPOINT = 'https://cjyjtdkamuktopkwpdie.supabase.co/functions/v1/journal-media-api';
const STORAGE_ORIGIN = 'https://cjyjtdkamuktopkwpdie.supabase.co';
const MAX_BYTES = 12 * 1024 * 1024;
const fileNames = /^[A-Za-z0-9_-]{8,75}\.(jpg|jpeg|png|webp|mp4|webm|mov|mp3|m4a|ogg|wav|aac)$/i;
const extensions = {
  'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp',
  'video/mp4':'mp4', 'video/webm':'webm', 'video/quicktime':'mov',
  'audio/mpeg':'mp3', 'audio/mp4':'m4a', 'audio/webm':'webm',
  'audio/ogg':'ogg', 'audio/wav':'wav', 'audio/x-wav':'wav',
  'audio/aac':'aac', 'audio/x-m4a':'m4a'
};
const typeFromMime = (mime, name) => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (mime?.startsWith('image/') || ['jpg','jpeg','png','webp'].includes(ext)) return 'image';
  if (mime?.startsWith('video/') || ['mp4','mov'].includes(ext)) return 'video';
  if (mime?.startsWith('audio/') || ['mp3','m4a','ogg','wav','aac'].includes(ext)) return 'audio';
  // Ambiguous .webm is listed as audio/video by the server. MIME resolves it.
  return ext === 'webm' ? 'video' : null;
};
const idOf = name => name.replace(/\.[^.]+$/, '');
const sameFile = (item, remote) => idOf(remote.file) === item.id;

export function createJournalMediaCloud({getUser,getActiveDate,getMedia,saveMedia,removeMedia,refreshMedia,status}) {
  const remoteDays = new Map();
  const refreshing = new Map();
  const requestedAgain = new Set();
  const inflight = new Set();
  const deleting = new Set();
  let migration = false;

  const userFor = uid => { const u=getUser();return u?.uid===uid && u.emailVerified ? u : null; };
  const dayKey = (uid,date) => `${uid}:${date}`;
  const report = (uid,date,message,kind='') => {
    if (!userFor(uid) || getActiveDate()!==date) return;
    status.textContent=message;
    status.dataset.kind=kind;
  };
  async function api(uid,date,action,other={}) {
    const u=userFor(uid);
    if (!u) throw Error('Hesap değişmiş veya oturum kapanmış.');
    // Refreshes token when needed. Token is never printed or stored by this feature.
    const jwt = await u.getIdToken();
    const response=await fetch(ENDPOINT,{method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${jwt}`},
      body:JSON.stringify({action,date,...other}),cache:'no-store'});
    const body=await response.json().catch(()=>({}));
    if (!response.ok || body.ok!==true) throw Error(body.error || `HTTP ${response.status}`);
    if (!userFor(uid)) throw Error('Hesap değişti.');
    return body;
  }
  async function remoteList(uid,date) {
    const result=await api(uid,date,'list');
    const files=(Array.isArray(result.files)?result.files:[])
      .filter(x=>x && typeof x.file==='string' && fileNames.test(x.file))
      .map(x=>({...x,type:typeFromMime(x.mime,x.file)})).filter(x=>x.type);
    remoteDays.set(dayKey(uid,date),files);
    return files;
  }
  function localStatus(date,item) {
    const u=getUser();
    const list=u && remoteDays.get(dayKey(u.uid,date));
    if (list?.some(remote=>sameFile(item,remote))) return '☁ Bulutta ✓';
    if (item.cloudUploaded) return '⚠ Bulut kopyası doğrulanamadı';
    return '⌛ Bulut bekleniyor';
  }
  const errorText = e => {
    const message=String(e?.message||'');
    if (message==='day_limit_reached')return 'Bu gün için bulut dosyası sınırına ulaşıldı.';
    if (message==='invalid_file')return 'Bu dosyanın türü veya boyutu bulut için uygun değil.';
    if (message==='Unauthorized')return 'Hesabının oturumu yenilenmeli.';
    if (message==='storage_unavailable'||message==='storage_list_failed')return 'Bulut depolamaya ulaşılamıyor.';
    if (message==='upload_ticket_failed')return 'Yükleme izni şu anda alınamıyor.';
    if (message==='delete_failed' || message==='delete_not_confirmed')return 'Buluttaki anın silindiği henüz doğrulanamadı.';
    if (message==='Failed to fetch' || !navigator.onLine)return 'İnternet bağlantısı şu anda kullanılamıyor.';
    return 'Buluta aktarma doğrulanamadı.';
  };
  async function upload(uid,date,item) {
    if (!userFor(uid) || !item?.blob || !Object.hasOwn(extensions,item.mime) ||
        !/^[A-Za-z0-9_-]{8,75}$/.test(item.id) || item.blob.size < 1 || item.blob.size > MAX_BYTES) {
      return false;
    }
    const key=`${uid}:${date}:${item.id}`;
    if (inflight.has(key) || deleting.has(key))return false;
    inflight.add(key);
    try {
      let files=remoteDays.get(dayKey(uid,date));
      if (!files)files=await remoteList(uid,date);
      if (files.some(remote=>sameFile(item,remote))) {
        if (!item.cloudUploaded)await saveMedia({...item,cloudUploaded:true});
        return true;
      }
      // Never re-upload a previously synced file that was subsequently deleted
      // from the server. This prevents another device from resurrecting it.
      if (item.cloudUploaded)return false;
      report(uid,date,`☁ ${item.name.slice(0,35)} buluta yükleniyor…`);
      const ticket=await api(uid,date,'upload-url',{
        id:item.id,mime:item.mime,size:item.blob.size
      });
      if (typeof ticket.uploadUrl!=='string' ||
          !ticket.uploadUrl.startsWith(`${STORAGE_ORIGIN}/storage/v1/`)) throw Error('unexpected_upload_url');
      const response=await fetch(ticket.uploadUrl,{method:'PUT',
        headers:{'Content-Type':item.mime,'x-upsert':'false'},body:item.blob});
      if (!response.ok) {
        // Signed URL may have uploaded successfully before its reply was lost.
        const check=await remoteList(uid,date).catch(()=>[]);
        if (!check.some(remote=>sameFile(item,remote)))throw Error(`upload_failed_${response.status}`);
      }
      const verified=await remoteList(uid,date);
      if (!verified.some(remote=>sameFile(item,remote)))throw Error('upload_not_verified');
      if (!userFor(uid))return false;
      await saveMedia({...item,cloudUploaded:true});
      report(uid,date,'☁ Anın buluta kaydedildi ve doğrulandı ✓','success');
      return true;
    } catch(e) {
      console.warn('[Journal] Cloud media upload pending:', e?.message || 'unknown');
      report(uid,date,`⚠ ${errorText(e)} Dosyanın cihazdaki kopyası korunuyor.`,'error');
      return false;
    } finally {inflight.delete(key);}
  }
  async function syncDate(uid,date,{afterList=false}={}) {
    if (!userFor(uid))return;
    const key=dayKey(uid,date);
    if (refreshing.has(key)) { requestedAgain.add(key); return refreshing.get(key); }
    const task=(async()=>{
      try {
        if (!navigator.onLine)throw Error('offline');
        if (!afterList || !remoteDays.has(key))await remoteList(uid,date);
        if (getActiveDate()===date)refreshMedia();
        const local=await getMedia(date);
        let pending=0;
        for (const item of local) {
          if (!userFor(uid))return;
          if (deleting.has(`${uid}:${date}:${item.id}`)) {pending++;continue;}
          if (remoteDays.get(key)?.some(remote=>sameFile(item,remote))) {
            if (!item.cloudUploaded)await saveMedia({...item,cloudUploaded:true});
            continue;
          }
          if (item.cloudUploaded) {
            // A successful remote list is authoritative for already-synced
            // media. If another device deleted it, remove the stale local
            // copy so that it does not reappear here or get re-uploaded.
            await removeMedia(item.id);
            continue;
          }
          if (!Object.hasOwn(extensions,item.mime) || item.blob?.size > MAX_BYTES) {pending++;continue;}
          const ok=await upload(uid,date,item);
          if (!ok)pending++;
        }
        if(getActiveDate()===date) {
          report(uid,date,pending
            ? `⚠ ${pending} anı henüz bulutta değil; cihazda korunuyor. İnternet gelince yeniden denenecek.`
            : '☁ Bu günün medya kayıtları bulutla eşitlendi ✓',pending?'error':'success');
          refreshMedia();
        }
      }catch(e){
        console.warn('[Journal] Cloud media list unavailable:',e?.message||'unknown');
        report(uid,date,`⚠ ${errorText(e)} Cihazdaki anıların korunuyor.`,'error');
      }
    })();
    refreshing.set(key,task);
    try{await task;} finally{
      refreshing.delete(key);
      if(requestedAgain.delete(key) && userFor(uid)) void syncDate(uid,date);
    }
  }
  function syncCurrentDay(){const u=getUser(); if(u)void syncDate(u.uid,getActiveDate());}
  async function loadDay(date) {
    const u=getUser();if(!u)return;
    const uid=u.uid;
    report(uid,date,'☁ Buluttaki anılar kontrol ediliyor…');
    await syncDate(uid,date);
  }
  // Cloud-only files can be displayed on another phone/browser without exporting ZIPs.
  function showRemote(date,token,localIds,visibleToken,containers) {
    const u=getUser();if(!u)return;
    const uid=u.uid;
    const files=remoteDays.get(dayKey(uid,date))||[];
    for(const file of files){
      const id=idOf(file.file);
      if(localIds.has(id))continue;
      const panel=containers[file.type];
      if(!panel)continue;
      const wrap=document.createElement('div');wrap.className='memory-item memory-cloud-only';
      const foot=document.createElement('div');foot.className='memory-item-footer';
      const label=document.createElement('span');label.textContent=`☁ Bulutta · ${file.type==='image'?'Fotoğraf':file.type==='video'?'Video':'Ses kaydı'}`;
      const open=document.createElement('button');open.type='button';open.className='memory-cloud-open';
      open.textContent=file.type==='image'?'☁ Fotoğrafı aç':`☁ ${file.type==='video'?'Videoyu':'Sesi'} aç`;
      const media=document.createElement(file.type==='image'?'img':file.type==='video'?'video':'audio');
      media.hidden=true;if(file.type==='image'){media.alt='Günlüğün buluttaki fotoğrafı';media.decoding='async';}
      else{media.controls=true;media.preload='none';}
      let requested=false;
      const show=async()=>{
        if(requested)return;requested=true;open.disabled=true;
        try {
          const answer=await api(uid,date,'read-url',{file:file.file});
          if(typeof answer.url!=='string'||!answer.url.startsWith(`${STORAGE_ORIGIN}/storage/v1/`))throw Error('unexpected_url');
          if(getActiveDate()!==date || !userFor(uid) || visibleToken()!==token)return;
          media.src=answer.url;media.hidden=false;open.hidden=true;
          if(file.type!=='image')media.load();
        }catch(e){requested=false;open.disabled=false;report(uid,date,`⚠ Buluttaki anı açılamadı: ${errorText(e)}`,'error');}
      };
      open.addEventListener('click',()=>void show());
      const del=document.createElement('button');
      del.type='button';del.className='memory-remove';del.textContent='×';
      del.title='Bu anıyı her yerden sil';
      del.setAttribute('aria-label','Bu anıyı her yerden sil');
      del.addEventListener('click',async()=>{
        if(!confirm('Bu anı buluttan ve hesabından kalıcı olarak silinsin mi?'))return;
        del.disabled=true;del.textContent='…';
        const ok=await deleteRemoteFile(date,file.file);
        if(!ok){del.disabled=false;del.textContent='×';}
      });
      foot.append(label,open);wrap.append(media,foot,del);panel.append(wrap);
      // Photos become visible automatically when scrolled near, no heavy
      // full-day bulk download. Videos/audio load only when tapped.
      if(file.type==='image'){
        if('IntersectionObserver' in window){
          const obs=new IntersectionObserver(entries=>{
            if(entries.some(e=>e.isIntersecting)){obs.disconnect();void show();}
          },{rootMargin:'160px'});obs.observe(wrap);
        } else {void show();}
      }
    }
  }
  async function deleteMedia(date,item) {
    const u=getUser();
    if (!u || !item || getActiveDate()!==date) throw Error('invalid_session');
    const uid=u.uid;
    const id=item.id;
    const key=`${uid}:${date}:${id}`;
    if (inflight.has(key) || deleting.has(key)) throw Error('upload_in_progress');
    deleting.add(key);
    try {
      // Always ask the server: a cached list may be stale after an upload.
      const files=await remoteList(uid,date);
      const cloud=files.find(file => idOf(file.file)===id);
      if (cloud) {
        const result=await api(uid,date,'delete',{file:cloud.file});
        if (result.deleted!==true) throw Error('delete_not_confirmed');
        await remoteList(uid,date);
        if (remoteDays.get(dayKey(uid,date)).some(file=>file.file===cloud.file)) throw Error('delete_not_confirmed');
      }
      if (!userFor(uid)) throw Error('invalid_session');
      // Cloud has been checked and, if needed, successfully deleted first.
      await removeMedia(id);
      report(uid,date,'♡ Anın her yerden silindi ✓','success');
      refreshMedia();
      return true;
    } catch(e) {
      const msg = String(e?.message||'');
      report(uid,date,msg==='upload_in_progress'
        ? '⌛ Yükleme bitince silmeyi tekrar dene.'
        : '⚠ Anı silinemedi. Lütfen internetini kontrol edip tekrar dene.','error');
      console.warn('[Journal] Media deletion failed:',msg);
      return false;
    } finally {deleting.delete(key);}
  }
  async function deleteRemoteFile(date,file) {
    const u=getUser();
    if(!u || getActiveDate()!==date) return false;
    const uid=u.uid;
    const id=idOf(file);
    const key=`${uid}:${date}:${id}`;
    if(inflight.has(key)||deleting.has(key))return false;
    deleting.add(key);
    try {
      const result=await api(uid,date,'delete',{file});
      if (result.deleted!==true) throw Error('delete_not_confirmed');
      await remoteList(uid,date);
      if(remoteDays.get(dayKey(uid,date)).some(f=>f.file===file))throw Error('delete_not_confirmed');
      // Also clean a formerly synced local cache if one exists.
      const items=await getMedia(date);
      if(items.some(i=>i.id===id)) await removeMedia(id);
      report(uid,date,'♡ Anın her yerden silindi ✓','success');
      refreshMedia();
      return true;
    }catch(e){
      console.warn('[Journal] Remote media deletion failed:',e?.message||'unknown');
      report(uid,date,'⚠ Anı buluttan silinemedi. Lütfen tekrar dene.','error');
      return false;
    }finally{deleting.delete(key);}
  }
  async function migrateOld(getAllLocal) {
    const u=getUser();if(!u || migration)return;
    const uid=u.uid;
    let items;
    try{items=(await getAllLocal()).filter(x=>x.userDay?.startsWith(uid+':') && !x.cloudUploaded);}
    catch{status.textContent='⚠ Bu cihazdaki eski anılar okunamadı.';return;}
    const dates=[...new Set(items.map(x=>x.userDay.slice(uid.length+1)))].filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x));
    if(!dates.length){status.textContent='♡ Bekleyen eski anı bulunmuyor.';return;}
    if(!confirm(`${items.length} eski medya dosyası ${dates.length} güne dağılmış. Bunlar özel bulut hesabına yüklenecek; cihaz kopyaları korunacak. Devam edilsin mi?`))return;
    migration=true;
    const button=document.getElementById('journalMigrateMedia');if(button)button.disabled=true;
    for(let i=0;i<dates.length;i++){
      if(!userFor(uid))break;
      status.textContent=`☁ Eski anılar aktarılıyor: ${i+1} / ${dates.length} gün`;
      await syncDate(uid,dates[i]);
    }
    migration=false;if(button)button.disabled=false;
    if(userFor(uid)){status.textContent='☁ Eski anıların aktarımı denendi. Bulut bekleyen dosyalar için internet bağlantını kontrol et.';void syncDate(uid,getActiveDate());}
  }
  window.addEventListener('online',()=>syncCurrentDay());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncCurrentDay();});
  return {localStatus,loadDay,syncCurrentDay,showRemote,migrateOld,deleteMedia,clear(){remoteDays.clear();}};
}
