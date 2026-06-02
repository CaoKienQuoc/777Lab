/* =========================================================================
   leave.js — Phép tồn với cột động
   ========================================================================= */

const JA_HEADER_MAP = {
  'họ tên': '名前', 'họ và tên': '名前', 'tên': '名前', 'name': '名前',
  'mã nhân viên': '社員番号', 'mã': '社員番号', 'id': '社員番号',
  'phòng ban': '部署', 'bộ phận': '部署', 'department': '部署',
  'chức vụ': '職位', 'vị trí': '職位', 'position': '職位',
  'ngày': '日付', 'ngày làm việc': '就業日', 'ngày công': '就業日', 'date': '日付',
  'giờ vào': '出勤時間', 'check in': '出勤時間', 'checkin': '出勤時間', 'time in': '出勤時間',
  'giờ ra': '退勤時間', 'check out': '退勤時間', 'checkout': '退勤時間', 'time out': '退勤時間',
  'số giờ': '勤務時間', 'giờ công': '勤務時間', 'work hours': '勤務時間', 'hours': '勤務時間',
  'tăng ca': '残業', 'ot': '残業', 'overtime': '残業',
  'nghỉ phép': '有給休暇', 'phép năm': '有給休暇', 'annual leave': '有給休暇',
  'nghỉ ốm': '病欠', 'sick leave': '病欠',
  'nghỉ việc riêng': '私用休暇', 'personal leave': '私用休暇',
  'lý do': '理由', 'note': '備考', 'ghi chú': '備考', 'remarks': '備考', 'description': '説明',
  'duyệt': '承認', 'trạng thái': 'ステータス', 'status': 'ステータス',
  'người duyệt': '承認者', 'approved by': '承認者',
  'ngày tạo': '作成日', 'created': '作成日', 'created at': '作成日',
  'công ty': '会社', 'company': '会社',
  'loại': '種類', 'type': '種類',
  'từ ngày': '開始日', 'đến ngày': '終了日',
  'số ngày': '日数', 'days': '日数',
  'tổng': '合計', 'total': '合計',
  'tháng': '月', 'month': '月',
  'năm': '年', 'year': '年',
};

function translateHeader(header) {
  if (LANG !== 'ja') return header;
  const key = header.trim().toLowerCase();
  const mapped = JA_HEADER_MAP[key];
  if (mapped && mapped !== header) return header + ' (' + mapped + ')';
  return header;
}

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

  const thead = cols.map(c => `<th class="${c.isNumeric ? 'num' : ''}">${escapeHtml(translateHeader(c.header))}</th>`).join('')
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
        <label for="lvc_${c.position}">${escapeHtml(translateHeader(c.header))}</label>
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
