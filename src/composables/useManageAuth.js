import { computed, ref } from 'vue'
import { supabase } from '../plugins/supabase'

const SESSION_KEY = 'photonisshi_manage_user'
const USERNAME_KEY = 'photonisshi_manage_username'
export const INVALID_SESSION_CODE = '28000'

function loadManageUser() {
  try {
    const user = JSON.parse(sessionStorage.getItem(SESSION_KEY))
    return user?.token ? user : null
  } catch {
    return null
  }
}

const manageUser = ref(loadManageUser())
const isManageAuthenticated = computed(() => !!manageUser.value)

// ユーザー管理画面用のセッション。画面を離れる・リロードすると破棄する（メモリのみに保持）
const adminUser = ref(null)
const isAdminAuthenticated = computed(() => !!adminUser.value)

function setManageUser(user) {
  manageUser.value = user
  if (user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
  } else {
    sessionStorage.removeItem(SESSION_KEY)
  }
}

function revokeToken(token) {
  if (token) supabase.rpc('manage_logout', { p_token: token }).then(() => {})
}

async function callLogin(fn, username, password) {
  const { data, error } = await supabase.rpc(fn, {
    p_username: username,
    p_password: password,
  })
  if (error) throw error
  return data?.[0] ?? null
}

export function useManageAuth() {
  function loadSavedManageUsername() {
    return localStorage.getItem(USERNAME_KEY) || ''
  }

  // パスワードが一致しない、またはパスワード未設定のユーザーは null が返る
  async function manageLogin(username, password) {
    const user = await callLogin('verify_manage_login', username, password)
    if (!user) return null
    revokeToken(manageUser.value?.token)
    setManageUser(user)
    localStorage.setItem(USERNAME_KEY, username)
    return user
  }

  function manageLogout() {
    adminLogout()
    revokeToken(manageUser.value?.token)
    setManageUser(null)
  }

  // admin 権限がない場合も null が返る
  async function adminLogin(username, password) {
    const user = await callLogin('verify_admin_login', username, password)
    if (!user) return null
    adminUser.value = user
    return user
  }

  function adminLogout() {
    revokeToken(adminUser.value?.token)
    adminUser.value = null
  }

  // admin セッショントークン付きで RPC を呼ぶ。セッション切れなら admin ログインを解除する
  async function adminRpc(fn, params = {}) {
    const { data, error } = await supabase.rpc(fn, {
      p_token: adminUser.value?.token ?? '',
      ...params,
    })
    if (error) {
      if (error.code === INVALID_SESSION_CODE) adminUser.value = null
      throw error
    }
    return data
  }

  // ユーザー管理画面で名前が変わったとき、ログイン中の表示を合わせる
  function applyRenamed(userId, username) {
    if (manageUser.value?.id === userId) {
      setManageUser({ ...manageUser.value, username })
      localStorage.setItem(USERNAME_KEY, username)
    }
    if (adminUser.value?.id === userId) {
      adminUser.value = { ...adminUser.value, username }
    }
  }

  return {
    manageUser,
    isManageAuthenticated,
    adminUser,
    isAdminAuthenticated,
    loadSavedManageUsername,
    manageLogin,
    manageLogout,
    adminLogin,
    adminLogout,
    adminRpc,
    applyRenamed,
  }
}
