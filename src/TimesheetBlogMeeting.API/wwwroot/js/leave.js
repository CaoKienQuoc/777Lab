/* =========================================================================
   leave.js — Phép tồn với cột động
   ========================================================================= */

let leaveTable = { columns: [], rows: [] };
let leaveFilter = '';

function initLeave() {
  const actions = document.getElementById('leave-actions');
  const searchInput = document.getElementById('leave-search-input');

  if (isAdmin()) {
    actions.innerHTML = `
      <input type="file" id="lv-import-file" accept=".xlsx" class="hidden" />
      <button class="btn btn-primary" id="lv-add">${t('addRow')}</button>
      <button class="btn btn-dark" id="lv-import">${t('importExcel')}</button>
      <button class="btn" id="lv-export">${t('exportExcel')}</button>`;

    document.getElementById('lv-add').addEventListener('click', () => openLeaveForm(null));
    document.getElementById('lv-export').addEventListener('click', exportLeave);
    document.getElementById('lv-import').addEventListener('click', () =>
      document.getElementById('lv-import-file').click());
    document.getElementById('lv-import-file').addEventListener('change', importLeave);
  } else {
    actions.innerHTML = `<button class="btn" id="lv-export">${t('exportExcelSm')}</button>`;
    document.getElementById('lv-export').addEventListener('click', exportLeave);
  }

  if (searchInput) {
    searchInput.placeholder = t('searchPlaceholder');
    searchInput.addEventListener('input', (e) => {
      leaveFilter = e.target.value.trim().toLowerCase();
      renderLeave(leaveTable);
    });
  }
}

async function loadLeave() {
  const box = document.getElementById('leave-container');
  box.innerHTML = '<div class="spinner"></div>';
  try {
    const table = await api('/api/leave');
    renderLeave(table);
  } catch (err) {
    box.innerHTML = '';
    showToast(err.message, 'err');
  }
}

function fmtCell(val, isNumeric) {
  if (val === null || val === undefined || val === '') return '';
  if (isNumeric) {
    const n = Number(String(val).replace(',', '.'));
    if (!Number.isNaN(n)) {
      const s = String(Math.round(n * 1000) / 1000);
      return n < 0 ? `<span class="cell-neg">${s}</span>` : s;
    }
  }
  return escapeHtml(val);
}

function renderLeave(table) {
  leaveTable = table || { columns: [], rows: [] };
  const box = document.getElementById('leave-container');
  const admin = isAdmin();
  const cols = leaveTable.columns || [];
  const allRows = leaveTable.rows || [];

  if (cols.length === 0) {
    box.innerHTML = `
      <div class="card"><div class="empty">
        <span class="ico"><img src="/img/chars-sm/Char 4.2.png" width="20" height="20"></span>
        <p><b>${t('noLeave')}</b></p>
        <p>${admin
          ? t('leaveAdminHint')
          : t('leaveUserHint')}</p>
      </div></div>`;
    return;
  }

  const filteredRows = leaveFilter
    ? allRows.filter(r => {
        const cells = r.cells || {};
        return Object.values(cells).some(v =>
          v && String(v).toLowerCase().includes(leaveFilter));
      })
    : allRows;

  const thead = cols.map(c => `<th class="${c.isNumeric ? 'num' : ''}">${escapeHtml(c.header)}</th>`).join('')
    + (admin ? '<th class="num">' + t('action') + '</th>' : '');

  const tbody = filteredRows.map(r => {
    const tds = cols.map(c => `<td class="${c.isNumeric ? 'num' : ''}">${fmtCell(r.cells[c.position], c.isNumeric)}</td>`).join('');
    const act = admin ? `<td class="num"><div class="row-actions">
        <button class="btn btn-ghost btn-sm" data-edit="${r.id}" title="${t('editPost')}">✎</button>
        <button class="btn btn-danger btn-sm" data-del="${r.id}" title="${t('deletePost')}">🗑</button>
      </div></td>` : '';
    return `<tr>${tds}${act}</tr>`;
  }).join('');

  box.innerHTML = `
    <div class="card"><div class="table-wrap">
      <table class="data">
        <thead><tr>${thead}</tr></thead>
        <tbody>${tbody || '<tr><td colspan="' + (cols.length + (admin ? 1 : 0)) + '" class="empty">' + t('noTimesheetMatch') + '</td></tr>'}</tbody>
      </table>
    </div></div>`;

  if (admin) {
    box.querySelectorAll('[data-edit]').forEach(b =>
      b.addEventListener('click', () => openLeaveForm(b.dataset.edit)));
    box.querySelectorAll('[data-del]').forEach(b =>
      b.addEventListener('click', () => deleteLeave(b.dataset.del)));
  }
}

function openLeaveForm(id) {
  const cols = leaveTable.columns || [];
  if (cols.length === 0) {
    showToast('Hãy import file Excel để dựng cột trước.', 'err');
    return;
  }
  const r = id ? (leaveTable.rows || []).find(x => x.id === id) : null;

  let fields = '';
  for (let i = 0; i < cols.length; i += 3) {
    const group = cols.slice(i, i + 3).map(c => {
      const v = r && r.cells[c.position] != null ? r.cells[c.position] : '';
      const type = c.isNumeric ? 'number' : 'text';
      const step = c.isNumeric ? ' step="0.5"' : '';
      return `<div class="field">
        <label for="lvc_${c.position}">${escapeHtml(c.header)}</label>
        <input type="${type}"${step} id="lvc_${c.position}" value="${escapeHtml(v)}" />
      </div>`;
    }).join('');
    fields += `<div class="field-row">${group}</div>`;
  }

  const isEdit = !!id;
  const foot = `
    <button class="btn" onclick="closeModal()">${t('cancel')}</button>
    <button class="btn btn-primary" id="lv-save">${isEdit ? t('save') : t('addRow')}</button>`;

  openModal(isEdit ? t('editLeaveTitle') : t('addLeaveTitle'), fields, foot, true);
  document.getElementById('lv-save').addEventListener('click', () => saveLeave(id));
}

async function saveLeave(id) {
  const cols = leaveTable.columns || [];
  const cells = {};
  let anyVal = false;
  cols.forEach(c => {
    const el = document.getElementById('lvc_' + c.position);
    const v = el ? el.value.trim() : '';
    cells[c.position] = v;
    if (v !== '') anyVal = true;
  });
  if (!anyVal) { showToast(t('pleaseEnterOneCell'), 'err'); return; }

  const btn = document.getElementById('lv-save');
  const isEdit = !!id;
  btn.disabled = true; btn.textContent = t('saving');
  try {
    await api('/api/leave/rows' + (id ? '/' + id : ''), {
      method: id ? 'PUT' : 'POST',
      body: { cells }
    });
    closeModal();
    showToast(isEdit ? t('leaveSaved') : t('leaveAdded'), 'ok');
    loadLeave();
  } catch (err) {
    showToast(err.message, 'err');
    btn.disabled = false; btn.textContent = isEdit ? t('save') : t('addRow');
  }
}

function deleteLeave(id) {
  openModal(t('deleteRow'),
    '<p>' + t('deleteLeaveConfirm') + '</p>',
    `<button class="btn" onclick="closeModal()">${t('cancel')}</button>
     <button class="btn btn-primary" id="confirm-del-lv">${t('deletePost')}</button>`);
  document.getElementById('confirm-del-lv').addEventListener('click', async () => {
    try {
      await api('/api/leave/rows/' + id, { method: 'DELETE' });
      closeModal();
      showToast(t('leaveDeleted'), 'ok');
      loadLeave();
    } catch (err) { showToast(err.message, 'err'); }
  });
}

async function exportLeave() {
  try {
    const blob = await api('/api/leave/export');
    downloadBlob(blob, 'PhepTon.xlsx');
  } catch (err) { showToast(err.message, 'err'); }
}

async function importLeave(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';

  openModal(t('importLeaveTitle'),
    `<p>${t('importLeaveHint')}</p>`,
    `<button class="btn" onclick="closeModal()">${t('cancel')}</button>
     <button class="btn btn-primary" id="lv-do-import">${t('startImport')}</button>`);

  document.getElementById('lv-do-import').addEventListener('click', async () => {
    const btn = document.getElementById('lv-do-import');
    btn.disabled = true; btn.textContent = t('importing');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const result = await api('/api/leave/import', { method: 'POST', body: fd });
      closeModal();
      showToast(t('leaveImportedMsg') + ' ' + result.imported + ' ' + t('rowsSkipped').split(' ')[0] + '.', 'ok');
      loadLeave();
    } catch (err) {
      showToast(err.message, 'err');
      btn.disabled = false; btn.textContent = t('startImport');
    }
  });
}
