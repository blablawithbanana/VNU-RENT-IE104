/**
 * VNU-RENT — Cấu hình Supabase & Tiện ích dùng chung cho toàn bộ 9 trang
 * Chỉ Nhóm trưởng quản lý file này. Các thành viên không tự ý sửa.
 */

// ==========================================
// 1. THÔNG SỐ KẾT NỐI SUPABASE 
// ==========================================
const SUPABASE_URL = 'https://nrwdhxddqakjgjtibffx.supabase.co'; 
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_3bZLcZNtu-n_J08fa0K5pQ_ivNHGEkr'; // sb_publishable_... hoặc anon key

// ==========================================
// 2. HẰNG SỐ CẤU HÌNH DÙNG CHUNG TOÀN HỆ THỐNG
// ==========================================
window.VNU_CONFIG = {
  ENABLE_GOOGLE_OAUTH: false,
  ENABLE_FACEBOOK_OAUTH: false,
  MAX_IMAGE_BYTES: 2 * 1024 * 1024,  // 2 MB
  MAX_VIDEO_BYTES: 10 * 1024 * 1024, // 10 MB
  DEFAULT_AVATAR: 'https://ui-avatars.com/api/?background=FFBA00&color=222222&bold=true&name=SV',
  DEFAULT_ITEM_IMAGE: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=600&q=80'
};

window.VNU_CATEGORIES = {
  'dien-tu': 'Điện tử',
  'tai-lieu': 'Tài liệu',
  'quan-ao': 'Quần áo',
  'dung-cu': 'Dụng cụ'
};

window.VNU_AREAS = [
  'KTX Khu A',
  'KTX Khu B',
  'ĐH CNTT (UIT)',
  'ĐH Bách Khoa',
  'ĐH KHTN',
  'ĐH KHXH&NV',
  'ĐH Kinh tế - Luật (UEL)',
  'ĐH Quốc tế (IU)',
  'Nhà văn hóa Sinh viên',
  'Khu vực khác (Làng ĐHQG)'
];

// ==========================================
// 3. KHỞI TẠO SUPABASE CLIENT
// ==========================================
(function initSupabaseClient() {
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('[VNU-RENT] Thiếu thư viện CDN @supabase/supabase-js@2 trước file supabase-config.js.');
    return;
  }
  if (SUPABASE_URL.includes('DAN_PROJECT_URL') || SUPABASE_PUBLISHABLE_KEY.includes('DAN_PUBLISHABLE_KEY')) {
    console.warn('[VNU-RENT] Chưa điền SUPABASE_URL hoặc SUPABASE_PUBLISHABLE_KEY trong supabase-config.js.');
    return;
  }
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
})();

// ==========================================
// 4. HÀM XÁC THỰC NGƯỜI DÙNG DÙNG CHUNG
// ==========================================

/**
 * Lấy thông tin user đang đăng nhập + hồ sơ trong public.profiles
 * Trả về { id, email, profile } hoặc null nếu chưa đăng nhập
 */
window.getCurrentUser = async function () {
  if (!window.supabaseClient) return null;
  try {
    const { data: sessionData, error: sessionErr } = await window.supabaseClient.auth.getSession();
    if (sessionErr || !sessionData?.session?.user) return null;

    const authUser = sessionData.session.user;
    const { data: profile } = await window.supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    const fallbackName =
      authUser.user_metadata?.username ||
      authUser.user_metadata?.full_name ||
      (authUser.email ? authUser.email.split('@')[0] : 'Sinh viên');

    return {
      id: authUser.id,
      email: authUser.email,
      profile: profile || {
        id: authUser.id,
        username: fallbackName,
        email: authUser.email,
        phone: authUser.user_metadata?.phone || '',
        area: 'Làng ĐHQG TP.HCM',
        avatar_url: authUser.user_metadata?.avatar_url || null
      }
    };
  } catch (err) {
    console.error('[VNU-RENT] Lỗi getCurrentUser:', err);
    return null;
  }
};

/**
 * Bắt buộc đăng nhập cho các trang bảo vệ (post-item.html, profile.html, chat.html)
 * Nếu chưa đăng nhập tự chuyển sang auth.html?redirect=...
 */
window.requireAuth = async function (redirectPath) {
  const user = await window.getCurrentUser();
  if (!user) {
    const currentTarget = redirectPath || (window.location.pathname.split('/').pop() + window.location.search) || 'index.html';
    window.location.href = `auth.html?redirect=${encodeURIComponent(currentTarget)}`;
    return null;
  }
  return user;
};

/**
 * Đăng xuất tài khoản hiện tại và quay về trang chủ
 */
window.signOutUser = async function () {
  if (!window.supabaseClient) return;
  await window.supabaseClient.auth.signOut();
  window.location.href = 'index.html';
};

// ==========================================
// 5. HÀM UPLOAD FILE LÊN SUPABASE STORAGE (BUCKET 'media')
// ==========================================

/**
 * Kiểm tra dung lượng (Ảnh <= 2MB, Video <= 10MB) và upload lên bucket 'media'
 * Trả về chuỗi publicUrl
 */
window.uploadMediaFile = async function (file, folder = 'uploads') {
  if (!window.supabaseClient) throw new Error('Chưa kết nối Supabase.');
  if (!file) throw new Error('Chưa chọn tệp tải lên.');

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');

  if (!isImage && !isVideo) {
    throw new Error('Chỉ hỗ trợ tệp hình ảnh hoặc video ngắn.');
  }
  if (isImage && file.size > window.VNU_CONFIG.MAX_IMAGE_BYTES) {
    throw new Error('Dung lượng hình ảnh vượt quá giới hạn 2 MB.');
  }
  if (isVideo && file.size > window.VNU_CONFIG.MAX_VIDEO_BYTES) {
    throw new Error('Dung lượng video ngắn vượt quá giới hạn 10 MB.');
  }

  const user = await window.getCurrentUser();
  if (!user) throw new Error('Vui lòng đăng nhập để tải tệp lên.');

  const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : (isVideo ? 'mp4' : 'jpg');
  const safePath = `${folder}/${user.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

  const { error: uploadError } = await window.supabaseClient.storage
    .from('media')
    .upload(safePath, file, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    throw new Error(`Tải tệp thất bại: ${uploadError.message}`);
  }

  const { data } = window.supabaseClient.storage.from('media').getPublicUrl(safePath);
  return data.publicUrl;
};

// ==========================================
// 6. CÁC HÀM TIỆN ÍCH HIỂN THỊ & BẢO MẬT XSS
// ==========================================

window.formatRentPrice = function (amount, unit = 'ngày') {
  const num = Number(amount);
  if (isNaN(num) || num <= 0) return 'Miễn phí';
  return `${num.toLocaleString('vi-VN')}đ / ${unit || 'ngày'}`;
};

window.getPriceClass = function (amount) {
  return Number(amount) <= 0 ? 'ct-price-free' : 'ct-price';
};

window.getCategoryLabel = function (code) {
  return window.VNU_CATEGORIES[code] || 'Khác';
};

window.getStatusBadgeHTML = function (status) {
  switch (status) {
    case 'available':
      return '<span class="badge bg-success">Còn trống</span>';
    case 'rented':
      return '<span class="badge bg-secondary">Đang cho mượn</span>';
    case 'open':
      return '<span class="badge bg-warning text-dark">Đang tìm mượn</span>';
    case 'closed':
      return '<span class="badge bg-secondary">Đã mượn được</span>';
    default:
      return '';
  }
};

/**
 * Chống lỗi XSS khi chèn dữ liệu người dùng nhập vào innerHTML
 */
window.escapeHTML = function (str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

window.showAlert = function (elementId, message, type = 'danger') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.className = `alert alert-${type}`;
  el.textContent = message;
  el.classList.remove('d-none');
};

window.hideAlert = function (elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.classList.add('d-none');
};

// ==========================================
// 7. TỰ ĐỘNG ĐỒNG BỘ NAVBAR (AUTH -> PROFILE & CHẤM ĐỎ CHAT)
// ==========================================

function setNavbarChatUnreadBadge(hasUnread) {
  const chatLink = document.getElementById('nav-chat-link');
  if (!chatLink) return;
  const existing = document.getElementById('nav-chat-badge');
  if (hasUnread && !existing) {
    const dot = document.createElement('span');
    dot.id = 'nav-chat-badge';
    dot.className = 'ct-nav-badge';
    dot.title = 'Bạn có tin nhắn chưa đọc';
    chatLink.appendChild(dot);
  } else if (!hasUnread && existing) {
    existing.remove();
  }
}

window.refreshNavbarUnreadChat = async function (userId) {
  if (!window.supabaseClient || !userId) return;
  const { count } = await window.supabaseClient
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .eq('is_read', false);
  setNavbarChatUnreadBadge((count || 0) > 0);
};

async function initGlobalNavbar() {
  // Đánh dấu link trang đang mở
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('#global-navbar .ct-nav-link').forEach((link) => {
    if (link.getAttribute('href') === currentFile) {
      link.classList.add('active', 'bg-white', 'bg-opacity-50');
    }
  });

  // Cập nhật nút Đăng nhập -> Profile nếu đã đăng nhập
  const user = await window.getCurrentUser();
  const authLink = document.getElementById('nav-auth-link');
  const userLabel = document.getElementById('nav-user-label');

  if (user && authLink && userLabel) {
    authLink.href = 'profile.html';
    userLabel.textContent = user.profile.username;

    // Kiểm tra tin nhắn chưa đọc + lắng nghe Realtime để bật chấm đỏ trên mọi trang
    await window.refreshNavbarUnreadChat(user.id);
    if (window.supabaseClient && currentFile !== 'chat.html') {
      window.supabaseClient
        .channel(`navbar-unread-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
          () => setNavbarChatUnreadBadge(true)
        )
        .subscribe();
    }
  }
}

document.addEventListener('DOMContentLoaded', initGlobalNavbar);