-- ==========================================
-- VNU-RENT DATABASE SCHEMA (SUPABASE)
-- ==========================================

-- 1. Bảng Profiles (Thông tin người dùng mở rộng)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  area TEXT DEFAULT 'Làng ĐHQG TP.HCM',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: Tự động tạo dòng trong public.profiles khi đăng ký Email HOẶC Google OAuth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, phone, area, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'area', 'Làng ĐHQG TP.HCM'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Bảng Items (Đồ dùng đăng cho mượn)
CREATE TABLE IF NOT EXISTS public.items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('dien-tu', 'tai-lieu', 'quan-ao', 'dung-cu')),
  description TEXT NOT NULL,
  price_amount INTEGER NOT NULL DEFAULT 0 CHECK (price_amount >= 0),
  price_unit TEXT NOT NULL DEFAULT 'ngày' CHECK (price_unit IN ('giờ', 'ngày', 'tuần', 'lần')),
  duration TEXT NOT NULL,
  area TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'rented')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bảng Borrow Requests (Nhu cầu muốn mượn hàng theo yêu cầu)
CREATE TABLE IF NOT EXISTS public.borrow_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  item_name TEXT NOT NULL,
  image_url TEXT,
  desired_price TEXT NOT NULL,
  desired_duration TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bảng Messages (Chat P2P thời gian thực)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  content TEXT,
  media_url TEXT,
  media_type TEXT NOT NULL DEFAULT 'text' CHECK (media_type IN ('text', 'image', 'video')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Bật Row Level Security (RLS) & Phân quyền CRUD
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies: profiles
DROP POLICY IF EXISTS "Profiles public read" ON public.profiles;
CREATE POLICY "Profiles public read" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Profiles owner insert" ON public.profiles;
CREATE POLICY "Profiles owner insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Profiles owner update" ON public.profiles;
CREATE POLICY "Profiles owner update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Policies: items
DROP POLICY IF EXISTS "Items public read" ON public.items;
CREATE POLICY "Items public read" ON public.items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Items auth insert" ON public.items;
CREATE POLICY "Items auth insert" ON public.items FOR INSERT WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Items owner update" ON public.items;
CREATE POLICY "Items owner update" ON public.items FOR UPDATE USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Items owner delete" ON public.items;
CREATE POLICY "Items owner delete" ON public.items FOR DELETE USING (auth.uid() = owner_id);

-- Policies: borrow_requests
DROP POLICY IF EXISTS "Requests public read" ON public.borrow_requests;
CREATE POLICY "Requests public read" ON public.borrow_requests FOR SELECT USING (true);
DROP POLICY IF EXISTS "Requests auth insert" ON public.borrow_requests;
CREATE POLICY "Requests auth insert" ON public.borrow_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
DROP POLICY IF EXISTS "Requests owner update" ON public.borrow_requests;
CREATE POLICY "Requests owner update" ON public.borrow_requests FOR UPDATE USING (auth.uid() = requester_id);
DROP POLICY IF EXISTS "Requests owner delete" ON public.borrow_requests;
CREATE POLICY "Requests owner delete" ON public.borrow_requests FOR DELETE USING (auth.uid() = requester_id);

-- Policies: messages
DROP POLICY IF EXISTS "Messages participants read" ON public.messages;
CREATE POLICY "Messages participants read" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "Messages sender insert" ON public.messages;
CREATE POLICY "Messages sender insert" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "Messages receiver mark read" ON public.messages;
CREATE POLICY "Messages receiver mark read" ON public.messages FOR UPDATE USING (auth.uid() = receiver_id);

-- 6. Bật Realtime cho bảng messages (an toàn khi chạy lại)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- 7. Tạo Storage Bucket 'media' (Public) cho ảnh đồ dùng, avatar & ảnh/video chat
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Media public read" ON storage.objects;
CREATE POLICY "Media public read" ON storage.objects FOR SELECT USING (bucket_id = 'media');
DROP POLICY IF EXISTS "Media auth upload" ON storage.objects;
CREATE POLICY "Media auth upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Media owner delete" ON storage.objects;
CREATE POLICY "Media owner delete" ON storage.objects FOR DELETE USING (bucket_id = 'media' AND auth.uid() = owner);