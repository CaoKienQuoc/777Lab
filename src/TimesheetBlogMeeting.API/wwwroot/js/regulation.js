/* =========================================================================
   regulation.js — Quản lý quy định (chỉ admin tạo/sửa/xoá, mọi người cùng xem)
   ========================================================================= */

const EMPTY_REGULATION = (admin) => `
  <div class="card"><div class="empty">
    <span class="ico">📜</span>
    <p><b>${t('emptyRegulation')}</b></p>
    <p>${admin ? t('emptyRegulationHint') : t('availableLater')}</p>
  </div></div>`;

function initRegulation() {
  const btn = document.getElementById('btn-new-regulation');
  if (!isAdmin()) {
    btn.style.display = 'none';
  } else {
    btn.addEventListener('click', () => openRegulationForm(null));
  }
}

async function loadRegulations() {
  const box = document.getElementById('regulation-container');
  box.innerHTML = '<div class="spinner"></div>';
  try {
    const posts = await api('/api/regulation');
    renderRegulationList(posts);
  } catch (err) {
    box.innerHTML = '';
    showToast(err.message, 'err');
  }
}

function renderRegulationList(posts) {
  const box = document.getElementById('regulation-container');
  if (!posts || posts.length === 0) {
    box.innerHTML = EMPTY_REGULATION(isAdmin());
    return;
  }

  const items = posts.map(p => {
    const canEdit = isAdmin();
    const thumb = p.imageUrl
      ? `<div class="blog-thumb"><img src="${escapeHtml(p.imageUrl)}" alt="" /></div>`
      : `<div class="blog-thumb"><span class="ph">📜</span></div>`;

    const dateStr = `${t('postedAt')}: ${formatDateTime(p.createdAt)}`;

    const actions = canEdit
      ? `<div class="blog-actions">
           <button class="btn btn-sm" data-edit="${p.id}">✏️ ${t('editRegulation')}</button>
           <button class="btn btn-sm btn-danger" data-del="${p.id}">🗑️ ${t('deleteRegulation')}</button>
         </div>`
      : '';

    return `
      <div class="blog-item" data-open="${p.id}">
        ${thumb}
        <div class="blog-main">
          <h3>${escapeHtml(p.title)}</h3>
          <div class="blog-excerpt">${renderRichContent(p.content)}</div>
          <div class="blog-meta">${dateStr}</div>
        </div>
        ${actions}
      </div>`;
  }).join('');

  box.innerHTML = `<div class="blog-list">${items}</div>`;

  box.querySelectorAll('[data-open]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-edit],[data-del]')) return;
      openRegulationDetail(el.dataset.open);
    });
  });
  box.querySelectorAll('[data-edit]').forEach(b =>
    b.addEventListener('click', () => openRegulationForm(b.dataset.edit)));
  box.querySelectorAll('[data-del]').forEach(b =>
    b.addEventListener('click', () => deleteRegulation(b.dataset.del)));
}

async function openRegulationDetail(id) {
  try {
    const p = await api('/api/regulation/' + id);
    const img = p.imageUrl ? `<img class="post-image" src="${escapeHtml(p.imageUrl)}" alt="" />` : '';
    const createdLine = `${t('postedAt')}: ${formatDateTime(p.createdAt)}`;
    const body = `
      <div class="post-detail">
        <h2>${escapeHtml(p.title)}</h2>
        <div class="post-body">${renderRichContent(p.content)}</div>
        ${img}
        <div class="post-meta post-meta-bottom">
          <span class="post-date">${createdLine}</span>
        </div>
      </div>`;
    openModal(t('regulationDetail'), body, `<button class="btn" onclick="closeModal()">${t('close')}</button>`, 'xwide');
  } catch (err) {
    showToast(err.message, 'err');
  }
}

let _regImageFile = null;

async function openRegulationForm(id) {
  _regImageFile = null;
  let post = null;
  if (id) {
    try { post = await api('/api/regulation/' + id); }
    catch (err) { showToast(err.message, 'err'); return; }
  }

  const existingImg = post && post.imageUrl
    ? `<img class="file-preview" id="reg-img-preview" src="${escapeHtml(post.imageUrl)}" />`
    : `<img class="file-preview hidden" id="reg-img-preview" />`;

  const removeRow = post && post.imageUrl
    ? `<label style="margin-top:10px; font-weight:400; display:flex; gap:8px; align-items:center;">
         <input type="checkbox" id="reg-remove-img" style="width:auto;" /> ${t('removeImage')}
       </label>` : '';

  const body = `
    <div class="field">
      <label for="reg-title">${t('title')}</label>
      <input type="text" id="reg-title" maxlength="300" value="${post ? escapeHtml(post.title) : ''}" placeholder="${t('newRegulationTitle')}" />
    </div>
    <div class="field">
      <label>${t('content')}</label>
      <div class="rte">
        <div class="rte-toolbar">
          <button type="button" class="rte-btn" data-cmd="bold" title="${t('rteBold')}"><b>B</b></button>
          <button type="button" class="rte-btn" data-cmd="italic" title="${t('rteItalic')}"><i>I</i></button>
          <button type="button" class="rte-btn" data-cmd="underline" title="${t('rteUnderline')}"><u>U</u></button>
          <span class="rte-sep"></span>
          <select class="rte-select" id="reg-rte-font" title="${t('rteFont')}">
            <option value="">${t('rteFont')}</option>
            <option value="Be Vietnam Pro">Be Vietnam Pro</option>
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Georgia">Georgia</option>
            <option value="Tahoma">Tahoma</option>
            <option value="Courier New">Courier New</option>
          </select>
          <select class="rte-select rte-size-select" id="reg-rte-size" title="${t('rteSize')}">
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
          <input type="color" id="reg-rte-color" class="rte-color" value="#9b2226" title="${t('rteColor')}" />
        </div>
        <div class="rte-editor" id="reg-content" contenteditable="true" data-ph="${t('newRegulationTitle')}">${post ? renderRichContent(post.content) : ''}</div>
      </div>
    </div>
    <div class="field">
      <label>${t('image')}</label>
      <div class="file-drop" id="reg-drop">
        <span id="reg-drop-text">${t('selectImage')}</span>
        <input type="file" id="reg-file" accept="image/*" />
      </div>
      ${existingImg}
      ${removeRow}
    </div>`;

  const isEdit = !!id;
  const foot = `
    <button class="btn" onclick="closeModal()">${t('cancel')}</button>
    <button class="btn btn-primary" id="reg-save">${isEdit ? t('save') : t('postRegulation')}</button>`;

  openModal(isEdit ? t('editRegulation') : t('newRegulationTitle'), body, foot);

  const drop = document.getElementById('reg-drop');
  const file = document.getElementById('reg-file');
  const preview = document.getElementById('reg-img-preview');
  const dropText = document.getElementById('reg-drop-text');
  drop.addEventListener('click', () => file.click());
  file.addEventListener('change', () => {
    const f = file.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { showToast(t('invalidFile'), 'err'); file.value = ''; return; }
    _regImageFile = f;
    dropText.textContent = '✓ ' + f.name;
    preview.src = URL.createObjectURL(f);
    preview.classList.remove('hidden');
    const rm = document.getElementById('reg-remove-img');
    if (rm) rm.checked = false;
  });

  const editor = document.getElementById('reg-content');
  let savedRange = null;
  const saveSel = () => {
    const s = window.getSelection();
    if (s && s.rangeCount && editor.contains(s.anchorNode)) savedRange = s.getRangeAt(0).cloneRange();
  };
  const restoreSel = () => {
    if (savedRange) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(savedRange); }
  };
  ['keyup', 'mouseup', 'blur'].forEach(ev => editor.addEventListener(ev, saveSel));

  document.querySelectorAll('#reg-save, [id^=reg-rte-]').forEach(() => {}); // placeholder
  document.querySelectorAll('.rte-btn[data-cmd]').forEach(b => {
    b.addEventListener('mousedown', e => e.preventDefault());
    b.addEventListener('click', () => { editor.focus(); document.execCommand(b.dataset.cmd, false, null); saveSel(); });
  });
  const fontSel = document.getElementById('reg-rte-font');
  if (fontSel) fontSel.addEventListener('change', () => {
    editor.focus(); restoreSel();
    if (fontSel.value) document.execCommand('fontName', false, fontSel.value);
    fontSel.selectedIndex = 0; saveSel();
  });
  const sizeSel = document.getElementById('reg-rte-size');
  if (sizeSel) sizeSel.addEventListener('change', () => {
    editor.focus(); restoreSel();
    if (sizeSel.value) {
      document.execCommand('styleWithCSS', false, false);
      document.execCommand('fontSize', false, '7');
      editor.querySelectorAll('font[size="7"]').forEach(f => {
        f.removeAttribute('size');
        f.style.fontSize = sizeSel.value + 'px';
      });
    }
    sizeSel.selectedIndex = 0; saveSel();
  });
  const colorPicker = document.getElementById('reg-rte-color');
  if (colorPicker) colorPicker.addEventListener('input', () => {
    editor.focus(); restoreSel();
    document.execCommand('foreColor', false, colorPicker.value);
    saveSel();
  });

  document.getElementById('reg-save').addEventListener('click', () => saveRegulation(id));
}

async function saveRegulation(id) {
  const title = document.getElementById('reg-title').value.trim();
  const editor = document.getElementById('reg-content');
  const content = sanitizeHtml(editor ? editor.innerHTML : '').trim();
  if (!title || !stripHtml(content)) { showToast(t('pleaseEnterTitleAndContent'), 'err'); return; }

  const fd = new FormData();
  fd.append('Title', title);
  fd.append('Content', content);
  if (_regImageFile) fd.append('Image', _regImageFile);
  const rm = document.getElementById('reg-remove-img');
  if (rm && rm.checked) fd.append('RemoveImage', 'true');

  const btn = document.getElementById('reg-save');
  const isEdit = !!id;
  btn.disabled = true; btn.textContent = t('saving');
  try {
    await api('/api/regulation' + (id ? '/' + id : ''), {
      method: id ? 'PUT' : 'POST',
      body: fd
    });
    closeModal();
    showToast(isEdit ? t('regulationSaved') : t('regulationCreated'), 'ok');
    loadRegulations();
  } catch (err) {
    showToast(err.message, 'err');
    btn.disabled = false; btn.textContent = isEdit ? t('save') : t('postRegulation');
  }
}

function deleteRegulation(id) {
  openModal(t('deleteRegulation'),
    `<p>${t('deleteRegulationConfirm')}</p>`,
    `<button class="btn" onclick="closeModal()">${t('cancel')}</button>
     <button class="btn btn-primary" id="confirm-del-reg">${t('deleteRegulation')}</button>`);
  document.getElementById('confirm-del-reg').addEventListener('click', async () => {
    try {
      await api('/api/regulation/' + id, { method: 'DELETE' });
      closeModal();
      showToast(t('deleteRegulationDone'), 'ok');
      loadRegulations();
    } catch (err) { showToast(err.message, 'err'); }
  });
}

async function onRegulationChanged() {
  if (document.getElementById('view-regulation').classList.contains('active')) {
    loadRegulations();
  }
}
