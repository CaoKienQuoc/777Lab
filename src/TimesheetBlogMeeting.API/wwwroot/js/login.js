/* login.js — xử lý đăng nhập */

// Nếu đã đăng nhập rồi thì vào thẳng trang chính
if (getToken()) {
  window.location.href = '/index.html';
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const remember = document.getElementById('remember-me').checked;

  if (!username || !password) {
    showToast('Vui lòng nhập đầy đủ thông tin.', 'err');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Đang đăng nhập...';
  try {
    const auth = await api('/api/auth/login', {
      method: 'POST',
      body: { username, password }
    });
    saveAuth(auth, remember);
    window.location.href = '/index.html';
  } catch (err) {
    showToast(err.message || 'Đăng nhập thất bại.', 'err');
    btn.disabled = false;
    btn.textContent = 'Đăng nhập';
  }
});

/* ---------- Đăng nhập với Google ---------- */
// Được gọi khi thư viện Google Identity Services tải xong (onload trong login.html)
async function onGoogleLoad() {
  try {
    const cfg = await api('/api/auth/google-config');
    if (!cfg || !cfg.clientId || cfg.clientId.startsWith('YOUR_GOOGLE_CLIENT_ID')) {
      return; // chưa cấu hình -> ẩn nút (mặc định đã ẩn)
    }

    google.accounts.id.initialize({
      client_id: cfg.clientId,
      callback: handleGoogleCredential
    });
    google.accounts.id.renderButton(
      document.getElementById('google-btn'),
      { theme: 'outline', size: 'large', width: 320, text: 'signin_with', locale: 'vi' }
    );

    // Hiện phần Google sau khi nút đã render
    document.getElementById('login-divider').classList.add('show');
    document.getElementById('google-btn').classList.add('show');
  } catch (e) {
    console.error('Không khởi tạo được đăng nhập Google:', e);
  }
}

async function handleGoogleCredential(response) {
  try {
    const auth = await api('/api/auth/google', {
      method: 'POST',
      body: { credential: response.credential }
    });
    saveAuth(auth);
    window.location.href = '/index.html';
  } catch (err) {
    showToast(err.message || 'Đăng nhập Google thất bại.', 'err');
  }
}
