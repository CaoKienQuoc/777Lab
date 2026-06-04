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

    // Bỏ tên tác giả; chỉ hiển thị "Đăng lúc" (luôn có) và "Thời Gian" (nếu có lịch).
    // Dấu chấm làm dải phân cách GIỮA các mục (không bị dấu chấm thừa ở đầu dòng).
    const dateParts = [];
    if (p.scheduledAt) dateParts.push(`<span>📅 ${t('schedulePost')}: ${formatDateTime(p.scheduledAt)}</span>`);
    dateParts.push(`<span>${t('postedAt')}: ${formatDateTime(p.createdAt)}</span>`);
    const displayDate = dateParts.join('<span class="dot"></span>');

    const actions = canEdit
      ? `<div class="blog-actions">
           <button class="btn btn-sm" data-edit="${p.id}">✏️ ${t('editPost')}</button>
           <button class="btn btn-sm btn-danger" data-del="${p.id}">🗑️ ${t('deletePost')}</button>
         </div>`
      : '';

    return `
      <div class="blog-item" data-open="${p.id}">
        ${thumb}
        <div class="blog-main">
          <h3>${escapeHtml(p.title)}</h3>
          <div class="blog-excerpt">${renderRichContent(p.content)}</div>
          <div class="blog-meta">
            ${displayDate}
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
  const t2 = stripHtml(text);
  return t2.length > n ? t2.slice(0, n) + '…' : t2;
}

function toDatetimeLocal(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Hiển thị nội dung bài viết: HTML đã làm sạch; bài cũ dạng text thuần thì giữ xuống dòng
function renderRichContent(content) {
  if (!content) return '';
  if (content.indexOf('<') === -1) return escapeHtml(content).replace(/\n/g, '<br>');
  return sanitizeHtml(content);
}

async function openBlogDetail(id) {
  try {
    const p = await api('/api/blog/' + id);
    const img = p.imageUrl ? `<img class="post-image" src="${escapeHtml(p.imageUrl)}" alt="" />` : '';
    // Luôn hiển thị "Đăng lúc" (ngày tạo); nếu có "Thời Gian" (lịch) thì hiển thị thêm.
    const scheduledLine = p.scheduledAt ? `📅 ${t('schedulePost')}: ${formatDateTime(p.scheduledAt)}` : '';
    const createdLine = `${t('postedAt')}: ${formatDateTime(p.createdAt)}`;
    const body = `
      <div class="post-detail">
        <h2>${escapeHtml(p.title)}</h2>
        <div class="post-body">${renderRichContent(p.content)}</div>
        ${img}
        <div class="post-meta post-meta-bottom">
          ${scheduledLine ? `<span class="post-date">${scheduledLine}</span>` : ''}
          <span class="post-date">${createdLine}</span>
        </div>
      </div>`;
    openModal(t('postDetail'), body, `<button class="btn" onclick="closeModal()">${t('close')}</button>`, 'xwide');
  } catch (err) {
    showToast(err.message, 'err');
  }
}

let _blogImageFile = null;
// Ngày lên lịch gốc khi mở form sửa — cho phép giữ nguyên ngày đã qua mà không bị chặn.
let _blogOrigScheduledDate = '';

async function openBlogForm(id) {
  _blogImageFile = null;
  let post = null;
  if (id) {
    try { post = await api('/api/blog/' + id); }
    catch (err) { showToast(err.message, 'err'); return; }
  }
  _blogOrigScheduledDate = post && post.scheduledAt ? toDatetimeLocal(post.scheduledAt).slice(0, 10) : '';

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
      <label for="blog-scheduled-date">${t('schedulePost')}</label>
      <div class="schedule-row">
        <input type="date" id="blog-scheduled-date" class="schedule-date" min="${toYMD(new Date())}" value="${post && post.scheduledAt ? toDatetimeLocal(post.scheduledAt).slice(0, 10) : ''}" />
        <input type="time" id="blog-scheduled-time" class="schedule-time" step="60" value="${post && post.scheduledAt ? toDatetimeLocal(post.scheduledAt).slice(11) : ''}" />
      </div>
    </div>
    <div class="field">
      <label>${t('content')}</label>
      <div class="rte">
        <div class="rte-toolbar">
          <button type="button" class="rte-btn" data-cmd="bold" title="${t('rteBold')}"><b>B</b></button>
          <button type="button" class="rte-btn" data-cmd="italic" title="${t('rteItalic')}"><i>I</i></button>
          <button type="button" class="rte-btn" data-cmd="underline" title="${t('rteUnderline')}"><u>U</u></button>
          <span class="rte-sep"></span>
          <select class="rte-select" id="rte-font" title="${t('rteFont')}">
            <option value="">${t('rteFont')}</option>
            <option value="Be Vietnam Pro">Be Vietnam Pro</option>
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Georgia">Georgia</option>
            <option value="Tahoma">Tahoma</option>
            <option value="Courier New">Courier New</option>
          </select>
          <select class="rte-select rte-size-select" id="rte-size" title="${t('rteSize')}">
            <option value="">${t('rteSize')}</option>
            <option value="12">12</option>
            <option value="13">13</option>
            <option value="14">14</option>
            <option value="16">16</option>
            <option value="18">18</option>
            <option value="20">20</option>
            <option value="24">24</option>
            <option value="28">28</option>
            <option value="32">32</option>
            <option value="36">36</option>
            <option value="42">42</option>
            <option value="48">48</option>
            <option value="64">64</option>
          </select>
          <input type="color" id="rte-color" class="rte-color" value="#9b2226" title="${t('rteColor')}" />
        </div>
        <div class="rte-editor" id="blog-content" contenteditable="true" data-ph="${t('newPostTitle')}">${post ? renderRichContent(post.content) : ''}</div>
      </div>
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

  // --- Thanh công cụ soạn thảo: đậm / nghiêng / gạch chân / font / cỡ chữ ---
  const editor = document.getElementById('blog-content');
  let savedRange = null;
  const saveSel = () => {
    const s = window.getSelection();
    if (s && s.rangeCount && editor.contains(s.anchorNode)) savedRange = s.getRangeAt(0).cloneRange();
  };
  const restoreSel = () => {
    if (savedRange) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(savedRange); }
  };
  ['keyup', 'mouseup', 'blur'].forEach(ev => editor.addEventListener(ev, saveSel));

  document.querySelectorAll('.rte-btn[data-cmd]').forEach(b => {
    b.addEventListener('mousedown', e => e.preventDefault());   // giữ vùng chọn, không cướp focus
    b.addEventListener('click', () => { editor.focus(); document.execCommand(b.dataset.cmd, false, null); saveSel(); });
  });
  const fontSel = document.getElementById('rte-font');
  if (fontSel) fontSel.addEventListener('change', () => {
    editor.focus(); restoreSel();
    if (fontSel.value) document.execCommand('fontName', false, fontSel.value);
    fontSel.selectedIndex = 0; saveSel();
  });
  const sizeSel = document.getElementById('rte-size');
  if (sizeSel) sizeSel.addEventListener('change', () => {
    editor.focus(); restoreSel();
    if (sizeSel.value) {
      // execCommand chỉ nhận cỡ 1..7 -> dùng "7" làm dấu rồi đổi sang font-size px chính xác (như Word)
      document.execCommand('styleWithCSS', false, false);
      document.execCommand('fontSize', false, '7');
      editor.querySelectorAll('font[size="7"]').forEach(f => {
        f.removeAttribute('size');
        f.style.fontSize = sizeSel.value + 'px';
      });
    }
    sizeSel.selectedIndex = 0; saveSel();
  });
  const colorPicker = document.getElementById('rte-color');
  if (colorPicker) colorPicker.addEventListener('input', () => {
    editor.focus(); restoreSel();
    document.execCommand('foreColor', false, colorPicker.value);
    saveSel();
  });

  document.getElementById('blog-save').addEventListener('click', () => saveBlog(id));
}

async function saveBlog(id) {
  const title = document.getElementById('blog-title').value.trim();
  const editor = document.getElementById('blog-content');
  const content = sanitizeHtml(editor ? editor.innerHTML : '').trim();
  if (!title || !stripHtml(content)) { showToast(t('pleaseEnterTitleAndContent'), 'err'); return; }

  const fd = new FormData();
  fd.append('Title', title);
  fd.append('Content', content);
  if (_blogImageFile) fd.append('Image', _blogImageFile);
  const rm = document.getElementById('blog-remove-img');
  if (rm && rm.checked) fd.append('RemoveImage', 'true');
  const scheduledDate = document.getElementById('blog-scheduled-date');
  const scheduledTime = document.getElementById('blog-scheduled-time');
  if (scheduledDate && scheduledDate.value) {
    // Chặn lên lịch vào ngày đã qua (so sánh chuỗi YYYY-MM-DD là đúng thứ tự thời gian).
    // Khi sửa bài cũ, cho phép giữ nguyên ngày gốc dù ngày đó đã qua.
    if (scheduledDate.value < toYMD(new Date()) && scheduledDate.value !== _blogOrigScheduledDate) {
      showToast(t('scheduleNoPast'), 'err');
      return;
    }
    fd.append('ScheduledDate', scheduledDate.value);
    fd.append('ScheduledTime', scheduledTime && scheduledTime.value ? scheduledTime.value : '00:00');
  }

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

// Đẩy thông báo (chuông) cho bài mới hơn mốc đã đọc, bỏ qua bài của chính mình.
// addNotif tự chống trùng theo key='blog:'+id nên gọi lại nhiều lần không bị lặp.
function pushBlogNotifs(posts) {
  if (typeof addNotif !== 'function') return;
  const seen = localStorage.getItem(BLOG_SEEN_KEY) || '';
  const myId = _blogMyId();
  posts.forEach(p => {
    if (p.authorId !== myId && (!seen || toVnDate(p.createdAt) > toVnDate(seen))) {
      addNotif({
        key: 'blog:' + p.id, type: 'blog', view: 'blog', refId: p.id,
        title: t('notifBlogNew') + ': ' + p.title,
        body: excerpt(p.content, 90)
      });
    }
  });
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

  // Đang ở tab Blog: vẫn đẩy bài mới vào chuông, cập nhật danh sách rồi đánh dấu đã đọc.
  // (push gated theo mốc đã đọc + chống trùng theo id nên không gây thông báo lặp/flood;
  //  bỏ qua lần chạy đầu isInitial để không đẩy hàng loạt bài cũ.)
  if (document.getElementById('view-blog').classList.contains('active')) {
    if (!isInitial) {
      pushBlogNotifs(posts);
      if (countUnseenBlogs(posts) > 0) renderBlogList(posts);
    }
    markBlogSeen();
    return;
  }

  pushBlogNotifs(posts);                       // lưu vào chuông thông báo
  const n = countUnseenBlogs(posts);
  if (!isInitial && n > _blogUnseenCount) {
    showToast(t('newBlogToast').replace('{n}', n - _blogUnseenCount), 'ok');
  }
  _blogUnseenCount = n;
  renderBlogBadge(n);
}

// Xử lý khi server báo blog thay đổi (gọi từ SignalR ở app.js).
// Đang xem tab Blog -> vẫn đẩy bài mới vào chuông RỒI tải lại danh sách
//                      (gồm cả XOÁ/sửa, không chỉ bài mới).
// Không xem -> cập nhật badge + toast (checkNewBlogs đã tự đẩy chuông).
async function onBlogChanged() {
  if (document.getElementById('view-blog').classList.contains('active')) {
    // Phải push TRƯỚC khi render vì renderBlogList sẽ markBlogSeen (nâng mốc đã đọc);
    // nếu render trước thì bài mới bị coi là đã đọc và không vào chuông nữa.
    let posts;
    try { posts = await api('/api/blog'); } catch { return; }
    pushBlogNotifs(posts);
    renderBlogList(posts);
  } else {
    checkNewBlogs(false);
  }
}

function startBlogNotify() {
  checkNewBlogs(true);
  if (_blogPollTimer) clearInterval(_blogPollTimer);
  _blogPollTimer = setInterval(() => checkNewBlogs(false), BLOG_POLL_MS);
}

/* =========================================================================
   Bài viết theo lịch — kiểm tra mỗi phút, nếu sang ngày mới thì tải danh sách
   bài được lên lịch cho hôm nay và hiển thị banner ở đầu tab Blog.
   ========================================================================= */
let _scheduledCheckDate = '';

function renderScheduledBanner(posts) {
  const view = document.getElementById('view-blog');
  if (!view) return;
  let banner = view.querySelector('.blog-scheduled-banner');
  if (!posts || posts.length === 0) {
    if (banner) banner.remove();
    return;
  }
  if (!banner) {
    banner = document.createElement('div');
    banner.className = 'blog-scheduled-banner';
    view.insertBefore(banner, view.querySelector('#blog-container'));
  }
  const titles = posts.map(p => escapeHtml(p.title)).join(', ');
  banner.innerHTML = `
    <span class="blog-scheduled-banner-ico">📅</span>
    <span class="blog-scheduled-banner-text">${t('scheduledToday').replace('{n}', posts.length)}: <b>${titles}</b></span>
    <button class="blog-scheduled-banner-close" title="${t('close')}">&times;</button>`;
  banner.querySelector('.blog-scheduled-banner-close').addEventListener('click', () => banner.remove());
  // Đẩy thông báo vào chuông nếu chưa có
  if (typeof addNotif === 'function' && !banner.dataset.notified) {
    banner.dataset.notified = '1';
    addNotif({
      key: 'scheduled:' + toYMD(new Date()),
      type: 'blog',
      view: 'blog',
      title: t('scheduledToday').replace('{n}', posts.length),
      body: titles
    });
  }
}

async function checkScheduledPosts() {
  try {
    const today = toYMD(new Date());
    const posts = await api('/api/blog?scheduledDate=' + today);
    renderScheduledBanner(posts);
  } catch { /* bỏ qua lỗi mạng */ }
}

function startScheduledCheck() {
  _scheduledCheckDate = toYMD(new Date());
  checkScheduledPosts();
  setInterval(() => {
    const now = toYMD(new Date());
    if (now !== _scheduledCheckDate) {
      _scheduledCheckDate = now;
      checkScheduledPosts();
    }
  }, 60000);
}
