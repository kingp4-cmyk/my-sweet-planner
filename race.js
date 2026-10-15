
'use strict';

// MY SWEET PLANNER — YARIŞ VE SOHBET

const $ = id => document.getElementById(id);

const MONTHS = [
  '', 'Ocak', 'Şubat', 'Mart', 'Nisan',
  'Mayıs', 'Haziran', 'Temmuz', 'Ağustos',
  'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const AVATARS = [
  'pink', 'denim', 'violet', 'black', 'mint'
];

const PLANNER_KEY = 'my-sweet-daily-planner-2026-v1';

const today = new Date();

const currentMonth =
  `${today.getFullYear()}-` +
  `${String(today.getMonth() + 1).padStart(2, '0')}`;

function randomId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '');
  }

  return Array.from(
    crypto.getRandomValues(new Uint8Array(16)),
    n => n.toString(16).padStart(2, '0')
  ).join('');
}

// ODA BAĞLANTISI

const params = new URLSearchParams(location.search);

let roomId = params.get('room');

if (
  !roomId ||
  !/^[a-zA-Z0-9_-]{16,64}$/.test(roomId)
) {
  roomId = randomId();

  params.set('room', roomId);

  history.replaceState(
    null,
    '',
    `${location.pathname}?${params}`
  );
}

// YARIŞ DURUMU

let selectedMonth = currentMonth;

let mode = 'local';

let uid =
  localStorage.getItem('msp-race-local-id') ||
  `local_${randomId()}`;

localStorage.setItem('msp-race-local-id', uid);

let members = [];
let messages = [];

let firebase = null;
let unsubscribeMembers = null;
let unsubscribeMessages = null;

const profileKey = `msp-race-profile-${roomId}`;

// YARDIMCI FONKSİYONLAR

function esc(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char])
  );
}

function safeAvatar(value) {
  return AVATARS.includes(value) ? value : 'pink';
}

function hours(number) {
  return Number(number || 0).toLocaleString('tr-TR', {
    maximumFractionDigits: 2
  });
}

function localKey() {
  return `msp-race-demo:${roomId}:${selectedMonth}`;
}

function isPast() {
  return selectedMonth < currentMonth;
}

function editable() {
  return selectedMonth === currentMonth;
}

// ANA AJANDADAKİ ÇALIŞMA SAATLERİNİ OKU

function plannerHours(month) {
  try {
    const saved = JSON.parse(
      localStorage.getItem(PLANNER_KEY)
    );

    if (!saved?.days) return 0;

    let sum = 0;

    for (const [key, day] of Object.entries(saved.days)) {
      if (!key.startsWith(`${month}-`)) continue;

      for (const task of day.tasks || []) {
        const number = Number(task.worked);

        if (Number.isFinite(number) && number >= 0) {
          sum += Math.min(24, number);
        }
      }
    }

    return Math.min(
      744,
      Math.round(sum * 100) / 100
    );

  } catch {
    return 0;
  }
}

// YEREL DENEME KAYITLARI

function loadLocal() {
  let data;

  try {
    data = JSON.parse(
      localStorage.getItem(localKey())
    );
  } catch {}

  members = Array.isArray(data?.members)
    ? data.members
    : [];

  messages = Array.isArray(data?.messages)
    ? data.messages
    : [];

  render();
}

function saveLocal() {
  localStorage.setItem(
    localKey(),
    JSON.stringify({ members, messages })
  );

  render();
}

function setStatus(text) {
  $('connectionStatus').textContent = text;
}

// DAVET BAĞLANTISI

function getInviteLink() {
  const url = new URL(location.href);

  url.searchParams.set('room', roomId);

  return url.href;
}

function updateLink() {
  const shareable =
    mode === 'cloud' &&
    /^https?:$/.test(location.protocol) &&
    !['localhost', '127.0.0.1'].includes(
      location.hostname
    );

  $('raceLinkInput').value =
    shareable ? getInviteLink() : '';

  $('raceLinkInput').placeholder = shareable
    ? ''
    : 'Siteyi yayımlayıp Firebase bağlayınca hazır olacak';

  $('copyLinkBtn').disabled = !shareable;

  $('shareHint').textContent = shareable
    ? 'Bu bağlantıya sahip olan arkadaşların aynı yarışa katılabilir.'
    : 'Şu anda yalnızca yerel deneme yapabilirsin. Davet bağlantısı için Firebase ve yayımlanmış site gerekir.';

  $('demoBtn').hidden = mode === 'cloud';
}

// İNSAN AVATARININ HTML YAPISI

function person(avatar) {
  return `
    <div class="person look-${safeAvatar(avatar)}"
         aria-hidden="true">

      <div class="hair-back"></div>
      <div class="face"></div>
      <div class="fringe"></div>

      <div class="arm a1"></div>
      <div class="arm a2"></div>

      <div class="torso"></div>

      <div class="leg l1"></div>
      <div class="leg l2"></div>

      <div class="shoe s1"></div>
      <div class="shoe s2"></div>

    </div>
  `;
}

function refreshPreview() {
  $('avatarPreview').innerHTML = person(
    $('avatarSelect').value
  );
}

// SIRALAMA

function sortedMembers() {
  return [...members].sort((a, b) =>
    Number(b.totalHours || 0) -
    Number(a.totalHours || 0) ||

    String(a.displayName).localeCompare(
      String(b.displayName), 'tr'
    )
  );
}

// YARIŞ YOLLARINI OLUŞTUR

function renderTracks() {
  const list = sortedMembers();

  if (!list.length) {
    $('raceTracks').innerHTML = `
      <div class="empty">
        Henüz yarışçı yok.
        İsmini yazıp “Yarışa katıl” de! 💗
      </div>
    `;

    $('leaderboard').innerHTML =
      '<li>Henüz sıralama yok.</li>';

    $('winnerBox').textContent =
      'Katılan yarışçı bekleniyor.';

    return;
  }

  const max = Math.max(
    0,
    ...list.map(
      participant => Number(participant.totalHours || 0)
    )
  );

  $('raceTracks').innerHTML = list.map(
    (participant, index) => {

      const score = Math.max(
        0,
        Number(participant.totalHours || 0)
      );

      const progress = score > 0 && max > 0
        ? 8 + (score / max) * 79
        : 5;

      const name = esc(
        participant.displayName || 'İsimsiz'
      );

      const you =
        participant.uid === uid ? ' (Sen)' : '';

      return `
        <div class="track-lane">

          <div class="track-label">
            <b>${index + 1}. ${name}${you}</b>
            <small>${hours(score)} saat</small>
          </div>

          <div class="track-line">

            <div class="track-progress"
                 style="width:${progress}%"></div>

            <div class="finish"></div>

            <div class="runner"
                 style="--position:${progress}%">

              <div class="runner-tag">
                ${name}
              </div>

              ${person(participant.avatar)}

            </div>
          </div>
        </div>
      `;
    }
  ).join('');

  // SIRALAMA LİSTESİ

  $('leaderboard').innerHTML = list.map(
    (participant, index) => `
      <li>
        ${index + 1}.
        ${esc(participant.displayName || 'İsimsiz')}

        <span>
          ${hours(participant.totalHours)} sa
        </span>
      </li>
    `
  ).join('');

  // KAZANAN HESAPLAMA

  if (max <= 0) {
    $('winnerBox').textContent =
      'Henüz saat girilmedi; yarış yeni başlıyor!';

  } else if (isPast()) {
    const winners = list.filter(
      participant =>
        Number(participant.totalHours || 0) === max
    );

    $('winnerBox').textContent =
      `🏆 ${winners.map(p => p.displayName).join(' ve ')} — ` +
      `${hours(max)} saat!`;

  } else {
    $('winnerBox').textContent =
      `👑 Şu an lider: ${list[0].displayName} ` +
      `(${hours(max)} saat)`;
  }
}

// SOHBET SAATİ

function timeLabel(timestamp) {
  const date = timestamp?.toDate
    ? timestamp.toDate()
    : new Date(timestamp || Date.now());

  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// CHAT MESAJLARINI GÖSTER

function renderChat() {
  const chat = $('chatMessages');

  const atBottom =
    chat.scrollHeight -
    chat.scrollTop -
    chat.clientHeight < 70;

  chat.innerHTML = messages.length
    ? messages.map(message => `
        <div class="chat-bubble
          ${message.uid === uid ? 'mine' : ''}">

          <strong>
            ${esc(message.name)} ·
            ${timeLabel(message.createdAt)}
          </strong>

          <p>${esc(message.text)}</p>

        </div>
      `).join('')

    : `<div class="empty">
         Henüz mesaj yok. İlk mesajı sen yaz! 💬
       </div>`;

  if (atBottom) {
    chat.scrollTop = chat.scrollHeight;
  }
}

// BÜTÜN EKRANI GÜNCELLE

function render() {
  const mine = members.some(
    member => member.uid === uid
  );

  const writable = editable();

  $('joinBtn').disabled = !writable;

  $('joinBtn').textContent = mine
    ? 'Profilimi kaydet'
    : 'Yarışa katıl';

  $('syncBtn').disabled = !mine || !writable;
  $('chatInput').disabled = !mine || !writable;
  $('sendBtn').disabled = !mine || !writable;

  $('chatHint').textContent = !writable
    ? 'Geçmiş veya gelecek ayın sohbetine mesaj yazılamaz.'
    : mine
      ? mode === 'cloud'
        ? 'Mesajların bu odadaki diğer kişilere görünür.'
        : 'Yerel deneme sohbeti yalnızca bu tarayıcıda görünür.'
      : 'Mesaj göndermek için yarışa katıl.';

  const [year, month] = selectedMonth
    .split('-')
    .map(Number);

  const monthEnd = new Date(year, month, 0);

  $('finishText').textContent =
    monthEnd.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) +
    ' saat 23:59 · ' +
    (isPast()
      ? 'Ay tamamlandı.'
      : 'Ay sonu bitiş çizgisi.');

  $('myHours').textContent =
    `Ajandandaki ${MONTHS[month]} ${year} ` +
    `çalışma süren: ${hours(plannerHours(selectedMonth))} saat`;

  renderTracks();
  renderChat();
  updateLink();
}

// KULLANICININ PROFİLİ

function getProfile() {
  const displayName = $('nameInput')
    .value
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 24);

  if (!displayName) {
    alert('Önce görünen adını yaz.');
    $('nameInput').focus();
    return null;
  }

  return {
    uid,
    displayName,
    avatar: safeAvatar($('avatarSelect').value),
    totalHours: plannerHours(selectedMonth)
  };
}

// YARIŞA KATIL VEYA SAATİ GÜNCELLE

async function saveMember() {
  if (!editable()) return;

  const member = getProfile();

  if (!member) return;

  try {
    if (mode === 'cloud') {
      const ref = firebase.doc(
        firebase.db,
        'raceRooms', roomId,
        'months', selectedMonth,
        'members', uid
      );

      await firebase.setDoc(ref, {
        ...member,
        updatedAt: firebase.serverTimestamp()
      });

    } else {
      const position = members.findIndex(
        participant => participant.uid === uid
      );

      if (position >= 0) {
        members[position] = member;
      } else {
        members.push(member);
      }

      saveLocal();
    }

    localStorage.setItem(
      profileKey,
      JSON.stringify({
        name: member.displayName,
        avatar: member.avatar
      })
    );

    render();

  } catch (error) {
    alert(`Profil kaydedilemedi: ${error.message}`);
  }
}

// MESAJ GÖNDERME

async function sendMessage(event) {
  event.preventDefault();

  const text = $('chatInput').value.trim();

  const member = members.find(
    participant => participant.uid === uid
  );

  if (!text || !member || !editable()) return;

  $('sendBtn').disabled = true;

  try {
    const item = {
      uid,
      name: member.displayName,
      avatar: safeAvatar(member.avatar),
      text: text.slice(0, 300)
    };

    if (mode === 'cloud') {
      await firebase.addDoc(
        firebase.collection(
          firebase.db,
          'raceRooms', roomId,
          'months', selectedMonth,
          'messages'
        ),
        {
          ...item,
          createdAt: firebase.serverTimestamp()
        }
      );

    } else {
      messages.push({
        ...item,
        createdAt: new Date().toISOString()
      });

      messages = messages.slice(-60);

      saveLocal();
    }

    $('chatInput').value = '';

  } catch (error) {
    alert(`Mesaj gönderilemedi: ${error.message}`);
  }

  render();
}

// FİREBASE VERİLERİNİ TAKİP ET

function watchCloud() {
  unsubscribeMembers?.();
  unsubscribeMessages?.();

  members = [];
  messages = [];

  render();

  const base = [
    'raceRooms', roomId,
    'months', selectedMonth
  ];

  unsubscribeMembers = firebase.onSnapshot(
    firebase.collection(
      firebase.db,
      ...base,
      'members'
    ),

    snapshot => {
      members = snapshot.docs.map(
        document => document.data()
      );

      render();
    },

    error => {
      setStatus(
        `Katılımcılar yüklenemedi: ${error.message}`
      );
    }
  );

  const messageQuery = firebase.query(
    firebase.collection(
      firebase.db,
      ...base,
      'messages'
    ),
    firebase.orderBy('createdAt', 'desc'),
    firebase.limit(60)
  );

  unsubscribeMessages = firebase.onSnapshot(
    messageQuery,

    snapshot => {
      messages = snapshot.docs
        .map(document => document.data())
        .reverse();

      renderChat();
    },

    error => {
      setStatus(
        `Sohbet yüklenemedi: ${error.message}`
      );
    }
  );
}

// FİREBASE BAĞLANTISI

async function connectFirebase() {
  const config = window.MSP_FIREBASE_CONFIG;

  const configured =
    config &&
    !Object.values(config).some(
      value =>
        !value ||
        String(value).includes('BURAYA_')
    );

  // Firebase yoksa yerel denemede kal
  if (
    !configured ||
    !/^https?:$/.test(location.protocol)
  ) {
    setStatus(
      '🧪 Yerel deneme: kişi ve sohbet yalnızca bu tarayıcıda görünür.'
    );

    loadLocal();
    return;
  }

  setStatus('☁️ Firebase bağlantısı kuruluyor…');

  try {
    const base =
      'https://www.gstatic.com/firebasejs/11.10.0/';

    const [app, authModule, fs] =
      await Promise.all([
        import(base + 'firebase-app.js'),
        import(base + 'firebase-auth.js'),
        import(base + 'firebase-firestore.js')
      ]);

    const firebaseApp = app.initializeApp(config);

    const auth = authModule.getAuth(firebaseApp);

    const user =
      auth.currentUser ||
      (
        await authModule.signInAnonymously(auth)
      ).user;

    firebase = {
      db: fs.getFirestore(firebaseApp),
      ...fs
    };

    uid = user.uid;
    mode = 'cloud';

    setStatus(
      '🟢 Çevrimiçi: arkadaşlar ve sohbet canlı olarak eşitlenir.'
    );

    watchCloud();

  } catch (error) {
    mode = 'local';

    setStatus(
      `⚠️ Firebase bağlanamadı, yerel deneme açık: ${error.message}`
    );

    loadLocal();
  }
}

// BUTONLAR

$('joinBtn').addEventListener(
  'click',
  saveMember
);

$('syncBtn').addEventListener(
  'click',
  saveMember
);

$('chatForm').addEventListener(
  'submit',
  sendMessage
);

$('avatarSelect').addEventListener(
  'change',
  refreshPreview
);

// AY DEĞİŞTİRME

$('monthPicker').value = selectedMonth;

$('monthPicker').addEventListener('change', () => {
  if (
    !/^\d{4}-\d{2}$/.test($('monthPicker').value)
  ) return;

  selectedMonth = $('monthPicker').value;

  if (mode === 'cloud') {
    watchCloud();
  } else {
    loadLocal();
  }
});

// DAVET BAĞLANTISINI KOPYALA

$('copyLinkBtn').addEventListener(
  'click',
  async () => {
    try {
      await navigator.clipboard.writeText(
        getInviteLink()
      );

      $('copyLinkBtn').textContent =
        'Kopyalandı ✓';

      setTimeout(() => {
        $('copyLinkBtn').textContent = 'Kopyala';
      }, 1500);

    } catch {
      $('raceLinkInput').select();

      alert(
        'Bağlantıyı elle kopyalayabilirsin.'
      );
    }
  }
);

// YENİ YARIŞ ODASI

$('newRoomBtn').addEventListener('click', () => {
  const approved = confirm(
    'Yeni yarış odasına geçilsin mi? ' +
    'Eski odanız bağlantısıyla kalır.'
  );

  if (!approved) return;

  const next = new URL(location.href);

  next.searchParams.set(
    'room',
    randomId()
  );

  location.href = next.href;
});

// YEREL DENEME İÇİN ÖRNEK ARKADAŞ

$('demoBtn').addEventListener('click', () => {
  const count = members.filter(
    member =>
      String(member.uid).startsWith('demo_')
  ).length;

  const demo = {
    uid: `demo_${randomId()}`,
    displayName: `Örnek arkadaş ${count + 1}`,
    avatar: AVATARS[
      (count + 1) % AVATARS.length
    ],
    totalHours: 3 + count * 2.5
  };

  members.push(demo);

  saveLocal();
});

// ÖNCEKİ KULLANICI ADINI HATIRLA

try {
  const profile = JSON.parse(
    localStorage.getItem(profileKey)
  );

  if (profile?.name) {
    $('nameInput').value = profile.name;
  }

  if (profile?.avatar) {
    $('avatarSelect').value =
      safeAvatar(profile.avatar);
  }

} catch {}

// İLK YÜKLEME

refreshPreview();

loadLocal();

connectFirebase();
