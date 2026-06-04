/* =========================================================================
   api.js — lớp gọi API dùng chung + tiện ích modal/toast
   Frontend nói chuyện với backend cùng origin nên API_BASE để rỗng.
   ========================================================================= */

const API_BASE = ''; // cùng origin (API phục vụ luôn cả wwwroot)

/* ---------- Lưu / đọc token & thông tin user ----------
   - remember=true  → localStorage (persist across sessions)
   - remember=false → sessionStorage (cleared when browser closes)
*/
function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}
function getUser() {
  const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}
function saveAuth(auth, remember) {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem('token', auth.token);
  storage.setItem('user', JSON.stringify({
    userId: auth.userId,
    username: auth.username,
    fullName: auth.fullName,
    role: auth.role
  }));
}
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
  window.location.href = '/login.html';
}
function isAdmin() {
  const u = getUser();
  return u && u.role === 'Admin';
}

/* ---------- Hàm gọi API trung tâm ----------
   - Tự thêm header Authorization: Bearer ...
   - Tự JSON.stringify body (trừ khi là FormData — để trình duyệt tự set
     Content-Type multipart kèm boundary).
   - 401 -> tự đăng xuất.
   - Nếu server trả file (xlsx) -> trả về Blob.
*/
async function api(path, opts = {}) {
  const headers = opts.headers ? { ...opts.headers } : {};
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  let body = opts.body;
  const isForm = body instanceof FormData;
  if (body !== undefined && body !== null && !isForm && typeof body !== 'string') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const res = await fetch(API_BASE + path, {
    method: opts.method || 'GET',
    headers,
    body
  });

  // 401: phân biệt 2 trường hợp
  if (res.status === 401) {
    // Đang có phiên -> token hết hạn -> đăng xuất
    if (getToken()) {
      logout();
      throw new Error('Phiên đăng nhập đã hết hạn.');
    }
    // Chưa đăng nhập (vd: đang ở trang login) -> trả lỗi thật từ server
    let msg = 'Sai tên đăng nhập hoặc mật khẩu.';
    try {
      const data = await res.json();
      if (data && data.message) msg = data.message;
    } catch { /* giữ message mặc định */ }
    const err = new Error(msg);
    err.status = 401;
    throw err;
  }

  // Tải file (Excel)
  const contentType = res.headers.get('Content-Type') || '';
  if (res.ok && (contentType.includes('spreadsheet') || contentType.includes('octet-stream'))) {
    return await res.blob();
  }

  // 204 No Content
  if (res.status === 204) return null;

  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    const msg = (data && data.message) ? data.message
      : (typeof data === 'string' && data) ? data
      : 'Đã xảy ra lỗi (HTTP ' + res.status + ').';
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  return data;
}

/* Tải Blob về máy với tên file cho trước */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* =========================================================================
   TIỆN ÍCH GIAO DIỆN: modal + toast
   ========================================================================= */
function openModal(title, bodyHtml, footHtml, wide) {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-foot').innerHTML = footHtml || '';
  // wide = true -> rộng (720px); wide = 'xwide' -> rất rộng (vd popup chi tiết blog).
  const box = document.getElementById('modal-box');
  box.classList.toggle('xwide', wide === 'xwide');
  box.classList.toggle('wide', !!wide && wide !== 'xwide');
  overlay.classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

function showToast(message, type, duration) {
  const stack = document.getElementById('toast-stack');
  if (!stack) { alert(message); return; }
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' ' + type : '');
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    setTimeout(() => el.remove(), 300);
  }, duration || 3200);
}

/* ---------- Vài hàm format dùng chung ---------- */

// Bỏ toàn bộ thẻ HTML -> text thuần (dùng cho trích đoạn danh sách, nội dung thông báo)
function stripHtml(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.innerHTML = s;
  return (d.textContent || d.innerText || '').replace(/\s+/g, ' ').trim();
}

// Làm sạch HTML người dùng nhập: giữ định dạng cơ bản, loại bỏ script/handler -> chống XSS
function sanitizeHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  tmp.querySelectorAll('script,style,iframe,object,embed,link,meta,form,input,button').forEach(e => e.remove());
  tmp.querySelectorAll('*').forEach(e => {
    [...e.attributes].forEach(a => {
      const n = a.name.toLowerCase();
      if (n.startsWith('on')) e.removeAttribute(a.name);
      if ((n === 'href' || n === 'src') && /^\s*javascript:/i.test(a.value)) e.removeAttribute(a.name);
    });
  });
  return tmp.innerHTML;
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Chuyển ISO string sang Date theo UTC+7 (không phụ thuộc timezone máy client)
function toVnDate(iso) {
  if (!iso) return null;
  // Nếu chuỗi không có Z hoặc offset -> server trả giờ VN, thêm +07:00 để parse đúng
  const normalized = /Z|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + '+07:00';
  const d = new Date(normalized);
  return isNaN(d) ? null : d;
}

// "2026-05-30T00:00:00" -> "30/05/2026"
function formatDate(iso) {
  const d = toVnDate(iso);
  if (!d) return iso || '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return dd + '/' + mm + '/' + d.getFullYear();
}

// "2026-05-30T14:25:00" -> "30/05/2026 14:25"
function formatDateTime(iso) {
  const d = toVnDate(iso);
  if (!d) return iso || '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`;
}

// Date object -> "YYYY-MM-DD" (theo giờ địa phương, dùng gửi lên server)
function toYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}
