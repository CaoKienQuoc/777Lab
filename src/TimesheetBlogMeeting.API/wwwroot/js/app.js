/* =========================================================================
   app.js — khởi tạo trang chính: bảo vệ đăng nhập, header, chuyển tab, đa ngôn ngữ
   ========================================================================= */

const LANG = localStorage.getItem('lang') || 'vi';
const LANG_KEYS = {
  vi: {
    admin: 'Quản trị viên', customer: 'Người dùng', logout: 'Đăng xuất',
    blog: 'Blog', leave: 'Phép tồn', timesheet: 'Chấm công', meeting: 'Lịch họp', users: 'Người dùng',
    addNew: '+ Đăng bài mới', addRow: '+ Thêm dòng', importExcel: '⬇ Import Excel', exportExcel: '⬆ Xuất Excel',
    exportExcelSm: '⬇ Xuất Excel', addNewUser: '+ Thêm người dùng', downloadTemplate: 'Tải file mẫu',
    searchPlaceholder: 'Tìm kiếm...', tsSearchPlaceholder: 'Tìm kiếm tên...'
  },
  ja: {
    admin: '管理者', customer: 'ユーザー', logout: 'ログアウト',
    blog: 'ブログ', leave: '休暇残数', timesheet: '勤怠', meeting: '会議予約', users: 'ユーザー管理',
    addNew: '+ 新規投稿', addRow: '+ 行を追加', importExcel: '⬇ Excelインポート', exportExcel: '⬆ Excelエクスポート',
    exportExcelSm: '⬇ Excelエクスポート', addNewUser: '+ ユーザー追加', downloadTemplate: 'テンプレート',
    searchPlaceholder: '検索...', tsSearchPlaceholder: '名前検索...'
  }
};

function t(key) { return LANG_KEYS[LANG][key] || key; }
function setLang(lang) {
  localStorage.setItem('lang', lang);
  location.reload();
}

// --- Bảo vệ: chưa đăng nhập -> về trang login ---
const currentUser = getUser();
if (!getToken() || !currentUser) {
  window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('user-fullname').textContent = currentUser.fullName || currentUser.username;
  const tag = document.getElementById('user-role-tag');
  if (currentUser.role === 'Admin') {
    tag.textContent = t('admin');
    tag.className = 'role-tag role-admin';
    document.getElementById('tab-users').classList.remove('hidden');
  } else {
    tag.textContent = t('customer');
    tag.className = 'role-tag role-customer';
  }

  document.getElementById('logout-btn').textContent = t('logout');

  // Language flag click
  document.getElementById('lang-flag').addEventListener('click', () => {
    setLang(LANG === 'vi' ? 'ja' : 'vi');
  });

  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    const tabKey = tab.dataset.view;
    if (LANG_KEYS.vi[tabKey]) tab.innerHTML = tab.innerHTML.replace(/(<span class="ico">.*<\/span> )(.+)/, `$1${t(tabKey)}`);
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  [initBlog, initTimesheet, initLeave, initMeeting].forEach(fn => {
    try { fn(); } catch (e) { console.error(fn.name + ' lỗi:', e); }
  });
  if (isAdmin()) { try { initUsers(); } catch (e) { console.error('initUsers lỗi:', e); } }

  // Language-specific elements
  document.getElementById('lang-flag').src = LANG === 'vi' ? 'https://flagcdn.com/vn.svg' : 'https://flagcdn.com/jp.svg';
  document.getElementById('lang-flag').alt = LANG.toUpperCase();

  const defaultView = window.location.hash.slice(1) || 'blog';
  switchView(defaultView);
});

const _loaded = {};

function switchView(view) {
  if (view === 'users' && !isAdmin()) view = 'blog';

  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.view === view));
  document.querySelectorAll('.view').forEach(v =>
    v.classList.toggle('active', v.id === 'view-' + view));

  history.replaceState(null, '', '#' + view);

  if (!_loaded[view]) {
    _loaded[view] = true;
    if (view === 'blog') loadBlogs();
    else if (view === 'timesheet') loadTimesheet();
    else if (view === 'leave') loadLeave();
    else if (view === 'meeting') loadMeetings();
    else if (view === 'users') loadUsers();
  }
}

function reloadView(view) {
  if (view === 'blog') loadBlogs();
  else if (view === 'timesheet') loadTimesheet();
  else if (view === 'leave') loadLeave();
  else if (view === 'meeting') loadMeetings();
  else if (view === 'users') loadUsers();
}
