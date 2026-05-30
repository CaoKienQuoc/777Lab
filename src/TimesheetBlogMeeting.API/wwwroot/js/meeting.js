/* =========================================================================
   meeting.js — Mục 3: Đăng ký lịch họp
   Lịch tháng tự dựng + lưới khung giờ 30 phút (08:00–18:00) để chọn giờ họp.
   ========================================================================= */

const SLOT_START_MIN = 8 * 60;   // 08:00
const SLOT_END_MIN   = 18 * 60;  // 18:00
const SLOT_STEP      = 30;       // 30 phút
const SLOT_COUNT     = (SLOT_END_MIN - SLOT_START_MIN) / SLOT_STEP; // 20

let _meetings = [];
let _calYear, _calMonth;     // tháng đang hiển thị
let _selDate = null;         // ngày đang chọn "YYYY-MM-DD"
let _selStart = null;        // chỉ số ô bắt đầu
let _selEnd = null;          // chỉ số ô kết thúc (bao gồm)

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

/* ---------- Lịch tháng ---------- */
function meetingsOn(ymd) {
  return _meetings.filter(m => toYMD(new Date(m.meetingDate)) === ymd);
}

function renderCalendar() {
  const card = document.getElementById('cal-card');
  const monthNames = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                      'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
  const dow = ['T2','T3','T4','T5','T6','T7','CN'];

  const first = new Date(_calYear, _calMonth, 1);
  const offset = (first.getDay() + 6) % 7;       // thứ 2 đứng đầu
  const daysInMonth = new Date(_calYear, _calMonth + 1, 0).getDate();
  const todayYMD = toYMD(new Date());

  let cells = dow.map(d => `<div class="cal-dow">${d}</div>`).join('');
  for (let i = 0; i < offset; i++) cells += `<div class="cal-cell empty-cell"></div>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(_calYear, _calMonth, day);
    const ymd = toYMD(date);
    const cnt = meetingsOn(ymd).length;
    const cls = ['cal-cell'];
    if (ymd === todayYMD) cls.push('today');
    if (ymd < todayYMD) cls.push('past');
    if (ymd === _selDate) cls.push('selected');
    const badge = cnt ? `<span class="cal-badge">${cnt}</span>` : '';
    cells += `<div class="${cls.join(' ')}" data-ymd="${ymd}">
                <span class="cal-num">${day}</span>${badge}
              </div>`;
  }

  card.innerHTML = `
    <div class="cal-head">
      <h3>${monthNames[_calMonth]} ${_calYear}</h3>
      <div class="cal-nav">
        <button id="cal-prev" title="Tháng trước">‹</button>
        <button id="cal-next" title="Tháng sau">›</button>
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

/* ---------- Bảng đặt lịch (panel phải) ---------- */
function renderBookPanel() {
  const panel = document.getElementById('book-panel');

  if (!_selDate) {
    panel.innerHTML = `
      <h3>Đặt lịch họp</h3>
      <div class="empty" style="padding:40px 8px;">
        <span class="ico">📅</span>
        <p>Chọn một ngày trên lịch để xem khung giờ và đặt lịch họp.</p>
      </div>`;
    return;
  }

  const todayYMD = toYMD(new Date());
  const isPast = _selDate < todayYMD;
  const dayMeetings = meetingsOn(_selDate).slice()
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Form nhập giờ
  let slotHtml = '';
  if (isPast) {
    slotHtml = `<p class="muted-note">Không thể đặt lịch cho ngày đã qua. Bạn vẫn có thể xem các cuộc họp bên dưới.</p>`;
  } else {
    slotHtml = `
      <div class="field time-range-row">
        <div class="time-field">
          <label for="mtg-start">Giờ bắt đầu</label>
          <input type="time" id="mtg-start" min="08:00" max="17:30" step="1800" value="08:00" />
        </div>
        <span class="time-sep">–</span>
        <div class="time-field">
          <label for="mtg-end">Giờ kết thúc</label>
          <input type="time" id="mtg-end" min="08:30" max="18:00" step="1800" value="09:00" />
        </div>
      </div>
      <div class="field">
        <label for="mtg-title">Tiêu đề cuộc họp</label>
        <input type="text" id="mtg-title" maxlength="250" placeholder="VD: Họp giao ban tuần" />
      </div>
      <div class="field">
        <label for="mtg-desc">Mô tả (tuỳ chọn)</label>
        <textarea id="mtg-desc" style="min-height:70px;" placeholder="Nội dung, phòng họp, thành phần..."></textarea>
      </div>
      <button class="btn btn-primary" id="mtg-book" style="width:100%; justify-content:center;">Đặt lịch họp</button>`;
  }

  // Danh sách cuộc họp trong ngày
  const me = getUser();
  let listHtml = '';
  if (dayMeetings.length) {
    listHtml = dayMeetings.map(m => {
      const canDel = isAdmin() || (me && me.userId === m.createdById);
      return `
        <div class="mtg">
          <div class="mtg-time">${escapeHtml(m.startTime)} – ${escapeHtml(m.endTime)}</div>
          <div class="mtg-title">${escapeHtml(m.title)}</div>
          ${m.description ? `<div class="mtg-by">${escapeHtml(m.description)}</div>` : ''}
          <div class="mtg-by">Người đặt: ${escapeHtml(m.createdByName)}</div>
          ${canDel ? `<div class="mtg-actions">
            <button class="btn btn-danger btn-sm" data-delmtg="${m.id}">🗑 Huỷ lịch</button>
          </div>` : ''}
        </div>`;
    }).join('');
  } else {
    listHtml = `<p class="muted-note">Chưa có cuộc họp nào trong ngày này.</p>`;
  }

  panel.innerHTML = `
    <h3>Đặt lịch họp</h3>
    <div class="book-date">📌 ${formatDate(_selDate)}</div>
    ${slotHtml}
    <div class="day-meetings">
      <h4>Cuộc họp trong ngày (${dayMeetings.length})</h4>
      ${listHtml}
    </div>`;

  const bookBtn = document.getElementById('mtg-book');
  if (bookBtn) bookBtn.addEventListener('click', bookMeeting);
  panel.querySelectorAll('[data-delmtg]').forEach(b =>
    b.addEventListener('click', () => deleteMeeting(b.dataset.delmtg)));
}

/* ---------- Logic khung giờ ---------- */
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

function isSlotBusy(i, dayMeetings) {
  const bStart = slotMinutes(i);
  const bEnd = bStart + SLOT_STEP;
  return dayMeetings.some(m => {
    const mStart = hhmmToMin(m.startTime);
    const mEnd = hhmmToMin(m.endTime);
    return bStart < mEnd && mStart < bEnd;   // có giao nhau
  });
}

function toggleSlot(i, dayMeetings) {
  if (_selStart === null) {
    _selStart = i; _selEnd = i;
  } else if (i > _selEnd) {
    // mở rộng vùng chọn nếu tất cả các ô ở giữa đều trống
    let ok = true;
    for (let k = _selStart; k <= i; k++) if (isSlotBusy(k, dayMeetings)) { ok = false; break; }
    if (ok) _selEnd = i;
    else { _selStart = i; _selEnd = i; showToast('Khoảng chọn có khung giờ đã bị đặt.', 'err'); }
  } else {
    // bấm lại / bấm ô trước đó -> đặt lại
    _selStart = i; _selEnd = i;
  }
  renderBookPanel();
}

async function bookMeeting() {
  const title = document.getElementById('mtg-title').value.trim();
  const desc = document.getElementById('mtg-desc').value.trim();
  const startTime = document.getElementById('mtg-start').value;
  const endTime = document.getElementById('mtg-end').value;

  if (!startTime || !endTime) { showToast('Vui lòng nhập giờ bắt đầu và giờ kết thúc.', 'err'); return; }

  const sMin = hhmmToMin(startTime);
  const eMin = hhmmToMin(endTime);

  if (sMin < SLOT_START_MIN || eMin > SLOT_END_MIN) {
    showToast('Thời gian họp phải nằm trong khoảng 08:00 – 18:00.', 'err'); return;
  }
  if (eMin <= sMin) {
    showToast('Giờ kết thúc phải sau giờ bắt đầu.', 'err'); return;
  }
  if ((eMin - sMin) < 30) {
    showToast('Thời lượng họp tối thiểu 30 phút.', 'err'); return;
  }
  if (!title) { showToast('Vui lòng nhập tiêu đề cuộc họp.', 'err'); return; }

  // Kiểm tra trùng lịch với các cuộc họp đã có
  const dayMeetings = meetingsOn(_selDate);
  const conflict = dayMeetings.find(m => {
    const mS = hhmmToMin(m.startTime);
    const mE = hhmmToMin(m.endTime);
    return sMin < mE && mS < eMin;
  });
  if (conflict) {
    showToast(`Trùng lịch với cuộc họp "${conflict.title}" (${conflict.startTime} – ${conflict.endTime}).`, 'err');
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
  btn.disabled = true; btn.textContent = 'Đang đặt lịch...';
  try {
    await api('/api/meeting', { method: 'POST', body: payload });
    showToast('Đã đặt lịch họp thành công.', 'ok');
    _selStart = null; _selEnd = null;
    _meetings = await api('/api/meeting');
    renderCalendar();
    renderBookPanel();
  } catch (err) {
    // 409 = trùng lịch -> err.message đã chứa thông tin cuộc họp bị trùng
    showToast(err.message, 'err');
    if (btn) { btn.disabled = false; btn.textContent = 'Đặt lịch họp'; }
  }
}

function deleteMeeting(id) {
  openModal('Huỷ lịch họp',
    '<p>Bạn có chắc muốn huỷ cuộc họp này?</p>',
    `<button class="btn" onclick="closeModal()">Đóng</button>
     <button class="btn btn-primary" id="confirm-del-mtg">Huỷ lịch</button>`);
  document.getElementById('confirm-del-mtg').addEventListener('click', async () => {
    try {
      await api('/api/meeting/' + id, { method: 'DELETE' });
      closeModal();
      showToast('Đã huỷ cuộc họp.', 'ok');
      _meetings = await api('/api/meeting');
      renderCalendar();
      renderBookPanel();
    } catch (err) { showToast(err.message, 'err'); }
  });
}
