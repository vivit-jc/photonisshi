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

-- 12. 管理画面のセッショントークンとユーザー管理用の関数
-- 管理画面のログインセッション（トークンは SHA-256 ハッシュのみ保存）
CREATE TABLE manage_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ポリシーを作らないことで anon / authenticated からは一切読み書きできない
ALTER TABLE manage_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON manage_sessions FROM anon, authenticated;

-- トークンから管理ユーザーの id を得る。無効・期限切れなら例外 (28000)
-- 内部用のため anon には公開しない
CREATE OR REPLACE FUNCTION manage_session_user(p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT s.user_id INTO v_user_id
  FROM manage_sessions s
  JOIN users u ON u.id = s.user_id
  WHERE s.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    AND s.expires_at > now()
    AND u.password_hash IS NOT NULL;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'セッションが無効です。再度ログインしてください' USING ERRCODE = '28000';
  END IF;
  RETURN v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION manage_session_user(TEXT) FROM PUBLIC;

-- ログイン: 一致したらセッションを作成しトークンを返す
-- パスワード未設定（password_hash が NULL）のユーザーは常に不一致
DROP FUNCTION IF EXISTS verify_manage_login(TEXT, TEXT);
CREATE FUNCTION verify_manage_login(p_username TEXT, p_password TEXT)
RETURNS TABLE (id UUID, username TEXT, token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user users%ROWTYPE;
  v_token TEXT;
BEGIN
  SELECT * INTO v_user FROM users u
  WHERE u.username = p_username
    AND u.password_hash IS NOT NULL
    AND u.password_hash = crypt(p_password, u.password_hash);
  IF NOT FOUND THEN
    RETURN;
  END IF;

  DELETE FROM manage_sessions WHERE expires_at <= now();
  v_token := encode(gen_random_bytes(32), 'hex');
  INSERT INTO manage_sessions (token_hash, user_id, expires_at)
    VALUES (encode(digest(v_token, 'sha256'), 'hex'), v_user.id, now() + interval '12 hours');

  RETURN QUERY SELECT v_user.id, v_user.username, v_token;
END;
$$;

CREATE OR REPLACE FUNCTION manage_logout(p_token TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  DELETE FROM manage_sessions WHERE token_hash = encode(digest(p_token, 'sha256'), 'hex');
$$;

-- ユーザー一覧（パスワード設定の有無付き）
CREATE OR REPLACE FUNCTION manage_list_users(p_token TEXT)
RETURNS TABLE (id UUID, username TEXT, created_at TIMESTAMPTZ, has_password BOOLEAN)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM manage_session_user(p_token);
  RETURN QUERY
    SELECT u.id, u.username, u.created_at, u.password_hash IS NOT NULL
    FROM users u
    ORDER BY u.username;
END;
$$;

-- パスワードの設定・変更・解除（p_password が NULL なら解除）
-- 変更・解除したユーザーの他のセッションは無効にする
CREATE OR REPLACE FUNCTION manage_set_password(p_token TEXT, p_user_id UUID, p_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_me UUID := manage_session_user(p_token);
BEGIN
  IF p_password IS NULL AND p_user_id = v_me THEN
    RAISE EXCEPTION '自分自身のパスワードは解除できません' USING ERRCODE = '22023';
  END IF;
  IF p_password IS NOT NULL AND length(p_password) < 8 THEN
    RAISE EXCEPTION 'パスワードは8文字以上にしてください' USING ERRCODE = '22023';
  END IF;

  UPDATE users
    SET password_hash = CASE WHEN p_password IS NULL THEN NULL
                             ELSE crypt(p_password, gen_salt('bf')) END
    WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ユーザーが見つかりません' USING ERRCODE = '22023';
  END IF;

  DELETE FROM manage_sessions
    WHERE user_id = p_user_id
      AND token_hash <> encode(digest(p_token, 'sha256'), 'hex');
END;
$$;

REVOKE ALL ON FUNCTION verify_manage_login(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION manage_logout(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION manage_list_users(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION manage_set_password(TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verify_manage_login(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION manage_logout(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION manage_list_users(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION manage_set_password(TEXT, UUID, TEXT) TO anon, authenticated;

-- 13. admin フラグとユーザー管理画面用の別ログイン
ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE manage_sessions ADD COLUMN scope TEXT NOT NULL DEFAULT 'manage'
  CHECK (scope IN ('manage', 'admin'));

-- ユーザー名の変更はユーザー管理画面（manage_rename_user）からのみにする
REVOKE UPDATE (username) ON users FROM anon, authenticated;

-- 引数・戻り値が変わる関数は作り直す
DROP FUNCTION IF EXISTS manage_session_user(TEXT);
DROP FUNCTION IF EXISTS verify_manage_login(TEXT, TEXT);
DROP FUNCTION IF EXISTS manage_list_users(TEXT);

-- ===== 内部用の関数（anon には公開しない） =====

-- トークンから管理ユーザーの id を得る。無効・期限切れ・スコープ違いなら例外 (28000)
-- p_scope: 'manage' = 管理画面, 'admin' = ユーザー管理画面（is_admin のユーザーのみ）
CREATE OR REPLACE FUNCTION manage_session_user(p_token TEXT, p_scope TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT s.user_id INTO v_user_id
  FROM manage_sessions s
  JOIN users u ON u.id = s.user_id
  WHERE s.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    AND s.scope = p_scope
    AND s.expires_at > now()
    AND u.password_hash IS NOT NULL
    AND (p_scope <> 'admin' OR u.is_admin);
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'セッションが無効です。再度ログインしてください' USING ERRCODE = '28000';
  END IF;
  RETURN v_user_id;
END;
$$;

-- セッションを作成してトークンを返す
CREATE OR REPLACE FUNCTION create_manage_session(p_user_id UUID, p_scope TEXT, p_ttl INTERVAL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token TEXT := encode(gen_random_bytes(32), 'hex');
BEGIN
  DELETE FROM manage_sessions WHERE expires_at <= now();
  INSERT INTO manage_sessions (token_hash, user_id, scope, expires_at)
    VALUES (encode(digest(v_token, 'sha256'), 'hex'), p_user_id, p_scope, now() + p_ttl);
  RETURN v_token;
END;
$$;

-- パスワードのハッシュを保存する（NULL なら解除）
CREATE OR REPLACE FUNCTION store_user_password(p_user_id UUID, p_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF p_password IS NOT NULL AND length(p_password) < 8 THEN
    RAISE EXCEPTION 'パスワードは8文字以上にしてください' USING ERRCODE = '22023';
  END IF;
  UPDATE users
    SET password_hash = CASE WHEN p_password IS NULL THEN NULL
                             ELSE crypt(p_password, gen_salt('bf')) END
    WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ユーザーが見つかりません' USING ERRCODE = '22023';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION manage_session_user(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION create_manage_session(UUID, TEXT, INTERVAL) FROM PUBLIC;
REVOKE ALL ON FUNCTION store_user_password(UUID, TEXT) FROM PUBLIC;

-- ===== ログイン・ログアウト =====

-- 管理画面ログイン。パスワード未設定（password_hash が NULL）のユーザーは常に不一致
-- is_admin はメニュー表示の切り替え用（権限の判定は各関数で DB 側が行う）
CREATE OR REPLACE FUNCTION verify_manage_login(p_username TEXT, p_password TEXT)
RETURNS TABLE (id UUID, username TEXT, is_admin BOOLEAN, token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user users%ROWTYPE;
BEGIN
  SELECT * INTO v_user FROM users u
  WHERE u.username = p_username
    AND u.password_hash IS NOT NULL
    AND u.password_hash = crypt(p_password, u.password_hash);
  IF NOT FOUND THEN
    RETURN;
  END IF;
  RETURN QUERY SELECT v_user.id, v_user.username, v_user.is_admin,
    create_manage_session(v_user.id, 'manage', interval '12 hours');
END;
$$;

-- ユーザー管理画面ログイン。is_admin のユーザーのみ
CREATE OR REPLACE FUNCTION verify_admin_login(p_username TEXT, p_password TEXT)
RETURNS TABLE (id UUID, username TEXT, token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user users%ROWTYPE;
BEGIN
  SELECT * INTO v_user FROM users u
  WHERE u.username = p_username
    AND u.is_admin
    AND u.password_hash IS NOT NULL
    AND u.password_hash = crypt(p_password, u.password_hash);
  IF NOT FOUND THEN
    RETURN;
  END IF;
  RETURN QUERY SELECT v_user.id, v_user.username,
    create_manage_session(v_user.id, 'admin', interval '1 hour');
END;
$$;

CREATE OR REPLACE FUNCTION manage_logout(p_token TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  DELETE FROM manage_sessions WHERE token_hash = encode(digest(p_token, 'sha256'), 'hex');
$$;

-- ===== ユーザー管理（admin セッションが必要） =====

CREATE OR REPLACE FUNCTION manage_list_users(p_token TEXT)
RETURNS TABLE (id UUID, username TEXT, created_at TIMESTAMPTZ, has_password BOOLEAN, is_admin BOOLEAN)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM manage_session_user(p_token, 'admin');
  RETURN QUERY
    SELECT u.id, u.username, u.created_at, u.password_hash IS NOT NULL, u.is_admin
    FROM users u
    ORDER BY u.username;
END;
$$;

-- ユーザー追加（p_password が NULL ならパスワードなし）
CREATE OR REPLACE FUNCTION manage_create_user(p_token TEXT, p_username TEXT, p_password TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_id UUID;
BEGIN
  PERFORM manage_session_user(p_token, 'admin');
  IF coalesce(trim(p_username), '') = '' THEN
    RAISE EXCEPTION 'ユーザー名を入力してください' USING ERRCODE = '22023';
  END IF;
  INSERT INTO users (username) VALUES (trim(p_username)) RETURNING users.id INTO v_id;
  PERFORM store_user_password(v_id, p_password);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION manage_rename_user(p_token TEXT, p_user_id UUID, p_username TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM manage_session_user(p_token, 'admin');
  IF coalesce(trim(p_username), '') = '' THEN
    RAISE EXCEPTION 'ユーザー名を入力してください' USING ERRCODE = '22023';
  END IF;
  UPDATE users SET username = trim(p_username) WHERE users.id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ユーザーが見つかりません' USING ERRCODE = '22023';
  END IF;
END;
$$;

-- パスワードの設定・変更・解除（p_password が NULL なら解除）
-- 変更・解除したユーザーの他のセッションは無効にする
CREATE OR REPLACE FUNCTION manage_set_password(p_token TEXT, p_user_id UUID, p_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_me UUID := manage_session_user(p_token, 'admin');
BEGIN
  IF p_password IS NULL AND p_user_id = v_me THEN
    RAISE EXCEPTION '自分自身のパスワードは解除できません' USING ERRCODE = '22023';
  END IF;
  PERFORM store_user_password(p_user_id, p_password);
  DELETE FROM manage_sessions
    WHERE user_id = p_user_id
      AND token_hash <> encode(digest(p_token, 'sha256'), 'hex');
END;
$$;

REVOKE ALL ON FUNCTION verify_manage_login(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION verify_admin_login(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION manage_logout(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION manage_list_users(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION manage_create_user(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION manage_rename_user(TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION manage_set_password(TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verify_manage_login(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_admin_login(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION manage_logout(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION manage_list_users(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION manage_create_user(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION manage_rename_user(TEXT, UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION manage_set_password(TEXT, UUID, TEXT) TO anon, authenticated;

-- 14. 管理画面の閲覧ユーザー一覧（パスワードのあるユーザー＝管理者を除く）
-- 管理画面で閲覧できるユーザー一覧。パスワードのあるユーザー（管理者）は含めない
CREATE OR REPLACE FUNCTION manage_list_viewable_users(p_token TEXT)
RETURNS TABLE (id UUID, username TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM manage_session_user(p_token, 'manage');
  RETURN QUERY
    SELECT u.id, u.username, u.created_at
    FROM users u
    WHERE u.password_hash IS NULL
    ORDER BY u.username;
END;
$$;

REVOKE ALL ON FUNCTION manage_list_viewable_users(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION manage_list_viewable_users(TEXT) TO anon, authenticated;

-- 最初の admin ユーザーの設定（ユーザー名とパスワードを置き換えて SQL Editor で実行）
-- 以降のユーザー追加・パスワード設定はユーザー管理画面から行える
-- UPDATE users
--   SET password_hash = extensions.crypt('ここにパスワード', extensions.gen_salt('bf')),
--       is_admin = true
--   WHERE username = 'ここにユーザー名';
-- admin 権限の付け外し
-- UPDATE users SET is_admin = false WHERE username = 'ここにユーザー名';
