/**
 * VNU-RENT — Nền tảng Supabase dùng chung cho toàn bộ 9 trang
 * Lưu ý: Thay 2 giá trị SUPABASE_URL và SUPABASE_ANON_KEY bằng key dự án của bạn.
 * (anon public key được phép để ở Front-end vì đã có RLS bảo vệ trong schema.sql)
 */

const SUPABASE_URL = 'DAN_PROJECT_URL_CUA_BAN_VAO_DAY';
const SUPABASE_ANON_KEY = 'DAN_ANON_PUBLIC_KEY_CUA_BAN_VAO_DAY';

// Khởi tạo Supabase Client toàn cục
if (!window.supabase) {
  console.error('[VNU-RENT] Thiếu CDN @supabase/supabase-js@2 trước supabase-config.js');
}

window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Hằng số chuẩn theo SPECIFICATION.md (giúp TV1, TV2, TV3 không gõ sai chính tả)
window.VNU_CATEGORIES = {
  'dien-tu': 'Điện tử',
  'tai-lieu': 'Tài liệu',
  'quan-ao': 'Quần áo',
  'dung-cu': 'Dụng cụ',
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
  'Khu vực khác (Làng ĐHQG)',
];

/**
 * Chống XSS khi đổ dữ liệu người dùng vào innerHTML
 */
window.escapeHtml = function (str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Lấy thông tin user đang đăng nhập kèm bản ghi trong public.profiles
 * @returns {Promise<{ user: object, profile: object } | null>}
 */
window.getCurrentUser = async function () {
  const { data: sessionData, error: sessionError } = await window.supabaseClient.auth.getSession();
  if (sessionError || !sessionData?.session?.user) {
    return null;
  }

  const user = sessionData.session.user;
  const { data: profile } = await window.supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return {
    user,
    profile: profile || {
      id: user.id,
      username: user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Thành viên',
      email: user.email,
      phone: '',
      area: 'Làng ĐHQG TP.HCM',
      avatar_url: user.user_metadata?.avatar_url || null,
    },
  };
};

/**
 * Bắt buộc đăng nhập cho các trang riêng tư (post-item.html, profile.html, chat.html)
 * Nếu chưa đăng nhập -> tự chuyển sang auth.html?redirect=<trang_hien_tai>
 */
window.requireAuth = async function () {
  const current = await window.getCurrentUser();
  if (!current) {
    const currentFile = window.location.pathname.split('/').pop() || 'index.html';
    const currentQuery = window.location.search || '';
    const redirectTarget = encodeURIComponent(currentFile + currentQuery);
    window.location.href = `auth.html?redirect=${redirectTarget}`;
    return null;
  }
  return current;
};

/**
 * Đăng nhập nhanh 1 chạm bằng Google OAuth
 * @param {string} redirectPath - Trang quay lại sau khi đăng nhập (mặc định index.html)
 */
window.signInWithGoogle = async function (redirectPath = 'index.html') {
  const baseUrl = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
  const { error } = await window.supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${baseUrl}${redirectPath}`,
    },
  });
  if (error) throw error;
};

/**
 * Upload ảnh (tối đa 2MB) hoặc video ngắn (tối đa 10MB) lên Storage Bucket 'media'
 * @param {File} file
 * @param {'items'|'requests'|'avatars'|'chat'} folder
 * @returns {Promise<string>} Public URL của file vừa tải lên
 */
window.uploadMediaFile = async function (file, folder = 'items') {
  if (!file) throw new Error('Không tìm thấy tệp để tải lên.');

  const current = await window.getCurrentUser();
  if (!current) throw new Error('Vui lòng đăng nhập trước khi tải tệp lên.');

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');

  if (!isImage && !isVideo) {
    throw new Error('Chỉ hỗ trợ định dạng hình ảnh hoặc video.');
  }

  const MAX_IMAGE_SIZE = 2 * 1024 * 1024;  // 2 MB
  const MAX_VIDEO_SIZE = 10 * 1024 * 1024; // 10 MB

  if (isImage && file.size > MAX_IMAGE_SIZE) {
    throw new Error('Dung lượng ảnh vượt quá giới hạn 2MB. Vui lòng chọn ảnh nhẹ hơn.');
  }
  if (isVideo && file.size > MAX_VIDEO_SIZE) {
    throw new Error('Dung lượng video vượt quá giới hạn 10MB. Vui lòng chọn video ngắn hơn.');
  }

  const ext = (file.name.split('.').pop() || (isImage ? 'jpg' : 'mp4')).toLowerCase();
  const filePath = `${folder}/${current.user.id}_${Date.now()}.${ext}`;

  const { error: uploadError } = await window.supabaseClient.storage
    .from('media')
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    throw new Error(`Tải tệp thất bại: ${uploadError.message}`);
  }

  const { data } = window.supabaseClient.storage.from('media').getPublicUrl(filePath);
  return data.publicUrl;
};

/**
 * Định dạng chuỗi giá thuê chuẩn (VD: "Miễn phí" hoặc "15.000đ / ngày")
 */
window.formatRentPrice = function (amount, unit = 'ngày') {
  const num = Number(amount) || 0;
  if (num <= 0) return 'Miễn phí';
  return `${num.toLocaleString('vi-VN')}đ / ${unit}`;
};

/**
 * Trả về HTML giá thuê chuẩn màu theo Design System
 */
window.formatRentPriceHtml = function (amount, unit = 'ngày') {
  const num = Number(amount) || 0;
  if (num <= 0) {
    return '<span class="fw-bold text-success">Miễn phí</span>';
  }
  return `<span class="ct-price">${num.toLocaleString('vi-VN')}đ / ${window.escapeHtml(unit)}</span>`;
};

/**
 * Trả về HTML Badge trạng thái món đồ chuẩn Bootstrap
 */
window.getItemStatusBadgeHtml = function (status) {
  if (status === 'rented') {
    return '<span class="badge bg-secondary">Đang cho mượn</span>';
  }
  return '<span class="badge bg-success">Còn trống</span>';
};

/**
 * Tự động cập nhật Navbar dùng chung trên mọi trang (#nav-auth-link & #nav-chat-badge)
 */
async function initGlobalNavbarAuth() {
  const authLink = document.getElementById('nav-auth-link');
  const userLabel = document.getElementById('nav-user-label');
  const chatLink = document.getElementById('nav-chat-link');

  const current = await window.getCurrentUser();

  if (current && authLink && userLabel) {
    authLink.href = 'profile.html';
    userLabel.textContent = current.profile.username;
  } else if (authLink && userLabel) {
    authLink.href = 'auth.html';
    userLabel.textContent = 'Đăng nhập';
  }

  // Hiển thị chấm đỏ #nav-chat-badge nếu có tin nhắn chưa đọc
  if (current && chatLink) {
    const { count } = await window.supabaseClient
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', current.user.id)
      .eq('is_read', false);

    let badge = document.getElementById('nav-chat-badge');
    if (count && count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.id = 'nav-chat-badge';
        badge.className = 'badge rounded-pill bg-danger ms-1';
        chatLink.appendChild(badge);
      }
      badge.textContent = count > 9 ? '9+' : String(count);
    } else if (badge) {
      badge.remove();
    }
  }
}

document.addEventListener('DOMContentLoaded', initGlobalNavbarAuth);