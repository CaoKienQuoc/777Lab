const EMPTY_TS = (admin) => `
  <div class="card"><div class="empty">
    <span class="ico">🗓️</span>
    <p><b>${t('noTimesheet')}</b></p>
    <p>${admin ? t('tsAdminHint') : t('tsUserHint')}</p>
  </div></div>`;

const EMPTY_TS_FILTERED = () => `
  <div class="card"><div class="empty">
    <span class="ico">🗓️</span>
    <p><b>${t('noTimesheetMatch')}</b></p>
  </div></div>`;

let timesheetRows = [];
let timesheetFilter = '';

function initTimesheet() {
  const actions = document.getElementById('timesheet-actions');

  if (isAdmin()) {
    actions.innerHTML = `
      <input type="file" id="ts-import-file" accept=".xlsx,.xls" class="hidden" />
      <button class="btn btn-primary" id="ts-add">${t('addRow')}</button>
      <button class="btn btn-dark" id="ts-import">${t('importExcel')}</button>
      <button class="btn" id="ts-export">${t('exportExcel')}</button>`;

    document.getElementById('ts-add').addEventListener('click', () => openTimesheetForm(null));
    document.getElementById('ts-export').addEventListener('click', exportTimesheet);
    document.getElementById('ts-import').addEventListener('click', () =>
      document.getElementById('ts-import-file').click());
    document.getElementById('ts-import-file').addEventListener('change', importTimesheet);
  } else {
    actions.innerHTML = `<button class="btn" id="ts-export">${t('exportExcelSm')}</button>`;
    document.getElementById('ts-export').addEventListener('click', exportTimesheet);
  }

  const searchInput = document.getElementById('ts-search-input');
  if (searchInput) {
    searchInput.placeholder = t('tsSearchPlaceholder');
    searchInput.addEventListener('input', (e) => {
      timesheetFilter = e.target.value.trim().toLowerCase();
      renderTimesheet(timesheetRows);
    });
  }
}

async function loadTimesheet() {
  const box = document.getElementById('timesheet-container');
  box.innerHTML = '<div class="spinner"></div>';
  try {
    timesheetRows = await api('/api/timesheet');
    renderTimesheet(timesheetRows);
  } catch (err) {
    box.innerHTML = '';
    showToast(err.message, 'err');
  }
}

function renderTimesheet(rows) {
  const box = document.getElementById('timesheet-container');
  const admin = isAdmin();
  const allRows = rows || [];
  const filteredRows = timesheetFilter
    ? allRows.filter(r =>
        (r.employeeName && r.employeeName.toLowerCase().includes(timesheetFilter)) ||
        (r.note && r.note.toLowerCase().includes(timesheetFilter)))
    : allRows;

  if (filteredRows.length === 0 && rows && rows.length > 0) {
    box.innerHTML = EMPTY_TS_FILTERED();
    return;
  }

  if (!rows || rows.length === 0) {
    box.innerHTML = EMPTY_TS(admin);
    return;
  }

  const body = filteredRows.map((r, i) => `
    <tr>
      <td class="num">${i + 1}</td>
      <td>${escapeHtml(r.employeeName)}</td>
      <td>${formatDate(r.workDate)}</td>
      <td>${escapeHtml(r.checkIn || '—')}</td>
      <td>${escapeHtml(r.checkOut || '—')}</td>
      <td class="num"><span class="pill pill-hours">${(r.workHours ?? 0)}</span></td>
      <td>${escapeHtml(r.note || '')}</td>
      ${admin ? `<td class="num"><div class="row-actions">
        <button class="btn btn-ghost btn-sm" data-edit="${r.id}" title="${t('editPost')}">✎</button>
        <button class="btn btn-danger btn-sm" data-del="${r.id}" title="${t('deletePost')}">🗑</button>
      </div></td>` : ''}
    </tr>`).join('');

  box.innerHTML = `
    <div class="card"><div class="table-wrap">
      <table class="data">
        <thead><tr>
          <th class="num">#</th><th>${t('name')}</th><th>${t('date')}</th>
          <th>${t('timeIn')}</th><th>${t('timeOut')}</th><th class="num">${t('hours')}</th><th>${t('note')}</th>
          ${admin ? '<th class="num">' + t('action') + '</th>' : ''}
        </tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div></div>`;

  if (admin) {
    box.querySelectorAll('[data-edit]').forEach(b =>
      b.addEventListener('click', () => openTimesheetForm(b.dataset.edit, timesheetRows)));
    box.querySelectorAll('[data-del]').forEach(b =>
      b.addEventListener('click', () => deleteTimesheet(b.dataset.del)));
  }
}

function openTimesheetForm(id, rows) {
  const r = id && rows ? rows.find(x => x.id === id) : null;
  const dateVal = r ? toYMD(new Date(r.workDate)) : toYMD(new Date());

  const body = `
    <div class="field">
      <label for="ts-name">${t('name')}</label>
      <input type="text" id="ts-name" maxlength="150" value="${r ? escapeHtml(r.employeeName) : ''}" placeholder="${t('name')}" />
    </div>
    <div class="field-row">
      <div class="field">
        <label for="ts-date">${t('date')}</label>
        <input type="date" id="ts-date" value="${dateVal}" />
      </div>
      <div class="field">
        <label for="ts-hours">${t('hours')}</label>
        <input type="number" id="ts-hours" step="0.5" min="0" value="${r ? (r.workHours ?? 0) : 8}" />
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label for="ts-in">${t('timeIn')}</label>
        <input type="time" id="ts-in" value="${r && r.checkIn ? escapeHtml(r.checkIn) : '08:00'}" />
      </div>
      <div class="field">
        <label for="ts-out">${t('timeOut')}</label>
        <input type="time" id="ts-out" value="${r && r.checkOut ? escapeHtml(r.checkOut) : '17:00'}" />
      </div>
    </div>
    <div class="field">
      <label for="ts-note">${t('note')}</label>
      <input type="text" id="ts-note" value="${r ? escapeHtml(r.note || '') : ''}" placeholder="${t('nothing')}" />
    </div>`;

  const isEdit = !!id;
  const foot = `
    <button class="btn" onclick="closeModal()">${t('cancel')}</button>
    <button class="btn btn-primary" id="ts-save">${isEdit ? t('save') : t('addRow')}</button>`;

  openModal(isEdit ? t('editRowTitle') : t('addRowTitle'), body, foot);
  document.getElementById('ts-save').addEventListener('click', () => saveTimesheet(id));
}

async function saveTimesheet(id) {
  const payload = {
    employeeName: document.getElementById('ts-name').value.trim(),
    workDate: document.getElementById('ts-date').value,
    checkIn: document.getElementById('ts-in').value || null,
    checkOut: document.getElementById('ts-out').value || null,
    workHours: parseFloat(document.getElementById('ts-hours').value) || 0,
    note: document.getElementById('ts-note').value.trim()
  };
  if (!payload.employeeName) { showToast(t('noName'), 'err'); return; }
  if (!payload.workDate) { showToast(t('noDate'), 'err'); return; }

  const btn = document.getElementById('ts-save');
  const isEdit = !!id;
  btn.disabled = true; btn.textContent = t('saving');
  try {
    await api('/api/timesheet' + (id ? '/' + id : ''), {
      method: id ? 'PUT' : 'POST',
      body: payload
    });
    closeModal();
    showToast(isEdit ? t('editDone') : t('addDone'), 'ok');
    loadTimesheet();
  } catch (err) {
    showToast(err.message, 'err');
    btn.disabled = false; btn.textContent = isEdit ? t('save') : t('addRow');
  }
}

function deleteTimesheet(id) {
  openModal(t('deleteRow'),
    '<p>' + t('deleteRowConfirm') + '</p>',
    `<button class="btn" onclick="closeModal()">${t('cancel')}</button>
     <button class="btn btn-primary" id="confirm-del-ts">${t('deletePost')}</button>`);
  document.getElementById('confirm-del-ts').addEventListener('click', async () => {
    try {
      await api('/api/timesheet/' + id, { method: 'DELETE' });
      closeModal();
      showToast(t('rowDeletedMsg'), 'ok');
      loadTimesheet();
    } catch (err) { showToast(err.message, 'err'); }
  });
}

async function exportTimesheet() {
  try {
    const blob = await api('/api/timesheet/export');
    downloadBlob(blob, 'BangChamCong.xlsx');
  } catch (err) { showToast(err.message, 'err'); }
}

async function downloadTemplate() {
  try {
    const blob = await api('/api/timesheet/template');
    downloadBlob(blob, 'Mau_ChamCong.xlsx');
  } catch (err) { showToast(err.message, 'err'); }
}

async function importTimesheet(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';

  openModal(t('importTitle'),
    `<p>${t('importXlsWarning')}</p>`,
    `<button class="btn" onclick="closeModal()">${t('cancel')}</button>
     <button class="btn btn-primary" id="ts-do-import">${t('startImport')}</button>`);

  document.getElementById('ts-do-import').addEventListener('click', async () => {
    const replace = document.getElementById('ts-replace').checked;
    const btn = document.getElementById('ts-do-import');
    btn.disabled = true; btn.textContent = t('importing');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const result = await api('/api/timesheet/import?replace=' + replace, {
        method: 'POST',
        body: fd
      });
      closeModal();
      let msg = t('importedMsg') + ' ' + result.imported + ' ' + t('rowsSkipped').split(' ')[0] + '.';
      if (result.errors && result.errors.length) {
        msg += ' (' + result.errors.length + ' ' + t('rowsSkipped').split(' ').slice(1).join(' ') + ')';
        showToast(result.errors[0], 'err');
      }
      showToast(msg, 'ok');
      loadTimesheet();
    } catch (err) {
      showToast(err.message, 'err');
      btn.disabled = false; btn.textContent = t('startImport');
    }
  });
}
