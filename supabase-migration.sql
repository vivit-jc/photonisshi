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
