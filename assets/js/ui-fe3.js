/*
  VNU-RENT — ui-fe3.js
  JS Giao diện cho Thành viên 3 (TV3): profile.html, about.html, chat.html
  Quy tắc:
    1. Chỉ xử lý hiển thị giao diện, không chặn sự kiện submit trên bất kỳ form nào.
    2. Đóng gói các hàm điều khiển UI vào window.*
    3. Giữ nguyên file gốc trong các thẻ <input type="file">
 */

// 1. CHUYỂN TAB PROFILE (ĐỒ ĐĂNG & YÊU CẦU MƯỢN)
window.switchProfileTab = function (tab) {
  const itemsTabBtn = document.getElementById('profile-tab-items-btn');
  const requestsTabBtn = document.getElementById('profile-tab-requests-btn');
  const itemsPane = document.getElementById('profile-tab-items-pane');
  const requestsPane = document.getElementById('profile-tab-requests-pane');

  if (tab === 'items') {
    if (itemsTabBtn) itemsTabBtn.classList.add('active');
    if (requestsTabBtn) requestsTabBtn.classList.remove('active');
    if (itemsPane) itemsPane.classList.remove('d-none');
    if (requestsPane) requestsPane.classList.add('d-none');
  } else if (tab === 'requests') {
    if (itemsTabBtn) itemsTabBtn.classList.remove('active');
    if (requestsTabBtn) requestsTabBtn.classList.add('active');
    if (itemsPane) itemsPane.classList.add('d-none');
    if (requestsPane) requestsPane.classList.remove('d-none');
  }
};

