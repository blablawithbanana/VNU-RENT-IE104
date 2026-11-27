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

// 2. KHUNG XEM TRƯỚC MEDIA VÀ CUỘN CHAT

//Hủy xem trước ảnh/video trong khung chat và đặt lại input
window.clearChatMediaPreview = function () {
  const previewBox = document.getElementById('chat-media-preview-box');
  const imgPreview = document.getElementById('chat-img-preview');
  const videoPreview = document.getElementById('chat-video-preview');
  const mediaInput = document.getElementById('chat-media-input');

  if (previewBox) previewBox.classList.add('d-none');

  if (imgPreview) {
    imgPreview.src = '';
    imgPreview.classList.add('d-none');
  }

  if (videoPreview) {
    videoPreview.pause();
    videoPreview.removeAttribute('src');
    videoPreview.load();
    videoPreview.classList.add('d-none');
  }

  if (mediaInput) {
    mediaInput.value = '';
  }
};

//Cuộn mượt danh sách tin nhắn chat xuống đáy
window.scrollToBottomChat = function () {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;
  setTimeout(() => {
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
  }, 50);
};

// 3. KHỞI TẠO CÁC SỰ KIỆN GIAO DIỆN KHI DOM SẴN SÀNG
document.addEventListener('DOMContentLoaded', () => {
  let avatarPreviewUrl = null;
  let chatMediaPreviewUrl = null;

  // Preview Avatar tại trang Profile (chặn ảnh > 2MB)
  const avatarInput = document.getElementById('profile-avatar-input');
  const avatarImg = document.getElementById('profile-avatar-img');

  if (avatarInput && avatarImg) {
    avatarInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        window.showAlert('profile-alert', 'Vui lòng chọn tệp hình ảnh hợp lệ.', 'danger');
        avatarInput.value = '';
        return;
      }
      if (window.VNU_CONFIG && file.size > window.VNU_CONFIG.MAX_IMAGE_BYTES) {
        window.showAlert('profile-alert', 'Dung lượng ảnh đại diện vượt quá giới hạn 2 MB.', 'danger');
        avatarInput.value = '';
        return;
      }
      window.hideAlert('profile-alert');
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
      avatarPreviewUrl = URL.createObjectURL(file);
      avatarImg.src = avatarPreviewUrl;
    });
  }

  // Preview Media (Ảnh <= 2MB / Video <= 10MB) tại khung Chat
  const chatMediaInput = document.getElementById('chat-media-input');
  const chatMediaBox = document.getElementById('chat-media-preview-box');
  const chatImgPreview = document.getElementById('chat-img-preview');
  const chatVideoPreview = document.getElementById('chat-video-preview');

  if (chatMediaInput && chatMediaBox) {
    chatMediaInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (chatMediaPreviewUrl) {
        URL.revokeObjectURL(chatMediaPreviewUrl);
        chatMediaPreviewUrl = null;
      }
      if (!file) {
        window.clearChatMediaPreview();
        return;
      }

      const isImg = file.type.startsWith('image/');
      const isVid = file.type.startsWith('video/');
      if (!isImg && !isVid) {
        alert('Chỉ hỗ trợ tệp hình ảnh hoặc video ngắn.');
        window.clearChatMediaPreview();
        return;
      }
      if (isImg && window.VNU_CONFIG && file.size > window.VNU_CONFIG.MAX_IMAGE_BYTES) {
        alert('Dung lượng hình ảnh vượt quá giới hạn 2 MB.');
        window.clearChatMediaPreview();
        return;
      }
      if (isVid && window.VNU_CONFIG && file.size > window.VNU_CONFIG.MAX_VIDEO_BYTES) {
        alert('Dung lượng video ngắn vượt quá giới hạn 10 MB.');
        window.clearChatMediaPreview();
        return;
      }

      chatMediaPreviewUrl = URL.createObjectURL(file);
      if (isImg) {
        if (chatImgPreview) {
          chatImgPreview.src = chatMediaPreviewUrl;
          chatImgPreview.classList.remove('d-none');
        }
        if (chatVideoPreview) {
          chatVideoPreview.classList.add('d-none');
          chatVideoPreview.removeAttribute('src');
        }
      } else {
        if (chatVideoPreview) {
          chatVideoPreview.src = chatMediaPreviewUrl;
          chatVideoPreview.classList.remove('d-none');
        }
        if (chatImgPreview) {
          chatImgPreview.classList.add('d-none');
          chatImgPreview.src = '';
        }
      }
      chatMediaBox.classList.remove('d-none');
    });
  }

  // Bấm nút Tin nhắn mẫu nhanh -> Điền sẵn chữ vào ô nhập
  const quickRepliesContainer = document.getElementById('chat-quick-replies');
  const chatTextInput = document.getElementById('chat-text-input');

  if (quickRepliesContainer && chatTextInput) {
    quickRepliesContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.chat-quick-reply-btn');
      if (btn && !chatTextInput.disabled) {
        const text = btn.getAttribute('data-reply') || btn.textContent.trim();
        chatTextInput.value = text;
        chatTextInput.focus();
      }
    });
  }

  if (document.getElementById('chat-messages-container')) {
    window.scrollToBottomChat();
  }
});
