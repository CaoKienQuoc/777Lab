/* =========================================================================
   users.js — Quản lý người dùng (chỉ admin)
   Thêm / sửa / xoá tài khoản, phân quyền. Không cho xoá/đổi quyền tài khoản
   admin gốc (username "admin").
   ========================================================================= */

const ROOT_ADMIN = 'admin';

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
      <span class="ico">👥</span><p><b>${t('noUser')}</b></p></div></div>`;
    return;
  }

  const rows = users.map((u, i) => {
    const isRoot = u.username === ROOT_ADMIN;
    const roleTag = u.role === 'Admin'
      ? '<span class="role-tag role-admin">' + t('admin') + '</span>'
      : '<span class="role-tag role-customer">' + t('customer') + '</span>';
    return `
      <tr>
        <td class="num">${i + 1}</td>
        <td><b>${escapeHtml(u.username)}</b>${isRoot ? ' <span class="muted-note">' + t('rootAdminNote') + '</span>' : ''}</td>
        <td>${escapeHtml(u.fullName)}</td>
        <td>${roleTag}</td>
        <td>${formatDate(u.createdAt)}</td>
        <td class="num"><div class="row-actions">
          <button class="btn btn-ghost btn-sm" data-edit="${u.id}" title="${t('save')}">✎</button>
          <button class="btn btn-ghost btn-sm" data-reset="${u.id}" title="${t('resetPassword')}">🔑</button>
          <button class="btn btn-danger btn-sm" data-del="${u.id}" title="${t('deletePost')}" ${isRoot ? 'disabled' : ''}>🗑</button>
        </div></td>
      </tr>`;
  }).join('');

  box.innerHTML = `
    <div class="card"><div class="table-wrap">
      <table class="data">
        <thead><tr>
          <th class="num">STT</th><th>${t('username')}</th><th>${t('fullName')}</th>
          <th>${t('role')}</th><th>${t('createdAt')}</th><th class="num">${t('action')}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div></div>`;

  box.querySelectorAll('[data-edit]').forEach(b =>
    b.addEventListener('click', () => openUserForm(b.dataset.edit, users)));
  box.querySelectorAll('[data-reset]').forEach(b =>
    b.addEventListener('click', () => resetUserPassword(b.dataset.reset, users)));
  box.querySelectorAll('[data-del]:not([disabled])').forEach(b =>
    b.addEventListener('click', () => deleteUser(b.dataset.del, users)));
}

function openUserForm(id, users) {
  const u = id && users ? users.find(x => x.id === id) : null;
  const isRoot = u && u.username === ROOT_ADMIN;

  const usernameField = u
    ? `<div class="field">
         <label>${t('username')}</label>
         <input type="text" value="${escapeHtml(u.username)}" disabled />
       </div>`
    : `<div class="field">
         <label for="u-username">${t('username')}</label>
         <input type="text" id="u-username" maxlength="100" placeholder="${t('usernamePlaceholder')}" />
       </div>`;

  const passField = u
    ? `<div class="field">
         <label for="u-password">${t('resetPassword')}</label>
         <input type="password" id="u-password" placeholder="${t('leaveEmptyIfNoChange')}" />
       </div>`
    : `<div class="field">
         <label for="u-password">${t('password')}</label>
         <input type="password" id="u-password" placeholder="${t('minPassword')}" />
       </div>`;

  const body = `
    ${usernameField}
    <div class="field">
      <label for="u-fullname">${t('fullName')}</label>
      <input type="text" id="u-fullname" maxlength="150" value="${u ? escapeHtml(u.fullName) : ''}" placeholder="${t('fullNamePlaceholder')}" />
    </div>
    ${passField}
    ${id ? `
    <div class="field">
      <label for="u-role">${t('role')}</label>
      <select id="u-role" ${isRoot ? 'disabled' : ''}>
        <option value="Customer" ${u && u.role === 'Customer' ? 'selected' : ''}>${t('customerLabel')}</option>
        <option value="Admin" ${u && u.role === 'Admin' ? 'selected' : ''}>${t('adminLabel')}</option>
      </select>
      ${isRoot ? '<p class="muted-note" style="margin-top:6px;">' + t('cannotChangeRole') + '</p>' : ''}
    </div>` : ''}`;

  const isEdit = !!id;
  const foot = `
    <button class="btn" onclick="closeModal()">${t('cancel')}</button>
    <button class="btn btn-primary" id="u-save">${isEdit ? t('save') : t('addNewUser')}</button>`;

  openModal(isEdit ? t('editUserTitle') : t('addUserTitle'), body, foot);
  document.getElementById('u-save').addEventListener('click', () => saveUser(id, isRoot));
}

async function saveUser(id, isRoot) {
  const fullName = document.getElementById('u-fullname').value.trim();
  const password = document.getElementById('u-password').value;
  const roleEl = document.getElementById('u-role');
  const role = roleEl ? roleEl.value : 'Customer';

  if (!fullName) { showToast(t('pleaseEnterFullName'), 'err'); return; }

  const btn = document.getElementById('u-save');
  const isEdit = !!id;
  btn.disabled = true; btn.textContent = t('saving');
  try {
    if (id) {
      const payload = { fullName, role: isRoot ? 'Admin' : role };
      if (password) payload.password = password;
      await api('/api/users/' + id, { method: 'PUT', body: payload });
      showToast(t('updateSuccess'), 'ok');
    } else {
      const username = document.getElementById('u-username').value.trim();
      if (!username) { throw new Error(t('pleaseEnterUsername')); }
      if (!password || password.length < 8) { throw new Error(t('minPassword')); }
      if (!/[^a-zA-Z0-9]/.test(password)) { throw new Error(t('specialCharRequired')); }
      if (/[^a-zA-Z0-9_]/.test(username)) { throw new Error(t('usernameRule')); }
      await api('/api/users', { method: 'POST', body: { username, password, fullName, role } });
      showToast(t('createSuccess'), 'ok');
    }
    closeModal();
    loadUsers();
  } catch (err) {
    showToast(err.message, 'err');
    btn.disabled = false; btn.textContent = isEdit ? t('save') : t('addNewUser');
  }
}

function deleteUser(id, users) {
  const u = users.find(x => x.id === id);
  openModal(t('deleteUserConfirm'),
    `<p>${t('deleteUserConfirm')} <b>${escapeHtml(u ? u.username : '')}</b>? ${t('deleteUserWarning')}</p>`,
    `<button class="btn" onclick="closeModal()">${t('cancel')}</button>
     <button class="btn btn-primary" id="confirm-del-user">${t('deletePost')}</button>`);
  document.getElementById('confirm-del-user').addEventListener('click', async () => {
    try {
      await api('/api/users/' + id, { method: 'DELETE' });
      closeModal();
      showToast(t('userDeleted'), 'ok');
      loadUsers();
    } catch (err) { showToast(err.message, 'err'); }
  });
}

function resetUserPassword(id, users) {
  const u = users.find(x => x.id === id);
  openModal(t('resetPassword'),
    `<p>${t('resetPasswordConfirm')} <b>${escapeHtml(u ? u.username : '')}</b>?</p>
     <p class="muted-note">${t('resetPasswordNote')}</p>`,
    `<button class="btn" onclick="closeModal()">${t('cancel')}</button>
     <button class="btn btn-primary" id="confirm-reset-pw">${t('resetPassword')}</button>`);
  document.getElementById('confirm-reset-pw').addEventListener('click', async () => {
    const btn = document.getElementById('confirm-reset-pw');
    btn.disabled = true; btn.textContent = t('saving');
    try {
      await api('/api/users/' + id + '/reset-password', { method: 'POST' });
      closeModal();
      showToast(t('resetPasswordDone'), 'ok');
      loadUsers();
    } catch (err) {
      showToast(err.message, 'err');
      btn.disabled = false; btn.textContent = t('resetPassword');
    }
  });
}
