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
    searchPlaceholder: 'Tìm kiếm...', tsSearchPlaceholder: 'Tìm kiếm tên...',
    internalSystem: 'Hệ thống nội bộ', createAccount: 'Tạo tài khoản mới', noAccount: 'Chưa có tài khoản?', hasAccount: 'Đã có tài khoản?', login: 'Đăng nhập', register: 'Đăng ký',
    blogAndPosts: 'Blog & Bài viết', newPost: '+ Đăng bài mới', emptyBlog: 'Chưa có bài viết nào.', emptyBlogHint: 'Nhấn “Đăng bài mới” để tạo bài viết đầu tiên.', editPost: 'Sửa bài viết', newPostTitle: 'Đăng bài mới', postDetail: 'Bài viết', cancel: 'Huỷ', save: 'Lưu thay đổi', post: 'Đăng bài', deletePost: 'Xoá bài viết', deletePostConfirm: 'Bạn có chắc chắn muốn xoá bài viết này? Hành động không thể hoàn tác.', deletePostDone: 'Đã xoá bài viết.', postSaved: 'Đã cập nhật bài viết.', postCreated: 'Đã đăng bài viết.', close: 'Đóng', title: 'Tiêu đề', content: 'Nội dung', image: 'Hình ảnh (tuỳ chọn)', selectImage: '📷 Bấm để chọn ảnh (JPG, PNG, GIF, WEBP — tối đa 5MB)', removeImage: 'Xoá ảnh hiện tại', pleaseEnterTitleAndContent: 'Vui lòng nhập tiêu đề và nội dung.', saving: 'Đang lưu...', wantToDelete: 'Bạn có chắc muốn xoá?', by: 'bởi', newBlogToast: 'Có {n} bài viết mới',
    timesheetTitle: 'Bảng chấm công', noTimesheet: 'Chưa có dữ liệu chấm công.', noTimesheetMatch: 'Không có dữ liệu phù hợp.', tsAdminHint: 'Hãy import file Excel hoặc thêm dòng mới.', tsUserHint: 'Vui lòng quay lại sau.', addRowTitle: 'Thêm dòng chấm công', editRowTitle: 'Sửa dòng chấm công', name: 'Họ và tên', date: 'Ngày', hours: 'Số giờ công', timeIn: 'Giờ vào', timeOut: 'Giờ ra', note: 'Ghi chú', action: 'Thao tác', deleteRow: 'Xoá dòng', deleteRowConfirm: 'Xoá dòng chấm công này?', rowDeleted: 'Đã xoá.', importTitle: 'Import Excel', replaceConfirm: 'Xoá toàn bộ dữ liệu cũ trước khi import', importHint: 'File cần có dòng tiêu đề ở hàng đầu (Họ tên, Ngày, Giờ vào, Giờ ra, Số giờ, Ghi chú). Tải “file mẫu” nếu chưa rõ định dạng.', startImport: 'Bắt đầu import', importing: 'Đang xử lý...', importedMsg: 'Đã import', rowsSkipped: 'dòng lỗi bị bỏ qua', noName: 'Vui lòng nhập họ tên.', noDate: 'Vui lòng chọn ngày.', addDone: 'Đã thêm dòng.', editDone: 'Đã cập nhật.',
    leaveTitle: 'Phép tồn', noLeave: 'Chưa có bảng phép tồn.', leaveAdminHint: 'Hãy bấm <b>Import Excel</b> — bảng sẽ được dựng theo đúng các cột trong file của bạn.', leaveUserHint: 'Vui lòng quay lại sau.', addLeaveTitle: 'Thêm dòng phép tồn', editLeaveTitle: 'Sửa dòng phép tồn', pleaseEnterOneCell: 'Vui lòng nhập ít nhất một ô.', leaveSaved: 'Đã cập nhật.', leaveAdded: 'Đã thêm dòng.', deleteLeaveConfirm: 'Xoá dòng phép tồn này?', leaveDeleted: 'Đã xoá.', importLeaveTitle: 'Import Excel', importLeaveHint: 'Bảng sẽ được <b>dựng lại theo đúng các cột trong file</b> (thay thế toàn bộ dữ liệu hiện tại). Chương trình tự dò sheet và dòng tiêu đề.', leaveImportedMsg: 'Đã import',
    meetingTitle: 'Đặt lịch họp', selectDay: 'Chọn một ngày trên lịch để xem khung giờ và đặt lịch họp.', cannotBookPast: 'Không thể đặt lịch cho ngày đã qua. Bạn vẫn có thể xem các cuộc họp bên dưới.', startTime: 'Giờ bắt đầu', endTime: 'Giờ kết thúc', meetingTitleLabel: 'Tiêu đề cuộc họp', desc: 'Mô tả (tuỳ chọn)', book: 'Đặt lịch họp', booking: 'Đang đặt lịch...', booked: 'Đã đặt lịch họp thành công.', noMeeting: 'Chưa có cuộc họp nào trong ngày này.', meetingsToday: 'Cuộc họp trong ngày', cancelMeeting: 'Huỷ lịch họp', cancelMeetingConfirm: 'Bạn có chắc muốn huỷ cuộc họp này?', meetingCancelled: 'Đã huỷ cuộc họp.', timeRangeErr: 'Thời gian họp phải nằm trong khoảng 08:00 – 18:00.', endAfterStart: 'Giờ kết thúc phải sau giờ bắt đầu.', minDuration: 'Thời lượng họp tối thiểu 30 phút.', noTitle: 'Vui lòng nhập tiêu đề cuộc họp.', conflictWith: 'Trùng lịch với cuộc họp', nothing: '(tuỳ chọn)',
    usersTitle: 'Quản lý người dùng', noUser: 'Chưa có người dùng.', username: 'Tên đăng nhập', fullName: 'Họ và tên', role: 'Vai trò', createdAt: 'Ngày tạo', customerLabel: 'Người dùng (Customer)', adminLabel: 'Quản trị viên (Admin)', addUserTitle: 'Thêm người dùng', editUserTitle: 'Sửa người dùng', password: 'Mật khẩu', resetPassword: 'Đặt lại mật khẩu', leaveEmptyIfNoChange: 'Để trống nếu không đổi', minPassword: 'Tối thiểu 8 ký tự', specialCharRequired: 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (vd: @, #, !, %).', usernameRule: 'Tên đăng nhập không được chứa dấu hoặc ký tự đặc biệt (chỉ chữ a-z, 0-9, dấu gạch dưới).', createSuccess: 'Đã tạo tài khoản.', updateSuccess: 'Đã cập nhật người dùng.', userDeleted: 'Đã xoá người dùng.', pleaseEnterFullName: 'Vui lòng nhập họ tên.', pleaseEnterUsername: 'Vui lòng nhập tên đăng nhập.', deleteUserConfirm: 'Xoá tài khoản', deleteUserWarning: 'Toàn bộ bài viết và lịch họp của người này cũng sẽ bị xoá.', rootAdminNote: '(mặc định)', defaultAccount: 'Tài khoản admin mặc định', cannotChangeRole: 'Không thể đổi vai trò của tài khoản admin mặc định.', createBtn: 'Tạo tài khoản',
    invalidFile: 'Ảnh vượt quá 5MB.', rowDeletedMsg: 'Đã xoá.', availableLater: 'Vui lòng quay lại sau.', pastMeeting: 'Không thể đặt lịch cho ngày đã qua.',
    meetingInfo: 'Người đặt:', importXlsWarning: 'File cần có dòng tiêu đề ở hàng đầu (Họ tên, Ngày, Giờ vào, Giờ ra, Số giờ, Ghi chú). Tải “file mẫu” nếu chưa rõ định dạng.', templateBtn: 'Tải file mẫu',
    internal: 'Hệ thống nội bộ', usernamePlaceholder: 'Nhập tên đăng nhập', passwordPlaceholder: 'Nhập mật khẩu', loginBtn: 'Đăng nhập', fullNamePlaceholder: 'Nhập họ và tên', usernameShortHint: 'Ít nhất 3 ký tự', passwordLongHint: 'Ít nhất 6 ký tự', confirmPassword: 'Nhập lại mật khẩu', confirmPasswordPlaceholder: 'Nhập lại mật khẩu', registerBtn: 'Tạo tài khoản'
  },
  ja: {
    admin: '管理者', customer: 'ユーザー', logout: 'ログアウト',
    blog: 'ブログ', leave: '休暇残数', timesheet: '勤怠', meeting: '会議予約', users: 'ユーザー管理',
    addNew: '+ 新規投稿', addRow: '+ 行を追加', importExcel: '⬇ Excelインポート', exportExcel: '⬆ Excelエクスポート',
    exportExcelSm: '⬇ Excelエクスポート', addNewUser: '+ ユーザー追加', downloadTemplate: 'テンプレート',
    searchPlaceholder: '検索...', tsSearchPlaceholder: '名前検索...',
    internalSystem: '社内システム', createAccount: 'アカウント作成', noAccount: 'アカウントをお持ちでないですか？', hasAccount: 'すでにアカウントをお持ちですか？', login: 'ログイン', register: '新規登録',
    blogAndPosts: 'ブログ・記事', newPost: '+ 新規投稿', emptyBlog: 'まだ記事がありません。', emptyBlogHint: '「新規投稿」をクリックして最初の記事を作成してください。', editPost: '記事を編集', newPostTitle: '新規投稿', postDetail: '記事', cancel: 'キャンセル', save: '変更を保存', post: '投稿する', deletePost: '記事を削除', deletePostConfirm: 'この記事を削除してもよろしいですか？この操作は元に戻せません。', deletePostDone: '記事を削除しました。', postSaved: '記事を更新しました。', postCreated: '記事を投稿しました。', close: '閉じる', title: 'タイトル', content: '内容', image: '画像（任意）', selectImage: '📷 画像を選択 (JPG, PNG, GIF, WEBP — 最大5MB)', removeImage: '現在の画像を削除', pleaseEnterTitleAndContent: 'タイトルと内容を入力してください。', saving: '保存中...', wantToDelete: '削除してもよろしいですか？', by: '投稿者', newBlogToast: '新しい記事が{n}件あります',
    timesheetTitle: '勤怠表', noTimesheet: '勤怠データがありません。', noTimesheetMatch: '一致するデータがありません。', tsAdminHint: 'Excelファイルをインポートするか、新しい行を追加してください。', tsUserHint: '後でもう一度確認してください。', addRowTitle: '勤怠行を追加', editRowTitle: '勤怠行を編集', name: '名前', date: '日付', hours: '勤務時間', timeIn: '出勤時間', timeOut: '退勤時間', note: '備考', action: '操作', deleteRow: '行を削除', deleteRowConfirm: 'この勤怠行を削除してもよろしいですか？', rowDeleted: '削除しました。', importTitle: 'Excelインポート', replaceConfirm: 'インポート前に既存データをすべて削除', importHint: 'ファイルの先頭にヘッダー行が必要です（名前、日付、出勤時間、退勤時間、勤務時間、備考）。形式がわからない場合は「テンプレート」をダウンロードしてください。', startImport: 'インポート開始', importing: '処理中...', importedMsg: 'インポート完了：', rowsSkipped: '件のエラー行をスキップ', noName: '名前を入力してください。', noDate: '日付を選択してください。', addDone: '行を追加しました。', editDone: '更新しました。',
    leaveTitle: '休暇残数', noLeave: '休暇残数テーブルがありません。', leaveAdminHint: '<b>Excelインポート</b>をクリックしてください — テーブルはファイルの列に基づいて作成されます。', leaveUserHint: '後でもう一度確認してください。', addLeaveTitle: '休暇残数行を追加', editLeaveTitle: '休暇残数行を編集', pleaseEnterOneCell: '少なくとも1つのセルを入力してください。', leaveSaved: '更新しました。', leaveAdded: '行を追加しました。', deleteLeaveConfirm: 'この休暇残数行を削除してもよろしいですか？', leaveDeleted: '削除しました。', importLeaveTitle: 'Excelインポート', importLeaveHint: '<b>ファイルの列に基づいてテーブルが再構築されます</b>（既存データはすべて置き換え）。プログラムがシートとヘッダー行を自動検出します。', leaveImportedMsg: 'インポート完了：',
    meetingTitle: '会議予約', selectDay: 'カレンダーから日付を選択して時間枠を確認し、会議を予約してください。', cannotBookPast: 'この日は過去の日付のため予約できません。下記の会議を参照できます。', startTime: '開始時間', endTime: '終了時間', meetingTitleLabel: '会議タイトル', desc: '説明（任意）', book: '会議を予約', booking: '予約中...', booked: '会議の予約が完了しました。', noMeeting: 'この日には会議がありません。', meetingsToday: '当日の会議', cancelMeeting: '会議をキャンセル', cancelMeetingConfirm: 'この会議をキャンセルしてもよろしいですか？', meetingCancelled: '会議をキャンセルしました。', timeRangeErr: '会議時間は 08:00～18:00 の範囲で指定してください。', endAfterStart: '終了時間は開始時間より後に設定してください。', minDuration: '会議時間は30分以上にしてください。', noTitle: '会議タイトルを入力してください。', conflictWith: '次の会議と重複しています：', nothing: '（任意）',
    usersTitle: 'ユーザー管理', noUser: 'ユーザーがいません。', username: 'ユーザー名', fullName: '氏名', role: '役割', createdAt: '作成日', customerLabel: 'ユーザー (Customer)', adminLabel: '管理者 (Admin)', addUserTitle: 'ユーザーを追加', editUserTitle: 'ユーザーを編集', password: 'パスワード', resetPassword: 'パスワードをリセット', leaveEmptyIfNoChange: '変更しない場合は空欄', minPassword: 'パスワードは8文字以上', specialCharRequired: 'パスワードに特殊文字を1文字以上含める必要があります（例：@, #, !, %）。', usernameRule: 'ユーザー名には特殊文字や空白を使用できません（a-z, 0-9, _ のみ）。', createSuccess: 'アカウントを作成しました。', updateSuccess: 'ユーザー情報を更新しました。', deleteUserConfirm: 'ユーザーを削除', deleteUserWarning: 'このユーザーの記事と会議もすべて削除されます。', rootAdminNote: '(デフォルト)', defaultAccount: 'デフォルト管理者アカウント', cannotChangeRole: 'デフォルト管理者アカウントの役割は変更できません。', createBtn: 'アカウント作成',
    invalidFile: '画像サイズが5MBを超えています。', rowDeletedMsg: '削除しました。', availableLater: '後でもう一度確認してください。', pastMeeting: 'この日は過去の日付のため予約できません。',
    meetingInfo: '予約者：', importXlsWarning: 'ファイルの先頭にヘッダー行が必要です（名前、日付、出勤時間、退勤時間、勤務時間、備考）。形式がわからない場合は「テンプレート」をダウンロードしてください。', templateBtn: 'テンプレート',
    internal: '社内システム', usernamePlaceholder: 'ユーザー名を入力', passwordPlaceholder: 'パスワードを入力', loginBtn: 'ログイン', fullNamePlaceholder: '氏名を入力', usernameShortHint: '最小3文字', passwordLongHint: '最小6文字', confirmPassword: 'パスワード再入力', confirmPasswordPlaceholder: 'パスワードを再入力してください', registerBtn: 'アカウント作成'
  },
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
  document.getElementById('logout-btn').addEventListener('click', logout);

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

  // Re-apply i18n to static HTML elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (LANG_KEYS[LANG] && LANG_KEYS[LANG][key]) el.textContent = LANG_KEYS[LANG][key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (LANG_KEYS[LANG] && LANG_KEYS[LANG][key]) el.placeholder = LANG_KEYS[LANG][key];
  });
  const titleEl = document.querySelector('[data-i18n-title]');
  if (titleEl && LANG_KEYS[LANG]) {
    const key = titleEl.getAttribute('data-i18n-title');
    if (LANG_KEYS[LANG][key]) titleEl.textContent = LANG_KEYS[LANG][key];
  }

  const defaultView = window.location.hash.slice(1) || 'blog';
  switchView(defaultView);

  // Theo dõi bài viết mới: badge trên tab Blog + toast, tự kiểm tra định kỳ
  try { startBlogNotify(); } catch (e) { console.error('startBlogNotify lỗi:', e); }
  // Real-time toàn site: tự cập nhật khi có thao tác thay đổi dữ liệu
  try { startRealtime(); } catch (e) { console.error('startRealtime lỗi:', e); }
});

const _loaded = {};

function switchView(view) {
  if (view === 'users' && !isAdmin()) view = 'blog';

  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.view === view));
  document.querySelectorAll('.view').forEach(v =>
    v.classList.toggle('active', v.id === 'view-' + view));

  history.replaceState(null, '', '#' + view);

  if (view === 'blog') {
    // Luôn tải lại để bài mới nhất hiển thị; mở tab Blog = đã đọc -> xoá badge
    loadBlogs();
    markBlogSeen();
    _loaded.blog = true;
  } else if (!_loaded[view]) {
    _loaded[view] = true;
    if (view === 'timesheet') loadTimesheet();
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

/* =========================================================================
   Real-time SignalR — server báo có thao tác thay đổi dữ liệu, client cập nhật
   ngay để tránh hiển thị chậm hoặc thao tác trùng lặp giữa nhiều người dùng.
   ========================================================================= */
let _rtConn = null;

function onResourceChanged(info) {
  const res = info && info.resource;
  if (!res) return;
  // Blog có cơ chế riêng (badge + toast khi không mở tab)
  if (res === 'blog') { try { onBlogChanged(); } catch (e) { console.error(e); } return; }
  // Các view khác: chỉ tải lại khi người dùng đang mở đúng view đó
  const sec = document.getElementById('view-' + res);
  if (sec && sec.classList.contains('active')) reloadView(res);
}

function startRealtime() {
  if (!window.signalR || _rtConn) return;
  _rtConn = new signalR.HubConnectionBuilder()
    .withUrl('/hubs/app', { accessTokenFactory: () => getToken() })
    .withAutomaticReconnect()
    .build();
  _rtConn.on('resourceChanged', onResourceChanged);
  // Sau khi nối lại (rớt mạng) -> đồng bộ view đang mở + badge blog
  _rtConn.onreconnected(() => {
    const active = document.querySelector('.tab.active');
    if (active) reloadView(active.dataset.view);
    try { checkNewBlogs(false); } catch (e) { /* bỏ qua */ }
  });
  _rtConn.start().catch(err => console.error('SignalR lỗi:', err));
}
