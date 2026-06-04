/* =========================================================================
   leave.js — Phép tồn với cột động
   ========================================================================= */

const JA_HEADER_MAP = {
  // Cột bảng Phép tồn
  'stt': '番号', 'code': 'コード', 'team': 'チーム', 'còn lại': '残日数',
  'ngày nghỉ (đã sd)': '取得日数', 'ngày nghỉ(đã sd)': '取得日数', 'nghỉ phép không lương': '無給休暇',
  // tiếng Việt
  'họ tên': '名前', 'họ và tên': '名前', 'tên': '名前', 'tên nhân viên': '名前', 'name': '名前', 'full name': 'フルネーム',
  'mã nhân viên': '社員番号', 'mã': '社員番号', 'id': '社員番号', 'mã nv': '社員番号', 'staff id': '社員番号',
  'phòng ban': '部署', 'bộ phận': '部署', 'department': '部署',
  'chức vụ': '職位', 'vị trí': '職位', 'position': '職位',
  'ngày': '日付', 'ngày làm việc': '就業日', 'ngày công': '就業日', 'date': '日付', 'ngày bắt đầu': '開始日', 'ngày kết thúc': '終了日',
  'tháng': '月', 'month': '月', 'tháng/năm': '月/年',
  'năm': '年', 'year': '年',
  'từ ngày': '開始日', 'đến ngày': '終了日', 'from': '開始日', 'to': '終了日',
  'giờ vào': '出勤時間', 'check in': '出勤時間', 'checkin': '出勤時間', 'time in': '出勤時間', 'giờ bắt đầu': '開始時間', 'start time': '開始時間',
  'giờ ra': '退勤時間', 'check out': '退勤時間', 'checkout': '退勤時間', 'time out': '退勤時間', 'giờ kết thúc': '終了時間', 'end time': '終了時間',
  'số giờ': '勤務時間', 'giờ công': '勤務時間', 'work hours': '勤務時間', 'hours': '勤務時間', 'số giờ công': '勤務時間', 'số giờ làm': '勤務時間', 'work hour': '勤務時間',
  'tăng ca': '残業', 'ot': '残業', 'overtime': '残業', 'số giờ tăng ca': '残業時間', 'overtime hours': '残業時間',
  'nghỉ phép': '有給休暇', 'phép năm': '有給休暇', 'annual leave': '有給休暇', 'số ngày phép': '有給休暇日数', 'leave': '休暇',
  'nghỉ ốm': '病欠', 'sick leave': '病欠', 'ốm': '病欠', 'medical leave': '病欠',
  'nghỉ việc riêng': '私用休暇', 'personal leave': '私用休暇', 'riêng': '私用休暇', 'private': '私用休暇',
  'nghỉ không lương': '無給休暇', 'unpaid leave': '無給休暇',
  'nghỉ lễ': '祝日休暇', 'holiday': '祝日休暇',
  'nghỉ bù': '振替休暇', 'compensatory leave': '振替休暇', 'comp off': '振替休暇',
  'số ngày': '日数', 'days': '日数',
  'tổng': '合計', 'total': '合計', 'sum': '合計',
  'lý do': '理由', 'note': '備考', 'ghi chú': '備考', 'remarks': '備考', 'description': '説明',
  'mô tả': '説明', 'desc': '説明', 'comment': 'コメント',
  'duyệt': '承認', 'trạng thái': 'ステータス', 'status': 'ステータス', 'tình trạng': 'ステータス', 'state': 'ステータス',
  'người duyệt': '承認者', 'approved by': '承認者', 'approver': '承認者',
  'ngày tạo': '作成日', 'created': '作成日', 'created at': '作成日', 'create date': '作成日', 'date created': '作成日',
  'công ty': '会社', 'company': '会社',
  'loại': '種類', 'type': '種類', 'loại phép': '休暇種類', 'leave type': '休暇種類',
  'số điện thoại': '電話番号', 'phone': '電話番号', 'phone number': '電話番号',
  'email': 'メール', 'e-mail': 'メール',
  'địa chỉ': '住所', 'address': '住所',
  'bắt đầu': '開始', 'kết thúc': '終了',
  'kỳ': '期', 'period': '期',
  'bậc': '等級', 'level': '等級',
  'lương': '給与', 'salary': '給与',
  'lương cơ bản': '基本給', 'basic salary': '基本給',
  'phụ cấp': '手当', 'allowance': '手当',
  'thuế': '税金', 'tax': '税金',
  'bhxh': '社会保険', 'insurance': '保険',
  'tên quốc tịch': '国籍', 'nationality': '国籍',
  'ngân hàng': '銀行', 'bank': '銀行',
  'stk': '口座番号', 'account': '口座番号',
  'ghi': '記入', 'nhập': '入力', 'input': '入力',
};

// Hậu tố tham chiếu công thức ở cuối tiêu đề: " (1)", " (2)", " (1+2) - (3)"...
const HEADER_REF_SUFFIX = /\s*\([\d+\s]+\)(?:\s*-\s*\([\d+\s]+\))*$/;

// Nhận diện vai trò cột theo hậu tố công thức để auto-calc "Còn lại" trong form
function getFormulaRole(header) {
  const h = header.trim();
  if (/\(1\+2\)/.test(h)) return 'result';           // Còn lại (1+2) - (3)
  if (/\(\s*1\s*\)\s*$/.test(h)) return 'col1';      // Tồn (1)
  if (/\(\s*2\s*\)\s*$/.test(h)) return 'col2';      // Tổng phép (2)
  if (/\(\s*3\s*\)\s*$/.test(h) && !/1\+2/.test(h)) return 'col3'; // Ngày nghỉ đã sd (3)
  return null;
}

// Dịch theo từ khoá cho cột có cách viết không cố định (năm đổi theo kỳ, khoảng trắng/ngoặc lệch)
const JA_KEYWORD_RULES = [
  { test: k => k.startsWith('tồn'), ja: '繰越' },
  { test: k => k.startsWith('tổng phép'), ja: '付与日数' },
  { test: k => k.includes('đã sd'), ja: '取得日数' },
  { test: k => k.startsWith('còn lại'), ja: '残日数' },
];

// Chuẩn hoá tiêu đề: NFC + gộp khoảng trắng + chữ thường để khớp ổn định
function normHeader(s) {
  return s.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
}

function translateHeader(header) {
  if (LANG !== 'ja') return header;
  const raw = header.trim();
  // Tách hậu tố công thức để chèn tiếng Nhật ngay cạnh phần tiếng Việt
  const m = HEADER_REF_SUFFIX.exec(raw);
  const suffix = m ? raw.slice(m.index) : '';
  const base = (m ? raw.slice(0, m.index) : raw).trim();
  const key = normHeader(base);
  let ja = JA_HEADER_MAP[key];
  if (!ja) {
    const rule = JA_KEYWORD_RULES.find(r => r.test(key));
    if (rule) ja = rule.ja;
  }
  if (ja && ja !== base) return base + ' (' + ja + ')' + suffix;
  return raw;
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
      <button class="btn btn-pri" id="lv-export">${t('exportExcel')}</button>`;

    document.getElementById('lv-add').addEventListener('click', () => openLeaveForm(null));
    document.getElementById('lv-export').addEventListener('click', exportLeave);
    document.getElementById('lv-import').addEventListener('click', () =>
      document.getElementById('lv-import-file').click());
    document.getElementById('lv-import-file').addEventListener('change', importLeave);
  } else {
    actions.innerHTML = `<button class="btn btn-dark" id="lv-export">${t('exportExcelSm')}</button>`;
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

  // Auto-tính "Còn lại" khi người dùng chỉnh cột (1), (2), hoặc (3)
  setupLeaveFormula(cols);
}

function setupLeaveFormula(cols) {
  // Lập bản đồ vai trò -> position của cột
  const fm = {}; // 'col1'|'col2'|'col3'|'result' -> position
  cols.forEach(c => {
    const role = getFormulaRole(c.header);
    if (role) fm[role] = c.position;
  });

  if (fm.col1 === undefined || fm.col2 === undefined ||
      fm.col3 === undefined || fm.result === undefined) return;

  const resEl = document.getElementById('lvc_' + fm.result);
  if (resEl) resEl.readOnly = true;

  const recalc = () => {
    const v1 = parseFloat(document.getElementById('lvc_' + fm.col1)?.value) || 0;
    const v2 = parseFloat(document.getElementById('lvc_' + fm.col2)?.value) || 0;
    const v3 = parseFloat(document.getElementById('lvc_' + fm.col3)?.value) || 0;
    if (resEl) resEl.value = Math.round((v1 + v2 - v3) * 1000) / 1000;
  };

  ['col1', 'col2', 'col3'].forEach(role => {
    const el = document.getElementById('lvc_' + fm[role]);
    if (el) el.addEventListener('input', recalc);
  });
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
