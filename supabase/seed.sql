-- ==========================================
-- VNU-RENT SEED DATA (2 MÓN / HẠNG MỤC + 4 YÊU CẦU MƯỢN)
-- ==========================================

DO $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT id INTO v_owner_id FROM public.profiles ORDER BY created_at ASC LIMIT 1;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Chưa có tài khoản nào trong public.profiles. Hãy tạo 1 user ở mục Authentication > Users trước khi chạy seed.sql!';
  END IF;

  -- Chèn 8 món đồ mẫu (Đúng 2 món / hạng mục)
  INSERT INTO public.items (owner_id, title, category, description, price_amount, price_unit, duration, area, contact_name, contact_phone, image_url, status)
  VALUES
    -- 1. ĐIỆN TỬ (2 món)
    (v_owner_id, 'Máy tính Casio FX-580VN X (Mới 95%)', 'dien-tu', 'Máy còn chạy mượt, pin mới thay, thích hợp cho sinh viên mượn thi cuối kỳ Giải tích, Xác suất thống kê.', 15000, 'ngày', 'Tối đa 5 ngày', 'KTX Khu B', 'Nguyễn Văn A (UIT)', '0901234567', 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=600&q=80', 'available'),
    (v_owner_id, 'Chuột không dây Logitech M331 Silent', 'dien-tu', 'Chuột bấm êm không gây tiếng ồn, dùng rất tiện khi học bài hoặc làm đồ án trong thư viện UIT.', 10000, 'ngày', 'Tối đa 1 tuần', 'ĐH CNTT (UIT)', 'Nguyễn Văn A (UIT)', '0901234567', 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&q=80', 'available'),

    -- 2. TÀI LIỆU (2 món)
    (v_owner_id, 'Combo Giáo trình Giải tích + Đại số tuyến tính ĐHQG', 'tai-lieu', 'Bản in rõ nét kèm ghi chú tóm tắt công thức và đề thi các năm trước của UIT/KHTN.', 0, 'tuần', 'Tối đa 2 tuần', 'KTX Khu A', 'Nguyễn Văn A (UIT)', '0901234567', 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&q=80', 'available'),
    (v_owner_id, 'Sách HTML, CSS & JavaScript + Tài liệu ôn IE104', 'tai-lieu', 'Sách tham khảo môn Internet và Công nghệ Web, giữ gìn sạch sẽ, không rách trang.', 5000, 'tuần', 'Tối đa 1 tháng', 'ĐH CNTT (UIT)', 'Nguyễn Văn A (UIT)', '0901234567', 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&q=80', 'available'),

    -- 3. QUẦN ÁO (2 món)
    (v_owner_id, 'Áo Vest Nam Đen Form Slimfit (Size L)', 'quan-ao', 'Phù hợp mặc thuyết trình bảo vệ đồ án, chụp ảnh kỷ yếu hoặc phỏng vấn thực tập. Đã giặt ủi sạch sẽ.', 40000, 'ngày', 'Tối đa 3 ngày', 'KTX Khu B', 'Nguyễn Văn A (UIT)', '0901234567', 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&q=80', 'available'),
    (v_owner_id, 'Bộ đồ học Giáo dục Quốc phòng (Size M)', 'quan-ao', 'Còn mới, đầy đủ áo, quần, mũ tai bèo cho các bạn cần mượn dự phòng trong kỳ học GDQP.', 20000, 'tuần', '1 - 2 tuần', 'KTX Khu A', 'Nguyễn Văn A (UIT)', '0901234567', 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&q=80', 'available'),

    -- 4. DỤNG CỤ (2 món)
    (v_owner_id, 'Bộ Kit thực hành Arduino Uno R3 + Breadboard', 'dung-cu', 'Đầy đủ dây cắm, điện trở, đèn LED, cảm biến siêu âm cho sinh viên học thực hành mạch số / IoT.', 25000, 'tuần', 'Tối đa 2 tuần', 'ĐH Bách Khoa', 'Nguyễn Văn A (UIT)', '0901234567', 'https://images.unsplash.com/photo-1553406830-ef2513450d76?w=600&q=80', 'available'),
    (v_owner_id, 'Lều cắm trại tự bung 4 người chống mưa', 'dung-cu', 'Lều gọn nhẹ, bung trong 1 phút, phù hợp cho nhóm sinh viên đi dã ngoại cuối tuần.', 50000, 'ngày', 'Tối đa 3 ngày', 'Nhà văn hóa Sinh viên', 'Nguyễn Văn A (UIT)', '0901234567', 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&q=80', 'available');

  -- Chèn 4 nhu cầu cần mượn mẫu
  INSERT INTO public.borrow_requests (requester_id, item_name, image_url, desired_price, desired_duration, note, status)
  VALUES
    (v_owner_id, 'Cần mượn cáp chuyển Type-C sang HDMI thuyết trình', 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=600&q=80', '10.000đ / ngày', 'Chiều thứ 5 tuần này (1 ngày)', 'Nhóm mình thuyết trình ở tòa C UIT, nhận trả đồ ngay tại trường.', 'open'),
    (v_owner_id, 'Cần mượn bộ dụng cụ tháo lắp laptop (Tua vít nhỏ)', 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=600&q=80', 'Miễn phí hoặc mời ly trà sữa', 'Mượn 2 tiếng buổi tối', 'Mình ở tòa BA4 KTX Khu B cần vệ sinh quạt laptop.', 'open'),
    (v_owner_id, 'Cần thuê Tripod điện thoại quay video đồ án', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80', '20.000đ / ngày', 'Cuối tuần Thứ 7 & Chủ Nhật', 'Cần loại cao từ 1m2 trở lên để quay demo ngoài trời.', 'open'),
    (v_owner_id, 'Tìm mượn sách Nhập môn Mạng máy tính (Kurose)', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&q=80', '10.000đ / tuần', 'Mượn 2 tuần ôn thi giữa kỳ', 'Ưu tiên bạn ở KTX Khu A hoặc gần ĐH CNTT.', 'open');
END $$;