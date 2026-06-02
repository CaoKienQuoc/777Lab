/* =========================================================================
   blog.js — Quản lý bài viết blog
   ========================================================================= */

const EMPTY_BLOG = (admin) => `
  <div class="card"><div class="empty">
    <span class="ico">📰</span>
    <p><b>${t('emptyBlog')}</b></p>
    <p>${admin ? t('emptyBlogHint') : t('availableLater')}</p>
  </div></div>`;

function initBlog() {
  const btn = document.getElementById('btn-new-blog');
  if (!isAdmin()) {
    btn.style.display = 'none';
  } else {
    btn.addEventListener('click', () => openBlogForm(null));
  }
}

async function loadBlogs() {
  const box = document.getElementById('blog-container');
  box.innerHTML = '<div class="spinner"></div>';
  try {
    const posts = await api('/api/blog');
    renderBlogList(posts);
  } catch (err) {
    box.innerHTML = '';
    showToast(err.message, 'err');
  }
}

function renderBlogList(posts) {
  const box = document.getElementById('blog-container');
  if (posts && posts.length) _blogLatestCreatedAt = posts[0].createdAt;
  if (!posts || posts.length === 0) {
    box.innerHTML = EMPTY_BLOG(isAdmin());
    return;
  }

  const me = getUser();
  const items = posts.map(p => {
    const canEdit = isAdmin() || (me && me.userId === p.authorId);
    const thumb = p.imageUrl
      ? `<div class="blog-thumb"><img src="${escapeHtml(p.imageUrl)}" alt="" /></div>`
      : `<div class="blog-thumb"><span class="ph">🗞️</span></div>`;

    const actions = canEdit ? `
      <div class="blog-row-actions">
        <button class="btn btn-ghost btn-sm" data-edit="${p.id}" title="${t('editPost')}">✎</button>
        <button class="btn btn-danger btn-sm" data-del="${p.id}" title="${t('deletePost')}">🗑</button>
      </div>` : '';

    return `
      <div class="blog-item" data-open="${p.id}">
        ${thumb}
        <div class="blog-main">
          <h3>${escapeHtml(p.title)}</h3>
          <div class="blog-excerpt">${escapeHtml(excerpt(p.content, 180))}</div>
          <div class="blog-meta">
            <span>${escapeHtml(p.authorName)}</span>
            <span class="dot"></span>
            <span>${formatDateTime(p.createdAt)}</span>
          </div>
        </div>
        ${actions}
      </div>`;
  }).join('');

  box.innerHTML = `<div class="blog-list">${items}</div>`;

  box.querySelectorAll('[data-open]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-edit],[data-del]')) return;
      openBlogDetail(el.dataset.open);
    });
  });
  box.querySelectorAll('[data-edit]').forEach(b =>
    b.addEventListener('click', () => openBlogForm(b.dataset.edit)));
  box.querySelectorAll('[data-del]').forEach(b =>
    b.addEventListener('click', () => deleteBlog(b.dataset.del)));

  // Người dùng đang xem danh sách -> coi như đã đọc hết
  if (document.getElementById('view-blog').classList.contains('active')) markBlogSeen();
}

function excerpt(text, n) {
  if (!text) return '';
  const t2 = text.replace(/\s+/g, ' ').trim();
  return t2.length > n ? t2.slice(0, n) + '…' : t2;
}

async function openBlogDetail(id) {
  try {
    const p = await api('/api/blog/' + id);
    const img = p.imageUrl ? `<img class="post-image" src="${escapeHtml(p.imageUrl)}" alt="" />` : '';
    const body = `
      <div class="post-detail">
        <h2>${escapeHtml(p.title)}</h2>
        <div class="post-meta">${escapeHtml(p.authorName)} · ${formatDateTime(p.createdAt)}</div>
        <div class="post-body">${escapeHtml(p.content)}</div>
        ${img}
      </div>`;
    openModal(t('postDetail'), body, `<button class="btn" onclick="closeModal()">${t('close')}</button>`, true);
  } catch (err) {
    showToast(err.message, 'err');
  }
}

let _blogImageFile = null;

async function openBlogForm(id) {
  _blogImageFile = null;
  let post = null;
  if (id) {
    try { post = await api('/api/blog/' + id); }
    catch (err) { showToast(err.message, 'err'); return; }
  }

  const existingImg = post && post.imageUrl
    ? `<img class="file-preview" id="blog-img-preview" src="${escapeHtml(post.imageUrl)}" />`
    : `<img class="file-preview hidden" id="blog-img-preview" />`;

  const removeRow = post && post.imageUrl
    ? `<label style="margin-top:10px; font-weight:400; display:flex; gap:8px; align-items:center;">
         <input type="checkbox" id="blog-remove-img" style="width:auto;" /> ${t('removeImage')}
       </label>` : '';

  const body = `
    <div class="field">
      <label for="blog-title">${t('title')}</label>
      <input type="text" id="blog-title" maxlength="300" value="${post ? escapeHtml(post.title) : ''}" placeholder="${t('newPostTitle')}" />
    </div>
    <div class="field">
      <label for="blog-content">${t('content')}</label>
      <textarea id="blog-content" placeholder="${t('newPostTitle')}">${post ? escapeHtml(post.content) : ''}</textarea>
    </div>
    <div class="field">
      <label>${t('image')}</label>
      <div class="file-drop" id="blog-drop">
        <span id="blog-drop-text">${t('selectImage')}</span>
        <input type="file" id="blog-file" accept="image/*" />
      </div>
      ${existingImg}
      ${removeRow}
    </div>`;

  const isEdit = !!id;
  const foot = `
    <button class="btn" onclick="closeModal()">${t('cancel')}</button>
    <button class="btn btn-primary" id="blog-save">${isEdit ? t('save') : t('post')}</button>`;

  openModal(isEdit ? t('editPost') : t('newPostTitle'), body, foot);

  const drop = document.getElementById('blog-drop');
  const file = document.getElementById('blog-file');
  const preview = document.getElementById('blog-img-preview');
  const dropText = document.getElementById('blog-drop-text');
  drop.addEventListener('click', () => file.click());
  file.addEventListener('change', () => {
    const f = file.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { showToast(t('invalidFile'), 'err'); file.value = ''; return; }
    _blogImageFile = f;
    dropText.textContent = '✓ ' + f.name;
    preview.src = URL.createObjectURL(f);
    preview.classList.remove('hidden');
    const rm = document.getElementById('blog-remove-img');
    if (rm) rm.checked = false;
  });

  document.getElementById('blog-save').addEventListener('click', () => saveBlog(id));
}

async function saveBlog(id) {
  const title = document.getElementById('blog-title').value.trim();
  const content = document.getElementById('blog-content').value.trim();
  if (!title || !content) { showToast(t('pleaseEnterTitleAndContent'), 'err'); return; }

  const fd = new FormData();
  fd.append('Title', title);
  fd.append('Content', content);
  if (_blogImageFile) fd.append('Image', _blogImageFile);
  const rm = document.getElementById('blog-remove-img');
  if (rm && rm.checked) fd.append('RemoveImage', 'true');

  const btn = document.getElementById('blog-save');
  const isEdit = !!id;
  btn.disabled = true; btn.textContent = t('saving');
  try {
    await api('/api/blog' + (id ? '/' + id : ''), {
      method: id ? 'PUT' : 'POST',
      body: fd
    });
    closeModal();
    showToast(isEdit ? t('postSaved') : t('postCreated'), 'ok');
    loadBlogs();
  } catch (err) {
    showToast(err.message, 'err');
    btn.disabled = false; btn.textContent = isEdit ? t('save') : t('post');
  }
}

function deleteBlog(id) {
  openModal(t('deletePost'),
    `<p>${t('deletePostConfirm')}</p>`,
    `<button class="btn" onclick="closeModal()">${t('cancel')}</button>
     <button class="btn btn-primary" id="confirm-del-blog">${t('deletePost')}</button>`);
  document.getElementById('confirm-del-blog').addEventListener('click', async () => {
    try {
      await api('/api/blog/' + id, { method: 'DELETE' });
      closeModal();
      showToast(t('deletePostDone'), 'ok');
      loadBlogs();
    } catch (err) { showToast(err.message, 'err'); }
  });
}

/* =========================================================================
   Thông báo bài viết mới — badge trên tab Blog + toast, tự kiểm tra định kỳ
   ========================================================================= */

const BLOG_SEEN_KEY = 'blogLastSeenAt';
const BLOG_POLL_MS = 60000;
let _blogPollTimer = null;
let _blogLatestCreatedAt = '';   // createdAt của bài mới nhất từ lần tải gần nhất
let _blogUnseenCount = 0;        // số badge hiện tại (để biết khi nào có thêm bài mới)

function _blogMyId() { const u = getUser(); return u && u.userId; }

// Số bài mới hơn mốc đã đọc, bỏ qua bài của chính mình
function countUnseenBlogs(posts) {
  const seen = localStorage.getItem(BLOG_SEEN_KEY) || '';
  const myId = _blogMyId();
  return posts.filter(p =>
    p.authorId !== myId && (!seen || toVnDate(p.createdAt) > toVnDate(seen))
  ).length;
}

function renderBlogBadge(n) {
  const tab = document.getElementById('tab-blog');
  if (!tab) return;
  let badge = tab.querySelector('.tab-badge');
  if (n > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'tab-badge';
      tab.appendChild(badge);
    }
    badge.textContent = n > 99 ? '99+' : String(n);
  } else if (badge) {
    badge.remove();
  }
}

// Mở/đang xem tab Blog = đã đọc hết: đặt mốc = bài mới nhất, xoá badge
function markBlogSeen() {
  if (_blogLatestCreatedAt) localStorage.setItem(BLOG_SEEN_KEY, _blogLatestCreatedAt);
  _blogUnseenCount = 0;
  renderBlogBadge(0);
}

// Kiểm tra bài mới. isInitial = true ở lần chạy đầu khi mở app (không bắn toast).
async function checkNewBlogs(isInitial) {
  let posts;
  try { posts = await api('/api/blog'); } catch { return; }
  if (posts.length) _blogLatestCreatedAt = posts[0].createdAt;

  // Lần đầu mở app mà chưa có mốc -> coi như đã đọc hết bài hiện có
  if (isInitial && !localStorage.getItem(BLOG_SEEN_KEY)) { markBlogSeen(); return; }

  // Đang ở tab Blog: cập nhật danh sách nếu có bài mới rồi đánh dấu đã đọc
  if (document.getElementById('view-blog').classList.contains('active')) {
    if (!isInitial && countUnseenBlogs(posts) > 0) renderBlogList(posts);
    markBlogSeen();
    return;
  }

  const n = countUnseenBlogs(posts);
  if (!isInitial && n > _blogUnseenCount) {
    showToast(t('newBlogToast').replace('{n}', n - _blogUnseenCount), 'ok');
  }
  _blogUnseenCount = n;
  renderBlogBadge(n);
}

// Xử lý khi server báo blog thay đổi (gọi từ SignalR ở app.js).
// Đang xem tab Blog -> tải lại danh sách ngay (gồm cả XOÁ/sửa, không chỉ bài mới).
// Không xem -> cập nhật badge + toast.
function onBlogChanged() {
  if (document.getElementById('view-blog').classList.contains('active')) {
    loadBlogs();
  } else {
    checkNewBlogs(false);
  }
}

function startBlogNotify() {
  checkNewBlogs(true);
  // Polling làm lưới an toàn khi WebSocket rớt mạng (SignalR là kênh chính)
  if (_blogPollTimer) clearInterval(_blogPollTimer);
  _blogPollTimer = setInterval(() => checkNewBlogs(false), BLOG_POLL_MS);
}
