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
  if (!posts || posts.length === 0) {
    box.innerHTML = `
      <div class="card"><div class="empty">
        <span class="ico">📰</span>
        <p><b>Chưa có bài viết nào.</b></p>
        <p>Nhấn “Đăng bài mới” để tạo bài viết đầu tiên.</p>
      </div></div>`;
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
        <button class="btn btn-ghost btn-sm" data-edit="${p.id}" title="Sửa">✎</button>
        <button class="btn btn-danger btn-sm" data-del="${p.id}" title="Xoá">🗑</button>
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

  // Mở chi tiết khi bấm vào bài
  box.querySelectorAll('[data-open]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-edit],[data-del]')) return; // né nút
      openBlogDetail(el.dataset.open);
    });
  });
  box.querySelectorAll('[data-edit]').forEach(b =>
    b.addEventListener('click', () => openBlogForm(b.dataset.edit)));
  box.querySelectorAll('[data-del]').forEach(b =>
    b.addEventListener('click', () => deleteBlog(b.dataset.del)));
}

function excerpt(text, n) {
  if (!text) return '';
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n) + '…' : t;
}

/* ---------- Chi tiết bài viết ---------- */
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
    openModal('Bài viết', body, `<button class="btn" onclick="closeModal()">Đóng</button>`, true);
  } catch (err) {
    showToast(err.message, 'err');
  }
}

/* ---------- Form tạo / sửa ---------- */
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
         <input type="checkbox" id="blog-remove-img" style="width:auto;" /> Xoá ảnh hiện tại
       </label>` : '';

  const body = `
    <div class="field">
      <label for="blog-title">Tiêu đề</label>
      <input type="text" id="blog-title" maxlength="300" value="${post ? escapeHtml(post.title) : ''}" placeholder="Nhập tiêu đề bài viết" />
    </div>
    <div class="field">
      <label for="blog-content">Nội dung</label>
      <textarea id="blog-content" placeholder="Nhập nội dung...">${post ? escapeHtml(post.content) : ''}</textarea>
    </div>
    <div class="field">
      <label>Hình ảnh (tuỳ chọn)</label>
      <div class="file-drop" id="blog-drop">
        <span id="blog-drop-text">📷 Bấm để chọn ảnh (JPG, PNG, GIF, WEBP — tối đa 5MB)</span>
        <input type="file" id="blog-file" accept="image/*" />
      </div>
      ${existingImg}
      ${removeRow}
    </div>`;

  const foot = `
    <button class="btn" onclick="closeModal()">Huỷ</button>
    <button class="btn btn-primary" id="blog-save">${id ? 'Lưu thay đổi' : 'Đăng bài'}</button>`;

  openModal(id ? 'Sửa bài viết' : 'Đăng bài mới', body, foot);

  // Chọn ảnh
  const drop = document.getElementById('blog-drop');
  const file = document.getElementById('blog-file');
  const preview = document.getElementById('blog-img-preview');
  const dropText = document.getElementById('blog-drop-text');
  drop.addEventListener('click', () => file.click());
  file.addEventListener('change', () => {
    const f = file.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { showToast('Ảnh vượt quá 5MB.', 'err'); file.value = ''; return; }
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
  if (!title || !content) { showToast('Vui lòng nhập tiêu đề và nội dung.', 'err'); return; }

  const fd = new FormData();
  fd.append('Title', title);
  fd.append('Content', content);
  if (_blogImageFile) fd.append('Image', _blogImageFile);
  const rm = document.getElementById('blog-remove-img');
  if (rm && rm.checked) fd.append('RemoveImage', 'true');

  const btn = document.getElementById('blog-save');
  btn.disabled = true; btn.textContent = 'Đang lưu...';
  try {
    await api('/api/blog' + (id ? '/' + id : ''), {
      method: id ? 'PUT' : 'POST',
      body: fd
    });
    closeModal();
    showToast(id ? 'Đã cập nhật bài viết.' : 'Đã đăng bài viết.', 'ok');
    loadBlogs();
  } catch (err) {
    showToast(err.message, 'err');
    btn.disabled = false; btn.textContent = id ? 'Lưu thay đổi' : 'Đăng bài';
  }
}

function deleteBlog(id) {
  openModal('Xoá bài viết',
    '<p>Bạn có chắc chắn muốn xoá bài viết này? Hành động không thể hoàn tác.</p>',
    `<button class="btn" onclick="closeModal()">Huỷ</button>
     <button class="btn btn-primary" id="confirm-del-blog">Xoá</button>`);
  document.getElementById('confirm-del-blog').addEventListener('click', async () => {
    try {
      await api('/api/blog/' + id, { method: 'DELETE' });
      closeModal();
      showToast('Đã xoá bài viết.', 'ok');
      loadBlogs();
    } catch (err) { showToast(err.message, 'err'); }
  });
}
