/* =========================================================================
   meeting.js — Đăng ký lịch họp
   Lịch tháng tự dựng + lưới khung giờ 30 phút (08:00–18:00) để chọn giờ họp.
   ========================================================================= */

const SLOT_START_MIN = 8 * 60;
const SLOT_END_MIN   = 18 * 60;
const SLOT_STEP      = 30;
const SLOT_COUNT     = (SLOT_END_MIN - SLOT_START_MIN) / SLOT_STEP;

let _meetings = [];
let _calYear, _calMonth;
let _selDate = null;
let _selStart = null;
let _selEnd = null;
let _editId = null;                       // id cuộc họp đang chỉnh sửa (null = đang đặt mới)

// Gợi ý nhanh cho tiêu đề cuộc họp — bấm để chèn tiền tố "CODE - " vào ô tiêu đề
const MEETING_TAGS = ['DEV', 'DES', 'Review', '1-1'];

function initMeeting() {
  const now = new Date();
  _calYear = now.getFullYear();
  _calMonth = now.getMonth();
  _selDate = toYMD(now);
}

async function loadMeetings() {
  const box = document.getElementById('meeting-container');
  box.innerHTML = '<div class="spinner"></div>';
  try {
    _meetings = await api('/api/meeting');
    renderMeetingModule();
  } catch (err) {
    box.innerHTML = '';
    showToast(err.message, 'err');
  }
}

function renderMeetingModule() {
  const box = document.getElementById('meeting-container');
  box.innerHTML = `
    <div class="cal-layout">
      <div class="cal-card" id="cal-card"></div>
      <div class="cal-card book-panel" id="book-panel"></div>
    </div>`;
  renderCalendar();
  renderBookPanel();
}

function meetingsOn(ymd) {
  return _meetings.filter(m => toYMD(new Date(m.meetingDate)) === ymd);
}

function renderCalendar() {
  const card = document.getElementById('cal-card');
  const monthNames = LANG === 'ja'
    ? ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
    : ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
  const dow = LANG === 'ja'
    ? ['月','火','水','木','金','土','日']
    : ['T2','T3','T4','T5','T6','T7','CN'];

  const first = new Date(_calYear, _calMonth, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(_calYear, _calMonth + 1, 0).getDate();
  const todayYMD = toYMD(new Date());

  let cells = dow.map(d => `<div class="cal-dow">${d}</div>`).join('');
  for (let i = 0; i < offset; i++) cells += `<div class="cal-cell empty-cell"></div>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(_calYear, _calMonth, day);
    const ymd = toYMD(date);
    const dayMtgs = meetingsOn(ymd).slice()
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    const cls = ['cal-cell'];
    if (ymd === todayYMD) cls.push('today');
    if (ymd < todayYMD) cls.push('past');
    if (ymd === _selDate) cls.push('selected');

    const MAX_SHOW = 3;
    let eventsHtml = dayMtgs.slice(0, MAX_SHOW).map(m =>
      `<div class="cal-event" title="${escapeHtml(m.startTime)}–${escapeHtml(m.endTime)} ${escapeHtml(m.title)}">
         <span class="cal-event-time">${escapeHtml(m.startTime)}</span> ${escapeHtml(m.title)}
       </div>`).join('');
    if (dayMtgs.length > MAX_SHOW) {
      eventsHtml += `<div class="cal-more">+${dayMtgs.length - MAX_SHOW} ${LANG === 'ja' ? '件' : 'nữa'}</div>`;
    }

    cells += `<div class="${cls.join(' ')}" data-ymd="${ymd}">
                <span class="cal-num">${day}</span>
                <div class="cal-events">${eventsHtml}</div>
              </div>`;
  }

  card.innerHTML = `
    <div class="cal-head">
      <h3>${monthNames[_calMonth]} ${_calYear}</h3>
      <div class="cal-nav">
        <button id="cal-prev" title="${LANG === 'ja' ? '前月' : 'Tháng trước'}">‹</button>
        <button id="cal-next" title="${LANG === 'ja' ? '翌月' : 'Tháng sau'}">›</button>
      </div>
    </div>
    <div class="cal-grid">${cells}</div>`;

  document.getElementById('cal-prev').addEventListener('click', () => {
    _calMonth--; if (_calMonth < 0) { _calMonth = 11; _calYear--; }
    renderCalendar();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    _calMonth++; if (_calMonth > 11) { _calMonth = 0; _calYear++; }
    renderCalendar();
  });
  card.querySelectorAll('.cal-cell[data-ymd]').forEach(c => {
    c.addEventListener('click', () => selectDay(c.dataset.ymd));
  });
}

function selectDay(ymd) {
  _selDate = ymd;
  _selStart = null; _selEnd = null;
  _editId = null;                         // đổi ngày thì thoát chế độ chỉnh sửa
  renderCalendar();
  renderBookPanel();
}

function renderBookPanel() {
  const panel = document.getElementById('book-panel');

  if (!_selDate) {
    panel.innerHTML = `
      <h3>${t('meetingTitle')}</h3>
      <div class="empty" style="padding:40px 8px;">
        <span class="ico">📅</span>
        <p>${t('selectDay')}</p>
      </div>`;
    return;
  }

  const todayYMD = toYMD(new Date());
  const isPast = _selDate < todayYMD;
  const dayMeetings = meetingsOn(_selDate).slice()
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  let slotHtml = '';
  if (isPast) {
    slotHtml = `<p class="muted-note">${t('cannotBookPast')}</p>`;
  } else {
    const editing = _editId ? dayMeetings.find(m => m.id === _editId) : null;
    const startSel = editing ? hhmmToMin(editing.startTime) : 8 * 60;
    const endSel = editing ? hhmmToMin(editing.endTime) : 9 * 60;
    const titleVal = editing ? escapeHtml(editing.title) : '';
    const descVal = editing ? escapeHtml(editing.description || '') : '';
    const tagOpts = MEETING_TAGS.map(tg => `<option value="${tg}">`).join('');
    slotHtml = `
      ${editing ? `<div class="edit-banner">✏️ ${t('editMeeting')}: <b>${escapeHtml(editing.title)}</b></div>` : ''}
      <div class="field time-range-row">
        <div class="time-field">
          <label for="mtg-start">${t('startTime')}</label>
          <select id="mtg-start">${timeOptions(SLOT_START_MIN, SLOT_END_MIN - SLOT_STEP, startSel)}</select>
        </div>
        <span class="time-sep">–</span>
        <div class="time-field">
          <label for="mtg-end">${t('endTime')}</label>
          <select id="mtg-end">${timeOptions(SLOT_START_MIN + SLOT_STEP, SLOT_END_MIN, endSel)}</select>
        </div>
      </div>
      <div class="field">
        <label for="mtg-title">${t('meetingTitleLabel')}</label>
        <input type="text" id="mtg-title" maxlength="250" placeholder="${t('meetingTitleLabel')}" value="${titleVal}" list="mtg-tag-list" />
        <datalist id="mtg-tag-list">${tagOpts}</datalist>
      </div>
      <div class="field">
        <label for="mtg-desc">${t('desc')}</label>
        <textarea id="mtg-desc" style="min-height:70px;" placeholder="${t('nothing')}">${descVal}</textarea>
      </div>
      <div class="book-actions">
        <button class="btn btn-primary" id="mtg-book" style="flex:1; justify-content:center;">${editing ? t('saveMeetingChanges') : t('book')}</button>
        ${editing ? `<button class="btn" id="mtg-cancel-edit" type="button" style="justify-content:center;">${t('cancelEdit')}</button>` : ''}
      </div>`;
  }

  const me = getUser();
  let listHtml = '';
  if (dayMeetings.length) {
    listHtml = dayMeetings.map(m => {
      const canMod = me && me.userId === m.createdById;
      return `
        <div class="mtg${m.id === _editId ? ' editing' : ''}">
          <div class="mtg-time">${escapeHtml(m.startTime)} – ${escapeHtml(m.endTime)}</div>
          <div class="mtg-title">${escapeHtml(m.title)}</div>
          ${m.description ? `<div class="mtg-by">${escapeHtml(m.description)}</div>` : ''}
          <div class="mtg-by">${t('meetingInfo')} ${escapeHtml(m.createdByName)}</div>
          ${canMod ? `<div class="mtg-actions">
            ${!isPast ? `<button class="btn btn-sm" data-editmtg="${m.id}">✏️ ${t('editMeeting')}</button>` : ''}
            <button class="btn btn-danger btn-sm" data-delmtg="${m.id}">🗑 ${LANG === 'ja' ? 'キャンセル' : 'Huỷ lịch'}</button>
          </div>` : ''}
        </div>`;
    }).join('');
  } else {
    listHtml = `<p class="muted-note">${t('noMeeting')}</p>`;
  }

  panel.innerHTML = `
    <h3>${t('meetingTitle')}</h3>
    <div class="book-date">📌 ${formatDate(_selDate)}</div>
    ${slotHtml}
    <div class="day-meetings">
      <h4>${t('meetingsToday')} (${dayMeetings.length})</h4>
      ${listHtml}
    </div>`;

  const bookBtn = document.getElementById('mtg-book');
  if (bookBtn) bookBtn.addEventListener('click', submitMeeting);
  const cancelEditBtn = document.getElementById('mtg-cancel-edit');
  if (cancelEditBtn) cancelEditBtn.addEventListener('click', cancelEditMeeting);
  let prevInputVal = '';
  const titleInput = document.getElementById('mtg-title');
  if (titleInput) {
    titleInput.addEventListener('input', function mtgTagInput() {
      const tag = MEETING_TAGS.find(t => t === this.value);
      if (tag && prevInputVal && !this.value.startsWith(prevInputVal)) {
        applyTitleTag(tag, prevInputVal);
      }
      prevInputVal = this.value;
    });
  }
  panel.querySelectorAll('[data-editmtg]').forEach(b =>
    b.addEventListener('click', () => startEditMeeting(b.dataset.editmtg)));
  panel.querySelectorAll('[data-delmtg]').forEach(b =>
    b.addEventListener('click', () => deleteMeeting(b.dataset.delmtg)));
}

// Chọn tag từ datalist -> chèn/thay tiền tố "CODE - " ở đầu tiêu đề
function applyTitleTag(tag, baseVal) {
  const input = document.getElementById('mtg-title');
  if (!input) return;
  let v = baseVal !== undefined ? baseVal : input.value;
  for (const tg of MEETING_TAGS) {
    const pre = tg + ' - ';
    if (v.startsWith(pre)) { v = v.slice(pre.length); break; }
  }
  input.value = tag + ' - ' + v;
  input.focus();
  const len = input.value.length;
  try { input.setSelectionRange(len, len); } catch (e) { /* bỏ qua */ }
}

// Vào chế độ sửa: nạp dữ liệu cuộc họp vào form đặt lịch
function startEditMeeting(id) {
  const m = _meetings.find(x => x.id === id);
  if (!m) return;
  _editId = id;
  _selDate = toYMD(new Date(m.meetingDate));
  renderCalendar();
  renderBookPanel();
  const el = document.getElementById('mtg-title');
  if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}

function cancelEditMeeting() {
  _editId = null;
  renderBookPanel();
}

function slotMinutes(i) { return SLOT_START_MIN + i * SLOT_STEP; }
function slotLabel(i) { return minToHHMM(slotMinutes(i)); }
function slotEndLabel(i) { return minToHHMM(slotMinutes(i) + SLOT_STEP); }
function minToHHMM(m) {
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}
function hhmmToMin(s) {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}

function timeOptions(fromMin, toMin, selectedMin) {
  let html = '';
  for (let m = fromMin; m <= toMin; m += SLOT_STEP) {
    const label = minToHHMM(m);
    html += `<option value="${label}"${m === selectedMin ? ' selected' : ''}>${label}</option>`;
  }
  return html;
}

function isSlotBusy(i, dayMeetings) {
  const bStart = slotMinutes(i);
  const bEnd = bStart + SLOT_STEP;
  return dayMeetings.some(m => {
    const mStart = hhmmToMin(m.startTime);
    const mEnd = hhmmToMin(m.endTime);
    return bStart < mEnd && mStart < bEnd;
  });
}

function toggleSlot(i, dayMeetings) {
  if (_selStart === null) {
    _selStart = i; _selEnd = i;
  } else if (i > _selEnd) {
    let ok = true;
    for (let k = _selStart; k <= i; k++) if (isSlotBusy(k, dayMeetings)) { ok = false; break; }
    if (ok) _selEnd = i;
    else { _selStart = i; _selEnd = i; showToast('Khoảng chọn có khung giờ đã bị đặt.', 'err'); }
  } else {
    _selStart = i; _selEnd = i;
  }
  renderBookPanel();
}

async function submitMeeting() {
  const title = document.getElementById('mtg-title').value.trim();
  const desc = document.getElementById('mtg-desc').value.trim();
  const startTime = document.getElementById('mtg-start').value;
  const endTime = document.getElementById('mtg-end').value;

  if (!startTime || !endTime) { showToast(t('timeRangeErr'), 'err'); return; }

  const sMin = hhmmToMin(startTime);
  const eMin = hhmmToMin(endTime);

  if (sMin < SLOT_START_MIN || eMin > SLOT_END_MIN) {
    showToast(t('timeRangeErr'), 'err'); return;
  }
  if (eMin <= sMin) {
    showToast(t('endAfterStart'), 'err'); return;
  }
  if ((eMin - sMin) < 30) {
    showToast(t('minDuration'), 'err'); return;
  }
  if (!title) { showToast(t('noTitle'), 'err'); return; }

  // Bỏ qua chính cuộc họp đang sửa khi kiểm tra trùng giờ
  const dayMeetings = meetingsOn(_selDate).filter(m => m.id !== _editId);
  const conflict = dayMeetings.find(m => {
    const mS = hhmmToMin(m.startTime);
    const mE = hhmmToMin(m.endTime);
    return sMin < mE && mS < eMin;
  });
  if (conflict) {
    showToast(`${t('conflictWith')} "${conflict.title}" (${conflict.startTime} – ${conflict.endTime}).`, 'err');
    return;
  }

  const payload = {
    title,
    description: desc,
    meetingDate: _selDate,
    startTime,
    endTime
  };

  const isEdit = !!_editId;
  const btn = document.getElementById('mtg-book');
  btn.disabled = true; btn.textContent = isEdit ? t('saving') : t('booking');
  try {
    if (isEdit) {
      await api('/api/meeting/' + _editId, { method: 'PUT', body: payload });
    } else {
      await api('/api/meeting', { method: 'POST', body: payload });
    }
    showToast(isEdit ? t('meetingUpdated') : t('booked'), 'ok');
    _editId = null;
    _selStart = null; _selEnd = null;
    _meetings = await api('/api/meeting');
    refreshReminderCache(_meetings);
    renderCalendar();
    renderBookPanel();
  } catch (err) {
    showToast(err.message, 'err');
    if (btn) { btn.disabled = false; btn.textContent = isEdit ? t('saveMeetingChanges') : t('book'); }
  }
}

function deleteMeeting(id) {
  openModal(t('cancelMeeting'),
    '<p>' + t('cancelMeetingConfirm') + '</p>',
    `<button class="btn" onclick="closeModal()">${t('close')}</button>
     <button class="btn btn-primary" id="confirm-del-mtg">${t('cancelMeeting')}</button>`);
  document.getElementById('confirm-del-mtg').addEventListener('click', async () => {
    try {
      await api('/api/meeting/' + id, { method: 'DELETE' });
      closeModal();
      showToast(t('meetingCancelled'), 'ok');
      if (_editId === id) _editId = null;
      _meetings = await api('/api/meeting');
      refreshReminderCache(_meetings);
      renderCalendar();
      renderBookPanel();
    } catch (err) { showToast(err.message, 'err'); }
  });
}

/* =========================================================================
   Nhắc lịch họp — trong ~20 phút trước giờ bắt đầu, hiện toast khoảng 5 phút/lần
   (tại các mốc ~20 / 15 / 10 / 5 phút). Chạy toàn site, độc lập với tab đang mở.
   ========================================================================= */
let _remTimer = null;
let _remMeetings = [];
let _remBuckets = new Set();   // 'id@bucket' đã nhắc, để mỗi mốc 5 phút chỉ nhắc 1 lần
let _remTick = 0;

function refreshReminderCache(list) {
  _remMeetings = Array.isArray(list) ? list : [];
}

async function loadReminderMeetings() {
  try { _remMeetings = await api('/api/meeting'); } catch (e) { /* bỏ qua lỗi mạng tạm thời */ }
}

// Ghép ngày họp + giờ bắt đầu thành mốc thời gian (giờ địa phương = giờ VN của máy)
function meetingStartDate(m) {
  const ymd = toYMD(new Date(m.meetingDate));
  const [Y, Mo, D] = ymd.split('-').map(Number);
  const [h, mi] = (m.startTime || '00:00').split(':').map(Number);
  return new Date(Y, Mo - 1, D, h, mi, 0, 0);
}

function checkMeetingReminders() {
  const now = Date.now();
  for (const m of _remMeetings) {
    const minsUntil = Math.round((meetingStartDate(m).getTime() - now) / 60000);
    if (minsUntil > 0 && minsUntil <= 20) {
      const bucket = Math.ceil(minsUntil / 5);          // 4,3,2,1 -> ~mỗi 5 phút một lần
      const key = m.id + '@' + bucket;
      if (!_remBuckets.has(key)) {
        _remBuckets.add(key);
        const msg = `⏰ ${t('reminderSoon')}: "${m.title}" — ${m.startTime} (${t('reminderInMin').replace('{n}', minsUntil)})`;
        showToast(msg, 'remind', 20000);                // hiện lâu hơn toast thường
        if (typeof addNotif === 'function') addNotif({  // lưu vào chuông thông báo
          key: 'mtg:' + key, type: 'meeting', view: 'meeting',
          title: t('reminderSoon') + ': ' + m.title,
          body: m.startTime + ' — ' + t('reminderInMin').replace('{n}', minsUntil)
        });
      }
    }
  }
}

async function startMeetingReminders() {
  if (_remTimer) return;
  await loadReminderMeetings();
  checkMeetingReminders();
  _remTimer = setInterval(() => {
    _remTick++;
    if (_remTick % 5 === 0) loadReminderMeetings();      // làm mới danh sách ~5 phút/lần
    checkMeetingReminders();
  }, 60 * 1000);
}
