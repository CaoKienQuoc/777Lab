/* register.js — xử lý đăng ký tài khoản mới */

// Đã đăng nhập rồi thì vào thẳng trang chính
if (getToken()) {
  window.location.href = '/index.html';
}

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('register-btn');
  const fullName = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const confirm = document.getElementById('confirm').value;

  // Kiểm tra phía client cho thân thiện (server vẫn kiểm tra lại)
  if (!fullName || !email || !username || !password) {
    showToast('Vui lòng nhập đầy đủ thông tin.', 'err');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Email không hợp lệ.', 'err');
    return;
  }
  if (username.length < 3) {
    showToast('Tên đăng nhập phải có ít nhất 3 ký tự.', 'err');
    return;
  }
  if (password.length < 6) {
    showToast('Mật khẩu phải có ít nhất 6 ký tự.', 'err');
    return;
  }
  if (password !== confirm) {
    showToast('Mật khẩu nhập lại không khớp.', 'err');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Đang tạo tài khoản...';
  try {
    const auth = await api('/api/auth/register', {
      method: 'POST',
      body: { fullName, email, username, password }
    });
    saveAuth(auth); // đăng ký xong tự đăng nhập luôn
    showToast('Tạo tài khoản thành công!', 'ok');
    window.location.href = '/index.html';
  } catch (err) {
    showToast(err.message || 'Đăng ký thất bại.', 'err');
    btn.disabled = false;
    btn.textContent = 'Tạo tài khoản';
  }
});
