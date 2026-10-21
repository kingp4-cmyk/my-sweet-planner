
'use strict';

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const KEY = 'my-sweet-daily-planner-2026-v1';
const OWNER = 'msp-v6-last-planner-owner';
const $ = id => document.getElementById(id);

const dateLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const uuid = () =>
  crypto.randomUUID?.() ||
  `timer-${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Yalnizca SAAT:DAKIKA:SANIYE gosterilir. Salise yoktur.
// Kayıtlı süre (saniye) ve Firebase senkronizasyon mantığı değişmez.
const time = totalSeconds => {
  const totalSecondsInt = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(totalSecondsInt / 3600);
  const minutes = Math.floor((totalSecondsInt % 3600) / 60);
  const seconds = totalSecondsInt % 60;

  return [hours, minutes, seconds]
    .map(x => String(x).padStart(2, '0'))
    .join(':');
};

const fmt = s =>
  s >= 3600
    ? `${(s / 3600).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} saat`
    : `${Math.ceil(s / 60)} dakika`;

const safeState = () => {
  try {
    const st = JSON.parse(localStorage.getItem(KEY));
    if (st?.version === 1 && st.days) return st;
  } catch {}

  return {
    version: 1,
    year: new Date().getFullYear(),
    activeMonth: new Date().getMonth() + 1,
    days: {},
    stickers: {},
    colors: {},
    customStickers: []
  };
};

const sumSessions = st =>
  (st.timerSessions || []).reduce(
    (n, s) => n + (!s.taskId ? Number(s.seconds) || 0 : 0),
    0
  );

export function initRaceTimer({ user, hoursReady, syncHours }) {
  const TIMER = `msp-glam-timer-${user.uid}`;
  const plannerRef = doc(
    window.MSP.db,
    'plannerUsers',
    user.uid,
    'data',
    'main'
  );

  let timer;
  try {
    timer = JSON.parse(localStorage.getItem(TIMER));
  } catch {}

  if (!timer || typeof timer !== 'object') {
    timer = { elapsed: 0, startedAt: null };
  }

  let selectedSessionId = null;
  let busy = false;
  let lastSync = 0;

  const current = () =>
    Math.max(0, timer.elapsed || 0) +
    (timer.startedAt
      ? Math.max(0, (Date.now() - timer.startedAt) / 1000)
      : 0);

  const saveTimer = () =>
    localStorage.setItem(TIMER, JSON.stringify(timer));

  const note = t => {
    $('glamTimerNote').textContent = t;
  };

  const dirtyState = state => {
    const payload = JSON.stringify(state);

    localStorage.setItem(KEY, payload);
    localStorage.setItem(OWNER, user.uid);
    localStorage.setItem(
      `msp-v6-planner-cache-${user.uid}`,
      JSON.stringify({ payload, dirty: true })
    );
    window.dispatchEvent(new Event('msp:planner-saved'));
  };

  async function storeState(state) {
    const payload = JSON.stringify(state);

    if (new Blob([payload]).size > 680000) {
      throw new Error('Ajanda depolama sınırına ulaştı.');
    }

    await setDoc(plannerRef, {
      payload,
      schemaVersion: 1,
      updatedAt: serverTimestamp()
    });

    localStorage.setItem(
      `msp-v6-planner-cache-${user.uid}`,
      JSON.stringify({ payload, dirty: false })
    );
  }

  const sessions = () => safeState().timerSessions || [];

  function paintTasks() {
    const st = safeState();
    const day = dateLocal();
    const tasks = st.days?.[day]?.tasks || [];

    $('glamTaskSelect').innerHTML =
      '<option value="">Bir görev seç ♡</option>';

    for (const t of tasks) {
      if (!t.name?.trim()) continue;

      const option = document.createElement('option');
      option.value = t.id;
      option.textContent = t.name;
      $('glamTaskSelect').append(option);
    }

    const unassigned = (st.timerSessions || [])
      .filter(s => !s.taskId && s.seconds > 0);

    if (!unassigned.length) {
      selectedSessionId = null;
      $('glamPendingSessions').textContent =
        'Henüz göreve atanmamış bir süre yok ♡';
      $('glamAssign').disabled = true;
    } else {
      if (!unassigned.some(s => s.id === selectedSessionId)) {
        selectedSessionId = unassigned[unassigned.length - 1].id;
      }

      $('glamPendingSessions').innerHTML = '';

      for (const s of unassigned) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className =
          `glam-session ${s.id === selectedSessionId ? 'chosen' : ''}`;
        b.textContent =
          `⏱ ${s.day === day ? 'Bugün' : s.day} · ${fmt(s.seconds)}`;

        b.onclick = () => {
          selectedSessionId = s.id;
          paintTasks();
        };

        $('glamPendingSessions').append(b);
      }

      $('glamAssign').disabled = false;
    }

    const total = (st.timerSessions || [])
      .filter(s => s.day === day)
      .reduce((n, s) => n + (Number(s.seconds) || 0), 0);

    $('glamTodaySummary').textContent =
      `🌸 Bugünün kronometre süresi: ${fmt(total)}`;
  }

  const tick = () => {
    $('glamClock').textContent = time(current());
    // Yalnizca gorsel sure gostergesi; Firebase/veri kaydi hesaplari degismez.
    const liveHours = $('raceV34LiveHours');
    if (liveHours) {
      const value = current() / 3600;
      liveHours.textContent = value < 0.01 ? '0 saat' :
        `${value.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} saat`;
    }
    $('glamToggle').textContent = timer.startedAt ? 'Ⅱ' : '▶';
    $('glamToggle').title =
      timer.startedAt ? 'Duraklat' : 'Başlat';

    if (timer.startedAt && Date.now() - lastSync > 15000) {
      lastSync = Date.now();
      void syncHours(true);
    }
  };

  $('glamToggle').onclick = () => {
    if (timer.startedAt) {
      timer.elapsed = current();
      timer.startedAt = null;
      note('Duraklatıldı. Devam edebilir veya kaydedebilirsin ♡');
    } else {
      timer.startedAt = Date.now();
      note('Harikasın! Çalıştıkça pistte ilerliyorsun ✨');
    }

    saveTimer();
    tick();
    void syncHours(true);
  };

  $('glamReset').onclick = () => {
    if (
      current() > 0 &&
      !confirm('Kaydedilmemiş kronometre süresi sıfırlansın mı?')
    ) return;

    timer = { elapsed: 0, startedAt: null };
    saveTimer();
    tick();
    note('Kronometre sıfırlandı ♡');
    void syncHours(true);
  };

  $('glamFinish').onclick = async () => {
    if (busy) return;

    const secs = Math.floor(current());

    if (secs < 1) {
      note('Önce kronometreyi başlat ♡');
      return;
    }

    timer.elapsed = current();
    timer.startedAt = null;
    saveTimer();
    tick();
    busy = true;

    try {
      if (!await hoursReady) {
        throw new Error('Ajanda henüz yüklenemedi.');
      }

      const st = safeState();
      st.timerSessions = Array.isArray(st.timerSessions)
        ? st.timerSessions
        : [];

      st.timerSessions.push({
        id: uuid(),
        day: dateLocal(),
        seconds: secs,
        taskId: null,
        createdAt: Date.now()
      });

      dirtyState(st);
      await storeState(st);

      timer = { elapsed: 0, startedAt: null };
      saveTimer();
      tick();
      paintTasks();
      await syncHours(true);

      note(`💖 ${fmt(secs)} kaydedildi! Dilersen aşağıdan bir göreve bağla.`);
    } catch (e) {
      note(`⚠ ${e.message} Verilerin yerel yedeği tutuldu.`);
    } finally {
      busy = false;
    }
  };

  $('glamAssign').onclick = async () => {
    if (busy || !selectedSessionId) return;

    const taskId = $('glamTaskSelect').value;
    const newName = $('glamNewTask').value.trim();

    if (!taskId && !newName) {
      $('glamAssignStatus').textContent =
        'Bir görev seç veya yeni görev adı yaz ♡';
      return;
    }

    busy = true;

    try {
      const st = safeState();
      const s = (st.timerSessions || [])
        .find(x => x.id === selectedSessionId && !x.taskId);

      if (!s) {
        throw new Error('Bu süre zaten atanmış.');
      }

      const day = st.days[s.day] ||
        (st.days[s.day] = { tasks: [], mood: '', note: '' });

      if (!Array.isArray(day.tasks)) day.tasks = [];

      let task = taskId
        ? day.tasks.find(t => t.id === taskId)
        : null;

      if (!task && newName) {
        task = {
          id: uuid(),
          name: newName,
          done: false,
          planned: '',
          worked: '',
          productivity: ''
        };

        day.tasks.push(task);
      }

      if (!task) {
        throw new Error(
          'Görev, seçilen sürenin gününde bulunamadı. Yeni görev adı yazabilirsin.'
        );
      }

      task.worked = String(
        Math.round(
          ((Number(task.worked) || 0) + s.seconds / 3600) * 10000
        ) / 10000
      );

      s.taskId = task.id;

      dirtyState(st);
      await storeState(st);
      paintTasks();

      $('glamNewTask').value = '';
      $('glamAssignStatus').textContent =
        `✓ ${fmt(s.seconds)} “${task.name}” görevine aktarıldı. Yarış toplamına tekrar eklenmedi.`;

      await syncHours(true);
    } catch (e) {
      $('glamAssignStatus').textContent = `⚠ ${e.message}`;
    } finally {
      busy = false;
    }
  };

  void hoursReady.then(ok => {
    if (ok) paintTasks();
    else note('⚠ Ajanda yüklenemedi; süre kaydı için sayfayı yenile.');
  });

  tick();
  setInterval(tick, 250);
  window.addEventListener('pagehide', saveTimer);

  return {
    getActiveSeconds: current,
    getUnassignedSeconds: () => sumSessions(safeState())
  };
}
