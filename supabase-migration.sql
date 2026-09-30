-- photonisshi マイグレーション: タグシステム再設計 + GPSタグ + メッセージ + キャプション
-- Supabase SQL Editor で実行

-- 1. 新テーブル: gps_tags
CREATE TABLE gps_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 新テーブル: photo_tags（多対多）
CREATE TABLE photo_tags (
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (photo_id, tag_id)
);

-- 3. 新テーブル: messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'stamp')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. photos に caption, gps_tag_id 追加
ALTER TABLE photos ADD COLUMN caption TEXT;
ALTER TABLE photos ADD COLUMN gps_tag_id UUID REFERENCES gps_tags(id) ON DELETE SET NULL;

-- 5. 既存 tag_id データを photo_tags に移行
INSERT INTO photo_tags (photo_id, tag_id)
  SELECT id, tag_id FROM photos WHERE tag_id IS NOT NULL;

-- 6. photos から tag_id 削除
ALTER TABLE photos DROP COLUMN tag_id;

-- 7. tags 変更: 時間帯ベース → type ベース
ALTER TABLE tags ADD COLUMN type TEXT NOT NULL DEFAULT 'manual'
  CHECK (type IN ('manual', 'common'));
ALTER TABLE tags ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE tags DROP COLUMN start_time;
ALTER TABLE tags DROP COLUMN end_time;

-- 8. RLS
ALTER TABLE gps_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on gps_tags" ON gps_tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on photo_tags" ON photo_tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on messages" ON messages FOR ALL USING (true) WITH CHECK (true);

-- 9. 新テーブル: comment_tags（コメントとタグの多対多）
CREATE TABLE comment_tags (
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (comment_id, tag_id)
);

ALTER TABLE comment_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on comment_tags" ON comment_tags FOR ALL USING (true) WITH CHECK (true);

-- 10. 新テーブル: message_tags（メッセージとタグの多対多）
CREATE TABLE message_tags (
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (message_id, tag_id)
);

ALTER TABLE message_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on message_tags" ON message_tags FOR ALL USING (true) WITH CHECK (true);

-- 11. 管理画面ログイン用パスワード（bcrypt ハッシュで users に保存し、照合は関数経由のみ）
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE users ADD COLUMN password_hash TEXT;

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
