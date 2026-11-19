

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