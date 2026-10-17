
'use strict';

import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const { user, db, hoursReady } = window.MSP;
const IS_RACE = document.body.dataset.clubPage === 'race';
const $ = id => document.getElementById(id);

const HOUR_KEY = 'my-sweet-daily-planner-2026-v1';
const ROOM_KEY = 'msp-club-room-id-v1';
const USER_ROOM = `msp-club-room-${user.uid}`;

const MONTH = new Date()
  .toLocaleDateString('sv-SE')
  .slice(0, 7);

/* Y2K GIRL AVATARS v22 */
const AVATARS = [
  ['pink', 'Gizemli siyah sac', 'female'],
  ['denim', 'Pembe kurdeleli sarisin', 'female'],
  ['violet', 'Kulaklikli cool girl', 'female'],
  ['black', 'Gece prensesi', 'female'],
  ['mint', 'Kizil sacli tatli kiz', 'female'],
  ['blonde', 'Pembe sapkali cool girl', 'female'],
  ['sky', 'Yaz gunu sarisin', 'female'],
  ['navy', 'Cupcake seven romantik', 'female']
];

const LOOKS = new Map(
  AVATARS.map(([id, label, gender]) => [
    id, { label, gender }
  ])
);

const LEGACY_AVATAR_MAP = {
  moss: 'pink', charcoal: 'black', amber: 'denim', coral: 'mint'
};

const resolveAvatar = look => {
  const id = LEGACY_AVATAR_MAP[look] || look;
  return LOOKS.has(id) ? id : 'pink';
};

const fmt = n =>
  Number(n || 0).toLocaleString('tr-TR', {
    maximumFractionDigits: 2
  });

const esc = v =>
  String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

const validRoom = s =>
  typeof s === 'string' &&
  /^[a-zA-Z0-9_-]{16,64}$/.test(s);

const makeRoom = () =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(16)),
    b => b.toString(16).padStart(2, '0')
  ).join('');

const urlRoom =
  new URLSearchParams(location.search).get('room');

const roomId = validRoom(urlRoom)
  ? urlRoom
  : (
    validRoom(localStorage.getItem(USER_ROOM))
      ? localStorage.getItem(USER_ROOM)
      : (
        validRoom(localStorage.getItem(ROOM_KEY))
          ? localStorage.getItem(ROOM_KEY)
          : makeRoom()
      )
  );

localStorage.setItem(USER_ROOM, roomId);
localStorage.setItem(ROOM_KEY, roomId);

if (IS_RACE && !validRoom(urlRoom)) {
  const url = new URL(location.href);
  url.searchParams.set('room', roomId);
  history.replaceState(null, '', url);
}

if ($('clubRaceLink')) {
  $('clubRaceLink').href =
    `./race.html?room=${encodeURIComponent(roomId)}`;
}

let profile = null;
let members = [];
let lastDraw = '';
let lastHoursWritten = '';
let writing = false;
let queuedWrite = false;
let syncDebounce;
let unsubscribeMembers;
let unsubscribeChat;
let choice = 'pink';

const memberRef = () =>
  doc(
    db,
    'raceRooms',
    roomId,
    'months',
    MONTH,
    'members',
    user.uid
  );

const profileRef = () =>
  doc(db, 'raceProfiles', user.uid);

const monthCollection = type =>
  collection(
    db,
    'raceRooms',
    roomId,
    'months',
    MONTH,
    type
  );

const publicUrl = () =>
  `https://kingp4-cmyk.github.io/my-sweet-planner/race.html?room=${encodeURIComponent(roomId)}`;

function status(text) {
  if ($('clubStatus')) {
    $('clubStatus').textContent = text;
  }

  if ($('clubInlineStatus')) {
    $('clubInlineStatus').textContent = text;
  }
}

function hoursFromPlanner() {
  try {
    const days = JSON.parse(
      localStorage.getItem(HOUR_KEY)
    )?.days || {};

    let hours = 0;

    for (const [day, info] of Object.entries(days)) {
      if (!day.startsWith(`${MONTH}-`)) continue;

      for (const task of info?.tasks || []) {
        const n = Number(task.worked || 0);

        if (Number.isFinite(n) && n > 0) {
          hours += Math.min(n, 24);
        }
      }
    }

    const state = JSON.parse(
      localStorage.getItem(HOUR_KEY) || '{}'
    );

    const extra = (state.timerSessions || []).reduce(
      (sum, session) =>
        sum + (
          !session.taskId && session.day?.startsWith(`${MONTH}-`)
            ? Math.max(0, Number(session.seconds) || 0) / 3600
            : 0
        ),
      0
    );

    return Math.min(
      744,
      Math.round((hours + extra) * 10000) / 10000
    );
  } catch {
    return 0;
  }
}

/* GLITTER CARS v23 */
const GLITTER_CAR_FILES = [
  'rose-classic.webp', 'lilac-classic.webp',
  'rose-bug.webp', 'lilac-bug.webp'
];

function glitterCarHTML(look) {
  const id = resolveAvatar(look);
  const index = Math.max(0, AVATARS.findIndex(a => a[0] === id));
  const car = GLITTER_CAR_FILES[index % GLITTER_CAR_FILES.length];

  return `<span class="glam-car" aria-hidden="true"><img
    src="./assets/cars/${car}"
    alt="" draggable="false" loading="lazy"></span>`;
}

function avatarHTML(look) {
  const id = LEGACY_AVATAR_MAP[look] || look;
  const safe = LOOKS.has(id) ? id : 'pink';
  const index = AVATARS.findIndex(item => item[0] === safe) + 1;
  const src = `./assets/avatars/girl-${String(index).padStart(2, '0')}.webp`;

  return `
    <span class="glam-avatar" aria-hidden="true">
      <img src="${src}" alt="" loading="lazy"
           draggable="false"
           style="display:block;width:100%;height:100%;object-fit:cover;border-radius:50%">
    </span>
  `;
}

function sorted() {
  return [...members].sort(
    (a, b) =>
      Number(b.totalHours || 0) -
        Number(a.totalHours || 0) ||
      String(a.displayName || '').localeCompare(
        String(b.displayName || ''),
        'tr'
      )
  );
}

function getRunnerX(list, rankIndex, hours) {
  // Hiç çalışmamış kişi gün/ay sıralamasından etkilenmez:
  // araç her zaman START çizgisinin tam üzerinde bekler.
  if (!(Number(hours) > 0)) return 6.5;
  const maxH = Math.max(
    1,
    ...list.map(v => Number(v.totalHours) || 0)
  );

  const now = new Date();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();

  const day = now.getDate();
  const ratio = Math.min(1, (Number(hours) || 0) / maxH);
  const rankBoost = list.length > 1
    ? (list.length - 1 - rankIndex) / (list.length - 1)
    : 1;

  if (day >= daysInMonth) {
    return Math.min(108, 92 + rankBoost * 12 + ratio * 4);
  }

  if (day === daysInMonth - 1) {
    return Math.min(84, 28 + ratio * 52 + rankBoost * 4);
  }

  const calendarProgress = Math.max(
    0,
    Math.min(1, (day - 1) / Math.max(1, daysInMonth - 2))
  );

  const start = 12 + calendarProgress * 16;
  const maxBeforeFinish = 48 + calendarProgress * 20;

  return Math.min(
    76,
    start + ratio * (maxBeforeFinish - start) + rankBoost * 2
  );
}

function render() {
  if (!profile || !$('clubMount')) return;

  const list = sorted();

  const signature = JSON.stringify(
    list.map(m => [
      m.uid, m.displayName, m.avatar, m.totalHours
    ])
  );

  if (signature === lastDraw) return;

  lastDraw = signature;

  const count = $('clubHeroDivaCount');

  if (count) {
    count.textContent = `${list.length} kişi`;
  }

  const names = $('clubHeroNames');

  if (names) {
    names.innerHTML = list.length
      ? list.map(
          (m, i) => `
            <span class="club-hero-pill ${m.uid === user.uid ? 'mine' : ''}">
              ${i === 0 ? '👑 ' : '✦ '}
              ${esc(m.displayName)}
            </span>
          `
        ).join('')
      : `
        <span class="club-hero-empty">
          Henüz yarışçı yok ♡
        </span>
      `;
  }

  const width = Math.max(
    620,
    list.length * 105
  );

  const runners = list.map((m, i) => {
    const x = getRunnerX(
      list,
      i,
      Number(m.totalHours) || 0
    );

    const y = IS_RACE
      ? 42 + (i % 3) * 19
      : 22 + (i % 3) * 19;

    return `
      <div
        class="club-runner ${m.uid === user.uid ? 'mine' : ''}"
        style="--x:${x}%;--y:${y}px">

        <span class="club-runner-name">
          ${esc(m.displayName)}
        </span>

        <span class="glam-racer-picture">
          ${avatarHTML(m.avatar)}
          ${glitterCarHTML(m.avatar)}
        </span>

        <span class="club-runner-hours">
          ${fmt(m.totalHours)} sa
        </span>
      </div>
    `;
  }).join('');

  const road = `
    <div class="club-road-scroller">
      <div class="club-road"
           style="min-width:${width}px;width:100%">

        <div class="club-road-surface"></div>
        <span class="club-start">START</span>
        <span class="club-finish">🏁</span>

        ${runners}
      </div>
    </div>
  `;

  if (IS_RACE) {
    $('clubMount').innerHTML = list.length
      ? road
      : `
        <div class="club-empty">
          İlk yarışçı bekleniyor ♡
        </div>
      `;
  } else {
    $('clubMount').hidden = false;

    $('clubMount').innerHTML = `
      <section class="club-card">
        <div class="club-section-heading">
          <h2>
            🏁 Koşu ·
            ${esc(new Date().toLocaleDateString('tr-TR', {
              month: 'long',
              year: 'numeric'
            }))}
          </h2>

          <a
            href="./race.html?room=${encodeURIComponent(roomId)}"
            class="club-btn club-btn-soft"
            style="text-decoration:none">
            Yarışa git →
          </a>
        </div>

        ${list.length
          ? road
          : '<div class="club-empty">Henüz yarışçı yok.</div>'}

        <small id="clubInlineStatus">☁ Canlı yarış</small>
      </section>
    `;
  }

  if (IS_RACE && names) {
    const top = Math.max(
      1,
      ...list.map(m => Number(m.totalHours) || 0)
    );

    names.innerHTML = list.length
      ? list.map((m, i) => `
        <div class="glam-rank ${m.uid === user.uid ? 'mine' : ''}">
          <span class="glam-rank-number">
            ${i === 0 ? '👑' : i + 1}
          </span>

          ${avatarHTML(m.avatar)}

          <div class="glam-rank-person">
            <div>
              <strong>${esc(m.displayName)}</strong>
              ${m.uid === user.uid ? '<small>Sen</small>' : ''}
              <b>${fmt(m.totalHours)} sa</b>
            </div>

            <div class="glam-bar">
              <span style="width:${Math.max(
                3,
                100 * (Number(m.totalHours) || 0) / top
              )}%"></span>
            </div>
          </div>
        </div>
      `).join('')
      : '<p class="club-hero-empty">Henüz yarışçı yok ♡</p>';
  }

  if ($('clubRanking')) {
    $('clubRanking').innerHTML = list.length
      ? list.map(
          (m, i) => `
            <li>
              <b>
                ${i === 0 ? '👑 ' : `${i + 1}. `}
                ${esc(m.displayName)}
                ${m.uid === user.uid ? ' (Sen)' : ''}
              </b>

              <small>${fmt(m.totalHours)} saat</small>
            </li>
          `
        ).join('')
      : '<li>Henüz yarışçı yok.</li>';
  }

  if ($('clubMyHours')) {
    $('clubMyHours').textContent =
      `Bu ayki çalışma süren: ${fmt(hoursFromPlanner())} saat`;
  }
}

function profileButton() {
  let btn = $('clubProfileOpen');

  if (!btn && !IS_RACE) {
    const top = document.querySelector('.top-actions');

    if (!top) return;

    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'clubProfileOpen';
    btn.className = 'club-profile-button';
    top.append(btn);
  }

  if (!btn) return;

  btn.hidden = !profile;

  if (profile) {
    // Avatar is already stored in Firestore; reuse the exact same
    // image/legacy-avatar mapping as the profile selection dialog.
    btn.innerHTML = `
      ${avatarHTML(profile.avatar)}
      <span class="club-profile-name">${esc(profile.displayName)}</span>
    `;

    btn.setAttribute('aria-label', `Profilimi düzenle: ${profile.displayName}`);
  }

  if (!btn.dataset.bound) {
    btn.dataset.bound = '1';

    btn.addEventListener(
      'click',
      () => showProfile(false)
    );
  }
}

function closeProfile() {
  $('clubDialogBackdrop')?.remove();
  document.body.style.removeProperty('overflow');
}

function showProfile(first) {
  closeProfile();

  choice = resolveAvatar(profile?.avatar);

  const node = document.createElement('div');

  node.id = 'clubDialogBackdrop';
  node.className = 'club-dialog-backdrop';

  node.innerHTML = `
    <div class="club-dialog"
         role="dialog"
         aria-modal="true"
         aria-labelledby="clubDialogTitle">

      <h2 id="clubDialogTitle">
        ${first
          ? '🎀 Avatarını seç ve başla'
          : '💖 Profilimi düzenle'}
      </h2>

      <p>
        Yarışta sadece adın, avatarın ve toplam saatin
        görünür; ajanda notların gizlidir.
      </p>

      <form id="clubProfileForm">
        <label for="clubDisplayName">
          Görünen adın
        </label>

        <input
          id="clubDisplayName"
          minlength="1"
          maxlength="24"
          placeholder="Görünen adın"
          required
          value="${esc(profile?.displayName || '')}">

        <p style="margin:12px 0 4px;font-weight:800">
          Avatarını seç ♡
        </p>

        <div class="club-avatar-grid" id="clubAvatarGrid">
          ${AVATARS.map(
            ([id, label]) => `
              <button
                type="button"
                class="club-avatar-choice"
                data-avatar="${id}"
                aria-label="${esc(label)}"
                title="${esc(label)}"
                aria-pressed="${id === choice}">

                ${avatarHTML(id)}
              </button>
            `
          ).join('')}
        </div>

        <div class="club-dialog-footer">
          ${first
            ? ''
            : `
              <button
                type="button"
                id="clubCancelProfile"
                class="club-btn club-btn-soft">
                Vazgeç
              </button>
            `}

          <button
            class="club-btn"
            id="clubSaveProfile"
            type="submit">
            ${first ? 'Yarışa katıl ♡' : 'Kaydet'}
          </button>
        </div>

        <div class="club-dialog-error"
             id="clubProfileError"
             role="alert"></div>
      </form>
    </div>
  `;

  document.body.append(node);
  document.body.style.overflow = 'hidden';

  node
    .querySelector('#clubAvatarGrid')
    .addEventListener('click', event => {
      const b = event.target.closest('[data-avatar]');

      if (!b) return;

      choice = b.dataset.avatar;

      node
        .querySelectorAll('[data-avatar]')
        .forEach(x => {
          x.setAttribute(
            'aria-pressed',
            String(x === b)
          );
        });
    });

  node
    .querySelector('#clubCancelProfile')
    ?.addEventListener('click', closeProfile);

  node
    .querySelector('#clubProfileForm')
    .addEventListener('submit', saveProfile);

  node.querySelector('#clubDisplayName').focus();
}

async function saveProfile(e) {
  e.preventDefault();

  const name = $('clubDisplayName')
    .value
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 24);

  if (!name) return;

  $('clubSaveProfile').disabled = true;

  try {
    await setDoc(
      profileRef(),
      {
        uid: user.uid,
        displayName: name,
        avatar: choice,
        updatedAt: serverTimestamp()
      }
    );

    profile = {
      uid: user.uid,
      displayName: name,
      avatar: choice
    };

    closeProfile();
    profileButton();
    listenMembers();

    await syncHours(true);
  } catch (error) {
    $('clubProfileError').textContent = error.message;
    $('clubSaveProfile').disabled = false;
  }
}

async function syncHours(force = false) {
  if (!profile) return;

  if (writing) {
    queuedWrite = true;
    return;
  }

  writing = true;

  try {
    if (!(await hoursReady)) {
      status(
        '⚠ Çalışma saati yüklenemedi; eski saatlere dokunulmadı.'
      );
      return;
    }

    const hours = Math.min(
      744,
      hoursFromPlanner() +
      (window.MSP.activeTimer?.getActiveSeconds() || 0) / 3600
    );

    const sign =
      `${profile.displayName}|${profile.avatar}|${hours}`;

    if (!force && sign === lastHoursWritten) return;

    await setDoc(
      memberRef(),
      {
        uid: user.uid,
        displayName: profile.displayName,
        avatar: profile.avatar,
        totalHours: hours,
        updatedAt: serverTimestamp()
      }
    );

    lastHoursWritten = sign;

    if ($('clubMyHours')) {
      $('clubMyHours').textContent =
        `Bu ayki çalışma süren: ${fmt(hours)} saat`;
    }
  } catch (error) {
    status(
      error.code === 'permission-denied'
        ? '⚠ Saat kaydedilemedi: Firestore kurallarını ve e-posta doğrulamanı kontrol et.'
        : `⚠ Yarış kaydı: ${error.message}`
    );
  } finally {
    writing = false;

    if (queuedWrite) {
      queuedWrite = false;
      void syncHours();
    }
  }
}

function syncSoon() {
  if (!profile) return;

  clearTimeout(syncDebounce);

  syncDebounce = setTimeout(
    () => void syncHours(),
    1600
  );
}

function listenMembers() {
  if (unsubscribeMembers || !profile) return;

  unsubscribeMembers = onSnapshot(
    monthCollection('members'),

    snapshot => {
      members = snapshot.docs.map(d => d.data());
      render();
    },

    err => {
      status(`⚠ Yarışçılar okunamadı: ${err.message}`);
    }
  );

  if (IS_RACE) {
    listenChat();
  }
}

function listenChat() {
  if (unsubscribeChat) return;

  const q = query(
    monthCollection('messages'),
    orderBy('createdAt', 'desc'),
    limit(60)
  );

  unsubscribeChat = onSnapshot(
    q,

    snapshot => {
      const target = $('clubChatList');
      if (!target) return;

      const atBottom =
        target.scrollHeight -
        target.scrollTop -
        target.clientHeight < 55;

      const rows = snapshot.docs
        .map(d => d.data())
        .reverse();

      target.innerHTML = rows.length
        ? rows.map(m => `
          <div class="club-chat-message ${m.uid === user.uid ? 'mine' : ''}">
            <strong>${esc(m.name)}</strong>
            <p>${esc(m.text)}</p>
          </div>
        `).join('')
        : `
          <div class="club-empty">
            İlk mesajı sen yaz! 💌
          </div>
        `;

      if (atBottom) {
        target.scrollTop = target.scrollHeight;
      }
    },

    err => {
      status(`⚠ Sohbet: ${err.message}`);
    }
  );
}

async function sendMessage(e) {
  e.preventDefault();

  if (!profile) return;

  const input = $('clubChatInput');
  const text = input.value.trim().slice(0, 300);

  if (!text) return;

  const button = $('clubChatSend');
  button.disabled = true;

  try {
    await addDoc(
      monthCollection('messages'),
      {
        uid: user.uid,
        name: profile.displayName,
        avatar: profile.avatar,
        text,
        createdAt: serverTimestamp()
      }
    );

    input.value = '';
  } catch (error) {
    alert(`Mesaj gönderilemedi: ${error.message}`);
  } finally {
    button.disabled = false;
  }
}

async function copyInvite() {
  const button = $('clubCopyBtn');

  try {
    await navigator.clipboard.writeText(publicUrl());

    button.textContent = 'Kopyalandı ✓';

    setTimeout(() => {
      button.textContent = 'Kopyala';
    }, 1400);
  } catch {
    window.prompt('Bağlantıyı kopyala:', publicUrl());
  }
}

async function shareInvite() {
  const link = publicUrl();

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'My Sweet Ajanda - Koşu',
        text: "Koşan Bitches'lar yarışına katıl! ♡",
        url: link
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        await copyInvite();
      }
    }
  } else {
    await copyInvite();
  }
}

async function initialize() {
  profileButton();

  if (IS_RACE) {
    $('clubMonthName').textContent =
      new Date().toLocaleDateString('tr-TR', {
        month: 'long',
        year: 'numeric'
      });

    $('clubInviteAnchor').href = publicUrl();
    $('clubInviteAnchor').textContent = publicUrl();

    $('clubCopyBtn').addEventListener(
      'click',
      copyInvite
    );

    $('clubShareBtn').addEventListener(
      'click',
      shareInvite
    );

    $('clubSyncBtn').addEventListener(
      'click',
      () => void syncHours(true)
    );

    $('clubChatForm').addEventListener(
      'submit',
      sendMessage
    );
  }

  try {
    const p = await getDoc(profileRef());

    if (p.exists()) {
      const data = p.data();

      profile = {
        uid: user.uid,
        displayName: data.displayName,
        avatar: resolveAvatar(data.avatar)
      };
    } else {
      const m = await getDoc(memberRef());

      if (m.exists()) {
        const data = m.data();

        profile = {
          uid: user.uid,
          displayName: data.displayName,
          avatar: resolveAvatar(data.avatar)
        };

        await setDoc(
          profileRef(),
          {
            ...profile,
            updatedAt: serverTimestamp()
          }
        );
      }
    }

    if (!profile) {
      status(
        '🎀 Avatarını ve adını seçerek yarışa katıl.'
      );

      showProfile(true);
    } else {
      profileButton();
      listenMembers();

      await syncHours();

      status('🟢 Çevrimiçi · Canlı yarış');
    }
  } catch (error) {
    status(
      error.code === 'permission-denied'
        ? '⚠ Firestore erişimi reddedildi. Önce e-postanı doğrula, sonra yeni güvenlik kurallarını Firebase’de yayımla.'
        : `⚠ Firebase: ${error.message}`
    );
  }

  window.addEventListener('storage', e => {
    if (e.key === HOUR_KEY) {
      syncSoon();
    }
  });

  document.addEventListener(
    'visibilitychange',
    () => {
      if (!document.hidden) {
        syncSoon();
      }
    }
  );

  if (!IS_RACE) {
    document.addEventListener('input', e => {
      if (e.target.matches('[data-field="worked"]')) {
        syncSoon();
      }
    });

    window.addEventListener(
      'msp:planner-saved',
      syncSoon
    );
  }
}

void initialize();

if (IS_RACE) {
  import('./race-timer.js?v=10')
    .then(m => {
      window.MSP.activeTimer = m.initRaceTimer({
        user,
        hoursReady,
        syncSoon,
        syncHours
      });
    })
    .catch(console.error);
}
