
'use strict';

/* My Sweet Planner - Koşu Kulübü */

const IS_RACE = document.body.dataset.clubPage === 'race';

const PLANNER_KEY = 'my-sweet-daily-planner-2026-v1';
const ROOM_KEY = 'msp-club-room-id-v1';

const AVATARS = [
  { id: 'pink', label: 'Pink girl', gender: 'female' },
  { id: 'denim', label: 'Denim girl', gender: 'female' },
  { id: 'violet', label: 'Purple girl', gender: 'female' },
  { id: 'black', label: 'Cool girl', gender: 'female' },
  { id: 'mint', label: 'Mint girl', gender: 'female' },
  { id: 'blonde', label: 'Blonde girl', gender: 'female' },
  { id: 'sky', label: 'Sky boy', gender: 'male' },
  { id: 'navy', label: 'Navy boy', gender: 'male' },
  { id: 'moss', label: 'Green boy', gender: 'male' },
  { id: 'charcoal', label: 'Cool boy', gender: 'male' },
  { id: 'amber', label: 'Blonde boy', gender: 'male' },
  { id: 'coral', label: 'Coral boy', gender: 'male' }
];

const LOOKS = new Map(AVATARS.map(a => [a.id, a]));
const $ = id => document.getElementById(id);

const TODAY = new Date();
const MONTH = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}`;

const fmt = n =>
  Number(n || 0).toLocaleString('tr-TR', {
    maximumFractionDigits: 2
  });

const escapeHTML = s =>
  String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

const randomRoom = () =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(16)),
    b => b.toString(16).padStart(2, '0')
  ).join('');

/* Eski odayı hatırla */

const queryRoom = new URLSearchParams(location.search).get('room');

const validRoom = s =>
  typeof s === 'string' && /^[a-zA-Z0-9_-]{16,64}$/.test(s);

const roomId = validRoom(queryRoom)
  ? queryRoom
  : (
      validRoom(localStorage.getItem(ROOM_KEY))
        ? localStorage.getItem(ROOM_KEY)
        : randomRoom()
    );

localStorage.setItem(ROOM_KEY, roomId);

if (IS_RACE && !validRoom(queryRoom)) {
  const u = new URL(location.href);
  u.searchParams.set('room', roomId);
  history.replaceState(null, '', u.href);
}

if (!IS_RACE && $('clubRaceLink')) {
  $('clubRaceLink').href =
    `./race.html?room=${encodeURIComponent(roomId)}`;
}

/* Uygulama durumu */

let fs;
let db;
let auth;
let uid;

let profile = null;
let members = [];

let unsubMembers = null;
let unsubMessages = null;

let lastMembersRender = '';
let lastMemberWrite = '';

let writeInFlight = false;
let pendingSync = false;
let syncTimer = null;

let dialogIsFirst = false;
let chosenAvatar = 'pink';
let statusMessage = '';

function monthTitle() {
  return TODAY.toLocaleDateString('tr-TR', {
    month: 'long',
    year: 'numeric'
  });
}

/* Mevcut ajandadaki çalışma saatlerini okur */

function plannerHours() {
  try {
    const state = JSON.parse(localStorage.getItem(PLANNER_KEY));

    if (!state || !state.days) return 0;

    let total = 0;

    for (const [dayKey, data] of Object.entries(state.days)) {
      if (!dayKey.startsWith(MONTH + '-')) continue;

      for (const task of data?.tasks || []) {
        const value = Number(task?.worked || 0);

        if (Number.isFinite(value) && value > 0) {
          total += Math.min(24, value);
        }
      }
    }

    return Math.min(744, Math.round(total * 100) / 100);
  } catch {
    return 0;
  }
}

/* CSS ile çizilen karakter */

function person(look) {
  const avatar = LOOKS.get(look) || LOOKS.get('pink');

  return `
    <div class="club-person ${avatar.gender}"
         data-look="${avatar.id}" aria-hidden="true">
      <i class="hair"></i>
      <i class="head"></i>
      <i class="eyes">••</i>
      <i class="body"></i>
      <i class="arm left"></i>
      <i class="arm right"></i>
      <i class="leg left"></i>
      <i class="leg right"></i>
    </div>
  `;
}

function notice(message) {
  statusMessage = message;

  if ($('clubStatus')) {
    $('clubStatus').textContent = message;
  }

  if ($('clubInlineStatus')) {
    $('clubInlineStatus').textContent = message;
  }

  if (message.startsWith('⚠')) {
    console.warn('[Koşu Kulübü]', message);
  }
}

/* En çok çalışandan en az çalışana sıralama */

function sortedMembers() {
  return [...members].sort((a, b) =>
    Number(b.totalHours || 0) - Number(a.totalHours || 0)
    || String(a.displayName).localeCompare(
      String(b.displayName),
      'tr'
    )
  );
}

/* Tüm yarışçılar tek yol üzerinde gösterilir */

function renderRoad() {
  const mount = $('clubMount');

  if (!mount || !profile) return;

  if (mount.hidden) {
    mount.hidden = false;
  }

  const list = sortedMembers();

  const signature = JSON.stringify(
    list.map(x => [
      x.uid,
      x.displayName,
      x.avatar,
      x.totalHours
    ])
  );

  if (signature === lastMembersRender) {
    return;
  }

  lastMembersRender = signature;

  const width = Math.max(620, list.length * 100);

  const runners = list.map((m, i) => {
    const x = list.length === 1
      ? 83
      : 16 + 67 * (list.length - 1 - i) / (list.length - 1);

    const y = IS_RACE
      ? 42 + (i % 3) * 19
      : 22 + (i % 3) * 19;

    const mine = m.uid === uid;

    return `
      <div class="club-runner ${mine ? 'mine' : ''}"
           style="--x:${x}%;--y:${y}px"
           title="${escapeHTML(m.displayName)} · ${fmt(m.totalHours)} saat">

        <span class="club-runner-name">
          ${mine ? '★ ' : ''}${escapeHTML(m.displayName)}
        </span>

        ${person(m.avatar)}

        <span class="club-runner-hours">
          ${fmt(m.totalHours)} sa
        </span>
      </div>
    `;
  }).join('');

  const road = `
    <div class="club-road-scroller">
      <div class="club-road" style="width:${width}px">
        <div class="club-road-surface"></div>
        <span class="club-start">START</span>
        <span class="club-finish">🏁</span>
        ${runners}
      </div>
    </div>
  `;

  if (IS_RACE) {
    mount.innerHTML = list.length
      ? road
      : '<div class="club-empty">Henüz yarışçı yok. İlk sırayı sen al! ♡</div>';
  } else {
    mount.innerHTML = `
      <section class="club-card">
        <div class="club-section-heading">
          <h2>🏁 Koşu · ${escapeHTML(monthTitle())}</h2>
          <span class="club-subtle">Tek yol, birlikte ilerle ♡</span>
        </div>

        ${list.length
          ? road
          : '<div class="club-empty">İlk yarışçı bekleniyor…</div>'}

        <div class="club-road-bottom">
          <span id="clubInlineStatus">
            ${escapeHTML(statusMessage)}
          </span>

          <a href="./race.html?room=${encodeURIComponent(roomId)}"
             class="club-btn club-btn-soft"
             style="text-decoration:none">
            Yarışa git →
          </a>
        </div>
      </section>
    `;
  }

  if ($('clubRanking')) {
    $('clubRanking').innerHTML = list.length
      ? list.map((m, i) => `
          <li>
            <b>
              ${i === 0 ? '👑 ' : `${i + 1}. `}
              ${escapeHTML(m.displayName)}
              ${m.uid === uid ? ' (Sen)' : ''}
            </b>
            <small>${fmt(m.totalHours)} saat</small>
          </li>
        `).join('')
      : '<li>Henüz yarışçı yok.</li>';
  }

  if ($('clubMyHours')) {
    $('clubMyHours').textContent =
      `Ajandandaki bu ayın çalışma süresi: ${fmt(plannerHours())} saat`;
  }
}

/* Sağ üstteki profil butonu */

function profileButton() {
  let btn = $('clubProfileOpen');

  if (!btn && !IS_RACE) {
    const actions = document.querySelector('.top-actions');

    if (!actions) return;

    btn = document.createElement('button');

    btn.type = 'button';
    btn.id = 'clubProfileOpen';
    btn.className = 'club-profile-button';

    actions.appendChild(btn);
  }

  if (btn) {
    btn.hidden = !profile;

    if (profile) {
      btn.textContent = `👤 ${profile.displayName}`;
    }

    if (!btn.dataset.bound) {
      btn.dataset.bound = 'yes';

      btn.addEventListener('click', () => {
        openProfileDialog(false);
      });
    }
  }
}

/* Kayıt ve profil düzenleme */

function closeDialog() {
  $('clubDialogBackdrop')?.remove();
  document.body.style.removeProperty('overflow');
}

function openProfileDialog(firstTime) {
  closeDialog();

  dialogIsFirst = firstTime;

  chosenAvatar = LOOKS.has(profile?.avatar)
    ? profile.avatar
    : 'pink';

  const root = document.createElement('div');

  root.className = 'club-dialog-backdrop';
  root.id = 'clubDialogBackdrop';

  root.innerHTML = `
    <div class="club-dialog"
         role="dialog"
         aria-modal="true"
         aria-labelledby="clubDialogTitle">

      <h2 id="clubDialogTitle">
        ${firstTime
          ? '🎀 My Sweet Planner’a hoş geldin!'
          : '💖 Profilimi düzenle'}
      </h2>

      <p>
        ${firstTime
          ? 'Ajandaya başlamadan önce ismini ve avatarını seç. Bu kayıt için şifre gerekmiyor.'
          : 'Adını veya avatarını değiştirebilirsin.'}
      </p>

      <form id="clubProfileForm">
        <label for="clubDisplayName">Görünen adın</label>

        <input
          id="clubDisplayName"
          type="text"
          maxlength="24"
          minlength="1"
          autocomplete="nickname"
          placeholder="Örnek: Pelin"
          required
          value="${escapeHTML(profile?.displayName || '')}"
        >

        <p style="margin:12px 0 4px;font-weight:800">
          Avatarını seç
        </p>

        <div class="club-avatar-grid" id="clubAvatarGrid">
          ${AVATARS.map(a => `
            <button
              type="button"
              class="club-avatar-choice"
              data-avatar="${a.id}"
              aria-pressed="${a.id === chosenAvatar}">
              ${person(a.id)}
              <small>${escapeHTML(a.label)}</small>
            </button>
          `).join('')}
        </div>

        <p style="font-size:12px">
          Yarışta yalnızca adın, avatarın ve çalışma saatin görünür.
          Ajanda notların paylaşılmaz.
        </p>

        <div class="club-dialog-footer">
          ${!firstTime
            ? '<button type="button" id="clubCancelProfile" class="club-btn club-btn-soft">Vazgeç</button>'
            : ''}

          <button type="submit"
                  class="club-btn"
                  id="clubSaveProfile">
            ${firstTime ? 'Kayıt ol ve başla' : 'Kaydet'}
          </button>
        </div>

        <div id="clubProfileError"
             class="club-dialog-error"
             role="alert"></div>
      </form>
    </div>
  `;

  document.body.appendChild(root);
  document.body.style.overflow = 'hidden';

  root.querySelector('#clubAvatarGrid').addEventListener(
    'click',
    e => {
      const button = e.target.closest('[data-avatar]');

      if (!button) return;

      chosenAvatar = button.dataset.avatar;

      root.querySelectorAll('[data-avatar]').forEach(b => {
        b.setAttribute(
          'aria-pressed',
          String(b === button)
        );
      });
    }
  );

  root.querySelector('#clubCancelProfile')
    ?.addEventListener('click', closeDialog);

  root.querySelector('#clubProfileForm')
    .addEventListener('submit', saveProfile);

  root.querySelector('#clubDisplayName').focus();
}

async function saveProfile(event) {
  event.preventDefault();

  const name = $('clubDisplayName')
    .value.trim()
    .replace(/\s+/g, ' ')
    .slice(0, 24);

  const errorEl = $('clubProfileError');

  if (!name) {
    errorEl.textContent = 'Lütfen adını yaz.';
    return;
  }

  if (!db || !uid) {
    errorEl.textContent = 'Firebase henüz bağlanmadı.';
    return;
  }

  const button = $('clubSaveProfile');

  button.disabled = true;

  try {
    const candidate = {
      uid,
      displayName: name,
      avatar: chosenAvatar,
      updatedAt: fs.serverTimestamp()
    };

    await fs.setDoc(
      fs.doc(db, 'raceProfiles', uid),
      candidate
    );

    profile = {
      uid,
      displayName: name,
      avatar: chosenAvatar
    };

    closeDialog();
    profileButton();
    startListening();

    lastMemberWrite = '';

    await syncHours(true);

    notice('🟢 Çevrimiçi · Yarış odan kaydedildi.');
  } catch (err) {
    errorEl.textContent =
      `Kayıt yapılamadı: ${err.message}`;

    button.disabled = false;
  }
}

/* Saatleri Firebase'e kaydet */

function myMemberRef() {
  return fs.doc(
    db,
    'raceRooms',
    roomId,
    'months',
    MONTH,
    'members',
    uid
  );
}

async function syncHours(force = false) {
  if (!profile || !fs || !uid) return;

  const totalHours = plannerHours();

  const signature =
    `${profile.displayName}|${profile.avatar}|${totalHours}`;

  if (!force && signature === lastMemberWrite) {
    return;
  }

  if (writeInFlight) {
    pendingSync = true;
    return;
  }

  writeInFlight = true;
  lastMemberWrite = signature;

  try {
    await fs.setDoc(myMemberRef(), {
      uid,
      displayName: profile.displayName,
      avatar: profile.avatar,
      totalHours,
      updatedAt: fs.serverTimestamp()
    });

    if ($('clubMyHours')) {
      $('clubMyHours').textContent =
        `Ajandandaki bu ayın çalışma süresi: ${fmt(totalHours)} saat`;
    }
  } catch (err) {
    lastMemberWrite = '';

    notice(`⚠ Saatler kaydedilemedi: ${err.message}`);
  } finally {
    writeInFlight = false;

    if (pendingSync) {
      pendingSync = false;
      void syncHours();
    }
  }
}

function scheduleSync() {
  if (!profile) return;

  clearTimeout(syncTimer);

  syncTimer = setTimeout(() => {
    void syncHours();
  }, 1200);
}

/* Gerçek zamanlı yarışçı listesi */

function startListening() {
  if (!profile || unsubMembers) return;

  unsubMembers = fs.onSnapshot(
    fs.collection(
      db,
      'raceRooms',
      roomId,
      'months',
      MONTH,
      'members'
    ),

    snap => {
      members = snap.docs.map(d => d.data());

      const mine = members.find(m => m.uid === uid);

      const sig =
        `${profile.displayName}|${profile.avatar}|${plannerHours()}`;

      if (
        mine &&
        mine.displayName === profile.displayName &&
        mine.avatar === profile.avatar &&
        Number(mine.totalHours) === plannerHours()
      ) {
        lastMemberWrite = sig;
      } else {
        void syncHours();
      }

      renderRoad();
    },

    err => notice(
      `⚠ Yarışçılar yüklenemedi: ${err.message}`
    )
  );

  if (IS_RACE) {
    startChat();
  }
}

/* Gerçek zamanlı sohbet */

function startChat() {
  if (unsubMessages) return;

  const chatQuery = fs.query(
    fs.collection(
      db,
      'raceRooms',
      roomId,
      'months',
      MONTH,
      'messages'
    ),
    fs.orderBy('createdAt', 'desc'),
    fs.limit(60)
  );

  unsubMessages = fs.onSnapshot(
    chatQuery,

    snapshot => {
      const chat = $('clubChatList');

      if (!chat) return;

      const atBottom =
        chat.scrollHeight -
        chat.scrollTop -
        chat.clientHeight < 60;

      const chatData = snapshot.docs
        .map(d => d.data())
        .reverse();

      chat.innerHTML = chatData.length
        ? chatData.map(m => `
            <div class="club-chat-message ${m.uid === uid ? 'mine' : ''}">
              <strong>${escapeHTML(m.name)}</strong>
              <p>${escapeHTML(m.text)}</p>
            </div>
          `).join('')
        : '<div class="club-empty">İlk mesajı sen yaz! 💬</div>';

      if (atBottom) {
        chat.scrollTop = chat.scrollHeight;
      }
    },

    err => notice(
      `⚠ Sohbet yüklenemedi: ${err.message}`
    )
  );
}

async function sendChat(e) {
  e.preventDefault();

  if (!profile) return;

  const input = $('clubChatInput');
  const text = input.value.trim();

  if (!text) return;

  const button = $('clubChatSend');

  button.disabled = true;

  try {
    await fs.addDoc(
      fs.collection(
        db,
        'raceRooms',
        roomId,
        'months',
        MONTH,
        'messages'
      ),
      {
        uid,
        name: profile.displayName,
        avatar: profile.avatar,
        text: text.slice(0, 300),
        createdAt: fs.serverTimestamp()
      }
    );

    input.value = '';
  } catch (err) {
    alert(`Mesaj gönderilemedi: ${err.message}`);
  } finally {
    button.disabled = false;
  }
}

/* Davet bağlantısı */

function inviteLink() {
  const url = new URL('./race.html', location.href);

  url.searchParams.set('room', roomId);

  return url.href;
}

/* Butonlar ve otomatik saat takibi */

function initControls() {
  profileButton();

  if (!IS_RACE) {
    document.addEventListener('input', e => {
      if (e.target.matches('[data-field="worked"]')) {
        scheduleSync();
      }
    });
  } else {
    $('clubMonthName').textContent = monthTitle();
    $('clubInvite').value = inviteLink();

    $('clubCopyBtn').addEventListener(
      'click',
      async () => {
        try {
          await navigator.clipboard.writeText(
            inviteLink()
          );

          $('clubCopyBtn').textContent =
            'Kopyalandı ✓';

          setTimeout(() => {
            $('clubCopyBtn').textContent = 'Kopyala';
          }, 1400);
        } catch {
          $('clubInvite').select();

          alert(
            'Bağlantıyı seçip kopyalayabilirsin.'
          );
        }
      }
    );

    $('clubSyncBtn').addEventListener(
      'click',
      () => void syncHours(true)
    );

    $('clubChatForm').addEventListener(
      'submit',
      sendChat
    );
  }

  window.addEventListener('storage', e => {
    if (e.key === PLANNER_KEY) {
      scheduleSync();
    }
  });

  document.addEventListener(
    'visibilitychange',
    () => {
      if (!document.hidden) {
        scheduleSync();
      }
    }
  );

  window.addEventListener('focus', scheduleSync);
}

/* Firebase'e bağlan ve önceki hesabı kurtar */

async function connect() {
  const conf = window.MSP_FIREBASE_CONFIG;

  if (
    !conf ||
    !['apiKey', 'authDomain', 'projectId', 'appId']
      .every(k =>
        conf[k] &&
        !String(conf[k]).includes('BURAYA_')
      )
  ) {
    notice(
      '⚠ Firebase ayarları eksik. firebase-config.js dosyasını kontrol et.'
    );
    return;
  }

  if (!/^https?:$/.test(location.protocol)) {
    notice(
      '⚠ Sayfayı dosyadan değil, localhost veya HTTPS üzerinden aç.'
    );
    return;
  }

  try {
    const base =
      'https://www.gstatic.com/firebasejs/11.10.0/';

    const [app, authentication, firestore] =
      await Promise.all([
        import(base + 'firebase-app.js'),
        import(base + 'firebase-auth.js'),
        import(base + 'firebase-firestore.js')
      ]);

    const firebaseApp = app.getApps().length
      ? app.getApp()
      : app.initializeApp(conf);

    auth = authentication.getAuth(firebaseApp);

    // Firebase'in eski oturumu okumasını bekle.
    await auth.authStateReady();

    uid = (
      auth.currentUser ||
      (await authentication.signInAnonymously(auth)).user
    ).uid;

    fs = firestore;
    db = fs.getFirestore(firebaseApp);

    notice('🟢 Çevrimiçi · Firebase bağlı.');

    const profileSnap = await fs.getDoc(
      fs.doc(db, 'raceProfiles', uid)
    );

    if (profileSnap.exists()) {
      const p = profileSnap.data();

      profile = {
        uid,
        displayName: p.displayName,
        avatar: LOOKS.has(p.avatar)
          ? p.avatar
          : 'pink'
      };
    } else {
      // Eski yarıştan profil varsa yeniden kayıt isteme.
      const oldMember = await fs.getDoc(
        myMemberRef()
      );

      let old = oldMember.exists()
        ? oldMember.data()
        : null;

      if (!old) {
        try {
          old = JSON.parse(
            localStorage.getItem(
              `msp-race-profile-${roomId}`
            )
          );
        } catch {
          // Önceki profil bulunamadı.
        }
      }

      const previousName =
        old?.displayName || old?.name;

      if (
        previousName &&
        LOOKS.has(old?.avatar)
      ) {
        profile = {
          uid,
          displayName:
            previousName.trim().slice(0, 24),
          avatar: old.avatar
        };

        await fs.setDoc(
          fs.doc(db, 'raceProfiles', uid),
          {
            ...profile,
            updatedAt: fs.serverTimestamp()
          }
        );
      }
    }

    if (profile) {
      profileButton();
      startListening();
    } else {
      notice(
        '🎀 Başlamak için profilini oluştur.'
      );

      openProfileDialog(true);
    }
  } catch (err) {
    notice(
      `⚠ Firebase bağlantısı kurulamadı: ${err.message}`
    );
  }
}

initControls();
void connect();
