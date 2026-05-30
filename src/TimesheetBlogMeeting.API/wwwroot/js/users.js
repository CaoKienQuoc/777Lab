/* =========================================================================
   users.js — Quản lý người dùng (chỉ admin)
   Thêm / sửa / xoá tài khoản, phân quyền. Không cho xoá/đổi quyền tài khoản
   admin gốc (username "admin").
   ========================================================================= */

const ROOT_ADMIN = 'admin'; // tài khoản admin cố định, được bảo vệ

function initUsers() {
  document.getElementById('btn-new-user').addEventListener('click', () => openUserForm(null));
}

async function loadUsers() {
  const box = document.getElementById('users-container');
  box.innerHTML = '<div class="spinner"></div>';
  try {
    const users = await api('/api/users');
    renderUsers(users);
  } catch (err) {
    box.innerHTML = '';
    showToast(err.message, 'err');
  }
}

function renderUsers(users) {
  const box = document.getElementById('users-container');
  if (!users || users.length === 0) {
    box.innerHTML = `<div class="card"><div class="empty">
      <span class="ico">👥</span><p><b>Chưa có người dùng.</b></p></div></div>`;
    return;
  }

  const rows = users.map((u, i) => {
    const isRoot = u.username === ROOT_ADMIN;
    const roleTag = u.role === 'Admin'
      ? '<span class="role-tag role-admin">Quản trị viên</span>'
      : '<span class="role-tag role-customer">Người dùng</span>';
    return `
      <tr>
        <td class="num">${i + 1}</td>
        <td><b>${escapeHtml(u.username)}</b>${isRoot ? ' <span class="muted-note">(mặc định)</span>' : ''}</td>
        <td>${escapeHtml(u.fullName)}</td>
        <td>${roleTag}</td>
        <td>${formatDate(u.createdAt)}</td>
        <td class="num"><div class="row-actions">
          <button class="btn btn-ghost btn-sm" data-edit="${u.id}" title="Sửa">✎</button>
          <button class="btn btn-danger btn-sm" data-del="${u.id}" title="Xoá" ${isRoot ? 'disabled' : ''}>🗑</button>
        </div></td>
      </tr>`;
  }).join('');

  box.innerHTML = `
    <div class="card"><div class="table-wrap">
      <table class="data">
        <thead><tr>
          <th class="num">#</th><th>Tên đăng nhập</th><th>Họ và tên</th>
          <th>Vai trò</th><th>Ngày tạo</th><th class="num">Thao tác</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div></div>`;

  box.querySelectorAll('[data-edit]').forEach(b =>
    b.addEventListener('click', () => openUserForm(b.dataset.edit, users)));
  box.querySelectorAll('[data-del]:not([disabled])').forEach(b =>
    b.addEventListener('click', () => deleteUser(b.dataset.del, users)));
}

/* ---------- Thêm / sửa ---------- */
function openUserForm(id, users) {
  const u = id && users ? users.find(x => x.id === id) : null;
  const isRoot = u && u.username === ROOT_ADMIN;

  const usernameField = u
    ? `<div class="field">
         <label>Tên đăng nhập</label>
         <input type="text" value="${escapeHtml(u.username)}" disabled />
       </div>`
    : `<div class="field">
         <label for="u-username">Tên đăng nhập</label>
         <input type="text" id="u-username" maxlength="100" placeholder="vd: nhanvien01" />
       </div>`;

  const passField = u
    ? `<div class="field">
         <label for="u-password">Đặt lại mật khẩu</label>
         <input type="password" id="u-password" placeholder="Để trống nếu không đổi" />
       </div>`
    : `<div class="field">
         <label for="u-password">Mật khẩu</label>
         <input type="password" id="u-password" placeholder="Tối thiểu 8 ký tự, có ký tự đặc biệt" />
       </div>`;

  const body = `
    ${usernameField}
    <div class="field">
      <label for="u-fullname">Họ và tên</label>
      <input type="text" id="u-fullname" maxlength="150" value="${u ? escapeHtml(u.fullName) : ''}" placeholder="Nguyễn Văn A" />
    </div>
    ${passField}
    ${id ? `
    <div class="field">
      <label for="u-role">Vai trò</label>
      <select id="u-role" ${isRoot ? 'disabled' : ''}>
        <option value="Customer" ${u && u.role === 'Customer' ? 'selected' : ''}>Người dùng (Customer)</option>
        <option value="Admin" ${u && u.role === 'Admin' ? 'selected' : ''}>Quản trị viên (Admin)</option>
      </select>
      ${isRoot ? '<p class="muted-note" style="margin-top:6px;">Không thể đổi vai trò của tài khoản admin mặc định.</p>' : ''}
    </div>` : ''}`;

  const foot = `
    <button class="btn" onclick="closeModal()">Huỷ</button>
    <button class="btn btn-primary" id="u-save">${id ? 'Lưu' : 'Tạo tài khoản'}</button>`;

  openModal(id ? 'Sửa người dùng' : 'Thêm người dùng', body, foot);
  document.getElementById('u-save').addEventListener('click', () => saveUser(id, isRoot));
}

async function saveUser(id, isRoot) {
  const fullName = document.getElementById('u-fullname').value.trim();
  const password = document.getElementById('u-password').value;
  const roleEl = document.getElementById('u-role');
  const role = roleEl ? roleEl.value : 'Customer';

  if (!fullName) { showToast('Vui lòng nhập họ tên.', 'err'); return; }

  const btn = document.getElementById('u-save');
  btn.disabled = true; btn.textContent = 'Đang lưu...';
  try {
    if (id) {
      const payload = { fullName, role: isRoot ? 'Admin' : role };
      if (password) payload.password = password;
      await api('/api/users/' + id, { method: 'PUT', body: payload });
      showToast('Đã cập nhật người dùng.', 'ok');
    } else {
      const username = document.getElementById('u-username').value.trim();
      if (!username) { throw new Error('Vui lòng nhập tên đăng nhập.'); }
      if (/[^a-zA-Z0-9_]/.test(username)) { throw new Error('Tên đăng nhập không được chứa dấu hoặc ký tự đặc biệt (chỉ chữ a-z, 0-9, dấu gạch dưới).'); }
      if (!password || password.length < 8) { throw new Error('Mật khẩu tối thiểu 8 ký tự.'); }
      if (!/[^a-zA-Z0-9]/.test(password)) { throw new Error('Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (vd: @, #, !, %).'); }
      await api('/api/users', { method: 'POST', body: { username, password, fullName, role } });
      showToast('Đã tạo tài khoản.', 'ok');
    }
    closeModal();
    loadUsers();
  } catch (err) {
    showToast(err.message, 'err');
    btn.disabled = false; btn.textContent = id ? 'Lưu' : 'Tạo tài khoản';
  }
}

function deleteUser(id, users) {
  const u = users.find(x => x.id === id);
  openModal('Xoá người dùng',
    `<p>Xoá tài khoản <b>${escapeHtml(u ? u.username : '')}</b>? Toàn bộ bài viết và lịch họp của người này cũng sẽ bị xoá.</p>`,
    `<button class="btn" onclick="closeModal()">Huỷ</button>
     <button class="btn btn-primary" id="confirm-del-user">Xoá</button>`);
  document.getElementById('confirm-del-user').addEventListener('click', async () => {
    try {
      await api('/api/users/' + id, { method: 'DELETE' });
      closeModal();
      showToast('Đã xoá người dùng.', 'ok');
      loadUsers();
    } catch (err) { showToast(err.message, 'err'); }
  });
}
