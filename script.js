
'use strict';

// =====================================
// MY SWEET PLANNER
// =====================================

const $ = id => document.getElementById(id);

const KEY = 'my-sweet-daily-planner-2026-v1';

const MONTHS = [
  '', 'Ocak', 'Şubat', 'Mart', 'Nisan',
  'Mayıs', 'Haziran', 'Temmuz', 'Ağustos',
  'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const MONTH_ICONS = [
  '', '❄️', '💗', '🌷', '🌼', '🦋',
  '🍒', '☀️', '🍑', '🍂', '🎃', '🍓', '🎀'
];

const WEEKDAYS = [
  'Pazar', 'Pazartesi', 'Salı',
  'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'
];

const MOODS = [
  ['🌸', 'Keyifli'],
  ['☀️', 'Enerjik'],
  ['☁️', 'Sakin'],
  ['😴', 'Yorgun'],
  ['✨', 'Harika']
];

const QUOTES = [
  'Küçük adımlar da ilerlemektir.',
  'Bugün kendin için güzel bir şey yap.',
  'Senin hızın, senin yolun.',
  'Dinlenmek de üretkenliğin bir parçası.',
  'Her gün mükemmel olmak zorunda değilsin.',
  'Bugünkü emeğin geleceğine bir hediye.',
  'Hayallerinin peşinden kendi hızında git.',
  'Kendine biraz daha nazik davran.',
  'Küçük alışkanlıklar büyük sonuçlar doğurur.',
  'Başlamak, kusursuz olmaktan daha önemlidir.',
  'Bugün senin için yeni bir fırsat.',
  'Yavaş ilerlemek durmak değildir.',
  'Dün yaptıklarını da takdir et.',
  'İyi şeylerin zaman almasına izin ver.',
  'Bugün sadece bir adım atman yeter.',
  'Kendine ayırdığın zaman kıymetli.',
  'Her başarının arkasında küçük adımlar vardır.',
  'Başkalarıyla değil, kendi yolunla ilgilen.',
  'İhtiyacın olduğunda mola verebilirsin.',
  'Yarın yeniden deneme şansın var.',
  'Hayat yalnızca yapılacaklar listesinden ibaret değil.',
  'Güzel şeyleri fark etmek için yavaşla.',
  'Başarı bazen sadece vazgeçmemektir.',
  'Bugün yaptığın küçük iş de değerlidir.',
  'Kendini başkalarının temposuyla ölçme.',
  'Her yeni gün yeni bir sayfa.',
  'Yapabildiğinin en iyisi bugün için yeterli.',
  'Kendine inanmak da bir başlangıçtır.',
  'Hayallerin için kendine zaman tanı.',
  'Mutlu anları erteleme.',
  'Bugün olduğun hâlin de yeterli.'
];

// =====================================
// Y2K STICKERLAR
// =====================================

const STICKERS = [
  {
    id: 'itgirl',
    type: 'label',
    text: 'IT GIRL',
    style: 'pink-glitter'
  },
  {
    id: 'angelenergy',
    type: 'label',
    text: 'ANGEL ENERGY',
    style: 'silver-glam'
  },
  {
    id: 'hotmess',
    type: 'label',
    text: 'HOT MESS',
    style: 'black-pink'
  },
  {
    id: 'princess',
    type: 'label',
    text: 'PRINCESS MODE',
    style: 'baby-pink'
  },
  {
    id: 'maincharacter',
    type: 'label',
    text: 'MAIN CHARACTER',
    style: 'glossy-pink'
  },
  {
    id: 'slay',
    type: 'label',
    text: 'SLAY',
    style: 'magenta-gloss'
  },
  {
    id: 'bossy',
    type: 'label',
    text: 'BOSSY',
    style: 'dark-glam'
  },
  {
    id: 'luckyme',
    type: 'label',
    text: 'LUCKY ME',
    style: 'mint-pop'
  },
  {
    id: 'tooglam',
    type: 'label',
    text: 'TOO GLAM TO CARE',
    style: 'purple-pop'
  },
  {
    id: 'xoxo',
    type: 'label',
    text: 'XOXO',
    style: 'pink-outline'
  },
  {
    id: 'lovethat',
    type: 'label',
    text: 'LOVE THAT',
    style: 'soft-pink'
  },
  {
    id: 'babydoll',
    type: 'label',
    text: 'BABY DOLL',
    style: 'sparkle-pink'
  },

  { id: 'lipgloss', type: 'emoji', emoji: '💄', name: 'Lip gloss' },
  { id: 'mirror', type: 'emoji', emoji: '🪞', name: 'Mirror' },
  { id: 'sparkles', type: 'emoji', emoji: '✨', name: 'Sparkles' },
  { id: 'heart', type: 'emoji', emoji: '💖', name: 'Heart' },
  { id: 'butterfly', type: 'emoji', emoji: '🦋', name: 'Butterfly' },
  { id: 'gem', type: 'emoji', emoji: '💎', name: 'Gem' },
  { id: 'kiss', type: 'emoji', emoji: '💋', name: 'Kiss' },
  { id: 'star', type: 'emoji', emoji: '⭐', name: 'Star' },
  { id: 'pinkbow', type: 'emoji', emoji: '🎀', name: 'Bow' },
  { id: 'phone', type: 'emoji', emoji: '📞', name: 'Phone' },
  { id: 'shopping', type: 'emoji', emoji: '🛍️', name: 'Shopping' },
  { id: 'perfume', type: 'emoji', emoji: '🧴', name: 'Perfume' }
];

const STICKER_BY_ID = Object.fromEntries(
  STICKERS.map(sticker => [sticker.id, sticker])
);

// Eski stickerları tanımak için
const OLD_STICKERS = [
  'bow', 'strawberry', 'bunny', 'kitty',
  'cherries', 'flower', 'cloud', 'cup', 'moon'
];

for (const id of OLD_STICKERS) {
  if (!STICKER_BY_ID[id]) {
    STICKER_BY_ID[id] = {
      id,
      type: 'image',
      src: `./assets/${id}.png`
    };
  }
}

// Eski bazı sticker kimlikleri için uyumluluk
STICKER_BY_ID['too glam'] = STICKERS.find(
  item => item.id === 'tooglam'
);

STICKER_BY_ID['love that'] = STICKERS.find(
  item => item.id === 'lovethat'
);

// =====================================
// VERİLERİ KAYDETME
// =====================================

const today = new Date();

function defaultState() {
  return {
    version: 1,
    year: today.getFullYear(),
    activeMonth: today.getMonth() + 1,
    days: {},
    stickers: {},
    colors: {},
    customStickers: []
  };
}

let state = defaultState();

try {
  const saved = JSON.parse(localStorage.getItem(KEY));

  if (saved && saved.version === 1) {
    state = { ...defaultState(), ...saved };
  }
} catch (error) {
  console.warn('Kayıt okunamadı:', error);
}

state.days = state.days || {};
state.stickers = state.stickers || {};
state.colors = state.colors || {};

state.customStickers = Array.isArray(state.customStickers)
  ? state.customStickers
  : [];

state.year = Math.max(
  1900,
  Math.min(2100, Number(state.year) || today.getFullYear())
);

state.activeMonth = Number(state.activeMonth);

if (state.activeMonth < 1 || state.activeMonth > 12) {
  state.activeMonth = today.getMonth() + 1;
}

for (const sticker of state.customStickers) {
  if (sticker?.id && sticker?.src) {
    STICKERS.push(sticker);
    STICKER_BY_ID[sticker.id] = sticker;
  }
}

// Ekim, Kasım ve Aralık 2026 eski kayıt uyumluluğu
for (const month of [10, 11, 12]) {
  const key = `2026-${month}`;

  if (!Array.isArray(state.stickers[key])) {
    state.stickers[key] =
      Array.isArray(state.stickers[month])
        ? state.stickers[month]
        : [];
  }
}

const monthId = () =>
  `${state.year}-${state.activeMonth}`;

const uid = () =>
  `${Date.now()}_${Math.random().toString(36).slice(2)}`;

const escapeHTML = value =>
  String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));

const formatNumber = value =>
  Number(value || 0).toLocaleString('tr-TR', {
    maximumFractionDigits: 1
  });

const safeHours = value =>
  Math.max(0, Math.min(24, Number(value) || 0));

let saveTimer = null;
let toastTimer = null;

function toast(message) {
  const element = $('toast');
  element.textContent = message;
  element.classList.add('show');

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    element.classList.remove('show');
  }, 2200);
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    $('saveStatus').textContent = '✓ Otomatik kaydedildi';
  } catch (error) {
    console.error(error);
    $('saveStatus').textContent = '⚠ Kayıt başarısız';
    toast('Tarayıcı depolama alanı dolmuş olabilir.');
  }
}

function scheduleSave() {
  $('saveStatus').textContent = '♡ Kaydediliyor…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 250);
}

// =====================================
// GÜNLÜK GÖREVLER
// =====================================

function newTask() {
  return {
    id: uid(),
    name: '',
    done: false,
    planned: '',
    worked: '',
    productivity: ''
  };
}

function dayKey(day) {
  return [
    state.year,
    String(state.activeMonth).padStart(2, '0'),
    String(day).padStart(2, '0')
  ].join('-');
}

function getDay(day) {
  const key = dayKey(day);

  if (!state.days[key] || !Array.isArray(state.days[key].tasks)) {
    state.days[key] = {
      tasks: Array.from({ length: 4 }, newTask),
      mood: '',
      note: ''
    };
  }

  return state.days[key];
}

function taskTotals(data) {
  let total = 0;
  let done = 0;
  let planned = 0;
  let worked = 0;

  for (const task of data.tasks) {
    if (task.name?.trim()) {
      total++;

      if (task.done) {
        done++;
      }
    }

    planned += safeHours(task.planned);
    worked += safeHours(task.worked);
  }

  return { total, done, planned, worked };
}

function taskHTML(task, day) {
  return `
    <div class="task-row ${task.done ? 'completed' : ''}"
         data-task="${escapeHTML(task.id)}"
         data-paint="task:${day}:${escapeHTML(task.id)}">

      <input
        class="task-check"
        type="checkbox"
        data-field="done"
        aria-label="Tamamlandı"
        ${task.done ? 'checked' : ''}
      >

      <input
        class="task-name"
        type="text"
        data-field="name"
        value="${escapeHTML(task.name)}"
        placeholder="Küçük bir hedef..."
        maxlength="160"
      >

      <input
        type="number"
        data-field="planned"
        min="0"
        max="24"
        step="0.25"
        placeholder="—"
        value="${escapeHTML(task.planned)}"
      >

      <input
        type="number"
        data-field="worked"
        min="0"
        max="24"
        step="0.25"
        placeholder="—"
        value="${escapeHTML(task.worked)}"
      >

      <select data-field="productivity">
        <option value="">—</option>
        ${[1, 2, 3, 4, 5].map(number => `
          <option value="${number}"
            ${String(task.productivity) === String(number)
              ? 'selected'
              : ''}>
            ${number} ★
          </option>
        `).join('')}
      </select>

      <button class="remove-task" data-remove-task
              title="Görevi sil">×</button>
    </div>
  `;
}

function dayHTML(day) {
  const data = getDay(day);

  const date = new Date(
    state.year,
    state.activeMonth - 1,
    day
  );

  const isToday =
    date.toDateString() === new Date().toDateString();

  const totals = taskTotals(data);

  const quoteIndex =
    (day + state.activeMonth - 2) % QUOTES.length;

  return `
    <article
      class="day-card ${isToday ? 'today' : ''}"
      id="day-${state.activeMonth}-${day}"
      data-day="${day}"
      data-paint="day:${day}">

      <div class="dayhead" data-paint="head:${day}">
        <div class="day-title">

          <span class="day-num">
            ${String(day).padStart(2, '0')}
          </span>

          <span class="day-week">
            ${WEEKDAYS[date.getDay()]}
          </span>

          ${isToday
            ? '<span class="day-today">BUGÜN</span>'
            : ''}

        </div>

        <span class="day-totals" data-day-head-totals>
          ♡ ${formatNumber(totals.worked)} sa
        </span>
      </div>

      <div class="day-inner">

        <div class="task-head">
          <div>✓</div>
          <div>YAPILACAK</div>
          <div>PLAN</div>
          <div>ÇALIŞ.</div>
          <div>VERİM</div>
          <div></div>
        </div>

        <div class="task-rows">
          ${data.tasks.map(task =>
            taskHTML(task, day)
          ).join('')}
        </div>

        <div class="row-actions">
          <button class="add-task" data-add-task>
            ＋ Yeni görev
          </button>
          <span class="day-mini-summary" data-day-mini></span>
        </div>

        <div class="day-bottom">
          <span class="mood-label">Ruh hâlim:</span>

          <div class="moods">
            ${MOODS.map(([emoji, name]) => `
              <button
                class="mood ${data.mood === emoji ? 'selected' : ''}"
                data-mood="${emoji}"
                title="${name}">
                ${emoji}
              </button>
            `).join('')}
          </div>
        </div>

        <textarea
          class="day-note"
          data-paint="note:${day}"
          maxlength="600"
          placeholder="Bugünün minik notu...">${escapeHTML(data.note)}</textarea>

        <div class="daily-quote">
          <div class="daily-quote-label">
            ✦ Bugün kendine hatırlat
          </div>
          <div class="daily-quote-text">
            ${QUOTES[quoteIndex]}
          </div>
        </div>
      </div>
    </article>
  `;
}

function updateCard(day) {
  const card = $(`day-${state.activeMonth}-${day}`);

  if (!card) return;

  const values = taskTotals(getDay(day));

  card.querySelector('[data-day-head-totals]').textContent =
    `♡ ${formatNumber(values.worked)} sa`;

  card.querySelector('[data-day-mini]').textContent =
    `${values.done}/${values.total} tamamlandı · ` +
    `${formatNumber(values.planned)} sa plan`;

  card.classList.toggle(
    'done-day',
    values.total > 0 && values.done === values.total
  );
}

function updateStats() {
  let total = 0;
  let done = 0;
  let planned = 0;
  let worked = 0;
  let ratingSum = 0;
  let ratingCount = 0;

  const daysInMonth =
    new Date(state.year, state.activeMonth, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const data = getDay(day);
    const totals = taskTotals(data);

    total += totals.total;
    done += totals.done;
    planned += totals.planned;
    worked += totals.worked;

    for (const task of data.tasks) {
      const rating = Number(task.productivity);

      if (rating >= 1 && rating <= 5) {
        ratingSum += rating;
        ratingCount++;
      }
    }
  }

  const progress = total
    ? Math.round(done / total * 100)
    : 0;

  $('statDone').textContent = done;
  $('statDoneFoot').textContent =
    `${total} görevden ${done} tanesi`;

  $('statPlanned').textContent =
    formatNumber(planned);

  $('statWorked').textContent =
    formatNumber(worked);

  $('statProductivity').textContent = ratingCount
    ? `${formatNumber(ratingSum / ratingCount)} /5`
    : '—';

  $('progressFill').style.width = `${progress}%`;
  $('progressNumber').textContent = `${progress}%`;
}

// =====================================
// TAKVİMİ OLUŞTURMA
// =====================================

$('monthSwitch').innerHTML =
  MONTHS.slice(1).map((month, index) => `
    <button class="month-tab"
            data-month="${index + 1}">
      ${month} ${MONTH_ICONS[index + 1]}
    </button>
  `).join('');

function renderMonth() {
  $('yearTitle').textContent = state.year;
  $('heroYear').textContent = state.year;

  $('monthHeading').textContent =
    `${MONTHS[state.activeMonth]} ` +
    `${state.year} günlüğüm ✧`;

  document.querySelectorAll('.month-tab')
    .forEach(button => {
      button.classList.toggle(
        'active',
        Number(button.dataset.month) === state.activeMonth
      );
    });

  const daysInMonth =
    new Date(state.year, state.activeMonth, 0).getDate();

  $('dayGrid').innerHTML =
    Array.from(
      { length: daysInMonth },
      (_, index) => dayHTML(index + 1)
    ).join('');

  for (let day = 1; day <= daysInMonth; day++) {
    updateCard(day);
  }

  updateStats();
  renderStickers();
  applyPaint();
}

$('monthSwitch').addEventListener('click', event => {
  const button = event.target.closest('[data-month]');

  if (!button) return;

  state.activeMonth = Number(button.dataset.month);
  renderMonth();
  scheduleSave();
});

$('prevYear').addEventListener('click', () => {
  state.year = Math.max(1900, state.year - 1);
  renderMonth();
  scheduleSave();
});

$('nextYear').addEventListener('click', () => {
  state.year = Math.min(2100, state.year + 1);
  renderMonth();
  scheduleSave();
});

$('todayBtn').addEventListener('click', () => {
  const current = new Date();

  state.year = current.getFullYear();
  state.activeMonth = current.getMonth() + 1;

  renderMonth();
  scheduleSave();

  $(`day-${state.activeMonth}-${current.getDate()}`)
    ?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
});

// =====================================
// GÖREVLERİN ETKİLEŞİMİ
// =====================================

function handleTaskChange(event) {
  const element = event.target;
  const card = element.closest('[data-day]');

  if (!card) return;

  const day = Number(card.dataset.day);
  const data = getDay(day);
  const row = element.closest('[data-task]');

  if (row && element.dataset.field) {
    const task = data.tasks.find(
      item => item.id === row.dataset.task
    );

    if (!task) return;

    const field = element.dataset.field;

    task[field] = element.type === 'checkbox'
      ? element.checked
      : element.value;

    row.classList.toggle(
      'completed',
      Boolean(task.done)
    );

    updateCard(day);
    updateStats();
    scheduleSave();

  } else if (element.classList.contains('day-note')) {
    data.note = element.value;
    scheduleSave();
  }
}

$('dayGrid').addEventListener('input', handleTaskChange);

$('dayGrid').addEventListener('change', event => {
  if (event.target.dataset.field) {
    handleTaskChange(event);
  }
});

$('dayGrid').addEventListener('click', event => {
  const card = event.target.closest('[data-day]');

  if (!card) return;

  const day = Number(card.dataset.day);
  const data = getDay(day);

  if (event.target.closest('[data-add-task]')) {
    const task = newTask();

    data.tasks.push(task);

    card.querySelector('.task-rows')
      .insertAdjacentHTML(
        'beforeend',
        taskHTML(task, day)
      );

    card.querySelector('.task-row:last-child .task-name')
      ?.focus();

    updateCard(day);
    applyPaint();
    scheduleSave();
    return;
  }

  if (event.target.closest('[data-remove-task]')) {
    const row = event.target.closest('[data-task]');

    data.tasks = data.tasks.filter(
      task => task.id !== row.dataset.task
    );

    row.remove();
    updateCard(day);
    updateStats();
    scheduleSave();
    return;
  }

  const moodButton = event.target.closest('[data-mood]');

  if (moodButton) {
    const mood = moodButton.dataset.mood;
    data.mood = data.mood === mood ? '' : mood;

    card.querySelectorAll('[data-mood]')
      .forEach(button => {
        button.classList.toggle(
          'selected',
          button.dataset.mood === data.mood
        );
      });

    scheduleSave();
  }
});

// =====================================
// STICKER GÖRÜNÜMÜ
// =====================================

function stickerContent(sticker) {
  if (sticker.type === 'emoji') {
    return `
      <span class="sticker-emoji">
        ${escapeHTML(sticker.emoji)}
      </span>
    `;
  }

  if (sticker.type === 'label') {
    return `
      <span class="text-sticker ${escapeHTML(sticker.style)}">
        ${escapeHTML(sticker.text)}
      </span>
    `;
  }

  if (sticker.type === 'image' || sticker.type === 'upload') {
    return `
      <img src="${escapeHTML(sticker.src)}"
           draggable="false" alt="">
    `;
  }

  return '';
}

function stickerPaletteHTML(sticker) {
  const name =
    sticker.name || sticker.text || sticker.id;

  return `
    <button class="sticker-option"
            data-sticker="${escapeHTML(sticker.id)}"
            title="${escapeHTML(name)}">
      ${stickerContent(sticker)}
      <small>${escapeHTML(name)}</small>
    </button>
  `;
}

function renderStickerPalette() {
  $('imagePalette').innerHTML =
    STICKERS.filter(sticker =>
      sticker.type === 'label' ||
      sticker.type === 'upload'
    ).map(stickerPaletteHTML).join('');

  $('emojiPalette').innerHTML =
    STICKERS.filter(sticker =>
      sticker.type === 'emoji'
    ).map(stickerPaletteHTML).join('');
}

function currentStickers() {
  const key = monthId();

  if (!Array.isArray(state.stickers[key])) {
    state.stickers[key] = [];
  }

  return state.stickers[key];
}

function renderStickers() {
  $('stickerLayer').innerHTML =
    currentStickers().map(item => {
      const sticker = STICKER_BY_ID[item.stickerId];

      if (!sticker) return '';

      const size = Math.max(
        32,
        Math.min(160, Number(item.size) || 74)
      );

      return `
        <div
          class="placed-sticker"
          role="button"
          tabindex="0"
          data-placed="${escapeHTML(item.id)}"
          aria-label="Çift tıklayarak sil"
          style="
            left:${Number(item.x) || 0}px;
            top:${Number(item.y) || 0}px;
            width:${size}px;
            height:${size}px;
            --size:${size}px;
            --rot:${Number(item.rot) || 0}deg;
          ">
          <div class="sticker-art">
            ${stickerContent(sticker)}
          </div>
        </div>
      `;
    }).join('');
}

// =====================================
// STICKER SÜRÜKLE BIRAK
// =====================================

const stage = $('plannerStage');

let draggingSticker = null;
let pressedSticker = null;
let lastStickerTap = null;

function createStickerGhost(sticker, size) {
  const ghost = document.createElement('div');

  ghost.className = 'drag-ghost';
  ghost.style.width = `${size}px`;
  ghost.style.height = `${size}px`;
  ghost.innerHTML = stickerContent(sticker);

  document.body.appendChild(ghost);

  return ghost;
}

function startStickerDrag(event, stickerId, placedId = null) {
  const sticker = STICKER_BY_ID[stickerId];

  if (!sticker) return;

  const existing = placedId
    ? currentStickers().find(item => item.id === placedId)
    : null;

  const size =
    Number(existing?.size) ||
    Number($('stickerSize').value);

  const ghost = createStickerGhost(sticker, size);

  draggingSticker = {
    stickerId,
    placedId,
    ghost,
    pointerId: event.pointerId
  };

  moveStickerDrag(event);

  document.addEventListener('pointermove', moveStickerDrag);
  document.addEventListener('pointerup', finishStickerDrag);
  document.addEventListener('pointercancel', cancelStickerDrag);
}

function moveStickerDrag(event) {
  if (!draggingSticker) return;

  draggingSticker.ghost.style.left =
    `${event.clientX}px`;

  draggingSticker.ghost.style.top =
    `${event.clientY}px`;
}

function stopStickerDrag() {
  document.removeEventListener('pointermove', moveStickerDrag);
  document.removeEventListener('pointerup', finishStickerDrag);
  document.removeEventListener('pointercancel', cancelStickerDrag);

  draggingSticker?.ghost.remove();
  draggingSticker = null;
}

function cancelStickerDrag() {
  stopStickerDrag();
  renderStickers();
}

function finishStickerDrag(event) {
  if (!draggingSticker) return;

  const { stickerId, placedId } = draggingSticker;

  const rect = stage.getBoundingClientRect();

  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const inside =
    x >= 0 && y >= 0 &&
    x <= rect.width && y <= rect.height;

  if (inside) {
    if (placedId) {
      const item = currentStickers().find(
        sticker => sticker.id === placedId
      );

      if (item) {
        item.x = Math.round(x);
        item.y = Math.round(y);
      }
    } else {
      currentStickers().push({
        id: uid(),
        stickerId,
        x: Math.round(x),
        y: Math.round(y),
        size: Number($('stickerSize').value),
        rot: Math.floor(Math.random() * 15) - 7
      });
    }

    scheduleSave();
  }

  stopStickerDrag();
  renderStickers();
}

// Palette event delegation
for (const paletteId of ['imagePalette', 'emojiPalette']) {
  $(paletteId).addEventListener('pointerdown', event => {
    const button = event.target.closest('[data-sticker]');

    if (!button || event.button !== 0) return;

    event.preventDefault();

    startStickerDrag(
      event,
      button.dataset.sticker
    );
  });
}

// Sticker üzerine basıldığında:
$('stickerLayer').addEventListener('pointerdown', event => {
  const element = event.target.closest('[data-placed]');

  if (!element || event.button !== 0) return;

  event.preventDefault();

  pressedSticker = {
    id: element.dataset.placed,
    x: event.clientX,
    y: event.clientY,
    pointerId: event.pointerId
  };

  document.addEventListener('pointermove', pressedMove);
  document.addEventListener('pointerup', pressedUp);
  document.addEventListener('pointercancel', pressedCancel);
});

function clearPressed() {
  pressedSticker = null;

  document.removeEventListener('pointermove', pressedMove);
  document.removeEventListener('pointerup', pressedUp);
  document.removeEventListener('pointercancel', pressedCancel);
}

function pressedMove(event) {
  if (!pressedSticker) return;

  if (event.pointerId !== pressedSticker.pointerId) return;

  const distance = Math.hypot(
    event.clientX - pressedSticker.x,
    event.clientY - pressedSticker.y
  );

  if (distance <= 7) return;

  const id = pressedSticker.id;

  const item = currentStickers().find(
    sticker => sticker.id === id
  );

  clearPressed();

  if (item) {
    startStickerDrag(event, item.stickerId, item.id);
  }
}

function pressedUp(event) {
  if (!pressedSticker) return;

  if (event.pointerId !== pressedSticker.pointerId) return;

  const id = pressedSticker.id;
  const currentTime = Date.now();

  clearPressed();

  if (
    lastStickerTap?.id === id &&
    currentTime - lastStickerTap.time < 380
  ) {
    removeSticker(id);
    lastStickerTap = null;
  } else {
    lastStickerTap = { id, time: currentTime };
  }
}

function pressedCancel() {
  clearPressed();
}

function removeSticker(id) {
  state.stickers[monthId()] =
    currentStickers().filter(item => item.id !== id);

  renderStickers();
  scheduleSave();
  toast('Sticker silindi ♡');
}

$('stickerLayer').addEventListener('keydown', event => {
  if (!['Delete', 'Backspace'].includes(event.key)) {
    return;
  }

  const sticker = event.target.closest('[data-placed]');

  if (!sticker) return;

  event.preventDefault();
  removeSticker(sticker.dataset.placed);
});

// =====================================
// KENDİ STICKERINI YÜKLE
// =====================================

$('uploadStickerInput').addEventListener(
  'change',
  async event => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    const accepted = [
      'image/png',
      'image/jpeg',
      'image/webp'
    ];

    if (!accepted.includes(file.type)) {
      toast('PNG, JPG veya WEBP seçmelisin.');
      return;
    }

    if (file.size > 5_000_000) {
      toast('Görsel en fazla 5 MB olabilir.');
      return;
    }

    try {
      const image = await createImageBitmap(file);

      const scale = Math.min(
        1,
        320 / Math.max(image.width, image.height)
      );

      const canvas = document.createElement('canvas');

      canvas.width = Math.max(
        1,
        Math.round(image.width * scale)
      );

      canvas.height = Math.max(
        1,
        Math.round(image.height * scale)
      );

      canvas.getContext('2d').drawImage(
        image, 0, 0, canvas.width, canvas.height
      );

      image.close();

      const src = canvas.toDataURL('image/webp', 0.8);

      const sticker = {
        id: `upload_${uid()}`,
        type: 'upload',
        src,
        name: file.name
          .replace(/\.[^.]+$/, '')
          .slice(0, 40)
      };

      state.customStickers.push(sticker);
      STICKERS.push(sticker);
      STICKER_BY_ID[sticker.id] = sticker;

      renderStickerPalette();
      scheduleSave();

      toast('Yeni sticker eklendi ♡');

    } catch (error) {
      console.error(error);
      toast('Görsel yüklenemedi.');
    }
  }
);

// =====================================
// RENK PALETİ
// =====================================

const COLORS = [
  '#fff8fa', '#fff9f8', '#fffdfd', '#ffffff',
  '#f6b2ce', '#f4c6d9', '#ffe7ea', '#fce3ee',
  '#e979a7', '#d85290', '#a64b73', '#573c4a',
  '#977787', '#ffe3ef', '#ffc6dc', '#ffb5c2',
  '#f7d4ff', '#d8c4ff', '#b9d8ff', '#bde9ec',
  '#c9f2d5', '#e9f5bc', '#fff0aa', '#ffd6ac',
  '#d7c5b5', '#d7e4ee', '#e7d5e0', '#ffdfea',
  '#ecc6a2', '#c8ece1'
];

$('colorPalette').innerHTML =
  COLORS.map(color => `
    <button
      class="color-option"
      data-color="${color}"
      style="background:${color}"
      title="${color}">
    </button>
  `).join('');

$('customColor').addEventListener('input', event => {
  $('customColorSwatch').dataset.color = event.target.value;

  $('customColorSwatch').style.background =
    event.target.value;
});

function paintKey(zone) {
  if (zone.startsWith('site:')) {
    return zone;
  }

  return `${monthId()}:${zone}`;
}

function applyPaint() {
  const background = state.colors['site:background'];
  const textColor = state.colors['site:text'];

  document.body.classList.toggle(
    'custom-background',
    Boolean(background)
  );

  document.body.classList.toggle(
    'custom-text',
    Boolean(textColor)
  );

  document.documentElement.style.setProperty(
    '--user-background',
    background || 'transparent'
  );

  document.documentElement.style.setProperty(
    '--user-text',
    textColor || '#573c4a'
  );

  document.querySelectorAll('[data-paint]')
    .forEach(element => {
      const zone = element.dataset.paint;

      if (
        zone === 'site:background' ||
        zone === 'site:text'
      ) {
        return;
      }

      element.style.background =
        state.colors[paintKey(zone)] || '';
    });
}

let draggingColor = null;

function startColorDrag(event) {
  const button = event.target.closest('[data-color]');

  if (!button || event.button !== 0) return;

  event.preventDefault();

  const color = button.dataset.color;

  const ghost = document.createElement('div');
  ghost.className = 'color-ghost';
  ghost.style.background = color;
  document.body.appendChild(ghost);

  draggingColor = {
    color,
    ghost,
    hovered: null
  };

  moveColorDrag(event);

  document.addEventListener('pointermove', moveColorDrag);
  document.addEventListener('pointerup', finishColorDrag);
  document.addEventListener('pointercancel', cancelColorDrag);
}

function moveColorDrag(event) {
  if (!draggingColor) return;

  draggingColor.ghost.style.left =
    `${event.clientX}px`;

  draggingColor.ghost.style.top =
    `${event.clientY}px`;

  const target = document.elementFromPoint(
    event.clientX,
    event.clientY
  )?.closest('[data-paint]');

  if (target !== draggingColor.hovered) {
    draggingColor.hovered?.classList.remove('paint-hover');

    draggingColor.hovered = target;
    target?.classList.add('paint-hover');
  }
}

function endColorDrag() {
  if (!draggingColor) return;

  draggingColor.hovered?.classList.remove('paint-hover');
  draggingColor.ghost.remove();
  draggingColor = null;

  document.removeEventListener('pointermove', moveColorDrag);
  document.removeEventListener('pointerup', finishColorDrag);
  document.removeEventListener('pointercancel', cancelColorDrag);
}

function finishColorDrag(event) {
  if (!draggingColor) return;

  const target = document.elementFromPoint(
    event.clientX,
    event.clientY
  )?.closest('[data-paint]');

  if (target) {
    state.colors[paintKey(target.dataset.paint)] =
      draggingColor.color;

    applyPaint();
    scheduleSave();

    toast('Renk değiştirildi! 🎨');
  }

  endColorDrag();
}

function cancelColorDrag() {
  endColorDrag();
}

$('colorPalette').addEventListener(
  'pointerdown',
  startColorDrag
);

$('customColorSwatch').addEventListener(
  'pointerdown',
  startColorDrag
);

$('resetColors').addEventListener('click', () => {
  for (const key of Object.keys(state.colors)) {
    if (key.startsWith(`${monthId()}:`)) {
      delete state.colors[key];
    }
  }

  applyPaint();
  scheduleSave();
  toast('Bu ayın renkleri sıfırlandı ♡');
});

$('resetTheme').addEventListener('click', () => {
  delete state.colors['site:background'];
  delete state.colors['site:text'];

  applyPaint();
  scheduleSave();

  toast('Orijinal tema geri geldi ♡');
});

// =====================================
// YAZDIRMA
// =====================================

$('printBtn').addEventListener('click', () => {
  window.print();
});

window.addEventListener('beforeunload', () => {
  clearTimeout(saveTimer);
  save();
});

// =====================================
// İLK YÜKLEME
// =====================================

renderStickerPalette();
renderMonth();
