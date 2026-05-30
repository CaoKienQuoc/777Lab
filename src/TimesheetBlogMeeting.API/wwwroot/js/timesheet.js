function initTimesheet() {
  const actions = document.getElementById('timesheet-actions');
  const sub = document.getElementById('timesheet-sub');

  if (isAdmin()) {
    sub.textContent = 'Bạn là quản trị viên — có thể import Excel hoặc nhập trực tiếp.';
    actions.innerHTML = `
      <input type="file" id="ts-import-file" accept=".xlsx,.xls" class="hidden" />
      <button class="btn btn-primary" id="ts-add">+ Thêm dòng</button>
      <button class="btn btn-dark" id="ts-import">⬆ Import Excel</button>
      <button class="btn" id="ts-template">📄 Tải file mẫu</button>
      <button class="btn" id="ts-export">⬇ Xuất Excel</button>`;

    document.getElementById('ts-add').addEventListener('click', () => openTimesheetForm(null));
    document.getElementById('ts-export').addEventListener('click', exportTimesheet);
    document.getElementById('ts-template').addEventListener('click', downloadTemplate);
    document.getElementById('ts-import').addEventListener('click', () =>
      document.getElementById('ts-import-file').click());
    document.getElementById('ts-import-file').addEventListener('change', importTimesheet);
  } else {
    actions.innerHTML = `<button class="btn" id="ts-export">⬇ Xuất Excel</button>`;
    document.getElementById('ts-export').addEventListener('click', exportTimesheet);
  }
}

async function loadTimesheet() {
  const box = document.getElementById('timesheet-container');
  box.innerHTML = '<div class="spinner"></div>';
  try {
    const rows = await api('/api/timesheet');
    renderTimesheet(rows);
  } catch (err) {
    box.innerHTML = '';
    showToast(err.message, 'err');
  }
}

function renderTimesheet(rows) {
  const box = document.getElementById('timesheet-container');
  const admin = isAdmin();

  if (!rows || rows.length === 0) {
    box.innerHTML = `
      <div class="card"><div class="empty">
        <span class="ico">🗓️</span>
        <p><b>Chưa có dữ liệu chấm công.</b></p>
        <p>${admin ? 'Hãy import file Excel hoặc thêm dòng mới.' : 'Vui lòng quay lại sau.'}</p>
      </div></div>`;
    return;
  }

  const body = rows.map((r, i) => `
    <tr>
      <td class="num">${i + 1}</td>
      <td>${escapeHtml(r.employeeName)}</td>
      <td>${formatDate(r.workDate)}</td>
      <td>${escapeHtml(r.checkIn || '—')}</td>
      <td>${escapeHtml(r.checkOut || '—')}</td>
      <td class="num"><span class="pill pill-hours">${(r.workHours ?? 0)}</span></td>
      <td>${escapeHtml(r.note || '')}</td>
      ${admin ? `<td class="num"><div class="row-actions">
        <button class="btn btn-ghost btn-sm" data-edit="${r.id}" title="Sửa">✎</button>
        <button class="btn btn-danger btn-sm" data-del="${r.id}" title="Xoá">🗑</button>
      </div></td>` : ''}
    </tr>`).join('');

  box.innerHTML = `
    <div class="card"><div class="table-wrap">
      <table class="data">
        <thead><tr>
          <th class="num">#</th><th>Họ và tên</th><th>Ngày</th>
          <th>Giờ vào</th><th>Giờ ra</th><th class="num">Số giờ</th><th>Ghi chú</th>
          ${admin ? '<th class="num">Thao tác</th>' : ''}
        </tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div></div>`;

  if (admin) {
    box.querySelectorAll('[data-edit]').forEach(b =>
      b.addEventListener('click', () => openTimesheetForm(b.dataset.edit, rows)));
    box.querySelectorAll('[data-del]').forEach(b =>
      b.addEventListener('click', () => deleteTimesheet(b.dataset.del)));
  }
}

/* ---------- Thêm / sửa (chỉ admin) ---------- */
function openTimesheetForm(id, rows) {
  const r = id && rows ? rows.find(x => x.id === id) : null;
  const dateVal = r ? toYMD(new Date(r.workDate)) : toYMD(new Date());

  const body = `
    <div class="field">
      <label for="ts-name">Họ và tên</label>
      <input type="text" id="ts-name" maxlength="150" value="${r ? escapeHtml(r.employeeName) : ''}" placeholder="Nguyễn Văn A" />
    </div>
    <div class="field-row">
      <div class="field">
        <label for="ts-date">Ngày</label>
        <input type="date" id="ts-date" value="${dateVal}" />
      </div>
      <div class="field">
        <label for="ts-hours">Số giờ công</label>
        <input type="number" id="ts-hours" step="0.5" min="0" value="${r ? (r.workHours ?? 0) : 8}" />
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label for="ts-in">Giờ vào</label>
        <input type="time" id="ts-in" value="${r && r.checkIn ? escapeHtml(r.checkIn) : '08:00'}" />
      </div>
      <div class="field">
        <label for="ts-out">Giờ ra</label>
        <input type="time" id="ts-out" value="${r && r.checkOut ? escapeHtml(r.checkOut) : '17:00'}" />
      </div>
    </div>
    <div class="field">
      <label for="ts-note">Ghi chú</label>
      <input type="text" id="ts-note" value="${r ? escapeHtml(r.note || '') : ''}" placeholder="(tuỳ chọn)" />
    </div>`;

  const foot = `
    <button class="btn" onclick="closeModal()">Huỷ</button>
    <button class="btn btn-primary" id="ts-save">${id ? 'Lưu' : 'Thêm'}</button>`;

  openModal(id ? 'Sửa dòng chấm công' : 'Thêm dòng chấm công', body, foot);
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
  if (!payload.employeeName) { showToast('Vui lòng nhập họ tên.', 'err'); return; }
  if (!payload.workDate) { showToast('Vui lòng chọn ngày.', 'err'); return; }

  const btn = document.getElementById('ts-save');
  btn.disabled = true; btn.textContent = 'Đang lưu...';
  try {
    await api('/api/timesheet' + (id ? '/' + id : ''), {
      method: id ? 'PUT' : 'POST',
      body: payload
    });
    closeModal();
    showToast(id ? 'Đã cập nhật.' : 'Đã thêm dòng.', 'ok');
    loadTimesheet();
  } catch (err) {
    showToast(err.message, 'err');
    btn.disabled = false; btn.textContent = id ? 'Lưu' : 'Thêm';
  }
}

function deleteTimesheet(id) {
  openModal('Xoá dòng',
    '<p>Xoá dòng chấm công này?</p>',
    `<button class="btn" onclick="closeModal()">Huỷ</button>
     <button class="btn btn-primary" id="confirm-del-ts">Xoá</button>`);
  document.getElementById('confirm-del-ts').addEventListener('click', async () => {
    try {
      await api('/api/timesheet/' + id, { method: 'DELETE' });
      closeModal();
      showToast('Đã xoá.', 'ok');
      loadTimesheet();
    } catch (err) { showToast(err.message, 'err'); }
  });
}

/* ---------- Xuất / mẫu / import ---------- */
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
  e.target.value = ''; // reset để chọn lại cùng file được

  openModal('Import Excel',
    `<p>Đã chọn tệp: <b>${escapeHtml(file.name)}</b></p>
     <label style="margin-top:14px; font-weight:400; display:flex; gap:8px; align-items:center;">
       <input type="checkbox" id="ts-replace" style="width:auto;" /> Xoá toàn bộ dữ liệu cũ trước khi import
     </label>
     <p class="muted-note" style="margin-top:12px;">File cần có dòng tiêu đề ở hàng đầu (Họ tên, Ngày, Giờ vào, Giờ ra, Số giờ, Ghi chú). Tải “file mẫu” nếu chưa rõ định dạng.</p>`,
    `<button class="btn" onclick="closeModal()">Huỷ</button>
     <button class="btn btn-primary" id="ts-do-import">Bắt đầu import</button>`);

  document.getElementById('ts-do-import').addEventListener('click', async () => {
    const replace = document.getElementById('ts-replace').checked;
    const btn = document.getElementById('ts-do-import');
    btn.disabled = true; btn.textContent = 'Đang xử lý...';
    try {
      const fd = new FormData();
      fd.append('file', file);
      const result = await api('/api/timesheet/import?replace=' + replace, {
        method: 'POST',
        body: fd
      });
      closeModal();
      let msg = 'Đã import ' + result.imported + ' dòng.';
      if (result.errors && result.errors.length) {
        msg += ' (' + result.errors.length + ' dòng lỗi bị bỏ qua)';
        showToast(result.errors[0], 'err');
      }
      showToast(msg, 'ok');
      loadTimesheet();
    } catch (err) {
      showToast(err.message, 'err');
      btn.disabled = false; btn.textContent = 'Bắt đầu import';
    }
  });
}
