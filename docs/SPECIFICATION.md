

# ĐẶC TẢ KỸ THUẬT HỆ THỐNG — VNU-RENT
> **Đề tài:** Nền tảng cho mượn / thuê đồ dùng sinh viên Làng ĐHQG TP.HCM (mô hình Chợ Tốt P2P)  
> **Học phần:** IE104 — Internet và Công nghệ Web (UIT) | **Nhóm 6**  
> **Vai trò tài liệu:** Nguồn chuẩn duy nhất (Single Source of Truth) cho cả 4 thành viên nhóm và các phiên bản thử nghiệm AI Agent.

---

## 1. TỔNG QUAN & PHẠM VI SẢN PHẨM
- **Thương hiệu:** `VNU-RENT`
- **Số lượng trang:** **9 trang HTML** + **1 Widget Trợ lý AI nổi** (`VNU-RENT AI`).
- **4 Mã danh mục cố định (Bắt buộc đúng chính tả):**
  | Mã lưu DB (`value`) | Tên hiển thị tiếng Việt | Ví dụ đồ dùng sinh viên |
  | :--- | :--- | :--- |
  | `dien-tu` | Điện tử | Máy tính Casio FX-580VNX, sạc dự phòng, loa bluetooth, chuột |
  | `tai-lieu` | Tài liệu | Giáo trình Giải tích, Đại số tuyến tính, đề cương ôn thi |
  | `quan-ao` | Quần áo | Áo vest thuyết trình, áo dài kỷ yếu, đồ thể dục/quốc phòng |
  | `dung-cu` | Dụng cụ | Bộ thực hành mạch điện, lều cắm trại, vợt cầu lông, bộ tua vít |
- **Danh sách khu vực chuẩn Làng ĐHQG TP.HCM:**
  `KTX Khu A`, `KTX Khu B`, `ĐH CNTT (UIT)`, `ĐH Bách Khoa`, `ĐH KHTN`, `ĐH KHXH&NV`, `ĐH Kinh tế - Luật (UEL)`, `ĐH Quốc tế (IU)`, `Nhà văn hóa Sinh viên`, `Khu vực khác (Làng ĐHQG)`.

---

## 2. TECH STACK & MÔI TRƯỜNG PHÁT TRIỂN LOCAL
- **Front-end:** HTML5, CSS3, Vanilla JS (ES6), Bootstrap 5.3.2 (CDN), Bootstrap Icons 1.11.3 (CDN).
- **Back-end (BaaS):** Supabase (`@supabase/supabase-js@2` CDN):
  - Auth (Email/Password + Google OAuth)
  - PostgreSQL Database + RLS + Trigger tự tạo `profiles`
  - Realtime WebSocket (`postgres_changes` trên bảng `messages`)
  - Storage Bucket `media` (Public)
- **Trợ lý AI:** Google Gemini API (`gemini-2.5-flash`) gọi qua Vercel Serverless Function `api/ai-chat.js` (ẩn tuyệt đối `GEMINI_API_KEY`).
- **Thiết lập chạy Local (Bắt buộc):**
  1. **KHÔNG** mở file `.html` bằng cách click đúp (`file://`), bắt buộc chạy qua **Local Server**:
     - Test các trang HTML + Supabase: dùng extension **VS Code Live Server** (`http://127.0.0.1:5500`) hoặc `npx vercel dev` (`http://localhost:3000`).
     - Test Trợ lý AI (`/api/ai-chat`): bắt buộc chạy bằng lệnh `npx vercel dev` kèm file `.env.local` chứa `GEMINI_API_KEY=...` (file `.env.local` bị `.gitignore` chặn đẩy lên GitHub).
  2. **Cấu hình bắt buộc trên Dashboard Supabase:**
     - Vào `Authentication > Providers > Email` $\rightarrow$ **TẮT** mục `Confirm email` (để đăng ký ở local đăng nhập được ngay không bị giới hạn 2 email/giờ).
     - Vào `Authentication > URL Configuration` $\rightarrow$ Thêm `http://localhost:3000/**` và `http://127.0.0.1:5500/**` vào *Redirect URLs* (để test Google OAuth tại local).

---

## 3. CẤU TRÚC THƯ MỤC & CHỐNG XUNG ĐỘT FILE
```text
vnu-rent-ie104/
├── .github/PULL_REQUEST_TEMPLATE.md
├── .gitignore
├── README.md
├── template.html                        # [KHÓA - Chỉ đọc] Khung chuẩn Navbar + Footer
├── docs/SPECIFICATION.md                # [KHÓA - Tài liệu này]
├── supabase/
│   ├── schema.sql                       # Khởi tạo bảng, Trigger, RLS, Realtime, Storage
│   └── seed.sql                         # Dữ liệu mẫu (8 món đồ = 2 món/hạng mục + 4 yêu cầu mượn)
├── api/
│   └── ai-chat.js                       # [Leader] Vercel Serverless gọi Gemini API
├── index.html                           # [TV1] Trang 1 - Trang chủ
├── category.html                        # [TV1] Trang 4 - Chi tiết hạng mục & Lọc
├── borrow-requests.html                 # [TV1] Trang 6 - Nhu cầu muốn mượn + Modal tạo mới
├── auth.html                            # [TV2] Trang 2 - Đăng nhập / Đăng ký
├── post-item.html                       # [TV2] Trang 7 - Đăng tin cho mượn
├── item-detail.html                     # [TV2] Trang 5 - Chi tiết đồ dùng (+ Nút chủ tin)
├── about.html                           # [TV3] Trang 3 - Giới thiệu VNU-RENT
├── profile.html                         # [TV3] Trang 9 - Trang cá nhân & Quản lý tin đăng
├── chat.html                            # [TV3 dựng UI / Leader nối Realtime] Trang 8 - Chat P2P
└── assets/
    ├── css/
    │   ├── base.css                     # [KHÓA - Chỉ đọc] Màu Chợ Tốt, Navbar, Footer, Card
    │   ├── fe1.css                      # [TV1] CSS riêng cho index, category, borrow-requests
    │   ├── fe2.css                      # [TV2] CSS riêng cho auth, post-item, item-detail
    │   ├── fe3.css                      # [TV3] CSS riêng cho about, profile, chat
    │   └── ai-widget.css                # [Leader] CSS riêng cho bong bóng Trợ lý AI
    └── js/
        ├── ui-fe1.js                    # [TV1] UI helpers (Modal, preview ảnh yêu cầu)
        ├── ui-fe2.js                    # [TV2] UI helpers (Chuyển tab Auth, preview ảnh đăng tin)
        ├── ui-fe3.js                    # [TV3] UI helpers (Tab Profile, preview Avatar & Chat media)
        └── services/
            ├── supabase-config.js       # [Leader] Khởi tạo Client, Navbar Auth, Upload, Format giá
            ├── catalog-requests-service.js # [TV1] Logic DB cho index, category, borrow-requests
            ├── auth-items-service.js    # [TV2] Logic DB cho auth, post-item, item-detail
            ├── profile-service.js       # [TV3] Logic DB cho profile (sửa hồ sơ, đổi trạng thái, xóa tin)
            ├── chat-service.js          # [Leader] Logic Chat P2P Realtime + Tin nhắn mẫu nhanh
            └── ai-assistant-service.js  # [Leader] Widget AI gọi /api/ai-chat + đọc bảng items

            ```

---

## 4. QUY CHUẨN DESIGN SYSTEM & 4 TRẠNG THÁI GIAO DIỆN
- **Màu sắc:** Dùng duy nhất biến trong `assets/css/base.css` (`--ct-yellow: #FFBA00`, `--ct-orange: #FF8800`, `--ct-red-price: #D0021B`, `--ct-bg-gray: #F4F4F4`).
- **Ảnh Card sản phẩm:** Dùng class `.ct-card-img` (`aspect-ratio: 4 / 3; width: 100%; object-fit: cover;`) để lưới sản phẩm thẳng hàng.
- **Định dạng giá (`window.formatRentPrice(amount, unit)`):** `0` $\rightarrow$ `"Miễn phí"` (`.ct-price-free`), `> 0` $\rightarrow$ `"15.000đ / ngày"` (`.ct-price`).
- **Badge trạng thái:** `available` $\rightarrow$ `<span class="badge bg-success">Còn trống</span>`; `rented` $\rightarrow$ `<span class="badge bg-secondary">Đang cho mượn</span>`.
- **4 Trạng thái bắt buộc trên mọi trang có tải dữ liệu:** Loading (`spinner-border text-warning`), Empty State, Error (`.alert.alert-danger`), Responsive (Desktop 4 cột / Mobile 1–2 cột).

---

## 5. RÀNG BUỘC DATABASE & GIỚI HẠN UPLOAD FILE
- **4 bảng (`supabase/schema.sql`):**
  - `profiles` (tự tạo bằng Trigger `handle_new_user` khi đăng ký Email hoặc Google OAuth).
  - `items` (`category`: `dien-tu|tai-lieu|quan-ao|dung-cu`, `price_amount` INTEGER >= 0, `price_unit`: `giờ|ngày|tuần|lần`, `status`: `available|rented`).
  - `borrow_requests` (`status`: `open|closed`).
  - `messages` (`media_type`: `text|image|video`, `is_read`, đã bật `supabase_realtime`).
- **Giới hạn file trước khi đẩy lên Bucket `media`:** Ảnh $\le$ **2 MB**, Video ngắn $\le$ **10 MB**.

---

## 6. HỢP ĐỒNG ÁNH XẠ FE $\leftrightarrow$ DB (ID, URL PARAMS & `window.*`)
### Quy tắc JS giao diện (`ui-fe*.js`)
1. Chỉ xử lý hiển thị (tab, modal, preview); giữ nguyên file gốc trong `<input type="file">`.
2. Đóng gói hàm điều khiển UI vào `window.*`.
3. **Không chặn sự kiện `submit`** trên bất kỳ `<form>` nào.

### Quy ước URL Params
- `category.html?cat=<mã_hạng_mục>&q=<từ_khóa>`
- `item-detail.html?id=<item_uuid>`
- `chat.html?partner_id=<user_uuid>&item_id=<item_uuid_nếu_có>`
- `auth.html?redirect=<tên_trang_cần_quay_lại>`

### Bảng ID bắt buộc theo từng thành viên
- **Navbar dùng chung (`template.html`):** `#global-navbar`, `#nav-chat-link`, `#nav-auth-link`, `#nav-user-label`, `#nav-post-btn`. Khi đã đăng nhập, `supabase-config.js` tự đổi `#nav-auth-link` `href="profile.html"` và đổi `#nav-user-label` thành tên người dùng.
- **TV1 (`index.html`, `category.html`, `borrow-requests.html` + `ui-fe1.js`):**
  - `index.html`: `#search-form`, `#search-input` (`q`), `#search-btn`, `#category-nav-list`, `#home-items-grid`, `#home-requests-grid`, `#view-all-requests-btn`.
  - `category.html`: `#category-title`, `#filter-category`, `#filter-area`, `#filter-price-sort` (`newest|price_asc|price_desc|free_only`), `#category-search-input`, `#category-items-grid`, `#category-empty-state`.
  - `borrow-requests.html`: `#open-request-modal-btn`, `#requests-list-grid`, `#requests-empty-state`, Modal `#create-request-modal` chứa `#create-request-form` (`#req-item-name`, `#req-image-input`, `#req-image-preview`, `#req-desired-price`, `#req-desired-duration`, `#req-note`, `#req-submit-btn`).
  - Hàm `window.*`: `window.openRequestModal()`, `window.closeRequestModal()`.
- **TV2 (`auth.html`, `post-item.html`, `item-detail.html` + `ui-fe2.js`):**
  - `auth.html`: `#tab-login-btn`, `#tab-register-btn`, `#auth-alert`, `#login-form` (`#login-email`, `#login-password`, `#login-submit-btn`), `#register-form` (`#reg-username`, `#reg-email`, `#reg-phone`, `#reg-area`, `#reg-password`, `#reg-confirm-password`, `#reg-submit-btn`), `#oauth-google-btn`, `#oauth-facebook-btn`.
  - `post-item.html`: `#post-item-alert`, `#post-item-form` (`#post-image-input`, `#post-image-preview`, `#post-title`, `#post-category`, `#post-description`, `#post-price-amount`, `#post-price-unit`, `#post-duration`, `#post-area`, `#post-contact-name`, `#post-contact-phone`, `#post-submit-btn`).
  - `item-detail.html`: `#detail-image`, `#detail-title`, `#detail-status-badge`, `#detail-price`, `#detail-duration`, `#detail-category`, `#detail-area`, `#detail-description`, `#detail-owner-name`, `#detail-owner-phone`, `#detail-contact-btn`, `#owner-action-panel` (chỉ hiện với chủ tin, chứa `#btn-toggle-item-status` & `#btn-delete-item`).
  - Hàm `window.*`: `window.switchAuthTab('login'|'register')`, `window.resetPostImagePreview()`.
- **TV3 (`about.html`, `profile.html`, giao diện `chat.html` + `ui-fe3.js`) & Leader (`chat-service.js`):**
  - `profile.html`: `#profile-avatar-img`, `#profile-avatar-input`, `#profile-form` (`#profile-username`, `#profile-email`, `#profile-phone`, `#profile-area`, `#profile-save-btn`), `#profile-alert`, `#btn-logout`, `#my-items-list`, `#my-requests-list`.
  - `chat.html`: `#chat-conversations-list`, `#chat-partner-name`, `#chat-item-context`, `#chat-messages-container`, `#chat-quick-replies`, `#chat-media-preview-box` (`#chat-img-preview`, `#chat-video-preview`), `#chat-message-form` (`#chat-media-input`, `#chat-text-input`, `#chat-send-btn`).
  - Hàm `window.*`: `window.switchProfileTab('items'|'requests')`, `window.clearChatMediaPreview()`, `window.scrollToBottomChat()`.

---

## 7. ĐẶC TẢ TRỢ LÝ AI (`VNU-RENT AI`)
- **Endpoint:** `POST /api/ai-chat` (`api/ai-chat.js`, đọc `process.env.GEMINI_API_KEY`).
- **Input:** `{ "message": "...", "itemsContext": [...] }` $\rightarrow$ **Output:** `{ "reply": "...", "suggestedItemIds": [...] }`.

---

## 8. THỨ TỰ NHÚNG `<script>` & CHECKLIST NGHIỆM THU LOCAL
- Thứ tự cuối `</body>`: `bootstrap.bundle.min.js` $\rightarrow$ `@supabase/supabase-js@2` $\rightarrow$ `ui-fe*.js` $\rightarrow$ `supabase-config.js` $\rightarrow$ `*-service.js` $\rightarrow$ `ai-assistant-service.js`.
- Kiểm thử đủ 6 luồng trước khi Merge PR: Đăng ký/Đăng nhập $\rightarrow$ Đăng tin có ảnh $\rightarrow$ Lọc theo danh mục/giá $\rightarrow$ Chủ tin đổi trạng thái/xóa tin & sửa Profile $\rightarrow$ Chat Realtime 2 trình duyệt gửi chữ/ảnh/video/mẫu nhanh $\rightarrow$ Hỏi Trợ lý AI trả về link đồ thật.