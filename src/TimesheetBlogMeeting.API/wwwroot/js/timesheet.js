/* =========================================================================
   timesheet.js — Chấm công: import báo cáo máy chấm công, xem theo từng người
   ========================================================================= */

const EMPTY_TS = (admin) => `
  <div class="card"><div class="empty">
    <span class="ico">🗓️</span>
    <p><b>${t('noTimesheet')}</b></p>
    <p>${admin ? t('tsAdminHint') : t('tsUserHint')}</p>
  </div></div>`;

let tsPeople = [];        // [{ id, name, stats:[{label,value}], days:[{date,weekday,checkIn,checkOut,status}] }]
let tsSelectedId = '';

function initTimesheet() {
  const actions = document.getElementById('timesheet-actions');

  if (isAdmin()) {
    actions.innerHTML = `
      <input type="file" id="ts-import-file" accept=".xlsx" class="hidden" />
      <button class="btn btn-dark" id="ts-import">${t('importExcel')}</button>
      <button class="btn" id="ts-export">${t('exportExcel')}</button>`;
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
    // Giữ người đang chọn nếu còn tồn tại, ngược lại chọn người đầu
    if (!tsPeople.some(p => p.id === tsSelectedId)) tsSelectedId = tsPeople[0] ? tsPeople[0].id : '';
    buildPersonSelect();
    renderTimesheet();
  } catch (err) {
    box.innerHTML = '';
    showToast(err.message, 'err');
  }
}

// Combobox chọn nhân viên (thay cho ô tìm kiếm)
function buildPersonSelect() {
  const container = document.getElementById('ts-search-container');
  if (!container) return;
  if (!tsPeople.length) { container.innerHTML = ''; return; }

  const opts = tsPeople.map(p =>
    `<option value="${p.id}"${p.id === tsSelectedId ? ' selected' : ''}>${escapeHtml(p.name)}</option>`).join('');
  container.innerHTML =
    `<select id="ts-person-select" class="ts-search-input" style="width:auto;min-width:200px;">${opts}</select>`;

  const sel = document.getElementById('ts-person-select');
  sel.addEventListener('change', () => { tsSelectedId = sel.value; renderTimesheet(); });
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

  const stats = (person.stats || []).map(s =>
    `<div class="ts-stat"><span class="k">${escapeHtml(s.label)}</span><span class="v">${escapeHtml(s.value)}</span></div>`).join('');

  const days = person.days || [];
  const rows = days.map((d, i) => `
    <tr>
      <td class="num">${i + 1}</td>
      <td>${escapeHtml(shortDate(d.date))}</td>
      <td>${escapeHtml(d.weekday || '')}</td>
      <td>${escapeHtml(d.checkIn || '—')}</td>
      <td>${escapeHtml(d.checkOut || '—')}</td>
      <td>${d.status ? `<span class="ts-status">${escapeHtml(d.status)}</span>` : ''}</td>
    </tr>`).join('');

  box.innerHTML = `
    ${stats ? `<div class="card ts-stats">${stats}</div>` : ''}
    <div class="card"><div class="table-wrap">
      <table class="data">
        <thead><tr>
          <th class="num">#</th><th>${t('date')}</th><th>${t('weekday')}</th>
          <th>${t('timeIn')}</th><th>${t('timeOut')}</th><th>${t('status')}</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="6" class="empty">' + t('noTimesheetMatch') + '</td></tr>'}</tbody>
      </table>
    </div></div>`;
}

// "2026-05-01" -> "01/05"
function shortDate(ymd) {
  const p = (ymd || '').split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}` : (ymd || '');
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
