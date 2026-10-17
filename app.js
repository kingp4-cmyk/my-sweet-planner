
import {
  initializeApp,
  getApps,
  getApp
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  reload,
  EmailAuthProvider,
  linkWithCredential
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const $ = id => document.getElementById(id);

const KEY = 'my-sweet-daily-planner-2026-v1';
const OWNER = 'msp-v6-last-planner-owner';
const CACHE = uid => `msp-v6-planner-cache-${uid}`;
const MAX_BYTES = 700000;

const IS_RACE = document.body.dataset.clubPage === 'race';
const FIREBASE_CONFIG = window.MSP_FIREBASE_CONFIG;

const messages = {
  'auth/invalid-credential': 'E-posta veya şifre hatalı.',
  'auth/email-already-in-use': 'Bu e-posta zaten kayıtlı. Giriş yapmayı dene.',
  'auth/weak-password': 'Daha güçlü bir şifre seç (en az 6 karakter).',
  'auth/invalid-email': 'E-posta adresini kontrol et.',
  'auth/too-many-requests': 'Çok fazla deneme yapıldı. Biraz sonra tekrar dene.',
  'auth/network-request-failed': 'İnternet bağlantını kontrol et.',
  'auth/operation-not-allowed': 'Firebase Authentication içinde E-posta/Şifre yöntemini aç.',
  'auth/unauthorized-domain': 'Firebase Authentication → Settings → Authorized domains bölümüne alan adını ekle.'
};

let auth;
let db;
let currentUser;
let started = false;
let syncTimer;
let lastSeen = '';
let pendingWrite = false;
let writing = false;
let lastUploaded = '';

function msg(text, kind = '') {
  const el = $('accountMessage');

  if (el) {
    el.textContent = text;
    el.dataset.kind = kind;
  }
}

function cloudStatus(text) {
  const el = $('cloudStatus');

  if (el) {
    el.textContent = text;
  }
}

function show(view) {
  $('accountGate').hidden = false;
  $('siteRoot').hidden = true;
  $('accountBootPanel').hidden = view !== 'boot';
  $('accountFormPanel').hidden = view !== 'form';
  $('verifyPanel').hidden = view !== 'verify';
  msg('');
}

function parseCache(uid) {
  try {
    return JSON.parse(localStorage.getItem(CACHE(uid)));
  } catch {
    return null;
  }
}

function putCache(uid, payload, dirty) {
  try {
    localStorage.setItem(
      CACHE(uid),
      JSON.stringify({ payload, dirty })
    );
  } catch {
    cloudStatus('⚠ Tarayıcı deposu dolu. Yedek al.');
  }
}

function emptyPlanner() {
  const today = new Date();

  return JSON.stringify({
    version: 1,
    year: today.getFullYear(),
    activeMonth: today.getMonth() + 1,
    days: {},
    stickers: {},
    colors: {}
  });
}

function validPlanner(payload) {
  try {
    const state = JSON.parse(payload);

    return (
      state &&
      state.version === 1 &&
      state.days &&
      typeof state.days === 'object'
    );
  } catch {
    return false;
  }
}

function cacheBeforeLeaving() {
  if (!currentUser || !started || IS_RACE) {
    return;
  }

  const payload = localStorage.getItem(KEY);

  if (payload && payload !== lastUploaded) {
    putCache(currentUser.uid, payload, true);
  }
}

async function push() {
  if (IS_RACE || !started || !currentUser || writing) {
    if (writing) {
      pendingWrite = true;
    }
    return;
  }

  const payload = localStorage.getItem(KEY) || '';

  if (!validPlanner(payload)) {
    return;
  }

  if (payload === lastUploaded) {
    return;
  }

  if (new Blob([payload]).size > MAX_BYTES) {
    cloudStatus(
      '⚠ Ajanda 700 KB sınırını geçti; buluta kaydedilemedi. Sticker sayısını azalt.'
    );
    return;
  }

  writing = true;
  let uploadedSuccessfully = false;
  cloudStatus('☁ Buluta kaydediliyor…');

  try {
    await setDoc(
      doc(db, 'plannerUsers', currentUser.uid, 'data', 'main'),
      {
        payload,
        schemaVersion: 1,
        updatedAt: serverTimestamp()
      }
    );

    lastUploaded = payload;
    uploadedSuccessfully = true;

    const latest = localStorage.getItem(KEY);

    putCache(
      currentUser.uid,
      latest || payload,
      latest !== payload
    );

    cloudStatus(
      latest === payload
        ? '☁ Buluta kaydedildi ✓'
        : '☁ Değişiklikler aktarılıyor…'
    );
  } catch (error) {
    putCache(
      currentUser.uid,
      localStorage.getItem(KEY) || payload,
      true
    );

    cloudStatus(
      `⚠ Bulut kaydı başarısız (${error.code || 'bağlantı'}). Yerel yedek saklandı.`
    );
  } finally {
    writing = false;

    if (
      (uploadedSuccessfully && pendingWrite) ||
      (uploadedSuccessfully && (localStorage.getItem(KEY) || '') !== lastUploaded)
    ) {
      pendingWrite = false;
      clearTimeout(syncTimer);

      syncTimer = setTimeout(push, 1600);
    }
  }
}

function detectPlannerChange() {
  if (!started || IS_RACE || !currentUser) {
    return;
  }

  const payload = localStorage.getItem(KEY) || '';

  if (
    !payload ||
    payload === lastSeen ||
    !validPlanner(payload)
  ) {
    return;
  }

  lastSeen = payload;

  putCache(
    currentUser.uid,
    payload,
    payload !== lastUploaded
  );

  clearTimeout(syncTimer);
  syncTimer = setTimeout(push, 1400);
}

async function hydratePlanner(user) {
  const cached = parseCache(user.uid);
  let remote;

  try {
    const snap = await getDoc(
      doc(db, 'plannerUsers', user.uid, 'data', 'main')
    );

    if (snap.exists()) {
      remote = snap.data().payload;
    }
  } catch (err) {
    throw new Error(
      'Bulut ajandasına erişilemedi. Mevcut verileri korumak için işlem durduruldu. ' +
      'İnternet bağlantını ve Firestore kurallarını kontrol edip sayfayı yenile.'
    );
  }

  if (remote && !validPlanner(remote)) {
    throw new Error(
      'Buluttaki ajanda verisi okunamadı. Eski veriyi korumak için işlem durduruldu.'
    );
  }

  const owner = localStorage.getItem(OWNER);
  const legacy = localStorage.getItem(KEY);

  let payload;

  if (cached?.dirty && validPlanner(cached.payload)) {
    payload = cached.payload;
  } else if (remote) {
    payload = remote;
  } else if (
    cached?.payload &&
    validPlanner(cached.payload)
  ) {
    payload = cached.payload;
  } else if (!owner && validPlanner(legacy)) {
    payload = legacy;
  } else {
    payload = emptyPlanner();
  }

  localStorage.setItem(KEY, payload);
  localStorage.setItem(OWNER, user.uid);

  const dirty = payload !== remote;

  putCache(user.uid, payload, dirty);

  lastUploaded = remote || '';
  lastSeen = payload;

  return dirty;
}

async function prepareRaceHours(user) {
  try {
    const snap = await getDoc(
      doc(db, 'plannerUsers', user.uid, 'data', 'main')
    );
    const remote = snap.exists() ? snap.data().payload : null;

    if (remote && !validPlanner(remote)) {
      throw new Error('Ajanda verisi okunamadı.');
    }

    const cache = parseCache(user.uid);
    const owner = localStorage.getItem(OWNER);
    const local = owner === user.uid ? localStorage.getItem(KEY) : null;

    const payload = cache?.dirty && validPlanner(cache.payload)
      ? cache.payload
      : remote || (validPlanner(local) ? local : null) ||
        (validPlanner(cache?.payload) ? cache.payload : null);

    if (payload && validPlanner(payload)) {
      localStorage.setItem(KEY, payload);
      localStorage.setItem(OWNER, user.uid);
    } else {
      localStorage.removeItem(KEY);
    }
    return true;
  } catch (error) {
    cloudStatus('⚠ Çalışma saati alınamadı; hatalı sıfır kaydı yapılmayacak.');
    console.warn('[My Sweet Ajanda] Race hours could not be loaded', error);
    return false;
  }
}

async function loadLegacyPlannerScript() {
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');

    s.src = './script.js?v=28';
    s.onload = resolve;

    s.onerror = () => {
      reject(new Error('script.js yüklenemedi.'));
    };

    document.body.append(s);
  });
}

async function start(user) {
  if (started) return;
  started = true;
  currentUser = user;

  try {
    const hoursReady = IS_RACE ? prepareRaceHours(user) : Promise.resolve(true);
    const needsUpload = IS_RACE ? false : await hydratePlanner(user);

    window.MSP = { user, auth, db, logout, hoursReady };

    if (!IS_RACE) {
      await loadLegacyPlannerScript();
    }

    $('accountGate').hidden = true;
    $('siteRoot').hidden = false;

    $('logoutBtn')?.addEventListener('click', logout);

    import('./club.js?v=28').catch(error => {
      console.error('[My Sweet Ajanda] Yarış yüklenemedi:', error);
      cloudStatus('⚠ Yarış bileşeni yüklenemedi. Sayfayı yenile.');
    });

    if (!IS_RACE) {
      window.addEventListener('msp:planner-saved', detectPlannerChange);
      window.addEventListener('pagehide', cacheBeforeLeaving);

      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          detectPlannerChange();
          void push();
        }
      });

      if (needsUpload) {
        void push();
      } else {
        cloudStatus('☁ Bulut eşitleme açık');
      }
    } else {
      cloudStatus('☁ Yarışa bağlanılıyor…');
    }
  } catch (error) {
    started = false;
    show('form');
    msg(
      error.code === 'permission-denied'
        ? 'Firestore erişimi reddedildi. E-postan doğrulanmış mı? Firestore Database → Rules bölümünde kuralları yayımla.'
        : error.message,
      'error'
    );
  }
}

async function logout() {
  cacheBeforeLeaving();

  clearTimeout(syncTimer);

  try {
    await signOut(auth);
  } finally {
    localStorage.removeItem(KEY);
    location.reload();
  }
}

async function route(user, refreshVerification = false) {
  if (!user || user.isAnonymous) {
    show('form');
    return;
  }

  if (!user.emailVerified || refreshVerification) {
    await reload(user);
    if (user.emailVerified) {
      await user.getIdToken(true);
    }
  }

  if (!user.emailVerified) {
    $('verifyEmail').textContent = user.email || '';
    show('verify');
    return;
  }

  await start(user);
}

async function submitAccount(event) {
  event.preventDefault();

  const email = $('accountEmail').value.trim();
  const password = $('accountPassword').value;
  const mode = $('accountMode').value;
  const btn = $('accountSubmit');

  btn.disabled = true;
  msg('İşlem yapılıyor…');

  try {
    if (mode === 'signup') {
      let credential;

      if (auth.currentUser?.isAnonymous) {
        credential = await linkWithCredential(
          auth.currentUser,
          EmailAuthProvider.credential(email, password)
        );
      } else {
        credential = await createUserWithEmailAndPassword(
          auth, email, password
        );
      }

      await sendEmailVerification(credential.user);
      await route(credential.user);

      msg(
        'Doğrulama bağlantısı e-postana gönderildi. Gelen kutunu ve spam klasörünü kontrol et.',
        'success'
      );
    } else {
      const credential = await signInWithEmailAndPassword(
        auth, email, password
      );

      await route(credential.user);
    }
  } catch (error) {
    msg(
      messages[error.code] ||
      `${error.code || 'Hata'}: ${error.message}`,
      'error'
    );
  } finally {
    btn.disabled = false;
  }
}

if (
  !FIREBASE_CONFIG?.apiKey ||
  !FIREBASE_CONFIG?.projectId
) {
  show('form');
  msg(
    'firebase-config.js dosyasındaki Firebase ayarlarını kontrol et.',
    'error'
  );
} else {
  const app = getApps().length
    ? getApp()
    : initializeApp(FIREBASE_CONFIG);

  auth = getAuth(app);
  db = getFirestore(app);

  $('accountForm').addEventListener(
    'submit',
    submitAccount
  );

  $('accountMode').addEventListener(
    'change',
    event => {
      $('accountSubmit').textContent =
        event.target.value === 'signup'
          ? 'Kayıt ol ♡'
          : 'Giriş yap ♡';
    }
  );

  $('resetPassword').addEventListener(
    'click',
    async () => {
      const email = $('accountEmail').value.trim();

      if (!email) {
        return msg('Önce e-posta adresini yaz.', 'error');
      }

      try {
        await sendPasswordResetEmail(auth, email);

        msg(
          'Şifre sıfırlama e-postası gönderildiyse gelen kutuna ulaşacaktır.',
          'success'
        );
      } catch (err) {
        msg(messages[err.code] || err.message, 'error');
      }
    }
  );

  $('checkVerified').addEventListener(
    'click',
    async () => {
      try {
        msg('E-posta kontrol ediliyor…');

        await route(auth.currentUser, true);

        if (!auth.currentUser?.emailVerified) {
          msg(
            'Henüz doğrulanmamış. E-postandaki bağlantıyı açıp yeniden dene.'
          );
        }
      } catch (err) {
        msg(err.message, 'error');
      }
    }
  );

  $('resendVerification').addEventListener(
    'click',
    async () => {
      try {
        await sendEmailVerification(auth.currentUser);

        msg(
          'Doğrulama e-postası tekrar gönderildi.',
          'success'
        );
      } catch (err) {
        msg(messages[err.code] || err.message, 'error');
      }
    }
  );

  $('switchAccount').addEventListener(
    'click',
    async () => {
      if (
        auth.currentUser?.isAnonymous &&
        !confirm(
          'Eski anonim yarış hesabından çıkarsan eski yarış kimliğin korunmayabilir. Devam edilsin mi?'
        )
      ) {
        return;
      }

      await signOut(auth);
      show('form');
    }
  );

  $('verifySignOut').addEventListener(
    'click',
    async () => {
      await signOut(auth);
      show('form');
    }
  );

  auth.authStateReady()
    .then(() => route(auth.currentUser))
    .catch(err => {
      show('form');
      msg(
        `Firebase bağlantısı başarısız: ${err.message}`,
        'error'
      );
    });
}
