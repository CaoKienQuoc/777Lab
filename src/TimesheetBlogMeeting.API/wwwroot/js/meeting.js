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

function initMeeting() {
  const now = new Date();
  _calYear = now.getFullYear();
  _calMonth = now.getMonth();
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
    slotHtml = `
      <div class="field time-range-row">
        <div class="time-field">
          <label for="mtg-start">${t('startTime')}</label>
          <select id="mtg-start">${timeOptions(SLOT_START_MIN, SLOT_END_MIN - SLOT_STEP, 8 * 60)}</select>
        </div>
        <span class="time-sep">–</span>
        <div class="time-field">
          <label for="mtg-end">${t('endTime')}</label>
          <select id="mtg-end">${timeOptions(SLOT_START_MIN + SLOT_STEP, SLOT_END_MIN, 9 * 60)}</select>
        </div>
      </div>
      <div class="field">
        <label for="mtg-title">${t('meetingTitleLabel')}</label>
        <input type="text" id="mtg-title" maxlength="250" placeholder="${t('meetingTitleLabel')}" />
      </div>
      <div class="field">
        <label for="mtg-desc">${t('desc')}</label>
        <textarea id="mtg-desc" style="min-height:70px;" placeholder="${t('nothing')}"></textarea>
      </div>
      <button class="btn btn-primary" id="mtg-book" style="width:100%; justify-content:center;">${t('book')}</button>`;
  }

  const me = getUser();
  let listHtml = '';
  if (dayMeetings.length) {
    listHtml = dayMeetings.map(m => {
      const canDel = me && me.userId === m.createdById;
      return `
        <div class="mtg">
          <div class="mtg-time">${escapeHtml(m.startTime)} – ${escapeHtml(m.endTime)}</div>
          <div class="mtg-title">${escapeHtml(m.title)}</div>
          ${m.description ? `<div class="mtg-by">${escapeHtml(m.description)}</div>` : ''}
          <div class="mtg-by">${t('meetingInfo')} ${escapeHtml(m.createdByName)}</div>
          ${canDel ? `<div class="mtg-actions">
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
  if (bookBtn) bookBtn.addEventListener('click', bookMeeting);
  panel.querySelectorAll('[data-delmtg]').forEach(b =>
    b.addEventListener('click', () => deleteMeeting(b.dataset.delmtg)));
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

async function bookMeeting() {
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

  const dayMeetings = meetingsOn(_selDate);
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

  const btn = document.getElementById('mtg-book');
  btn.disabled = true; btn.textContent = t('booking');
  try {
    await api('/api/meeting', { method: 'POST', body: payload });
    showToast(t('booked'), 'ok');
    _selStart = null; _selEnd = null;
    _meetings = await api('/api/meeting');
    renderCalendar();
    renderBookPanel();
  } catch (err) {
    showToast(err.message, 'err');
    if (btn) { btn.disabled = false; btn.textContent = t('book'); }
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
      _meetings = await api('/api/meeting');
      renderCalendar();
      renderBookPanel();
    } catch (err) { showToast(err.message, 'err'); }
  });
}
