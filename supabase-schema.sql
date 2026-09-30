-- photonisshi Supabase Schema (v2: タグ再設計 + GPSタグ + メッセージ)
-- 新規環境構築時はこちらを Supabase SQL Editor で実行

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT, -- 管理画面ログイン用 (bcrypt)。NULL のユーザーは管理画面にログイン不可
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

-- Comment Tags (多対多)
CREATE TABLE comment_tags (
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (comment_id, tag_id)
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'stamp')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Message Tags (多対多)
CREATE TABLE message_tags (
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (message_id, tag_id)
);

-- RLS: プロトタイプのため全操作許可
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on tags" ON tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on gps_tags" ON gps_tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on photos" ON photos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on photo_tags" ON photo_tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on comments" ON comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on comment_tags" ON comment_tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on messages" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on message_tags" ON message_tags FOR ALL USING (true) WITH CHECK (true);

-- 管理画面ログイン用パスワード
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- password_hash を anon / authenticated から読み書きできないよう列単位で権限を付与
-- （users に列を追加したときは、ここの GRANT にも追加すること）
REVOKE SELECT, INSERT, UPDATE ON users FROM anon, authenticated;
GRANT SELECT (id, username, created_at) ON users TO anon, authenticated;
GRANT INSERT (username) ON users TO anon, authenticated;
GRANT UPDATE (username) ON users TO anon, authenticated;

-- 管理画面ログインの照合はこの関数経由でのみ行う（ハッシュはクライアントに渡らない）
-- パスワード未設定（password_hash が NULL）のユーザーは常に不一致
CREATE OR REPLACE FUNCTION verify_manage_login(p_username TEXT, p_password TEXT)
RETURNS TABLE (id UUID, username TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT u.id, u.username FROM users u
  WHERE u.username = p_username
    AND u.password_hash IS NOT NULL
    AND u.password_hash = crypt(p_password, u.password_hash);
$$;

REVOKE ALL ON FUNCTION verify_manage_login(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verify_manage_login(TEXT, TEXT) TO anon, authenticated;

-- パスワードの設定・変更（ユーザー名とパスワードを置き換えて SQL Editor で実行）
-- UPDATE users
--   SET password_hash = extensions.crypt('ここにパスワード', extensions.gen_salt('bf'))
--   WHERE username = 'ここにユーザー名';
-- 管理画面へのログインを取り消す場合
-- UPDATE users SET password_hash = NULL WHERE username = 'ここにユーザー名';

-- Storage: Supabase Dashboard で "photos" バケットを public で作成後、以下を実行
CREATE POLICY "Allow all uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'photos');
CREATE POLICY "Allow all reads" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "Allow all updates" ON storage.objects
  FOR UPDATE USING (bucket_id = 'photos');
CREATE POLICY "Allow all deletes" ON storage.objects
  FOR DELETE USING (bucket_id = 'photos');
