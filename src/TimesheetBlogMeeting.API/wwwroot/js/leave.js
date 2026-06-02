/* =========================================================================
    leave.js — Mục "Phép tồn" với CỘT ĐỘNG.
    Bộ cột không cố định: được dựng theo đúng dòng tiêu đề của file Excel khi import.
    Bảng hiển thị, form thêm/sửa, xuất Excel và file mẫu đều bám theo bộ cột đó.
    - Mọi người dùng: xem + xuất Excel + lọc.
    - Admin: thêm / sửa / xoá dòng / import Excel / tải file mẫu.
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

// Hiển thị giá trị 1 ô. Cột số: căn phải, bỏ ".0" thừa, số âm tô đỏ.
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
        <span class="ico">🌴</span>
        <p><b>Chưa có bảng phép tồn.</b></p>
        <p>${admin
          ? 'Hãy bấm <b>Import Excel</b> — bảng sẽ được dựng theo đúng các cột trong file của bạn.'
          : 'Vui lòng quay lại sau.'}</p>
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
    + (admin ? '<th class="num">Thao tác</th>' : '');

  const tbody = filteredRows.map(r => {
    const tds = cols.map(c => `<td class="${c.isNumeric ? 'num' : ''}">${fmtCell(r.cells[c.position], c.isNumeric)}</td>`).join('');
    const act = admin ? `<td class="num"><div class="row-actions">
        <button class="btn btn-ghost btn-sm" data-edit="${r.id}" title="Sửa">✎</button>
        <button class="btn btn-danger btn-sm" data-del="${r.id}" title="Xoá">🗑</button>
      </div></td>` : '';
    return `<tr>${tds}${act}</tr>`;
  }).join('');

  box.innerHTML = `
    <div class="card"><div class="table-wrap">
      <table class="data">
        <thead><tr>${thead}</tr></thead>
        <tbody>${tbody || '<tr><td colspan="' + (cols.length + (admin ? 1 : 0)) + '" class="empty">Không có dữ liệu phù hợp.</td></tr>'}</tbody>
      </table>
    </div></div>`;

  if (admin) {
    box.querySelectorAll('[data-edit]').forEach(b =>
      b.addEventListener('click', () => openLeaveForm(b.dataset.edit)));
    box.querySelectorAll('[data-del]').forEach(b =>
      b.addEventListener('click', () => deleteLeave(b.dataset.del)));
  }
}

/* ---------- Thêm / sửa (chỉ admin) — form dựng theo cột động ---------- */
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

  const foot = `
    <button class="btn" onclick="closeModal()">Huỷ</button>
    <button class="btn btn-primary" id="lv-save">${id ? 'Lưu' : 'Thêm'}</button>`;

  openModal(id ? 'Sửa dòng phép tồn' : 'Thêm dòng phép tồn', fields, foot, true);
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
  if (!anyVal) { showToast('Vui lòng nhập ít nhất một ô.', 'err'); return; }

  const btn = document.getElementById('lv-save');
  btn.disabled = true; btn.textContent = 'Đang lưu...';
  try {
    await api('/api/leave/rows' + (id ? '/' + id : ''), {
      method: id ? 'PUT' : 'POST',
      body: { cells }
    });
    closeModal();
    showToast(id ? 'Đã cập nhật.' : 'Đã thêm dòng.', 'ok');
    loadLeave();
  } catch (err) {
    showToast(err.message, 'err');
    btn.disabled = false; btn.textContent = id ? 'Lưu' : 'Thêm';
  }
}

function deleteLeave(id) {
  openModal('Xoá dòng',
    '<p>Xoá dòng phép tồn này?</p>',
    `<button class="btn" onclick="closeModal()">Huỷ</button>
     <button class="btn btn-primary" id="confirm-del-lv">Xoá</button>`);
  document.getElementById('confirm-del-lv').addEventListener('click', async () => {
    try {
      await api('/api/leave/rows/' + id, { method: 'DELETE' });
      closeModal();
      showToast('Đã xoá.', 'ok');
      loadLeave();
    } catch (err) { showToast(err.message, 'err'); }
  });
}

/* ---------- Xuất / import ---------- */
async function exportLeave() {
  try {
    const blob = await api('/api/leave/export');
    downloadBlob(blob, 'PhepTon.xlsx');
  } catch (err) { showToast(err.message, 'err'); }
}

async function importLeave(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = ''; // reset để chọn lại cùng file được

  openModal('Import Excel',
    `<p>Đã chọn tệp: <b>${escapeHtml(file.name)}</b></p>
     <p class="muted-note" style="margin-top:12px;">Bảng sẽ được <b>dựng lại theo đúng các cột trong file</b> (thay thế toàn bộ dữ liệu hiện tại). Chương trình tự dò sheet và dòng tiêu đề.</p>`,
    `<button class="btn" onclick="closeModal()">Huỷ</button>
     <button class="btn btn-primary" id="lv-do-import">Bắt đầu import</button>`);

  document.getElementById('lv-do-import').addEventListener('click', async () => {
    const btn = document.getElementById('lv-do-import');
    btn.disabled = true; btn.textContent = 'Đang xử lý...';
    try {
      const fd = new FormData();
      fd.append('file', file);
      const result = await api('/api/leave/import', { method: 'POST', body: fd });
      closeModal();
      showToast('Đã import ' + result.imported + ' dòng — đã dựng cột theo file.', 'ok');
      loadLeave();
    } catch (err) {
      showToast(err.message, 'err');
      btn.disabled = false; btn.textContent = 'Bắt đầu import';
    }
  });
}
