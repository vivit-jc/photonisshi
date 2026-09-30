import { ref } from 'vue'
import { useManageAuth } from './useManageAuth'

const manageUsers = ref([])

export const MIN_PASSWORD_LENGTH = 8

// DB から返るエラーを画面表示用のメッセージに変換する
export function userErrorMessage(e, fallback = '操作に失敗しました') {
  if (e?.code === '23505') return 'このユーザー名は既に使われています'
  if (e?.code === '22023' || e?.code === '28000') return e.message
  return fallback
}

// ユーザー管理画面の操作。すべて admin セッションで DB 側が権限を確認する
export function useManageUsers() {
  const { manageUser, manageLogin, manageLogout, adminRpc, applyRenamed } = useManageAuth()

  async function loadManageUsers() {
    manageUsers.value = await adminRpc('manage_list_users')
  }

  async function addUser(username, password) {
    await adminRpc('manage_create_user', { p_username: username, p_password: password })
  }

  async function renameUser(userId, username) {
    await adminRpc('manage_rename_user', { p_user_id: userId, p_username: username })
    applyRenamed(userId, username)
  }

  // パスワードを変更・解除すると、そのユーザーの他のセッションは DB 側で無効になる
  // 管理画面にログイン中のユーザー自身が対象なら、ログインし直すかログアウトする
  async function setUserPassword(userId, password) {
    await adminRpc('manage_set_password', { p_user_id: userId, p_password: password })
    if (manageUser.value?.id !== userId) return
    if (password) {
      await manageLogin(manageUser.value.username, password)
    } else {
      manageLogout()
    }
  }

  return { manageUsers, loadManageUsers, addUser, renameUser, setUserPassword }
}
