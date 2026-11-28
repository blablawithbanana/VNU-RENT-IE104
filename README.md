# VNU-RENT

Nền tảng chia sẻ và cho mượn đồ dùng học tập, sinh hoạt dành cho sinh viên Làng Đại học Quốc gia TP.HCM.

- **Môn học:** IE104 - Internet và Công nghệ Web
- **Trường:** Trường Đại học Công nghệ Thông tin, ĐHQG-HCM (UIT)
- **Nhóm thực hiện:** Nhóm 6
- **Live Demo:** [https://vnu-rent-ie104.vercel.app](https://vnu-rent-ie104.vercel.app)

---

## 1. Giới thiệu

VNU-RENT là website kết nối sinh viên tại KTX Khu A, KTX Khu B và các trường thành viên ĐHQG-HCM có nhu cầu mượn hoặc cho thuê đồ ngắn hạn, tập trung vào 4 nhóm chính:
- **Điện tử:** Máy tính Casio, chuột, cáp sạc, sạc dự phòng, loa thuyết trình...
- **Tài liệu:** Giáo trình đại cương, sách chuyên ngành, tài liệu ôn thi...
- **Trang phục:** Áo vest, áo dài kỷ yếu, quân phục GDQP...
- **Dụng cụ:** Kit Arduino / linh kiện điện tử, lều trại, dụng cụ thể thao...

## 2. Các trang và chức năng chính

Hệ thống gồm 9 trang:
- `index.html`: Trang chủ, tìm kiếm nhanh, hiển thị đồ mới đăng và nhu cầu cần mượn gần đây.
- `category.html`: Bộ lọc đồ dùng theo từ khóa, danh mục, khu vực và sắp xếp giá.
- `item-detail.html`: Xem chi tiết món đồ, thông tin người đăng; đổi trạng thái (Còn trống / Đang cho mượn) hoặc xóa tin đối với chủ bài đăng.
- `auth.html`: Đăng ký và đăng nhập (Supabase Auth).
- `post-item.html`: Đăng tin cho mượn (hỗ trợ tải ảnh tối đa 2MB).
- `borrow-requests.html`: Danh sách tin tìm mượn và modal đăng yêu cầu mới.
- `profile.html`: Cập nhật thông tin cá nhân, ảnh đại diện, quản lý các tin đã đăng.
- `chat.html`: Nhắn tin P2P thời gian thực qua Supabase Realtime, gửi ảnh (<= 2MB), video ngắn (<= 10MB) và gắn thẻ món đồ đang hỏi.
- `about.html`: Giới thiệu dự án, quy trình mượn đồ và FAQ.

## 3. Công nghệ sử dụng

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla ES6), Bootstrap 5.3.2, Bootstrap Icons
- **Backend / Database:** Supabase (Auth, PostgreSQL với RLS, Realtime, Storage)
- **Deployment & Quản lý code:** Git, GitHub, Vercel

## 4. Cấu trúc thư mục

```text
VNU-RENT-IE104/
├── .github/
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   └── SPECIFICATION.md
├── supabase/
│   ├── schema.sql
│   └── seed.sql
├── assets/
│   ├── css/
│   │   ├── base.css
│   │   ├── fe1.css
│   │   ├── fe2.css
│   │   └── fe3.css
│   └── js/
│       ├── ui-fe1.js
│       ├── ui-fe2.js
│       ├── ui-fe3.js
│       └── services/
│           ├── supabase-config.js
│           ├── catalog-requests-service.js
│           ├── auth-items-service.js
│           ├── profile-service.js
│           └── chat-service.js
├── template.html
├── index.html
├── category.html
├── borrow-requests.html
├── auth.html
├── post-item.html
├── item-detail.html
├── about.html
├── profile.html
└── chat.html
```

## 5. Hướng dẫn chạy thử cục bộ

1. Clone mã nguồn:
   ```bash
   git clone https://github.com/<your-username>/VNU-RENT-IE104.git
   cd VNU-RENT-IE104
   ```

2. Cấu hình Supabase:
   - Chạy script `supabase/schema.sql` (và `seed.sql` nếu cần dữ liệu mẫu) trong Supabase SQL Editor.
   - Cập nhật URL và Anon Key trong file `assets/js/services/supabase-config.js`.

3. Mở dự án:
   - Dùng extension **Live Server** trong VS Code hoặc mở trực tiếp `index.html` bằng trình duyệt.

## 6. Phân công nhiệm vụ (Nhóm 6)

| Thành viên | GitHub | Hạng mục phụ trách |
| :--- | :--- | :--- |
| **Nguyễn Hữu Việt Hoàng** | [@blablawithbanana](https://github.com/blablawithbanana) | **Nhóm trưởng:** Thiết kế DB (`schema.sql`, `seed.sql`), core config, Chat Realtime (`chat-service.js`), review PR & deploy Vercel |
| **Lê Huy Hoàng** | [@Hhoang156](https://github.com/Hhoang156) | Trang chủ (`index.html`), Danh mục (`category.html`), Nhu cầu mượn (`borrow-requests.html`), `fe1.css`, `ui-fe1.js`, `catalog-requests-service.js` |
| **Đồng Nhật Hoàng** | [@Subi568](https://github.com/Subi568) | Đăng nhập/Đăng ký (`auth.html`), Đăng tin (`post-item.html`), Chi tiết đồ (`item-detail.html`), `fe2.css`, `ui-fe2.js`, `auth-items-service.js` |
| **Nguyễn Sỹ Hoàn** | [@Os3rL](https://github.com/Os3rL) | Trang cá nhân (`profile.html`), Trang giới thiệu (`about.html`), UI Chat (`chat.html`), `fe3.css`, `ui-fe3.js`, `profile-service.js` |
