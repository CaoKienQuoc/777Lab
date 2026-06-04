/* =========================================================================
   timesheet.js — Chấm công: import báo cáo máy chấm công, xem theo từng người
   ========================================================================= */

const EMPTY_TS = (admin) => `
  <div class="card"><div class="empty">
    <span class="ico">🗓️</span>
    <p><b>${t('noTimesheet')}</b></p>
    <p>${admin ? t('tsAdminHint') : t('tsUserHint')}</p>
  </div></div>`;

let tsPeople = [];
let tsSelectedId = '';
let tsSelectedMonth = '';

// Các stat ẩn khỏi dải thống kê (theo yêu cầu)
const HIDDEN_STATS = new Set(['Giờ tăng ca', 'Nghỉ (ngày)', 'Công tác (ngày)']);

// Dịch nhãn thống kê (tiếng Việt) sang ngôn ngữ đang chọn; vi/khác giữ nguyên.
const TS_STAT_JA = {
  'Ngày làm': '勤務日', 'Ngày check-in': '出勤日', 'Đi muộn': '遅刻', 'Nghỉ sớm': '早退',
  'Ngày vắng': '欠勤', 'Giờ tăng ca': '残業時間', 'Nghỉ (ngày)': '休暇(日)', 'Công tác (ngày)': '出張(日)'
};
function tsStatLabel(label) {
  return (LANG === 'ja' && TS_STAT_JA[label]) ? TS_STAT_JA[label] : label;
}

// Bản dịch DỮ LIỆU trong bảng sang tiếng Nhật (chỉ hiển thị; dữ liệu gốc giữ nguyên để logic không sai).
const TS_WEEKDAY_JA = {
  'Thứ hai': '月曜日', 'Thứ ba': '火曜日', 'Thứ tư': '水曜日', 'Thứ năm': '木曜日',
  'Thứ sáu': '金曜日', 'Thứ bảy': '土曜日', 'Chủ nhật': '日曜日'
};
const TS_TERM_JA = {
  'đi muộn': '遅刻', 'về sớm': '早退', 'LỄ': '祝日',
  'Off': '休み', 'Off sáng': '午前休', 'Off chiều': '午後休'
};
function tsTrWeekday(w) {
  if (LANG !== 'ja') return w || '';
  return TS_WEEKDAY_JA[(w || '').trim()] || (w || '');
}
function tsTrStatus(status) {
  if (!status || LANG !== 'ja') return status || '';
  return status.split(', ').map(p => TS_TERM_JA[p] || p).join(', ');
}
function tsTrCell(v) {
  if (LANG !== 'ja' || !v) return v;
  const u = v.trim().toUpperCase();
  if (u === 'LỄ') return '祝日';
  if (u.startsWith('OFF')) return '休み';
  return v;
}

function initTimesheet() {
  const actions = document.getElementById('timesheet-actions');
  if (isAdmin()) {
    actions.innerHTML = `
      <input type="file" id="ts-import-file" accept=".xlsx" class="hidden" />
      <button class="btn btn-dark" id="ts-import">${t('importExcel')}</button>
      <button class="btn btn-pri" id="ts-export">${t('exportExcel')}</button>`;
    document.getElementById('ts-export').addEventListener('click', exportTimesheet);
    document.getElementById('ts-import').addEventListener('click', () =>
      document.getElementById('ts-import-file').click());
    document.getElementById('ts-import-file').addEventListener('change', importTimesheet);
  } else {
    actions.innerHTML = `<button class="btn btn-dark" id="ts-export">${t('exportExcelSm')}</button>`;
    document.getElementById('ts-export').addEventListener('click', exportTimesheet);
  }
}

async function loadTimesheet() {
  const box = document.getElementById('timesheet-container');
  box.innerHTML = '<div class="spinner"></div>';
  try {
    tsPeople = await api('/api/timesheet') || [];
    if (!tsPeople.some(p => p.id === tsSelectedId)) tsSelectedId = tsPeople[0] ? tsPeople[0].id : '';
    buildPersonSelect();
    renderTimesheet();
  } catch (err) {
    box.innerHTML = '';
    showToast(err.message, 'err');
  }
}

// Combobox chọn nhân viên + lọc theo tháng
function buildPersonSelect() {
  const container = document.getElementById('ts-search-container');
  if (!container) return;
  if (!tsPeople.length) { container.innerHTML = ''; return; }

  const peopleOpts = tsPeople.map(p =>
    `<option value="${p.id}"${p.id === tsSelectedId ? ' selected' : ''}>${escapeHtml(p.name)}</option>`).join('');

  const monthOpts = [`<option value=""${tsSelectedMonth === '' ? ' selected' : ''}>${t('allMonths')}</option>`]
    .concat(Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const label = LANG === 'ja' ? `${m}月` : `${t('monthWord')} ${m}`;
      return `<option value="${m}"${String(m) === String(tsSelectedMonth) ? ' selected' : ''}>${label}</option>`;
    })).join('');

  container.innerHTML = `
    <select id="ts-person-select" class="ts-search-input" style="width:auto;min-width:200px;">${peopleOpts}</select>
    <select id="ts-month-select" class="ts-search-input" style="width:auto;min-width:130px;">${monthOpts}</select>`;

  const personSel = document.getElementById('ts-person-select');
  personSel.addEventListener('change', () => { tsSelectedId = personSel.value; renderTimesheet(); });
  const monthSel = document.getElementById('ts-month-select');
  monthSel.addEventListener('change', () => { tsSelectedMonth = monthSel.value; renderTimesheet(); });
}

function renderTimesheet() {
  const box = document.getElementById('timesheet-container');
  const admin = isAdmin();
  if (!tsPeople.length) {
    box.innerHTML = EMPTY_TS(admin);
    return;
  }

  const person = tsPeople.find(p => p.id === tsSelectedId) || tsPeople[0];
  tsSelectedId = person.id;

  // Tính lại Ngày làm / Ngày vắng trên toàn bộ dữ liệu của người này.
  const recomputed = tsRecomputeStats(person.days || []);
  const stats = (person.stats || [])
    .filter(s => !HIDDEN_STATS.has(s.label))
    .map(s => {
      let value = s.value;
      if (s.label === 'Ngày làm') value = String(recomputed.lam);
      else if (s.label === 'Ngày vắng') value = String(recomputed.vang);
      else if (s.label === 'Đi muộn') value = String(recomputed.diMuon);
      else if (s.label === 'Nghỉ sớm') value = String(recomputed.nghiSom);
      return `<div class="ts-stat"><span class="k">${escapeHtml(tsStatLabel(s.label))}</span><span class="v">${escapeHtml(value)}</span></div>`;
    }).join('');

  let days = person.days || [];
  if (tsSelectedMonth) {
    const mm = parseInt(tsSelectedMonth, 10);
    days = days.filter(d => parseInt((d.date || '').split('-')[1], 10) === mm);
  }

  const rows = days.map((d, i) => {
    const st = tsStatus(d);
    return `
    <tr>
      <td class="num">${i + 1}</td>
      <td>${escapeHtml(shortDate(d.date))}</td>
      <td>${escapeHtml(tsTrWeekday(d.weekday))}</td>
      <td>${tsCell(d.morningIn)}</td>
      <td class="ts-grp">${tsCell(d.afternoonOut)}</td>
      <td class="ts-grp">${st ? `<span class="ts-status">${escapeHtml(tsTrStatus(st))}</span>` : ''}</td>
    </tr>`;
  }).join('');

  box.innerHTML = `
    ${stats ? `<div class="card ts-stats">${stats}</div>` : ''}
    <div class="card"><div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th class="num" rowspan="2">${t('seqNo')}</th>
            <th rowspan="2">${t('date')}</th>
            <th rowspan="2">${t('weekday')}</th>
            <th>${t('morning')}</th>
            <th class="ts-grp">${t('afternoon')}</th>
            <th class="ts-grp" rowspan="2">${t('status')}</th>
          </tr>
          <tr>
            <th>${t('clockIn')}</th>
            <th class="ts-grp">${t('clockOut')}</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="6" class="empty">' + t('noTimesheetMatch') + '</td></tr>'}</tbody>
      </table>
    </div></div>`;
}

// "2026-05-01" -> "01/05"
function shortDate(ymd) {
  const p = (ymd || '').split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}` : (ymd || '');
}

// Hiển thị 1 ô buổi: giờ "HH:mm" để thường; nhãn (OFF/LỄ/ghi chú) tô màu; trống = "—".
function tsCell(v) {
  if (!v) return '—';
  return /^\d{1,2}:\d{2}$/.test(v) ? escapeHtml(v) : `<span class="ts-mark">${escapeHtml(tsTrCell(v))}</span>`;
}

// ---- Tiện ích tính toán theo ngày ----
function tsParseMinutes(v) {
  const m = /^(\d{1,2}):(\d{2})$/.exec((v || '').trim());
  return m ? (+m[1]) * 60 + (+m[2]) : null;
}
function tsIsTime(v) { return /^\d{1,2}:\d{2}$/.test((v || '').trim()); }
function tsDayCells(d) { return [d.morningIn, d.morningOut, d.afternoonIn, d.afternoonOut]; }
function tsDayWorked(d) { return tsDayCells(d).some(tsIsTime); }
function tsDayHoliday(d) { return tsDayCells(d).some(c => (c || '').trim().toUpperCase() === 'LỄ'); }
function tsIsWeekend(d) {
  const p = (d.date || '').split('-');
  if (p.length !== 3) return false;
  const dow = new Date(+p[0], +p[1] - 1, +p[2]).getDay(); // 0=CN, 6=T7
  return dow === 0 || dow === 6;
}

// Nhãn OFF theo buổi: cả 2 buổi -> "Off"; chỉ sáng -> "Off sáng"; chỉ chiều -> "Off chiều".
function tsOffLabel(d) {
  const isOff = v => (v || '').trim().toUpperCase().startsWith('OFF');
  const mOff = isOff(d.morningIn) || isOff(d.morningOut);
  const aOff = isOff(d.afternoonIn) || isOff(d.afternoonOut);
  if (mOff && aOff) return 'Off';
  if (mOff) return 'Off sáng';
  if (aOff) return 'Off chiều';
  return '';
}

// Trạng thái: LỄ + OFF theo buổi + đi muộn (vào sáng sau 08:00) + về sớm (ra chiều trước 17:00).
function tsStatus(d) {
  const parts = [];
  if (tsDayHoliday(d)) parts.push('LỄ');
  const off = tsOffLabel(d);
  if (off) parts.push(off);
  const mi = tsParseMinutes(d.morningIn);
  const ao = tsParseMinutes(d.afternoonOut);
  if (mi !== null && mi > 8 * 60) parts.push('đi muộn');
  if (ao !== null && ao < 17 * 60) parts.push('về sớm');
  return parts.join(', ');
}

// Tính lại các stat cho khớp với cột Trạng thái:
//  - Ngày làm  = số ngày T2–T6 trong kỳ (chỉ bỏ T7/CN; ngày lễ vẫn tính).
//  - Ngày vắng = ngày làm việc (T2–T6, không lễ) mà không đi làm và cũng không OFF.
//  - Đi muộn   = số ngày vào làm (sáng) sau 08:00.
//  - Nghỉ sớm  = số ngày ra nghỉ (chiều) trước 17:00.
function tsRecomputeStats(days) {
  let lam = 0, vang = 0, diMuon = 0, nghiSom = 0;
  (days || []).forEach(d => {
    const mi = tsParseMinutes(d.morningIn);
    const ao = tsParseMinutes(d.afternoonOut);
    if (mi !== null && mi > 8 * 60) diMuon++;     // vào sau 08:00
    if (ao !== null && ao < 17 * 60) nghiSom++;   // ra trước 17:00
    if (tsIsWeekend(d)) return;                   // chỉ bỏ Thứ 7 / Chủ nhật
    lam++;                                        // Ngày làm: tính cả ngày lễ
    if (tsDayHoliday(d)) return;                  // ngày lễ không tính là vắng
    if (!tsDayWorked(d) && !tsOffLabel(d)) vang++;
  });
  return { lam, vang, diMuon, nghiSom };
}

async function exportTimesheet() {
  try {
    const blob = await api('/api/timesheet/export');
    downloadBlob(blob, 'BangChamCong.xlsx');
  } catch (err) { showToast(err.message, 'err'); }
}

async function importTimesheet(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';
  openModal(t('importTitle'),
    `<p>${t('tsImportReportHint')}</p>`,
    `<button class="btn" onclick="closeModal()">${t('cancel')}</button>
     <button class="btn btn-primary" id="ts-do-import">${t('startImport')}</button>`);
  document.getElementById('ts-do-import').addEventListener('click', async () => {
    const btn = document.getElementById('ts-do-import');
    btn.disabled = true; btn.textContent = t('importing');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const result = await api('/api/timesheet/import', { method: 'POST', body: fd });
      closeModal();
      showToast(t('importedMsg') + ' ' + result.imported + ' ' + t('tsPeopleUnit') + '.', 'ok');
      loadTimesheet();
    } catch (err) {
      showToast(err.message, 'err');
      btn.disabled = false; btn.textContent = t('startImport');
    }
  });
}
