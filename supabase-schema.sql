-- photonisshi Supabase Schema (v2: タグ再設計 + GPSタグ + メッセージ)
-- 新規環境構築時はこちらを Supabase SQL Editor で実行

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tags (manual: ユーザーごと, common: グローバル)
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'manual' CHECK (type IN ('manual', 'common')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- GPS Tags (グローバル)
CREATE TABLE gps_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Photos
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  storage_path TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  caption TEXT,
  gps_tag_id UUID REFERENCES gps_tags(id) ON DELETE SET NULL,
  diary_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Photo Tags (多対多)
CREATE TABLE photo_tags (
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (photo_id, tag_id)
);

-- Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  commented_at TIMESTAMPTZ NOT NULL,
  diary_date DATE NOT NULL
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'stamp')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: プロトタイプのため全操作許可
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on tags" ON tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on gps_tags" ON gps_tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on photos" ON photos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on photo_tags" ON photo_tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on comments" ON comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on messages" ON messages FOR ALL USING (true) WITH CHECK (true);

-- Storage: Supabase Dashboard で "photos" バケットを public で作成後、以下を実行
CREATE POLICY "Allow all uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'photos');
CREATE POLICY "Allow all reads" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "Allow all updates" ON storage.objects
  FOR UPDATE USING (bucket_id = 'photos');
CREATE POLICY "Allow all deletes" ON storage.objects
  FOR DELETE USING (bucket_id = 'photos');
