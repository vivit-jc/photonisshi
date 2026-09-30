import { computed, ref } from 'vue'
import { supabase } from '../plugins/supabase'

const SESSION_KEY = 'photonisshi_manage_user'
const USERNAME_KEY = 'photonisshi_manage_username'

function loadManageUser() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || null
  } catch {
    return null
  }
}

const manageUser = ref(loadManageUser())
const isManageAuthenticated = computed(() => !!manageUser.value)

export function useManageAuth() {
  function loadSavedManageUsername() {
    return localStorage.getItem(USERNAME_KEY) || ''
  }

  // パスワードが一致しない、またはパスワード未設定のユーザーは null が返る
  async function manageLogin(username, password) {
    const { data, error } = await supabase.rpc('verify_manage_login', {
      p_username: username,
      p_password: password,
    })
    if (error) throw error
    const user = data?.[0]
    if (!user) return null
    manageUser.value = user
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
    localStorage.setItem(USERNAME_KEY, username)
    return user
  }

  function manageLogout() {
    manageUser.value = null
    sessionStorage.removeItem(SESSION_KEY)
  }

  return {
    manageUser,
    isManageAuthenticated,
    loadSavedManageUsername,
    manageLogin,
    manageLogout,
  }
}
