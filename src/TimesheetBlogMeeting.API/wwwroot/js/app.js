/* =========================================================================
   app.js — khởi tạo trang chính: bảo vệ đăng nhập, header, chuyển tab
   ========================================================================= */

// --- Bảo vệ: chưa đăng nhập -> về trang login ---
const currentUser = getUser();
if (!getToken() || !currentUser) {
  window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  // ----- Hiển thị thông tin người dùng trên header -----
  document.getElementById('user-fullname').textContent = currentUser.fullName || currentUser.username;
  const tag = document.getElementById('user-role-tag');
  if (currentUser.role === 'Admin') {
    tag.textContent = 'Quản trị viên';
    tag.className = 'role-tag role-admin';
    document.getElementById('tab-users').classList.remove('hidden'); // hiện tab quản lý
  } else {
    tag.textContent = 'Người dùng';
    tag.className = 'role-tag role-customer';
  }

  // ----- Đăng xuất -----
  document.getElementById('logout-btn').addEventListener('click', () => logout());

  // ----- Chuyển tab -----
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });

  // ----- Đóng modal -----
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // ----- Khởi tạo từng module -----
  initBlog();
  initTimesheet();
  initMeeting();
  if (isAdmin()) initUsers();

  // Mở tab Blog mặc định
  switchView('blog');
});

// Lưu các view đã tải để không tải lại nhiều lần không cần thiết
const _loaded = {};

function switchView(view) {
  // Chặn người dùng thường mở tab quản lý
  if (view === 'users' && !isAdmin()) view = 'blog';

  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.view === view));
  document.querySelectorAll('.view').forEach(v =>
    v.classList.toggle('active', v.id === 'view-' + view));

  // Tải dữ liệu lần đầu mở
  if (!_loaded[view]) {
    _loaded[view] = true;
    if (view === 'blog') loadBlogs();
    else if (view === 'timesheet') loadTimesheet();
    else if (view === 'meeting') loadMeetings();
    else if (view === 'users') loadUsers();
  }
}

// Cho phép module khác yêu cầu tải lại 1 view
function reloadView(view) {
  if (view === 'blog') loadBlogs();
  else if (view === 'timesheet') loadTimesheet();
  else if (view === 'meeting') loadMeetings();
  else if (view === 'users') loadUsers();
}
